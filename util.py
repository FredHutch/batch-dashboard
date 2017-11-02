"utilities"
import boto3

def get_all_job_info():
    "get a list of all jobs on all queues in all states"
    batch = boto3.client('batch')
    queues = do_paginated_batch_operation(batch,
                                          "describe_job_queues",
                                          'jobQueues')
    states = ['SUBMITTED', 'PENDING', 'RUNNABLE', 'STARTING',
              'RUNNING', 'FAILED', 'SUCCEEDED']
    jobinfo = []
    # TODO sort by queue name?
    for queue in queues:
        qname = queue['jobQueueName']
        if queue['state'] == 'DISABLED' or not queue['status'] == 'VALID':
            continue
        queueinfo = {}
        for state in states:
            queueinfo[state] = do_paginated_batch_operation(batch, "list_jobs",
                                                            'jobSummaryList',
                                                            dict(jobQueue=qname,
                                                                 jobStatus=state))
        jobinfo.append(dict(queue_name=qname,
                            info=queueinfo,
                            queue=queue))
    return jobinfo

def do_paginated_batch_operation(batch, operation, wanted_part, args=None):
    "do paginated batch operation"
    if args is None:
        args = {}
    out = []
    while True:
        result = getattr(batch, operation)(**args)
        out.extend(result[wanted_part])
        if 'nextToken' in result:
            args['nextToken'] = result['nextToken']
        else:
            return out

def get_queue_summary(info):
    "get queue summary as table data"
    out = []
    for queue in info:
        row = []
        row.append(queue['queue_name'])
        row.append(queue['queue']['priority'])
        row.append()
    outdict = dict(data=out)
    return outdict
