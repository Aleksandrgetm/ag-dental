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
