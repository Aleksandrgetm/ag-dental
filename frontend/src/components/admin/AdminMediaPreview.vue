<script setup lang="ts">
import {ref,watch} from 'vue';import {useI18n} from 'vue-i18n';import {mediaRequest,loadMediaPreview} from '../../services/cms/media';
import {mediaID} from '../../services/cms/mediaReference';
const props=defineProps<{reference:string}>(),{t,locale}=useI18n(),src=ref(''),alt=ref('');let serial=0;
watch(()=>props.reference,async value=>{const own=++serial;src.value='';if(!value)return;try{const r=await mediaRequest();const reference=mediaID(value)||value;const asset=r.assets.find((a:any)=>(a.id===reference||a.url===reference)&&!a.protected&&a.metadata.kind==='image');if(!asset)return;const url=asset.origin==='registered'?asset.url:await loadMediaPreview(asset,'thumb.webp');if(own===serial){src.value=url||'';alt.value=asset.metadata.alt?.[locale.value]||''}}catch{}},{immediate:true});
</script>
<template><img v-if="src" :src="src" :alt="alt"/><span v-else>{{t('created.image')}}</span></template>
<style scoped>img{display:block;max-width:240px;max-height:180px;object-fit:cover}</style>
