<script setup lang="ts">
import {newsIssues,newsServerIssue,newsExcerpt,type NewsIssue} from '../../services/cms/newsValidation';
import {newsTrace} from '../../services/admin/newsTrace';
import {computed,nextTick,onBeforeUnmount,ref,watch} from 'vue';
import {onBeforeRouteLeave,onBeforeRouteUpdate,useRoute,useRouter} from 'vue-router';
import {useI18n} from 'vue-i18n';
import {useAuthStore} from '../../stores/auth';
import {cmsRequest} from '../../services/cms/admin';
import {emptyCreated,createdKey} from '../../services/cms/created';
import {newsDocs} from '../../services/cms/catalog';
import {media,refreshPublished} from '../../services/cms/content';
import {mediaID} from '../../services/cms/mediaReference';
import {suggestSlug} from '../../services/admin/slug';
import {trapDialogFocus} from '../../services/dialogFocus';
import AdminPageHeader from '../../components/admin/AdminPageHeader.vue';
import AdminMediaPreview from '../../components/admin/AdminMediaPreview.vue';
import MediaLibrary from '../../components/admin/MediaLibrary.vue';
const {t,locale}=useI18n(),route=useRoute(),router=useRouter(),auth=useAuthStore();
const langs=['lv','ru','en'] as const;type Lang=typeof langs[number];
const language=ref<Lang>(langs.includes(locale.value as Lang)?locale.value as Lang:'lv');
const key=computed(()=>String(route.params.key||'')),editing=computed(()=>route.path==='/admin/news/new'||!!key.value);
const archived=computed(()=>route.query.archived==='1');
const rows=ref<any[]>([]),documentRow=ref<any>(null),history=ref<any[]>([]),payload=ref<any>(emptyCreated());
const busy=ref(false),error=ref(''),notice=ref(''),original=ref(''),intent=ref(''),picker=ref<HTMLDialogElement>(),picking=ref(false);
const archiveDialog=ref<HTMLDialogElement>(),archivePending=ref<{row:any;restore:boolean}|null>(null);
function askArchive(row:any,restore=false){newsTrace('click',{busy:busy.value,verified:auth.verifiedAdmin});if(busy.value)return;archivePending.value={row,restore};archiveDialog.value?.showModal()}
function cancelArchive(){newsTrace('confirmation',{confirmed:false});archiveDialog.value?.close();archivePending.value=null}
function confirmArchive(){const pending=archivePending.value;archiveDialog.value?.close();archivePending.value=null;if(pending)void archiveArticle(pending.row,pending.restore)}
const imported=computed(()=>key.value.startsWith('news.'));
const dirty=computed(()=>editing.value&&!!original.value&&JSON.stringify(payload.value)!==original.value);
const issues=ref<NewsIssue[]>([]);
const issueFor=(field:string)=>issues.value.find(i=>i.field===field&&(!i.language||i.language===language.value));
const issueText=(i:NewsIssue)=>i.field==='image'&&error.value==='imageAssociation'?t('newsAdmin.imageAssociation'):t('newsAdmin.fields.'+i.field,{language:i.language?.toUpperCase()||''});
async function focusIssue(){const i=issues.value[0];if(!i)return;if(i.language)language.value=i.language;await nextTick();document.getElementById('news-'+i.field)?.focus()}
const missing=ref<string[]>([]),bodyDraft=ref<Record<Lang,string>>({lv:'',ru:'',en:''});
let controller=new AbortController();
const allowed=(k:string)=>newsDocs.some(d=>d.key===k)||(k.startsWith('created.news.')&&createdKey.test(k));
type NewsField='title'|'body'|'introduction'|'category'|'author';
function text(field:NewsField,lang:Lang):string{
 if(!imported.value)return payload.value[field==='introduction'?'summary':field]?.[lang]||'';
 const p=payload.value[lang];
 if(field==='body')return bodyDraft.value[lang];
 if(field==='introduction')return p?.introduction??p?.paragraphs?.[0]??'';
 return p?.[field]||'';
}
function update(field:NewsField,value:string){
 if(imported.value){
  const p=payload.value[language.value];
  if(field==='body'||field==='introduction'){
   if(p.introduction===undefined){p.introduction=p.paragraphs[0]||'';p.paragraphs=p.paragraphs.slice(1)}
   if(field==='body'){bodyDraft.value[language.value]=value;p.paragraphs=value.split(/\n\s*\n/).filter(p=>p.trim())}else p.introduction=value;
  }else p[field]=value;
 }else {const name=field==='introduction'?'summary':field;payload.value[name]??={lv:'',ru:'',en:''};payload.value[name][language.value]=value}
}
const image=computed(()=>imported.value?payload.value.lv?.image||'':payload.value.image||'');
const date=computed({get:()=>imported.value?payload.value.lv?.date||'':payload.value.date,set:(v:string)=>{if(imported.value)for(const l of langs)payload.value[l].date=v;else payload.value.date=v}});
function imageRef(value:string){return mediaID(value)?value:(media as Record<string,string>)[value]||value}
function select(asset:any){const value=asset.origin==='upload'?'cms-media:'+asset.id:asset.url;if(imported.value)for(const l of langs)payload.value[l].image=value;else payload.value.image=value;closePicker()}
function closePicker(){picker.value?.close();picking.value=false}
async function load(){newsTrace('list.load');controller.abort();controller=new AbortController();const own=controller;busy.value=true;error.value='';try{
 if(editing.value&&key.value){if(!allowed(key.value))throw Error('invalid');const r=await cmsRequest('/'+key.value,own.signal);if(own.signal.aborted)return;const draft=r.revisions.find((v:any)=>v.id===r.document.draft_revision);if(!draft)throw Error('invalid');documentRow.value=r.document;history.value=r.revisions;payload.value=structuredClone(draft.payload);if(imported.value)for(const l of langs)bodyDraft.value[l]=(payload.value[l].introduction===undefined?payload.value[l].paragraphs.slice(1):payload.value[l].paragraphs).join('\n\n')}
 else if(editing.value){documentRow.value=null;history.value=[];payload.value=emptyCreated();intent.value=''}
 else {rows.value=[];const r=await cmsRequest(archived.value?'/archived-news':'',own.signal);if(own.signal.aborted)return;rows.value=r.documents.filter((d:any)=>allowed(d.key)).sort((a:any,b:any)=>(b.date||'').localeCompare(a.date||''))}
 original.value=JSON.stringify(payload.value);loadedPath=route.fullPath;
 }catch(e){if(!own.signal.aborted)error.value=(e as Error).message}finally{if(!own.signal.aborted)busy.value=false}}
