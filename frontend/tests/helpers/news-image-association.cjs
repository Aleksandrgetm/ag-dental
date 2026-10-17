const assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
module.exports=async function(page,slug='zobu-protezes-un-protezesana',source=process.env.QA_IMAGE_DELETABLE){
 const {newsAdminMessages}=await import('../../src/i18n/newsAdmin.ts'),{mediaMessages}=await import('../../src/i18n/media.ts');const n=newsAdminMessages.en,m=mediaMessages.en;
 const base='https://localhost:5190',key='news.'+slug;
 const loaded=page.waitForResponse(r=>r.url().endsWith('/api/admin/cms/documents/'+key)&&r.request().method()==='GET');
 await page.goto(base+'/admin/news/edit/'+key+'?lang=en');const initial=await(await loaded).json();
 const before=initial.revisions.find(r=>r.id===initial.document.draft_revision).payload;
 await page.locator('#news-image').click();
 const file=source+'.jpg';execFileSync('ffmpeg',['-v','error','-i',source,'-vf','scale=117:91','-frames:v','1','-y',file]);
 const uploaded=page.waitForResponse(r=>r.url().endsWith('/api/admin/cms/media')&&r.request().method()==='POST');await page.locator('input[type=file]').setInputFiles(file);
 const upload=await uploaded;assert.equal(upload.status(),200);const {asset}=await upload.json();assert.ok(!asset.metadata.alt||Object.keys(asset.metadata.alt).length===0);
 await page.getByRole('button',{name:m.select,exact:true}).click();
 const saved=page.waitForResponse(r=>r.url().endsWith('/save-publish')&&r.request().method()==='POST');await page.getByRole('button',{name:n.publish,exact:true}).click();const response=await saved;
 console.log('Imported featured image flow:',JSON.stringify({uploadStatus:upload.status(),persistedID:asset.id,saveStatus:response.status(),saveError:response.ok()?null:await response.json()}));
 assert.equal(response.status(),200);await page.waitForURL(base+'/admin/news');
 const reload=page.waitForResponse(r=>r.url().endsWith('/api/admin/cms/documents/'+key)&&r.request().method()==='GET');await page.goto(base+'/admin/news/edit/'+key+'?lang=en');const current=await(await reload).json();const after=current.revisions.find(r=>r.id===current.document.published_revision).payload;
 for(const l of ['lv','ru','en']){assert.equal(after[l].image,asset.url);const expected=structuredClone(before[l]);expected.image=asset.url;assert.deepEqual(after[l],expected);}
 await page.locator('#news-image img').waitFor();await page.reload();await page.waitForFunction(()=>document.querySelector('#news-image img')?.naturalWidth>0);
 const publicPage=await page.context().newPage();for(const lang of ['lv','ru','en']){await publicPage.goto(base+'/jaunumi/'+slug+'?lang='+lang);await publicPage.waitForFunction(id=>{const img=document.querySelector('.article-editorial img');return img?.src.includes(id)&&img.naturalWidth>0},asset.id);assert.equal(await publicPage.locator('.article-editorial img').getAttribute('alt'),after[lang].caption||after[lang].title);}
 for(const lang of ['lv','ru','en'])for(const width of [390,1440]){
 await publicPage.setViewportSize({width,height:900});
 await publicPage.goto(base+'/jaunumi?lang='+lang);
 const row=publicPage.locator('.journal-row[href="/jaunumi/'+slug+'"]');
 await row.waitFor();assert.equal(await row.locator('img').count(),0);
 assert.equal((await row.locator('h2').innerText()).trim(),after[lang].title);
 await publicPage.reload();await row.waitFor();assert.equal(await row.locator('img').count(),0);
 if(slug==='zobu-higiena-kas-pieejama-ikvienam'){
  await publicPage.goto(base+'/?lang='+lang);await publicPage.locator('.journal-feature-image').scrollIntoViewIfNeeded();
  await publicPage.waitForFunction(id=>{const img=document.querySelector('.journal-feature-image img');return img?.src.includes(id)&&img.naturalWidth>0},asset.id);
 }
 assert.equal(await publicPage.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
}
await publicPage.close();console.log('PASS imported article metadata-free JPEG association, reload, public delivery and unchanged LV/RU/EN content');
};
