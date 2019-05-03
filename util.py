"utilities"

import datetime
import time

import boto3


STATES = [
    "SUBMITTED",
    "PENDING",
    "RUNNABLE",
    "STARTING",
    "RUNNING",
    "FAILED",
    "SUCCEEDED",
]

BATCH = boto3.client("batch")


def unix_time_millis(dt):
    "convert datetime to milliseconds"
    epoch = datetime.datetime.fromtimestamp(0)
    return int((dt - epoch).total_seconds() * 1000.0)


def get_all_job_info():
    "get a list of all jobs on all queues in all states"
    queues = do_paginated_batch_operation("describe_job_queues", "jobQueues")
    jobinfo = []
    # TODO sort by queue name?
    for queue in queues:
        qname = queue["jobQueueName"]
        if queue["state"] == "DISABLED" or not queue["status"] == "VALID":
            continue
        queueinfo = {}
        for state in STATES:
            queueinfo[state] = do_paginated_batch_operation(
                "list_jobs", "jobSummaryList", dict(jobQueue=qname, jobStatus=state)
            )
        jobinfo.append(dict(queue_name=qname, info=queueinfo, queue=queue))
    return jobinfo


def do_paginated_batch_operation(operation, wanted_part, args=None):
    "do paginated batch operation"
    if args is None:
        args = {}
    out = []
    while True:
        result = getattr(BATCH, operation)(**args)
        out.extend(result[wanted_part])
        if "nextToken" in result:
            args["nextToken"] = result["nextToken"]
        else:
            return out


def get_queue_summary(info):
    "get queue summary as table data"
    out = []
    sinfo = sorted(info, key=lambda x: x["queue_name"])
    for queue in sinfo:
        row = []
        row.append(queue["queue_name"])
        row.append(queue["queue"]["priority"])
        for state in STATES:
            row.append(len(queue["info"][state]))
        out.append(row)
    outdict = dict(data=out)
    return outdict


def get_compute_environment_table():
    "get compute environments"
    envs = BATCH.describe_compute_environments()["computeEnvironments"]
    senvs = sorted(envs, key=lambda x: x["computeEnvironmentName"])
    out = []
    for env in senvs:
        row = []
        row.append(env["computeEnvironmentName"])
        row.append(env["type"])
        row.append(env["computeResources"]["minvCpus"])
        row.append(env["computeResources"]["desiredvCpus"])
        row.append(env["computeResources"]["maxvCpus"])
        out.append(row)
    outdict = dict(data=out)
    return outdict


def get_job_table(info):
    "get a table of jobs"
    out = []
    sinfo = sorted(info, key=lambda x: x["queue_name"])
    for queue in sinfo:
        for state in STATES:
            if not queue["info"][state]:
                continue
            for job in queue["info"][state]:
                row = []
                row.append(queue["queue_name"])
                row.append(job["jobId"])
                row.append(job["jobName"])
                row.append(state)
                row.append(job["createdAt"])
                if "startedAt" in job:
                    row.append(job["startedAt"])
                else:
                    row.append(None)
                if "stoppedAt" in job and "startedAt" in job:
                    delta = job["stoppedAt"] - job["startedAt"]
                    now = datetime.datetime.now()
                    nowint = unix_time_millis(now)
                    row.append(nowint - delta)
                    # row.append('dante')
                else:
                    row.append(None)
                out.append(row)
    outdict = dict(data=out)
    return outdict


def get_job_definition_table():
    "get job definitions in table form"
    jobdefs = do_paginated_batch_operation("describe_job_definitions", "jobDefinitions")
    jobdefs = sorted(
        jobdefs, key=lambda x: (x["jobDefinitionName"].lower(), -x["revision"])
    )
    out = []
    for jobdef in jobdefs:
        row = []
        row.append(jobdef["jobDefinitionName"])
        row.append(jobdef["revision"])
        row.append(jobdef["containerProperties"]["vcpus"])
        row.append(jobdef["containerProperties"]["memory"])
        row.append(jobdef["containerProperties"]["image"])
        out.append(row)
    return dict(data=out)


# def do_paginated_batch_operation(operation, wanted_part, args=None):


def describe_queue(queue_name):
    "get info for one queue"
    return BATCH.describe_job_queues(jobQueues=[queue_name])["jobQueues"][0]


def describe_env(env_name):
    "get info for one compute environment"
    return BATCH.describe_compute_environments(computeEnvironments=[env_name])[
        "computeEnvironments"
    ][0]


def describe_job(job_id, child_state=None):
    "get info for one job"
    job = BATCH.describe_jobs(jobs=[job_id])["jobs"][0]
    if child_state:
        state_filter = child_state
    else:
        state_filter = job["status"]

    if "arrayProperties" in job and "statusSummary" in job["arrayProperties"]:
        # this is an array job, add the children
        children = do_paginated_batch_operation(
            "list_jobs",
            "jobSummaryList",
            dict(arrayJobId=job["jobId"], jobStatus=state_filter),
        )
        job["childrenForStatus"] = children
    return job


def describe_job_definition(jobdef_id):
    "get info for one revision of a job definition"
    jobdef, revision = jobdef_id.split(":")
    revision = int(revision)
    # NOTE: This is super slow thanks to cromwell which makes 1000s of revisions....
    # Not sure what to do....
    # Do we at least get a progress indicator?
    defs = do_paginated_batch_operation("describe_job_definitions", "jobDefinitions")
    return [x for x in defs if x["revision"] == revision][0]


def get_log_events(job_id, attempt, next_token, start_from_head):
    "get log events & timestamps for one job"
    job = BATCH.describe_jobs(jobs=[job_id])["jobs"][0]
    retdict = {
        "jobId": job["jobId"],
        "jobName": job["jobName"],
        "attempt": attempt,
        "rows": [],
        "jobStatus": job["status"],
    }
    if job["attempts"]:
        log_stream_name = job["attempts"][attempt]["container"]["logStreamName"]
    else:
        log_stream_name = job["container"]["logStreamName"]
    client = boto3.client("logs")
    output = []
    args = dict(
        logGroupName="/aws/batch/job",
        logStreamName=log_stream_name,
        limit=25,
        startFromHead=start_from_head,
    )
    if next_token:
        args["nextToken"] = next_token

    result = client.get_log_events(**args)
    retdict["nextForwardToken"] = result["nextForwardToken"]
    retdict["nextBackwardToken"] = result["nextBackwardToken"]
    if not result["events"]:
        return retdict
    for event in result["events"]:
        row = []

        # print(event['message'])
        timestamp = datetime.datetime.fromtimestamp(event["timestamp"] / 1e3)
        row.append(timestamp.isoformat())
        row.append(event["message"])
        output.append(row)

    # return output, result['nextForwardToken'], result['nextBackwardToken']
    retdict["rows"] = output
    return retdict
