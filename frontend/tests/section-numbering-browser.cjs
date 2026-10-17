const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
const BASE='http://127.0.0.1:5199';
(async()=>{const b=await chromium.launch({channel:'chrome'});let checks=0;try{
for(const locale of ['lv','ru','en'])for(const width of [320,390,768,1440]){
 const c=await b.newContext({viewport:{width,height:900},hasTouch:width<800,isMobile:width<800});
 await c.addInitScript(locale=>{sessionStorage.setItem('ag-welcome-seen','1');localStorage.setItem('ag-language',locale);localStorage.setItem('ag-hero-preferences-v1',JSON.stringify({animation:false,video:false}));localStorage.setItem('ag-cookie-consent',JSON.stringify({version:2,necessary:true,preferences:true,maps:false,analytics:false,marketing:false,timestamp:new Date().toISOString()}));},locale);
 await c.route('**/*',r=>{const u=new URL(r.request().url());return u.origin!==BASE?r.abort():u.pathname.startsWith('/api/')?r.fulfill({json:{documents:[],schema_version:1}}):r.continue();});
 const p=await c.newPage();
 for(const route of ['/','/pakalpojumi','/cenas','/jaunumi','/jaunumi/zobu-protezes-un-protezesana','/par-mums','/kontakti']){
  await p.goto(BASE+route+'?lang='+locale);await p.locator('h1').first().waitFor();await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(900);
  assert.equal(await p.locator('.index-number,.service-number,.category-number').count(),0);
  const labels=await p.locator('.eyebrow,.service-index-caption').allTextContents();assert.ok(labels.every(s=>!/^\s*0\d\s*\//.test(s)),route);
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,route+' '+width+' '+locale);
  for(const selector of ['.index-entry','.service-row'])for(const row of await p.locator(selector).all()){
   const geometry=await row.evaluate(e=>({left:e.getBoundingClientRect().left,title:e.querySelector('h2,h3').getBoundingClientRect().left,columns:getComputedStyle(e).gridTemplateColumns.split(' ').length}));assert.ok(Math.abs(geometry.left-geometry.title)<2,JSON.stringify(geometry));
  }
  if(route==='/'){assert.equal(await p.locator('.journey-accordion .step-number').count(),4);assert.match(await p.locator('.experience-note').innerText(),/15\+/);}
  if(route==='/cenas'){assert.ok(await p.locator('.category-count').count()>0);assert.ok((await p.locator('.price-category-title').first().innerText()).includes('EUR'));}
  if(locale==='lv'&&['/','/pakalpojumi','/cenas','/jaunumi'].includes(route)){
   await p.evaluate(()=>document.querySelectorAll('[data-reveal]').forEach(e=>e.classList.add('is-visible')));fs.mkdirSync('../docs/screenshots/section-numbering',{recursive:true});await p.screenshot({path:`../docs/screenshots/section-numbering/${route.slice(1)||'home'}-${width}.png`,fullPage:true});
  }
  checks++;
 }
 if(width<1000){const toggle=p.locator('[aria-controls="mobile-menu"]');await toggle.click();await p.locator('#mobile-menu').waitFor();await p.waitForTimeout(700);const links=p.locator('#mobile-menu nav a');assert.equal(await links.count(),6);assert.equal(await p.locator('#mobile-menu nav small').count(),0);for(const text of await links.allTextContents())assert.ok(!/^\s*0\d/.test(text));const first=await links.first().boundingBox();assert.ok(first.y>=0);await p.screenshot({path:`../docs/screenshots/section-numbering/menu-${locale}-${width}.png`});await links.first().click();await p.locator('#mobile-menu').waitFor({state:'hidden'});}
 await c.close();
}console.log(`PASS ${checks} public route/locale/width cases; service alignment, menu, functional numbers`);
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1});
