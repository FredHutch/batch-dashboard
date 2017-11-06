#!/bin/bash


gunicorn app_namespace:app --timeout 120 -w 4 -k eventlet -b 0.0.0.0:8000
