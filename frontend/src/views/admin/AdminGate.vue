<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { useAuthStore } from "../../stores/auth";
import AdminLoadingState from "../../components/admin/AdminLoadingState.vue";
import AdminErrorState from "../../components/admin/AdminErrorState.vue";
import AdminLayout from "../../components/admin/AdminLayout.vue";
import { useCookieConsentStore } from "../../stores/cookieConsent";
import { LANGUAGE_KEY } from "../../services/cookieConsent";
import { safeAdminReturn } from "../../services/admin/access";
const auth = useAuthStore(),
  route = useRoute(),
  router = useRouter(),
  { t, locale } = useI18n();
const consent = useCookieConsentStore();
watch(
  [locale, () => consent.preferencesAllowed],
  ([language, allowed]) => {
    document.documentElement.lang = language;
    try {
      if (allowed) localStorage.setItem(LANGUAGE_KEY, language);
      else localStorage.removeItem(LANGUAGE_KEY);
    } catch {
      /* Optional preference storage. */
    }
  },
  { immediate: true },
);
let alive = true,
  attempt = 0,
  timer: ReturnType<typeof setInterval> | undefined;
let refreshAttempted = false;
const ready = ref(false);
// Preserve only this administrator's in-memory editor during revalidation. This
// is a mounting decision, never an authorization grant: visibility and API writes
// still require the current token's verified role. Expiry/revocation unmount it.
const editorGrant = ref<{ userID: string } | null>(null);
const keepEditor = computed(
  () =>
    !!editorGrant.value &&
    editorGrant.value.userID === auth.user?.id &&
    [
      "services",
      "doctors",
      "pages",
      "news",
      "media",
      "seo",
      "settings",
    ].includes(String(route.meta.adminSection)) &&
    ["admin", "checking", "idle", "unavailable"].includes(auth.adminStatus),
);
const checking = computed(
  () =>
    ["idle", "checking", "guest"].includes(auth.adminStatus) ||
    (auth.verifiedAdmin && !ready.value),
);
async function check() {
  const previousFocus = document.activeElement as HTMLElement | null;
  ready.value = false;
  const current = ++attempt;
  await auth.initialize();
  if (!alive || current !== attempt) return;
  if (!auth.user) {
    await router.replace({
      path: "/login",
      query: { returnTo: safeAdminReturn(route.fullPath) || "/admin" },
    });
    return;
  }
  let result = await auth.refreshRole();
  if (result === "unauthorized" && !refreshAttempted) {
    refreshAttempted = true;
    if (await auth.refreshAdminSession()) result = await auth.refreshRole();
  }
  if (result === "admin" || result === "user") refreshAttempted = false;
  if (alive && current === attempt) {
    ready.value = result === "admin";
    if (
      ready.value &&
      [
        "services",
        "doctors",
        "pages",
        "news",
        "media",
        "seo",
        "settings",
      ].includes(String(route.meta.adminSection))
    )
      editorGrant.value = {
        userID: auth.user!.id,
      };
    else if (!["checking", "idle", "unavailable"].includes(result))
      editorGrant.value = null;
    await nextTick();
    if (
      keepEditor.value &&
      previousFocus?.isConnected &&
      previousFocus !== document.body
    )
      previousFocus.focus({ preventScroll: true });
    else document.getElementById("admin-main")?.focus({ preventScroll: true });
  }
}
function focus() {
  if (document.visibilityState === "visible") void check();
}
watch(
  () => route.fullPath,
  () => void check(),
  { immediate: true },
);
watch(
  () => [auth.user?.id, auth.session?.access_token],
  () => void check(),
);
onMounted(() => {
  window.addEventListener("focus", focus);
  document.addEventListener("visibilitychange", focus);
  timer = setInterval(focus, 60000);
});
onBeforeUnmount(() => {
  alive = false;
  attempt++;
  clearInterval(timer);
  window.removeEventListener("focus", focus);
  document.removeEventListener("visibilitychange", focus);
});
</script>
<template>
  <AdminLayout
    v-if="(auth.verifiedAdmin && ready) || keepEditor"
    v-show="auth.verifiedAdmin && ready"
    :inert="!(auth.verifiedAdmin && ready)"
    ><RouterView
  /></AdminLayout>
  <main
    v-if="!auth.verifiedAdmin || !ready"
    id="admin-main"
    class="admin-access"
    tabindex="-1"
    :aria-busy="checking"
  >
    <p>AG Zobārstniecība</p>
    <template v-if="checking"
      ><h1>{{ t("admin.checking") }}</h1>
      <AdminLoadingState :label="t('admin.checkingText')"
    /></template>
    <template v-else-if="['user', 'forbidden'].includes(auth.adminStatus)"
      ><h1>{{ t("admin.denied") }}</h1>
      <p role="alert">{{ t("admin.deniedText") }}</p></template
    >
    <template v-else-if="auth.adminStatus === 'unauthorized'"
      ><h1>{{ t("admin.expired") }}</h1>
      <p role="alert">{{ t("admin.expiredText") }}</p>
      <RouterLink
        class="button"
        :to="{
          path: '/login',
          query: { returnTo: safeAdminReturn(route.fullPath) || '/admin' },
        }"
        >{{ t("auth.login") }}</RouterLink
      ></template
    >
    <template v-else
      ><h1>{{ t("admin.unavailable") }}</h1>
      <AdminErrorState
        :description="t('admin.unavailableText')"
        retry
        @retry="check"
    /></template>
    <RouterLink class="admin-back" to="/">{{ t("admin.website") }}</RouterLink>
  </main>
</template>
<style scoped>
.admin-access {
  max-width: 650px;
  margin: 0 auto;
  padding: clamp(32px, 8vw, 100px) 24px;
  min-height: 80vh;
}
.admin-access h1 {
  font: 400 clamp(36px, 5vw, 52px)/1.15 var(--serif);
  margin: 24px 0;
}
.admin-access p {
  font-size: 14px;
  line-height: 1.7;
  margin-bottom: 24px;
}
.admin-back {
  display: block;
  width: fit-content;
  padding: 18px 0;
  text-decoration: underline;
  text-underline-offset: 4px;
}
</style>
