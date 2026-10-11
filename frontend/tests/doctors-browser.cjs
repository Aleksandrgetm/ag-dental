const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const {createCMSFixture}=require('./helpers/cms-fixture.cjs');
const manifest=require('../../backend/internal/cms/content.json');
const BASE=process.env.TEST_BASE_URL||'http://127.0.0.1:5185';
(async()=>{
 const {operationMessages}=await import('../src/i18n/operations.ts');const {mediaMessages}=await import('../src/i18n/media.ts');
 const browser=await chromium.launch({channel:'chrome',headless:true});const errors=[];let checks=0;
 try{for(const locale of ['lv','ru','en'])for(const width of [320,375,390,430,768,1024,1440,1920]){
  const {context,page}=await createCMSFixture(browser,locale,width,errors);const t=operationMessages[locale];let saved=null;
  await context.route('**/api/admin/operations/**',async route=>{
   const req=route.request();assert.match(req.headers().authorization||'',/^Bearer /);
   if(new URL(req.url()).pathname.endsWith('/options'))return route.fulfill({json:{doctors:[],sources:[]}});
   if(req.method()==='GET')return route.fulfill({json:{items:saved?[saved]:[]}});
   const body=req.postDataJSON();assert.equal(body.data.booking_enabled,false);
   saved={id:'11111111-1111-4111-8111-111111111118',version:'b'.repeat(64),data:body.data};return route.fulfill({json:saved});
  });
  await page.goto(BASE+'/admin/doctors/booking');await page.getByText(t.empty,{exact:true}).waitFor();
  await page.getByRole('button',{name:t.create,exact:true}).click();await page.getByLabel(t.doctorName,{exact:true}).fill('Synthetic specialist');
  for(let i=0;i<3;i++)await page.getByLabel(t.biography,{exact:true}).nth(i).fill('Synthetic biography '+i);
  await page.getByRole('button',{name:t.portrait,exact:true}).click();
  for(const asset of manifest.media.filter(a=>a.protected))assert.equal(await page.locator(`.portrait-picker [data-media-id="${asset.id}"]`).count(),0);
  await page.locator('.portrait-picker [data-media-id]').first().click();
  await page.getByRole('button',{name:mediaMessages[locale].select,exact:true}).click();
  await page.getByLabel(t.verified,{exact:true}).check();await page.getByRole('button',{name:t.save,exact:true}).click();await page.getByText(t.saved,{exact:true}).waitFor();
  assert.ok(saved.data.portrait_id);assert.equal(saved.data.active,false);
  await page.getByRole('button',{name:/Synthetic specialist/}).click();
  assert.equal(await page.getByLabel(t.biography,{exact:true}).nth(2).inputValue(),'Synthetic biography 2');
  await page.getByRole('button',{name:t.removePortrait,exact:true}).click();await page.getByLabel(t.verified,{exact:true}).check();
  await page.getByRole('button',{name:t.save,exact:true}).click();await page.getByText(t.saved,{exact:true}).waitFor();assert.equal(saved.data.portrait_id,'');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await context.close();checks++;
 }assert.deepEqual(errors,[]);console.log(`Doctors browser: ${checks} locale/viewport scenarios passed`)}finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
