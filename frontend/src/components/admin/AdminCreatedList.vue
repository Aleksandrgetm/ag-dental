<script setup lang="ts">
import {onBeforeUnmount,ref,watch} from 'vue';import {useI18n} from 'vue-i18n';import {cmsRequest} from '../../services/cms/admin';
import {useAuthStore} from '../../stores/auth';
const auth=useAuthStore();let loaded=false;
const props=defineProps<{kind:'news'|'page'|'faq'}>();const {t,locale}=useI18n(),rows=ref<any[]>([]),failed=ref(false);const controller=new AbortController();
function load(){void cmsRequest('',controller.signal).then(r=>{loaded=true;rows.value=r.documents.filter((d:any)=>d.key.startsWith('created.'+props.kind+'.'))}).catch(()=>{if(!controller.signal.aborted)failed.value=true})}watch(()=>auth.verifiedAdmin,value=>{if(value&&!loaded)load()},{immediate:true});onBeforeUnmount(()=>controller.abort());
const base=()=>props.kind==='news'?'/admin/news':props.kind==='faq'?'/admin/pages/faq':'/admin/pages';
</script>
<template><section v-if="rows.length || failed"><h2>{{t('created.'+kind)}}</h2><RouterLink :to="base()+'/new'">{{t('simple.'+(kind==='news'?'addNews':kind==='page'?'addPage':'addFAQ'))}}</RouterLink><p v-if="failed" role="alert">{{t('operations.unavailable')}}</p><ul><li v-for="row in rows" :key="row.key"><RouterLink :to="base()+'/edit/'+row.key">{{row.title?.[locale]||t('created.'+kind)}}</RouterLink> · {{t(row.published_revision?'created.published':'created.draft')}}</li></ul></section></template>
<style scoped>h2{font-size:1.5rem;margin-bottom:12px}section{margin:24px 0}a{text-decoration:underline;text-underline-offset:3px}li{padding:12px 0}</style>
