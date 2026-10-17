// Local read-only UI regression; external and API traffic is intercepted.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
const base='http://127.0.0.1:5199';
(async()=>{const browser=await chromium.launch({channel:'chrome'});let count=0;try{
 for(const width of [320,375,390,768,1440])for(const lang of ['lv','ru','en']){
  const context=await browser.newContext({viewport:{width,height:900}});
  await context.route('**/*',r=>{const u=new URL(r.request().url());if(u.origin!==base)return r.abort();if(u.pathname.startsWith('/api/'))return r.fulfill({json:{schema_version:1,documents:[],media:[]}});return r.continue()});
  await context.addInitScript(()=>{sessionStorage.setItem('ag-welcome-seen','1');localStorage.setItem('ag-cookie-consent',JSON.stringify({version:2,necessary:true,preferences:true,maps:false,analytics:false,marketing:false,timestamp:new Date().toISOString()}));});
  const page=await context.newPage();await page.goto(base+'/jaunumi?lang='+lang);
  const rows=page.locator('.journal-row');await rows.first().waitFor();assert.equal(await rows.count(),4);assert.equal(await rows.locator('img').count(),0);
  for(const row of await rows.all()){
   assert.ok((await row.locator('h2').innerText()).trim());assert.ok((await row.locator('p:not(.eyebrow)').innerText()).trim());assert.ok(await row.locator('time').getAttribute('datetime'));assert.equal(await row.locator('.row-arrow svg').count(),1);
   assert.equal(await row.locator('[lang]').getAttribute('lang'),lang);
   assert.equal(await row.evaluate(e=>parseFloat(getComputedStyle(e).borderTopWidth)>0),true);
   const boxes=await row.evaluate(e=>[...e.children].map(x=>{const r=x.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom}}));
   for(let a=0;a<boxes.length;a++)for(let b=a+1;b<boxes.length;b++)assert.ok(boxes[a].right<=boxes[b].left+1||boxes[b].right<=boxes[a].left+1||boxes[a].bottom<=boxes[b].top+1||boxes[b].bottom<=boxes[a].top+1,'row children overlap');
  }
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  fs.mkdirSync('/tmp/ag-news-text-layout',{recursive:true});await page.screenshot({path:`/tmp/ag-news-text-layout/${lang}-${width}.png`,fullPage:true});
  const href=await rows.first().getAttribute('href');await rows.first().click();await page.waitForURL('**'+href+'*');await page.locator('.article-editorial img').waitFor();
  count++;await context.close();
 }
 console.log(`PASS ${count} text-only News layouts: LV/RU/EN, mobile/tablet/desktop, fields, separators, no overlap, links and retained article images`);
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
