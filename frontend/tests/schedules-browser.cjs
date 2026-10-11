const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const {createCMSFixture}=require('./helpers/cms-fixture.cjs');
const BASE=process.env.TEST_BASE_URL||'http://127.0.0.1:5185';
(async()=>{
 const {operationMessages}=await import('../src/i18n/operations.ts');const browser=await chromium.launch({channel:'chrome',headless:true});const errors=[];let checks=0;
 try{for(const locale of ['lv','ru','en'])for(const width of [320,375,390,430,768,1024,1440,1920]){
  const {context,page}=await createCMSFixture(browser,locale,width,errors);const t=operationMessages[locale];let saved=null,impact=false,empty=false;
  const doctor='11111111-1111-4111-8111-111111111118',service='11111111-1111-4111-8111-111111111119';
  await context.route('**/api/admin/operations/**',async route=>{
   const req=route.request(),url=new URL(req.url());assert.match(req.headers().authorization||'',/^Bearer /);
   if(url.pathname.endsWith('/options'))return route.fulfill({json:{doctors:empty?[]:[{id:doctor,name:'Synthetic specialist'}],services:empty?[]:[{id:service,name_lv:'Synthetic LV',name_ru:'Synthetic RU',name_en:'Synthetic EN'}]}});
   if(url.pathname.endsWith('/preview'))return route.fulfill({json:{slots:[{starts_at:'2026-10-12T06:00:00Z',ends_at:'2026-10-12T06:30:00Z'}],timezone:'Europe/Riga'}});
   if(req.method()==='GET')return route.fulfill({json:{items:saved?[saved]:[]}});
   if(impact)return route.fulfill({status:409,json:{error:'schedule_impact',affected_appointments:3}});
   const body=req.postDataJSON();assert.equal(body.data.start_minute,540);assert.equal(body.data.end_minute,720);
   saved={id:'11111111-1111-4111-8111-111111111117',version:'c'.repeat(64),data:{...body.data,start_time:'09:00:00',end_time:'12:00:00'}};return route.fulfill({json:saved});
  });
  await page.goto(BASE+'/admin/schedules');await page.getByText(t.empty,{exact:true}).waitFor();
  await page.getByRole('button',{name:t.create,exact:true}).click();await page.getByLabel(t.start,{exact:true}).fill('09:00');await page.getByLabel(t.end,{exact:true}).fill('12:00');
  await page.getByRole('button',{name:t.save,exact:true}).click();await page.getByText(t.saved,{exact:true}).waitFor();
  await page.getByRole('button',{name:/09:00–12:00/}).click();await page.getByLabel(t.active,{exact:true}).uncheck();impact=true;
  await page.getByRole('button',{name:t.save,exact:true}).click();await page.getByRole('alert').filter({hasText:t.impact.replace('{count}','3')}).waitFor();assert.equal(saved.data.active,true);
  await page.getByRole('button',{name:t.cancel,exact:true}).click();
  await page.getByLabel(t.services,{exact:true}).selectOption(service);await page.getByLabel(t.date,{exact:true}).fill('2026-10-12');await page.getByRole('button',{name:t.previewAvailability,exact:true}).click();await page.getByText('09:00–09:30',{exact:true}).waitFor();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);empty=true;saved=null;await page.reload();await page.getByRole('link',{name:t.doctors,exact:true}).waitFor();await page.getByText(t.previewSetup,{exact:false}).waitFor();assert.equal(await page.getByRole('button',{name:t.create,exact:true}).isDisabled(),true);assert.equal(await page.getByRole('button',{name:t.previewAvailability,exact:true}).isDisabled(),true);if(locale==='en'&&width===390)await page.screenshot({path:'/tmp/adminqa-schedules-mobile.png',fullPage:true});await context.close();checks++;
 }assert.deepEqual(errors,[]);console.log(`Schedules browser: ${checks} locale/viewport scenarios passed`)}finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
