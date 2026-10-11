// All requests intercepted; synthetic identities/data only, no production network access.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const {createCMSFixture}=require('./helpers/cms-fixture.cjs');
const BASE=process.env.TEST_BASE_URL||'http://127.0.0.1:5187';
if(!['localhost','127.0.0.1'].includes(new URL(BASE).hostname))throw Error('Local only');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true}),errors=[];let checks=0;
try{for(const locale of ['lv','ru','en'])for(const width of [390,768,1440]){
 const {page,context,state}=await createCMSFixture(browser,locale,width,errors);let forbiddenWrites=0;
 await context.route('**/api/admin/operations/**',route=>{if(route.request().method()!=='GET')forbiddenWrites++;return route.fulfill({json:route.request().url().endsWith('/options')?{doctors:[],services:[],privacy_ready:false}:{items:[]}})});
 await context.route('**/api/booking/**',route=>route.fulfill({status:503,json:{error:'booking_unavailable'}}));
 await context.route('**/api/admin/booking/**',route=>route.fulfill({json:{appointments:[],has_more:false}}));
 await page.goto(BASE+'/admin');await page.waitForURL(BASE+'/admin/appointments');await page.locator('.admin-navigation').first().waitFor({state:'attached'});
 const targets=await page.locator('.admin-navigation').first().locator('a').evaluateAll(links=>links.map(a=>a.getAttribute('href')));
 assert.deepEqual(targets,['/admin/appointments','/admin/doctors','/admin/news']);
 for(const url of ['/admin/services','/admin/services/new','/admin/services/booking','/admin/services/manage/11111111-1111-4111-8111-111111111111','/admin/services/prices.0/items/0','/admin/pages/cenas','/admin/pages/home/intro?part=messages.home','/admin/media','/admin/settings','/admin/seo','/admin/history','/admin/schedules','/admin/messages','/admin/news/service.konsultacija','/admin/news/news.unknown','/admin/doctors/booking']){
  await page.goto(BASE+url);await page.waitForURL(/\/admin\/(appointments|doctors|news)$/);assert.equal(await page.locator('.price-editor,.catalog-editor').count(),0);
 }
 for(const section of ['appointments','doctors','news']){await page.goto(BASE+'/admin/'+section);await page.locator('.admin-page-heading').waitFor();await page.waitForTimeout(150);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);if(locale==='en'&&width!==768){const folder=path.resolve(__dirname,'../../docs/screenshots/simple-admin');fs.mkdirSync(folder,{recursive:true});await page.screenshot({path:path.join(folder,`${section}-${width}.png`),fullPage:true})}}
 assert.equal(forbiddenWrites,0);state.role='user';await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await page.locator('.admin-access').waitFor();assert.equal(await page.locator('.admin-navigation').count(),0);await context.close();checks++;
}assert.deepEqual(errors,[]);console.log(`Three-section admin: ${checks} locale/viewport cases; default calendar, 16 blocked legacy paths, no service writes, role revocation, responsive screenshots.`)}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
