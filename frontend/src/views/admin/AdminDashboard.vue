<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { useAdminDashboard } from "../../stores/admin/dashboard";
import { dateLabel, timeLabel } from "../../services/booking/calendar";
import { countLabel, PAGE_LIMIT } from "../../services/admin/dashboard";
import AdminPageHeader from "../../components/admin/AdminPageHeader.vue";
import AdminLoadingState from "../../components/admin/AdminLoadingState.vue";
import AdminEmptyState from "../../components/admin/AdminEmptyState.vue";
import AdminErrorState from "../../components/admin/AdminErrorState.vue";
import AdminStatCard from "../../components/admin/AdminStatCard.vue";
import AdminStatusBadge from "../../components/admin/AdminStatusBadge.vue";
const { t, locale } = useI18n(),
  dashboard = useAdminDashboard();
const warnings = computed(() => [
  ...(dashboard.settings && !dashboard.settings.privacy_notice_version
    ? ["privacyMissing"]
    : []),
  ...(dashboard.services === 0 ? ["servicesMissing"] : []),
  "schedulesUnknown",
]);
onMounted(() => void dashboard.load());
onBeforeUnmount(() => dashboard.clear());
</script>
<template>
  <section class="admin-dashboard">
    <AdminPageHeader
      :title="t('admin.overview')"
      :eyebrow="dateLabel(dashboard.date, locale)"
      :intro="t('admin.dashboardIntro')"
      ><template #actions
        ><button
          class="admin-refresh"
          :disabled="dashboard.loading"
          @click="dashboard.load"
        >
          {{ t("admin.refresh") }}
        </button></template
      ></AdminPageHeader
    >
    <AdminLoadingState
      v-if="dashboard.loading"
      :label="t('admin.loadingData')"
    />
    <template v-else>
      <AdminErrorState
        v-if="dashboard.failed"
        :title="t('admin.partialError')"
        :description="t('admin.partialErrorText')"
        retry
        @retry="dashboard.load"
      />
      <div class="admin-stats">
        <AdminStatCard
          :label="t('admin.todayVisits')"
          :value="countLabel(dashboard.today)"
          :note="t('admin.todayNote', { limit: PAGE_LIMIT })"
        />
        <AdminStatCard
          :label="t('admin.pendingVisits')"
          :value="countLabel(dashboard.pending)"
          :note="t('admin.pendingNote', { limit: PAGE_LIMIT })"
        />
        <AdminStatCard
          :label="t('admin.bookableServices')"
          :value="
            dashboard.services === null ? null : String(dashboard.services)
          "
          :note="t('admin.bookableNote')"
        />
        <AdminStatCard
          :label="t('admin.activeDoctors')"
          :value="null"
          :note="t('admin.doctorsUnknown')"
        />
      </div>
      <div class="admin-overview-columns">
        <section
          class="admin-panel admin-today"
          aria-labelledby="admin-today-title"
        >
          <header class="admin-panel-heading">
            <h2 id="admin-today-title">{{ t("admin.todaySchedule") }}</h2>
            <span>{{ t("admin.rigaTime") }}</span>
          </header>
          <AdminEmptyState
            v-if="dashboard.today === null"
            :title="t('admin.notAvailable')"
            :description="t('admin.visitsUnavailable')"
          />
          <AdminEmptyState
            v-else-if="!dashboard.today.length"
            :title="t('admin.noVisits')"
            :description="t('admin.noVisitsText')"
          />
          <ul v-else class="admin-visits">
            <li v-for="visit in dashboard.today" :key="visit.id">
              <time :datetime="visit.starts_at">{{
                timeLabel(visit.starts_at, locale)
              }}</time
              ><span class="admin-patient">{{ visit.name }}</span
              ><AdminStatusBadge :status="visit.status" />
            </li>
          </ul>
          <p class="admin-footnote">
            {{ t("admin.visitListNote", { limit: PAGE_LIMIT }) }}
          </p>
        </section>
        <section
          class="admin-panel admin-configuration"
          aria-labelledby="admin-booking-title"
        >
          <header class="admin-panel-heading">
            <h2 id="admin-booking-title">{{ t("admin.bookingSetup") }}</h2>
          </header>
          <p v-if="!dashboard.settings" class="admin-note">
            {{ t("admin.settingsUnavailable") }}
          </p>
          <dl v-else class="admin-settings">
            <div>
              <dt>{{ t("admin.confirmation") }}</dt>
              <dd>{{ t(`admin.${dashboard.settings.confirmation_mode}`) }}</dd>
            </div>
            <div>
              <dt>{{ t("admin.horizon") }}</dt>
              <dd>
                {{
                  t("admin.days", {
                    count: dashboard.settings.booking_horizon_days,
                  })
                }}
              </dd>
            </div>
            <div>
              <dt>{{ t("admin.advance") }}</dt>
              <dd>
                {{
                  t("admin.minutes", {
                    count: dashboard.settings.minimum_advance_minutes,
                  })
                }}
              </dd>
            </div>
            <div>
              <dt>{{ t("admin.intervals") }}</dt>
              <dd>
                {{
                  t("admin.minutes", {
                    count: dashboard.settings.slot_interval_minutes,
                  })
                }}
              </dd>
            </div>
          </dl>
          <div class="admin-attention">
            <h3>{{ t("admin.needsAttention") }}</h3>
            <ul>
              <li v-for="warning in warnings" :key="warning">
                {{ t(`admin.${warning}`) }}
              </li>
            </ul>
          </div>
          <p class="admin-footnote">{{ t("admin.readOnlySettings") }}</p>
        </section>
      </div>
      <div class="admin-overview-columns admin-secondary">
        <section class="admin-panel">
          <header class="admin-panel-heading">
            <h2>{{ t("admin.recentActivity") }}</h2>
          </header>
          <AdminEmptyState
            :title="t('admin.notAvailable')"
            :description="t('admin.activityUnknown')"
          />
        </section>
        <section class="admin-panel">
          <header class="admin-panel-heading">
            <h2>{{ t("admin.nav.messages") }}</h2>
          </header>
          <AdminEmptyState
            :title="t('admin.notAvailable')"
            :description="t('admin.messagesUnknown')"
          />
        </section>
      </div>
      <footer class="admin-dashboard-footer">
        <p v-if="dashboard.checkedAt">
          {{
            t("admin.checkedAt", {
              time: timeLabel(dashboard.checkedAt, locale),
            })
          }}
        </p>
        <RouterLink to="/">{{ t("admin.website") }}</RouterLink>
      </footer>
    </template>
  </section>
