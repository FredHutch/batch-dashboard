FROM ubuntu:16.04

ARG QUEUE_URL
ARG APP_SECRET
ARG AWS_ACCESS_KEY_ID
ARG AWS_SECRET_ACCESS_KEY
ARG AWS_DEFAULT_REGION
ARG MONGO_URL

# We are writing a secret into the docker image! This is probably not the greatest
# thing ever. However, we are storing the image in a private repo and it will only
# be used in places that are under our control.
# TODO - Fix rancher secrets so this will no longer be necessary.
ENV QUEUE_URL=$QUEUE_URL
ENV APP_SECRET=$APP_SECRET
ENV AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY_ID
ENV AWS_SECRET_ACCESS_KEY=$AWS_SECRET_ACCESS_KEY
ENV AWS_DEFAULT_REGION=$AWS_DEFAULT_REGION
ENV MONGO_URL=$MONGO_URL

RUN apt-get update -y

RUN apt-get install -y python3 python3-pip locales git vim

COPY . /app/

WORKDIR /app

RUN pip3 install -r requirements.txt

EXPOSE 8000

RUN locale-gen en_US.UTF-8
ENV LANG en_US.UTF-8
ENV LANGUAGE en_US:en
ENV LC_ALL en_US.UTF-8


CMD ./run.sh
