const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),assert=require('node:assert/strict'),fs=require('fs');
const BASE='http://127.0.0.1:5199';
const manifest=require('../../backend/internal/cms/content.json');
(async()=>{const b=await chromium.launch({channel:'chrome'});let checks=0;try{for(const mode of ['fallback','cms'])for(const width of [390,1440]){
 const docs=structuredClone(manifest.documents).filter(x=>x.key.startsWith('news.')).map(x=>({key:x.key,payload:x.data,revision:'test'}));
 if(mode==='cms')for(const d of docs)for(const l of ['lv','ru','en']){d.payload[l].title=`Synthetic ${l} ${d.key}`;d.payload[l].excerpt=`Synthetic excerpt ${l} ${d.key}`;}
 const c=await b.newContext({viewport:{width,height:900}});await c.addInitScript(()=>{sessionStorage.setItem('ag-welcome-seen','1');localStorage.setItem('ag-hero-preferences-v1',JSON.stringify({animation:false,video:false}));localStorage.setItem('ag-cookie-consent',JSON.stringify({version:2,necessary:true,preferences:true,maps:false,analytics:false,marketing:false,timestamp:new Date().toISOString()}));});
 const text=prefix=>Object.fromEntries(['lv','ru','en'].map(l=>[l,prefix+' '+l]));
 const created={key:'created.news.11111111-1111-4111-8111-111111111111',revision:'test',payload:{slug:'synthetic-created',date:'2026-10-16',title:text('Created title'),summary:text('Created summary'),body:text('Created body'),seo_title:text('SEO title'),seo_description:text('SEO description'),image:'original',order:0}};
 const response={schema_version:1,documents:mode==='cms'?[...docs,created]:[]};
 await c.route('**/*',r=>{const u=new URL(r.request().url());if(u.pathname==='/api/cms/published')return r.fulfill({json:response});if(u.origin!==BASE)return r.abort();if(u.pathname.startsWith('/api/'))return r.fulfill({json:response});return r.continue();});
 const p=await c.newPage();await p.goto(BASE);await p.locator('.journal-home').waitFor();
 assert.equal(await p.evaluate(async data=>(await import('/src/services/cms/content.ts')).acceptPublished(data),response),true);
 await p.evaluate(()=>window.__sameDocument=true);
 for(const locale of ['lv','ru','en']){
  await p.evaluate(async l=>{(await import('/src/i18n/index.ts')).default.global.locale.value=l;},locale);
  await p.waitForTimeout(100);assert.equal(await p.evaluate(()=>window.__sameDocument),true);
  assert.equal(await p.locator('.news-section .source-note').count(),0);assert.equal(await p.locator('.news-section [lang="lv"]').count(),locale==='lv'?8:0);
  const home=await p.locator('.journal-feature,.journal-compact').evaluateAll(xs=>xs.map(x=>({href:x.getAttribute('href'),title:x.querySelector('h3').textContent.trim(),excerpt:x.querySelector('p')?.textContent.trim(),date:x.querySelector('time').getAttribute('datetime')})));
  assert.equal(home.length,4);if(mode==='cms')assert.equal(home[0].title,'Created title '+locale);
  const listing=await c.newPage();await listing.goto(BASE+'/jaunumi?lang='+locale);await listing.locator('.journal-row').first().waitFor();await listing.evaluate(async data=>(await import('/src/services/cms/content.ts')).acceptPublished(data),response);
  for(const item of home){const row=listing.locator(`.journal-row[href="${item.href}"]`);assert.equal((await row.locator('h2').innerText()).trim(),item.title);if(item.excerpt)assert.equal((await row.locator('p').last().innerText()).trim(),item.excerpt);assert.equal(await row.locator('time').getAttribute('datetime'),item.date);}
  await listing.goto(BASE+home[0].href+'?lang='+locale);await listing.evaluate(async data=>(await import('/src/services/cms/content.ts')).acceptPublished(data),response);await listing.locator('h1').waitFor();assert.equal((await listing.locator('h1').innerText()).trim(),home[0].title);await listing.close();
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await p.locator('.news-section').scrollIntoViewIfNeeded();await p.waitForTimeout(800);fs.mkdirSync('../docs/screenshots/home-news-localization',{recursive:true});await p.locator('.news-section').screenshot({path:`../docs/screenshots/home-news-localization/${mode}-${locale}-${width}.png`});checks++;
 }await c.close();}console.log(`PASS ${checks} fallback/CMS locale/viewport cases, live switching and listing/detail consistency`);}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1});
