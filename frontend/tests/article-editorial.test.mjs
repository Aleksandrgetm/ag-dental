import {test} from 'node:test';
import assert from 'node:assert/strict';
import {importedArticle,createdArticle} from '../src/services/cms/article.ts';
import {emptyCreated,validCreated} from '../src/services/cms/created.ts';
import {articles} from '../src/content/articles.ts';
test('legacy adapter preserves lead/body/source and approved portrait attribution',()=>{
 const p=articles.find(a=>a.slug==='zobu-protezes-un-protezesana'),a=importedArticle(p);
 assert.equal(a.introduction,p.paragraphs[0]);assert.deepEqual(a.body,p.paragraphs.slice(1));assert.equal(a.caption,'Dr. Anda Gutovska');assert.equal(a.source,p.source);
 const changed=importedArticle({...p,introduction:'',author:'',category:''});assert.equal(changed.introduction,'');assert.equal(changed.caption,'');assert.deepEqual(changed.body,p.paragraphs);
});
test('new article optional metadata is independent of body and locale',()=>{
 const p=emptyCreated();p.slug='synthetic';for(const f of ['title','body','seo_title','seo_description'])for(const l of ['lv','ru','en'])p[f][l]=f+' '+l;
 assert.equal(validCreated(p),true);
 for(const l of ['lv','ru','en']){let a=createdArticle(p,l);assert.equal(a.introduction,'');assert.equal(a.author,'');assert.equal(a.category,'');assert.deepEqual(a.body,['body '+l]);}
 p.author={lv:'Autors',ru:'Автор',en:'Author'};p.category={lv:'',ru:'',en:'Category'};p.summary.en='Introduction';assert.equal(validCreated(p),true);assert.equal(createdArticle(p,'en').introduction,'Introduction');assert.equal(createdArticle(p,'ru').category,'');
 assert.equal(validCreated({...p,author:{...p.author,en:'<script>x</script>'}}),false);assert.equal(validCreated({...p,category:{en:'Incomplete'}}),false);
});
