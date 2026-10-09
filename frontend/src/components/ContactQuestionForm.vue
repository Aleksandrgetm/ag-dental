<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from "vue";
import { clinic } from "../content/clinic";
import { useContent } from "../content/useContent";
import {
  fieldLimits,
  validateContactQuestion,
  type ContactQuestionFields,
} from "../services/contactQuestions";
const { t } = useContent();
const fields = reactive<ContactQuestionFields>({
  name: "",
  email: "",
  phone: "",
  question: "",
  privacy: false,
});
const attempted = ref(false),
  checked = ref(false);
const form = ref<HTMLFormElement>();
const inputFields = [
  { key: "name", type: "text", autocomplete: "name", required: true },
  { key: "email", type: "email", autocomplete: "email", required: true },
  { key: "phone", type: "tel", autocomplete: "tel", required: false },
] as const;
const validation = computed(() => validateContactQuestion(fields));
const errors = computed(() => (attempted.value ? validation.value : {}));
function completed(key: keyof typeof fieldLimits) {
  return !!fields[key].trim() && !validation.value[key];
}
watch(
  fields,
  () => {
    checked.value = false;
  },
  { flush: "sync" },
);
async function checkQuestion() {
  attempted.value = true;
  checked.value = false;
  if (Object.keys(validation.value).length) {
    await nextTick();
    form.value?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
    return;
  }
  // Keep the text intact. Checking is never represented as sending or acceptance.
  checked.value = true;
}
</script>
<template>
  <section class="contact-question-form" :aria-label="t('request.title')">
    <form ref="form" novalidate @submit.prevent="checkQuestion">
      <p
        class="field-note form-summary"
        :class="{ 'field-error': Object.keys(errors).length }"
        aria-live="polite"
      >
        {{
          t(
            Object.keys(errors).length
              ? "request.errors.summary"
              : "request.requiredHint",
          )
        }}
      </p>
      <div class="contact-fields">
        <div
          v-for="input in inputFields"
          :key="input.key"
          class="contact-field"
          :class="{
            'is-complete': completed(input.key),
            'contact-phone': input.key === 'phone',
          }"
        >
          <label :for="`contact-${input.key}`"
            >{{ t(`request.${input.key}`) }}
            <span v-if="input.required" aria-hidden="true">*</span>
            <small v-else>({{ t("request.optional") }})</small>
          </label>
          <input
            :id="`contact-${input.key}`"
            v-model="fields[input.key]"
            :name="input.key"
            :type="input.type"
            :autocomplete="input.autocomplete"
            :maxlength="fieldLimits[input.key]"
            :required="input.required"
            :aria-invalid="!!errors[input.key]"
            :aria-describedby="`contact-error-${input.key}`"
          />
          <span
            :id="`contact-error-${input.key}`"
            class="field-error error-space"
            :class="{ 'has-error': !!errors[input.key] }"
          >
            {{
              errors[input.key] ? t(`request.errors.${errors[input.key]}`) : ""
            }}
          </span>
        </div>
        <div
          class="contact-field full-width"
          :class="{ 'is-complete': completed('question') }"
        >
          <label for="contact-question"
            >{{ t("request.question") }}
            <span aria-hidden="true">*</span></label
          >
          <textarea
            id="contact-question"
            v-model="fields.question"
            name="question"
            rows="4"
            required
            :maxlength="fieldLimits.question"
            :placeholder="t('request.questionPlaceholder')"
            :aria-invalid="!!errors.question"
            aria-describedby="contact-question-hint contact-error-question"
          />
          <div class="question-guidance">
            <span id="contact-question-hint" class="field-note">{{
              t("request.questionHint")
            }}</span>
            <span class="question-count field-note" aria-hidden="true">{{
              t("request.characterCount", {
                count: fields.question.length,
                max: fieldLimits.question,
              })
            }}</span>
          </div>
          <span
            id="contact-error-question"
            class="field-error error-space"
            :class="{ 'has-error': !!errors.question }"
          >
            {{ errors.question ? t(`request.errors.${errors.question}`) : "" }}
          </span>
        </div>
      </div>
      <div class="privacy-field">
        <label for="contact-privacy">
          <input
            id="contact-privacy"
            v-model="fields.privacy"
            name="privacy"
            type="checkbox"
            required
            :aria-invalid="!!errors.privacy"
            aria-describedby="contact-error-privacy"
          />
          <span
            >{{ t("request.privacy") }} <span aria-hidden="true">*</span></span
          >
        </label>
        <RouterLink to="/privatuma-politika" target="_blank" rel="noopener">{{
          t("legal.privacyTitle")
        }}</RouterLink>
        <p
          id="contact-error-privacy"
          class="field-error error-space"
          :class="{ 'has-error': !!errors.privacy }"
        >
          {{ errors.privacy ? t(`request.errors.${errors.privacy}`) : "" }}
        </p>
      </div>
      <div class="contact-actions">
        <button
          class="button"
          type="submit"
          aria-describedby="contact-delivery-status"
        >
          {{ t("request.check") }}
        </button>
        <p
          id="contact-delivery-status"
          class="delivery-status field-note"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          {{ t(checked ? "request.notSent" : "request.unavailable") }}
        </p>
        <div class="contact-alternatives">
          <a :href="clinic.tel">{{ clinic.phone }}</a>
          <a :href="`mailto:${clinic.email}`">{{ clinic.email }}</a>
        </div>
      </div>
    </form>
  </section>
