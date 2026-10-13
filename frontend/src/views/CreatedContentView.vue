<script setup lang="ts">
import { publicMedia as media, publicImageAlt as cmsMediaAlt } from "../services/hero/publicMedia";
import {computed,onMounted,ref,watchEffect} from 'vue';
import {useRoute} from 'vue-router';
import {useContent} from '../content/useContent';
import {createdContent,refreshPublished,cmsMediaSrcset} from '../services/cms/content';
import NotFoundView from './NotFoundView.vue';
import ContactBand from '../components/ContactBand.vue';
const route=useRoute(),{locale,t,date}=useContent(),loaded=ref(false);
const kind=computed(()=>route.path.startsWith('/jaunumi/')?'news':route.path.startsWith('/jautajumi/')?'faq':'page');
const row=computed(()=>createdContent.value.find(r=>r.key.startsWith('created.'+kind.value+'.')&&r.payload.slug===route.params.slug));
const value=computed(()=>row.value?.payload),image=computed(()=>value.value?.image?(media as Record<string,string>)[value.value.image]:undefined);
onMounted(async()=>{await refreshPublished();loaded.value=true});
watchEffect(()=>{if(value.value){document.title=value.value.seo_title[locale.value as 'lv'|'ru'|'en'];const description=document.querySelector('meta[name=description]');description?.setAttribute('content',value.value.seo_description[locale.value as 'lv'|'ru'|'en'])}});
</script>
<template><article v-if="value" class="container created-public" :lang="locale"><header class="page-head"><RouterLink v-if="kind==='news'" to="/jaunumi" class="eyebrow">{{t('nav.news')}}</RouterLink><time v-if="kind==='news'" :datetime="value.date">{{date(value.date)}}</time><h1>{{value.title[locale as 'lv'|'ru'|'en']}}</h1><p>{{value.summary[locale as 'lv'|'ru'|'en']}}</p></header><img v-if="image" :src="image" :srcset="cmsMediaSrcset(image)" sizes="(max-width: 768px) 100vw, 800px" :alt="cmsMediaAlt(image,locale,value.title[locale as 'lv'|'ru'|'en'])"/><div class="created-body"><p v-for="(paragraph,index) in value.body[locale as 'lv'|'ru'|'en'].split('\n\n')" :key="index">{{paragraph}}</p></div></article><NotFoundView v-else-if="loaded"/><ContactBand v-if="value"/></template>
<style scoped>.created-public{max-width:1000px}.created-public time{display:block;margin-top:20px}.created-public img{display:block;width:100%;max-height:600px;object-fit:cover}.created-body{max-width:760px;margin:48px auto 80px;line-height:1.8}.created-body p{margin:24px 0;white-space:pre-line;overflow-wrap:anywhere}</style>
