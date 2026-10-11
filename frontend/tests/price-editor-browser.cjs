const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const {createCMSFixture}=require('./helpers/cms-fixture.cjs');
const BASE=process.env.TEST_BASE_URL||'http://127.0.0.1:5185';
(async()=>{
 const {operationMessages}=await import('../src/i18n/operations.ts');
 const browser=await chromium.launch({channel:'chrome',headless:true});const errors=[];let checks=0;
 try{for(const locale of ['lv','ru','en'])for(const width of [320,375,390,430,768,1024,1440,1920]){
  const f=await createCMSFixture(browser,locale,width,errors);const p=f.page,t=operationMessages[locale];
  await p.goto(BASE+'/admin/pages/cenas/prices.0');
  const editor=p.locator('.price-editor');await editor.waitFor();
  assert.equal(await editor.locator('details').count(),2);
  await editor.locator('summary').first().click();
  await editor.locator('details').first().getByLabel(t.archived,{exact:true}).check();
  await editor.getByRole('button',{name:t.addRow,exact:true}).click();
  const added=editor.locator('details').last();
  for(const lang of ['lv','ru','en'])await added.getByLabel(t.name+' · '+lang.toUpperCase(),{exact:true}).fill('Synthetic '+lang);
  await added.getByLabel(t.price,{exact:true}).fill('12.00');
  await added.getByLabel(t.order,{exact:true}).fill('-1');
  await p.getByRole('button',{name:f.t.save,exact:true}).click();await p.getByText(f.t.saved,{exact:true}).waitFor();
  const current=f.state.rows.get('prices.0');const draft=current.revisions[0].payload;
  assert.equal(draft.items.length,3);assert.equal(draft.items[0].price,'50.00');assert.equal(draft.items[0].archived,true);
  await p.getByRole('button',{name:f.t.preview,exact:true}).click();
  await p.locator('.cms-content-preview').getByText('Synthetic '+locale,{exact:true}).waitFor();
  assert.equal(await p.locator('.cms-content-preview').getByText('50.00 €',{exact:true}).count(),0);
  await p.getByRole('button',{name:f.t.publish,exact:true}).click();await p.getByText(f.t.done,{exact:true}).waitFor();
  await p.goto(BASE+'/cenas');await p.getByText('Synthetic '+locale,{exact:true}).waitFor();
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await f.context.close();checks++;
 }assert.deepEqual(errors,[]);console.log(`Price editor browser: ${checks} locale/viewport scenarios passed`)}finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