</template>
<style scoped>
.contact-question-form {
  min-width: 0;
}
.contact-question-form form {
  width: 100%;
  max-width: 660px;
  min-width: 0;
}
.contact-fields {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px 28px;
  margin-top: 16px;
}
.contact-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}
.contact-phone {
  grid-column: 1;
}
.full-width {
  grid-column: 1 / -1;
}
.contact-field label {
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  font-weight: 500;
  color: #5f6858;
  transition: color 240ms ease;
}
.contact-field.is-complete label,
.contact-field:focus-within label {
  color: var(--ink);
}
.contact-field small {
  font-size: 10px;
  letter-spacing: 0.02em;
  text-transform: none;
  font-weight: 400;
}
.contact-field input,
.contact-field textarea {
  width: 100%;
  min-width: 0;
  border: 0;
  border-bottom: 1px solid #aeb5a5;
  background: transparent;
  padding: 14px 2px;
  min-height: 56px;
  font: inherit;
  font-size: 16px;
  color: var(--ink);
  border-radius: 0;
  transition: border-color 240ms ease;
}
.contact-field textarea {
  resize: vertical;
  min-height: 140px;
  line-height: 1.6;
}
.contact-field textarea::placeholder {
  color: #72786d;
  opacity: 1;
}
.contact-field input:hover,
.contact-field textarea:hover {
  border-bottom-color: var(--olive);
}
.contact-field :is(input, textarea):focus-visible {
  outline: 2px solid var(--olive);
  outline-offset: 4px;
  border-bottom-color: var(--olive);
}
.contact-field.is-complete :is(input, textarea):not(:focus-visible) {
  border-bottom-color: #707b65;
}
.contact-question-form .error-space {
  min-height: 3.2em;
  opacity: 0;
  transform: translateY(-2px);
  transition:
    opacity 180ms ease,
    transform 180ms ease;
}
.contact-question-form .error-space.has-error {
  opacity: 1;
  transform: none;
}
.contact-question-form .form-summary {
  min-height: 3.4em;
}
.contact-question-form :is(button, a, input[type="checkbox"]):focus-visible {
  outline: 2px solid var(--olive);
  outline-offset: 4px;
}
.contact-field [aria-invalid="true"] {
  border-bottom-color: #933f32;
}
.contact-question-form .field-error {
  color: #933f32;
  font-size: 12px;
  line-height: 1.6;
}
.contact-question-form .field-note {
  color: #5f6858;
  font-size: 11px;
  line-height: 1.7;
}
.contact-question-form .form-summary.field-error {
  color: #933f32;
}
.question-guidance {
  display: flex;
  justify-content: space-between;
  align-items: start;
  gap: 16px;
  margin-top: 6px;
}
.question-count {
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
}
.privacy-field {
  margin: 16px 0 12px;
  max-width: 60ch;
  font-size: 12px;
  line-height: 1.7;
}
.privacy-field label {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  cursor: pointer;
  min-height: 44px;
}
.privacy-field input {
  flex: 0 0 18px;
  width: 18px;
  height: 18px;
  margin-top: 2px;
  accent-color: var(--olive);
}
.privacy-field a {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  margin-left: 30px;
}
.privacy-field .field-error {
  margin-left: 30px;
}
.contact-question-form .button {
  min-height: 52px;
  padding-inline: 28px;
  justify-content: center;
  gap: 0;
}
.contact-question-form .delivery-status {
  margin-top: 16px;
  min-height: 5.1em;
  max-width: 56ch;
}
.contact-alternatives {
  display: flex;
  flex-wrap: wrap;
  gap: 0 20px;
  font-size: 12px;
}
.contact-alternatives a {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
}
.contact-alternatives a,
.privacy-field a {
  text-decoration: underline;
  text-underline-offset: 4px;
}
@media (max-width: 900px) {
  .contact-fields {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 600px) {
  .contact-question-form .button {
    width: 100%;
  }
  .question-guidance {
    flex-direction: column;
    gap: 4px;
  }
  .question-count {
    align-self: end;
  }
}
@media (prefers-reduced-motion: reduce) {
  .contact-field :is(input, textarea),
  .contact-question-form .error-space,
  .contact-field label {
    transition: none;
    transform: none;
  }
}
</style>
