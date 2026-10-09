<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { useRoute } from "vue-router";
import AdminPageHeader from "../../components/admin/AdminPageHeader.vue";
import AdminEmptyState from "../../components/admin/AdminEmptyState.vue";
const { t } = useI18n(),
  route = useRoute();
</script>
<template>
  <section class="admin-placeholder">
    <AdminPageHeader
      :title="t(String(route.meta.title))"
      :eyebrow="t('admin.title')"
    />
    <div class="admin-placeholder-body">
      <p class="admin-coming">{{ t("admin.notAvailable") }}</p>
      <AdminEmptyState
        :title="t('admin.plannedTitle')"
        :description="t(`admin.planned.${String(route.meta.adminSection)}`)"
        ><p class="admin-placeholder-note">{{ t("admin.placeholderNote") }}</p>
        <RouterLink class="admin-link" to="/admin">{{
          t("admin.backOverview")
        }}</RouterLink></AdminEmptyState
      >
    </div>
  </section>
</template>
<style scoped>
.admin-placeholder-body {
  border-top: 1px solid var(--line);
  padding-top: 28px;
}
.admin-coming {
  display: inline-block;
  padding: 7px 10px;
  background: var(--sage);
  font-size: 11px;
}
.admin-placeholder-note {
  font-size: 13px;
  line-height: 1.75;
  color: #646e60;
}
.admin-link {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  font-size: 13px;
  text-decoration: underline;
  text-underline-offset: 4px;
}
</style>
