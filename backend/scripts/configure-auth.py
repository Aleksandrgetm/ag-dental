#!/usr/bin/env python3
"""Inspect hosted Supabase Auth or enable immediate registration via Management API.
A management personal access token is entered privately, never stored or printed.
This administrative tool is not imported or served by the application.
"""
import argparse
import getpass
import json
import os
from pathlib import Path
import re
import sys
import urllib.error
import urllib.request


def local_config():
    result = {}
    for line in (Path(__file__).resolve().parents[1] / '.env').read_text().splitlines():
        if '=' in line and not line.lstrip().startswith('#'):
            key, value = line.split('=', 1)
            result[key.strip()] = value.strip().strip('\"').strip("'")
    for key in ('SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY'):
        if os.environ.get(key):
            result[key] = os.environ[key]
    return result


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def request(url, headers, payload=None):
    data = json.dumps(payload).encode() if payload is not None else None
    req = urllib.request.Request(url, data=data, headers=headers,
                                 method='PATCH' if payload is not None else 'GET')
    # Never print the complete Management API response: it can contain secrets.
    with urllib.request.build_opener(NoRedirect).open(req, timeout=15) as response:
        return json.load(response)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--apply-immediate-registration', action='store_true')
    args = parser.parse_args()
    config = local_config()
    base = config.get('SUPABASE_URL', '').rstrip('/')
    match = re.fullmatch(r'https://([a-z0-9]+)\.supabase\.co', base)
    if not match or not config.get('SUPABASE_PUBLISHABLE_KEY'):
        raise ValueError('Set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY in backend/.env.')
    public_headers = {'apikey': config['SUPABASE_PUBLISHABLE_KEY']}
    settings = request(base + '/auth/v1/settings', public_headers)
    print('Email confirmation required:', settings.get('mailer_autoconfirm') is not True)
    if not args.apply_immediate_registration:
        return
    if settings.get('mailer_autoconfirm') is True:
        print('Immediate registration is already enabled; no change made.')
        return
    token = os.environ.get('SUPABASE_ACCESS_TOKEN')
    if not token:
        if not sys.stdin.isatty():
            raise ValueError('Run interactively to enter a Supabase personal access token, or supply SUPABASE_ACCESS_TOKEN securely in the process environment.')
        token = getpass.getpass('Supabase personal access token (hidden): ').strip()
    if not token.startswith('sbp_'):
        raise ValueError('Use a Supabase account personal access token, not a publishable/service-role/project secret key.')
    result = request('https://api.supabase.com/v1/projects/' + match.group(1) + '/config/auth',
                     {'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json'},
                     {'mailer_autoconfirm': True})
    del token
    if result.get('mailer_autoconfirm') is not True:
        raise ValueError('The Management API did not confirm the requested setting.')
    print('Management API saved mailer_autoconfirm=true. No other setting was changed.')
    settings = request(base + '/auth/v1/settings', public_headers)
    if settings.get('mailer_autoconfirm') is not True:
        raise ValueError('The public Auth setting has not propagated yet. Re-run this script without flags to check it before testing a new registration.')
    print('Verified: new email/password registrations do not require email confirmation.')
    print('Test with a NEW controlled email address. Earlier unconfirmed test users may need to be recreated in Authentication > Users.')


if __name__ == '__main__':
    try:
        main()
    except urllib.error.HTTPError as error:
        print('Supabase request failed with HTTP status', error.code, file=sys.stderr)
        sys.exit(1)
    except (ValueError, OSError) as error:
        # Only our own configuration errors are displayed; transport errors have no response body.
        print(str(error) if isinstance(error, ValueError) else 'Unable to read configuration or reach Supabase.', file=sys.stderr)
        sys.exit(1)
