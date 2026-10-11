#!/usr/bin/env python3
"""Disposable real Auth/PostgreSQL/Storage acceptance. Never reads project .env."""
import base64,hashlib,hmac,json,os,pathlib,secrets,shutil,socket,ssl,subprocess,tempfile,time,urllib.request,urllib.error
ROOT=pathlib.Path(__file__).resolve().parents[2]
PG='postgres@sha256:67f41722b7a8cbdb868a44a4995c846eddfdc2973bccb291ce937dce88ad5675'
AUTH='supabase/gotrue@sha256:c0c25187a6b835e65a6f6e6c6b39d090e832d40e6de5186f2c038e0411944232'
STORAGE='supabase/storage-api@sha256:f1546fac6d1c7e345428ac904bfaa7be7cecd50a1f549fe1cf38c628a7b15c85'
TMP=pathlib.Path(tempfile.mkdtemp(prefix='ag-real-e2e-'));os.chmod(TMP,0o700)
NAME='ag-acceptance-'+secrets.token_hex(4);containers=[];children=[]
env={'PATH':os.environ['PATH'],'HOME':os.environ['HOME'],'TMPDIR':str(TMP),'GIN_MODE':'release'}
log=open(TMP/'process.log','w');os.chmod(TMP/'process.log',0o600)
def run(args,**kw):return subprocess.run(args,check=True,stdout=subprocess.PIPE,stderr=log,**kw).stdout.decode().strip()
def sql(q):return run(['docker','exec','-i',NAME+'-pg','psql','-X','-At','-U','qa','-d','ag_acceptance_test','-v','ON_ERROR_STOP=1'],input=q.encode())
def container(suffix,image,port,target,values,extra=[]):
 name=NAME+'-'+suffix;f=TMP/(suffix+'.env');f.write_text('\n'.join(k+'='+str(v) for k,v in values.items()));os.chmod(f,0o600)
 run(['docker','run','-d','--pull=never','--name',name,'--network',NAME,'-p',f'127.0.0.1:{port}:{target}','--env-file',str(f),*extra,image]);containers.append(name)
def wait(url,context=None):
 for _ in range(120):
  try:
   with urllib.request.urlopen(url,context=context,timeout=2) as r:
    if r.status==200:return
  except Exception:pass
  time.sleep(.5)
 raise RuntimeError('Local service not ready: '+url)
def jwt(role):
 b64=lambda b:base64.urlsafe_b64encode(b).rstrip(b'=')
 body=b64(b'{"alg":"HS256","typ":"JWT"}')+b'.'+b64(json.dumps({'role':role,'iss':'supabase','iat':int(time.time()),'exp':int(time.time())+7200}).encode())
 return (body+b'.'+b64(hmac.new(secret.encode(),body,hashlib.sha256).digest())).decode()
def request(url,body,token=None,ctx=None):
 headers={'Content-Type':'application/json'}
 if token:headers['Authorization']='Bearer '+token
 try:
  with urllib.request.urlopen(urllib.request.Request(url,json.dumps(body).encode(),headers),context=ctx,timeout=30) as r:return json.load(r)
 except urllib.error.HTTPError as e:
  (TMP/'http-error.json').write_bytes(e.read());raise RuntimeError('Local HTTP '+str(e.code)+'; private diagnostic saved') from None
