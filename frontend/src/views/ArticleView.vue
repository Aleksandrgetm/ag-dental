<script setup lang="ts">
import {computed,ref,onMounted} from 'vue';
import {useRoute} from 'vue-router';
import {articles,localizeArticle,createdContent,refreshPublished,media,cmsMediaAlt,cmsMediaSrcset,cmsLiteral} from '../services/cms/content';
import {importedArticle,createdArticle,type ArticleLocale} from '../services/cms/article';
import {cmsMediaDimensions} from '../services/cms/publishedMedia';
import {useContent} from '../content/useContent';
import ArticleProgress from '../components/common/ArticleProgress.vue';
import ContactBand from '../components/ContactBand.vue';
import NotFoundView from './NotFoundView.vue';
const route=useRoute(),{t,date,locale}=useContent(),reading=ref<HTMLElement>(),loaded=ref(false);
const articleIndex=computed(()=>articles.findIndex(a=>a.slug===route.params.slug));
const article=computed(()=>{
 const legacy=articles[articleIndex.value];
 if(legacy)return importedArticle(localizeArticle(legacy,locale.value));
 const created=createdContent.value.find(r=>r.key.startsWith('created.news.')&&r.payload.slug===route.params.slug);
 return created?createdArticle(created.payload,locale.value as ArticleLocale):undefined;
});
const image=computed(()=>article.value?(media as Record<string,string>)[article.value.image]:undefined);
const dimensions=computed(()=>cmsMediaDimensions(image.value||''));
const portrait=computed(()=>article.value?.image==='doctor');
onMounted(async()=>{await refreshPublished();loaded.value=true});
</script>
<template>
 <template v-if="article">
  <article class="article-editorial" :lang="locale">
   <div class="container article-shell">
    <div class="article-masthead">
     <RouterLink class="eyebrow breadcrumb" to="/jaunumi">← {{t('nav.news')}}</RouterLink>
     <div class="article-meta"><time :datetime="article.date">{{date(article.date)}}</time><span v-if="article.category">{{article.category}}</span></div>
    </div>
    <div ref="reading" class="article-reading">
     <header class="article-head" :class="{'without-lead':!article.introduction}">
      <h1 data-reveal>{{article.title}}</h1><p v-if="article.introduction" class="article-lead">{{article.introduction}}</p>
     </header>
     <figure v-if="image" class="article-photograph" :class="{portrait}">
      <div class="article-image-frame" data-reveal="image"><img :src="image" :srcset="cmsMediaSrcset(image)" sizes="(max-width: 700px) 100vw, 60vw" :alt="cmsMediaAlt(image,locale,article.caption||article.title)" :width="dimensions.width||(portrait?840:undefined)" :height="dimensions.height||(portrait?1120:undefined)" decoding="async" fetchpriority="high"/></div>
      <figcaption v-if="article.caption">{{article.caption}}</figcaption>
     </figure>
     <div class="article-reading-grid" :class="{'is-brief':!article.body.length&&!article.quote}">
      <aside class="article-margin">
       <p class="eyebrow"><template v-if="articleIndex>=0">{{String(articleIndex+1).padStart(2,'0')}} / </template>{{t('nav.news')}}</p>
       <p v-if="article.category" class="article-margin-category">{{article.category}}</p>
       <p v-if="article.author&&!image" class="article-margin-category">{{article.author}}</p>
       <a v-if="article.source" class="text-link article-source" :href="`https://www.zobarstnieciba-ag.lv/jaunumi/params/post/${article.source}`" target="_blank" rel="noopener noreferrer">{{t('ui.source')}}</a>
      </aside>
      <div v-if="article.body.length" class="article-prose"><p v-for="(paragraph,index) in article.body" :key="index">{{paragraph}}</p></div>
      <blockquote v-if="article.quote" class="article-pull-quote"><p>{{article.quote}}</p><cite>{{cmsLiteral('literal.cf6ad05d.0')}}</cite></blockquote>
     </div>
    </div>
   </div>
   <ArticleProgress v-if="reading" :target="reading"/>
  </article>
  <ContactBand/>
 </template>
 <NotFoundView v-else-if="loaded"/>
</template>

