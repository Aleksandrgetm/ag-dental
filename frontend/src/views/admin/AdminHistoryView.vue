<script setup lang="ts">import {useI18n} from 'vue-i18n';import AdminPageHeader from '../../components/admin/AdminPageHeader.vue';const {t}=useI18n();</script>
<template><section><AdminPageHeader :title="t('simple.history')" :intro="t('simple.historyHelp')"/><ul><li v-for="section in ['pages','news','services','doctors','appointments']" :key="section"><RouterLink :to="'/admin/'+section">{{t('admin.nav.'+section)}}</RouterLink></li></ul></section></template>
<style scoped>a{display:inline-block;min-height:44px;padding:12px;text-decoration:underline}</style>
