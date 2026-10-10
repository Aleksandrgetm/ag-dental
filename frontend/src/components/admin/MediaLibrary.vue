<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch, useId } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
import { useAuthStore } from "../../stores/auth";
import { mediaAssets, documents } from "../../services/cms/catalog";
import { cmsDestinations } from "../../services/cms/navigation";
import { API_URL } from "../../services/api";
import { publicMediaURL } from "../../services/cms/mediaReference";
import {
  mediaRequest,
  uploadMedia,
  loadMediaPreview,
  mediaPreviews,
  clearMediaPreviews,
  checkFile,
  filterMedia,
  selectableMedia,
  safeMediaError,
  type MediaAsset,
} from "../../services/cms/media";
const props = defineProps<{ picker?: boolean }>();
const emit = defineEmits<{ select: [asset: MediaAsset]; close: [] }>();
const { t, locale } = useI18n(),
  route = useRoute(),
  router = useRouter(),
  auth = useAuthStore(),
  inputID = useId();
const fallback = (): MediaAsset[] =>
  mediaAssets.map((a) => ({
    id: a.id,
    url: a.url,
    protected: a.protected,
    origin: "registered",
    state: "ready",
    usages: [],
    metadata: { ...a },
  }));
const assets = ref<MediaAsset[]>(fallback()),
  enabled = ref(false),
  loading = ref(false),
  error = ref(""),
  notice = ref("");
const search = ref(""),
  kind = ref(props.picker ? "image" : ""),
  use = ref(""),
  origin = ref(""),
  selected = ref<string | null>(null);
const filtered = computed(() =>
  filterMedia(assets.value, search.value, kind.value, use.value, origin.value),
);
const limit = ref(24);
const visible = computed(() => filtered.value.slice(0, limit.value));
watch([search, kind, use, origin], () => (limit.value = 24));
watch(visible, (rows) => void thumbnails(rows));
const routeID = computed(() =>
  props.picker ? selected.value : route.path.split("/")[3] || null,
);
const detail = computed(() => assets.value.find((a) => a.id === routeID.value));
const selection = ref<File>(),
  localURL = ref(""),
  alt = ref<Record<string, string>>({ lv: "", ru: "", en: "" }),
  key = ref(""),
  progress = ref(0),
  uploading = ref(false);
const fileInput = ref<HTMLInputElement>(),
  heading = ref<HTMLElement>();
let controller: AbortController | undefined,
  alive = true,
  loadSerial = 0;
const imageSrc = (a: MediaAsset, large = false) =>
  a.protected
    ? ""
    : a.origin === "upload"
      ? mediaPreviews[a.url + (large ? "/display.webp" : "/thumb.webp")]
      : a.url.startsWith("/media/") && a.metadata.kind === "image"
        ? a.url
        : "";
const description = (a: MediaAsset) =>
  a.metadata.alt?.[locale.value] || a.metadata.filename;
const canArchive = (a: MediaAsset) =>
  a.origin === "upload" &&
  !a.protected &&
  !a.published_at &&
  !a.usages.length &&
  ["ready", "failed"].includes(a.state);
