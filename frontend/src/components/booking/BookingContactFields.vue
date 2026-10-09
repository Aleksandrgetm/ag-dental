<script setup lang="ts">
import { useI18n } from "vue-i18n";
import type { Contact } from "../../services/booking/types";
const model = defineModel<Contact>({ required: true });
defineProps<{ errors: Record<string, string>; disabled: boolean }>();
const { t } = useI18n();
const fields = [
  { key: "first_name", auto: "given-name", type: "text", max: 100 },
  { key: "last_name", auto: "family-name", type: "text", max: 100 },
  { key: "email", auto: "email", type: "email", max: 254 },
  { key: "phone", auto: "tel", type: "tel", max: 30 },
] as const;
</script>
<template>
  <div class="booking-fields">
    <div v-for="field in fields" :key="field.key" class="booking-field">
      <label :for="`booking-${field.key}`"
        >{{ t(`booking.${field.key}`) }}
        <span aria-hidden="true">*</span></label
      ><input
        :id="`booking-${field.key}`"
        v-model="model[field.key]"
        :name="field.key"
        :type="field.type"
        :autocomplete="field.auto"
        :maxlength="field.max"
        :disabled="disabled"
        required
        :aria-invalid="!!errors[field.key]"
        :aria-describedby="`booking-${field.key}-error`"
      />
      <p :id="`booking-${field.key}-error`" class="booking-field-error">
        {{
          errors[field.key]
            ? t(`booking.validation_${errors[field.key]}`)
            : "\u00a0"
        }}
      </p>
    </div>
  </div>
</template>
<style scoped>
.booking-fields {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px 24px;
}
.booking-field {
  min-width: 0;
}
.booking-field label {
  display: block;
  font-size: 11px;
  font-weight: 600;
  margin-bottom: 9px;
}
.booking-field input {
  width: 100%;
  height: 55px;
  border: 1px solid var(--line);
  border-radius: 2px;
  background: var(--white);
  padding: 14px;
  font: 14px var(--sans);
  color: var(--ink);
  transition:
    border-color 220ms,
    background 220ms;
}
.booking-field input:hover {
  border-color: #8b9781;
}
.booking-field input:focus-visible {
  outline: 2px solid var(--olive);
  outline-offset: 3px;
  background: white;
}
.booking-field input[aria-invalid="true"] {
  border-color: #995b50;
}
.booking-field-error {
  min-height: 20px;
  margin-top: 7px;
  font-size: 11px;
  line-height: 1.5;
  color: #87483d;
}
@media (max-width: 600px) {
  .booking-fields {
    grid-template-columns: 1fr;
    gap: 12px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .booking-field input {
    transition: none;
  }
}
</style>
