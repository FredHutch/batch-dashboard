#!/usr/bin/env python3
"""
batch dashboard web application.

One thing to note about this app is that there are two different authentication systems in it.

1) Basic Auth with AWS credentials (access key and secret key) in order to
   use REST API.
2) Authenticate with HutchNet ID and password in order to use protected functions
   (submit/cancel/terminate jobs) from the web GUI.

"""
# see https://github.com/PyCQA/pylint/issues/73
from distutils.util import strtobool # pylint: disable=import-error, no-name-in-module
import os
import sys
import datetime
from flask import Flask, render_template, request, jsonify
import flask_login
from flask_restful import Resource, Api
from flask_httpauth import HTTPBasicAuth
import requests

from ldap3_auth import authenticate
import util
import submit_proxy
import appuser

APP = Flask(__name__, static_url_path='')
LOGIN_MANAGER = flask_login.LoginManager()
LOGIN_MANAGER.init_app(APP)
API = Api(APP)

REQUIRED_ENV_VARS = ['APP_SECRET']
NOTSET = False
for var in REQUIRED_ENV_VARS:
    if not os.getenv(var):
        NOTSET = True
        print("{} must be set!".format(var))
if NOTSET:
    sys.exit(1)

APP.config['SECRET_KEY'] = os.getenv('APP_SECRET')


@LOGIN_MANAGER.user_loader
def load_user(user_id):
    "needed by flask-login"
    # return User.get(user_id)
    return appuser.User(user_id)

@APP.route('/')
def index():
    "main route"
    timestamp = datetime.datetime.now().isoformat()
    return render_template('index.html',
                           timestamp=timestamp,
                           states=util.STATES)

# FIXME get_all_job_info gets called twice when page loads - can this be avoided?
# (once in get_queue_table_data and once in get_job_table_data)

@APP.route("/get_queue_table_data", methods=['GET'])
def get_queue_table_data():
    "route for populating queue table"
    info = util.get_all_job_info()
    queue_table_data = util.get_queue_summary(info)
    return jsonify(queue_table_data)

@APP.route("/get_env_table_data", methods=['GET'])
def get_env_table_data():
    "route for populating env table"
    return jsonify(util.get_compute_environment_table())

@APP.route("/get_job_table_data", methods=['GET'])
def get_job_table_data():
    "route for populating job table"
    info = util.get_all_job_info()
    return jsonify(util.get_job_table(info))

@APP.route("/get_jobdef_table_data", methods=['GET'])
def get_jobdef_table_data():
    "route for populating job definition table"
    return jsonify(util.get_job_definition_table())

@APP.route('/describe_queue', methods=['GET'])
def describe_queue():
    "route for describing queues"
    print(request.args)
    qname = request.args.get('queue_name')
    print(qname)
    print("returning")
    ret = util.describe_queue(qname)
    print(ret)
    return jsonify(ret)


@APP.route('/describe_env', methods=['GET'])
def describe_env():
    "route for describing a compute environment"
    envname = request.args.get('env_name')
    ret = util.describe_env(envname)
    return jsonify(ret)

@APP.route("/describe_job", methods=["GET"])
def describe_job():
    "route for describing a job"
    job_id = request.args.get('job_id')
    child_state = request.args.get('child_state')
    ret = util.describe_job(job_id, child_state)
    return jsonify(ret)


@APP.route("/describe_job_definition", methods=["GET"])
def describe_job_definition():
    "route for describing a job definition"
    jobdef_id = request.args.get("jobdef_id")
    ret = util.describe_job_definition(jobdef_id)
    return jsonify(ret)

@APP.route("/job_log", methods=["GET"])
def job_log():
    "route for showing job log"
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


@APP.route("/gui_cancel_job", methods=['POST'])
@flask_login.login_required
def gui_cancel_job():
    "cancel a job from the web gui"
    user = flask_login.current_user.get_id()
    obj = request.get_json()

    try:
        result = submit_proxy.cancel_job(user, jobId=obj['jobId'],
                                         reason="Canceled in Batch Dashboard")
        # FIXME job does not seem to be canceled???
        return jsonify(result), 200
    except Exception as exc: # pylint: disable=broad-except
        return jsonify(dict(error=str(exc), exception=get_exception_class(exc))), 400

