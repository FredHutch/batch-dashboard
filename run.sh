#!/bin/bash

# having more than one worker (-w) does not seem to play well with websockets

gunicorn app_namespace:app --timeout 120 -w 1 -k eventlet -b 0.0.0.0:8000
