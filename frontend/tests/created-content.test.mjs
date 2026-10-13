import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createdKey,createdPath,validCreated,emptyCreated} from '../src/services/cms/created.ts';
test('structured CMS rejects incomplete translations, executable fields and unsafe URLs',()=>{
 const p=emptyCreated();assert.equal(validCreated(p),false);p.slug='synthetic';for(const f of ['title','summary','body','seo_title','seo_description'])p[f]={lv:'Synthetic LV',ru:'Synthetic RU',en:'Synthetic EN'};
 assert.equal(validCreated(p),true);assert.equal(validCreated({...p,html:'<script>'}),false);assert.equal(validCreated({...p,slug:'../admin'}),false);assert.equal(validCreated({...p,body:{...p.body,en:'<script>alert(1)</script>'}}),false);
 assert.equal(createdKey.test('created.hero.11111111-1111-4111-8111-111111111111'),false);
 assert.equal(createdPath('created.news.example','synthetic'),'/jaunumi/synthetic');
});
