const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const {createCMSFixture}=require('./helpers/cms-fixture.cjs');
const BASE=process.env.TEST_BASE_URL||'http://127.0.0.1:5185';
(async()=>{
 const {operationMessages}=await import('../src/i18n/operations.ts');
 const {appointmentMessages}=await import('../src/i18n/appointments.ts');
 const browser=await chromium.launch({channel:'chrome',headless:true});const errors=[];let checks=0;
 try{for(const locale of (process.env.QA_QUICK?['en']:['lv','ru','en']))for(const width of (process.env.QA_QUICK?[390,1440]:[320,375,390,430,768,1024,1440,1920])){
  const {context,page,state}=await createCMSFixture(browser,locale,width,errors);const t={...operationMessages[locale],...appointmentMessages[locale]};
  const id='11111111-1111-4111-8111-111111111117',doctor='11111111-1111-4111-8111-111111111118',service='11111111-1111-4111-8111-111111111119';
  const visit={id,doctor_id:doctor,service_id:service,first_name:'Synthetic',last_name:'Calendar',email:'calendar@example.invalid',phone:'+37120000000',booking_reference:'SYNTHETIC',starts_at:'2026-10-12T06:00:00Z',ends_at:'2026-10-12T06:30:00Z',status:'confirmed',version:'a'.repeat(64)};
  let searches=0,statusWrites=0,empty=false,statusConflict=true;
  await context.route('**/api/booking/**',route=>route.fulfill({status:503,json:{error:'booking_unavailable'}}));
  await context.route('**/api/admin/operations/appointments/options',route=>route.fulfill({json:{doctors:[{id:doctor,name:'Synthetic specialist'}],services:[{id:service,name_lv:'Synthetic LV',name_ru:'Synthetic RU',name_en:'Synthetic EN'}]}}));
  await context.route('**/api/admin/booking/**',async route=>{
   const req=route.request(),url=new URL(req.url());assert.match(req.headers().authorization||'',/^Bearer /);assert.ok(!url.search.includes('calendar'));
   if(url.pathname.endsWith('/search')){assert.equal(req.method(),'POST');searches++;return route.fulfill({json:{appointments:empty?[]:[visit],has_more:false}})}
   if(url.pathname.endsWith('/history'))return route.fulfill({json:{events:[{id,event_type:'created',created_at:visit.starts_at}]}});
   if(url.pathname.endsWith('/status')){statusWrites++;assert.equal(req.postDataJSON().expected_version,visit.version);if(statusConflict)return route.fulfill({status:409,json:{error:'conflict'}});visit.status=req.postDataJSON().status;return route.fulfill({json:visit})}
   return route.fulfill({json:visit});
  });
  await page.goto(BASE+'/admin/appointments');await page.getByRole('button',{name:t.manual,exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:t[width<=600?'day':'week'],exact:true}).getAttribute('aria-pressed'),'true');
  await page.getByLabel(t.date,{exact:true}).fill('2026-10-12');await page.locator('.advanced summary').click();await page.getByRole('button',{name:t.applyFilters,exact:true}).click();
  await page.getByRole('button',{name:/Synthetic Calendar/}).waitFor();
  await page.getByRole('button',{name:t.month,exact:true}).click();await page.locator('.month-grid button').filter({has:page.locator('span')}).first().click();
  for(const mode of ['day','week']){await page.getByRole('button',{name:t[mode],exact:true}).click();await page.getByRole('button',{name:/Synthetic Calendar/}).waitFor()}
  await page.getByLabel(t.search,{exact:true}).fill('calendar@example.invalid');await page.getByRole('button',{name:t.applyFilters,exact:true}).click();
  await page.getByRole('button',{name:/Synthetic Calendar/}).click();await page.getByRole('heading',{name:'Synthetic Calendar'}).waitFor();
  for(let i=0;i<8;i++){await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.querySelector('dialog[open]').contains(document.activeElement)),true)}
  await page.getByRole('button',{name:t.cancelVisit,exact:true}).click();await page.getByRole('alert').filter({hasText:t.conflict}).waitFor();
  assert.equal(statusWrites,1);assert.ok(searches>=4);assert.equal(await page.getByRole('button',{name:t.manual,exact:true}).isDisabled(),true);
  await page.getByRole('button',{name:t.close,exact:true}).click();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.equal(await page.evaluate(()=>JSON.stringify({...localStorage,...sessionStorage}).includes('calendar@example.invalid')),false);
  const serviceRow={id:service,slug:'synthetic',name_lv:'Synthetic LV',name_ru:'Synthetic RU',name_en:'Synthetic EN',duration_minutes:30,provenance:'development_fixture'};
  await context.route('**/api/booking/**',route=>{
   const path=new URL(route.request().url()).pathname;
   const json=path.endsWith('/services')?{services:[serviceRow],privacy_notice_version:'synthetic-v1'}:path.endsWith('/doctors')?{doctors:[{id:doctor,name:'Synthetic specialist'}]}:{slots:[{doctor_id:doctor,starts_at:visit.starts_at,ends_at:visit.ends_at}],timezone:'Europe/Riga',privacy_notice_version:'synthetic-v1'};
   return route.fulfill({json});
  });
  const attempts=[];
  await context.route('**/api/admin/booking/appointments',route=>{
   attempts.push({key:route.request().headers()['idempotency-key'],body:route.request().postDataJSON()});
   return attempts.length===1?route.fulfill({status:503,json:{error:'unavailable'}}):route.fulfill({json:visit});
  });
  await page.getByRole('button',{name:t.applyFilters,exact:true}).click();await page.getByRole('button',{name:t.manual,exact:true}).click();
  const modal=page.locator('.appointments dialog');await modal.getByRole('button',{name:t.previewAvailability}).click();await modal.getByRole('button',{name:'09:00',exact:true}).click();
  for(const [field,value] of Object.entries({first_name:'Synthetic',last_name:'Calendar',email:'calendar@example.invalid',phone:'+37120000000'}))await modal.locator('#booking-'+field).fill(value);
  await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
  await modal.locator('#booking-email:enabled').waitFor();assert.equal(await modal.locator('#booking-email').inputValue(),'calendar@example.invalid');
  await modal.getByRole('checkbox').check();await modal.getByRole('button',{name:t.save,exact:true}).click();await modal.getByText(t.uncertain,{exact:true}).waitFor();
  assert.equal(await modal.locator('#booking-email').isDisabled(),true);
  await modal.locator('button[type=submit]').click();await modal.getByRole('heading',{name:'Synthetic Calendar'}).waitFor();
  assert.equal(attempts.length,2);assert.deepEqual(attempts[0],attempts[1]);assert.match(attempts[0].key,/^[a-f0-9-]{36}$/);assert.equal(attempts[0].body.privacy_acknowledged,true);
  await modal.getByRole('button',{name:t.reschedule,exact:true}).click();
  await context.route('**/api/admin/booking/appointments/*/availability?*',route=>route.fulfill({json:{slots:[{doctor_id:doctor,starts_at:visit.starts_at,ends_at:visit.ends_at}]}}));
  await modal.getByRole('button',{name:t.previewAvailability}).click();await modal.getByRole('button',{name:'09:00',exact:true}).click();
  await context.route('**/api/admin/booking/appointments/*/reschedule',route=>{assert.equal(route.request().postDataJSON().expected_version,visit.version);return route.fulfill({json:visit})});
  await modal.getByRole('button',{name:t.save,exact:true}).click();await modal.getByRole('heading',{name:'Synthetic Calendar'}).waitFor();
  if(locale==='en'&&[390,1440].includes(width)){await modal.getByRole('button',{name:t.close,exact:true}).click();await page.locator('.advanced summary').click();if(width===390)await page.getByRole('button',{name:t.day,exact:true}).click();await page.screenshot({path:`../docs/screenshots/appointment-calendar/after-${width}.png`,fullPage:true})}if(await modal.isVisible())await modal.getByRole('button',{name:t.close,exact:true}).click();
  statusConflict=false;visit.status='pending';await page.getByRole('button',{name:/Synthetic Calendar/}).click();await modal.getByRole('button',{name:t.confirmVisit,exact:true}).click();await modal.getByRole('button',{name:t.cancelVisit,exact:true}).waitFor();assert.equal(visit.status,'confirmed');await modal.getByRole('button',{name:t.cancelVisit,exact:true}).click();await modal.getByText(new RegExp('SYNTHETIC.*'+t.cancelled)).waitFor();assert.equal(visit.status,'cancelled');await modal.locator('summary').filter({hasText:t.history}).click();await modal.getByText(new RegExp(t.created)).waitFor();await modal.getByRole('button',{name:t.close,exact:true}).click();
  await page.getByRole('button',{name:t.today,exact:true}).click();
  const current=await page.getByLabel(t.date,{exact:true}).inputValue();
  await page.getByRole('button',{name:t.next,exact:true}).click();assert.notEqual(await page.getByLabel(t.date,{exact:true}).inputValue(),current);
  await page.getByRole('button',{name:t.previous,exact:true}).click();assert.equal(await page.getByLabel(t.date,{exact:true}).inputValue(),current);
  empty=true;await page.getByLabel(t.doctorName,{exact:true}).selectOption(doctor);await page.getByText(t.noVisits,{exact:true}).waitFor();assert.equal(await page.getByText(t.noVisits,{exact:true}).count(),1);
  state.identityStatus=401;await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await page.waitForFunction(()=>!document.querySelector('.appointments'));await context.close();checks++;
 }assert.deepEqual(errors,[]);console.log(`Appointment browser: ${checks} locale/viewport scenarios passed`)}finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
