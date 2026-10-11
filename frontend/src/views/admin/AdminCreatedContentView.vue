<script setup lang="ts">
import AdminMediaPreview from "../../components/admin/AdminMediaPreview.vue";
import {suggestSlug} from "../../services/admin/slug";
import {trapDialogFocus} from "../../services/dialogFocus";
import {computed,nextTick,onBeforeUnmount,ref,watch} from 'vue';
import {onBeforeRouteLeave,onBeforeRouteUpdate,useRoute,useRouter} from 'vue-router';
import {useI18n} from 'vue-i18n';
import {useAuthStore} from '../../stores/auth';
import {cmsRequest} from '../../services/cms/admin';
import {createdKey,emptyCreated,validCreated,createdPath,type CreatedPayload} from '../../services/cms/created';
import AdminPageHeader from '../../components/admin/AdminPageHeader.vue';
import MediaLibrary from '../../components/admin/MediaLibrary.vue';
const {t,locale}=useI18n(),route=useRoute(),router=useRouter(),auth=useAuthStore();
const items=ref<any[]>([]),documentRow=ref<any>(null),history=ref<any[]>([]),payload=ref<CreatedPayload>(emptyCreated()),kind=ref(String(route.meta.contentKind||'news')),language=ref<'lv'|'ru'|'en'>(['lv','ru','en'].includes(locale.value)?locale.value as 'lv'|'ru'|'en':'lv');
const busy=ref(false),error=ref(''),preview=ref(false),picking=ref(false),picker=ref<HTMLDialogElement>(),original=ref(''),intent=ref('');
const key=computed(()=>String(route.params.key||'')),dirty=computed(()=>!!original.value&&JSON.stringify(payload.value)!==original.value);
const manualSlug=ref(false);
const base=computed(()=>kind.value==='news'?'/admin/news':kind.value==='faq'?'/admin/pages/faq':'/admin/pages');
const requiredFields=computed(()=>['title','body'] as const);
watch(()=>[payload.value.title.lv,payload.value.title.ru,payload.value.title.en],()=>{if(!key.value&&!manualSlug.value)payload.value.slug=suggestSlug(payload.value.title.lv||payload.value.title.en||payload.value.title.ru)});
const missingLanguages=computed(()=>(['lv','ru','en'] as const).filter(lang=>requiredFields.value.some(field=>!payload.value[field][lang].trim())));
const localizedFields=computed(()=>['title','body'] as const);
let controller=new AbortController(),loadedKey:string|null=null;
async function load(){controller.abort();controller=new AbortController();const own=controller;busy.value=true;error.value='';preview.value=false;intent.value='';try{
 if(key.value){if(!createdKey.test(key.value)||(route.meta.contentKind&&!key.value.startsWith('created.'+route.meta.contentKind+'.')))throw Error('invalid');const data=await cmsRequest('/'+encodeURIComponent(key.value),own.signal);if(own.signal.aborted)return;documentRow.value=data.document;history.value=data.revisions;const draft=history.value.find(r=>r.id===data.document.draft_revision);if(!draft||!validCreated(draft.payload))throw Error('invalid');payload.value=JSON.parse(JSON.stringify(draft.payload));kind.value=key.value.split('.')[1]!}
 else {kind.value=String(route.meta.contentKind||'news');manualSlug.value=false;const data=await cmsRequest('',own.signal);if(own.signal.aborted)return;items.value=data.documents.filter((d:any)=>createdKey.test(d.key));documentRow.value=null;history.value=[];payload.value=emptyCreated()}
 original.value=JSON.stringify(payload.value);loadedKey=key.value+'|'+String(route.meta.contentKind||'');
 }catch(e){if(!own.signal.aborted)error.value=(e as Error).message}finally{if(!own.signal.aborted)busy.value=false}}
function discard(){return !dirty.value||window.confirm(t('operations.discard'))}
async function save(){if(busy.value)return;if(missingLanguages.value.length){error.value='incomplete';language.value=missingLanguages.value[0]!;preview.value=false;await nextTick();document.querySelector<HTMLTextAreaElement>('.created-editor textarea:invalid')?.focus();return}for(const lang of ['lv','ru','en'] as const){if(!payload.value.summary[lang])payload.value.summary[lang]=payload.value.body[lang].slice(0,1000);if(!payload.value.seo_title[lang])payload.value.seo_title[lang]=payload.value.title[lang];if(!payload.value.seo_description[lang])payload.value.seo_description[lang]=payload.value.summary[lang].slice(0,500)}if(!validCreated(payload.value)){error.value='invalid';return}busy.value=true;error.value='';try{
 if(!key.value){if(!intent.value)intent.value=`created.${kind.value}.${crypto.randomUUID()}`;const data=await cmsRequest('',controller.signal,{key:intent.value,payload:payload.value},'POST');original.value=JSON.stringify(payload.value);await router.replace(route.meta.contentKind?base.value+'/edit/'+data.key:'/admin/pages/created/'+data.key)}
 else {await cmsRequest('/'+key.value+'/draft',controller.signal,{expected_version:documentRow.value.version,payload:payload.value},'PUT');original.value=JSON.stringify(payload.value);await load()}
 }catch(e){error.value=(e as Error).message}finally{busy.value=false}}
