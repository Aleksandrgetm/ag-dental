// Synthetic published documents; all remote/API traffic intercepted by fixture.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
const {createCMSFixture}=require('./helpers/cms-fixture.cjs');
const BASE=process.env.TEST_BASE_URL||'http://127.0.0.1:5196';
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});const errors=[];let cases=0;const phase=process.env.ARTICLE_BEFORE?'before':'after';fs.mkdirSync('../docs/screenshots/unified-article',{recursive:true});try{
for(const locale of ['lv','ru','en'])for(const width of (process.env.ARTICLE_BEFORE?[390,1440]:[375,390,844,1440])){
 const {context,page,state}=await createCMSFixture(browser,locale,width,errors,false);
 const {emptyCreated}=await import('../src/services/cms/created.ts');
 for(const mode of ['portrait','landscape','minimal']){const p=emptyCreated();p.slug='synthetic-'+mode;p.image=mode==='landscape'?'/media/clinic/room.jpg':'/media/clinic/doctor.jpg';
 // Use actual registered image URLs; no new image content is introduced.
 const manifest=require('../../backend/internal/cms/content.json');p.image=manifest.media.find(a=>a.url.includes(mode==='landscape'?'room':'anda-gutovska')&&!a.protected)?.url||manifest.media.find(a=>a.kind==='image'&&!a.protected).url;
 for(const l of ['lv','ru','en']){p.title[l]='Synthetic editorial article '+l;p.body[l]=('Synthetic paragraph '+l+'. ').repeat(12)+'\n\n'+('Second paragraph '+l+'. ').repeat(12);p.summary[l]=mode==='minimal'?'':'A separate introduction '+l+'.';p.seo_title[l]=p.title[l];p.seo_description[l]='Synthetic description '+l;}
 if(!process.env.ARTICLE_BEFORE&&mode!=='minimal'){p.category={lv:'Kategorija',ru:'Категория',en:'Category'};p.author={lv:'Synthetic author',ru:'Synthetic author',en:'Synthetic author'}}
 // Before-schema capture needs the old required summary.
 if(process.env.ARTICLE_BEFORE&&mode==='minimal')for(const l of ['lv','ru','en'])p.summary[l]='Introduction '+l;
 const key='created.news.'+require('node:crypto').randomUUID(),id=require('node:crypto').randomUUID();state.rows.set(key,{document:{key,version:2,draft_revision:id,published_revision:id},revisions:[{id,payload:p,published_at:new Date().toISOString()}]});
 }
 for(const slug of ['zobu-protezes-un-protezesana','synthetic-portrait','synthetic-landscape','synthetic-minimal']){
 await page.goto(BASE+'/jaunumi/'+slug+'?lang='+locale);await page.locator('article h1').waitFor();await page.waitForFunction(()=>document.querySelector('article img')?.naturalWidth>0);await page.evaluate(()=>document.fonts.ready);
 if(!process.env.ARTICLE_BEFORE){assert.equal(await page.locator('.article-editorial').count(),1);assert.equal(await page.locator('.created-public').count(),0);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 const image=await page.locator('.article-photograph img').evaluate(img=>({w:img.clientWidth,h:img.clientHeight,nw:img.naturalWidth,nh:img.naturalHeight}));assert.ok(Math.abs(image.w/image.h-image.nw/image.nh)<.02,'Image natural ratio');
 if(slug==='synthetic-minimal'){assert.equal(await page.locator('.article-lead').count(),0);assert.equal(await page.locator('figcaption').count(),0);assert.equal(await page.locator('.article-meta span').count(),0)}
 if(slug.startsWith('synthetic')){assert.equal(await page.locator('.article-prose p').count(),2);assert.equal(await page.locator('link[rel=canonical]').getAttribute('href'),'https://www.zobarstnieciba-ag.lv/jaunumi/'+slug+(locale==='lv'?'':'?lang='+locale));}
 await page.reload();await page.locator('.article-editorial h1').waitFor();}
 if(locale==='en'||locale==='ru'&&width===1440)await page.screenshot({path:`../docs/screenshots/unified-article/${phase}-${slug}-${locale}-${width}.png`,fullPage:true});cases++;
 }
 if(!process.env.ARTICLE_BEFORE){
  const removed=[...state.rows.values()].find(r=>r.revisions[0].payload.slug==='synthetic-portrait');removed.document.published_revision=null;
  await page.goto(BASE+'/jaunumi/synthetic-portrait?lang='+locale);await page.waitForFunction(()=>document.querySelector('meta[name=robots]')?.content==='noindex, nofollow');assert.equal(await page.locator('.article-editorial').count(),0);assert.equal(await page.locator('link[rel=canonical]').count(),0);
  const legacy=state.rows.get('news.zobu-protezes-un-protezesana');legacy.document.published_revision=null;
  await page.goto(BASE+'/jaunumi/zobu-protezes-un-protezesana?lang='+locale);await page.waitForFunction(()=>document.querySelector('meta[name=robots]')?.content==='noindex, nofollow');assert.equal(await page.locator('.article-editorial').count(),0);
 }
 await context.close();
}assert.deepEqual(errors,[]);console.log(`${phase}: ${cases} article/locale/viewport cases PASS`);}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
