#!/usr/bin/env python3

"A user class to satisfy flask-login"

class User(object): # pylint: disable=too-few-public-methods
    "A user class to satify flask-login"
    is_authenticated = False
    is_active = True
    is_anonymous = False
    username = None

    def __init__(self, username):
        self.username = username
        self.is_authenticated = True

    def get_id(self):
        "a method required by flask-login"
        return str(self.username)