@APP.route("/gui_terminate_job", methods=['POST'])
@flask_login.login_required
def gui_terminate_job():
    "terminate a job from the web gui"
    user = flask_login.current_user.get_id()
    obj = request.get_json()

    try:
        result = submit_proxy.terminate_job(user, jobId=obj['jobId'],
                                            reason="Terminated in Batch Dashboard")
        return jsonify(result), 200
    except Exception as exc: # pylint: disable=broad-except
        return jsonify(dict(error=str(exc), exception=get_exception_class(exc))), 400

@APP.route("/gui_submit_job", methods=['POST'])
@flask_login.login_required
def gui_submit_job():
    "submit a job from the web gui"
    pass


# gui authentication

@APP.route("/login", methods=["POST"])
def login():
    "gui login (hutchnet id/password)"
    if flask_login.current_user.is_authenticated:
        return jsonify(None)
    username = request.form['username']
    password = request.form['password']
    if authenticate(username, password):
        user = appuser.User(username)
        flask_login.login_user(user, remember=True)
        return jsonify(username)
    return jsonify(None)


@APP.route("/get_current_user", methods=['GET'])
def get_current_user():
    "get current user"
    return jsonify(flask_login.current_user.get_id())


@APP.route("/logout")
def logout():
    """Log out."""
    flask_login.logout_user()
    return jsonify("ok")


# REST functionality

AUTH = HTTPBasicAuth()


@AUTH.verify_password
def verify_password(username, password):
    "Call toolbox to see if our AWS credentials are valid"
    res = requests.get("https://toolbox.fhcrc.org/sw2srv/aws/get_hutchnet_id",
                       auth=requests.auth.HTTPBasicAuth(username, password))
    if res.status_code == 200:
        return True
    return False

def get_exception_class(exc):
    """
    get the full path of the exception class as a string
    exc.__class__.__name__ trims off the path info
    """

    exc_str = str(exc.__class__)
    return exc_str.replace("<class '", "").replace("'>", "")




class SubmitJob(Resource):
    "REST resource for submitting batch jobs"
    @AUTH.login_required
    def post(self): # pylint: disable=no-self-use
        """Submit a job"""
        try:
            obj = request.get_json()
            user = submit_proxy.get_user(request.authorization.username,
                                         request.authorization.password).split("/")[-1]
            result = submit_proxy.submit_job(user, **obj)
            return result, 200
        except Exception as exc: # pylint: disable=broad-except
            return dict(error=str(exc), exception=get_exception_class(exc)), 400


class TerminateJob(Resource):
    "REST resource for terminating a batch job"
    @AUTH.login_required
    def post(self): # pylint: disable=no-self-use
        """Submit a job"""
        try:
            obj = request.get_json()
            user = submit_proxy.get_user(request.authorization.username,
                                         request.authorization.password).split("/")[-1]
            result = submit_proxy.terminate_job(user, **obj)
            return result, 200
        except Exception as exc: # pylint: disable=broad-except
            # print(exc)
            # traceback.print_exc()
            return dict(error=str(exc), exception=get_exception_class(exc)), 400


class CancelJob(Resource):
    "REST resource for canceling a batch job"
    @AUTH.login_required
    def post(self): # pylint: disable=no-self-use
        """Submit a job"""
        try:
            obj = request.get_json()
            user = submit_proxy.get_user(request.authorization.username,
                                         request.authorization.password).split("/")[-1]
            result = submit_proxy.cancel_job(user, **obj)
            return result, 200
        except Exception as exc: # pylint: disable=broad-except
            return dict(error=str(exc), exception=get_exception_class(exc)), 400


API.add_resource(SubmitJob, '/submit_job')
API.add_resource(TerminateJob, '/terminate_job')
API.add_resource(CancelJob, '/cancel_job')



if __name__ == '__main__':
    APP.run(debug=True)
