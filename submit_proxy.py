#!/usr/bin/env python3

"""
Logic to decide whether a user can submit a given batch job.
If they don't have the permissions in the job task role, the request is denied.
"""

import boto3

class NoJobDefinitionException(Exception):
    "Error to throw when there is no job definition matching the jobdef string"
    pass

class MultipleJobDefinitionsException(Exception):
    "Error to throw if jobdef string matches multiple job definitions"
    pass


def can_submit(user, jobdef):
    """Decide whether user can submit this job.
    Args:
    user -- ARN of user who wants to submit job
    jobdef -- ARN of job definition for job they are trying to submit
    Returns: a boolean indicating whether user can submit the job.

    This function relies on naming conventions of job roles and iam groups.
    If those change, the function needs to be updated.
    Raises:
        NoSuchDefinitionException: if jobdef is not valid
        MultipldeJobDefinitionsException: if jobdef refers to more than one
            job definition
    """
    iam = boto3.client("iam")
    batch = boto3.client("batch")
    resp = batch.describe_job_definitions(jobDefinitions=[jobdef])
    if (not 'jobDefinitions' in resp) or (not resp['jobDefinitions']):
        raise NoJobDefinitionException("Could not find job definition {}".format(jobdef))
    if len(resp['jobDefinitions']) > 1:
        raise MultipleJobDefinitionsException(
            "More than one job definition matched string {}".format(jobdef))
    def_info = resp['jobDefinitions'][0]
    if not 'jobRoleArn' in def_info['containerProperties']:
        # if job definition has no job role, then we have no security concerns
        return True
    role_name = def_info['containerProperties']['jobRoleArn'].split("/")[-1]
    user_name = user.split("/")[-1]
    resp = iam.list_groups_for_user(UserName=user_name)
    if (not 'Groups' in resp) or (not resp['Groups']):
        # user is not in any groups, so they can't submit a batch job
        # that has a task role. They could have permissions attached directly
        # but that's not the approved way to do things, so we deny them permission.
        return False
    for group in resp['Groups']:
        group_name = group['Arn'].split("/")[-1]
        if role_name.startswith(group_name):
            return True
    return False


def get_user(access_key, secret_key):
    """Get username from credentials.
    Args:
    access_key -- AWS Access Key ID
    secret_key -- AWS Secret Key
    Returns: the ARN of the user with those credentials.
    Raises:
        ClientError: If credentials are not valid

    """
    themclient = boto3.client("sts", aws_access_key_id=access_key,
                              aws_secret_access_key=secret_key)
    # throws ClientError if credentials are bad, let this
    # go back to the caller.
    resp = themclient.get_caller_identity()
    return resp['Arn']


def submit_job(user, **kwargs):
    """A proxy for the submit_job call on boto3's batch client.
    Injects the username into an environment variable.
    Args:
    user -- The username we are submitting on behalf of.
    kwargs -- Arguments passed through to boto3.batch.submit_job()
    Returns:
        Whatever boto3.batch.submit_job returns.
    Raises:
        Whatever boto3.batch.submit_job raises.
    """
    # TODO is there anything else we want to inject here?
    namedict = dict(name="AWS_BATCH_JOB_SUBMITTED_BY", value=user)
    if 'containerOverrides' not in kwargs:
        kwargs['containerOverrides'] = {}
    if 'environment' not in kwargs['containerOverrides']:
        kwargs['containerOverrides']['environment'] = []
    kwargs['containerOverrides']['environment'].append(namedict)
    batch = boto3.client("batch")
    return batch.submit_job(**kwargs)
