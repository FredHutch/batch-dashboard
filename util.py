"utilities"
import boto3

def get_all_job_info():
    "get a list of all jobs on all queues in all states"
    batch = boto3.client('batch')
    # FIXME handle pagination (nextToken)
    queues = batch.describe_job_queues()['jobQueues']
    states = ['SUBMITTED', 'PENDING', 'RUNNABLE', 'STARTING',
              'RUNNING', 'FAILED', 'SUCCEEDED']
    jobinfo = []
    for queue in queues:
        if queue['state'] == 'DISABLED' or not queue['status'] == 'VALID':
            continue
        queueinfo = {}
        for state in states:
            # FIXME handle paginated results (nextToken)
            queueinfo[state] = batch.list_jobs(jobQueue=queue['jobQueueName'],
                                               jobStatus=state)['jobSummaryList']
        jobinfo.append(dict(queue=queue['jobQueueName'],
                            info=queueinfo))
    return jobinfo
