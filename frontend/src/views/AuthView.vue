<script setup lang="ts">
import { computed, nextTick, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { useAuthStore } from "../stores/auth";
import { validateAuth } from "../services/authValidation";
import AuthField from "../components/auth/AuthField.vue";
const { t } = useI18n(),
  route = useRoute(),
  router = useRouter(),
  auth = useAuthStore();
const mode = computed(() => route.meta.authMode || "login");
const email = ref(""),
  password = ref(""),
  repeat = ref(""),
  consent = ref(false),
  errors = ref<Record<string, string>>({}),
  error = ref(""),
  success = ref(false),
  form = ref<HTMLFormElement>(),
  status = ref<HTMLElement>();
const hasPassword = computed(() => mode.value !== "forgot");
const createPassword = computed(
  () => mode.value === "register" || mode.value === "reset",
);
const invalidRecovery = computed(
  () => mode.value === "reset" && !auth.recovery && !success.value,
);
const submitLabel = computed(
  () =>
    `auth.${mode.value === "forgot" ? "send" : mode.value === "reset" ? "save" : mode.value === "register" ? "createAccount" : "login"}`,
);
async function submit() {
  if (auth.loading) return;
  error.value = "";
  errors.value = validateAuth(
    mode.value,
    email.value,
    password.value,
    repeat.value,
    consent.value,
  );
  if (Object.keys(errors.value).length) {
    await nextTick();
    form.value?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
    return;
  }
  let result: string | null;
  switch (mode.value) {
    case "register":
      result = await auth.register(
        email.value,
        password.value,
        repeat.value,
        consent.value,
      );
      break;
    case "login":
      result = await auth.login(email.value, password.value);
      break;
    case "forgot":
      result = await auth.forgotPassword(email.value);
      break;
    default:
      result = await auth.resetPassword(password.value, repeat.value);
  }
  if (result) {
    error.value = result;
    return;
  }
  password.value = "";
  repeat.value = "";
  if (mode.value === "login" || mode.value === "register")
    await router.replace("/");
  else {
    success.value = true;
    await nextTick();
    status.value?.focus();
  }
}
async function returnToLogin() {
  // A recovery session is real. End it through Supabase before presenting login.
  if (mode.value === "reset" && auth.user) {
    const result = await auth.logout();
    if (result) {
      error.value = result;
      return;
    }
  }
  await router.replace("/login");
}
</script>
<template>
  <section class="container auth-page" :data-auth-mode="mode">
    <div class="auth-layout">
      <header class="auth-intro">
        <p class="eyebrow">AG Zobārstniecība</p>
        <h1>{{ t(`auth.${mode}Title`) }}</h1>
        <p class="auth-description">{{ t(`auth.${mode}Intro`) }}</p>
      </header>
      <div class="auth-content">
        <h2 class="auth-form-title">{{ t(`auth.${mode}`) }}</h2>
        <div
          v-if="success"
          ref="status"
          class="auth-status"
          role="status"
          tabindex="-1"
        >
          <h3>
            {{
              t(
                mode === "forgot"
                  ? "auth.requestReceived"
                  : "auth.passwordChanged",
              )
            }}
          </h3>
          <p>
            {{
              t(mode === "forgot" ? "auth.forgotSuccess" : "auth.resetSuccess")
            }}
          </p>
          <p v-if="error" class="auth-error" role="alert">
            {{ t(`auth.${error}`) }}
          </p>
          <button
            type="button"
            class="button auth-submit"
            :disabled="auth.loading"
            :aria-label="t(auth.loading ? 'auth.loading' : 'auth.login')"
            @click="returnToLogin"
          >
            <span
              :class="{ 'label-hidden': auth.loading }"
              :aria-hidden="auth.loading"
              >{{ t("auth.login") }}</span
            ><span v-if="auth.loading" class="auth-loading">{{
              t("auth.loading")
            }}</span>
          </button>
        </div>
        <div v-else-if="invalidRecovery" class="auth-status" role="alert">
          <h3>{{ t("auth.newLinkTitle") }}</h3>
          <p>{{ t("auth.recoveryInvalid") }}</p>
          <RouterLink class="button auth-submit" to="/forgot-password">{{
            t("auth.requestNewLink")
          }}</RouterLink
          ><RouterLink class="auth-back" to="/login">{{
            t("auth.backToLogin")
          }}</RouterLink>
        </div>
        <form
          v-else
          ref="form"
          novalidate
          :aria-busy="auth.loading"
          @submit.prevent="submit"
        >
          <div class="auth-fields">
            <AuthField
              v-if="mode !== 'reset'"
              id="auth-email"
              v-model="email"
              :label="t('auth.email')"
              autocomplete="email"
              :error="errors.email"
              :disabled="auth.loading"
            />
            <div v-if="hasPassword">
              <AuthField
                id="auth-password"
                v-model="password"
                type="password"
                :label="
                  t(mode === 'reset' ? 'auth.newPassword' : 'auth.password')
                "
                :autocomplete="
                  createPassword ? 'new-password' : 'current-password'
                "
                :hint="createPassword ? t('auth.passwordHint') : undefined"
                :error="errors.password"
                :disabled="auth.loading"
              />
              <RouterLink
                v-if="mode === 'login'"
                class="auth-forgot"
                to="/forgot-password"
                >{{ t("auth.forgotLink") }}</RouterLink
              >
            </div>
            <AuthField
              v-if="createPassword"
              id="auth-repeat"
              v-model="repeat"
              type="password"
              :label="t('auth.repeat')"
              autocomplete="new-password"
              :error="errors.repeat"
              :disabled="auth.loading"
            />
          </div>
          <div v-if="mode === 'register'" class="auth-consent">
            <label
              ><input
                v-model="consent"
                type="checkbox"
                required
                :disabled="auth.loading"
                :aria-invalid="!!errors.consent"
                aria-describedby="auth-form-feedback"
              /><span
                >{{ t("auth.privacy") }}
                <RouterLink
                  to="/privatuma-politika"
                  target="_blank"
                  rel="noopener"
                  >{{ t("auth.privacyLink") }}</RouterLink
                >.</span
              ></label
            >
          </div>
          <div id="auth-form-feedback" class="auth-feedback" aria-live="polite">
            <p
              v-if="error || errors.consent || !auth.configured"
              class="auth-error"
              role="alert"
            >
              {{ t(`auth.${error || errors.consent || "unavailable"}`) }}
            </p>
          </div>
          <button
            class="button auth-submit"
            type="submit"
            :disabled="auth.loading || !auth.configured"
            :aria-label="t(auth.loading ? 'auth.loading' : submitLabel)"
          >
            <span
              :class="{ 'label-hidden': auth.loading }"
              :aria-hidden="auth.loading"
              >{{ t(submitLabel) }}</span
            ><span v-if="auth.loading" class="auth-loading">{{
              t("auth.loading")
            }}</span>
          </button>
          <p class="auth-switch" v-if="mode === 'login' || mode === 'register'">
            <span>{{
              t(mode === "login" ? "auth.noAccount" : "auth.hasAccount")
            }}</span
            ><RouterLink :to="mode === 'login' ? '/register' : '/login'">{{
              t(mode === "login" ? "auth.register" : "auth.login")
            }}</RouterLink>
          </p>
          <RouterLink v-else class="auth-back" to="/login">{{
            t("auth.backToLogin")
          }}</RouterLink>
        </form>
      </div>
    </div>
  </section>
</template>
<style scoped>
.auth-page {
  padding-top: clamp(126px, 10vw, 156px);
  padding-bottom: 64px;
  min-height: min(680px, 100svh);
  display: grid;
  align-items: center;
}
.auth-layout {
  width: 100%;
  max-width: 1160px;
  margin-inline: auto;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 500px);
  gap: clamp(48px, 6vw, 92px);
  align-items: center;
}
.auth-intro {
  padding-block: 20px 36px;
}
.auth-intro .eyebrow {
  font-size: 10px;
  margin-bottom: 28px;
  letter-spacing: 0.17em;
}
.auth-intro h1 {
  max-width: 16ch;
  font-size: clamp(48px, 4.7vw, 72px);
  line-height: 1.03;
  letter-spacing: -0.035em;
  text-wrap: balance;
  overflow-wrap: break-word;
  margin: 0 0 25px;
}
.auth-description {
  max-width: 31ch;
  font-size: 15px;
  line-height: 1.85;
  color: var(--muted);
}
.auth-content {
  width: 100%;
  max-width: 500px;
  position: relative;
}
.auth-content::before {
  content: "";
  position: absolute;
  top: 0;
  bottom: 0;
  left: calc(clamp(48px, 6vw, 92px) / -2);
  width: 1px;
  background: var(--line);
}
.auth-form-title {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 24px;
  font: 600 11px/1.6 var(--sans);
  text-transform: uppercase;
  letter-spacing: 0.14em;
}
.auth-form-title::after {
  content: "";
  height: 1px;
  background: var(--line);
  flex: 1;
  min-width: 24px;
}
.auth-fields {
  display: grid;
  gap: 12px;
}
.auth-forgot {
  display: block;
  width: fit-content;
  margin: -10px 0 6px auto;
  font-size: 12px;
  line-height: 1.7;
  text-underline-offset: 4px;
  text-decoration: underline;
}
.auth-consent {
  margin-top: 14px;
  font-size: 12px;
  line-height: 1.65;
}
.auth-consent label {
  display: flex;
  align-items: flex-start;
  gap: 11px;
  cursor: pointer;
}
.auth-consent input {
  appearance: auto;
  margin: 2px 0 0;
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  accent-color: var(--olive);
}
.auth-consent input:focus-visible {
  outline: 2px solid var(--olive);
  outline-offset: 4px;
}
.auth-consent a {
  margin-inline-start: 0.25em;
}
.auth-consent a,
.auth-switch a,
.auth-back {
  text-decoration: underline;
  text-decoration-color: #a3ac99;
  text-underline-offset: 5px;
}
.auth-consent a:hover,
.auth-switch a:hover,
.auth-back:hover,
.auth-forgot:hover {
  text-decoration-color: var(--ink);
}
.auth-error {
  color: #87483d;
  font-size: 12px;
  line-height: 1.6;
}
.auth-feedback {
  min-height: 40px;
  margin-block: 0 12px;
}
.auth-submit {
  position: relative;
  display: inline-grid;
  grid-template-columns: 1fr;
  place-items: center;
  min-width: min(100%, 250px);
  min-height: 56px;
  padding: 15px 26px;
  border-radius: 2px;
  font-size: 12px;
  white-space: normal;
  text-align: center;
  max-width: 100%;
  transition:
    background-color 220ms var(--ease),
    border-color 220ms var(--ease);
}
.auth-submit > span {
  grid-area: 1/1;
  font: inherit;
  line-height: 1.6;
}
.auth-submit .label-hidden {
  visibility: hidden;
}
.auth-submit .auth-loading {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  padding-inline: 10px;
  font-size: 11px;
}
.auth-submit:disabled {
  background: #69745f;
  cursor: wait;
}
.auth-submit:focus-visible,
.auth-back:focus-visible,
.auth-switch a:focus-visible,
.auth-forgot:focus-visible {
  outline: 2px solid var(--olive);
  outline-offset: 5px;
}
.auth-switch {
  display: flex;
  flex-wrap: wrap;
  gap: 3px 7px;
  margin-top: 24px;
  font-size: 12px;
  line-height: 1.8;
}
.auth-back {
  display: block;
  width: fit-content;
  margin-top: 24px;
  font-size: 12px;
  line-height: 1.8;
}
.auth-status {
  outline-offset: 8px;
  padding-top: 12px;
}
.auth-status h3 {
  font: 400 36px/1.1 var(--serif);
  letter-spacing: -0.02em;
  margin-bottom: 20px;
  max-width: 20ch;
}
.auth-status > p {
  font-size: 14px;
  line-height: 1.8;
  max-width: 45ch;
}
.auth-status .auth-submit {
  margin-top: 28px;
}
.auth-status .auth-error {
  margin-top: 14px;
  font-size: 12px;
}
@media (min-width: 1100px) and (max-height: 820px) {
  .auth-page {
    padding-top: 118px;
    padding-bottom: 40px;
    min-height: 0;
  }
  .auth-intro h1 {
    font-size: 60px;
  }
  .auth-form-title {
    margin-bottom: 18px;
  }
  .auth-fields {
    gap: 8px;
  }
  .auth-switch {
    margin-top: 20px;
  }
}
@media (max-width: 1000px) {
  .auth-page {
    padding-top: 122px;
    padding-bottom: 56px;
    min-height: 0;
  }
  .auth-layout {
    max-width: 620px;
    grid-template-columns: minmax(0, 1fr);
    gap: 32px;
  }
  .auth-intro {
    padding: 0;
  }
  .auth-intro h1 {
    max-width: 18ch;
    font-size: clamp(42px, 6.5vw, 60px);
    margin-bottom: 18px;
  }
  .auth-intro .eyebrow {
    margin-bottom: 19px;
  }
  .auth-description {
    max-width: 42ch;
    font-size: 14px;
  }
  .auth-content {
    max-width: none;
  }
  .auth-content::before {
    display: none;
  }
  .auth-form-title {
    margin-bottom: 20px;
  }
}
@media (max-width: 600px) {
  .auth-feedback {
    min-height: 60px;
  }
  .auth-page {
    padding-top: 111px;
    padding-bottom: 44px;
  }
  .auth-layout {
    gap: 28px;
  }
  .auth-intro h1 {
    font-size: clamp(40px, 10.5vw, 54px);
    max-width: 15ch;
  }
  .auth-description {
    line-height: 1.75;
  }
  .auth-fields {
    gap: 10px;
  }
  .auth-submit {
    width: 100%;
  }
  .auth-switch {
    justify-content: center;
    text-align: center;
    margin-top: 22px;
  }
  .auth-back {
    margin-inline: auto;
  }
  .auth-status h3 {
    font-size: 32px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .auth-submit {
    transition: none;
  }
}
</style>
