<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from "vue";
import { clinic, services } from "../content/clinic";
import { useContent } from "../content/useContent";
import {
  fieldLimits,
  prepareRequest,
  REQUEST_SUBMISSION_ENABLED,
  submitAppointmentRequest,
  validateRequest,
  type RequestFields,
} from "../services/appointmentRequests";
const { t, local } = useContent();
const blank = (): RequestFields => ({
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  service: "",
  message: "",
  consent: false,
});
const fields = reactive(blank());
const attempted = ref(false),
  busy = ref(false),
  status = ref<"idle" | "received" | "unavailable" | "failed">("idle");
const form = ref<HTMLFormElement>(),
  result = ref<HTMLElement>();
const inputFields = [
  { key: "firstName", type: "text", autocomplete: "given-name" },
  { key: "lastName", type: "text", autocomplete: "family-name" },
  { key: "phone", type: "tel", autocomplete: "tel" },
  { key: "email", type: "email", autocomplete: "email" },
] as const;
const validation = computed(() =>
  validateRequest(
    fields,
    services.map((service) => service.slug),
  ),
);
const errors = computed(() => (attempted.value ? validation.value : {}));
function completed(key: keyof RequestFields) {
  return !!String(fields[key]).trim() && !validation.value[key];
}
watch(
  fields,
  () => {
    if (!busy.value) status.value = "idle";
  },
  { flush: "sync" },
);
async function submit() {
  if (busy.value) return;
  attempted.value = true;
  status.value = "idle";
  if (Object.keys(errors.value).length) {
    await nextTick();
    form.value?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
    return;
  }
  busy.value = true;
  try {
    status.value = (
      await submitAppointmentRequest(prepareRequest(fields))
    ).status;
    if (status.value === "received") {
      attempted.value = false;
      Object.assign(fields, blank());
    }
  } catch {
    status.value = "failed";
  } finally {
    busy.value = false;
  }
  await nextTick();
  // Bring the confirmation into view after the fields collapse, especially on mobile.
  result.value?.focus();
}
</script>
<template>
  <section class="appointment-form" :aria-label="t('request.title')">
    <p
      v-if="!REQUEST_SUBMISSION_ENABLED && status !== 'received'"
      class="request-notice"
    >
      {{ t("contact.formUnavailable") }}
    </p>
    <div
      v-if="status === 'received'"
      ref="result"
      class="request-result"
      tabindex="-1"
      role="status"
    >
      <h3>{{ t("request.thanks") }}</h3>
      <p>{{ t("request.success") }}</p>
    </div>
    <form
      v-else
      ref="form"
      novalidate
      :aria-busy="busy"
      @submit.prevent="submit"
    >
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
      <fieldset :disabled="busy">
        <div class="request-fields">
          <div
            v-for="input in inputFields"
            :key="input.key"
            class="request-field"
            :class="{ 'is-complete': completed(input.key) }"
          >
            <label :for="`request-${input.key}`"
              >{{ t(`request.${input.key}`) }}
              <span aria-hidden="true">*</span></label
            >
            <input
              :id="`request-${input.key}`"
              v-model="fields[input.key]"
              :name="input.key"
              :type="input.type"
              :autocomplete="input.autocomplete"
              :maxlength="fieldLimits[input.key]"
              required
              :aria-invalid="!!errors[input.key]"
              :aria-describedby="
                errors[input.key] ? `error-${input.key}` : undefined
              "
            />
            <span
              :id="`error-${input.key}`"
              class="field-error error-space"
              :class="{ 'has-error': !!errors[input.key] }"
              >{{
                errors[input.key]
                  ? t(`request.errors.${errors[input.key]}`)
                  : ""
              }}</span
            >
          </div>
          <div
            class="request-field full-width"
            :class="{ 'is-complete': completed('service') }"
          >
            <label for="request-service"
              >{{ t("request.service") }}
              <small>({{ t("request.optional") }})</small></label
            >
            <select
              id="request-service"
              v-model="fields.service"
              name="service"
              :aria-invalid="!!errors.service"
              :aria-describedby="errors.service ? 'error-service' : undefined"
            >
              <option value="">{{ t("request.select") }}</option>
              <option
                v-for="service in services"
                :key="service.slug"
                :value="service.slug"
              >
                {{ local(service.title) }}
              </option>
              <option value="unsure">{{ t("request.unsure") }}</option>
            </select>
            <span
              v-if="errors.service"
              id="error-service"
              class="field-error"
              >{{ t(`request.errors.${errors.service}`) }}</span
            >
          </div>
          <div
            class="request-field full-width"
            :class="{ 'is-complete': completed('message') }"
          >
            <label for="request-message"
              >{{ t("request.message") }}
              <small>({{ t("request.optional") }})</small></label
            >
            <textarea
              id="request-message"
              v-model="fields.message"
              name="message"
              rows="3"
              :maxlength="fieldLimits.message"
              :aria-invalid="!!errors.message"
              :aria-describedby="
                errors.message ? 'message-hint error-message' : 'message-hint'
              "
            />
            <span id="message-hint" class="field-note">{{
              t("request.messageHint")
            }}</span>
            <span
              v-if="errors.message"
              id="error-message"
              class="field-error"
              >{{ t(`request.errors.${errors.message}`) }}</span
            >
          </div>
        </div>
        <div class="consent-field">
          <label for="request-consent"
            ><input
              id="request-consent"
              v-model="fields.consent"
              name="consent"
              type="checkbox"
              required
              :aria-invalid="!!errors.consent"
              :aria-describedby="errors.consent ? 'error-consent' : undefined"
            /><span
              >{{ t("request.consent") }}
              <span aria-hidden="true">*</span></span
            ></label
          >
          <RouterLink to="/privatuma-politika">{{
            t("legal.privacyTitle")
          }}</RouterLink>
          <p
            id="error-consent"
            class="field-error error-space"
            :class="{ 'has-error': !!errors.consent }"
          >
            {{ errors.consent ? t(`request.errors.${errors.consent}`) : "" }}
          </p>
        </div>
        <button class="button" type="submit" :disabled="busy">
          <span
            class="submit-label"
            :class="{ concealed: busy }"
            :aria-hidden="busy"
          >
            {{
              t(REQUEST_SUBMISSION_ENABLED ? "request.send" : "request.check")
            }}
          </span>
          <span
            class="submit-label"
            :class="{ concealed: !busy }"
            :aria-hidden="!busy"
          >
            {{ t("request.loading") }}
          </span>
        </button>
      </fieldset>
      <div
        v-if="status === 'unavailable' || status === 'failed'"
        ref="result"
        class="request-result"
        role="status"
        tabindex="-1"
      >
        <p>
          {{
            t(status === "unavailable" ? "request.notSent" : "request.failed")
          }}
        </p>
        <div class="request-contact">
          <a :href="clinic.tel">{{ clinic.phone }}</a
          ><a :href="`mailto:${clinic.email}`">{{ clinic.email }}</a>
        </div>
      </div>
    </form>
  </section>
