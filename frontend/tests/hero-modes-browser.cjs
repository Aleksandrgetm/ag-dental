const {chromium,webkit}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
const BASE=process.env.TEST_BASE_URL||'http://127.0.0.1:5197';
if(!['localhost','127.0.0.1'].includes(new URL(BASE).hostname))throw Error('Local only');

const report={engine:process.env.HERO_ENGINE||'chromium',emulation:true,cases:[],errors:[]};
(async()=>{
 const engine=report.engine==='webkit'?webkit:chromium;
 const browser=await engine.launch(report.engine==='webkit'?{headless:true}:{channel:'chrome',headless:true});
 try{
 for(const locale of ['lv','ru','en'])for(const width of [320,375,390,430,768,1024,1440,1920]){
 const c=await browser.newContext({viewport:{width,height:900},hasTouch:width<768,isMobile:width<768});
 let requests=0;const bad=[];
 await c.addInitScript(({locale})=>{localStorage.setItem('ag-language',locale);sessionStorage.setItem('ag-welcome-seen','1');localStorage.setItem('ag-cookie-consent',JSON.stringify({version:2,necessary:true,preferences:true,maps:false,analytics:false,marketing:false,timestamp:new Date().toISOString()}));window.__seeks=0;window.__long=[];new PerformanceObserver(list=>window.__long.push(...list.getEntries().map(e=>e.duration))).observe({type:'longtask',buffered:true});},{locale});
 await c.route('**/*',route=>{const u=new URL(route.request().url());if(u.origin!==new URL(BASE).origin)return route.abort();if(/tour-(room|detail|poster)|clinic-tour/.test(u.pathname)){bad.push(u.pathname);return route.abort();}if(['/__hero-test.mp4','/media/clinic/approved/clinic-hero.mp4'].includes(u.pathname)){requests++;return route.continue();}if(u.pathname.startsWith('/api/'))return route.fulfill({json:{schema_version:1,documents:[]}});return route.continue();});
 const p=await c.newPage();await p.goto(BASE);await p.locator('.tour-video.is-ready').waitFor();
 await p.evaluate(()=>document.querySelector('video').addEventListener('seeking',()=>window.__seeks++));
 assert.equal(await p.locator('.tour-static').count(),0);
 await p.evaluate(()=>window.scrollTo(0,650));await p.waitForTimeout(350);
 assert.ok(await p.locator('video').evaluate(v=>v.currentTime)>0);
 const buttons=p.locator('.tour-controls button');await buttons.nth(0).click();await p.waitForTimeout(200);
 assert.equal(await p.locator('.tour-static').count(),1);
 const before=await p.evaluate(()=>window.__seeks);await p.evaluate(()=>window.scrollTo(0,400));await p.waitForTimeout(150);assert.equal(await p.evaluate(()=>window.__seeks),before);
 await p.evaluate(()=>window.scrollTo(0,0));await buttons.nth(0).click();await p.waitForTimeout(150);assert.equal(await p.locator('.tour-static').count(),0);
 await buttons.nth(1).click();assert.equal(await p.locator('video').count(),0);
 const previous=requests;await p.reload();await p.locator('.tour-controls').waitFor();await p.waitForTimeout(150);assert.equal(requests,previous);assert.equal(await p.locator('video').count(),0);
 await buttons.nth(1).click();await p.locator('.tour-video.is-ready').waitFor();
 if(width<768&&report.engine==='chromium'){
 const client=await c.newCDPSession(p);await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:width/2,y:700}]});for(let y=650;y>=200;y-=50)await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:width/2,y}]});await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await p.waitForTimeout(200);assert.ok(await p.evaluate(()=>scrollY)>0);await client.detach();
 }
 await p.setViewportSize({width:900,height:width});await p.waitForTimeout(100);await p.setViewportSize({width,height:900});
 await p.evaluate(()=>window.scrollTo(0,document.querySelector('.tour').offsetHeight+50));await p.waitForTimeout(150);assert.ok(await p.evaluate(()=>document.querySelector('#intro').getBoundingClientRect().top)<900);
 await p.evaluate(()=>window.scrollTo(0,0));if(locale==='en'&&[390,1440].includes(width)){fs.mkdirSync('../docs/screenshots/clinic-media',{recursive:true});await p.screenshot({path:`../docs/screenshots/clinic-media/${report.engine}-cinematic-${width}.png`});}await p.locator('video').evaluate(v=>v.dispatchEvent(new Event('error')));await p.waitForTimeout(150);assert.equal(await p.locator('.tour-static').count(),1);assert.equal(await p.locator('video').count(),0);
 assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(bad,[]);
 const metrics=await p.evaluate(()=>({seeks:window.__seeks,longTasks:window.__long,svg:!!document.querySelector('.tour-copy .button svg')}));assert.equal(metrics.svg,true);
 if(locale==='en'&&[390,1440].includes(width)){fs.mkdirSync('../docs/screenshots/clinic-media',{recursive:true});await p.screenshot({path:`../docs/screenshots/clinic-media/${report.engine}-${width}.png`});}
 report.cases.push({locale,width,requests,...metrics});await c.close();
 }
 // System preference updates until overridden; failed storage must not block rendering.
 for(const mode of ['reduce','no-preference']){const c=await browser.newContext({reducedMotion:mode});await c.addInitScript(()=>sessionStorage.setItem('ag-welcome-seen','1'));await c.route('**/*',r=>{const u=new URL(r.request().url());if(u.origin!==new URL(BASE).origin)return r.abort();if(['/__hero-test.mp4','/media/clinic/approved/clinic-hero.mp4'].includes(u.pathname))return r.continue();if(u.pathname.startsWith('/api/'))return r.fulfill({json:{schema_version:1,documents:[]}});r.continue();});const p=await c.newPage();await p.goto(BASE);await p.locator(".tour").waitFor();assert.equal(await p.locator('.tour-static').count(),mode==='reduce'?1:0);await p.emulateMedia({reducedMotion:mode==='reduce'?'no-preference':'reduce'});await p.waitForTimeout(100);assert.equal(await p.locator('.tour-static').count(),mode==='reduce'?0:1);if(mode==='no-preference'){await p.locator('.tour-controls button').nth(0).click();await p.waitForTimeout(100);assert.equal(await p.locator('.tour-static').count(),0);assert.equal(await p.locator('video').evaluate(v=>getComputedStyle(v).display),'block');assert.ok(await p.locator('.tour').evaluate(v=>v.offsetHeight)>900);}await c.close();}
 }finally{await browser.close();fs.writeFileSync('/tmp/ag-hero-'+report.engine+'.json',JSON.stringify(report,null,2));}
 console.log(JSON.stringify({engine:report.engine,cases:report.cases.length,passed:true}));
})().catch(e=>{console.error(e);process.exitCode=1});