<style scoped>
.article-shell {
  padding-top: clamp(140px, 11vw, 176px);
}
.article-masthead .breadcrumb {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  margin-bottom: 28px;
}
.article-editorial .article-meta {
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px 36px;
  margin-bottom: 32px;
  font-size: 11px;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: var(--editorial-caption);
}
.article-head.without-lead { grid-template-columns: minmax(0, 1fr); }
.article-head {
  display: grid;
  grid-template-columns: minmax(0, 1.65fr) minmax(0, 1fr);
  align-items: end;
  gap: clamp(32px, 6vw, 88px);
  padding-bottom: 44px;
  border-bottom: 1px solid var(--editorial-rule);
}
.article-editorial .article-head h1 {
  font-size: clamp(48px, 5.8vw, 88px);
  line-height: 1.02;
  letter-spacing: -0.035em;
  max-width: 20ch;
  text-wrap: balance;
  overflow-wrap: break-word;
}
.article-editorial .article-lead {
  font: 400 clamp(20px, 1.75vw, 24px)/1.55 var(--serif);
  max-width: 37ch;
  padding-bottom: 5px;
}
.article-photograph {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 2.5fr) minmax(0, 1fr);
  gap: clamp(24px, 4vw, 56px);
  align-items: end;
  margin: 32px 0 44px;
}
.article-image-frame {
  grid-column: 2;
  grid-row: 1;
  overflow: hidden;
  background: var(--sand);
}
.article-photograph img {
  width: 100%;
  height: auto;
  object-fit: contain;
  object-position: center 62%;
}
.article-photograph.portrait .article-image-frame {
  width: min(100%, 840px);
  justify-self: end;
}
.article-photograph.portrait img {
  object-position: center 60%;
}
.article-photograph figcaption {
  grid-column: 1;
  grid-row: 1;
  padding-top: 15px;
  border-top: 1px solid var(--editorial-rule);
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  line-height: 1.7;
  color: var(--editorial-caption);
}
.article-reading-grid {
  display: grid;
  grid-template-columns: minmax(140px, 1fr) minmax(0, 720px) minmax(0, 0.4fr);
  column-gap: clamp(28px, 4vw, 56px);
  align-items: start;
  padding: 40px 0 56px;
  border-top: 1px solid var(--editorial-rule);
}
.article-margin {
  grid-column: 1;
  grid-row: 1;
  min-width: 0;
}
.article-margin .eyebrow {
  margin-bottom: 15px;
}
.article-margin-category {
  color: var(--editorial-caption);
  font-size: 12px;
  line-height: 1.65;
  max-width: 22ch;
}
.article-margin .article-source {
  margin-top: 30px;
  font-size: 11px;
}
.article-prose {
  grid-column: 2;
  min-width: 0;
}
.article-prose p {
  white-space: pre-line;
  overflow-wrap: anywhere;
  font-size: 18px;
  line-height: 1.85;
}
.article-prose p:first-child {
  font-size: 21px;
  line-height: 1.7;
}
.article-prose p + p {
  margin-top: 28px;
}
.article-pull-quote {
  grid-column: 2 / 4;
  justify-self: end;
  width: min(100%, 550px);
  margin: 46px 0 0;
  padding: 28px 0 0 36px;
  border-top: 1px solid var(--editorial-rule);
}
.article-pull-quote p {
  font: 400 clamp(30px, 3vw, 44px)/1.18 var(--serif);
  letter-spacing: -0.02em;
}
.article-pull-quote cite {
  display: block;
  margin-top: 22px;
  font: normal 10px/1.6 var(--sans);
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--editorial-caption);
}
.article-reading-grid.is-brief {
  display: block;
  padding-block: 24px 36px;
}
.is-brief .article-margin {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px 28px;
}
.is-brief .article-margin .eyebrow,
.is-brief .article-margin .article-source,
.is-brief .article-margin-category {
  margin: 0;
}
.is-brief .article-margin .article-source {
  margin-left: auto;
}
@media (max-width: 1100px) {
  .article-head {
    grid-template-columns: minmax(0, 1fr);
    gap: 28px;
  }
  .article-editorial .article-head h1 {
    max-width: 24ch;
    font-size: clamp(46px, 7vw, 72px);
  }
  .article-editorial .article-lead {
    max-width: 46ch;
    margin-left: 20%;
  }
  .article-photograph {
    grid-template-columns: minmax(0, 1fr) minmax(0, 4fr);
    margin-bottom: 40px;
  }
  .article-reading-grid {
    grid-template-columns: 140px minmax(0, 1fr);
    column-gap: 32px;
  }
  .article-pull-quote {
    grid-column: 2;
    padding-left: 24px;
  }
  .article-prose p {
    font-size: 17px;
  }
  .article-prose p:first-child {
    font-size: 20px;
  }
}
@media (max-width: 700px) {
  .article-shell {
    padding-top: 114px;
  }
  .article-masthead .breadcrumb {
    margin-bottom: 20px;
  }
  .article-editorial .article-meta {
    font-size: 10px;
    letter-spacing: 0.05em;
    margin-bottom: 25px;
  }
  .article-head {
    gap: 25px;
    padding-bottom: 28px;
  }
  .article-editorial .article-head h1 {
    font-size: clamp(38px, 9vw, 60px);
    max-width: none;
    line-height: 1.05;
  }
  .article-editorial .article-lead {
    margin: 0;
    padding: 0;
    font-size: 21px;
  }
  .article-photograph {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
    margin: 28px 0 30px;
  }
  .article-photograph figcaption {
    padding: 0;
    border: 0;
    font-size: 9px;
  }
  .article-reading-grid {
    display: block;
    padding: 26px 0 34px;
  }
  .article-margin {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 10px 20px;
    margin-bottom: 30px;
  }
  .article-margin .eyebrow,
  .article-margin .article-source {
    margin: 0;
  }
  .article-margin-category {
    display: none;
  }
  .article-prose p {
    font-size: 16px;
    line-height: 1.85;
  }
  .article-prose p:first-child {
    font-size: 19px;
    line-height: 1.65;
  }
  .article-prose p + p {
    margin-top: 24px;
  }
  .article-pull-quote {
    width: 100%;
    margin-top: 32px;
    padding: 24px 0 0 22px;
  }
  .article-reading-grid.is-brief {
    padding-block: 22px;
  }
  .is-brief .article-margin {
    margin: 0;
  }
}
</style>
