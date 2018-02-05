"""
Authentication module
"""
import ldap3
from ldap3.core.exceptions import LDAPInvalidCredentialsResult


def authenticate(username, password):
    """
    Determine whether hutchnet ID & password are valid.
    Only works inside Hutch network (which is good!).
    """

    if not password:
        return False

    server = ldap3.Server('dc.fhcrc.org', port=636,
                          use_ssl=True, get_info=ldap3.ALL)
    # Does the password go over the wire in cleartext?
    # probably need a different authentication method than SIMPLE
    try:
        conn = ldap3.Connection(server, authentication=ldap3.SIMPLE,
                                user='{}@fhcrc.org'.format(username),
                                password=password,
                                check_names=True,
                                lazy=False, client_strategy=ldap3.SYNC,
                                raise_exceptions=True)
        conn.open()
        conn.bind()
        return True
    except LDAPInvalidCredentialsResult:
        return False
    return False
