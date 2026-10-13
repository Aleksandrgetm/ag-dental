import test from 'node:test';
import assert from 'node:assert/strict';
import {newsIssues,newsServerIssue,newsExcerpt} from '../src/services/cms/newsValidation.ts';
const text=(f,l)=>['title','body'].includes(f)?'Synthetic '+l:'';
test('news required fields, languages and strict calendar validation',()=>{
 assert.deepEqual(newsIssues(text,'2026-10-12','/registered.jpg'),[]);
 for(const l of ['lv','ru','en'])for(const f of ['title','body'])assert.deepEqual(newsIssues((field,lang)=>field===f&&lang===l?'':text(field,lang),'2026-10-12','/registered.jpg'),[{field:f,language:l}]);
 for(const date of ['','2026-02-30','nonsense'])assert.deepEqual(newsIssues(text,date,'/registered.jpg'),[{field:'date'}]);
 assert.deepEqual(newsIssues(text,'2026-10-12',''),[{field:'image'}]);
});
test('UTF-8 limits, safe metadata and exact server field mapping',()=>{
 assert.deepEqual(newsIssues((f,l)=>f==='title'?'я'.repeat(101):text(f,l),'2026-10-12','image').map(i=>i.field),['title','title','title']);
 assert.equal(newsIssues((f,l)=>f==='author'?'<script>x</script>':text(f,l),'2026-10-12','image').length,3);
 assert.deepEqual(newsServerIssue('body.ru'),{field:'body',language:'ru'});
 assert.deepEqual(newsServerIssue('image'),{field:'image'});
 assert.equal(newsServerIssue('secret.anything'),undefined);
 assert.equal(new TextEncoder().encode(newsExcerpt('я'.repeat(500))).length,500);
});
