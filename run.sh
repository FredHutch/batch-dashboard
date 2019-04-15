#!/bin/bash


ls -l /run/secrets/

ls -l /run/

APP_SECRET=$(cat /run/secrets/BATCH_DASHBOARD_APP_SECRET)
export APP_SECRET
AWS_ACCESS_KEY_ID=$(cat /run/secrets/BATCH_DASHBOARD_AWS_ACCESS_KEY_ID)
export AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY=$(cat /run/secrets/BATCH_DASHBOARD_AWS_SECRET_ACCESS_KEY)
export AWS_SECRET_ACCESS_KEY
AWS_DEFAULT_REGION=$(cat /run/secrets/BATCH_DASHBOARD_AWS_DEFAULT_REGION)
export AWS_DEFAULT_REGION

VENV=$(pipenv --venv)

"$VENV/bin/gunicorn app_namespace:APP" --timeout 120 -w 4 -b 0.0.0.0:8001
