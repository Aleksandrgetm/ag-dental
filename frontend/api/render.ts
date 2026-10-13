import {validServiceCatalog} from "../src/services/cms/serviceCatalog.ts";
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import type {IncomingMessage,ServerResponse} from 'node:http';
import {createdKey,validCreated,createdPath} from '../src/services/cms/created.ts';
import {metadataHTML,resolveServiceSEO,resolveSEO,publicPaths,sitemapXML,SITE_ORIGIN,escapeHTML} from '../src/services/seo.ts';

type PublicRows = {key:string;payload:any;revision?:string}[] & {withdrawnNews?:string[]};
export async function publicDocuments(fetcher:typeof fetch=fetch){
 const base=process.env.CMS_PUBLIC_API_URL;
 if(!base)return null;
 const parsed=new URL(base);
 if(parsed.protocol!=='https:'||parsed.username||parsed.password||parsed.search||parsed.hash)throw Error('Invalid public API configuration');
 const response=await fetcher(base.replace(/\/$/,'')+'/cms/published',{signal:AbortSignal.timeout(5000),redirect:'error',credentials:'omit'});
 if(!response.ok)throw Error('Public content unavailable');
 const body=await response.json() as {schema_version?:number;documents?:unknown[];withdrawn_news?:string[]};
 if(!body||body.schema_version!==1||!Array.isArray(body.documents)||body.documents.length>5000||!body.documents.every(r=>!!r&&typeof r==='object'&&'key' in r&&typeof r.key==='string'&&'payload' in r))throw Error('Invalid public content');
 const rows=body.documents as PublicRows;
 if(body.withdrawn_news!==undefined&&(!Array.isArray(body.withdrawn_news)||body.withdrawn_news.some(k=>typeof k!=='string'||!/^news\.[a-z0-9-]+$/.test(k))))throw Error('Invalid withdrawn articles');
 rows.withdrawnNews=body.withdrawn_news||[];
 return rows;
}
export function resolvePublic(path:string,locale:string,documents:PublicRows|null){
 const catalog=documents?.find(r=>r.key==='catalog.services')?.payload;
 const catalogService=validServiceCatalog(catalog)?catalog.services.find(s=>'/pakalpojumi/'+s.slug===path&&s.published&&!s.archived):undefined;
 if(path.startsWith('/pakalpojumi/')&&validServiceCatalog(catalog))return catalogService?{status:200,content:resolveServiceSEO(path,locale,catalogService,documents?.find(r=>r.key==='seo.page.'+createHash('sha256').update(path).digest('hex').slice(0,12))?.payload?.[locale])}:{status:404};
 if(documents?.withdrawnNews?.some(k=>path==='/jaunumi/'+k.slice(5)))return {status:404};
 const created=documents?.find(r=>createdKey.test(r.key)&&validCreated(r.payload)&&createdPath(r.key,r.payload.slug)===path);
 const key='seo.page.'+createHash('sha256').update(path).digest('hex').slice(0,12);
 const article=documents?.find(r=>r.key==='news.'+path.replace('/jaunumi/',''))?.payload?.[locale];
 const published=documents?.find(r=>r.key===key)?.payload?.[locale]||(article?{title:article.title,description:article.excerpt}:undefined);
 const baseline=resolveSEO(path,locale,typeof published?.title==='string'&&typeof published?.description==='string'?published:undefined);
 if(created)return {status:200,content:{title:created.payload.seo_title[locale],description:created.payload.seo_description[locale]},created:created.payload};
 if(publicPaths.includes(path)&&baseline)return {status:200,content:baseline};
 if(/^\/(informacija|jautajumi|jaunumi)\/[a-z0-9-]+$/.test(path)&&documents===null)return {status:503};
 return {status:404};
}
export default async function handler(req:IncomingMessage,res:ServerResponse){
 const url=new URL(req.url||'/',SITE_ORIGIN),path=url.searchParams.get('path')||'/';
 const locale=['ru','en'].includes(url.searchParams.get('lang')||'')?url.searchParams.get('lang')!:'lv';
 if(path==='/robots.txt'){
  res.writeHead(200,{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'public, max-age=60'});
  res.end(process.env.VERCEL_ENV==='production'?readFileSync(join(process.cwd(),'dist/robots.txt'),'utf8'):'User-agent: *\nDisallow: /\n');return;
 }
 let documents=null;
 try{documents=await publicDocuments()}catch{if(!publicPaths.includes(path)){res.writeHead(503,{'Cache-Control':'no-store','Retry-After':'60','X-Robots-Tag':'noindex'});res.end('Content temporarily unavailable');return}}
 if(path==='/sitemap.xml'){
  const catalog=documents?.find(r=>r.key==='catalog.services')?.payload;
  const servicePaths=validServiceCatalog(catalog)?catalog.services.filter(s=>s.published&&!s.archived).map(s=>'/pakalpojumi/'+s.slug):null;
  const extra=(documents||[]).filter(r=>createdKey.test(r.key)&&validCreated(r.payload)).map(r=>createdPath(r.key,r.payload.slug));
  res.writeHead(200,{'Content-Type':'application/xml; charset=utf-8','Cache-Control':'public, max-age=60'});res.end(sitemapXML([...new Set([...publicPaths.filter(path=>(!servicePaths||!path.startsWith('/pakalpojumi/')||servicePaths.includes(path))&&!documents?.withdrawnNews?.some(k=>path==='/jaunumi/'+k.slice(5))),...extra,...(servicePaths||[])])]));return;
 }
 const result=resolvePublic(path,locale,documents),preview=process.env.VERCEL_ENV!=='production'||url.searchParams.has('preview');
 let html:string;try{html=readFileSync(join(process.cwd(),'dist/index.html'),'utf8')}catch{res.writeHead(503,{'Cache-Control':'no-store'});res.end('Page unavailable');return}
 const content=result.content||{title:result.status===404?'404 · AG Zobārstniecība':'AG Zobārstniecība',description:''};
 html=html.replace(/<title>[\s\S]*?<\/title>/i,'').replace(/<meta\s+name="description"[\s\S]*?>/i,'').replace('<html lang="lv">',`<html lang="${locale}">`).replace('</head>',metadataHTML(path,locale,content,result.status===200&&!preview)+'</head>');
 if(result.created){const p=result.created;html=html.replace('<div id="app"></div>',`<div id="app"><article class="container"><header class="page-head"><h1>${escapeHTML(p.title[locale])}</h1><p>${escapeHTML(p.summary[locale])}</p></header>${p.body[locale].split('\n\n').map((text:string)=>'<p>'+escapeHTML(text)+'</p>').join('')}</article></div>`)}
 res.writeHead(result.status,{'Content-Type':'text/html; charset=utf-8','Cache-Control':result.status===200?'public, max-age=0, must-revalidate':'no-store',...(preview||result.status!==200?{'X-Robots-Tag':'noindex, nofollow'}:{})});res.end(html);
}
