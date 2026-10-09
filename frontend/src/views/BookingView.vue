<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from "vue";
import { useI18n } from "vue-i18n";
import type { BookingLocale } from "../services/booking/types";
import { useBookingStore } from "../stores/booking";
import { clinic } from "../content/clinic";
import {
  clinicDate,
  dateLabel,
  duration,
  localized,
  slotKey,
  timeLabel,
} from "../services/booking/calendar";
import BookingCalendar from "../components/booking/BookingCalendar.vue";
import BookingSummary from "../components/booking/BookingSummary.vue";
import BookingContactFields from "../components/booking/BookingContactFields.vue";
import AuthField from "../components/auth/AuthField.vue";
const booking = useBookingStore(),
  { t, locale } = useI18n();
const initializing = ref(true),
  heading = ref<HTMLElement>(),
  clock = ref(Date.now());
const summaryOpen = ref(window.matchMedia("(min-width: 1000px)").matches);
let timer: ReturnType<typeof setInterval> | undefined;
onMounted(async () => {
  timer = setInterval(() => {
    clock.value = Date.now();
  }, 1000);
  try {
    await booking.initialize();
  } catch {
    booking.error = "api_unavailable";
  } finally {
    initializing.value = false;
  }
});
onBeforeUnmount(() => {
  clearInterval(timer);
  void booking.dispose();
});
watch([() => booking.step, () => booking.receipt], async () => {
  await nextTick();
  heading.value?.focus({ preventScroll: true });
  const bounds = heading.value?.getBoundingClientRect();
  if (bounds && (bounds.top < 110 || bounds.bottom > window.innerHeight))
    heading.value?.scrollIntoView({
      block: "start",
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
});
const service = computed(() =>
  booking.receipt
    ? booking.resultService
    : booking.services.find((s) => s.id === booking.serviceID) || null,
);
const doctor = computed(() =>
  booking.receipt
    ? booking.resultDoctor
    : booking.doctors.find(
        (d) =>
          d.id === booking.slot?.doctor_id ||
          (!booking.slot && d.id === booking.doctorChoice),
      ) || null,
);
const selected = computed(() => booking.receipt || booking.slot);
const summaryItems = computed(() => {
  const date = selected.value
    ? clinicDate(new Date(selected.value.starts_at))
    : booking.date;
  const items = [
    {
      label: "service",
      value:
        localized(service.value, "name", locale.value) ||
        (booking.receipt ? t("booking.updatedService") : ""),
    },
    {
      label: "doctor",
      value:
        doctor.value?.name ||
        (booking.receipt
          ? t("booking.updatedDoctor")
          : booking.doctorChoice === "any"
            ? t("booking.anyDoctor")
            : ""),
    },
    { label: "date", value: date ? dateLabel(date, locale.value) : "" },
    {
      label: "time",
      value: selected.value
        ? timeLabel(selected.value.starts_at, locale.value)
        : "",
    },
  ];
  const minutes = selected.value
    ? duration(selected.value)
    : service.value?.duration_minutes;
  if (minutes && !booking.demo)
    items.push({
      label: "duration",
      value: t("booking.minutes", { count: minutes }),
    });
  const price = localized(service.value, "price_display", locale.value);
  if (price) items.push({ label: "price", value: price });
  return items;
});
const serviceGroups = computed(() => {
  const groups = new Map<
    string,
    { id: string; label: string; items: typeof booking.services }
  >();
  for (const item of booking.services) {
    const category = booking.demo ? item.category : undefined;
    const id = category?.id || "all";
    if (!groups.has(id))
      groups.set(id, {
        id,
        label: category?.title[locale.value as BookingLocale] || "",
        items: [],
      });
    groups.get(id)!.items.push(item);
  }
  return [...groups.values()];
});
const empty = computed(
  () =>
    !initializing.value &&
    !booking.catalogLoading &&
    !booking.intent &&
    !booking.receipt &&
    (!booking.services.length || !booking.noticeVersion),
);
const availableDates = computed(() =>
  Object.values(booking.days).some(
    (d) => d.status === "ready" && d.slots.length,
  ),
);
const slots = computed(() => booking.days[booking.date]?.slots || []);
const seconds = computed(() =>
  Math.max(0, Math.ceil((booking.retryAt - clock.value) / 1000)),
);
const canNext = computed(
  () =>
    [
      !!service.value && !!booking.noticeVersion,
      !!booking.doctorChoice &&
        !!booking.doctors.length &&
        !booking.doctorsLoading,
      !!booking.slot && !booking.dayLoading,
      true,
    ][booking.step],
);
const titles = [
  "serviceTitle",
  "doctorTitle",
  "timeTitle",
  "contactTitle",
  "reviewTitle",
];
const texts = [
  "serviceText",
  "doctorText",
  "timeText",
  "contactText",
  "reviewText",
];
const accountIssue = computed(() =>
  ["failed", "incomplete"].includes(booking.accountState),
);
async function next() {
  await booking.next();
  await nextTick();
  document
    .querySelector<HTMLElement>('.booking-page [aria-invalid="true"]')
    ?.focus();
}
async function submit() {
  await booking.submit();
  await nextTick();
  document
    .querySelector<HTMLElement>('.booking-page [aria-invalid="true"]')
    ?.focus();
}
function retryLoad() {
  if (booking.step === 0) void booking.loadServices();
  else if (booking.step === 1) void booking.loadDoctors();
  else void booking.loadMonth();
}
</script>
<template>
  <div class="booking-page">
    <div class="container booking-container">
      <header class="booking-masthead">
        <div>
          <p class="eyebrow">{{ t("booking.eyebrow") }}</p>
          <h1>{{ t("booking.title") }}</h1>
        </div>
        <p>{{ t("booking.intro") }}</p>
      </header>
      <div v-if="booking.demo" class="booking-demo" role="note">
        <strong>{{ t("booking.demoLabel") }}</strong>
        <p>{{ t("booking.demoText") }}</p>
      </div>
      <div class="booking-layout">
        <div class="booking-workspace">
          <nav
            v-if="!booking.receipt"
            class="booking-progress"
            :aria-label="t('booking.progress')"
          >
            <p class="mobile-progress">
              {{
                t("booking.stepCount", { current: booking.step + 1, total: 5 })
              }}
            </p>
            <ol>
              <li
                v-for="index in 5"
                :key="index"
                :class="{
                  current: booking.step === index - 1,
                  done: booking.step > index - 1,
                }"
                :aria-current="booking.step === index - 1 ? 'step' : undefined"
              >
                <button
                  type="button"
                  :disabled="index - 1 >= booking.step || booking.locked"
                  @click="booking.edit(index - 1)"
                >
                  <span class="step-number">0{{ index }}</span
                  ><span class="step-name">{{
                    t(`booking.step${index - 1}`)
                  }}</span>
                </button>
              </li>
            </ol>
          </nav>
          <div
            v-if="booking.notice && !booking.receipt"
            class="booking-notice"
            role="status"
          >
            {{ t(`booking.${booking.notice}`) }}
          </div>
          <div v-if="booking.error" class="booking-error" role="alert">
            <p>{{ t(`booking.${booking.error}`) }}</p>
            <button
              v-if="
                !booking.intent &&
                !booking.receipt &&
                !booking.storageBlocked &&
                ['api_unavailable', 'doctors', 'availability'].includes(
                  booking.error,
                )
              "
              class="booking-inline"
              type="button"
              @click="retryLoad"
            >
              {{ t("booking.retry") }}</button
            ><RouterLink
              v-if="booking.error === 'session_changed'"
              class="booking-inline"
              to="/login"
              >{{ t("booking.signIn") }}</RouterLink
            >
          </div>
          <section
            v-if="booking.receipt"
            class="booking-result"
            aria-labelledby="booking-result-heading"
            aria-live="polite"
          >
            <p class="eyebrow">AG ZOBĀRSTNIECĪBA · RĪGA</p>
            <h2 id="booking-result-heading" ref="heading" tabindex="-1">
              {{
                t(
                  `booking.${booking.demo ? "demoResultTitle" : booking.receipt.status === "confirmed" ? "confirmedTitle" : booking.receipt.status === "pending" ? "pendingTitle" : "otherTitle"}`,
                )
              }}
            </h2>
            <p>
              {{
                t(
                  `booking.${booking.demo ? "demoResultText" : booking.receipt.status === "confirmed" ? "confirmedText" : booking.receipt.status === "pending" ? "pendingText" : "otherText"}`,
                )
              }}
            </p>
            <div class="booking-reference">
              <span>{{ t("booking.reference") }}</span
              ><strong>{{ booking.receipt.booking_reference }}</strong>
            </div>
            <p class="booking-result-status">
              {{ t("booking.status") }}:
              {{ t(`booking.${booking.receipt.status}`) }}
            </p>
            <BookingSummary :items="summaryItems" review />
            <div class="booking-clinic">
              <span>{{ t("booking.address") }}</span>
              <p>AG Zobārstniecība<br />Ūnijas iela 25, Rīga</p>
            </div>
            <p v-if="booking.accountState === 'guest'" class="booking-note">
              {{ t("booking.guestResult") }}
            </p>
            <p v-if="!booking.demo" class="booking-note">
              {{ t("booking.receiptNote") }}
            </p>
            <RouterLink class="button" to="/kontakti">{{
              t("booking.questions")
            }}</RouterLink>
          </section>
          <div
            v-else-if="initializing || booking.catalogLoading"
            class="booking-loading"
            role="status"
          >
            <span class="loading-line" />
            <p>{{ t("booking.loading") }}</p>
          </div>
          <section
            v-else-if="empty || booking.storageBlocked"
            class="booking-empty"
          >
            <p class="eyebrow">AG ZOBĀRSTNIECĪBA</p>
            <h2 ref="heading" tabindex="-1">{{ t("booking.emptyTitle") }}</h2>
            <p>{{ t("booking.emptyText") }}</p>
            <a class="booking-phone" :href="clinic.tel">{{ clinic.phone }}</a>
            <div>
              <a class="button" :href="clinic.tel">{{ t("booking.call") }}</a
              ><RouterLink class="booking-inline" to="/kontakti">{{
                t("booking.questions")
              }}</RouterLink>
            </div>
          </section>
          <form v-else novalidate class="booking-form" @submit.prevent="next">
            <div :key="booking.step" class="booking-step">
              <h2 ref="heading" tabindex="-1">
                {{ t(`booking.${titles[booking.step]}`) }}
              </h2>
              <p class="booking-step-intro">
                {{ t(`booking.${texts[booking.step]}`) }}
              </p>
              <fieldset
                v-if="booking.step === 0"
                class="booking-options"
                :disabled="booking.locked"
              >
                <legend class="booking-sr">{{ t("booking.service") }}</legend>
                <div
                  v-for="group in serviceGroups"
                  :key="group.id"
                  :class="{ 'booking-service-group': group.label }"
                  :role="group.label ? 'group' : undefined"
                  :aria-labelledby="
                    group.label ? `booking-category-${group.id}` : undefined
                  "
                >
                  <h3
                    v-if="group.label"
                    :id="`booking-category-${group.id}`"
                    class="eyebrow booking-service-category"
                  >
                    {{ group.label }}
                  </h3>
                  <label
                    v-for="item in group.items"
                    :key="item.id"
                    class="booking-option"
                    :class="{ chosen: booking.serviceID === item.id }"
                    ><input
                      type="radio"
                      name="booking-service"
                      :value="item.id"
                      :checked="booking.serviceID === item.id"
                      @change="booking.selectService(item.id)"
                    /><span class="option-copy"
                      ><strong>{{ localized(item, "name", locale) }}</strong
                      ><span v-if="localized(item, 'description', locale)">{{
                        localized(item, "description", locale)
                      }}</span
                      ><span
                        v-if="
                          item.duration_minutes ||
                          localized(item, 'price_display', locale)
                        "
                        class="option-meta"
                        ><span v-if="item.duration_minutes">{{
                          t("booking.minutes", { count: item.duration_minutes })
                        }}</span
                        ><span
                          v-if="localized(item, 'price_display', locale)"
                          >{{ localized(item, "price_display", locale) }}</span
                        ></span
                      ></span
                    ></label
                  >
                </div>
              </fieldset>
              <template v-else-if="booking.step === 1"
                ><p
                  v-if="booking.doctorsLoading"
                  class="booking-loading"
                  role="status"
                >
                  {{ t("booking.loading") }}
                </p>
                <p
                  v-else-if="!booking.doctors.length"
                  class="booking-no-results"
                >
                  {{ t("booking.noDoctors") }}
                </p>
                <fieldset
                  v-else
                  class="booking-options"
                  :disabled="booking.locked"
                >
                  <legend class="booking-sr">{{ t("booking.doctor") }}</legend>
                  <label
                    v-if="booking.demo || booking.doctors.length > 1"
                    class="booking-option"
                    :class="{ chosen: booking.doctorChoice === 'any' }"
                    ><input
                      type="radio"
                      name="booking-doctor"
                      :checked="booking.doctorChoice === 'any'"
                      @change="booking.selectDoctor('any')"
                    /><span class="option-copy"
                      ><strong>{{ t("booking.anyDoctor") }}</strong
                      ><span>{{ t("booking.anyDoctorText") }}</span></span
                    ></label
                  ><label
                    v-for="item in booking.doctors"
                    :key="item.id"
                    class="booking-option"
                    :class="{ chosen: booking.doctorChoice === item.id }"
                    ><input
                      type="radio"
                      name="booking-doctor"
                      :value="item.id"
                      :checked="booking.doctorChoice === item.id"
                      @change="booking.selectDoctor(item.id)"
                    /><span class="option-copy"
                      ><strong>{{ item.name }}</strong
                      ><span
                        v-if="!booking.demo && booking.doctors.length === 1"
                        >{{ t("booking.oneDoctor") }}</span
                      ></span
                    ></label
                  >
                </fieldset></template
              >
              <template v-else-if="booking.step === 2">
                <BookingCalendar
                  :month="booking.month"
                  :today="booking.today"
                  :selected="booking.date"
                  :days="booking.days"
                  :loading="booking.monthLoading"
                  @month="booking.changeMonth"
                  @select="booking.selectDate"
                />
                <p
                  v-if="
                    !booking.monthLoading && !availableDates && !booking.error
                  "
                  class="booking-no-results"
                  role="status"
                >
                  {{ t("booking.noDates") }}
                </p>
                <section class="booking-times" :aria-label="t('booking.times')">
                  <div class="times-heading">
                    <p>
                      {{
                        booking.date
                          ? dateLabel(booking.date, locale)
                          : t("booking.chooseDate")
                      }}
                    </p>
                    <button
                      class="booking-inline"
                      type="button"
                      :disabled="booking.monthLoading || booking.dayLoading"
                      @click="
                        booking.date && slots.length
                          ? booking.selectDate(booking.date)
                          : booking.loadMonth()
                      "
                    >
                      {{ t("booking.refresh") }}
                    </button>
                  </div>
                  <p v-if="booking.dayLoading" role="status">
                    {{ t("booking.checkingTimes") }}
                  </p>
                  <p v-else-if="booking.date && !slots.length" role="status">
                    {{ t("booking.noTimes") }}
                  </p>
                  <div v-else-if="booking.date" class="time-grid">
                    <button
                      v-for="slot in slots"
                      :key="slotKey(slot)"
                      type="button"
                      :aria-pressed="
                        !!booking.slot &&
                        slotKey(slot) === slotKey(booking.slot)
                      "
                      :disabled="!booking.noticeVersion"
                      @click="booking.selectSlot(slot)"
                    >
                      <strong>{{ timeLabel(slot.starts_at, locale) }}</strong
                      ><span v-if="booking.doctorChoice === 'any'">{{
                        booking.doctors.find((d) => d.id === slot.doctor_id)
                          ?.name
                      }}</span>
                    </button>
                  </div>
                  <p class="booking-note">{{ t("booking.timezone") }}</p>
                </section>
              </template>
              <template v-else-if="booking.step === 3">
                <p class="booking-note required-note">
                  {{ t("booking.required") }}
                </p>
                <p
                  v-if="Object.keys(booking.errors).length"
                  role="alert"
                  class="booking-field-summary"
                >
                  {{ t("booking.checkFields") }}
                </p>
                <BookingContactFields
                  v-model="booking.contact"
                  :errors="booking.errors"
                  :disabled="booking.locked"
                />
                <div v-if="!booking.signedIn" class="booking-account">
                  <label class="booking-checkbox"
                    ><input
                      v-model="booking.createAccount"
                      type="checkbox"
                      :disabled="booking.locked"
                      @change="booking.accountState = 'idle'"
                    /><span
                      ><strong>{{ t("booking.createAccount") }}</strong
                      ><small>{{ t("booking.accountHint") }}</small></span
                    ></label
                  >
                  <div v-if="booking.createAccount" class="booking-passwords">
                    <AuthField
                      id="booking-password"
                      v-model="booking.password"
                      :label="t('booking.password')"
                      type="password"
                      autocomplete="new-password"
                      :error="booking.errors.password"
                      :hint="t('booking.passwordHint')"
                      :disabled="booking.locked"
                    /><AuthField
                      id="booking-repeat"
                      v-model="booking.repeat"
                      :label="t('booking.repeat')"
                      type="password"
                      autocomplete="new-password"
                      :error="booking.errors.repeat"
                      :disabled="booking.locked"
                    />
                  </div>
                </div>
                <div class="booking-privacy">
                  <label class="booking-checkbox"
                    ><input
                      id="booking-privacy"
                      v-model="booking.privacy"
                      type="checkbox"
                      required
                      :disabled="booking.locked"
                      :aria-invalid="!!booking.errors.privacy"
                      aria-describedby="booking-privacy-error"
                    /><span>{{ t("booking.privacy") }}</span></label
                  ><RouterLink
                    class="booking-inline"
                    to="/privatuma-politika"
                    target="_blank"
                    rel="noopener"
                    >{{ t("booking.privacyLink") }}</RouterLink
                  >
                  <p id="booking-privacy-error" class="booking-field-summary">
                    {{
                      booking.errors.privacy
                        ? t("booking.validation_privacy")
                        : ""
                    }}
                  </p>
                </div>
              </template>
              <template v-else-if="booking.step === 4">
                <BookingSummary :items="summaryItems" review />
                <div class="review-edit">
                  <button
                    type="button"
                    class="booking-inline"
                    :disabled="booking.locked"
                    @click="booking.edit(0)"
                  >
                    {{ t("booking.edit") }} — {{ t("booking.service") }}</button
                  ><button
                    type="button"
                    class="booking-inline"
                    :disabled="booking.locked"
                    @click="booking.edit(2)"
                  >
                    {{ t("booking.edit") }} — {{ t("booking.date") }}
                  </button>
                </div>
                <div class="booking-review-contact">
                  <BookingSummary
                    :items="
                      Object.entries(booking.contact).map(([label, value]) => ({
                        label,
                        value,
                      }))
                    "
                    review
                  /><button
                    type="button"
                    class="booking-inline"
                    :disabled="booking.locked"
                    @click="booking.edit(3)"
                  >
                    {{ t("booking.edit") }} — {{ t("booking.step3") }}
                  </button>
                </div>
                <p
                  v-if="booking.accountState === 'created'"
                  class="booking-notice"
                  role="status"
                >
                  {{ t("booking.accountCreated") }}
                </p>
                <div v-if="accountIssue" class="booking-error" role="alert">
                  <p>
                    {{
                      t(
                        booking.accountState === "incomplete"
                          ? "booking.accountIncomplete"
                          : "booking.accountFailed",
                      )
                    }}
                  </p>
                  <p
                    v-if="
                      booking.accountError &&
                      booking.accountState !== 'incomplete'
                    "
                  >
                    {{ t(`auth.${booking.accountError}`) }}
                  </p>
                  <div class="account-actions">
                    <button
                      type="button"
                      class="button"
                      @click="booking.chooseGuest"
                    >
                      {{ t("booking.guest") }}</button
                    ><button
                      v-if="booking.accountState !== 'incomplete'"
                      type="button"
                      class="booking-inline"
                      @click="booking.retryAccount"
                    >
                      {{ t("booking.retryAccount") }}</button
                    ><RouterLink to="/login" class="booking-inline">{{
                      t("booking.signIn")
                    }}</RouterLink>
                  </div>
                </div>
                <p
                  v-if="booking.createAccount && !booking.intent"
                  class="booking-note"
                >
                  {{ t("booking.accountSeparate") }}
                </p>
              </template>
            </div>
            <div class="booking-navigation">
              <button
                v-if="booking.step > 0"
                class="booking-back"
                type="button"
                :disabled="booking.locked"
                @click="booking.edit(booking.step - 1)"
              >
                {{ t("booking.back") }}</button
              ><span v-else /><button
                v-if="booking.step < 4"
                class="button booking-next"
                type="submit"
                :disabled="!canNext || booking.locked"
              >
                {{ t("booking.next") }}</button
              ><button
                v-else
                class="button booking-submit"
                type="button"
                :disabled="
                  booking.submitting ||
                  booking.storageBlocked ||
                  seconds > 0 ||
                  (!booking.intent && accountIssue)
                "
                @click="submit"
              >
                {{
                  booking.submitting
                    ? t("booking.submitting")
                    : seconds
                      ? t("booking.wait", { seconds })
                      : booking.intent
                        ? t("booking.retry")
                        : t("booking.confirm")
                }}
              </button>
            </div>
          </form>
        </div>
        <aside class="booking-sidebar">
          <details
            :open="summaryOpen"
            @toggle="summaryOpen = ($event.target as HTMLDetailsElement).open"
          >
            <summary>
              {{ t("booking.summary") }}<span aria-hidden="true">+</span>
            </summary>
            <div class="booking-summary-content">
              <BookingSummary :items="summaryItems" />
              <p class="booking-note">{{ t("booking.timezone") }}</p>
            </div>
          </details>
          <div class="sidebar-clinic">
            <span class="eyebrow">AG ZOBĀRSTNIECĪBA</span>
            <p>Ūnijas iela 25, Rīga</p>
            <a :href="clinic.tel">{{ clinic.phone }}</a
            ><RouterLink to="/kontakti">{{
              t("booking.questions")
            }}</RouterLink>
          </div>
        </aside>
      </div>
    </div>
  </div>
</template>
<style scoped>
.booking-page {
  padding: 150px 0 105px;
  background: var(--paper);
  --booking-error: #87483d;
}
.booking-container {
  max-width: 1390px;
}
.booking-masthead {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 310px;
  align-items: end;
  gap: 65px;
  padding-bottom: 50px;
}
.booking-masthead .eyebrow {
  margin-bottom: 16px;
}
.booking-masthead h1 {
  font-size: clamp(46px, 5.4vw, 80px);
  letter-spacing: -0.045em;
}
.booking-masthead > p {
  font-size: 14px;
  line-height: 1.85;
  color: var(--muted);
  margin: 0 0 5px;
}
.booking-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 310px;
  gap: 65px;
  align-items: start;
  border-top: 1px solid var(--line);
}
.booking-workspace {
  min-width: 0;
}
.booking-sidebar {
  padding-top: 28px;
  border-left: 1px solid var(--line);
  padding-left: 35px;
  min-width: 0;
}
.booking-sidebar summary {
  display: flex;
  min-height: 44px;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  cursor: pointer;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.11em;
  list-style: none;
}
.booking-sidebar summary::-webkit-details-marker {
  display: none;
}
.booking-sidebar details[open] summary > span {
  transform: rotate(45deg);
}
.booking-sidebar summary > span {
  font-size: 18px;
  transition: transform 220ms;
}
.booking-summary-content {
  padding-top: 28px;
}
.sidebar-clinic {
  margin-top: 35px;
  border-top: 1px solid var(--line);
  padding-top: 25px;
}
.sidebar-clinic .eyebrow {
  font-size: 9px;
}
.sidebar-clinic p {
  font-size: 12px;
  margin: 10px 0;
}
.sidebar-clinic > a {
  display: block;
  font-size: 17px;
  margin-top: 14px;
}
.sidebar-clinic > a:last-child {
  font-size: 11px;
  text-decoration: underline;
  text-underline-offset: 5px;
  margin-top: 16px;
}
.booking-progress {
  padding: 27px 0 33px;
}
.booking-progress ol {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 14px;
  list-style: none;
  margin: 0;
  padding: 0;
}
.booking-progress li {
  border-top: 2px solid var(--line);
  padding-top: 12px;
  color: var(--muted);
}
.booking-progress li.current {
  border-color: var(--ink);
  color: var(--ink);
}
.booking-progress li.done {
  border-color: #87967a;
}
.booking-progress button {
  display: flex;
  flex-direction: column;
  gap: 5px;
  text-align: left;
  background: none;
  font-size: 10px;
  line-height: 1.5;
  min-height: 45px;
}
.booking-progress button:disabled {
  cursor: default;
}
.step-number {
  font-size: 10px;
  letter-spacing: 0.08em;
}
.current .step-name {
  font-weight: 700;
}
.mobile-progress {
  display: none;
}
.booking-step {
  padding: 12px 0 0;
  animation: booking-arrival 250ms ease both;
}
.booking-step h2,
.booking-empty h2,
.booking-result h2 {
  scroll-margin-top: 120px;
  font-size: clamp(36px, 3.8vw, 53px);
  letter-spacing: -0.035em;
  line-height: 1.05;
  outline: none;
}
.booking-step-intro {
  margin: 16px 0 30px;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.85;
  max-width: 540px;
}
.booking-service-group + .booking-service-group {
  margin-top: 28px;
}
.booking-service-category {
  font-family: var(--sans);
  font-size: 10px;
  line-height: 1.6;
  margin-bottom: 12px;
}
.booking-options {
  border: 0;
  padding: 0;
  margin: 0;
  min-width: 0;
}
.booking-option {
  display: flex;
  align-items: flex-start;
  gap: 20px;
  padding: 24px 18px;
  border-top: 1px solid var(--line);
  cursor: pointer;
  transition: background 240ms;
}
.booking-option:last-child {
  border-bottom: 1px solid var(--line);
}
.booking-option:hover {
  background: #eef0e7;
}
.booking-option.chosen {
  background: var(--sage);
}
.booking-option input {
  flex: 0 0 auto;
  width: 18px;
  height: 18px;
  margin-top: 6px;
  accent-color: var(--ink);
}
.option-copy {
  display: grid;
  gap: 9px;
  min-width: 0;
}
.option-copy strong {
  font: 400 27px/1.15 var(--serif);
  overflow-wrap: anywhere;
}
.option-copy > span {
  font-size: 12px;
  color: var(--muted);
  line-height: 1.8;
}
.option-copy .option-meta {
  display: flex;
  gap: 20px;
  font-size: 11px;
  color: var(--ink);
}
.booking-navigation {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  border-top: 1px solid var(--line);
  padding-top: 24px;
  margin-top: 34px;
}
.booking-navigation .button {
  min-width: 168px;
  text-align: center;
  justify-content: center;
}
.booking-back {
  background: transparent;
  font-size: 12px;
  min-height: 48px;
  padding: 0 8px;
}
.booking-page button:disabled {
  cursor: default;
}
.booking-page .button:disabled {
  background: #cfd4c6;
  color: #616958;
  border-color: #cfd4c6;
  opacity: 0.72;
}
.booking-page button:focus-visible,
.booking-page input:focus-visible,
.booking-page summary:focus-visible {
  outline: 2px solid var(--olive);
  outline-offset: 4px;
}
.booking-note {
  font-size: 11px;
  line-height: 1.8;
  color: var(--muted);
  margin-top: 20px;
}
.required-note {
  margin: 0 0 20px;
}
.booking-loading {
  min-height: 250px;
  display: flex;
  gap: 18px;
  align-items: center;
  justify-content: center;
  color: var(--muted);
  font-size: 13px;
}
.loading-line {
  height: 1px;
  width: 35px;
  background: var(--olive);
}
.booking-empty {
  padding: 50px 0 30px;
  max-width: 620px;
}
.booking-empty > p:not(.eyebrow) {
  margin-top: 22px;
  color: var(--muted);
  font-size: 14px;
  max-width: 480px;
}
.booking-phone {
  display: block;
  font: 400 clamp(30px, 3vw, 41px)/1.3 var(--serif);
  margin: 26px 0;
}
.booking-empty > div {
  display: flex;
  gap: 25px;
  align-items: center;
  flex-wrap: wrap;
}
.booking-inline {
  display: inline-block;
  font-size: 12px;
  line-height: 1.8;
  text-decoration: underline;
  text-underline-offset: 5px;
  background: transparent;
  padding: 10px 0;
  transition: color 200ms;
}
.booking-inline:hover {
  color: #657356;
}
.booking-inline:disabled {
  opacity: 0.45;
}
.booking-error,
.booking-notice,
.booking-demo {
  padding: 18px 20px;
  border-left: 2px solid var(--olive);
  background: var(--sage);
  font-size: 13px;
  line-height: 1.8;
  margin: 0 0 22px;
}
.booking-error {
  background: #f4ebe5;
  border-color: var(--booking-error);
  color: var(--booking-error);
}
.booking-error p + p {
  margin-top: 10px;
}
.booking-error .booking-inline {
  margin-right: 20px;
}
.booking-demo {
  margin: 0 0 26px;
  background: #eee8d8;
}
.booking-demo strong {
  font-size: 10px;
  letter-spacing: 0.1em;
}
.booking-demo p {
  font-size: 12px;
  margin-top: 4px;
}
.booking-times {
  border-top: 1px solid var(--line);
  padding-top: 20px;
  margin-top: 8px;
}
.times-heading {
  display: flex;
  gap: 15px;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 18px;
}
.times-heading p {
  font-size: 13px;
  line-height: 1.6;
}
.times-heading .booking-inline {
  font-size: 10px;
  text-align: right;
  flex-shrink: 0;
}
.booking-times > p:not(.booking-note) {
  font-size: 13px;
  color: var(--muted);
}
.time-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}
.time-grid button {
  min-height: 57px;
  background: var(--white);
  border: 1px solid var(--line);
  border-radius: 2px;
  padding: 13px 8px;
  transition:
    background 220ms,
    border-color 220ms;
  color: var(--ink);
}
.time-grid button:hover {
  border-color: var(--olive);
  background: var(--sage);
}
.time-grid button[aria-pressed="true"] {
  background: var(--ink);
  color: var(--white);
  border-color: var(--ink);
}
.time-grid strong {
  font-size: 15px;
  font-weight: 500;
}
.time-grid span {
  display: block;
  font-size: 10px;
  line-height: 1.5;
  margin-top: 5px;
  overflow-wrap: anywhere;
}
.booking-no-results {
  font-size: 13px;
  color: var(--muted);
  padding: 20px 0;
  line-height: 1.8;
}
.booking-account {
  border-top: 1px solid var(--line);
  padding-top: 25px;
  margin-top: 16px;
}
.booking-checkbox {
  display: flex;
  gap: 13px;
  align-items: flex-start;
  font-size: 12px;
  line-height: 1.9;
  cursor: pointer;
  padding: 7px 0;
}
.booking-checkbox input {
  width: 19px;
  height: 19px;
  flex: 0 0 auto;
  margin: 3px 0 0;
  accent-color: var(--ink);
}
.booking-checkbox strong {
  font-weight: 500;
  font-size: 14px;
}
.booking-checkbox small {
  display: block;
  font-size: 11px;
  color: var(--muted);
  line-height: 1.8;
  margin-top: 3px;
}
.booking-passwords {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 24px;
  margin-top: 22px;
}
.booking-privacy {
  padding-top: 23px;
  margin-top: 24px;
  border-top: 1px solid var(--line);
}
.booking-privacy .booking-inline {
  margin-left: 32px;
}
.booking-field-summary {
  color: var(--booking-error);
  font-size: 12px;
  margin: 8px 0 16px;
  line-height: 1.6;
}
.review-edit {
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
  margin: 20px 0 0;
}
.booking-review-contact {
  border-top: 1px solid var(--line);
  margin-top: 22px;
  padding-top: 26px;
}
.booking-review-contact > .booking-inline {
  margin-top: 16px;
}
.account-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 15px;
  margin-top: 15px;
}
.account-actions .button {
  font-size: 12px;
  min-height: 46px;
  padding: 10px 16px;
}
.booking-result {
  padding-top: 40px;
  animation: booking-arrival 300ms ease;
}
.booking-result > p:not(.eyebrow) {
  font-size: 14px;
  margin-top: 18px;
}
.booking-result .eyebrow {
  margin-bottom: 20px;
}
.booking-reference {
  margin: 32px 0 18px;
  padding-block: 20px;
  border-block: 1px solid var(--line);
}
.booking-reference > span,
.booking-clinic > span {
  display: block;
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
  margin-bottom: 8px;
}
.booking-reference strong {
  font-weight: 500;
  font-size: 18px;
  overflow-wrap: anywhere;
}
.booking-result .booking-result-status {
  font-size: 12px;
  margin: 0 0 28px;
}
.booking-clinic {
  border-top: 1px solid var(--line);
  padding-top: 24px;
  margin-top: 26px;
}
.booking-clinic p {
  font-size: 14px;
}
.booking-result > .button {
  margin-top: 24px;
}
.booking-sr {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
}
@keyframes booking-arrival {
  from {
    opacity: 0.2;
    transform: translateY(7px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
@media (max-width: 1100px) {
  .booking-layout {
    grid-template-columns: minmax(0, 1fr) 250px;
    gap: 35px;
  }
  .booking-masthead {
    grid-template-columns: minmax(0, 1fr) 250px;
    gap: 35px;
  }
  .booking-sidebar {
    padding-left: 25px;
  }
  .time-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 999px) {
  .booking-page {
    padding-top: 125px;
  }
  .booking-masthead {
    display: block;
    padding-bottom: 30px;
  }
  .booking-masthead > p {
    margin: 18px 0 0;
    max-width: 470px;
  }
  .booking-layout {
    display: flex;
    flex-direction: column;
    gap: 0;
  }
  .booking-workspace {
    width: 100%;
    order: 2;
  }
  .booking-sidebar {
    width: 100%;
    order: 1;
    border-left: 0;
    padding: 20px 0;
    border-bottom: 1px solid var(--line);
  }
  .booking-summary-content {
    padding-top: 20px;
  }
  .sidebar-clinic {
    display: none;
  }
  .booking-progress {
    padding-top: 25px;
  }
  .booking-step {
    max-width: 640px;
  }
  .booking-form,
  .booking-empty,
  .booking-result {
    max-width: 680px;
  }
  .booking-navigation {
    max-width: 640px;
  }
  .booking-container {
    max-width: 800px;
  }
}
@media (max-width: 600px) {
  .booking-page {
    padding: 112px 0 65px;
  }
  .booking-container {
    padding-inline: 20px;
  }
  .booking-masthead h1 {
    font-size: 49px;
  }
  .booking-masthead > p {
    font-size: 12px;
  }
  .booking-progress ol {
    gap: 8px;
  }
  .mobile-progress {
    display: block;
    font-size: 11px;
    margin-bottom: 15px;
    color: var(--muted);
  }
  .booking-progress .step-name {
    display: none;
  }
  .booking-progress .current .step-name {
    display: block;
    position: absolute;
    right: 0;
    top: -30px;
    font-size: 11px;
  }
  .booking-progress ol {
    position: relative;
  }
  .booking-progress button {
    min-height: 44px;
  }
  .booking-progress {
    padding-bottom: 22px;
  }
  .booking-option {
    padding: 20px 12px;
    gap: 14px;
  }
  .option-copy strong {
    font-size: 25px;
  }
  .booking-step h2,
  .booking-empty h2,
  .booking-result h2 {
    font-size: 39px;
  }
  .booking-step-intro {
    font-size: 12px;
    margin-bottom: 24px;
  }
  .booking-navigation {
    flex-wrap: wrap;
    gap: 12px;
  }
  .booking-navigation .button {
    width: 100%;
    order: 1;
  }
  .booking-navigation .booking-back {
    order: 2;
    width: 100%;
  }
  .booking-passwords {
    grid-template-columns: 1fr;
    gap: 12px;
  }
  .booking-empty {
    padding-top: 25px;
  }
  .booking-empty .button {
    width: 100%;
    justify-content: center;
  }
  .booking-empty > div {
    gap: 10px;
  }
  .time-grid {
    gap: 8px;
  }
  .times-heading {
    align-items: flex-start;
  }
  .times-heading p {
    font-size: 12px;
  }
  .times-heading .booking-inline {
    max-width: 110px;
    flex-shrink: 1;
    padding-top: 0;
  }
  .booking-error,
  .booking-notice {
    padding: 14px;
    font-size: 12px;
  }
  .booking-demo {
    padding: 14px;
  }
  .booking-reference strong {
    font-size: 15px;
  }
}
@media (max-width: 350px) {
  .booking-container {
    padding-inline: 16px;
  }
  .booking-masthead h1 {
    font-size: 44px;
  }
  .booking-step h2 {
    font-size: 36px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .booking-step,
  .booking-result {
    animation: none;
  }
  .booking-page * {
    transition: none !important;
  }
}
</style>
