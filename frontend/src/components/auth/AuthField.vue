<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
const props = withDefaults(
  defineProps<{
    id: string;
    label: string;
    type?: "email" | "password";
    autocomplete: string;
    error?: string;
    hint?: string;
    disabled?: boolean;
  }>(),
  { type: "email" },
);
const model = defineModel<string>({ required: true });
const { t } = useI18n();
const visible = ref(false);
const inputType = computed(() =>
  props.type === "password" && visible.value ? "text" : props.type,
);
</script>
<template>
  <div
    class="auth-field"
    :class="{
      'is-filled': model.length > 0,
      'has-error': error,
      'is-disabled': disabled,
    }"
  >
    <label :for="id">{{ label }} <span aria-hidden="true">*</span></label>
    <div class="auth-field-control">
      <input
        :id="id"
        v-model="model"
        :type="inputType"
        :autocomplete="autocomplete"
        :disabled="disabled"
        :spellcheck="false"
        autocapitalize="none"
        required
        :aria-invalid="!!error"
        :aria-describedby="`${id}-help`"
      />
      <button
        v-if="type === 'password'"
        class="auth-visibility"
        type="button"
        :disabled="disabled"
        :aria-controls="id"
        :aria-label="t(visible ? 'auth.hidePassword' : 'auth.showPassword')"
        :aria-pressed="visible"
        @click="visible = !visible"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.4"
          aria-hidden="true"
        >
          <path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6S2 12 2 12Z" />
          <circle cx="12" cy="12" r="2.6" />
          <path v-if="visible" d="m4 3 16 18" />
        </svg>
      </button>
    </div>
    <p
      :id="`${id}-help`"
      class="auth-field-help"
      :class="{ 'auth-field-error': error }"
      aria-live="polite"
    >
      {{ error ? t(`auth.${error}`) : hint || "\u00a0" }}
    </p>
  </div>
</template>
<style scoped>
.auth-field label {
  display: block;
  margin-bottom: 8px;
  font-size: 10px;
  font-weight: 600;
  line-height: 1.6;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
.auth-field label span {
  color: var(--muted);
  margin-left: 2px;
}
.auth-field-control {
  position: relative;
}
.auth-field input {
  display: block;
  width: 100%;
  height: 58px;
  padding: 15px 16px;
  border: 1px solid #cdd1c5;
  border-radius: 2px;
  background: #f0f0e9;
  color: var(--ink);
  font: 400 15px/1.6 var(--sans);
  transition:
    background-color 180ms ease,
    border-color 180ms ease;
  outline-offset: 3px;
}
.auth-field:has(.auth-visibility) input {
  padding-right: 58px;
}
.auth-field input:hover:not(:disabled) {
  border-color: #929d89;
}
.is-filled input {
  background: var(--white);
  border-color: #aeb6a5;
}
.auth-field input:focus-visible {
  outline: 2px solid var(--olive);
  border-color: var(--olive);
  background: var(--white);
}
.has-error input {
  border-color: #995b50;
}
.is-disabled input {
  opacity: 0.65;
  cursor: wait;
}
.auth-visibility {
  position: absolute;
  inset: 7px 7px 7px auto;
  display: grid;
  place-items: center;
  width: 44px;
  background: transparent;
  color: var(--muted);
  border-radius: 1px;
}
.auth-visibility:hover {
  color: var(--ink);
  background: var(--sage);
}
.auth-visibility:focus-visible {
  outline: 2px solid var(--olive);
  outline-offset: 1px;
}
.auth-visibility:disabled {
  opacity: 0.4;
  cursor: wait;
}
.auth-visibility svg {
  width: 21px;
  height: 21px;
}
.auth-field-help {
  min-height: 18px;
  margin: 6px 0 0;
  font-size: 12px;
  line-height: 1.5;
  color: var(--muted);
}
.auth-field-error {
  color: #87483d;
}
@media (prefers-reduced-motion: reduce) {
  .auth-field input {
    transition: none;
  }
}
</style>
