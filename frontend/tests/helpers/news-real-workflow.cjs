const assert=require('node:assert/strict');const {sql}=require('../acceptance-workflows.cjs');const BASE='https://localhost:5190';
module.exports=async function newsWorkflow(page,evidence){
 const context=page.context();
 const {newsAdminMessages}=await import('../../src/i18n/newsAdmin.ts'),{mediaMessages}=await import('../../src/i18n/media.ts');const t=newsAdminMessages.en,m=mediaMessages.en;
 // Imported revisions use the same editor/template without changing their URL.
 await page.goto(BASE+'/admin/news/edit/news.zobu-protezes-un-protezesana?lang=en');
 await page.getByRole('combobox',{name:t.language,exact:true}).selectOption('en');
 await page.getByLabel(t.introduction,{exact:true}).fill('Synthetic imported lead');
 await page.getByLabel(t.body,{exact:true}).fill('Synthetic imported body');
 await page.getByLabel(t.author,{exact:true}).fill('Synthetic imported author');
 await page.getByLabel(t.category,{exact:true}).fill('');
 await page.getByRole('button',{name:t.publish,exact:true}).click();await page.waitForURL(BASE+'/admin/news');
 const importedPage=await context.newPage();await importedPage.goto(BASE+'/jaunumi/zobu-protezes-un-protezesana?lang=en');
 await importedPage.locator('.article-lead').getByText('Synthetic imported lead',{exact:true}).waitFor();
 await importedPage.locator('.article-prose').getByText('Synthetic imported body',{exact:true}).waitFor();
 assert.equal(await importedPage.locator('.article-prose p').count(),1);await importedPage.close();
 await page.goto(BASE+'/admin/news?lang=en');await page.locator('.news-card').first().waitFor();assert.equal(await page.locator('.news-card').count(),4);await page.getByRole('link',{name:t.add,exact:true}).click();
 for(const l of ['lv','ru','en']){await page.getByRole('combobox',{name:t.language,exact:true}).selectOption(l);await page.getByLabel(t.name,{exact:true}).fill('Synthetic news '+l);await page.getByLabel(t.body,{exact:true}).fill('Synthetic text '+l);await page.getByLabel(t.introduction,{exact:true}).fill('Synthetic introduction '+l);await page.getByLabel(t.category,{exact:true}).fill('Synthetic category '+l);await page.getByLabel(t.author,{exact:true}).fill('Synthetic author '+l)}
 async function upload(file){
  await page.getByRole('button',{name:t.image,exact:true}).click();
  const pending=page.waitForResponse(r=>r.url().endsWith('/api/admin/cms/media')&&r.request().method()==='POST');
  await page.locator('input[type=file]').setInputFiles(file);const r=await pending;assert.equal(r.status(),200);
  const {asset,duplicate}=await r.json();if(!duplicate)assert.ok(!asset.metadata.alt||Object.keys(asset.metadata.alt).length===0);await page.getByText(duplicate?m.duplicate:m.ready,{exact:true}).waitFor();
  await page.getByRole('button',{name:m.select,exact:true}).click();return asset;
 }

 const asset=await upload(process.env.QA_IMAGE);evidence.media={id:asset.id};
 const pending=page.waitForResponse(r=>r.url().endsWith('/save-publish'));await page.getByRole('button',{name:t.publish,exact:true}).click();const response=await pending;assert.equal(response.status(),200);const saved=await response.json(),key=saved.key;assert.match(key,/^created.news.[a-f0-9-]{36}$/);await page.waitForURL(BASE+'/admin/news');await page.getByRole('heading',{name:'Synthetic news en',exact:true}).waitFor();assert.equal(sql(`SELECT count(*) FROM cms_revisions WHERE document_key='${key}'`),'1');
 const token=response.request().headers().authorization;const retry=await context.request.post(response.url(),{headers:{Authorization:token},data:response.request().postDataJSON()});assert.equal(retry.status(),200);assert.equal(sql(`SELECT count(*) FROM cms_revisions WHERE document_key='${key}'`),'1');
 // Real API rejects invalid synthetic publications atomically with a safe field path.
 for(const field of ['title.lv','body.ru','date','image']){
  const data=structuredClone(response.request().postDataJSON());data.expected_version=0;data.payload.slug='synthetic-invalid-'+field.replace('.','-');
  if(field==='date')data.payload.date='2026-02-30';else if(field==='image')data.payload.image='cms-media:upload.aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';else {const [name,lang]=field.split('.');data.payload[name][lang]=''}
  const invalidKey='created.news.'+require('node:crypto').randomUUID();
  const invalid=await context.request.post(BASE+'/api/admin/cms/documents/'+invalidKey+'/save-publish',{headers:{Authorization:token},data});
  assert.equal(invalid.status(),422);assert.deepEqual(await invalid.json(),{error:field==='image'?'image_association_failed':'invalid_content',field});assert.equal(sql(`SELECT count(*) FROM cms_documents WHERE key='${invalidKey}'`),'0');
 }
 evidence.publicationValidation='PASS 422 exact field title.lv/body.ru/date/image; atomic rejection without leaked draft; valid multilingual direct publication';
 // Concurrent identical creation requests must share one document/revision.
 const raceKey='created.news.'+require('node:crypto').randomUUID();const raceBody=structuredClone(response.request().postDataJSON());raceBody.payload.slug='synthetic-concurrent';for(const l of ['lv','ru','en'])raceBody.payload.title[l]='Concurrent synthetic '+l;
 const raceURL=BASE+'/api/admin/cms/documents/'+raceKey+'/save-publish';
 const attempts=await Promise.all([1,2].map(()=>context.request.post(raceURL,{headers:{Authorization:token},data:raceBody})));
 assert.deepEqual(attempts.map(r=>r.status()),[200,200]);assert.equal(sql(`SELECT count(*) FROM cms_revisions WHERE document_key='${raceKey}'`),'1');
 const raceDoc=await attempts[0].json();assert.equal((await context.request.post(BASE+'/api/admin/cms/documents/'+raceKey+'/unpublish',{headers:{Authorization:token},data:{expected_version:raceDoc.version,revision_id:raceDoc.draft_revision}})).status(),200);
 const publicPage=await context.newPage();for(const l of ['lv','ru','en']){await publicPage.goto(BASE+'/jaunumi?lang='+l);await publicPage.getByRole('heading',{name:'Synthetic news '+l,exact:true}).waitFor();await publicPage.goto(BASE+'/jaunumi/synthetic-news-lv?lang='+l);await publicPage.getByRole('heading',{name:'Synthetic news '+l,exact:true}).waitFor();await publicPage.waitForFunction(()=>document.querySelector('.article-editorial img')?.naturalWidth>0);await publicPage.getByText('Synthetic introduction '+l,{exact:true}).waitFor();await publicPage.locator('figcaption').getByText('Synthetic author '+l,{exact:true}).waitFor();await publicPage.reload();await publicPage.getByRole('heading',{name:'Synthetic news '+l,exact:true}).waitFor()}
 await page.locator('.news-card').filter({hasText:'Synthetic news en'}).getByRole('link',{name:t.edit,exact:true}).click();await page.getByRole('combobox',{name:t.language,exact:true}).selectOption('en');await page.getByLabel(t.body,{exact:true}).fill('Updated synthetic text');const replacement=await upload(process.env.QA_IMAGE_REPLACEMENT);assert.notEqual(replacement.id,asset.id);await page.getByRole('button',{name:t.publish,exact:true}).click();await page.waitForURL(BASE+'/admin/news');await publicPage.reload();await publicPage.getByText('Updated synthetic text',{exact:true}).first().waitFor();await publicPage.locator(`article img[src*="${replacement.id}"]`).waitFor();
 await page.locator('.news-card').filter({hasText:'Synthetic news en'}).getByRole('button',{name:t.unpublish,exact:true}).click();await page.locator('.news-card').filter({hasText:'Synthetic news en'}).getByText(t.unpublished,{exact:true}).waitFor();await publicPage.reload();await publicPage.getByRole('heading',{name:'Synthetic news en',exact:true}).waitFor({state:'hidden'});assert.equal(sql(`SELECT count(*) FROM cms_revisions WHERE document_key='${key}'`),'2');
 await page.locator('.news-card').filter({hasText:'Synthetic news en'}).getByRole('link',{name:t.edit,exact:true}).click();await page.locator('details summary').click();await page.getByRole('button',{name:t.restore,exact:true}).last().click();await page.getByRole('link',{name:t.view,exact:true}).waitFor();await publicPage.reload();await publicPage.getByRole('heading',{name:'Synthetic news en',exact:true}).waitFor();

 // Delete through the actual UI, including a never-published draft.
 for(const isDraft of [false,true]){
  let deleteKey=key,deleteTitle='Synthetic news en';
  if(isDraft){deleteKey='created.news.'+require('node:crypto').randomUUID();const p=structuredClone(response.request().postDataJSON().payload);p.slug='synthetic-unpublished-delete';for(const l of ['lv','ru','en'])p.title[l]='Synthetic draft '+l;deleteTitle=p.title.en;const draft=await context.request.post(BASE+'/api/admin/cms/documents',{headers:{Authorization:token},data:{key:deleteKey,payload:p}});assert.equal(draft.status(),201)}
  console.log('Delete scenario',isDraft?'draft':'published');await page.goto(BASE+'/admin/news?lang=en');const card=page.locator('.news-card').filter({hasText:deleteTitle});await card.waitFor();assert.equal(await card.getByRole('button',{name:t.remove,exact:true}).isEnabled(),true);
  if(!isDraft){
   // Reproduce migration 006 compatibility safely in the disposable database.
   sql('ALTER TABLE cms_documents RENAME COLUMN archived_at TO qa_archived_at');
   try {const failed=page.waitForResponse(r=>r.url().endsWith('/'+deleteKey+'/archive'),{timeout:10000});await card.getByRole('button',{name:t.remove,exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:t.remove,exact:true}).click();const failure=await failed;assert.equal(failure.status(),503);assert.deepEqual(await failure.json(),{error:'news_archive_unavailable'});assert.deepEqual(failure.request().postDataJSON(),{expected_version:Number(sql(`SELECT version FROM cms_documents WHERE key='${deleteKey}'`))});await page.getByRole('alert').getByText(t.archiveUnavailable,{exact:false}).waitFor();await card.waitFor();evidence.archiveUnavailable='PASS actual browser POST /archive: 503 news_archive_unavailable; unchanged document/version and useful localized error';}
   finally {sql('ALTER TABLE cms_documents RENAME COLUMN qa_archived_at TO archived_at')}
  }
  if(isDraft)await page.evaluate(()=>{window.confirm=()=>{throw Error('News archive must not open a native focus-stealing dialog')}});
  const deleting=page.waitForResponse(r=>r.url().endsWith('/'+deleteKey+'/archive'),{timeout:10000});await card.getByRole('button',{name:t.remove,exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:t.remove,exact:true}).click();const deleted=await deleting;assert.equal(deleted.status(),200);assert.equal(deleted.request().method(),'POST');const archivedResponse=await deleted.json();assert.equal(archivedResponse.archived,true);assert.equal(archivedResponse.published_revision,null);await card.waitFor({state:'hidden'});evidence.archiveRequests??=[];evidence.archiveRequests.push({scenario:isDraft?'unpublished':'published',method:'POST',endpoint:'/api/admin/cms/documents/:key/archive',status:deleted.status(),response:{archived:archivedResponse.archived,published_revision:archivedResponse.published_revision},immediateRemoval:true});
  assert.equal(sql(`SELECT archived_at IS NOT NULL AND published_revision IS NULL FROM cms_documents WHERE key='${deleteKey}'`),'t');
  const again=await context.request.post(deleted.url(),{headers:{Authorization:token},data:deleted.request().postDataJSON()});assert.equal(again.status(),200);assert.equal(sql(`SELECT count(*) FROM cms_events WHERE document_key='${deleteKey}' AND event_type='archived'`),'1');
  await page.reload();assert.equal(await card.count(),0);await page.getByRole('link',{name:t.archivedItems,exact:true}).click();console.log('Archive view opened');await card.waitFor();await card.getByRole('button',{name:t.restore,exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:t.restore,exact:true}).click();await card.waitFor({state:'hidden'});
  await page.getByRole('link',{name:t.back,exact:true}).click();await card.getByText(t.unpublished,{exact:true}).waitFor();
 }
 const editRaceKey='created.news.'+require('node:crypto').randomUUID(),editPayload=structuredClone(response.request().postDataJSON().payload);editPayload.slug='synthetic-delete-edit-race';
 const raceDraft=await context.request.post(BASE+'/api/admin/cms/documents',{headers:{Authorization:token},data:{key:editRaceKey,payload:editPayload}});assert.equal(raceDraft.status(),201);const raceVersion=(await raceDraft.json()).version;
 const outcomes=await Promise.all([
  context.request.post(BASE+'/api/admin/cms/documents/'+editRaceKey+'/archive',{headers:{Authorization:token},data:{expected_version:raceVersion}}),
  context.request.put(BASE+'/api/admin/cms/documents/'+editRaceKey+'/draft',{headers:{Authorization:token},data:{expected_version:raceVersion,payload:editPayload}})
 ]);assert.deepEqual(outcomes.map(r=>r.status()).sort(),[200,409]);
 assert.equal(sql(`SELECT count(*) FROM cms_documents WHERE key='${editRaceKey}' AND archived_at IS NOT NULL AND published_revision IS NOT NULL`),'0');
 evidence.deletion='PASS published and never-published UI deletion, persistent normal-list exclusion, retry without duplicate audit, archive view and unpublished restoration';
 evidence.news={key,result:'PASS direct publish/list/detail/LV-RU-EN/refresh/edit/image replacement/archive/restore/retry'};await publicPage.close();return {response,token,key};
};
