<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import {
  calendarCells,
  dateLabel,
  monthLabel,
  weekdays,
} from "../../services/booking/calendar";
import type { DayState } from "../../services/booking/flow";
const props = defineProps<{
  month: string;
  today: string;
  selected: string;
  days: Record<string, DayState>;
  loading: boolean;
}>();
const emit = defineEmits<{ month: [offset: number]; select: [date: string] }>();
const { t, locale } = useI18n();
const grid = ref<HTMLElement>();
const cells = computed(() => calendarCells(props.month));
const rows = computed(() =>
  Array.from({ length: cells.value.length / 7 }, (_, i) =>
    cells.value.slice(i * 7, i * 7 + 7),
  ),
);
const available = (date: string | null) =>
  !!date &&
  date >= props.today &&
  props.days[date]?.status === "ready" &&
  !!props.days[date]?.slots.length;
const active = computed(() =>
  available(props.selected) ? props.selected : cells.value.find(available),
);
let keyboardMonth = false;
function key(event: KeyboardEvent, date: string) {
  const deltas: Record<string, number> = {
    ArrowLeft: -1,
    ArrowRight: 1,
    ArrowUp: -7,
    ArrowDown: 7,
  };
  if (event.key === "PageUp" || event.key === "PageDown") {
    event.preventDefault();
    if (
      props.loading ||
      (event.key === "PageUp" && props.month <= props.today.slice(0, 7))
    )
      return;
    keyboardMonth = true;
    emit("month", event.key === "PageUp" ? -1 : 1);
    return;
  }
  let index = cells.value.indexOf(date);
  if (event.key === "Home" || event.key === "End") {
    event.preventDefault();
    const row = rows.value[Math.floor(index / 7)] || [];
    const target = (event.key === "Home" ? row : [...row].reverse()).find(
      available,
    );
    if (target)
      grid.value
        ?.querySelector<HTMLButtonElement>(`[data-date="${target}"]`)
        ?.focus();
    return;
  }
  const delta = deltas[event.key];
  if (!delta) return;
  event.preventDefault();
  for (
    index += delta;
    index >= 0 && index < cells.value.length;
    index += delta
  ) {
    if (available(cells.value[index]!)) {
      grid.value
        ?.querySelector<HTMLButtonElement>(
          `[data-date="${cells.value[index]}"]`,
        )
        ?.focus();
      return;
    }
  }
}
watch(
  () => props.loading,
  async (loading) => {
    if (!loading && keyboardMonth) {
      keyboardMonth = false;
      await nextTick();
      grid.value?.querySelector<HTMLButtonElement>('[tabindex="0"]')?.focus();
    }
  },
);
function status(date: string) {
  return date < props.today
    ? "unavailable"
    : props.days[date]?.status === "loading" || !props.days[date]
      ? "unknown"
      : available(date)
        ? "available"
        : "unavailable";
}
</script>
<template>
  <section class="booking-calendar" :aria-label="t('booking.calendar')">
    <div class="calendar-heading">
      <h3 id="booking-month">{{ monthLabel(month, locale) }}</h3>
      <div class="calendar-navigation">
        <button
          type="button"
          :disabled="month <= today.slice(0, 7) || loading"
          :aria-label="t('booking.previousMonth')"
          @click="emit('month', -1)"
        >
          <span aria-hidden="true">‹</span>
        </button>
        <button
          type="button"
          :disabled="loading"
          :aria-label="t('booking.nextMonth')"
          @click="emit('month', 1)"
        >
          <span aria-hidden="true">›</span>
        </button>
      </div>
    </div>
    <div
      ref="grid"
      class="calendar-grid"
      role="grid"
      aria-labelledby="booking-month"
      :aria-busy="loading"
    >
      <div role="row" class="calendar-row calendar-weekdays">
        <span v-for="day in weekdays(locale)" :key="day" role="columnheader">{{
          day
        }}</span>
      </div>
      <div
        v-for="(row, index) in rows"
        :key="index"
        role="row"
        class="calendar-row"
      >
        <div
          v-for="(date, column) in row"
          :key="date || column"
          role="gridcell"
          :aria-selected="!!date && date === selected"
        >
          <button
            v-if="date"
            type="button"
            :data-date="date"
            :disabled="!available(date)"
            :tabindex="date === active ? 0 : -1"
            :class="{
              selected: date === selected,
              available: available(date),
              checking: status(date) === 'unknown',
            }"
            :aria-label="`${dateLabel(date, locale)} — ${t(`booking.${status(date)}`)}`"
            :aria-current="date === today ? 'date' : undefined"
            @keydown="key($event, date)"
            @click="emit('select', date)"
          >
            {{ Number(date.slice(-2))
            }}<span
              v-if="available(date)"
              class="date-dot"
              aria-hidden="true"
            />
          </button>
        </div>
      </div>
    </div>
    <div class="calendar-legend">
      <span><i class="legend-dot" />{{ t("booking.available") }}</span
      ><span class="legend-muted">{{ t("booking.unavailable") }}</span>
    </div>
    <p class="calendar-loading" role="status">
      {{ loading ? t("booking.loadingCalendar") : "\u00a0" }}
    </p>
  </section>