async function publish(){if(busy.value)return;issues.value=newsIssues(text,date.value,image.value,imported.value);if(issues.value.length){error.value='incomplete';await focusIssue();return}

 if(!imported.value){if(!key.value)payload.value.slug=suggestSlug(payload.value.title.lv);for(const l of langs){if(!payload.value.seo_title[l])payload.value.seo_title[l]=payload.value.title[l];if(!payload.value.seo_description[l])payload.value.seo_description[l]=newsExcerpt(payload.value.summary[l]||payload.value.body[l])}}
 if(!intent.value)intent.value='created.news.'+crypto.randomUUID();busy.value=true;error.value='';try{await cmsRequest('/'+(key.value||intent.value)+'/save-publish',controller.signal,{expected_version:documentRow.value?.version||0,payload:payload.value},'POST');original.value=JSON.stringify(payload.value);notice.value=t('newsAdmin.done');await refreshPublished(true);await router.push('/admin/news')}catch(e){error.value=(e as Error).message;const issue=newsServerIssue((e as Error&{field?:string}).field||'');if(issue)issues.value=[issue]}finally{busy.value=false;await focusIssue()}}
async function unpublish(row:any){if(busy.value||!window.confirm(t('newsAdmin.confirm')))return;busy.value=true;error.value='';try{await cmsRequest('/'+row.key+'/unpublish',controller.signal,{expected_version:row.version,revision_id:row.draft_revision},'POST');await refreshPublished(true);await load()}catch(e){error.value=(e as Error).message}finally{busy.value=false}}
async function archiveArticle(row:any,restore=false){
 if(busy.value){newsTrace('click.busy');return}
 newsTrace('confirmation',{confirmed:true,verified:auth.verifiedAdmin,aborted:controller.signal.aborted});
 busy.value=true;error.value='';
 try{newsTrace('archive.enter');await cmsRequest('/'+row.key+(restore?'/restore-archive':'/archive'),controller.signal,{expected_version:row.version},'POST');newsTrace('archive.success');rows.value=rows.value.filter((item:any)=>item.key!==row.key);newsTrace('list.removed');await refreshPublished(true);newsTrace('public.refreshed');if(editing.value)await router.push('/admin/news');else await load();newsTrace('list.refreshed')}
 catch(e){newsTrace('archive.error',{aborted:controller.signal.aborted,verified:auth.verifiedAdmin});error.value=(e as Error).message}
 finally{busy.value=false;newsTrace('archive.finished')}
}
async function restore(revision:string){if(busy.value||dirty.value||!window.confirm(t('created.confirm')))return;busy.value=true;error.value='';try{await cmsRequest('/'+key.value+'/rollback',controller.signal,{expected_version:documentRow.value.version,revision_id:revision},'POST');await refreshPublished(true);await load()}catch(e){error.value=(e as Error).message}finally{busy.value=false}}
function leave(){return !dirty.value||window.confirm(t('newsAdmin.discard'))}
function unload(e:BeforeUnloadEvent){if(dirty.value){e.preventDefault();e.returnValue=''}}
onBeforeRouteLeave(leave);onBeforeRouteUpdate(leave);window.addEventListener('beforeunload',unload);
let loadedPath='';
watch(()=>[route.fullPath,auth.verifiedAdmin],()=>{
 newsTrace('authority.watch',{verified:auth.verifiedAdmin});
 // Gate retains only the same user's in-memory editor during transient checks.
 // Reverification is not an instruction to replace a local draft or image picker.
 if(auth.verifiedAdmin&&loadedPath!==route.fullPath){void load()}
},{immediate:true});
onBeforeUnmount(()=>{newsTrace('component.unmount');controller.abort();window.removeEventListener('beforeunload',unload)});
const message=computed(()=>issues.value.length?issueText(issues.value[0]):t('newsAdmin.'+(['incomplete','conflict','invalid','unauthorized','archiveUnavailable','publicationRejected','imageAssociation','articleSaveFailed'].includes(error.value)?error.value:'unavailable'),{languages:missing.value.map(l=>l.toUpperCase()).join(', ')}));
</script>
<template><section class="news-admin"><AdminPageHeader :title="t(editing?(key?'newsAdmin.edit':'newsAdmin.add'):(archived?'newsAdmin.archivedItems':'newsAdmin.title'))"><template #actions><RouterLink v-if="!editing" class="button" to="/admin/news/new">{{t('newsAdmin.add')}}</RouterLink></template></AdminPageHeader>
<p v-if="notice&&!editing" role="status">{{notice}}</p><p v-if="busy" role="status">{{t('newsAdmin.loading')}}</p><div v-if="error" role="alert">{{message}} <button v-if="!editing" @click="load">{{t('newsAdmin.retry')}}</button></div>
<template v-if="!editing"><RouterLink :to="archived?'/admin/news':'/admin/news?archived=1'">{{t(archived?'newsAdmin.back':'newsAdmin.archivedItems')}}</RouterLink><p v-if="!busy&&!error&&!rows.length">{{t('newsAdmin.empty')}}</p><div class="news-grid"><article v-for="row in rows" :key="row.key" class="news-card"><AdminMediaPreview v-if="row.image" :reference="imageRef(row.image)"/><h2>{{row.title?.[locale]||row.title?.lv}}</h2><time :datetime="row.date">{{row.date}}</time><p>{{t(row.published_revision?'newsAdmin.published':'newsAdmin.unpublished')}}</p><div class="actions"><RouterLink v-if="!archived" :to="'/admin/news/edit/'+row.key">{{t('newsAdmin.edit')}}</RouterLink><button v-if="!archived&&row.published_revision" :disabled="busy" @click="unpublish(row)">{{t('newsAdmin.unpublish')}}</button><button v-if="!archived" :disabled="busy" @click="askArchive(row)">{{t('newsAdmin.remove')}}</button><button v-else :disabled="busy" @click="askArchive(row,true)">{{t('newsAdmin.restore')}}</button></div></article></div></template>
<template v-else><RouterLink to="/admin/news">{{t('newsAdmin.back')}}</RouterLink><p v-if="documentRow?.archived">{{t('newsAdmin.archivedItems')}} <button :disabled="busy" @click="askArchive(documentRow,true)">{{t('newsAdmin.restore')}}</button></p><form v-if="!key||documentRow&&!documentRow.archived" novalidate @submit.prevent="publish"><fieldset :disabled="busy"><p>{{t('newsAdmin.required')}}</p><div class="publish-bar"><button class="button" type="submit">{{t('newsAdmin.publish')}}</button><RouterLink v-if="documentRow?.published_revision" :to="'/jaunumi/'+(imported?payload.lv.slug:payload.slug)" target="_blank">{{t('newsAdmin.view')}}</RouterLink></div><label>{{t('newsAdmin.language')}}<select v-model="language"><option v-for="l in langs" :key="l" :value="l">{{l.toUpperCase()}}</option></select></label><label>{{t('newsAdmin.name')}}<span aria-hidden="true"> *</span><input id="news-title" :aria-invalid="!!issueFor('title')" :aria-describedby="issueFor('title')?'news-title-error':undefined" :aria-label="t('newsAdmin.name')" :value="text('title',language)" @input="update('title',($event.target as HTMLInputElement).value)" maxlength="200" required/></label><p v-if="issueFor('title')" id="news-title-error" class="field-error">{{issueText(issueFor('title')!)}}</p><label>{{t('newsAdmin.introduction')}}<textarea id="news-introduction" :aria-invalid="!!issueFor('introduction')" :aria-describedby="issueFor('introduction')?'news-introduction-error':undefined" :aria-label="t('newsAdmin.introduction')" :value="text('introduction',language)" @input="update('introduction',($event.target as HTMLTextAreaElement).value)" rows="3" maxlength="1000"/></label><p v-if="issueFor('introduction')" id="news-introduction-error" class="field-error">{{issueText(issueFor('introduction')!)}}</p><label>{{t('newsAdmin.image')}}<span aria-hidden="true"> *</span><button id="news-image" :aria-invalid="!!issueFor('image')" :aria-describedby="issueFor('image')?'news-image-error':undefined" :aria-label="t('newsAdmin.image')" type="button" @click="picking=true;picker?.showModal()"><AdminMediaPreview v-if="image" :reference="imageRef(image)"/><span>{{t('newsAdmin.image')}}</span></button></label><p v-if="issueFor('image')" id="news-image-error" class="field-error">{{issueText(issueFor('image')!)}}</p><label>{{t('newsAdmin.date')}}<span aria-hidden="true"> *</span><input id="news-date" :aria-invalid="!!issueFor('date')" :aria-describedby="issueFor('date')?'news-date-error':undefined" :aria-label="t('newsAdmin.date')" v-model="date" type="date" required/></label><p v-if="issueFor('date')" id="news-date-error" class="field-error">{{issueText(issueFor('date')!)}}</p><label>{{t('newsAdmin.body')}}<span aria-hidden="true"> *</span><textarea id="news-body" :aria-invalid="!!issueFor('body')" :aria-describedby="issueFor('body')?'news-body-error':undefined" :aria-label="t('newsAdmin.body')" :value="text('body',language)" @input="update('body',($event.target as HTMLTextAreaElement).value)" rows="8" maxlength="20000" :required="!imported"/></label><p v-if="issueFor('body')" id="news-body-error" class="field-error">{{issueText(issueFor('body')!)}}</p><div class="optional-metadata"><label>{{t('newsAdmin.category')}}<input id="news-category" :aria-invalid="!!issueFor('category')" :aria-describedby="issueFor('category')?'news-category-error':undefined" :aria-label="t('newsAdmin.category')" :value="text('category',language)" @input="update('category',($event.target as HTMLInputElement).value)" maxlength="200"/></label><p v-if="issueFor('category')" id="news-category-error" class="field-error">{{issueText(issueFor('category')!)}}</p><label>{{t('newsAdmin.author')}}<input id="news-author" :aria-invalid="!!issueFor('author')" :aria-describedby="issueFor('author')?'news-author-error':undefined" :aria-label="t('newsAdmin.author')" :value="text('author',language)" @input="update('author',($event.target as HTMLInputElement).value)" maxlength="200"/></label><p v-if="issueFor('author')" id="news-author-error" class="field-error">{{issueText(issueFor('author')!)}}</p></div></fieldset></form><details v-if="!documentRow?.archived&&history.some(r=>r.published_at)"><summary>{{t('newsAdmin.history')}}</summary><div v-for="r in history.filter(r=>r.published_at)" :key="r.id"><time>{{new Date(r.created_at).toLocaleString(locale)}}</time> <button :disabled="busy||dirty||r.id===documentRow?.published_revision" @click="restore(r.id)">{{t('newsAdmin.restore')}}</button></div></details></template>
<dialog ref="archiveDialog" class="archive-confirm" @keydown="trapDialogFocus" @cancel.prevent="cancelArchive" :aria-label="t(archivePending?.restore?'newsAdmin.confirmRestore':'newsAdmin.confirmDelete')"><p>{{t(archivePending?.restore?'newsAdmin.confirmRestore':'newsAdmin.confirmDelete')}}</p><div class="actions"><button type="button" autofocus @click="cancelArchive">{{t('newsAdmin.cancel')}}</button><button type="button" :disabled="busy" @click="confirmArchive">{{t(archivePending?.restore?'newsAdmin.restore':'newsAdmin.remove')}}</button></div></dialog>
<dialog ref="picker" @keydown="trapDialogFocus" @cancel.prevent="closePicker" :aria-label="t('newsAdmin.image')"><MediaLibrary v-if="picking" picker @select="select" @close="closePicker"/></dialog></section></template>
<style scoped>
.field-error{color:#8b3429;font-size:14px;margin:4px 0 16px}[aria-invalid=true]{border-color:#8b3429}.optional-metadata{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr));gap:0 20px}.archive-confirm{max-width:440px}.news-admin{max-width:1100px}.news-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,270px),1fr));gap:24px;margin-top:24px}.news-card{min-width:0;padding-bottom:20px;border-bottom:1px solid var(--line)}.news-card h2{font:400 26px/1.2 var(--serif);margin:16px 0;overflow-wrap:anywhere}.news-card :deep(img){width:100%;height:150px;max-width:none;object-fit:cover}.news-card p,.news-card time{font-size:14px}.actions{display:flex;gap:16px;flex-wrap:wrap}button,a{min-height:44px}button{font:inherit;color:inherit;background:transparent;border:1px solid var(--line);padding:10px 14px;cursor:pointer}a{display:inline-flex;align-items:center}form{max-width:760px;margin-top:20px}fieldset{border:0;min-width:0;padding:0}label{display:block;margin:16px 0}label>button{display:block;margin-top:8px}input,textarea,select{display:block;width:100%;min-height:44px;padding:10px;font:inherit;color:var(--ink);background:var(--white);border:1px solid var(--line)}textarea{resize:vertical}select{max-width:180px}.publish-bar{position:sticky;top:0;z-index:1;background:var(--paper);padding:16px 0;display:flex;gap:20px;align-items:center;border-top:1px solid var(--line)}.button{background:var(--olive);color:var(--white);padding:12px 20px}details{margin-top:24px}summary{cursor:pointer;min-height:44px}dialog{width:min(1000px,95vw);max-height:90dvh;margin:auto;padding:16px;border:1px solid var(--line);background:var(--paper)}[role=alert]{color:#8b3429;margin:16px 0}button:disabled{opacity:.5;cursor:default}:focus-visible{outline:2px solid var(--olive);outline-offset:3px}@media(max-width:500px){.news-grid{gap:16px}.publish-bar .button{flex:1;justify-content:center}}
</style>
