<script setup lang="ts">
import {editorialProfile} from '../../services/admin/doctorProfile';
import {computed,ref,watch,onBeforeUnmount} from 'vue';
import {useI18n} from 'vue-i18n';
import {cmsRequest} from '../../services/cms/admin';
import {refreshPublished} from '../../services/cms/content';
import {useAuthStore} from '../../stores/auth';
import MediaLibrary from './MediaLibrary.vue';
import {trapDialogFocus} from '../../services/dialogFocus';
const props=defineProps<{language:string;blocked?:boolean;invalidField?:string;invalidLocale?:string}>(),emit=defineEmits<{portrait:[value:string]}>();
const {t,locale}=useI18n(),auth=useAuthStore();
const keys=['clinic.doctorBio','messages.home','clinic.media'];
const entries=ref<Record<string,any>>({}),busy=ref(false),error=ref(''),notice=ref(''),loaded=ref(false);
const c=new AbortController(),picker=ref<HTMLDialogElement>(),picking=ref(false);
const clone=(v:any)=>JSON.parse(JSON.stringify(v));
const dirty=computed(()=>Object.values(entries.value).some(e=>JSON.stringify(e.payload)!==e.saved));
const pending=computed(()=>Object.values(entries.value).some(e=>e.document.draft_revision!==e.document.published_revision));
async function load(){busy.value=true;error.value='';try{const results=await Promise.all(keys.map(key=>cmsRequest('/'+key,c.signal)));const next:Record<string,any>={};results.forEach((r,i)=>{const revision=r.revisions.find((v:any)=>v.id===(r.document.draft_revision||r.document.published_revision));if(!revision)throw Error('unavailable');next[keys[i]!]={...r,payload:clone(revision.payload),saved:JSON.stringify(revision.payload)}});entries.value=next;loaded.value=true;emit('portrait',next['clinic.media'].payload.doctor)}catch{error.value='unavailable'}finally{busy.value=false}}
async function reload(){if(!dirty.value||window.confirm(t('cms.leave')))await load()}
async function saveDrafts(){if(!loaded.value||!auth.verifiedAdmin)return false;busy.value=true;error.value='';notice.value='';try{for(const key of keys){const e=entries.value[key];if(JSON.stringify(e.payload)===e.saved)continue;const document=await cmsRequest('/'+key+'/draft',c.signal,{expected_version:e.document.version,payload:e.payload},'PUT');e.document=document;e.saved=JSON.stringify(e.payload);const fresh=await cmsRequest('/'+key,c.signal);e.revisions=fresh.revisions;}return true}catch(e){error.value=(e as Error).message;return false}finally{busy.value=false}}
async function publish(){if(props.blocked||dirty.value||busy.value||!auth.verifiedAdmin||!window.confirm(t('cms.confirmPublish')+'\n\n'+t('specialist.publishScope')))return;busy.value=true;error.value='';try{for(const key of keys){const e=entries.value[key];if(e.document.draft_revision===e.document.published_revision)continue;e.document=await cmsRequest('/'+key+'/publish',c.signal,{expected_version:e.document.version,revision_id:e.document.draft_revision},'POST')}await load();void refreshPublished();notice.value=t('specialist.published')}catch(e){error.value=(e as Error).message}finally{busy.value=false}}
async function restore(key:string,revision:string){if(props.blocked||dirty.value||busy.value||!window.confirm(t('cms.confirmRestore')+'\n\n'+t('specialist.publishScope')))return;busy.value=true;try{const e=entries.value[key];await cmsRequest('/'+key+'/rollback',c.signal,{expected_version:e.document.version,revision_id:revision},'POST');await load();void refreshPublished();notice.value=t('specialist.published')}catch(e){error.value=(e as Error).message}finally{busy.value=false}}
function choose(asset:any){entries.value['clinic.media'].payload.doctor=asset.url;emit('portrait',asset.url);picking.value=false;picker.value?.close()}
watch(()=>auth.verifiedAdmin,v=>{if(v&&!loaded.value&&!busy.value)void load()},{immediate:true});onBeforeUnmount(()=>c.abort());
function snapshot(){return {...editorialProfile(entries.value['clinic.doctorBio'].payload,entries.value['messages.home'].payload),portrait:entries.value['clinic.media'].payload.doctor}}
defineExpose({dirty,busy,loaded,saveDrafts,snapshot});
</script>
<template><div class="publication"><p v-if="busy" role="status">{{t('operations.loading')}}</p><p v-if="notice" role="status">{{notice}}</p><p v-if="error" role="alert">{{t(error==='conflict'?'specialist.savedElsewhere':'operations.unavailable')}} <button type="button" @click="reload">{{t('specialist.reload')}}</button></p>
<fieldset v-if="loaded" :disabled="busy"><button type="button" @click="()=>{picking=true;picker?.showModal()}">{{t('operations.portrait')}}</button><label>{{t('doctors.title')}}<input v-model="entries['messages.home'].payload[language].doctorRole" :aria-invalid="invalidField==='title'" :aria-describedby="invalidField==='title'?'doctor-field-error':undefined" maxlength="2000"/></label><label>{{t('operations.biography')}}<textarea v-model="entries['clinic.doctorBio'].payload[language]" :aria-invalid="invalidField==='biography'" :aria-describedby="invalidField==='biography'?'doctor-field-error':undefined" rows="6" maxlength="4000" required/></label>
<div v-if="pending" class="publish-followup"><p>{{t('specialist.publishHelp')}}</p><button type="button" :disabled="dirty||blocked" @click="publish">{{t('specialist.publish')}}</button></div>
<details><summary>{{t('specialist.profileHistory')}}</summary><section v-for="(key,index) in keys" :key="key"><h3>{{t(['doctors.bio','doctors.title','doctors.portrait'][index]!)}}</h3><ul><li v-for="r in entries[key].revisions.filter((r:any)=>r.published_at)" :key="r.id">{{new Date(r.created_at).toLocaleString(locale)}} <button type="button" :disabled="dirty||blocked" @click="restore(key,r.id)">{{t('cms.restore')}}</button></li></ul></section></details></fieldset>
<dialog ref="picker" :aria-label="t('operations.portrait')" @keydown="trapDialogFocus"><MediaLibrary v-if="picking" picker @select="choose" @close="()=>{picking=false;picker?.close()}"/></dialog></div></template>
<style scoped>fieldset{border:0;padding:0;min-width:0}label{display:block;margin:18px 0}input,textarea{display:block;width:100%;font:inherit;padding:12px;border:1px solid var(--line);background:transparent;color:inherit}button{min-height:44px;padding:12px;font:inherit;border:1px solid var(--line)}summary{cursor:pointer;min-height:44px;padding:12px 0}h3{font:inherit;margin:12px 0}.publish-followup{margin:20px 0;padding:16px 0;border-top:1px solid var(--line)}dialog{width:min(1000px,95vw);max-height:90dvh;margin:auto} :focus-visible{outline:2px solid var(--ink);outline-offset:3px}</style>
