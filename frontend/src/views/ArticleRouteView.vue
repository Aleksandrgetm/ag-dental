<script setup lang="ts">
import {computed} from 'vue';
import {useRoute} from 'vue-router';
import {articles} from '../services/cms/content';
import ArticleView from './ArticleView.vue';
import CreatedContentView from './CreatedContentView.vue';
const route=useRoute(),existing=computed(()=>articles.some(a=>a.slug===route.params.slug));
</script>
<template><ArticleView v-if="existing"/><CreatedContentView v-else/></template>
