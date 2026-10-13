import {test} from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import handler from '../api/render.ts';
test('prepared public renderer returns initial localized metadata and safe statuses without Go API',async()=>{
 const cwd=process.cwd(),prior=process.env.CMS_PUBLIC_API_URL,env=process.env.VERCEL_ENV;
 delete process.env.CMS_PUBLIC_API_URL;process.env.VERCEL_ENV='production';process.chdir(path.resolve(import.meta.dirname,'..'));
 const server=http.createServer((req,res)=>{handler(req,res).catch(()=>{res.statusCode=500;res.end()})});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 try{const base='http://127.0.0.1:'+server.address().port;
 for(const locale of ['lv','ru','en']){const response=await fetch(base+'/?path=/cenas&lang='+locale);assert.equal(response.status,200);const html=await response.text();assert.match(html,new RegExp('<html lang="'+locale+'">'));assert.equal((html.match(/<title>/g)||[]).length,1);assert.ok(html.includes('hreflang="x-default"'));assert.ok(html.includes('rel="canonical"'))}
 assert.equal((await fetch(base+'/?path=/informacija/unknown')).status,503);assert.equal((await fetch(base+'/?path=/private-secret')).status,404);
 const map=await fetch(base+'/?path=/sitemap.xml');assert.equal(map.status,200);assert.ok((await map.text()).includes('<urlset'));
 process.env.VERCEL_ENV='preview';const preview=await fetch(base+'/?path=/cenas');assert.equal(preview.headers.get('x-robots-tag'),'noindex, nofollow');assert.equal(await (await fetch(base+'/?path=/robots.txt')).text(),'User-agent: *\nDisallow: /\n');
 }finally{await new Promise(r=>server.close(r));process.chdir(cwd);if(prior===undefined)delete process.env.CMS_PUBLIC_API_URL;else process.env.CMS_PUBLIC_API_URL=prior;if(env===undefined)delete process.env.VERCEL_ENV;else process.env.VERCEL_ENV=env}
});

test('withdrawn imported news is 404 and published created news resolves without rebuild',async()=>{
 const {resolvePublic}=await import('../api/render.ts');
 const docs=[];docs.withdrawnNews=['news.zobu-higiena'];
 assert.equal(resolvePublic('/jaunumi/zobu-higiena','en',docs).status,404);
 const {emptyCreated}=await import('../src/services/cms/created.ts');const p=emptyCreated();p.slug='synthetic-new';for(const f of ['title','body','summary','seo_title','seo_description'])p[f]={lv:'LV',ru:'RU',en:'EN'};
 docs.push({key:'created.news.11111111-1111-4111-8111-111111111111',payload:p});
 assert.equal(resolvePublic('/jaunumi/synthetic-new','ru',docs).content.title,'RU');
 docs.length=0;assert.equal(resolvePublic('/jaunumi/synthetic-new','en',docs).status,404);
});

test('live sitemap omits withdrawn legacy news and includes published dynamic news',async()=>{
 const oldURL=process.env.CMS_PUBLIC_API_URL,prior=globalThis.fetch;
 process.env.CMS_PUBLIC_API_URL='https://cms.example.invalid/api';
 const {emptyCreated}=await import('../src/services/cms/created.ts');const p=emptyCreated();p.slug='synthetic-news';for(const field of ['title','body','summary','seo_title','seo_description'])p[field]={lv:'LV',ru:'RU',en:'EN'};
 globalThis.fetch=(url,options)=>String(url).startsWith('https://cms.example.invalid/')?Promise.resolve(new Response(JSON.stringify({schema_version:1,withdrawn_news:['news.zobu-higiena'],documents:[{key:'created.news.11111111-1111-4111-8111-111111111111',payload:p}]}),{status:200})):prior(url,options);
 const server=http.createServer((req,res)=>{handler(req,res).catch(()=>{res.statusCode=500;res.end()})});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 try{const response=await fetch('http://127.0.0.1:'+server.address().port+'/?path=/sitemap.xml');assert.equal(response.status,200);const xml=await response.text();assert.ok(xml.includes('/jaunumi/synthetic-news'));assert.ok(!xml.includes('/jaunumi/zobu-higiena<'));assert.ok(!xml.includes('/jaunumi/zobu-higiena?'));}
 finally{await new Promise(r=>server.close(r));globalThis.fetch=prior;if(oldURL===undefined)delete process.env.CMS_PUBLIC_API_URL;else process.env.CMS_PUBLIC_API_URL=oldURL}
});
