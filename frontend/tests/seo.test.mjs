import {test} from 'node:test';
import assert from 'node:assert/strict';
import {canonicalURL,metadataHTML,sitemapXML,publicPaths} from '../src/services/seo.ts';
import {resolvePublic} from '../api/render.ts';
test('sitemap has reciprocal localized canonical URLs and excludes private routes',()=>{
 const xml=sitemapXML();for(const path of publicPaths)for(const locale of ['lv','ru','en'])assert.ok(xml.includes('<loc>'+canonicalURL(path,locale)+'</loc>'));
 assert.doesNotMatch(xml,/\/admin|\/login|\/register|\/pieraksts|\/api/);
 assert.equal((xml.match(/<url>/g)||[]).length,publicPaths.length*3);
 assert.equal((xml.match(/hreflang="x-default"/g)||[]).length,publicPaths.length*3);
 const html=metadataHTML('/cenas','ru',{title:'<unsafe>',description:'"quoted"'});assert.ok(html.includes('&lt;unsafe&gt;'));assert.ok(html.includes('?lang=ru'));assert.doesNotMatch(html,/<unsafe>/);
});
test('server rendering distinguishes absent dynamic pages from missing API configuration',()=>{
 assert.equal(resolvePublic('/cenas','en',null).status,200);
 assert.equal(resolvePublic('/informacija/unknown','en',[]).status,404);
 assert.equal(resolvePublic('/informacija/unknown','en',null).status,503);
 assert.equal(resolvePublic('/admin','en',[]).status,404);
 const text={lv:'Synthetic LV',ru:'Synthetic RU',en:'Synthetic EN'},payload={slug:'synthetic',date:'2026-10-10',title:text,summary:text,body:text,seo_title:text,seo_description:text,image:'',order:0};
 const row={key:'created.page.11111111-1111-4111-8111-111111111111',payload};
 assert.equal(resolvePublic('/informacija/synthetic','en',[row]).status,200);
 assert.equal(resolvePublic('/informacija/synthetic','en',[{...row,payload:{...payload,title:{...text,en:''}}}]).status,404);
});