try:
 for port in [5190,55901,55902,55903,55904]:
  with socket.socket() as s:
   s.setsockopt(socket.SOL_SOCKET,socket.SO_REUSEADDR,1);s.bind(('127.0.0.1',port))
 run(['docker','network','create',NAME])
 container('pg',PG,55901,5432,{'POSTGRES_USER':'qa','POSTGRES_DB':'ag_acceptance_test','POSTGRES_HOST_AUTH_METHOD':'trust'},['--tmpfs','/var/lib/postgresql/data:rw,noexec,nosuid,size=512m'])
 for _ in range(60):
  try:sql('SELECT 1');break
  except subprocess.CalledProcessError:time.sleep(.5)
 sql('CREATE ROLE postgres NOLOGIN; CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN BYPASSRLS; CREATE SCHEMA auth;')
 secret=secrets.token_urlsafe(48);anon=jwt('anon');service=jwt('service_role');password=secrets.token_urlsafe(24)
 db=f'postgres://qa@{NAME}-pg:5432/ag_acceptance_test?sslmode=disable'
 container('auth',AUTH,55902,9999,{'GOTRUE_API_HOST':'0.0.0.0','GOTRUE_API_PORT':9999,'API_EXTERNAL_URL':'https://localhost:5190/auth/v1','GOTRUE_DB_DRIVER':'postgres','GOTRUE_DB_DATABASE_URL':db+'&search_path=auth','GOTRUE_SITE_URL':'https://localhost:5190','GOTRUE_JWT_SECRET':secret,'GOTRUE_JWT_AUD':'authenticated','GOTRUE_JWT_ADMIN_ROLES':'service_role','GOTRUE_EXTERNAL_EMAIL_ENABLED':'true','GOTRUE_MAILER_AUTOCONFIRM':'true','GOTRUE_DISABLE_SIGNUP':'false','GOTRUE_RATE_LIMIT_EMAIL_SENT':0})
 wait('http://127.0.0.1:55902/health')
 assert sql("SELECT to_regclass('auth.users')")=='auth.users'
 for migration in ['001_user_roles','002_booking_foundation','003_automatic_confirmation','004_website_cms','005_cms_media','proposed/006_admin_operations']:
  sql((ROOT/'backend/migrations'/f'{migration}.sql').read_text());print('Applied only to disposable database: '+migration,flush=True)
 # Auth users are created through the real Auth API, never auth table inserts.
 admin=request('http://127.0.0.1:55902/signup',{'email':'admin@acceptance.invalid','password':password})
 user=request('http://127.0.0.1:55902/signup',{'email':'user@acceptance.invalid','password':password,'data':{'role':'admin'}})
 assert admin.get('access_token') and user.get('access_token')
 admin_id=admin['user']['id'];assert len(admin_id)==36
 sql("UPDATE user_roles SET role='admin' WHERE user_id='"+admin_id+"'")
 # Local-only platform prerequisites used by real Storage migrations/RLS.
 sql("GRANT USAGE ON SCHEMA auth TO anon,authenticated,service_role;")
 container('storage',STORAGE,55903,5000,{'ANON_KEY':anon,'SERVICE_KEY':service,'AUTH_JWT_SECRET':secret,'DATABASE_URL':db,'DATABASE_SEARCH_PATH':'storage','STORAGE_BACKEND':'file','FILE_STORAGE_BACKEND_PATH':'/var/lib/storage','FILE_SIZE_LIMIT':33554432,'TENANT_ID':'acceptance-only','REGION':'local','GLOBAL_S3_BUCKET':'local','ENABLE_IMAGE_TRANSFORMATION':'false','POSTGREST_URL':'http://127.0.0.1:1'},['--tmpfs','/var/lib/storage:rw,nosuid,size=256m'])
 wait('http://127.0.0.1:55903/status')
 sql('GRANT USAGE ON SCHEMA storage TO anon,authenticated,service_role; GRANT ALL ON ALL TABLES IN SCHEMA storage TO anon,authenticated,service_role; GRANT ALL ON ALL SEQUENCES IN SCHEMA storage TO service_role;')
 request('http://127.0.0.1:55903/bucket',{'id':'ag-dental-cms','name':'ag-dental-cms','public':False,'file_size_limit':33554432,'allowed_mime_types':['image/jpeg','image/png','image/webp','image/avif','video/mp4','video/webm']},service)
 sql((ROOT/'backend/storage/cms_media_policies.sql').read_text())
 run(['openssl','req','-x509','-newkey','rsa:2048','-nodes','-keyout',str(TMP/'key.pem'),'-out',str(TMP/'cert.pem'),'-days','1','-subj','/CN=localhost','-addext','subjectAltName=DNS:localhost,IP:127.0.0.1'])
 pub=run(['openssl','x509','-in',str(TMP/'cert.pem'),'-pubkey','-noout'])
 der=subprocess.run(['openssl','pkey','-pubin','-outform','DER'],input=pub.encode(),stdout=subprocess.PIPE,check=True).stdout
 spki=base64.b64encode(hashlib.sha256(der).digest()).decode()
 qa={**env,'DATABASE_URL':'postgres://qa@127.0.0.1:55901/ag_acceptance_test?sslmode=disable','SUPABASE_URL':'https://localhost:5190','SUPABASE_PUBLISHABLE_KEY':anon,'SUPABASE_STORAGE_SECRET_KEY':service,'SSL_CERT_FILE':str(TMP/'cert.pem'),'PORT':'55904','MEDIA_UPLOADS_ENABLED':'true','CORS_ALLOWED_ORIGINS':'https://localhost:5190'}
 for name in ['api','cms']:run(['go','build','-o',str(TMP/name),'./cmd/'+name],cwd=ROOT/'backend')
 run([str(TMP/'cms'),'--apply','--confirm-import'],env=qa,cwd=TMP)
 sql((ROOT/'backend/testdata/acceptance.sql').read_text())
 children.append(subprocess.Popen([str(TMP/'api')],env=qa,cwd=TMP,stdout=log,stderr=log))
 fe={**env,'AG_ACCEPTANCE':'disposable','QA_TLS_KEY':str(TMP/'key.pem'),'QA_TLS_CERT':str(TMP/'cert.pem'),'VITE_API_URL':'/api','VITE_SUPABASE_URL':'https://localhost:5190','VITE_SUPABASE_PUBLISHABLE_KEY':anon,'VITE_BOOKING_DEMO':'false'}
 children.append(subprocess.Popen(['node','scripts/acceptance-server.mjs'],cwd=ROOT/'frontend',env=fe,stdout=log,stderr=log))
 wait('https://localhost:5190/api/health',ssl.create_default_context(cafile=str(TMP/'cert.pem')))
 print('ISOLATION VERIFIED: new dedicated Docker network, loopback ports, disposable DB, real local Auth/Storage, temporary files, no production environment.',flush=True)
 run(['ffmpeg','-v','error','-f','lavfi','-i','color=c=blue:s=800x800','-frames:v','1','-y',str(TMP/'synthetic.png')])
 run(['ffmpeg','-v','error','-f','lavfi','-i','color=c=red:s=800x800','-frames:v','1','-y',str(TMP/'replacement.png')])
 run(['ffmpeg','-v','error','-f','lavfi','-i','color=c=green:s=800x800','-frames:v','1','-y',str(TMP/'deletable.png')])
 testenv={**env,'QA_IMAGE_DELETABLE':str(TMP/'deletable.png'),'QA_IMAGE_REPLACEMENT':str(TMP/'replacement.png'),'QA_IMAGE':str(TMP/'synthetic.png'),'AG_ACCEPTANCE':'disposable','QA_PASSWORD':password,'QA_SPki':spki,'NODE_EXTRA_CA_CERTS':str(TMP/'cert.pem'),'QA_CA':str(TMP/'cert.pem'),'QA_PG_CONTAINER':NAME+'-pg','QA_USER_TOKEN':user['access_token'],'QA_ANON_KEY':anon,'PLAYWRIGHT_MODULE':os.environ.get('PLAYWRIGHT_MODULE','playwright')}
 result=subprocess.run(['node','tests/acceptance-real-browser.cjs'],cwd=ROOT/'frontend',env=testenv)
 if result.returncode:raise RuntimeError('Browser acceptance failed; see sanitized test output')
finally:
 for child in reversed(children):
  child.terminate()
  try:child.wait(timeout=10)
  except subprocess.TimeoutExpired:child.kill();child.wait()
 for name in reversed(containers):subprocess.run(['docker','rm','-f',name],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
 subprocess.run(['docker','network','rm',NAME],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
 log.close()
 import shutil
 shutil.rmtree(TMP)
 print('Disposable services and private credentials removed.',flush=True)
