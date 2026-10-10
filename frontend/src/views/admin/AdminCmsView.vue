<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";
import {
  onBeforeRouteLeave,
  onBeforeRouteUpdate,
  useRoute,
  useRouter,
} from "vue-router";
import { useI18n } from "vue-i18n";
import MediaLibrary from "../../components/admin/MediaLibrary.vue";
import {
  mediaRequest,
  loadMediaPreview,
  clearMediaPreviews,
  type MediaAsset,
} from "../../services/cms/media";
import CmsNavigator from "../../components/admin/CmsNavigator.vue";
import CmsContentPreview from "../../components/admin/CmsContentPreview.vue";
import {
  findDoc,
  visibleFields,
  imageURL,
  type Doc,
  type Section,
  type Part,
} from "../../services/cms/catalog";
import { cmsRequest } from "../../services/cms/admin";
import {
  valueAt,
  writeAt,
  refreshPublished,
  localizedPrices,
} from "../../services/cms/content";
import AdminPageHeader from "../../components/admin/AdminPageHeader.vue";
import { useAuthStore } from "../../stores/auth";
import { useCmsNavigationStore } from "../../stores/cmsNavigation";
import {
  cmsSelection,
  sectionDestination,
} from "../../services/cms/navigation";
const auth = useAuthStore(),
  navigation = useCmsNavigationStore();
const route = useRoute(),
  router = useRouter(),
  { t, locale } = useI18n();
const group = computed(() => String(route.meta.adminSection));
const destination = computed(() => cmsSelection(route.path, route.query.part));
const missing = ref(false);
const picker = ref<HTMLDialogElement>();
const replaceField = ref<any>(null);
function showPicker(field: any) {
  replaceField.value = field;
  picker.value?.showModal();
}
function closePicker() {
  picker.value?.close();
  replaceField.value = null;
}
function useImage(asset: MediaAsset) {
  if (!replaceField.value) return;
  if (
    selected.value?.key === "clinic.media" &&
    !window.confirm(t("media.confirmShared"))
  )
    return;
  update(replaceField.value.path, asset.url);
  closePicker();
}
async function previews() {
  const refs = JSON.stringify([payload.value, currentImages.value]).match(
    /cms-media:upload\.[a-f0-9]{32}/g,
  );
  if (!refs?.length) return;
  try {
    const library = await mediaRequest();
    await Promise.all(
      library.assets
        .filter((a: MediaAsset) => refs.includes(a.url))
        .map((a: MediaAsset) =>
          loadMediaPreview(a, "display.webp").catch(() => {}),
        ),
    );
  } catch {}
}
let catalogReady = false,
  catalogRequest: Promise<void> | undefined,
  routeSerial = 0;
let discardAt = "",
  previewAt = "";
const activeSection = ref<Section | null>(null),
  activePart = ref<Part | undefined>(),
  states = ref<any[]>([]),
  refresh = ref(0);
const editorHeading = ref<HTMLElement>();
const imageMappings = ref(findDoc("clinic.media")!.data);
const currentImages = computed(() =>
  selected.value?.key === "clinic.media" ? payload.value : imageMappings.value,
);
const editingLanguage = ref(locale.value),
  selected = ref<Doc | null>(null),
  payload = ref<any>(null),
  saved = ref(""),
  version = ref(0),
  draftID = ref<string | null>(null),
  publication = ref<string | null>(null),
  history = ref<any[]>([]),
  bookingLinks = ref<any[]>([]),
  registered = ref<string[]>([]),
  busy = ref(false),
  error = ref(""),
  notice = ref(""),
  preview = ref(false),
  previewPayload = ref<any>(null),
  loaded = ref(false);
let controller = new AbortController(),
  serial = 0;
