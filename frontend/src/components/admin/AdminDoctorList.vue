<script setup lang="ts">
import {clinicDate} from '../../services/booking/calendar';
import {onBeforeUnmount,ref,watch} from 'vue';import {useI18n} from 'vue-i18n';import {operationRequest} from '../../services/admin/operations';
import {useAuthStore} from '../../stores/auth';
const auth=useAuthStore();let loaded=false;
const {t}=useI18n(),rows=ref<any[]>([]),services=ref<any[]>([]),privacy=ref(false),error=ref(false),busy=ref(true);const controller=new AbortController();
async function load(){busy.value=true;error.value=false;try{const [r,o]=await Promise.all([operationRequest('/operations/doctors',controller.signal),operationRequest('/operations/doctors/options',controller.signal)]);rows.value=r.items;services.value=o.services||[];privacy.value=o.privacy_ready===true;loaded=true}catch{error.value=true}finally{busy.value=false}}watch(()=>auth.verifiedAdmin,value=>{if(value&&!loaded)void load()},{immediate:true});onBeforeUnmount(()=>controller.abort());
function status(d:any){if(!d.active)return !d.service_ids?.length&&!d.hours?.length?'draft':'inactive';if(!services.value.some(s=>d.service_ids?.includes(s.id)&&s.active&&s.booking_enabled&&s.duration_minutes))return 'needsServices';if(!d.hours?.some((h:any)=>!h.effective_until||h.effective_until.slice(0,10)>=clinicDate()))return 'needsHours';return d.booking_enabled&&privacy.value?'ready':'draft'}
</script>
<template><section><h2>{{t('simple.bookingSetup')}}</h2><p v-if="busy" role="status">{{t('operations.loading')}}</p><p v-else-if="error" role="alert">{{t('operations.unavailable')}} <button @click="load">{{t('operations.refresh')}}</button></p><p v-else-if="!rows.length">{{t('operations.empty')}} <RouterLink to="/admin/doctors/new">{{t('simple.addDoctor')}}</RouterLink></p><ul><li v-for="row in rows" :key="row.id"><RouterLink :to="'/admin/doctors/manage/'+row.id">{{row.data.name}}</RouterLink> · {{t('simple.'+status(row.data))}}</li></ul></section></template>
<style scoped>h2{font-size:1.5rem;margin-bottom:12px}section{margin:24px 0}a{text-decoration:underline;text-underline-offset:3px}li{padding:12px 0}button{font:inherit;min-height:44px}</style>
