<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { useAuthStore } from "../../stores/auth";
const props = defineProps<{ mobile?: boolean }>();
const emit = defineEmits<{ signedOut: [] }>();
const { t } = useI18n(),
  auth = useAuthStore(),
  route = useRoute(),
  router = useRouter();
const open = ref(false),
  root = ref<HTMLElement>(),
  trigger = ref<HTMLButtonElement>(),
  signout = ref<HTMLButtonElement>(),
  error = ref("");
const id = props.mobile ? "mobile-account" : "header-account";
async function toggle() {
  open.value = !open.value;
  if (open.value) {
    await nextTick();
    signout.value?.focus();
  }
}
function close(restore = false) {
  open.value = false;
  if (restore) trigger.value?.focus();
}
function outside(e: PointerEvent) {
  if (!root.value?.contains(e.target as Node)) close();
}
function focusout(e: FocusEvent) {
  if (!root.value?.contains(e.relatedTarget as Node)) close();
}
async function logout() {
  error.value = "";
  const result = await auth.logout();
  if (result) {
    error.value = result;
    return;
  }
  close();
  emit("signedOut");
  if (route.meta.requiresAuth || route.meta.requiresAdmin)
    await router.replace("/");
}
watch(
  () => route.fullPath,
  () => close(),
);
onMounted(() => document.addEventListener("pointerdown", outside));
onBeforeUnmount(() => document.removeEventListener("pointerdown", outside));
</script>
<template>
  <div
    ref="root"
    class="auth-control"
    :class="{ 'auth-mobile': mobile }"
    @focusout="focusout"
    @keydown.esc.stop.prevent="close(true)"
  >
    <span
      v-if="!auth.initialized"
      class="auth-pending"
      role="status"
      :aria-label="t('auth.loading')"
      >···</span
    >
    <RouterLink
      v-else-if="!auth.user"
      class="button"
      :class="{ 'header-book': !mobile }"
      to="/login"
      >{{ t("auth.login") }}</RouterLink
    >
    <template v-else>
      <button
        ref="trigger"
        class="button"
        :class="{ 'header-book': !mobile }"
        :aria-expanded="open"
        :aria-controls="id"
        @click="toggle"
      >
        {{ t("auth.account") }}
      </button>
      <div
        v-if="open"
        :id="id"
        class="account-panel"
        role="region"
        :aria-label="t('auth.account')"
      >
        <p class="account-email">{{ auth.user.email }}</p>
        <button
          ref="signout"
          class="text-link"
          :disabled="auth.loading"
          @click="logout"
        >
          {{ t(auth.loading ? "auth.loading" : "auth.logout") }}
        </button>
        <p v-if="error" class="account-error" role="alert">
          {{ t(`auth.${error}`) }}
        </p>
      </div>
    </template>
  </div>
</template>
<style scoped>
.auth-control {
  position: relative;
}
.auth-control .header-book {
  transition:
    background-color 360ms var(--ease),
    color 360ms var(--ease),
    border-color 360ms var(--ease),
    opacity 240ms ease;
}
@media (prefers-reduced-motion: reduce) {
  .auth-control .header-book {
    transition: none;
  }
}
.auth-control .header-book:hover {
  color: var(--paper);
}
.auth-pending {
  display: grid;
  place-items: center;
  min-width: 110px;
  min-height: 44px;
}
.account-panel {
  position: absolute;
  top: calc(100% + 12px);
  right: 0;
  width: 280px;
  max-width: calc(100vw - 40px);
  padding: 24px;
  background: var(--paper);
  color: var(--ink);
  border: 1px solid var(--line);
  z-index: 65;
}
.account-email {
  font-size: 13px;
  overflow-wrap: anywhere;
  margin-bottom: 18px;
}
.account-panel button {
  font-size: 12px;
}
.account-error {
  font-size: 12px;
  color: #86382f;
  margin-top: 12px;
}
.auth-mobile .account-panel {
  position: static;
  margin-top: 14px;
  width: 100%;
  max-width: none;
}
.auth-mobile {
  grid-column: 1 / -1;
  width: 100%;
}
@media (max-width: 800px) {
  .auth-control:not(.auth-mobile) {
    display: none;
  }
}
</style>
