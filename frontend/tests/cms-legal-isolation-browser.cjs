const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:5198';
assert.ok(['127.0.0.1','localhost'].includes(new URL(base).hostname));
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const context=await browser.newContext({reducedMotion:'reduce'});
 await context.route('**/*',r=>{const u=new URL(r.request().url());if(u.origin!==new URL(base).origin)return r.abort();if(u.pathname.startsWith('/api/'))return r.fulfill({json:{schema_version:1,documents:[]}});return r.continue()});
 const page=await context.newPage();await page.goto(base+'/privatuma-politika');await page.locator('.legal-copy').waitFor();
 const manifest=JSON.parse(fs.readFileSync(require('node:path').resolve(__dirname,'../../backend/internal/cms/content.json'),'utf8'));
 const documents=manifest.documents.filter(d=>!d.system_managed).map(d=>({key:d.key,payload:d.data,revision:'synthetic-review'}));
 const result=await page.evaluate(async documents=>(await import('/src/services/cms/content.ts')).acceptPublished({schema_version:1,documents}),documents);
 assert.equal(result,true,'Historical legal payload must not invalidate unrelated CMS content');
 assert.ok((await page.locator('.legal-copy').innerText()).includes('40103915017'));
 const invalid=structuredClone(documents);invalid.find(d=>d.key.startsWith('service.')).payload={unexpected:true};
 assert.equal(await page.evaluate(async documents=>(await import('/src/services/cms/content.ts')).acceptPublished({schema_version:1,documents}),invalid),false);
 console.log('PASS historical legal payload coexistence, reviewed controller and invalid CMS rejection');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