</template>
<style scoped>
.booking-calendar {
  max-width: 540px;
}
.calendar-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 22px;
}
.calendar-heading h3 {
  font: 400 clamp(25px, 3vw, 34px)/1.2 var(--serif);
  text-transform: capitalize;
}
.calendar-navigation {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}
.calendar-navigation button {
  width: 44px;
  height: 44px;
  background: transparent;
  border: 1px solid var(--line);
  font: 30px/1 var(--serif);
}
.calendar-navigation button:hover:not(:disabled) {
  background: var(--sage);
}
.calendar-navigation button:disabled {
  opacity: 0.3;
  cursor: default;
}
.calendar-row {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 4px;
}
.calendar-weekdays {
  margin-bottom: 10px;
  text-align: center;
  font-size: 11px;
  color: var(--muted);
  text-transform: uppercase;
}
.calendar-row [role="gridcell"] {
  min-width: 0;
}
.calendar-row button {
  display: flex;
  position: relative;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 49px;
  background: transparent;
  font-size: 13px;
  border: 1px solid transparent;
  border-radius: 2px;
  margin-bottom: 4px;
  transition:
    background 220ms,
    color 220ms,
    border-color 220ms;
}
.calendar-row button.available {
  border-color: var(--line);
  background: var(--white);
}
.calendar-row button:disabled {
  color: #a4a99e;
  cursor: default;
}
.calendar-row button.checking {
  opacity: 0.45;
}
.calendar-row button.available:hover {
  background: var(--sage);
  border-color: var(--olive);
}
.calendar-row button.selected {
  background: var(--ink);
  border-color: var(--ink);
  color: var(--white);
}
.calendar-row button[aria-current="date"]:not(.selected) {
  text-decoration: underline;
  text-underline-offset: 3px;
}
.date-dot {
  position: absolute;
  bottom: 6px;
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: currentColor;
}
.calendar-legend {
  display: flex;
  gap: 24px;
  font-size: 11px;
  margin-top: 15px;
}
.calendar-legend span {
  display: flex;
  align-items: center;
  gap: 8px;
}
.legend-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--ink);
}
.legend-muted {
  color: var(--muted);
}
.calendar-loading {
  font-size: 12px;
  color: var(--muted);
  margin-top: 12px;
  min-height: 22px;
}
.booking-calendar button:focus-visible {
  outline: 2px solid var(--olive);
  outline-offset: 2px;
  z-index: 1;
}
@media (max-width: 400px) {
  .calendar-row {
    gap: 2px;
  }
  .calendar-row button {
    height: 44px;
  }
  .calendar-heading h3 {
    font-size: 26px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .calendar-row button {
    transition: none;
  }
}
</style>