</template>
<style scoped>
.admin-refresh {
  min-height: 44px;
  padding: 10px 18px;
  background: var(--olive);
  color: var(--white);
  border: 1px solid var(--olive);
  font-size: 12px;
}
.admin-refresh:disabled {
  opacity: 0.6;
  cursor: wait;
}
.admin-stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  margin: 28px 0;
}
.admin-overview-columns {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr);
  gap: 24px;
}
.admin-panel {
  min-width: 0;
  border-top: 1px solid var(--line);
  padding-top: 22px;
}
.admin-panel-heading {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px 14px;
}
.admin-panel-heading h2 {
  font: 400 29px/1.2 var(--serif);
}
.admin-panel-heading > span,
.admin-footnote,
.admin-dashboard-footer {
  font-size: 11px;
  line-height: 1.7;
  color: #646e60;
}
.admin-footnote {
  margin-top: 18px;
}
.admin-visits {
  padding: 0;
  margin: 20px 0;
  list-style: none;
}
.admin-visits li {
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  padding: 16px 0;
  border-bottom: 1px solid var(--line);
  font-size: 13px;
}
.admin-visits time {
  font-variant-numeric: tabular-nums;
  font-size: 12px;
}
.admin-patient {
  overflow-wrap: anywhere;
}
.admin-settings {
  margin-top: 18px;
}
.admin-settings > div {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 6px 18px;
  padding: 8px 0;
  font-size: 12px;
  line-height: 1.6;
}
.admin-settings dt {
  color: #646e60;
}
.admin-settings dd {
  margin: 0;
  font-weight: 500;
}
.admin-note {
  font-size: 13px;
  line-height: 1.7;
  margin-top: 18px;
}
.admin-attention {
  margin-top: 22px;
  border-left: 2px solid #9a7545;
  background: #f0ece2;
  padding: 16px 18px;
}
.admin-attention h3 {
  font-size: 12px;
  font-weight: 500;
  margin-bottom: 8px;
}
.admin-attention ul {
  margin: 0;
  padding-left: 16px;
  font-size: 12px;
  line-height: 1.7;
}
.admin-attention li + li {
  margin-top: 8px;
}
.admin-secondary {
  margin-top: 30px;
}
.admin-dashboard-footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-top: 1px solid var(--line);
  padding-top: 18px;
  margin-top: 12px;
}
.admin-dashboard-footer a {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  text-decoration: underline;
  text-underline-offset: 4px;
}
@media (max-width: 1350px) {
  .admin-stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 800px) {
  .admin-overview-columns {
    grid-template-columns: minmax(0, 1fr);
  }
}
@media (max-width: 450px) {
  .admin-stats {
    grid-template-columns: minmax(0, 1fr);
  }
  .admin-visits li {
    grid-template-columns: 45px minmax(0, 1fr);
  }
  .admin-visits li :deep(.admin-status) {
    grid-column: 2;
    justify-self: start;
  }
}
</style>
