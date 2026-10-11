const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const {createCMSFixture}=require('./helpers/cms-fixture.cjs');
const BASE=process.env.TEST_BASE_URL||'http://127.0.0.1:5185';
(async()=>{
 const {simpleMessages}=await import('../src/i18n/adminSimple.ts');const {cmsMessages}=await import('../src/i18n/cms.ts');const {createdMessages}=await import('../src/i18n/created.ts');const {operationMessages}=await import('../src/i18n/operations.ts');const {mediaMessages}=await import('../src/i18n/media.ts');
 const browser=await chromium.launch({channel:'chrome',headless:true});let checks=0;const errors=[];
 try{for(const locale of ['lv','ru','en'])for(const width of [320,375,390,430,768,1024,1440,1920])for(const kind of ['news']){
  const {context,page,state}=await createCMSFixture(browser,locale,width,errors);const t=createdMessages[locale],o={...operationMessages[locale],save:cmsMessages[locale].save};let row=null,history=[];
  await context.route('**/api/admin/cms/documents**',async route=>{
   const req=route.request(),path=new URL(req.url()).pathname;assert.match(req.headers().authorization||'',/^Bearer /);
   if(path.endsWith('/documents')&&req.method()==='GET')return route.fulfill({json:{documents:row?[{...row,title:history[0].payload.title}]:[]}});
   if(path.endsWith('/documents')&&req.method()==='POST'){const body=req.postDataJSON();row={key:body.key,version:1,draft_revision:'11111111-1111-4111-8111-111111111111',published_revision:null};history=[{id:row.draft_revision,payload:body.payload,created_at:new Date().toISOString(),published_at:null}];return route.fulfill({status:201,json:row})}
   if(req.method()==='GET')return route.fulfill({json:{document:row,revisions:history,booking_links:[]}});
   const body=req.postDataJSON();assert.equal(body.expected_version,row.version);row.version++;
   if(path.endsWith('/publish')||path.endsWith('/rollback')){row.published_revision=history[0].id;history[0].published_at=new Date().toISOString()}
   if(path.endsWith('/unpublish'))row.published_revision=null;
   return route.fulfill({json:row});
  });
  await context.route('**/api/cms/published',route=>route.fulfill({json:{schema_version:1,media:[],documents:[...state.rows.values()].map(r=>({key:r.document.key,revision:r.document.published_revision,payload:r.revisions[0].payload})).concat(row?.published_revision?[{key:row.key,revision:row.published_revision,payload:history[0].payload}]:[])}}));
  await page.goto(BASE+(kind==='news'?'/admin/news':'/admin/pages'));await page.locator('.admin-page-heading').getByRole('link',{name:simpleMessages[locale][kind==='news'?'addNews':kind==='page'?'addPage':'addFAQ'],exact:true}).click();
  for(const language of ['lv','ru','en']){await page.getByLabel(t.language,{exact:true}).selectOption(language);for(const f of ['title','body'])await page.getByLabel(t[f]+' · '+language.toUpperCase(),{exact:true}).fill('Synthetic '+f+' '+language);if(language==='lv'){await page.getByRole('button',{name:o.save,exact:true}).click();assert.equal(row,null);await page.getByRole('alert').waitFor();assert.match(await page.getByRole('alert').innerText(),/RU, EN/);assert.equal(await page.getByLabel(t.language,{exact:true}).inputValue(),'ru')}}
  await page.getByRole('button',{name:t.image,exact:true}).click();await page.locator('dialog [data-media-id]').first().click();await page.locator('dialog').getByRole('button',{name:mediaMessages[locale].select,exact:true}).click();
  await page.getByRole('button',{name:o.save,exact:true}).click();await page.waitForURL(new RegExp('edit/created\\.'+kind+'\\.'));assert.equal(row.published_revision,null);assert.ok(history[0].payload.image);
  await page.getByRole('button',{name:t.preview,exact:true}).click();await page.locator('article h1').waitFor();
  await page.getByRole('button',{name:t.publish,exact:true}).click();await page.getByRole('link',{name:t.view,exact:true}).waitFor();
  const publicPage=await context.newPage();await publicPage.goto(BASE+({news:'/jaunumi',page:'/informacija',faq:'/jautajumi'}[kind])+'/'+history[0].payload.slug);await publicPage.getByRole('heading',{name:'Synthetic title '+locale,exact:true}).waitFor();
  await publicPage.locator('article.created-public > img').waitFor({timeout:5000});assert.equal(await publicPage.locator('article.created-public > img').getAttribute('src'),history[0].payload.image);await publicPage.waitForFunction(()=>{const image=document.querySelector('article.created-public > img');return image?.complete&&image.naturalWidth>0});
  assert.equal(await publicPage.locator('meta[name=description]').getAttribute('content'),'Synthetic body '+locale);
  await page.getByRole('button',{name:t.archive,exact:true}).click();await page.getByRole('link',{name:t.view,exact:true}).waitFor({state:'hidden'});assert.equal(row.published_revision,null);assert.equal(history.length,1);
  await publicPage.reload();await publicPage.getByRole('heading',{name:'Synthetic title '+locale,exact:true}).waitFor({state:'hidden'});
  await page.getByRole('button',{name:t.restore,exact:true}).click();await page.getByRole('link',{name:t.view,exact:true}).waitFor();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await context.close();checks++;
 }assert.deepEqual(errors,[]);console.log(`Created content browser: ${checks} locale/viewport scenarios passed`)}finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
