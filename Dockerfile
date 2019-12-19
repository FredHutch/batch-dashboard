FROM ubuntu:18.04

RUN apt-get update -y

RUN apt-get update -y && apt-get install -y locales git vim software-properties-common software-properties-common curl python3-pip

# RUN add-apt-repository -y ppa:jonathonf/python-3.6
# RUN apt-get update -y
# RUN apt-get install -y python3.6


RUN curl https://bootstrap.pypa.io/get-pip.py | python3.6

COPY . /app/

WORKDIR /app

RUN locale-gen en_US.UTF-8
ENV LANG en_US.UTF-8
ENV LANGUAGE en_US:en
ENV LC_ALL en_US.UTF-8


# RUN pip3 install -r requirements.txt
RUN pip3 install pipenv
RUN pipenv install


EXPOSE 8001



CMD ./run.sh
