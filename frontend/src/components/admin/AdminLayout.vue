<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
import { useAuthStore } from "../../stores/auth";
import AdminNavigation from "./AdminNavigation.vue";
const { t, locale } = useI18n(),
  auth = useAuthStore(),
  route = useRoute(),
  router = useRouter();
const drawer = ref<HTMLDialogElement>(),
  trigger = ref<HTMLButtonElement>(),
  error = ref("");
let scrollStyle = "",
  media: MediaQueryList | undefined;
function openMenu() {
  scrollStyle = document.documentElement.style.overflow;
  document.documentElement.style.overflow = "hidden";
  drawer.value?.showModal();
}
function closeMenu() {
  drawer.value?.close();
}
function trap(event: KeyboardEvent) {
  if (event.key !== "Tab") return;
  const items = Array.from(
    drawer.value?.querySelectorAll<HTMLElement>(
      "a[href],button:not(:disabled)",
    ) || [],
  );
  const first = items[0],
    last = items.at(-1);
  if (
    (event.shiftKey && document.activeElement === first) ||
    (!event.shiftKey && document.activeElement === last)
  ) {
    event.preventDefault();
    (event.shiftKey ? last : first)?.focus();
  }
}
function closed() {
  document.documentElement.style.overflow = scrollStyle;
  trigger.value?.focus();
}
function resize() {
  if (media?.matches && drawer.value?.open) closeMenu();
}
async function logout() {
  error.value = "";
  const result = await auth.logout();
  if (result) error.value = result;
  else await router.replace("/login");
}
watch(
  () => route.fullPath,
  () => {
    if (drawer.value?.open) closeMenu();
  },
);
onMounted(() => {
  media = window.matchMedia("(min-width: 1100px)");
  media.addEventListener("change", resize);
});
onBeforeUnmount(() => {
  media?.removeEventListener("change", resize);
  if (drawer.value?.open) document.documentElement.style.overflow = scrollStyle;
});
</script>
<template>
  <div class="admin-shell">
    <a class="admin-skip" href="#admin-main">{{ t("admin.skip") }}</a>
    <aside class="admin-sidebar">
      <RouterLink class="admin-brand" to="/admin"
        ><strong>AG.</strong
        ><span
          >Zobārstniecība<small>{{ t("admin.title") }}</small></span
        ></RouterLink
      >
      <AdminNavigation />
    </aside>
    <dialog
      ref="drawer"
      class="admin-drawer"
      :aria-label="t('admin.navigation')"
      @keydown="trap"
      @close="closed"
      @click="
        (event) => {
          if (event.target === drawer) closeMenu();
        }
      "
    >
      <div class="admin-drawer-heading">
        <span>{{ t("admin.title") }}</span
        ><button class="admin-quiet" @click="closeMenu">
          {{ t("admin.close") }}
        </button>
      </div>
      <AdminNavigation @navigate="closeMenu" />
    </dialog>
    <div class="admin-workspace">
      <header class="admin-topbar">
        <div class="admin-topbar-title">
          <button
            ref="trigger"
            class="admin-menu-button admin-quiet"
            aria-haspopup="dialog"
            @click="openMenu"
          >
            ☰ <span>{{ t("admin.menu") }}</span></button
          ><span>{{ t(String(route.meta.title)) }}</span>
        </div>
        <div class="admin-tools">
          <div
            class="admin-languages"
            role="group"
            :aria-label="t('ui.languages')"
          >
            <button
              v-for="lang in ['lv', 'ru', 'en']"
              :key="lang"
              :lang="lang"
              :aria-pressed="locale === lang"
              @click="locale = lang"
            >
              {{ lang.toUpperCase() }}
            </button>
          </div>
          <RouterLink class="admin-quiet" to="/">{{
            t("admin.website")
          }}</RouterLink>
          <div class="admin-account">
            <span :title="auth.user?.email">{{ auth.user?.email }}</span
            ><button
              class="admin-quiet"
              :disabled="auth.loading"
              @click="logout"
            >
              {{ t(auth.loading ? "auth.loading" : "auth.logout") }}
            </button>
          </div>
        </div>
      </header>
      <p v-if="error" class="admin-logout-error" role="alert">
        {{ t(`auth.${error}`) }}
      </p>
      <main id="admin-main" class="admin-main" tabindex="-1"><slot /></main>
    </div>
  </div>
