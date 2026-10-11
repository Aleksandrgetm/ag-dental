import {test} from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import config from '../vercel.json' with {type:'json'};
import crawl from '../../docs/legacy-crawl.json' with {type:'json'};
import manifest from '../../backend/internal/cms/content.json' with {type:'json'};
function resolve(path){
 if(['/robots.txt','/sitemap.xml'].includes(path))return {status:200};
 for(const route of config.routes){if(route.src&&new RegExp(route.src).test(path)&&!route.continue)return route}
 throw Error('No route');
}
test('every discovered legacy URL has one-hop 301 or valid 200, with existing broken endpoint remaining 404',async()=>{
 const server=http.createServer((req,res)=>{const route=resolve(new URL(req.url,'http://localhost').pathname);res.writeHead(route.status||200,route.headers||{});res.end('Routing contract fixture')});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{const base='http://127.0.0.1:'+server.address().port;
 for(const page of crawl.pages){const path=new URL(page.url).pathname;const response=await fetch(base+path,{redirect:'manual'});
  if(page.status===404){assert.equal(response.status,404);continue}
  assert.ok([200,301].includes(response.status),path);
  if(response.status===301){const next=response.headers.get('location');assert.ok(manifest.routes.includes(next),next);assert.equal((await fetch(base+next,{redirect:'manual'})).status,200);assert.notEqual(next,'/')}
 }
 assert.equal((await fetch(base+'/unknown-page')).status,404);
 assert.equal((await fetch(base+'/admin')).headers.get('location'),null);
 }finally{await new Promise(resolve=>server.close(resolve))}
});