</template>
<style scoped>
.appointment-form {
  min-width: 0;
}
.appointment-form p {
  font-size: 13px;
  line-height: 1.7;
}
.appointment-form .request-notice {
  font-size: 12px;
  line-height: 1.7;
  color: #5f6858;
  padding-bottom: 16px;
  margin-bottom: 18px;
  border-bottom: 1px solid var(--line);
}
.request-contact {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 20px;
  font-size: 12px;
}
.request-contact a,
.consent-field a {
  text-decoration: underline;
  text-underline-offset: 4px;
}
.appointment-form form,
.request-result {
  width: 100%;
  max-width: 660px;
  min-width: 0;
}
fieldset {
  border: 0;
  padding: 0;
  min-width: 0;
}
.request-fields {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px 28px;
  margin-top: 16px;
}
.request-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.full-width {
  grid-column: 1 / -1;
}
.request-field label {
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  font-weight: 500;
  color: #5f6858;
  transition: color 240ms ease;
}
.request-field.is-complete label,
.request-field:focus-within label {
  color: var(--ink);
}
.request-field small {
  font-size: 10px;
  letter-spacing: 0.02em;
  text-transform: none;
  font-weight: 400;
}
.request-field input,
.request-field select,
.request-field textarea {
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
  --field-focus: var(--olive);
  background-image: linear-gradient(var(--field-focus), var(--field-focus));
  background-repeat: no-repeat;
  background-position: left bottom;
  background-size: 0% 1px;
  transition:
    border-color 240ms ease,
    background-size 240ms ease;
}
.request-field select {
  padding-right: 24px;
  cursor: pointer;
}
.request-field select option {
  background: var(--paper);
  color: var(--ink);
}
.request-field textarea {
  resize: vertical;
  min-height: 100px;
  line-height: 1.6;
}
.request-field input:hover,
.request-field select:hover,
.request-field textarea:hover {
  border-bottom-color: var(--olive);
}
.request-field :is(input, select, textarea):focus-visible {
  outline: none;
  border-bottom-color: var(--field-focus);
  background-size: 100% 1px;
}
.request-field.is-complete :is(input, select, textarea):not(:focus-visible) {
  border-bottom-color: #707b65;
}
.appointment-form .error-space {
  min-height: 3.2em;
  opacity: 0;
  transform: translateY(-2px);
  transition:
    opacity 180ms ease,
    transform 180ms ease;
}
.appointment-form .error-space.has-error {
  opacity: 1;
  transform: none;
}
.appointment-form .form-summary {
  min-height: 1.7em;
}
.appointment-form :is(button, a, input[type="checkbox"]):focus-visible {
  outline: 2px solid var(--olive);
  outline-offset: 4px;
}
.request-field [aria-invalid="true"] {
  --field-focus: #933f32;
  border-bottom-color: #933f32;
}
.appointment-form .field-error {
  color: #933f32;
  font-size: 12px;
  line-height: 1.6;
}
.appointment-form .field-note {
  color: #5f6858;
  font-size: 11px;
  line-height: 1.7;
}
#message-hint {
  margin-top: 6px;
  max-width: 65ch;
}
.consent-field {
  margin: 20px 0;
  max-width: 60ch;
  font-size: 12px;
  line-height: 1.7;
}
.consent-field label {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  cursor: pointer;
}
.consent-field input {
  flex: 0 0 18px;
  width: 18px;
  height: 18px;
  margin-top: 2px;
  accent-color: var(--olive);
}
.consent-field a {
  display: inline-flex;
  align-items: center;
  min-height: 32px;
  margin-left: 30px;
}
.consent-field .field-error {
  margin-left: 30px;
}
.appointment-form .button {
  min-height: 52px;
  padding-inline: 28px;
  display: inline-grid;
  grid-template-areas: "label";
  justify-content: center;
  gap: 0;
}
.appointment-form .button .submit-label {
  grid-area: label;
  font: inherit;
  transform: none;
}
.submit-label.concealed {
  visibility: hidden;
}
.request-result[role="status"] {
  animation: result-enter 240ms ease both;
}
.request-result:has(h3) {
  min-height: 250px;
  padding-block: 48px;
}
@keyframes result-enter {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
.appointment-form :disabled {
  cursor: wait;
  opacity: 0.6;
}
.request-result {
  padding-block: 22px;
  margin-top: 24px;
  border-block: 1px solid var(--line);
}
.request-result h3 {
  font-size: 40px;
  margin-bottom: 12px;
}
@media (max-width: 600px) {
  .request-fields {
    grid-template-columns: 1fr;
    gap: 18px;
  }
  .appointment-form .button {
    width: 100%;
  }
}
@media (prefers-reduced-motion: reduce) {
  .request-field :is(input, select, textarea),
  .appointment-form .error-space,
  .request-field label {
    transition: none;
    transform: none;
  }
  .request-result[role="status"] {
    animation: none;
  }
}
</style>
