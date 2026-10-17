import test from 'node:test';
import assert from 'node:assert/strict';
import {readPreferences,hasPreference,savePreferences,preferenceKey} from '../src/services/hero/preferences.ts';
test('Hero defaults respect reduced motion, explicit choice survives visits',()=>{
 let raw=null; const storage={getItem:()=>raw,setItem:(key,value)=>{assert.equal(key,preferenceKey);raw=value}};
 assert.deepEqual(readPreferences(storage,false),{animation:true,video:true});
 assert.deepEqual(readPreferences(storage,true),{animation:false,video:true});
 savePreferences(storage,{animation:true,video:false});
 assert.equal(hasPreference(storage),true);
 assert.deepEqual(readPreferences(storage,true),{animation:true,video:false});
});
test('Hero corrupt or blocked storage safely follows system motion preference',()=>{
 for(const raw of ['null','{}','{"animation":"false","video":true}','bad'])assert.deepEqual(readPreferences({getItem:()=>raw},true),{animation:false,video:true});
 const blocked={getItem(){throw Error('blocked')},setItem(){throw Error('blocked')}};
 assert.equal(hasPreference(blocked),false); assert.doesNotThrow(()=>savePreferences(blocked,{animation:false,video:false}));
 assert.deepEqual(readPreferences(blocked,false),{animation:true,video:true});
});

test('only authorized component and numbering stylesheet locks change; other 13 locks remain',async()=>{
 const {readFileSync}=await import('node:fs');
 const original=JSON.parse(readFileSync(new URL('../../docs/HERO_LOCK_PRE_MOBILE.json',import.meta.url)));
 const current=JSON.parse(readFileSync(new URL('../../docs/HERO_LOCK.json',import.meta.url)));
 assert.equal(Object.keys(current).length,15);
 for(const key of Object.keys(original)) {
  if(key==='frontend/src/style.css') assert.equal(current[key],'dfdfdf16e984c336ff0987ff37a64625dbde6e9b5bc04130a0e68b4effdea13b','Approved numbering-only stylesheet baseline');
  else if(!key.endsWith('/ScrollClinicHero.vue')) assert.equal(current[key],original[key],key);
 }
});

test('public arrow controls use SVG rather than emoji-dependent characters',async()=>{
 const {readFileSync}=await import('node:fs');
 for(const file of ['views/ContactView.vue','views/HomeView.vue','views/ArticleView.vue','views/NewsView.vue','views/ServiceView.vue','components/privacy/CookieConsent.vue','components/home/ScrollClinicHero.vue']){
  assert.doesNotMatch(readFileSync(new URL('../src/'+file,import.meta.url),'utf8'),/[↗→←]/,file);
 }
 assert.match(readFileSync(new URL('../src/components/common/ArrowIcon.vue',import.meta.url),'utf8'),/aria-hidden="true"/);
});
