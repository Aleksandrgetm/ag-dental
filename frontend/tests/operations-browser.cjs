// Intercepted local contracts only. Never connects to production Auth or DB.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const { createCMSFixture } = require('./helpers/cms-fixture.cjs');
const BASE = process.env.TEST_BASE_URL || 'http://127.0.0.1:5185';
(async()=>{
 const {operationMessages}=await import('../src/i18n/operations.ts');
 const browser=await chromium.launch({channel:'chrome',headless:true});
 const errors=[];let checks=0;
 try {
  for(const locale of ['lv','ru','en']) for(const width of [320,375,390,430,768,1024,1440,1920]) {
   const {context,page}=await createCMSFixture(browser,locale,width,errors);
   const t=operationMessages[locale];let saved=null,conflict=false,unavailable=false;
   await context.route('**/api/admin/operations/**',async route=>{
    assert.match(route.request().headers().authorization||'',/^Bearer /);
    if(new URL(route.request().url()).pathname.endsWith('/options'))return route.fulfill({json:{sources:[],doctors:[]}});
    if(unavailable)return route.fulfill({status:503,json:{error:'booking_unavailable'}});
    if(route.request().method()==='GET')return route.fulfill({json:{items:saved?[saved]:[]}});
    if(conflict)return route.fulfill({status:409,json:{error:'conflict'}});
    const body=route.request().postDataJSON();
    assert.match(body.operation_id,/^[0-9a-f-]{36}$/);
    assert.equal(body.data.duration_minutes,null);
    assert.equal(body.data.booking_enabled,false);
    saved={id:'11111111-1111-4111-8111-111111111119',version:'a'.repeat(64),data:body.data};
    return route.fulfill({json:saved});
   });
   await page.goto(BASE+'/admin/services/booking');
   await page.getByText(t.empty,{exact:true}).waitFor();
   await page.getByRole('button',{name:t.create,exact:true}).click();
   await page.locator('details').first().locator('summary').click();await page.getByLabel(t.slug,{exact:true}).fill('synthetic-test');
   const fields=page.getByLabel(t.name,{exact:true});
   for(let i=0;i<3;i++)await fields.nth(i).fill('Synthetic '+i);
   assert.equal(await page.getByLabel(t.slug,{exact:true}).inputValue(),'synthetic-test');
   await page.getByLabel(t.verified,{exact:true}).check();
   await page.getByRole('button',{name:t.save,exact:true}).click();
   await page.getByText(t.saved,{exact:true}).waitFor();
   assert.ok(saved);
   await page.getByRole('button',{name:new RegExp('Synthetic '+['lv','ru','en'].indexOf(locale))}).click();
   await page.getByLabel(t.name,{exact:true}).first().fill('Changed');
   await page.getByLabel(t.verified,{exact:true}).check();conflict=true;
   await page.getByRole('button',{name:t.save,exact:true}).click();
   await page.getByRole('alert').filter({hasText:t.conflict}).waitFor();
   assert.equal(await page.getByLabel(t.name,{exact:true}).first().inputValue(),'Changed');
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   await page.getByRole('button',{name:t.cancel,exact:true}).click();
   unavailable=true;await page.getByRole('button',{name:t.refresh,exact:true}).click();
   await page.getByRole('alert').filter({hasText:t.unavailable}).waitFor();
   await context.close();checks++;
  }
  assert.deepEqual(errors,[]);console.log(`Operations browser: ${checks} locale/viewport scenarios passed`);
 } finally {await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
