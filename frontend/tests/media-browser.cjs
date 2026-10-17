// Library remains inline; there is intentionally no standalone Media Library navigation.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),assert=require('node:assert/strict');
const {createCMSFixture}=require('./helpers/cms-fixture.cjs');
const BASE=process.env.TEST_BASE_URL||'http://127.0.0.1:5196';
(async()=>{const {mediaMessages}=await import('../src/i18n/media.ts');const browser=await chromium.launch({channel:'chrome',headless:true}),errors=[];
try{for(const locale of ['lv','ru','en'])for(const width of [390,1440]) {
 const {page,context,state}=await createCMSFixture(browser,locale,width,errors),t=mediaMessages[locale];state.uploadEnabled=true;state.uploadDelay=250;
 await page.goto(BASE+'/admin/news/new');await page.locator('#news-image').click();
 for(const ext of ['jpg','png','webp']) {
  await page.locator('.media-upload').evaluate((element,ext)=>{const transfer=new DataTransfer();transfer.items.add(new File([new Uint8Array([1,2,3])],'synthetic.'+ext,{type:'image/'+ext}));element.dispatchEvent(new DragEvent('drop',{bubbles:true,dataTransfer:transfer}));},ext);
  await page.getByText(t.ready,{exact:true}).waitFor();const asset=state.mediaRows.at(-1);assert.deepEqual(asset.metadata.alt,{});assert.ok(!asset.published_at);
  if(!await page.locator('.media-metadata').evaluate(e=>e.open))await page.locator('.media-metadata summary').click();for(const l of ['lv','ru','en'])await page.locator(`textarea[lang="${l}"]`).fill('Fixture '+l);
  await page.getByRole('button',{name:t.saveMetadata,exact:true}).click();await page.getByText(t.metadataSaved,{exact:true}).waitFor();
  await page.getByRole('button',{name:t.back,exact:true}).click();await page.locator(`[data-media-id="${asset.id}"]`).click();if(!await page.locator('.media-metadata').evaluate(e=>e.open))await page.locator('.media-metadata summary').click();assert.equal(await page.locator('textarea[lang="en"]').inputValue(),'Fixture en');
 }
 const alt=await page.evaluate(async()=>{const m=await import('/src/services/cms/publishedMedia.ts');const ref='cms-media:upload.'+'a'.repeat(32);m.acceptMediaMetadata([{id:'upload.'+'a'.repeat(32),alt:{lv:'Apraksts'},decorative:false}]);const missing=m.cmsMediaAlt(ref,'en','Existing context fallback');m.acceptMediaMetadata([{id:'upload.'+'a'.repeat(32),alt:{lv:'Retained'},decorative:true}]);return {missing,decorative:m.cmsMediaAlt(ref,'lv','fallback')}});
 assert.deepEqual(alt,{missing:'Existing context fallback',decorative:''});
 await page.getByRole('button',{name:t.select,exact:true}).click();await page.locator('#news-image img').waitFor();assert.equal(state.writes,0);
 await context.close();
 }assert.deepEqual(errors,[]);console.log('PASS: 6 inline News library flows, drag/drop JPG/PNG/WebP without metadata, later metadata persistence, selection and public alt fallback/decorative behavior. Mock transport.');}
finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