const targetLinks = computed(() =>
  cmsDestinations
    .filter((d) =>
      d.section?.parts.some((p) => {
        const doc = documents.find((x) => x.key === p.key);
        return doc?.fields.some(
          (f) =>
            ["media", "image-key"].includes(f.type) &&
            !f.locked &&
            !f.system_managed &&
            (!p.prefixes ||
              p.prefixes.some((prefix) =>
                f.path
                  .filter((k) => !["lv", "ru", "en"].includes(k))
                  .join(".")
                  .startsWith(prefix),
              )),
        );
      }),
    )
    .filter((d) => ["pages", "services", "news"].includes(d.group)),
);
function title(value: any) {
  return value?.[locale.value] || value?.lv || "";
}
function usageTitle(key: string) {
  return title(documents.find((d) => d.key === key)?.title) || key;
}
function groupTitle(group: string) {
  return t(
    group === "home"
      ? "nav.home"
      : group === "about"
        ? "nav.about"
        : group === "other"
          ? "cms.other"
          : "admin.nav." + group,
  );
}
function usageLocations(asset: MediaAsset) {
  return [
    ...new Set(
      asset.usages.length
        ? asset.usages.map((u) => usageTitle(u.document))
        : (asset.metadata.usage_groups || []).map(groupTitle),
    ),
  ].join(" · ");
}
async function thumbnails(rows: MediaAsset[]) {
  for (let i = 0; i < rows.length; i += 4) {
    if (!alive || !auth.verifiedAdmin) return;
    await Promise.all(
      rows.slice(i, i + 4).map((a) => loadMediaPreview(a).catch(() => {})),
    );
  }
}
async function load() {
  const seq = ++loadSerial;
  loading.value = true;
  error.value = "";
  try {
    const result = await mediaRequest();
    if (!alive || seq !== loadSerial) return;
    assets.value = result.assets;
    enabled.value = result.upload_enabled;
    void thumbnails(visible.value);
  } catch (e) {
    if (alive && seq === loadSerial) {
      enabled.value = false;
      error.value = safeMediaError((e as Error).message);
    }
  } finally {
    if (alive && seq === loadSerial) loading.value = false;
  }
}
function open(a: MediaAsset) {
  if (props.picker) selected.value = a.id;
  else void router.push("/admin/media/" + a.id);
}
function back() {
  if (props.picker) selected.value = null;
  else void router.push("/admin/media");
}
watch(detail, async (a) => {
  if (!a) return;
  await loadMediaPreview(a, "display.webp").catch(() => {});
  heading.value?.focus();
  if (a.metadata.kind === "video") {
    const video = a.metadata.variants?.find((v) => v.name.startsWith("video."));
    if (video) await loadMediaPreview(a, video.name).catch(() => {});
  }
});
function resetFile() {
  if (localURL.value) URL.revokeObjectURL(localURL.value);
  localURL.value = "";
  selection.value = undefined;
  key.value = "";
  if (fileInput.value) fileInput.value.value = "";
}
function choose(files: FileList | null) {
  if (uploading.value || !files?.length) return;
  error.value = "";
  notice.value = "";
  if (files.length !== 1 || checkFile(files[0]!)) {
    error.value = "invalid_file";
    return;
  }
  const file = files[0]!;
  resetFile();
  selection.value = file;
  localURL.value = URL.createObjectURL(file);
  key.value = crypto.randomUUID();
  progress.value = 0;
}
async function upload() {
  if (!selection.value || uploading.value || !enabled.value) return;
  if (Object.values(alt.value).some((v) => !v.trim() || v.length > 300)) {
    error.value = "invalid_file";
    return;
  }
  controller = new AbortController();
  uploading.value = true;
  error.value = "";
  notice.value = "";
  progress.value = 0;
  try {
    const result = await uploadMedia(
      selection.value,
      alt.value,
      key.value,
      (n) => (progress.value = n),
      controller.signal,
    );
    if (!alive) return;
    notice.value = t(result.duplicate ? "media.duplicate" : "media.ready");
    resetFile();
    assets.value = [
      result.asset,
      ...assets.value.filter((a) => a.id !== result.asset.id),
    ];
    void thumbnails([result.asset]);
    open(result.asset);
  } catch (e) {
    if (alive) error.value = safeMediaError((e as Error).message);
  } finally {
    if (alive) uploading.value = false;
  }
}
async function select(a: MediaAsset) {
  if (!selectableMedia(a)) return;
  await loadMediaPreview(a, "display.webp").catch(() => {});
  emit("select", a);
}
async function copy(a: MediaAsset) {
  const url =
    a.origin === "upload"
      ? publicMediaURL(API_URL, a.url)
      : new URL(a.url, window.location.origin).href;
  if (!url) return;
  try {
    await navigator.clipboard.writeText(
      new URL(url, window.location.origin).href,
    );
    notice.value = t("media.copied");
  } catch {
    error.value = "media_unavailable";
  }
}
async function archive(a: MediaAsset, remove = false) {
  if (
    !window.confirm(t(remove ? "media.removeConfirm" : "media.archiveConfirm"))
  )
    return;
  error.value = "";
  try {
    await mediaRequest(
      "/" + a.id + (remove ? "" : "/archive"),
      remove ? "DELETE" : "POST",
    );
    await load();
    if (remove) back();
  } catch (e) {
    error.value = safeMediaError((e as Error).message);
  }
}
watch(
  () => auth.user?.id,
  () => {
    clearMediaPreviews();
    controller?.abort();
    resetFile();
    assets.value = fallback();
  },
);
watch(
  () => auth.adminStatus,
  (state) => {
    if (["guest", "user", "forbidden", "unauthorized"].includes(state)) {
      clearMediaPreviews();
      controller?.abort();
      resetFile();
      assets.value = fallback();
    }
  },
);
onMounted(load);
onBeforeUnmount(() => {
  alive = false;
  loadSerial++;
  controller?.abort();
  resetFile();
});
</script>
<template>
  <div class="media-library" :aria-busy="loading">
    <div class="media-heading">
      <div>
        <h2>{{ t("media.title") }}</h2>
        <p>{{ t("media.intro") }}</p>
      </div>
      <button v-if="picker" type="button" @click="emit('close')">
        {{ t("media.close") }}
      </button>
    </div>
    <p v-if="!enabled && !loading" class="media-notice">
      {{ t("media.unavailable") }}
    </p>
    <p v-if="error" class="media-error" role="alert">
      {{ t("media." + error) }}
      <button type="button" @click="load">{{ t("media.reload") }}</button>
    </p>
    <p class="media-feedback" role="status" aria-live="polite">{{ notice }}</p>
    <details
      v-if="enabled"
      class="media-upload"
      :open="!!selection"
      @dragover.prevent
      @drop.prevent="choose($event.dataTransfer?.files || null)"
    >
      <summary>{{ t("media.upload") }}</summary>
      <p>{{ t("media.drop") }}</p>
      <p>{{ t("media.limits") }}</p>
      <label :for="inputID" class="media-file-label">{{
        t("media.choose")
      }}</label
      ><input
        :id="inputID"
        ref="fileInput"
        type="file"
        accept=".jpg,.jpeg,.png,.webp,.avif,.mp4,.webm"
        :disabled="uploading"
        @change="choose(($event.target as HTMLInputElement).files)"
      />
      <template v-if="selection">
        <p>{{ selection.name }} · {{ Math.ceil(selection.size / 1024) }} KB</p>
        <video
          v-if="/\.(mp4|webm)$/i.test(selection.name)"
          :src="localURL"
          controls
          preload="metadata"
          playsinline
        />
        <img v-else :src="localURL" alt="" class="media-upload-preview" />
        <p>{{ t("media.altHelp") }}</p>
        <div class="media-alt-fields">
          <label v-for="lang in ['lv', 'ru', 'en']" :key="lang"
            >{{ t("media.alt") }} · {{ lang.toUpperCase()
            }}<textarea
              v-model="alt[lang]"
              :lang="lang"
              maxlength="300"
              rows="2"
              :disabled="uploading"
              required
            />
          </label>
        </div>
        <template v-if="uploading"
          ><progress
            :value="progress"
            max="100"
            :aria-label="t('media.upload')"
          />
          <p role="status">
            {{ progress < 100 ? progress + "%" : t("media.processing") }}
          </p>
          <button type="button" @click="controller?.abort()">
            {{ t("media.cancel") }}
          </button></template
        >
        <button v-else type="button" class="media-primary" @click="upload">
          {{ t(error ? "media.retry" : "media.start") }}
        </button>
        <p>{{ t("media.saveFirst") }}</p>
      </template>
    </details>
    <section
      v-if="detail"
      class="cms-media-detail media-detail"
      aria-live="polite"
    >
      <button type="button" @click="back">{{ t("media.back") }}</button>
      <h3 ref="heading" tabindex="-1">{{ detail.metadata.filename }}</h3>
      <p v-if="detail.protected">{{ t("media.protectedNote") }}</p>
      <template v-else
        ><video
          v-if="detail.metadata.kind === 'video' && detail.origin === 'upload'"
          :src="
            mediaPreviews[
              detail.url +
                '/' +
                detail.metadata.variants?.find((v) =>
                  v.name.startsWith('video.'),
                )?.name
            ]
          "
          :poster="imageSrc(detail, true)"
          controls
          playsinline
          preload="metadata" /><img
          v-else-if="imageSrc(detail, true)"
          :src="imageSrc(detail, true)"
          :alt="description(detail)"
      /></template>
      <dl>
        <div>
          <dt>{{ t("media.type") }}</dt>
          <dd>
            {{ detail.metadata.filename.split(".").at(-1)?.toUpperCase() }}
          </dd>
        </div>
        <div>
          <dt>{{ t("media.dimensions") }}</dt>
          <dd>
            {{
              detail.metadata.width
                ? `${detail.metadata.width} × ${detail.metadata.height}`
                : t("media.unknown")
            }}
          </dd>
        </div>
        <div>
          <dt>{{ t("media.size") }}</dt>
          <dd>{{ Math.ceil(detail.metadata.bytes / 1024) }} KB</dd>
        </div>
        <div>
          <dt>{{ t("media.date") }}</dt>
          <dd>
            {{
              detail.origin === "upload" && detail.created_at
                ? new Intl.DateTimeFormat(locale).format(
                    new Date(detail.created_at),
                  )
                : t("media.unknown")
            }}
          </dd>
        </div>
        <div v-if="detail.metadata.duration">
          <dt>{{ t("media.duration") }}</dt>
          <dd>{{ Math.round(detail.metadata.duration) }} s</dd>
        </div>
      </dl>
      <p>
        {{
          t(
            detail.protected
              ? "media.protected"
              : detail.state === "archived"
                ? "media.archived"
                : detail.origin === "registered"
                  ? "media.registeredNote"
                  : detail.published_at
                    ? "media.published"
                    : "media.private",
          )
        }}
      </p>
      <p
        v-for="lang in ['lv', 'ru', 'en']"
        v-show="detail.metadata.alt?.[lang]"
        :key="lang"
        :lang="lang"
      >
        <strong>{{ t("media.alt") }} · {{ lang.toUpperCase() }}</strong>
        {{ detail.metadata.alt?.[lang] }}
      </p>
      <ul>
        <li
          v-for="u in detail.usages"
          :key="u.document + u.path + u.published + u.draft"
        >
          {{ usageTitle(u.document) }} · {{ u.path }} ·
          {{
            t(
              u.published
                ? "media.publishedUsage"
                : u.draft
                  ? "media.draft"
                  : "media.historyUsage",
            )
          }}
        </li>
        <li v-for="group in detail.metadata.usage_groups" :key="group">
          {{ groupTitle(group) }}
        </li>
      </ul>
      <div class="media-actions">
        <button
          v-if="picker && selectableMedia(detail)"
          type="button"
          class="media-primary"
          @click="select(detail)"
        >
          {{ t("media.select") }}</button
        ><button
          v-if="
            !detail.protected &&
            (detail.published_at ||
              (detail.origin === 'registered' &&
                detail.url.startsWith('/media/')))
          "
          type="button"
          @click="copy(detail)"
        >
          {{ t("media.copy") }}</button
        ><button
          v-if="enabled && canArchive(detail)"
          type="button"
          @click="archive(detail)"
        >
          {{ t("media.archive") }}</button
        ><button
          v-if="
            enabled &&
            !detail.protected &&
            detail.origin === 'upload' &&
            detail.state === 'archived'
          "
          type="button"
          @click="archive(detail, true)"
        >
          {{ t("media.remove") }}
        </button>
      </div>
      <p v-if="detail.metadata.kind === 'video' && !detail.protected">
        {{ t("media.noVideoSlot") }}
      </p>
      <details v-if="!picker && selectableMedia(detail)">
        <summary>{{ t("media.locations") }}</summary>
        <p>{{ t("media.locationHint") }}</p>
        <ul class="media-locations">
          <li v-for="target in targetLinks" :key="target.path">
            <RouterLink :to="target.path"
              >{{ target.pagePath || t("admin.nav." + target.group) }} ·
              {{ title(target.section?.title) }}</RouterLink
            >
          </li>
        </ul>
      </details>
    </section>
    <p v-else-if="routeID && !loading" role="alert">
      {{ t("media.media_missing") }}
      <button type="button" @click="back">{{ t("media.back") }}</button>
    </p>
    <div class="media-filters cms-search">
      <label
        >{{ t("media.search") }}<input v-model="search" type="search" /></label
      ><label
        >{{ t("media.type")
        }}<select v-model="kind">
          <option v-if="!picker" value="">{{ t("media.all") }}</option>
          <option value="image">{{ t("media.images") }}</option>
          <option v-if="!picker" value="video">{{ t("media.videos") }}</option>
        </select></label
      ><label
        >{{ t("media.usage")
        }}<select v-model="use">
          <option value="">{{ t("media.all") }}</option>
          <option value="used">{{ t("media.used") }}</option>
          <option value="unused">{{ t("media.unused") }}</option>
        </select></label
      ><label
        >{{ t("media.origin")
        }}<select v-model="origin">
          <option value="">{{ t("media.all") }}</option>
          <option value="registered">{{ t("media.registered") }}</option>
          <option value="upload">{{ t("media.uploaded") }}</option>
        </select></label
      >
    </div>
    <p v-if="!filtered.length">{{ t("media.empty") }}</p>
    <div class="cms-media media-grid">
      <button
        v-for="asset in visible"
        :key="asset.id"
        type="button"
        class="cms-media-tile media-tile"
        :data-media-id="asset.id"
        :aria-label="t('media.details') + ': ' + asset.metadata.filename"
        @click="open(asset)"
      >
        <img
          v-if="imageSrc(asset)"
          :src="imageSrc(asset)"
          alt=""
          loading="lazy"
        /><span v-else class="media-placeholder">{{
          asset.protected
            ? t("media.protected")
            : asset.metadata.kind === "video"
              ? t("media.videos")
              : asset.metadata.filename.split(".").at(-1)?.toUpperCase()
        }}</span
        ><strong>{{ asset.metadata.filename }}</strong
        ><span
          >{{ asset.metadata.filename.split(".").at(-1)?.toUpperCase() }} ·
          {{ Math.ceil(asset.metadata.bytes / 1024) }} KB<span
            v-if="asset.metadata.width"
          >
            · {{ asset.metadata.width }} × {{ asset.metadata.height }}</span
          ></span
        ><small>{{
          t(
            asset.protected
              ? "media.protected"
              : asset.state === "archived"
                ? "media.archived"
                : asset.origin === "registered"
                  ? "media.registered"
                  : asset.published_at
                    ? "media.published"
                    : "media.private",
          )
        }}</small
        ><small>{{
          asset.usages.length || asset.metadata.usages?.length
            ? t("media.used")
            : t("media.unused")
        }}</small>
        <small v-if="usageLocations(asset)">{{ usageLocations(asset) }}</small>
        <small v-if="asset.origin === 'upload' && asset.created_at"
          >{{ t("media.date") }} ·
          {{
            new Intl.DateTimeFormat(locale).format(new Date(asset.created_at))
          }}</small
        >
      </button>
    </div>
    <button
      v-if="visible.length < filtered.length"
      type="button"
      @click="limit += 24"
    >
      {{ t("media.more") }}
    </button>
  </div>
