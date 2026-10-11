<script setup lang="ts">
import {clinicDate} from '../../services/booking/calendar';
import {computed,ref,watch,onBeforeUnmount} from 'vue';
import {useI18n} from 'vue-i18n';
import {useAuthStore} from '../../stores/auth';
import {operationRequest} from '../../services/admin/operations';
import {cmsRequest} from '../../services/cms/admin';
import {findDoc} from '../../services/cms/catalog';
import {unifiedDoctors,editorialDoctorKey} from '../../services/admin/doctors';
import AdminPageHeader from '../../components/admin/AdminPageHeader.vue';
import AdminMediaPreview from '../../components/admin/AdminMediaPreview.vue';
const {t,locale}=useI18n(),auth=useAuthStore(),search=ref(''),rows=ref<any[]>([]),editorial=ref<any>(null),error=ref(false),busy=ref(true);
const options=ref<any>({});
const c=new AbortController();let loaded=false;
async function load(){busy.value=true;error.value=false;try{const [operations,docs,media,config]=await Promise.all([operationRequest('/operations/doctors',c.signal),cmsRequest('',c.signal),cmsRequest('/clinic.media',c.signal),operationRequest('/operations/doctors/options',c.signal)]);options.value=config;rows.value=operations.items;const d=docs.documents.find((d:any)=>d.key===editorialDoctorKey);const rev=media.revisions.find((r:any)=>r.id===media.document.published_revision);editorial.value=d?{...d,title:findDoc(editorialDoctorKey)!.title,portrait:rev?.payload.doctor}:null;loaded=true}catch{error.value=true}finally{busy.value=false}}
watch(()=>auth.verifiedAdmin,v=>{if(v&&!loaded)void load()},{immediate:true});onBeforeUnmount(()=>c.abort());
const cards=computed(()=>unifiedDoctors(rows.value,editorial.value).filter(c=>name(c).toLocaleLowerCase().includes(search.value.toLocaleLowerCase())));
function ready(card:any){const d=card.row?.data;if(!d?.active||!d.booking_enabled||!options.value.privacy_ready)return false;return (options.value.services||[]).some((s:any)=>d.service_ids?.includes(s.id)&&s.active&&s.booking_enabled&&s.duration_minutes>0&&d.hours?.some((h:any)=>{const minutes=(v:string)=>Number(v.slice(0,2))*60+Number(v.slice(3,5));return (!h.effective_until||h.effective_until.slice(0,10)>=clinicDate())&&minutes(h.end_time)-minutes(h.start_time)>=s.duration_minutes}))}
function name(c:any){return c.row?.data.name||c.editorial.title[locale.value]}
function destination(c:any){return c.row?'/admin/doctors/manage/'+c.id:'/admin/doctors/profile/'+editorialDoctorKey}
</script>
<template><section><AdminPageHeader :title="t('admin.nav.doctors')" ><template #actions><RouterLink class="primary" to="/admin/doctors/new">{{t('simple.addDoctor')}}</RouterLink></template></AdminPageHeader>
<label>{{t('doctors.search')}}<input v-model="search" type="search"/></label><p v-if="busy" role="status">{{t('operations.loading')}}</p><p v-if="error" role="alert">{{t('operations.unavailable')}} <button @click="load">{{t('operations.refresh')}}</button></p>
<p v-if="!busy&&!error&&!cards.length">{{t(search?'cms.noResults':'doctors.empty')}} <RouterLink v-if="!search" to="/admin/doctors/new">{{t('doctors.first')}}</RouterLink></p>
<div class="doctors"><article v-for="card in cards" :key="card.id" class="doctor-card"><AdminMediaPreview v-if="card.row?.data.portrait_id||card.editorial?.portrait" :reference="card.editorial?.portrait||card.row?.data.portrait_id"/><h2><RouterLink :to="destination(card)">{{name(card)}}</RouterLink></h2><p>{{t('doctors.booking')}}: {{t(ready(card)?'simple.ready':'simple.inactive')}}</p><p v-if="!card.row">{{t('doctors.notConfigured')}}</p><template v-else><p v-if="!card.row.data.service_ids?.length">{{t('simple.needsServices')}}</p><p v-if="!card.row.data.hours?.length">{{t('simple.needsHours')}}</p></template><RouterLink :to="destination(card)">{{t('cms.edit')}}</RouterLink></article></div></section></template>
<style scoped>label{display:block}input{display:block;width:100%;padding:12px;border:1px solid var(--line);font:inherit;background:transparent}.doctors{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr));gap:24px;margin-top:24px}.doctor-card{border:1px solid var(--line);padding:24px}.doctor-card h2{font-size:1.8rem;margin:20px 0}.doctor-card p{margin:12px 0}.doctor-card a{display:inline-block;min-height:44px;padding:12px 16px 12px 0;text-decoration:underline}button,.primary{min-height:44px;padding:12px 20px;font:inherit}.primary{background:var(--ink);color:var(--paper);display:inline-block}a:focus-visible,input:focus-visible,button:focus-visible{outline:2px solid var(--ink);outline-offset:3px}</style>
