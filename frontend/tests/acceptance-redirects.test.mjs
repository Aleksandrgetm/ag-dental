import {test} from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import handler from '../api/render.ts';
test('eight configured legacy redirects return real HTTP 301 and one-hop 200 destinations',async()=>{
 const config=JSON.parse(fs.readFileSync(new URL('../vercel.json',import.meta.url)));
 const mapping=JSON.parse(fs.readFileSync(new URL('../src/services/legacyRedirects.json',import.meta.url)));
 const previous=process.env.VERCEL_ENV;process.env.VERCEL_ENV='production';
 const server=http.createServer(async(req,res)=>{const url=new URL(req.url,'http://localhost');const rule=config.routes.find(r=>r.status===301&&new RegExp(r.src).test(url.pathname));if(rule){res.writeHead(301,rule.headers);res.end();return}req.url='/?path='+encodeURIComponent(url.pathname);try{await handler(req,res)}catch{res.statusCode=500;res.end()}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));try{const base='http://127.0.0.1:'+server.address().port;assert.equal(Object.keys(mapping).length,8);for(const [from,to] of Object.entries(mapping)){const response=await fetch(base+from,{redirect:'manual'});assert.equal(response.status,301,from);assert.equal(response.headers.get('location'),to);assert.equal((await fetch(base+to,{redirect:'manual'})).status,200,to)}assert.equal((await fetch(base+'/missing-acceptance')).status,404);assert.equal((await fetch(base+'/jaunumi/unknown-acceptance')).status,503)}finally{await new Promise(r=>server.close(r));if(previous===undefined)delete process.env.VERCEL_ENV;else process.env.VERCEL_ENV=previous}
});
