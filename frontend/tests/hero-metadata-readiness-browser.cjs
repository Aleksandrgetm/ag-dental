// Regression: metadata exists, but Safari supplies no decoded frame until seeking.
// Cold touch metadata state must retain the poster until genuine-interaction preparation. No production API access.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const BASE=process.env.TEST_BASE_URL||'http://localhost:5173';
if(!['localhost','127.0.0.1'].includes(new URL(BASE).hostname))throw Error('Local only');
(async()=>{const b=await chromium.launch({channel:'chrome'});try{
const c=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
await c.addInitScript(()=>{
 sessionStorage.setItem('ag-welcome-seen','1');
 window.__metadataEvidence={metadata:0,seeks:0};
 const ready=Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype,'readyState');
 const time=Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype,'currentTime');
 Object.defineProperty(HTMLMediaElement.prototype,'readyState',{configurable:true,get(){return this.matches('.tour-video')?1:ready.get.call(this);}});
 Object.defineProperty(HTMLMediaElement.prototype,'currentTime',{configurable:true,get(){return time.get.call(this);},set(value){if(this.matches('.tour-video'))window.__metadataEvidence.seeks++;time.set.call(this,value);}});
 for(const name of ['loadeddata','canplay'])document.addEventListener(name,e=>{if(e.target.matches?.('.tour-video'))e.stopImmediatePropagation();},true);
 document.addEventListener('loadedmetadata',e=>{if(e.target.matches?.('.tour-video'))window.__metadataEvidence.metadata++;},true);
});
await c.route('**/*',r=>{const u=new URL(r.request().url());return u.origin!==new URL(BASE).origin?r.abort():u.pathname.startsWith('/api/')?r.fulfill({json:{documents:[]}}):r.continue();});
const p=await c.newPage();await p.goto(BASE);await p.waitForFunction(()=>window.__metadataEvidence.metadata>0);
await p.evaluate(()=>scrollTo(0,600));await p.waitForTimeout(500);
const evidence=await p.evaluate(()=>({ ...window.__metadataEvidence,y:scrollY,time:document.querySelector('video').currentTime,ready:document.querySelector('video').readyState,visible:document.querySelector('video').classList.contains('is-ready')}));
console.log(JSON.stringify(evidence));assert.equal(evidence.visible,false,'Metadata alone must not reveal the video');assert.equal(evidence.seeks,0,'Cold touch startup must wait for its one genuine-interaction preparation, not issue the known-stalling seek');
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1});