</template>
<style scoped>
.media-library {
  min-width: 0;
  color: var(--ink);
  font-size: 14px;
  line-height: 1.65;
}
.media-heading {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  align-items: start;
}
.media-heading h2 {
  font: 400 32px/1.2 var(--serif);
  margin-bottom: 12px;
}
.media-library button,
.media-library summary,
.media-file-label {
  cursor: pointer;
  min-height: 44px;
  padding: 10px 12px;
  text-align: left;
}
.media-library button {
  border: 1px solid var(--line);
  background: transparent;
  color: inherit;
}
.media-library button:hover {
  background: var(--cream);
}
.media-library :focus-visible {
  outline: 2px solid var(--olive);
  outline-offset: 3px;
}
.media-library .media-primary {
  background: var(--olive);
  color: white;
  border-color: var(--olive);
}
.media-library input,
.media-library select,
.media-library textarea {
  display: block;
  max-width: 100%;
  width: 100%;
  min-height: 44px;
  border: 1px solid var(--line);
  padding: 10px;
  background: var(--white);
  color: inherit;
  font: inherit;
}
.media-library label {
  display: block;
}
.media-filters {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr;
  gap: 16px;
  margin: 28px 0;
}
.media-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 210px), 1fr));
  gap: 20px;
}
.media-tile {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
  overflow-wrap: anywhere;
}
.media-tile img,
.media-placeholder {
  width: 100%;
  height: 170px;
  object-fit: cover;
  background: #edf0e7;
}
.media-placeholder {
  display: grid;
  place-items: center;
  padding: 20px;
  text-align: center;
}
.media-tile small {
  color: var(--muted);
}
.media-detail {
  margin: 20px 0;
  padding: 24px 0;
  border-block: 1px solid var(--line);
}
.media-detail h3 {
  font: 400 30px/1.25 var(--serif);
  overflow-wrap: anywhere;
  margin: 20px 0;
}
.media-detail img,
.media-detail video,
.media-upload img,
.media-upload video {
  max-width: 100%;
  width: auto;
  max-height: 420px;
  object-fit: contain;
  display: block;
  margin: 16px 0;
}
.media-detail dl {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
  margin: 20px 0;
}
.media-detail dt {
  color: var(--muted);
  font-size: 12px;
}
.media-detail dd {
  margin: 0;
}
.media-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin: 20px 0;
}
.media-upload {
  padding: 20px;
  border: 1px dashed var(--line);
  margin-bottom: 24px;
}
.media-upload summary {
  font-weight: 600;
}
.media-upload input[type="file"] {
  border: 0;
  padding: 0;
}
.media-alt-fields {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  margin: 16px 0;
}
.media-feedback {
  min-height: 26px;
  margin: 10px 0;
}
.media-error,
.media-notice {
  padding: 12px 0;
  border-block: 1px solid var(--line);
}
.media-error {
  color: #8b3838;
}
.media-locations {
  max-height: 300px;
  overflow: auto;
  padding-left: 20px;
}
.media-locations a {
  display: block;
  min-height: 44px;
  padding: 10px 0;
  text-decoration: underline;
  text-underline-offset: 4px;
}
.media-library progress {
  display: block;
  width: 100%;
  height: 12px;
  accent-color: var(--olive);
}
@media (max-width: 700px) {
  .media-filters {
    grid-template-columns: 1fr 1fr;
  }
  .media-filters label:first-child {
    grid-column: 1/-1;
  }
  .media-detail dl {
    grid-template-columns: 1fr 1fr;
  }
  .media-alt-fields {
    grid-template-columns: 1fr;
  }
  .media-upload {
    padding: 14px;
  }
  .media-actions {
    flex-direction: column;
  }
  .media-heading h2 {
    font-size: 28px;
  }
  .media-grid {
    gap: 12px;
  }
}
@media (prefers-reduced-motion: reduce) {
  * {
    scroll-behavior: auto;
  }
}
</style>
