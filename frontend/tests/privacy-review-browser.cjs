// Local-only legal review; external traffic and API writes are blocked.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:5198';
assert.ok(['127.0.0.1','localhost'].includes(new URL(base).hostname));
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});let checks=0;
try{for(const width of [375,1440]){const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
await context.route('**/*',r=>{const u=new URL(r.request().url());if(u.origin!==new URL(base).origin)return r.abort();if(u.pathname.startsWith('/api/'))return r.fulfill({status:503,json:{error:'unavailable'}});return r.continue()});
await context.addInitScript(()=>{sessionStorage.setItem('ag-welcome-seen','1');localStorage.setItem('ag-cookie-consent',JSON.stringify({version:2,necessary:true,preferences:true,maps:false,analytics:false,marketing:false,timestamp:new Date().toISOString()}))});
const page=await context.newPage();
for(const path of ['/privatuma-politika','/sikdatnu-politika']){await page.goto(base+path);await page.locator('.legal-copy').waitFor();
for(const lang of ['lv','ru','en']){if(width===1440)await page.locator(`.header-actions .language-switch button[lang='${lang}']`).click();else{await page.evaluate(l=>localStorage.setItem('ag-language',l),lang);await page.reload()}
await page.waitForFunction(l=>document.querySelector('.legal-copy')?.getAttribute('lang')===l,lang);
const text=await page.locator('.legal-copy').innerText();assert.ok(text.includes(path.includes('privatuma')?'40103915017':'ag-booking-intent-v1'));assert.equal(await page.locator('.legal-section').count(),path.includes('privatuma')?13:9);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.ok(await page.locator('footer a[href="/privatuma-politika"]').count());checks++;
}await page.locator('.legal-related button').click();await page.locator('dialog[open]').waitFor({state:'visible'});await page.keyboard.press('Escape');}
await context.close();}console.log(`PASS: ${checks} legal locale/layout checks, live desktop switching, footer links and cookie settings`);}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
