const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const {createCMSFixture}=require('./helpers/cms-fixture.cjs');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const BASE=process.env.TEST_BASE_URL||'http://127.0.0.1:5185';
(async()=>{
 const {publicPaths,canonicalURL}=await import('../src/services/seo.ts');const browser=await chromium.launch({channel:'chrome',headless:true});const results=[],errors=[];
 try{for(const locale of ['lv','ru','en'])for(const width of [390,1440]){
 const {context,page}=await createCMSFixture(browser,locale,width,errors,false);
 for(const route of publicPaths){await page.goto(BASE+route+(locale==='lv'?'':'?lang='+locale));await page.locator('h1').first().waitFor();await page.waitForFunction(()=>document.querySelectorAll('link[hreflang]').length===4);await page.evaluate(()=>document.fonts.ready);
 const result=await page.evaluate(()=>({title:document.title,description:document.querySelector('meta[name=description]')?.content,lang:document.documentElement.lang,canonical:document.querySelector('link[rel=canonical]')?.href,alternates:[...document.querySelectorAll('link[hreflang]')].map(e=>({lang:e.hreflang,href:e.href})),robots:document.querySelector('meta[name=robots]')?.content,headings:[...document.querySelectorAll('h1,h2,h3')].map(e=>({level:e.tagName,text:e.textContent.trim()})),words:document.querySelector('main')?.textContent.trim().split(/\s+/).length,images:[...document.images].map(i=>({src:i.getAttribute('src'),alt:i.getAttribute('alt'),width:i.getAttribute('width'),height:i.getAttribute('height'),loading:i.loading})),links:[...document.querySelectorAll('a[href]')].map(a=>({href:a.getAttribute('href'),text:a.textContent.trim()})),schema:JSON.parse(document.getElementById('ag-structured-data')?.textContent||'{}'),overflow:document.documentElement.scrollWidth>innerWidth}));
 assert.equal(result.canonical,canonicalURL(route,locale),route);assert.equal(result.lang,locale);assert.equal(result.robots,'index, follow');assert.equal(result.alternates.length,4);assert.equal(result.overflow,false,route);assert.ok(result.title&&result.description);assert.equal(result.headings.filter(h=>h.level==='H1').length,1,route);assert.ok(result.schema['@graph']?.some(s=>s['@type']==='Dentist'));
 results.push({route,locale,width,...result});if(route==='/'&&locale==='lv'){const out=path.join(require('node:os').tmpdir(),'ag-seo-screenshots');fs.mkdirSync(out,{recursive:true});await page.screenshot({path:path.join(out,'home-'+width+'.png'),fullPage:false})}
 }await context.close()}
 assert.deepEqual(errors,[]);fs.writeFileSync(path.resolve(__dirname,'../../docs/seo-browser-evidence.json'),JSON.stringify({environment:'local Vite; synthetic read-only CMS; no production traffic',results},null,2)+'\n');console.log(`SEO browser: ${results.length} rendered route/locale/viewport checks passed`);
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
