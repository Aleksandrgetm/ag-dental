"""Synthetic-only migration preservation checks. Never reads .env or external DSNs."""
import hashlib, json, pathlib, subprocess, time, uuid
root = pathlib.Path(__file__).resolve().parents[1]
image = 'postgres@sha256:67f41722b7a8cbdb868a44a4995c846eddfdc2973bccb291ce937dce88ad5675'
name = 'ag-booking008-' + uuid.uuid4().hex[:12]
def docker(*args, data=None):
    return subprocess.run(['docker', *args], input=data, capture_output=True)
def sql(q, fail=False):
    r = docker('exec', '-i', name, 'psql', '-X', '-qAt', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', data=q.encode())
    assert (r.returncode != 0) == fail, 'Unexpected synthetic SQL result: ' + r.stderr.decode()
    return r.stdout.decode().strip()
def snapshot():
    tables = sql("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename").splitlines()
    return {t: sql("SELECT coalesce(jsonb_agg(v ORDER BY v::text),'[]') FROM (SELECT to_jsonb(t)-'booking_horizon_months' AS v FROM public.\"" + t + '\" t) s') for t in tables}
try:
    r = docker('run', '-d', '--pull=never', '--name', name, '--network=none', '--log-driver=none', '--tmpfs', '/var/lib/postgresql/data:rw,nosuid,size=384m', '-e', 'POSTGRES_HOST_AUTH_METHOD=trust', image)
    assert r.returncode == 0, 'Cannot start isolated container'
    for _ in range(30):
        if docker('exec', name, 'pg_isready', '-U', 'postgres').returncode == 0: break
        time.sleep(.3)
    info = json.loads(docker('inspect', name).stdout)[0]
    assert info['HostConfig']['NetworkMode']=='none' and not info['HostConfig']['PortBindings']
    sql((root/'testdata/bootstrap.sql').read_text())
    for m in ['001_user_roles','002_booking_foundation','003_automatic_confirmation','004_website_cms','005_cms_media','proposed/006_admin_operations','proposed/007_news_archive']:
        sql((root/'migrations'/f'{m}.sql').read_text())
    sql((root/'testdata/acceptance.sql').read_text())
    sql("""INSERT INTO appointments(booking_reference,service_id,doctor_id,first_name,last_name,phone,email,starts_at,ends_at,status,privacy_notice_version,privacy_acknowledged_at,idempotency_key,request_fingerprint)
    VALUES('SYNTHETIC008','20000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','Synthetic','Patient','12345678','test@example.invalid',now()+interval '2 days',now()+interval '2 days 30 minutes','pending','synthetic',now(),gen_random_uuid(),repeat('a',64));""")
    before = snapshot()
    up = (root/'migrations/proposed/008_calendar_month_horizon.sql').read_text()
    assert hashlib.sha256(up.encode()).hexdigest()=='2b1db4fc48db4bfd36b7296bce67317aa5eb2e5ed13650c573e695c938069394'
    down = (root/'migrations/proposed/008_calendar_month_horizon.down.sql').read_text()
    sql(up)
    assert sql('SELECT booking_horizon_months FROM booking_settings')=='0' and snapshot()==before
    sql(up, fail=True)
    assert snapshot()==before
    for value in ['-1','13','NULL']:
        sql('UPDATE booking_settings SET booking_horizon_months='+value, fail=True)
    sql('UPDATE booking_settings SET booking_horizon_months=1')
    sql(down, fail=True)
    assert sql('SELECT booking_horizon_months FROM booking_settings')=='1'
    sql('UPDATE booking_settings SET booking_horizon_months=0')
    # Explicit synthetic policy updates fire updated_at; snapshot after those updates.
    after_policy = snapshot()
    assert all(after_policy[t]==before[t] for t in before if t!='booking_settings')
    before = after_policy
    sql(down)
    assert snapshot()==before
    # Inject a failure before COMMIT: the column must not survive connection rollback.
    sql(up.replace('COMMIT;', 'SELECT 1/0;\nCOMMIT;'), fail=True)
    assert sql("SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND column_name='booking_horizon_months'")=='0'
    sql(up)
    assert snapshot()==before
    print('PASS: 001–007 compatibility; synthetic appointment/service/schedule and all public data preserved; default 0; raw repeat fails atomically; range/null checks; active rollback refused; down/up; injected transaction failure rollback.')
finally:
    docker('rm', '-f', name)
