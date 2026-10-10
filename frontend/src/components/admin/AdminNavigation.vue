<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { adminGroups, adminPath } from "../../services/admin/navigation";
import { useCmsNavigationStore } from "../../stores/cmsNavigation";
const navigation = useCmsNavigationStore();
const { t } = useI18n();
defineEmits<{ navigate: [] }>();
</script>
<template>
  <nav class="admin-navigation" :aria-label="t('admin.navigation')">
    <div v-for="group in adminGroups" :key="group.key" class="admin-nav-group">
      <p v-if="group.key !== 'overview'">
        {{ t(`admin.groups.${group.key}`) }}
      </p>
      <RouterLink
        v-for="item in group.items"
        :key="item"
        :to="navigation.last[item] || adminPath(item)"
        :class="{
          selected:
            $route.path === adminPath(item) ||
            (item !== 'overview' &&
              $route.path.startsWith(adminPath(item) + '/')),
        }"
        :aria-current="
          $route.path === adminPath(item) ||
          (item !== 'overview' && $route.path.startsWith(adminPath(item) + '/'))
            ? 'page'
            : undefined
        "
        @click="$emit('navigate')"
        >{{ t(`admin.nav.${item}`) }}</RouterLink
      >
    </div>
  </nav>
</template>
<style scoped>
.admin-navigation {
  padding: 0 14px 24px;
}
.admin-nav-group + .admin-nav-group {
  margin-top: 14px;
}
.admin-nav-group p {
  padding: 0 14px;
  margin-bottom: 5px;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #646e60;
}
.admin-navigation a {
  display: flex;
  align-items: center;
  min-height: 44px;
  padding: 9px 14px;
  font-size: 13px;
  line-height: 1.4;
  overflow-wrap: anywhere;
  border-radius: 3px;
  transition: background-color 180ms ease;
}
.admin-navigation a:hover {
  background: #e2e6db;
}
.admin-navigation a.selected {
  background: var(--olive);
  color: var(--white);
}
.admin-navigation a:focus-visible {
  outline: 2px solid var(--olive);
  outline-offset: 2px;
}
@media (prefers-reduced-motion: reduce) {
  .admin-navigation a {
    transition: none;
  }
}
</style>