const label = (v: any) => v?.[locale.value] || v?.lv || "";
const dirty = computed(
  () => payload.value && JSON.stringify(payload.value) !== saved.value,
);
const canWrite = computed(
  () =>
    !!selected.value &&
    !selected.value.locked &&
    loaded.value &&
    version.value > 0 &&
    !busy.value &&
    auth.verifiedAdmin,
);
const fields = computed(() =>
  selected.value
    ? visibleFields(selected.value, editingLanguage.value, activePart.value)
    : [],
);
const clone = (v: any) => JSON.parse(JSON.stringify(v));
const imageFields = computed(() =>
  fields.value.filter((f) => ["media", "image-key"].includes(f.type)),
);
function friendlyLabel(f: any) {
  if (f.label.en !== "Text") return label(f.label);
  const path = f.path.join(".");
  if (/label|eyebrow/i.test(path)) return t("cms.sectionLabel");
  if (/title|headline|heading/i.test(path)) return t("cms.titleLabel");
  if (/text|description|aside|intro/i.test(path)) return t("cms.description");
  return t("cms.fieldLabel");
}
function partTitle(p: Part) {
  const doc = findDoc(p.key)!;
  if (doc.key === "messages.home") return t("cms.text");
  if (doc.key === "clinic.media") return t("cms.image");
  return label(doc.title);
}
async function openSection(section: Section, showPreview = false) {
  const target = sectionDestination(
    group.value,
    section,
    destination.value?.pagePath,
  );
  if (!target) return;
  previewAt = showPreview ? target.path : "";
  await router.push(target.path);
}
async function openPart(p: Part) {
  await router.push({ path: route.path, query: { part: p.key } });
}
function back() {
  void router.push(destination.value?.parent || "/admin/" + group.value);
}
function leave() {
  return !auth.verifiedAdmin || !dirty.value || window.confirm(t("cms.leave"));
}
function reset() {
  busy.value = false;
  draftID.value = null;
  publication.value = null;
  previewPayload.value = null;
  selected.value = null;
  payload.value = null;
  saved.value = "";
  history.value = [];
  bookingLinks.value = [];
  loaded.value = false;
  version.value = 0;
  preview.value = false;
  notice.value = "";
  error.value = "";
}
async function catalog() {
  try {
    const result = await cmsRequest("", controller.signal);
    if (controller.signal.aborted) return;
    states.value = result.documents;
    registered.value = result.documents.map((d: any) => d.key);
    catalogReady = true;
    if (registered.value.includes("clinic.media")) {
      const mediaResult = await cmsRequest("/clinic.media", controller.signal);
      imageMappings.value =
        mediaResult.revisions.find(
          (r: any) =>
            r.id ===
            (mediaResult.document.draft_revision ||
              mediaResult.document.published_revision),
        )?.payload || findDoc("clinic.media")!.data;
    }
  } catch {
    /* The approved baseline stays visible, explicitly read-only. */
  }
}
async function choose(doc: Doc) {
  if (doc.system_managed) return;
  const current = ++serial;
  reset();
  selected.value = doc;
  payload.value = clone(doc.data);
  saved.value = JSON.stringify(payload.value);
  if (!registered.value.includes(doc.key)) {
    if (catalogReady) missing.value = true;
    else error.value = "unavailable";
    return;
  }
  busy.value = true;
  try {
    const result = await cmsRequest(
      `/${encodeURIComponent(doc.key)}`,
      controller.signal,
    );
    if (current !== serial) return;
    const state = result.document;
    const chosen =
      result.revisions.find((r: any) => r.id === state.draft_revision) ||
      result.revisions.find((r: any) => r.id === state.published_revision);
    if (!chosen) throw Error("unavailable");
    payload.value = clone(chosen.payload);
    saved.value = JSON.stringify(payload.value);
    version.value = state.version;
    draftID.value = state.draft_revision;
    publication.value = state.published_revision;
    history.value = result.revisions;
    bookingLinks.value = Array.isArray(result.booking_links)
      ? result.booking_links
      : [];
    loaded.value = true;
    void previews();
  } catch (e) {
    if (current === serial) error.value = (e as Error).message;
  } finally {
    if (current === serial) busy.value = false;
  }
}
function update(path: string[], value: string) {
  writeAt(payload.value, path, value);
  if (selected.value?.key === "clinic.clinic" && path[0] === "phone")
    payload.value.tel = `tel:${value.replace(/[ ()-]/g, "")}`;
}
async function action(
  kind: "draft" | "publish" | "rollback",
  revision = draftID.value,
) {
  if (!selected.value || !canWrite.value) return;
  if (
    kind !== "draft" &&
    (dirty.value ||
      !revision ||
      !window.confirm(
        t(kind === "publish" ? "cms.confirmPublish" : "cms.confirmRestore") +
          (activePart.value?.prefixes
            ? "\n\n" + t("cms.scopedPublishNote")
            : ""),
      ))
  )
    return;
  busy.value = true;
  error.value = "";
  notice.value = "";
  const current = serial;
  try {
    const updated = await cmsRequest(
      `/${encodeURIComponent(selected.value.key)}/${kind}`,
      controller.signal,
      kind === "draft"
        ? { expected_version: version.value, payload: payload.value }
        : { expected_version: version.value, revision_id: revision },
      kind === "draft" ? "PUT" : "POST",
    );
    if (current !== serial) return;
    states.value = states.value.map((s) =>
      s.key === updated.key ? updated : s,
    );
    refresh.value++;
    const doc = selected.value;
    saved.value = JSON.stringify(payload.value);
    busy.value = false;
    await choose(doc);
    notice.value = t(kind === "draft" ? "cms.saved" : "cms.done");
    if (kind !== "draft") void refreshPublished();
  } catch (e) {
    if (current === serial) error.value = (e as Error).message;
  } finally {
    if (current === serial) busy.value = false;
  }
}
function fieldValue(f: any) {
  if (selected.value?.key.startsWith("service.") && f.path.at(-1) === "price") {
    const reference =
      "price_reference" in selected.value
        ? selected.value.price_reference
        : undefined;
    if (reference) {
      const amount =
        localizedPrices[reference[0]!]?.items[reference[1]!]?.price;
      return amount == null ? "" : String(amount).replace(/\.00(?=\/|$)/g, "");
    }
  }
  return valueAt(
    preview.value && previewPayload.value
      ? previewPayload.value
      : payload.value,
    f.path,
  );
}
function locked(f: any) {
  return !canWrite.value || f.locked || typeof fieldValue(f) !== "string";
}
function unload(e: BeforeUnloadEvent) {
  if (dirty.value) {
    e.preventDefault();
    e.returnValue = "";
  }
}
window.addEventListener("beforeunload", unload);
function beforeNavigation(
  to: { fullPath: string },
  from: { fullPath: string },
) {
  if (to.fullPath === from.fullPath) return true;
  if (!leave()) return false;
  discardAt = to.fullPath;
  return true;
}
onBeforeRouteLeave(beforeNavigation);
onBeforeRouteUpdate(beforeNavigation);
onBeforeUnmount(() => {
  serial++;
  routeSerial++;
  controller.abort();
  clearMediaPreviews();
  payload.value = null;
  history.value = [];
  bookingLinks.value = [];
  window.removeEventListener("beforeunload", unload);
});
async function syncRoute() {
  if (!auth.verifiedAdmin) return;
  const sequence = ++routeSerial;
  const target = destination.value;
  missing.value = !target;
  if (!target) {
    serial++;
    reset();
    return;
  }
  navigation.remember(route.path, route.fullPath);
  if (!catalogReady) {
    catalogRequest ||= catalog().finally(() => {
      catalogRequest = undefined;
    });
    await catalogRequest;
    if (sequence !== routeSerial || !auth.verifiedAdmin) return;
  }
  activeSection.value = target.section || null;
  activePart.value = target.part;
  if (!target.part) {
    serial++;
    reset();
    return;
  }
  const doc = findDoc(target.part.key)!;
  const discard = discardAt === route.fullPath;
  discardAt = "";
  if (selected.value?.key === doc.key && loaded.value && !discard) return;
  await choose(doc);
  if (sequence !== routeSerial) return;
  preview.value = previewAt === route.path;
  previewAt = "";
  await nextTick();
  editorHeading.value?.focus();
}
async function reload() {
  if (!leave()) return;
  catalogReady = false;
  loaded.value = false;
  await syncRoute();
}
watch(
  [() => route.fullPath, () => auth.verifiedAdmin],
  () => void syncRoute(),
  { immediate: true },
);
</script>
<template>
  <AdminPageHeader :title="t(`admin.nav.${group}`)" :intro="t('cms.intro')" />
  <p v-if="!registered.length" class="cms-notice" role="status">
    {{ t("cms.baseline") }}
  </p>
  <p v-if="group === 'services'" class="cms-note">{{ t("cms.catalogNote") }}</p>
  <p v-if="missing" class="cms-error" role="alert">
    {{ t("cms.editorMissing") }}
    <button class="cms-link" @click="back">{{ t("cms.back") }}</button>
  </p>
  <MediaLibrary v-if="group === 'media' && !missing" />
  <CmsNavigator
    v-if="group !== 'media'"
    v-show="!selected && !missing"
    :group="group"
    :states="states"
    :refresh="refresh"
    @open="openSection"
  />
  <section
    v-if="selected && !missing"
    class="cms-editor"
    :data-document="selected.key"
    :aria-busy="busy"
  >
    <button class="cms-link" @click="back">
      {{ t("cms.back") }}
    </button>
    <h2 ref="editorHeading" tabindex="-1">
      {{ label(activeSection?.title || selected.title) }}
    </h2>
    <p class="cms-note">{{ t("cms.partNote") }}</p>
    <nav
      v-if="activeSection && activeSection.parts.length > 1"
      class="cms-parts"
      :aria-label="t('cms.parts')"
    >
      <button
        v-for="p in activeSection.parts"
        :key="p.key"
        :aria-current="activePart?.key === p.key ? 'true' : undefined"
        @click="openPart(p)"
      >
        {{ partTitle(p) }}
      </button>
    </nav>
    <h3
      v-if="activeSection && activeSection.parts.length > 1"
      class="cms-part-title"
    >
      {{ partTitle(activePart!) }}
    </h3>
    <aside v-if="selected.key.startsWith('service.')" class="cms-notice">
      <h3>{{ t("cms.bookingSource") }}</h3>
      <p v-if="!loaded">{{ t("cms.unavailable") }}</p>
      <p v-else-if="!bookingLinks.length">{{ t("cms.noBookingLink") }}</p>
      <div v-for="(link, index) in bookingLinks" :key="index">
        <strong>{{ label(link.name) }}</strong>
        <p>
          {{ t(link.enabled ? "cms.bookingEnabled" : "cms.bookingDisabled") }} ·
          {{ t("cms.duration") }}:
          {{ link.duration_minutes ?? t("cms.unconfirmed") }}
        </p>
        <p>
          {{ t("cms.eligible") }}:
          {{
            link.doctors.map((d: any) => d.name).join(", ") ||
            t("cms.unconfirmed")
          }}
        </p>
      </div>
    </aside>
    <p v-if="selected.locked" class="cms-note">{{ t("cms.locked") }}</p>
    <p v-if="selected.key.includes('legal')" class="cms-note">
      {{ t("cms.review") }}
    </p>
    <div class="cms-languages" role="group" :aria-label="t('cms.language')">
      <button
        v-for="lang in ['lv', 'ru', 'en']"
        :key="lang"
        :aria-pressed="editingLanguage === lang"
        @click="editingLanguage = lang"
      >
        {{ lang.toUpperCase() }}
      </button>
    </div>
    <p
      v-if="!selected.fields.some((f) => f.locale === editingLanguage)"
      class="cms-note"
    >
      {{ t("cms.missing") }}
    </p>
    <p class="cms-feedback" role="status">
      {{
        busy ? t("cms.loading") : notice || t(dirty ? "cms.dirty" : "cms.clean")
      }}
    </p>
    <div v-if="error" class="cms-error" role="alert">
      {{
        t(
          `cms.${["invalid", "conflict"].includes(error) ? error : "unavailable"}`,
        )
      }}
      <button class="cms-link" @click="reload">
        {{ t("cms.reload") }}
      </button>
    </div>
    <form @submit.prevent="action('draft')">
      <div v-if="!preview" class="cms-fields">
        <label
          v-for="field in fields"
          :key="field.path.join('/')"
          class="cms-field"
          >{{ friendlyLabel(field)
          }}<small
            v-if="
              field.label.en === 'Text' &&
              friendlyLabel(field) === t('cms.fieldLabel')
            "
            >{{
              String(valueAt(selected.data, field.path) ?? "")
                .trim()
                .slice(0, 100)
            }}</small
          >
          <img
            v-if="
              ['media', 'image-key'].includes(field.type) &&
              imageURL(fieldValue(field), currentImages)
            "
            class="cms-field-image"
            :src="imageURL(fieldValue(field), currentImages)"
            :alt="t('cms.image')"
          />
          <div
            v-if="['media', 'image-key'].includes(field.type)"
            class="cms-image-replace"
          >
            <button
              type="button"
              :aria-label="t('media.replace')"
              :disabled="locked(field)"
              @click="showPicker(field)"
            >
              {{ t("media.replace") }}
            </button>
            <p class="cms-note">
              {{
                t(
                  selected.key === "clinic.media"
                    ? "media.shared"
                    : "media.local",
                )
              }}
            </p>
          </div>
          <textarea
            v-else-if="field.type === 'text'"
            :value="fieldValue(field)"
            :readonly="locked(field)"
            :disabled="busy"
            :rows="String(fieldValue(field)).length > 150 ? 5 : 2"
            maxlength="12000"
            :required="!locked(field)"
            @input="
              update(field.path, ($event.target as HTMLTextAreaElement).value)
            "
          />
          <input
            v-else
            :value="fieldValue(field)"
            :type="
              field.type === 'email'
                ? 'email'
                : field.type === 'date'
                  ? 'date'
                  : 'text'
            "
            :readonly="locked(field)"
            :disabled="busy"
            :required="!locked(field)"
            :pattern="
              field.type === 'price'
                ? '[0-9]+([.][0-9]{1,2})?(/[0-9]+([.][0-9]{1,2})?)*'
                : undefined
            "
            maxlength="12000"
            @input="
              update(field.path, ($event.target as HTMLInputElement).value)
            "
          />
          <span
            v-if="
              selected.key.startsWith('service.') &&
              field.path.at(-1) === 'price'
            "
            class="cms-note"
            >{{ t("cms.priceSource") }}</span
          >
          <span v-else-if="field.locked" class="cms-note">{{
            t("cms.readOnly")
          }}</span>
        </label>
      </div>
      <div v-else class="cms-preview" :lang="editingLanguage">
        <p class="cms-note">{{ t("cms.previewNote") }}</p>
        <CmsContentPreview
          :doc="selected"
          :data="previewPayload || payload"
          :language="editingLanguage"
          :part="activePart"
          :images="currentImages"
        />
      </div>
      <p v-if="imageFields.length && !preview" class="cms-note">
        {{ t("media.saveFirst") }}
      </p>
      <p v-if="activePart?.prefixes" class="cms-note">
        {{ t("cms.scopedPublishNote") }}
      </p>
      <div class="cms-actions">
        <button class="button" type="submit" :disabled="!canWrite || !dirty">
          {{ t(busy ? "cms.saving" : "cms.save") }}</button
        ><button
          class="cms-link"
          type="button"
          @click="
            () => {
              previewPayload = null;
              preview = !preview;
            }
          "
        >
          {{ t("cms.preview") }}</button
        ><button
          class="button"
          type="button"
          :disabled="!canWrite || dirty || draftID === publication"
          @click="action('publish')"
        >
          {{ t("cms.publish") }}
        </button>
      </div>
    </form>
    <dialog ref="picker" class="cms-media-picker" @cancel.prevent="closePicker">
      <MediaLibrary
        v-if="replaceField"
        picker
        @select="useImage"
        @close="closePicker"
      />
    </dialog>
    <details v-if="history.length" class="cms-history">
      <summary>{{ t("cms.history") }}</summary>
      <div v-for="revision in history" :key="revision.id">
        <time>{{ new Date(revision.created_at).toLocaleString(locale) }}</time
        ><span>{{
          revision.id === publication
            ? t("cms.publishedVersion")
            : revision.published_at
              ? t("cms.published")
              : t("cms.draft")
        }}</span
        ><button
          class="cms-link"
          :disabled="dirty || busy"
          @click="
            () => {
              previewPayload = clone(revision.payload);
              preview = true;
            }
          "
        >
          {{ t("cms.revisionPreview") }}</button
        ><button
          v-if="revision.published_at && revision.id !== publication"
          class="cms-link"
          :disabled="!canWrite || dirty"
          @click="action('rollback', revision.id)"
        >
          {{ t("cms.restore") }}
        </button>
      </div>
    </details>
  </section>
