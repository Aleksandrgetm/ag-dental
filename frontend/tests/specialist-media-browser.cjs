const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const {createCMSFixture}=require('./helpers/cms-fixture.cjs');
const BASE=process.env.TEST_BASE_URL||'http://127.0.0.1:5196';
(async()=>{
 const {mediaMessages}=await import('../src/i18n/media.ts'),{operationMessages}=await import('../src/i18n/operations.ts');
 const browser=await chromium.launch({channel:'chrome',headless:true}),errors=[];
 try {for(const lang of ['lv','ru','en']) for(const width of [390,1440]) {
  const {page,context,state}=await createCMSFixture(browser,lang,width,errors),t=mediaMessages[lang];
  await page.goto(BASE+'/admin/doctors/new');await page.getByRole('button',{name:operationMessages[lang].portrait,exact:true}).click();
  await page.getByText(t.unavailable,{exact:false}).waitFor();
  for(const row of state.mediaRows.filter(a=>a.protected))assert.equal(await page.locator(`[data-media-id="${row.id}"]`).count(),0);
  await page.getByRole('button',{name:t.close,exact:true}).click();state.uploadEnabled=true;
  await page.getByRole('button',{name:operationMessages[lang].portrait,exact:true}).click();
  const file={name:'synthetic.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jB9sAAAAASUVORK5CYII=','base64')};
  for(const name of ['bad.svg','clip.mp4']) {
   await page.locator('input[type=file]').setInputFiles({...file,name});await page.getByText(t.unsupported_file,{exact:true}).waitFor();
   assert.equal(state.uploadKeys.length,0);assert.equal(await page.locator('.media-upload-preview').count(),0);
  }
  await page.locator('input[type=file]').setInputFiles({...file,buffer:Buffer.alloc(13*1024*1024)});
  await page.getByText(t.file_too_large,{exact:true}).waitFor();assert.equal(state.uploadKeys.length,0);
  state.uploadStatus=503;state.uploadDelay=400;
  await page.locator('input[type=file]').setInputFiles(file);await page.locator('.media-upload-preview').waitFor();await page.locator('progress').waitFor();
  await page.getByText(t.media_unavailable,{exact:true}).waitFor();state.uploadStatus=200;
  await page.locator('.media-upload').getByRole('button',{name:t.retry,exact:true}).click();await page.getByText(t.ready,{exact:true}).waitFor();
  assert.equal(state.uploadKeys[0],state.uploadKeys[1]);const asset=state.mediaRows.at(-1);assert.deepEqual(asset.metadata.alt,{});assert.ok(!asset.published_at);
  if(!await page.locator('.media-metadata').evaluate(e=>e.open))await page.locator('.media-metadata summary').click();for(const l of ['lv','ru','en']) await page.locator(`textarea[lang="${l}"]`).fill('Synthetic '+l);
  await page.getByRole('button',{name:t.saveMetadata,exact:true}).click();await page.getByText(t.metadataSaved,{exact:true}).waitFor();assert.equal(asset.metadata.alt.en,'Synthetic en');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
  await page.screenshot({path:`/tmp/ag-media-${lang}-${width}.png`,fullPage:true});
  await page.getByRole('button',{name:t.select,exact:true}).click();await page.locator('.doctor-heading img').waitFor();assert.equal(state.writes,0);
  await context.close();
 }assert.deepEqual(errors,[]);console.log('PASS: 6 LV/RU/EN desktop/mobile picker flows; optional metadata, automatic upload, progress, failures, retry, later edit, selection, file limits, protected assets. Mock transport.');}
 finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
