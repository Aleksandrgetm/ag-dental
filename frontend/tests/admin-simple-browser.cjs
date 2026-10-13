// Synthetic identities and intercepted APIs only; never writes to production.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const {createCMSFixture}=require('./helpers/cms-fixture.cjs');
const fs=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');
const BASE=process.env.TEST_BASE_URL||'http://127.0.0.1:5187';
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});const errors=[];const phase=process.argv.includes('--before')?'before':'after';
try{for(const width of [390,1440]){const {context,page}=await createCMSFixture(browser,'en',width,errors);await context.route('**/api/admin/operations/**',route=>route.fulfill({json:new URL(route.request().url()).pathname.endsWith('/options')?{doctors:[],services:[],sources:[]}:{items:[]}}));
for(const section of ['doctors','services','news','pages']){await page.goto(BASE+'/admin/'+section);await page.locator('main h1').waitFor();await page.locator('input[type=search]').first().waitFor();const folder=path.resolve(__dirname,'../../docs/screenshots/admin-simple');fs.mkdirSync(folder,{recursive:true});await page.screenshot({path:path.join(folder,`${phase}-${section}-${width}.png`),fullPage:true});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false)}await context.close()}
assert.deepEqual(errors,[]);console.log(`${phase}: 8 synthetic desktop/mobile screenshots`)}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