async function change(action:string,revision:string){if(busy.value||dirty.value||!window.confirm(t('created.confirm')))return;busy.value=true;error.value='';try{await cmsRequest('/'+key.value+'/'+action,controller.signal,{expected_version:documentRow.value.version,revision_id:revision},'POST');await load()}catch(e){error.value=(e as Error).message}finally{busy.value=false}}
function select(asset:any){payload.value.image=asset.origin==='upload'?'cms-media:'+asset.id:asset.url;picking.value=false;picker.value?.close()}
function unload(e:BeforeUnloadEvent){if(dirty.value){e.preventDefault();e.returnValue=''}}
window.addEventListener('beforeunload',unload);onBeforeRouteLeave(discard);onBeforeRouteUpdate(discard);watch([key,()=>route.meta.contentKind,()=>auth.verifiedAdmin],()=>{if(auth.verifiedAdmin&&loadedKey!==key.value+'|'+String(route.meta.contentKind||'')){void load()}},{immediate:true,flush:'post'});onBeforeUnmount(()=>{controller.abort();window.removeEventListener('beforeunload',unload)});
</script>
<template><section class="created-editor"><AdminPageHeader :title="key ? (payload.title[locale as 'lv'|'ru'|'en'] || t('cms.edit')) : t(route.meta.contentKind?'simple.'+(kind==='news'?'addNews':kind==='faq'?'addFAQ':'addPage'):'created.heading')" /><RouterLink :to="base">{{t('simple.back')}}</RouterLink>
<p v-if="error" role="alert">{{error==='incomplete'?t('created.incomplete',{languages:missingLanguages.map(l=>l.toUpperCase()).join(', ')}):t('operations.'+(['invalid','conflict'].includes(error)?error:'unavailable'))}}</p><p v-if="busy" role="status">{{t('operations.loading')}}</p>

<form v-if="(key ? documentRow : !error||error==='incomplete'||error==='invalid')&&(!busy||documentRow)" @submit.prevent="save"><fieldset :disabled="busy"><label v-if="!key&&!route.meta.contentKind">{{t('created.template')}}<select :aria-label="t('created.template')" v-model="kind" :disabled="!!intent"><option v-for="option in ['news','page','faq']" :key="option" :value="option">{{t('created.'+option)}}</option></select></label>
<label v-if="kind!=='faq'">{{t('operations.date')}}<input v-model="payload.date" type="date" required/></label>
<label>{{t('created.language')}}<select v-model="language" :aria-label="t('created.language')"><option value="lv">LV</option><option value="ru">RU</option><option value="en">EN</option></select></label>
<template v-if="!preview"><label v-for="field in localizedFields" :key="field">{{t('created.'+field)}} · {{language.toUpperCase()}}<textarea v-model="payload[field][language]" :rows="field==='body'?12:3" :maxlength="field==='body'?20000:200" required/></label><button type="button" @click="()=>{picking=true;picker?.showModal()}"><AdminMediaPreview v-if="payload.image" :reference="payload.image"/>{{t('created.image')}}</button><button v-if="payload.image" type="button" @click="payload.image=''">{{t('created.removeImage')}}</button><p v-if="payload.image">{{t('created.imageSelected')}}</p></template>
<article v-else :lang="language"><h1>{{payload.title[language]}}</h1><p>{{payload.summary[language]}}</p><p v-for="(paragraph,index) in payload.body[language].split('\n\n')" :key="index" class="paragraph">{{paragraph}}</p></article>

<div class="actions"><button type="button" :aria-pressed="preview" @click="preview=!preview">{{t(preview?'created.edit':'created.preview')}}</button><button type="submit">{{t('cms.save')}}</button><button v-if="documentRow" type="button" :disabled="dirty" @click="change('publish',documentRow.draft_revision)">{{t('created.publish')}}</button><button v-if="documentRow?.published_revision" type="button" :disabled="dirty" @click="change('unpublish',documentRow.draft_revision)">{{t('created.archive')}}</button></div></fieldset></form>
<RouterLink v-if="documentRow?.published_revision" :to="createdPath(key,payload.slug)" target="_blank">{{t('created.view')}}</RouterLink><h2 v-if="history.length">{{t('operations.history')}}</h2><ol><li v-for="revision in history" :key="revision.id">{{new Date(revision.created_at).toLocaleString(locale)}} <button v-if="revision.published_at" :disabled="busy||dirty" @click="change('rollback',revision.id)">{{t('created.restore')}}</button></li></ol>
<dialog @keydown="trapDialogFocus" :aria-label="t('created.image')" ref="picker"><MediaLibrary v-if="picking" picker @select="select" @close="()=>{picking=false;picker?.close()}"/></dialog></section></template>
<style scoped>
.created-editor{max-width:1000px}.created-editor fieldset{border:0;padding:0;min-width:0}.created-editor label{display:block;margin:18px 0}.created-editor input,.created-editor select,.created-editor textarea{display:block;width:100%;min-height:44px;font:inherit;padding:10px;border:1px solid var(--line);background:var(--white);color:var(--ink)}.created-editor button{min-height:44px;padding:10px 16px;font:inherit;border:1px solid var(--line);background:transparent;color:var(--ink);cursor:pointer}.actions{display:flex;flex-wrap:wrap;gap:12px;margin:20px 0}.created-editor button:disabled{opacity:.5;cursor:default}.created-editor :focus-visible{outline:2px solid var(--ink);outline-offset:3px}.paragraph{white-space:pre-line}.created-editor dialog{width:min(1000px,95vw);max-height:90dvh;margin:auto;padding:20px;background:var(--white);border:1px solid var(--line)}[role=alert]{color:#8b3429}
</style>
