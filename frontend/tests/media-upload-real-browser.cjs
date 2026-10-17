// Real local Auth/Go/PostgreSQL/Storage. The disposable runner owns all credentials/resources.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),{execFileSync}=require('node:child_process');
if(process.env.AG_ACCEPTANCE!=='disposable')throw Error('Isolated runner required');
const BASE='https://localhost:5190';
(async()=>{
 const {mediaMessages}=await import('../src/i18n/media.ts'),{newsAdminMessages}=await import('../src/i18n/newsAdmin.ts');const t=mediaMessages.en,n=newsAdminMessages.en;
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--ignore-certificate-errors-spki-list='+process.env.QA_SPki]});
 try {
  const context=await browser.newContext();await context.route('**/*',r=>['localhost','127.0.0.1'].includes(new URL(r.request().url()).hostname)?r.continue():r.abort());const page=await context.newPage();page.on("dialog",dialog=>dialog.accept());
  await page.goto(BASE+'/login?lang=en');await page.getByRole('button',{name:'Reject optional',exact:true}).click();await page.locator('input[type=email]').fill('admin@acceptance.invalid');await page.locator('input[type=password]').fill(process.env.QA_PASSWORD);await page.locator('form button[type=submit]').click();await page.waitForURL(BASE+'/');
  // The registered editorial image must not be remapped to reception photography.
  for(const route of ['/', '/jaunumi/zobu-higiena-kas-pieejama-ikvienam']) {
   await page.goto(BASE+route+'?lang=en');
   const selector=route==='/'?'.journal-feature-image img':'.article-editorial img';
   await page.locator(selector).scrollIntoViewIfNeeded();
   await page.waitForFunction(selector=>{const img=document.querySelector(selector);return img?.src.endsWith('/media/clinic/clinic-original.jpg')&&img.naturalWidth>0},selector);
  }
  console.log('PASS registered editorial image unchanged across home/detail');
  await require('./helpers/news-image-association.cjs')(page);
  await require('./helpers/news-image-association.cjs')(page,'zobu-higiena-kas-pieejama-ikvienam',process.env.QA_IMAGE);
  await require('./helpers/news-image-association.cjs')(page,'zobu-higiena-kas-pieejama-ikvienam',process.env.QA_IMAGE_REPLACEMENT);
  await page.goto(BASE+'/admin/news/new?lang=en');await page.locator('#news-image').click();
  let authorization;
  for(const ext of ['png','jpg','jpeg','webp','avif']) {
   const source=ext==='jpeg'?process.env.QA_IMAGE_REPLACEMENT:process.env.QA_IMAGE, file=source+'.'+ext;
   if(ext==='avif')fs.copyFileSync('../backend/internal/media/testdata/still.avif',file);else if(ext==='png')fs.copyFileSync(source,file);else if(ext==='webp')execFileSync('cwebp',['-quiet',source,'-o',file]);else execFileSync('ffmpeg',['-v','error','-i',source,'-frames:v','1','-y',file]);
   const pending=page.waitForResponse(r=>r.url().endsWith('/api/admin/cms/media')&&r.request().method()==='POST');
   await page.locator('input[type=file]').setInputFiles(file);const response=await pending;assert.equal(response.status(),200);const {asset}=await response.json();authorization=response.request().headers().authorization;
   await page.locator('.media-detail h3').filter({hasText:asset.metadata.filename}).waitFor();
   if(['jpg','jpeg'].includes(ext)){assert.equal(asset.metadata.mime,'image/jpeg');assert.ok(response.request().postDataBuffer().includes(Buffer.from('Content-Type: image/jpeg')));}
   assert.ok(!asset.published_at);assert.ok(!asset.metadata.alt||Object.keys(asset.metadata.alt).length===0);assert.equal(await page.locator('.media-detail img').getAttribute('alt'),'');
   await page.locator('.media-detail img').waitFor();await page.waitForFunction(()=>document.querySelector('.media-detail img')?.naturalWidth>0);
   assert.equal((await context.request.get(BASE+'/api/cms/media/'+asset.id+'/display.webp')).status(),404);
   assert.equal((await context.request.get(BASE+'/api/admin/cms/media/'+asset.id+'/display.webp')).status(),401);
   const endpoint=BASE+'/api/admin/cms/media/'+asset.id+'/metadata';
   assert.equal((await context.request.patch(endpoint,{headers:{Authorization:'Bearer '+process.env.QA_USER_TOKEN},data:{}})).status(),403);
   if(!await page.locator('.media-metadata').evaluate(e=>e.open))await page.locator('.media-metadata summary').click();for(const l of ['lv','ru','en'])await page.locator(`textarea[lang="${l}"]`).fill('Synthetic '+ext+' '+l);
   const edited=page.waitForResponse(r=>r.url()===endpoint&&r.request().method()==='PATCH');await page.getByRole('button',{name:t.saveMetadata,exact:true}).click();assert.equal((await edited).status(),200);await page.getByText(t.metadataSaved,{exact:true}).waitFor();
   assert.equal((await context.request.patch(endpoint,{headers:{Authorization:authorization},data:{alt:{},expected_updated_at:asset.updated_at}})).status(),409);
   const list=await(await context.request.get(BASE+'/api/admin/cms/media',{headers:{Authorization:authorization}})).json();const saved=list.assets.find(a=>a.id===asset.id);assert.equal(saved.metadata.alt.en,'Synthetic '+ext+' en');assert.ok(!saved.published_at);
   await page.getByRole('button',{name:t.back,exact:true}).click();await page.locator(`[data-media-id="${asset.id}"]`).click();if(!await page.locator('.media-metadata').evaluate(e=>e.open))await page.locator('.media-metadata summary').click();assert.equal(await page.locator('textarea[lang="en"]').inputValue(),'Synthetic '+ext+' en');
   console.log('PASS real '+ext+': automatic metadata-free upload, private preview, persisted optional metadata, stale edit conflict, user/anonymous denial');
  }
  await page.getByRole('button',{name:t.select,exact:true}).click();await page.locator('#news-image img').waitFor();
  // Reuse complete synthetic News lifecycle, including real Storage replacement/public delivery/archival.
  process.env.QA_IMAGE=process.env.QA_IMAGE_DELETABLE; // Fresh PNG, not a previously edited/deduplicated asset.
  await require('./helpers/news-real-workflow.cjs')(page,{});
  console.log('PASS real News publication/replacement/archive/restore + Storage delivery; all services isolated.');
  await context.close();
 }finally{await browser.close()}
})().catch(e=>{console.error(e.stack||e.message);process.exitCode=1});
