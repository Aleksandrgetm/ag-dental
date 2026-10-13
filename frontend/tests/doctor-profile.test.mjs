import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {editorialProfile,profileIssue,portraitReference} from '../src/services/admin/doctorProfile.ts';
const manifest=JSON.parse(fs.readFileSync(new URL('../../backend/internal/cms/content.json',import.meta.url)));
const get=key=>manifest.documents.find(d=>d.key===key).data;
test('existing CMS biography and professional title retain all exact approved translations',()=>{
 const profile={...editorialProfile(get('clinic.doctorBio'),get('messages.home')),qualifications:{lv:'',ru:'',en:''}};
 assert.equal(profileIssue(profile),null);
 for(const l of ['lv','ru','en']){assert.equal(profile.biography[l],get('clinic.doctorBio')[l]);assert.equal(profile.title[l],get('messages.home')[l].doctorRole)}
});
test('existing registered portrait resolves without an upload, protected/unready/missing assets fail closed',()=>{
 const assets=manifest.media.map(a=>({...a,state:'ready',metadata:a}));
 assert.equal(portraitReference(assets,get('clinic.media').doctor),'media.a5efea0fa7154c32');
 for(const assets2 of [[],assets.map(a=>({...a,protected:true})),assets.map(a=>({...a,state:'archived'})),assets.map(a=>({...a,metadata:{kind:'video'}}))])assert.throws(()=>portraitReference(assets2,get('clinic.media').doctor),/portraitInvalid/);
});
test('missing or invalid translations identify their field without generating content',()=>{
 const p={title:{lv:'',ru:'',en:''},biography:{lv:'',ru:'',en:''},qualifications:{lv:'',ru:'',en:''}};
 p.biography.ru='<p>Invalid</p>';assert.deepEqual(profileIssue(p),{field:'biography',locale:'ru'});
 p.biography.ru='';delete p.title.en;assert.deepEqual(profileIssue(p),{field:'title',locale:'en'});
});

test('PostgreSQL JSON key ordering does not cause repeat profile writes',async()=>{const {sameLocalizedText}=await import('../src/services/admin/doctorProfile.ts');assert.equal(sameLocalizedText({en:'EN',lv:'LV',ru:'RU'},{lv:'LV',ru:'RU',en:'EN'}),true);assert.equal(sameLocalizedText({en:'EN'},{en:'changed'}),false)});
