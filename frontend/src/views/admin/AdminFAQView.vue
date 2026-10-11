<script setup lang="ts">
import {useI18n} from 'vue-i18n';import AdminPageHeader from '../../components/admin/AdminPageHeader.vue';import AdminCreatedList from '../../components/admin/AdminCreatedList.vue';const {t}=useI18n();
</script>
<template><section><AdminPageHeader :title="t('simple.faq')"><template #actions><RouterLink to="/admin/pages/faq/new">{{t('simple.addFAQ')}}</RouterLink></template></AdminPageHeader><RouterLink to="/admin/pages">{{t('simple.back')}}</RouterLink><p><RouterLink to="/admin/pages/kontakti/faq">{{t('cms.edit')}} · {{t('admin.nav.pages')}}</RouterLink></p><AdminCreatedList kind="faq"/></section></template>
<style scoped>a{display:inline-block;min-height:44px;padding:12px 0;text-decoration:underline;text-underline-offset:3px}</style>
