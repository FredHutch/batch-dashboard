#!/bin/bash


VENV=$(pipenv --venv)

$VENV/bin/gunicorn app_namespace:app --timeout 120 -w 4 -b 0.0.0.0:8001