</template>
<style scoped>
.admin-shell {
  display: grid;
  grid-template-columns: 248px minmax(0, 1fr);
  min-height: 100dvh;
  color: var(--ink);
  background: var(--paper);
}
.admin-sidebar {
  position: sticky;
  top: 0;
  height: 100dvh;
  overflow-y: auto;
  background: #eef0e7;
  border-right: 1px solid var(--line);
}
.admin-brand {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 28px 28px 30px;
}
.admin-brand strong {
  font: 400 42px/1 var(--serif);
}
.admin-brand span {
  font-size: 11px;
  font-weight: 500;
}
.admin-brand small {
  display: block;
  font-size: 10px;
  font-weight: 400;
  color: #646e60;
  margin-top: 5px;
}
.admin-workspace {
  min-width: 0;
}
.admin-topbar {
  min-height: 86px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 16px clamp(20px, 3vw, 40px);
  border-bottom: 1px solid var(--line);
  background: var(--white);
}
.admin-topbar-title {
  display: flex;
  align-items: center;
  gap: 14px;
  font-size: 13px;
  font-weight: 500;
}
.admin-tools {
  display: flex;
  align-items: center;
  justify-content: end;
  flex-wrap: wrap;
  gap: 8px 18px;
}
.admin-languages {
  display: flex;
}
.admin-languages button {
  min-width: 36px;
  min-height: 44px;
  font-size: 11px;
  background: transparent;
  border-bottom: 1px solid transparent;
}
.admin-languages button[aria-pressed="true"] {
  border-bottom-color: var(--ink);
}
.admin-quiet {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  min-height: 44px;
  font-size: 12px;
  line-height: 1.4;
  padding: 10px 4px;
  background: transparent;
  text-decoration: underline;
  text-underline-offset: 4px;
}
.admin-quiet:disabled {
  opacity: 0.6;
  cursor: wait;
}
.admin-account {
  display: flex;
  align-items: center;
  gap: 12px;
  border-left: 1px solid var(--line);
  padding-left: 18px;
}
.admin-account > span {
  font-size: 11px;
  max-width: 170px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.admin-menu-button {
  display: none;
  text-decoration: none;
  gap: 8px;
}
.admin-main {
  width: 100%;
  max-width: 1260px;
  margin: 0 auto;
  padding: clamp(24px, 4vw, 48px);
  outline: none;
}
.admin-logout-error {
  padding: 12px 24px;
  color: #86382f;
  font-size: 13px;
}
.admin-drawer {
  inset: 0 auto 0 0;
  margin: 0;
  height: 100dvh;
  max-height: none;
  width: min(320px, calc(100vw - 24px));
  max-width: none;
  background: #eef0e7;
  color: var(--ink);
  border: 0;
  padding: 0;
}
.admin-drawer::backdrop {
  background: rgb(25 35 25 / 35%);
}
.admin-drawer-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 20px 28px;
  font-size: 13px;
}
.admin-skip {
  position: fixed;
  top: -90px;
  left: 12px;
  z-index: 200;
  padding: 14px 20px;
  background: var(--ink);
  color: white;
}
.admin-skip:focus {
  top: 12px;
}
@media (max-width: 1099px) {
  .admin-shell {
    grid-template-columns: minmax(0, 1fr);
  }
  .admin-sidebar {
    display: none;
  }
  .admin-menu-button {
    display: inline-flex;
  }
  .admin-topbar {
    flex-wrap: wrap;
    gap: 8px 16px;
  }
  .admin-topbar-title {
    flex: 1 1 180px;
  }
}
@media (max-width: 700px) {
  .admin-topbar {
    padding: 12px 20px;
  }
  .admin-tools {
    width: 100%;
    justify-content: space-between;
    gap: 4px 12px;
  }
  .admin-account {
    width: 100%;
    justify-content: space-between;
    padding: 0;
    border: 0;
  }
  .admin-account > span {
    max-width: 65%;
  }
}
@media (prefers-reduced-motion: reduce) {
  .admin-shell * {
    scroll-behavior: auto;
  }
}
</style>
