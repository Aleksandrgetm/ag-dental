// Real local Auth/Go/PostgreSQL/Storage. No mocked API responses or production credentials.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
const {sql,security,storageDeletion}=require('./acceptance-workflows.cjs');
if(process.env.AG_ACCEPTANCE!=='disposable')throw Error('Isolated runner required');
const BASE='https://localhost:5190';
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true,args:['--ignore-certificate-errors-spki-list='+process.env.QA_SPki]});try{
 const context=await browser.newContext();await context.route('**/*',r=>['localhost','127.0.0.1'].includes(new URL(r.request().url()).hostname)?r.continue():r.abort());const page=await context.newPage();page.on('dialog',d=>d.accept());
 await page.goto(BASE+'/login?lang=en');await page.getByRole('button',{name:'Reject optional',exact:true}).click();await page.locator('input[type=email]').fill('admin@acceptance.invalid');await page.locator('input[type=password]').fill(process.env.QA_PASSWORD);await page.locator('form button[type=submit]').click();await page.waitForURL(BASE+'/');
 const evidence={};const {response,token,key}=await require('./helpers/news-real-workflow.cjs')(page,evidence);
 await security(page,evidence);await storageDeletion(page,evidence);
 // Revocation is checked by the real API on every mutation, including retries.
 const who=JSON.parse(sql("SELECT json_build_object('id',user_id) FROM user_roles WHERE role='admin' LIMIT 1"));sql(`UPDATE user_roles SET role='user' WHERE user_id='${who.id}'`);assert.equal((await context.request.post(response.url(),{headers:{Authorization:token},data:response.request().postDataJSON()})).status(),403);
 evidence.news={key,result:'PASS create/direct publish/list/detail/LV-RU-EN/refresh/edit/image replacement/archive/restore/retry/role revocation'};fs.writeFileSync('../docs/NEWS_ADMIN_REAL_EVIDENCE.json',JSON.stringify(evidence,null,2)+'\n');console.log(evidence.news.result);await context.close();
}finally{await browser.close()}})().catch(e=>{console.error(e.stack||e.message);process.exitCode=1});
