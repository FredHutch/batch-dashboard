"utilities"
import boto3


STATES = ['SUBMITTED', 'PENDING', 'RUNNABLE', 'STARTING',
          'RUNNING', 'FAILED', 'SUCCEEDED']

BATCH = boto3.client('batch')


def get_all_job_info():
    "get a list of all jobs on all queues in all states"
    queues = do_paginated_batch_operation("describe_job_queues",
                                          'jobQueues')
    jobinfo = []
    # TODO sort by queue name?
    for queue in queues:
        qname = queue['jobQueueName']
        if queue['state'] == 'DISABLED' or not queue['status'] == 'VALID':
            continue
        queueinfo = {}
        for state in STATES:
            queueinfo[state] = do_paginated_batch_operation("list_jobs",
                                                            'jobSummaryList',
                                                            dict(jobQueue=qname,
                                                                 jobStatus=state))
        jobinfo.append(dict(queue_name=qname,
                            info=queueinfo,
                            queue=queue))
    return jobinfo

def do_paginated_batch_operation(operation, wanted_part, args=None):
    "do paginated batch operation"
    if args is None:
        args = {}
    out = []
    while True:
        result = getattr(BATCH, operation)(**args)
        out.extend(result[wanted_part])
        if 'nextToken' in result:
            args['nextToken'] = result['nextToken']
        else:
            return out

def get_queue_summary(info):
    "get queue summary as table data"
    out = []
    sinfo = sorted(info, key=lambda x: x['queue_name'])
    for queue in sinfo:
        row = []
        row.append(queue['queue_name'])
        row.append(queue['queue']['priority'])
        for state in STATES:
            row.append(len(queue['info'][state]))
        out.append(row)
    outdict = dict(data=out)
    return outdict

def get_compute_environment_table():
    "get compute environments"
    envs = BATCH.describe_compute_environments()['computeEnvironments']
    senvs = sorted(envs, key=lambda x: x['computeEnvironmentName'])
    out = []
    for env in senvs:
        row = []
        row.append(env['computeEnvironmentName'])
        row.append(env['type'])
        row.append(env['computeResources']['minvCpus'])
        row.append(env['computeResources']['desiredvCpus'])
        row.append(env['computeResources']['maxvCpus'])
        out.append(row)
    outdict = dict(data=out)
    return outdict

def get_job_table(info):
    "get a table of jobs"
    out = []
    sinfo = sorted(info, key=lambda x: x['queue_name'])
    for queue in sinfo:
        for state in STATES:
            if not queue['info'][state]:
                continue
            for job in queue['info'][state]:
                row = []
                row.append(queue['queue_name'])
                row.append(job['jobId'])
                row.append(job['jobName'])
                row.append(state)
                out.append(row)
    outdict=dict(data=out)
    return outdict