</template>
<style scoped>
.cms-media-picker {
  width: min(1120px, calc(100vw - 32px));
  max-height: 90dvh;
  margin: auto;
  padding: 24px;
  border: 1px solid var(--line);
  background: var(--white);
  color: var(--ink);
}
.cms-media-picker::backdrop {
  background: rgb(20 30 20 / 45%);
}
.cms-image-replace button {
  padding: 12px 16px;
  min-height: 44px;
  border: 1px solid var(--line);
  text-align: left;
}
@media (max-width: 500px) {
  .cms-media-picker {
    padding: 16px;
    width: calc(100vw - 16px);
  }
}
.cms-notice,
.cms-note {
  font-size: 13px;
  line-height: 1.7;
  color: var(--muted);
  margin: 16px 0;
}
.cms-notice {
  padding: 16px;
  border: 1px solid var(--line);
}
.cms-field input,
.cms-field textarea,
.cms-field select {
  display: block;
  width: 100%;
  min-height: 46px;
  border: 1px solid var(--line);
  background: var(--white);
  color: var(--ink);
  padding: 12px;
  margin-top: 8px;
  font: inherit;
  border-radius: 0;
}
.cms-parts {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 20px 0;
}
.cms-parts button {
  background: transparent;
  min-height: 44px;
  border: 1px solid var(--line);
  font-size: 12px;
  padding: 10px 14px;
  text-align: left;
  overflow-wrap: anywhere;
}
.cms-parts button[aria-current] {
  background: var(--sage);
  border-color: var(--olive);
}
.cms-part-title {
  font: 400 26px/1.2 var(--serif);
  margin: 24px 0;
}
.cms-field-image {
  display: block;
  width: 100%;
  max-width: 420px;
  height: 220px;
  object-fit: cover;
  margin: 16px 0;
}
.cms-editor {
  max-width: 1000px;
}
.cms-editor h2 {
  font: 400 38px/1.2 var(--serif);
  margin: 24px 0;
}
.cms-link {
  background: transparent;
  min-height: 44px;
  text-decoration: underline;
  text-underline-offset: 4px;
  font-size: 13px;
  padding: 10px 4px;
}
.cms-languages {
  display: flex;
  gap: 10px;
  margin: 24px 0;
}
.cms-languages button {
  background: transparent;
  min-width: 48px;
  min-height: 44px;
  border-bottom: 2px solid transparent;
}
.cms-languages button[aria-pressed="true"] {
  border-color: var(--ink);
}
.cms-fields {
  display: grid;
  gap: 24px;
}
.cms-field {
  display: block;
  font-size: 13px;
  line-height: 1.5;
}
.cms-field small {
  display: block;
  color: var(--muted);
  margin: 4px 0;
  overflow-wrap: anywhere;
}
.cms-field textarea {
  resize: vertical;
  line-height: 1.7;
}
.cms-field [readonly] {
  background: var(--paper);
  color: var(--muted);
}
.cms-actions {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
  border-top: 1px solid var(--line);
  padding-top: 24px;
  margin-top: 28px;
}
.cms-actions .button {
  font-size: 12px;
  min-height: 46px;
}
.cms-actions button:disabled {
  opacity: 0.45;
  cursor: default;
}
.cms-feedback {
  min-height: 48px;
  font-size: 13px;
  line-height: 1.7;
}
.cms-error {
  padding: 18px;
  border-left: 2px solid #87483d;
  background: #f4ebe5;
  font-size: 13px;
  line-height: 1.7;
}
.cms-history {
  border-top: 1px solid var(--line);
  margin-top: 32px;
  font-size: 13px;
}
.cms-history summary {
  padding: 20px 0;
  cursor: pointer;
}
.cms-history > div {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 16px;
  border-top: 1px solid var(--line);
  padding: 12px 0;
}
.cms-preview {
  padding: 24px;
  border: 1px solid var(--line);
}
.cms-preview p {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  margin: 14px 0;
  line-height: 1.7;
}
.cms-preview img {
  max-width: 100%;
}
input:focus-visible,
textarea:focus-visible,
select:focus-visible,
button:focus-visible {
  outline: 2px solid var(--olive);
  outline-offset: 3px;
}
@media (max-width: 700px) {
  .cms-actions {
    gap: 10px;
  }
  .cms-actions .button {
    width: 100%;
    justify-content: center;
  }
}
</style>
