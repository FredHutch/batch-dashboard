#!/usr/bin/env python
from threading import Lock
from distutils.util import strtobool
import json
import os
import sys
import datetime
import boto3
from flask import Flask, render_template, session, request, jsonify
from flask_socketio import SocketIO, Namespace, emit, join_room, leave_room, \
    close_room, rooms, disconnect

import util

# Set this variable to "threading", "eventlet" or "gevent" to test the
# different async modes, or leave it set to None for the application to choose
# the best option based on installed packages.
async_mode = None

app = Flask(__name__, static_url_path='')

required_env_vars = ['QUEUE_URL', 'APP_SECRET']
notset = False
for var in required_env_vars:
    if not os.getenv(var):
        notset = True
        print("{} must be set!".format(var))
if notset:
    sys.exit(1)

app.config['SECRET_KEY'] = os.getenv('APP_SECRET')
socketio = SocketIO(app, async_mode=async_mode)
thread = None
thread_lock = Lock()

# FIXME - set up a dev queue
QUEUE_URL = os.getenv('QUEUE_URL')

def background_thread():
    """Example of how to send server generated events to clients."""
    count = 0
    sqs = boto3.client('sqs')

    while True:
        # print("polling...")
        response = sqs.receive_message(QueueUrl=QUEUE_URL)
        if 'Messages' in response:
            for message in response['Messages']:
                print("Got message")
                print(message['Body'])
                message_obj = json.loads(message['Body'])
                if 'detail' in message_obj:
                    detail = message_obj['detail']
                    try:
                        message_to_send = dict(job_id=detail['jobId'], job_name=detail['jobName'],
                                               job_queue=detail['jobQueue'].split("/")[-1],
                                               job_status=detail['status'])
                    except KeyError:
                        sqs.delete_message(QueueUrl=QUEUE_URL,
                                           ReceiptHandle=message['ReceiptHandle'])
                        continue
                    print("Passing message to webpage:")
                    print(message_to_send)
                    socketio.emit('job_info', message_to_send, namespace='/test')
                    sqs.delete_message(QueueUrl=QUEUE_URL,
                                       ReceiptHandle=message['ReceiptHandle'])
        socketio.sleep(1)
        # socketio.sleep(10)
        # count += 1
        # socketio.emit('my_response',
        #               {'data': 'Server generated event', 'count': count},
        #               namespace='/test')

@app.route('/send')
def send():
    socketio.emit('some event', {'data': 42}, namespace='/test')
    return 'ok'

@app.route('/foo') # FIXME eventually replaces index route...
def foo():
    timestamp = datetime.datetime.now().isoformat()
    return render_template('new.html', timestamp=timestamp)

@app.route('/')
def index():
    "main route"
    info = util.get_all_job_info()
    queue_table_data = util.get_queue_summary(info)
    queue_names = sorted([x['queue_name'] for x in info], key=lambda s: s.lower())
    envs = util.get_compute_environment_table()
    jobs = util.get_job_table(info)
    jobdefs = util.get_job_definition_table()
    timestamp = datetime.datetime.now().isoformat()
    return render_template('index.html', async_mode=socketio.async_mode,
                           queue_summary_table=queue_table_data['data'],
                           env_table=envs['data'],
                           job_table=jobs['data'],
                           job_def_table=jobdefs['data'],
                           timestamp=timestamp,
                           states=util.STATES,
                           queue_names=queue_names)


@app.route('/describe_queue', methods=['GET'])
def describe_queue():
    print(request.args)
    qname = request.args.get('queue_name')
    print(qname)
    print("returning")
    ret = util.describe_queue(qname)
    print(ret)
    return jsonify(ret)


@app.route('/describe_env', methods=['GET'])
def describe_env():
    envname = request.args.get('env_name')
    ret = util.describe_env(envname)
    return jsonify(ret)

@app.route("/describe_job", methods=["GET"])
def describe_job():
    job_id = request.args.get('job_id')
    ret = util.describe_job(job_id)
    return jsonify(ret)


@app.route("/describe_job_definition", methods=["GET"])
def describe_job_definition():
    jobdef_id = request.args.get("jobdef_id")
    ret = util.describe_job_definition(jobdef_id)
    return jsonify(ret)

@app.route("/job_log", methods=["GET"])
def job_log():
    start_from_head = bool(strtobool(request.args.get("startFromHead", "True")))
    job_id = request.args.get("jobId")
    attempt = int(request.args.get("attempt"))

    next_token = None
    if 'nextToken' in request.args:
        next_token = request.args.get("nextToken")
    # log_table_data, next_token, prev_token = util.get_log_events(log_stream_name, next_token,
    result = util.get_log_events(job_id, attempt, next_token, start_from_head)

    return render_template('logs.html',
                           log_table_data=result['rows'],
                           next_token=result['nextForwardToken'],
                           prev_token=result['nextBackwardToken'],
                           job_id=result['jobId'],
                           job_name=result['jobName'],
                           status=result['jobStatus'],
                           attempt=attempt,
                           start_from_head=start_from_head)


class MyNamespace(Namespace):
    def on_my_event(self, message):
        session['receive_count'] = session.get('receive_count', 0) + 1
        emit('my_response',
             {'data': message['data'], 'count': session['receive_count']})

    def on_my_broadcast_event(self, message):
        session['receive_count'] = session.get('receive_count', 0) + 1
        emit('my_response',
             {'data': message['data'], 'count': session['receive_count']},
             broadcast=True)

    def on_join(self, message):
        join_room(message['room'])
        session['receive_count'] = session.get('receive_count', 0) + 1
        emit('my_response',
             {'data': 'In rooms: ' + ', '.join(rooms()),
              'count': session['receive_count']})

    def on_leave(self, message):
        leave_room(message['room'])
        session['receive_count'] = session.get('receive_count', 0) + 1
        emit('my_response',
             {'data': 'In rooms: ' + ', '.join(rooms()),
              'count': session['receive_count']})

    def on_close_room(self, message):
        session['receive_count'] = session.get('receive_count', 0) + 1
        emit('my_response', {'data': 'Room ' + message['room'] + ' is closing.',
                             'count': session['receive_count']},
             room=message['room'])
        close_room(message['room'])

    def on_my_room_event(self, message):
        session['receive_count'] = session.get('receive_count', 0) + 1
        emit('my_response',
             {'data': message['data'], 'count': session['receive_count']},
             room=message['room'])

    def on_disconnect_request(self):
        session['receive_count'] = session.get('receive_count', 0) + 1
        emit('my_response',
             {'data': 'Disconnected!', 'count': session['receive_count']})
        disconnect()

    def on_my_ping(self):
        emit('my_pong')

    def on_connect(self):
        global thread
        with thread_lock:
            if thread is None:
                thread = socketio.start_background_task(
                    target=background_thread)
        emit('my_response', {'data': 'Connected', 'count': 0})

    def on_disconnect(self):
        print('Client disconnected', request.sid)


socketio.on_namespace(MyNamespace('/test'))


if __name__ == '__main__':
    socketio.run(app, debug=True)
