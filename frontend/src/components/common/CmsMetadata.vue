<script setup lang="ts">
import { publicMedia as media } from "../../services/hero/publicMedia";
import {watch,nextTick} from 'vue';
import {useRoute,useRouter} from 'vue-router';
import {useI18n} from 'vue-i18n';
import {cmsSEO,createdContent,services,serviceCatalog,clinic,articles,localizeArticle} from '../../services/cms/content';
import {canonicalURL,locales,publicPaths,resolveSEO,resolveServiceSEO,SITE_ORIGIN} from '../../services/seo';
import {createdPath} from '../../services/cms/created';
const route=useRoute(),router=useRouter(),{locale}=useI18n();
const privatePath=()=>/^\/(admin|login|register|forgot-password|reset-password|pieraksts)(\/|$)/.test(route.path);
watch(()=>route.query.lang,lang=>{if(locales.includes(lang as any)&&!privatePath())locale.value=String(lang)});
watch(locale,async lang=>{await router.isReady();if(privatePath())return;const query={...route.query};if(lang==='lv')delete query.lang;else query.lang=lang;if(route.query.lang!==query.lang)await router.replace({path:route.path,query,hash:route.hash})});
function meta(name:string,value:string,property=false){const attribute=property?'property':'name';let element=document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${name}"]`);if(!element){element=document.createElement('meta');element.setAttribute(attribute,name);document.head.append(element)}element.content=value}
watch(()=>[route.fullPath,locale.value,cmsSEO[route.path]?.[locale.value],createdContent.value],async()=>{
 await nextTick();const language=locale.value,entry=createdContent.value.find(r=>createdPath(r.key,r.payload.slug)===route.path);
 const service=services.find(s=>'/pakalpojumi/'+s.slug===route.path);
 const article=articles.find(a=>'/jaunumi/'+a.slug===route.path);
 const indexable=!privatePath()&&(publicPaths.includes(route.path)||!!entry||!!service)&&(!route.path.startsWith('/jaunumi/')||!!article||!!entry)&&(!serviceCatalog.value||!route.path.startsWith('/pakalpojumi/')||!!service)&&!('preview' in route.query);
 const content=service?resolveServiceSEO(route.path,language,serviceCatalog.value?.services.find(s=>s.slug===service.slug)||service,cmsSEO[route.path]?.[language]):entry?{title:entry.payload.seo_title[language as 'lv'],description:entry.payload.seo_description[language as 'lv']}:resolveSEO(route.path,language,cmsSEO[route.path]?.[language]);
 document.documentElement.lang=language;
 if(content){document.title=content.title;meta('description',content.description);meta('og:title',content.title,true);meta('og:description',content.description,true)}
 meta('robots',indexable?'index, follow':'noindex, nofollow');
 document.head.querySelectorAll('link[rel=canonical],link[rel=alternate][hreflang]').forEach(e=>e.remove());
 if(indexable){const canonical=document.createElement('link');canonical.rel='canonical';canonical.href=canonicalURL(route.path,language);document.head.append(canonical);for(const lang of [...locales,'x-default']){const link=document.createElement('link');link.rel='alternate';link.hreflang=lang;link.href=canonicalURL(route.path,lang==='x-default'?'lv':lang);document.head.append(link)}}
 meta('og:url',canonicalURL(route.path,language),true);meta('og:type',article||entry?.key.startsWith('created.news.')?'article':'website',true);
 meta('og:image',SITE_ORIGIN+media.room,true);
 document.getElementById('ag-structured-data')?.remove();
 if(indexable){const dentist={'@type':'Dentist','@id':SITE_ORIGIN+'/#clinic',name:'AG Zobārstniecība',url:SITE_ORIGIN+'/',telephone:clinic.phone,email:clinic.email,address:{'@type':'PostalAddress',streetAddress:'Ūnijas iela 25',addressLocality:'Rīga',postalCode:'LV-1039',addressCountry:'LV'},sameAs:[clinic.facebook,clinic.instagram]};const graph:any[]=[dentist,{'@type':'WebPage','@id':canonicalURL(route.path,language),url:canonicalURL(route.path,language),name:content?.title||document.title,inLanguage:language}];
 if(route.path!=='/')graph.push({'@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:'AG Zobārstniecība',item:canonicalURL('/',language)},{'@type':'ListItem',position:2,name:content?.title||document.title,item:canonicalURL(route.path,language)}]});
 if(article||entry?.key.startsWith('created.news.'))graph.push({'@type':'Article',headline:article?localizeArticle(article,language).title:entry!.payload.title[language as 'lv'],datePublished:article?.date||entry!.payload.date,inLanguage:language,mainEntityOfPage:canonicalURL(route.path,language),publisher:{'@id':SITE_ORIGIN+'/#clinic'}});
 const script=document.createElement('script');script.id='ag-structured-data';script.type='application/ld+json';script.textContent=JSON.stringify({'@context':'https://schema.org','@graph':graph});document.head.append(script)}
},{deep:true,immediate:true,flush:'post'});
</script>
<template></template>
