#!/usr/bin/env python3
"""Read-only, bounded legacy crawl. No forms, logins, or external hosts."""
import collections, datetime, hashlib, json, pathlib, time, urllib.error, urllib.parse, urllib.request
from html.parser import HTMLParser
import xml.etree.ElementTree as ET

BASE='https://www.zobarstnieciba-ag.lv/'
HOSTS={'www.zobarstnieciba-ag.lv','zobarstnieciba-ag.lv'}
OUT=pathlib.Path(__file__).resolve().parents[2]/'docs'/'legacy-crawl.json'
class Page(HTMLParser):
 def __init__(self):
  super().__init__();self.links=[];self.title=[];self.headings=[];self.description='';self.canonical='';self.alternates=[];self.images=[];self.text=[];self.stack=[];self.heading=None
 def handle_starttag(self,tag,attrs):
  a=dict(attrs);self.stack.append(tag)
  if tag=='a' and a.get('href'):self.links.append(a['href'])
  if tag=='meta' and a.get('name','').lower()=='description':self.description=a.get('content','')
  if tag=='link' and a.get('rel')=='canonical':self.canonical=a.get('href','')
  if tag=='link' and a.get('hreflang'):self.alternates.append(a)
  if tag=='img':self.images.append({k:a.get(k,'') for k in ['src','alt','width','height']})
  if tag in ['h1','h2','h3','h4','h5','h6']:self.heading={'level':tag,'text':''};self.headings.append(self.heading)
 def handle_endtag(self,tag):
  if tag in ['h1','h2','h3','h4','h5','h6']:self.heading=None
  if tag in self.stack:self.stack=self.stack[:len(self.stack)-1-self.stack[::-1].index(tag)]
 def handle_data(self,data):
  value=' '.join(data.split())
  if not value:return
  if 'title' in self.stack:self.title.append(value)
  if self.heading:self.heading['text']+=value+' '
  if not any(t in self.stack for t in ['script','style']):self.text.append(value)
class Redirects(urllib.request.HTTPRedirectHandler):
 def __init__(self):self.hops=[]
 def redirect_request(self,req,fp,code,msg,headers,newurl):
  self.hops.append({'from':req.full_url,'status':code,'to':newurl})
  if urllib.parse.urlsplit(newurl).hostname not in HOSTS:raise urllib.error.HTTPError(req.full_url,code,'external redirect',headers,fp)
  return super().redirect_request(req,fp,code,msg,headers,newurl)
queue=collections.deque();sources={};results=[]
def add(url,source):
 url=urllib.parse.urldefrag(urllib.parse.urljoin(source if source.startswith('http') else BASE,url))[0]
 u=urllib.parse.urlsplit(url)
 if u.scheme not in ['https','http'] or u.hostname not in HOSTS or u.username:return
 if pathlib.PurePosixPath(u.path).suffix.lower() in {'.jpg','.jpeg','.png','.webp','.gif','.svg','.ico','.mp4','.webm','.pdf','.css','.js','.woff','.woff2'}:return
 if url not in sources:sources[url]=[];queue.append(url)
 if source not in sources[url]:sources[url].append(source)
for url in [BASE,BASE+'robots.txt',BASE+'sitemap.xml']:add(url,'required discovery entry')
while queue and len(results)<500:
 url=queue.popleft();handler=Redirects();opener=urllib.request.build_opener(handler)
 row={'url':url,'sources':sources[url]}
 try:
  request=urllib.request.Request(url,headers={'User-Agent':'AG-Dental-Migration-Audit/1.0 (read-only URL preservation)'})
  try:response=opener.open(request,timeout=20)
  except urllib.error.HTTPError as e:response=e
  raw=response.read(4*1024*1024);body=raw.decode('utf-8','replace')
  row.update(status=response.code,final_url=response.geturl(),redirects=handler.hops,content_type=response.headers.get('Content-Type',''),sha256=hashlib.sha256(raw).hexdigest())
  if 'html' in row['content_type']:
   page=Page();page.feed(body);row.update(title=' '.join(page.title),description=page.description,headings=page.headings,canonical=page.canonical,hreflang=page.alternates,images=page.images,links=page.links,text=' '.join(page.text))
   if response.code==200:
    for link in page.links:add(link,row['final_url'])
  elif 'xml' in row['content_type'] or urllib.parse.urlsplit(url).path.endswith('.xml'):
   try:
    for elem in ET.fromstring(body).iter():
     if elem.tag.endswith('loc') and elem.text:add(elem.text,url)
   except ET.ParseError:pass
   row['body']=body
  elif url.endswith('robots.txt'):
   row['body']=body
   for line in body.splitlines():
    if line.lower().startswith('sitemap:'):add(line.split(':',1)[1].strip(),url)
 except Exception as e:row['error']=type(e).__name__+': '+str(e)
 results.append(row);print(row.get('status','ERROR'),url,flush=True);time.sleep(10)
OUT.write_text(json.dumps({'crawled_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'limit':500,'remaining':len(queue),'search_console_available':False,'pages':results},ensure_ascii=False,indent=2)+'\n')
print('Saved',len(results),'responses to',OUT)
