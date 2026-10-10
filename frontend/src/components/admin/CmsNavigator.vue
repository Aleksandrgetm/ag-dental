<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { cmsDestination, cmsDestinations } from "../../services/cms/navigation";
import { useI18n } from "vue-i18n";
import {
  documents,
  pages,
  serviceDocs,
  priceDocs,
  newsDocs,
  settingsSections,
  findDoc,
  imageURL,
  docImage,
  visibleFields,
  valueAt,
  mediaAssets,
  type Section,
  type Doc,
} from "../../services/cms/catalog";
import { cmsRequest } from "../../services/cms/admin";
import CmsContentPreview from "./CmsContentPreview.vue";
const props = defineProps<{ group: string; states: any[]; refresh: number }>();
const emit = defineEmits<{ open: [section: Section, preview?: boolean] }>();
const { t, locale } = useI18n();
const route = useRoute(),
  router = useRouter();
const destination = computed(() => cmsDestination(route.path));
const pagePath = computed({
  get: () => destination.value?.pagePath || null,
  set: (path: string | null) => {
    void router.push(
      path
        ? cmsDestinations.find((d) => d.pagePath === path && !d.section)!.path
        : "/admin/pages",
    );
  },
});
const category = computed({
  get: () => findDoc(destination.value?.categoryKey || "") || null,
  set: (doc: Doc | null) => {
    void router.push(
      doc
        ? "/admin/services/" + encodeURIComponent(doc.key)
        : "/admin/services",
    );
  },
});
const detail = computed({
  get: () =>
    mediaAssets.find((a) => a.id === destination.value?.mediaID) || null,
  set: (asset: (typeof mediaAssets)[number] | null) => {
    void router.push(
      asset ? "/admin/media/" + encodeURIComponent(asset.id) : "/admin/media",
    );
  },
});
const search = ref(""),
  mediaFilter = ref(""),
  mediaType = ref(""),
  pagePreview = ref(false);
const detailPanel = ref<HTMLElement>();
async function showDetail(asset: (typeof mediaAssets)[number]) {
  detail.value = asset;
  await nextTick();
  detailPanel.value?.focus();
  detailPanel.value?.scrollIntoView({ block: "start" });
}
const snapshots = ref<Record<string, any>>({}),
  pending = ref(false);
const label = (v: any): string =>
  typeof v === "string" ? v : v?.[locale.value] || v?.lv || "";
const data = (doc: Doc) => snapshots.value[doc.key] || doc.data;
const images = computed(() => data(findDoc("clinic.media")!));
const currentPage = computed(() =>
  pages.find((p) => p.path === pagePath.value),
);
const status = (entries: { key: string }[]) => {
  const states = entries.map((p) => props.states.find((d) => d.key === p.key));
  if (!states.length || states.some((s) => !s)) return t("cms.reference");
  if (states.some((s) => s.draft_revision !== s.published_revision))
    return t("cms.draftState");
  return states.every((s) => s.published_revision)
    ? t("cms.published")
    : t("cms.draft");
};
const match = (value: any) =>
  !search.value ||
  JSON.stringify(value)
    .toLocaleLowerCase()
    .includes(search.value.toLocaleLowerCase());
const matchedPages = computed(() =>
  pages.filter((p) => match([p.title, p.path])),
);
const filteredMedia = computed(() =>
  mediaAssets.filter(
    (a) =>
      match(a.filename) &&
      (!mediaFilter.value || a.usage_groups.includes(mediaFilter.value)) &&
      (!mediaType.value || a.kind === mediaType.value),
  ),
);
const genericDocs = computed(() =>
  documents
    .filter((d) => d.group === props.group)
    .filter((d) => match([d.title, data(d)])),
);
const visibleSections = computed(
  () =>
    currentPage.value?.sections.filter((s) =>
      match([s.title, s.parts.map((p) => findDoc(p.key)?.title)]),
    ) || [],
);
const docSection = (doc: Doc): Section => ({
  id: doc.key,
  title: doc.title,
  parts: [{ key: doc.key }],
  image: docImage(doc, data(doc), locale.value, images.value),
});
const sectionImage = (s: Section) => {
  const imagePart = s.parts.find(
    (p) => p.key === "clinic.media" && p.prefixes?.length,
  );
  if (imagePart)
    return imageURL(data(findDoc("clinic.media")!)[imagePart.prefixes![0]!]);
  return (
    s.image ||
    s.parts
      .map((p) => findDoc(p.key)!)
      .map((d) => docImage(d, data(d), locale.value, images.value))
      .find(Boolean)
  );
};
function excerpt(s: Section) {
  for (const p of s.parts) {
    const doc = findDoc(p.key)!;
    for (const f of visibleFields(doc, locale.value, p)) {
      const v = valueAt(data(doc), f.path);
      if (typeof v === "string" && v.length > 28 && f.type === "text")
        return v.slice(0, 180);
    }
  }
  return t("cms.sectionIntro");
}
const sectionTitle = (s: Section) =>
  s.id.startsWith("prices.")
    ? label(data(findDoc(s.id)!).title)
    : s.id.startsWith("news.")
      ? data(findDoc(s.id)!)[locale.value].title
      : label(s.title);
const documentTitle = (d: Doc) =>
  d.key.startsWith("news.")
    ? data(d)[locale.value].title
    : label(data(d).title) || label(d.title);
const imageLabel = (a: (typeof mediaAssets)[number]) =>
  a.protected
    ? t("cms.systemManaged")
    : !a.url.startsWith("/")
      ? t("cms.sourceOnly")
      : a.filename;
const usage = (a: (typeof mediaAssets)[number]) =>
  a.usage_groups
    .map((g) =>
      g === "home"
        ? t("nav.home")
        : g === "about"
          ? t("nav.about")
          : g === "other"
            ? t("cms.other")
            : t("admin.nav." + g),
    )
    .join(", ") || t("cms.unused");
let controller = new AbortController(),
  request = 0;
const loadKeys = computed(() => {
  if (props.group === "pages")
    return (
      currentPage.value?.sections.flatMap((s) => s.parts.map((p) => p.key)) ||
      []
    );
  if (props.group === "services")
    return [
      ...serviceDocs,
      ...(category.value ? [category.value] : priceDocs),
    ].map((d) => d.key);
  if (props.group === "news") return newsDocs.map((d) => d.key);
  if (props.group === "settings")
    return settingsSections.flatMap((s) => s.parts.map((p) => p.key));
  return [];
});
async function load() {
  const sequence = ++request;
  controller.abort();
  controller = new AbortController();
  pending.value = true;
  const keys = [
    ...new Set([
      ...loadKeys.value,
      ...(loadKeys.value.length ? ["clinic.media"] : []),
    ]),
  ].filter((key) => props.states.some((s) => s.key === key));
  // Bound concurrency; these are authorized reads, never background writes.
  for (let i = 0; i < keys.length; i += 4) {
    await Promise.all(
      keys.slice(i, i + 4).map(async (key) => {
        try {
          const response = await cmsRequest(
            "/" + encodeURIComponent(key),
            controller.signal,
          );
          if (sequence !== request) return;
          const d = response.document;
          const revision = response.revisions.find(
            (r: any) => r.id === (d.draft_revision || d.published_revision),
          );
          if (revision) snapshots.value[key] = revision.payload;
        } catch {
          if (sequence === request) delete snapshots.value[key];
        }
      }),
    );
    if (sequence !== request) return;
  }
  pending.value = false;
}
watch([loadKeys, () => props.states, () => props.refresh], () => void load(), {
  immediate: true,
});
watch(
  () => props.group,
  () => {
    search.value = "";
    pagePreview.value = false;
    snapshots.value = {};
  },
);
onBeforeUnmount(() => {
  request++;
  controller.abort();
  snapshots.value = {};
});
function openPage(path: string, preview = false) {
  pagePath.value = path;
  pagePreview.value = preview;
  search.value = "";
}
function openItem(index: number) {
  if (!category.value) return;
  const doc = category.value;
  emit("open", {
    id: doc.key + "." + index,
    title: data(doc).items[index].name,
    parts: [{ key: doc.key, prefixes: ["items." + index] }],
  });
}
</script>
<template>
  <div class="cms-navigator">
    <div class="cms-search">
      <label
        >{{ t("cms.search") }}<input v-model="search" type="search"
      /></label>
      <label v-if="group === 'media'"
        >{{ t("cms.usage")
        }}<select v-model="mediaFilter">
          <option value="">{{ t("cms.allMedia") }}</option>
          <option
            v-for="g in [
              'home',
              'services',
              'doctors',
              'about',
              'news',
              'other',
            ]"
            :value="g"
            :key="g"
          >
            {{
              g === "home"
                ? t("nav.home")
                : g === "about"
                  ? t("nav.about")
                  : g === "other"
                    ? t("cms.other")
                    : t("admin.nav." + g)
            }}
          </option>
        </select></label
      >
      <label v-if="group === 'media'"
        >{{ t("cms.fileType")
        }}<select v-model="mediaType">
          <option value="">{{ t("cms.allMedia") }}</option>
          <option value="image">{{ t("cms.image") }}</option>
          <option value="video">{{ t("cms.video") }}</option>
        </select></label
      >
    </div>
    <template v-if="group === 'pages'">
      <template v-if="!currentPage">
        <div class="cms-heading">
          <h2>{{ t("cms.pagesTitle") }}</h2>
          <p>{{ t("cms.pageIntro") }}</p>
        </div>
        <div class="cms-card-grid cms-page-grid">
          <article
            v-for="page in matchedPages"
            :key="page.path"
            class="cms-card"
            :data-page="page.path"
          >
            <div class="cms-card-body">
              <span class="cms-status">{{
                status(
                  [...page.sections, page.metadata].flatMap((s) => s.parts),
                )
              }}</span>
              <h3>{{ label(page.title).split(" · AG ")[0] }}</h3>
              <p class="cms-url">{{ page.path }}</p>
              <small
                >{{ page.sections.length }} {{ t("cms.sectionCount") }}</small
              >
              <div class="cms-card-actions">
                <button @click="openPage(page.path)">{{ t("cms.edit") }}</button
                ><button @click="openPage(page.path, true)">
                  {{ t("cms.preview") }}
                </button>
              </div>
            </div>
          </article>
        </div>
      </template>
      <template v-else>
        <button
          class="cms-back"
          @click="
            pagePath = null;
            pagePreview = false;
            search = '';
          "
        >
          {{ t("cms.pageBack") }}
        </button>
        <div class="cms-heading">
          <p class="cms-url">{{ currentPage.path }}</p>
          <h2>{{ label(currentPage.title).split(" · AG ")[0] }}</h2>
          <p>{{ t(pagePreview ? "cms.outlineNote" : "cms.sectionsTitle") }}</p>
        </div>
        <button class="cms-back" @click="pagePreview = !pagePreview">
          {{ t(pagePreview ? "cms.sectionBack" : "cms.outline") }}
        </button>
        <p v-if="pending" role="status">{{ t("cms.previewLoading") }}</p>
        <p v-if="!currentPage.sections.length" class="cms-note">
          {{ t("cms.noContent") }}
        </p>
        <div :class="pagePreview ? 'cms-outline' : 'cms-sections'">
          <article
            v-for="(s, index) in visibleSections"
            :key="s.id"
            class="cms-section-card"
            :data-section="s.id"
          >
            <img
              v-if="sectionImage(s) && !pagePreview"
              :src="sectionImage(s)"
              alt=""
              loading="lazy"
            />
            <div class="cms-section-body">
              <div class="cms-topline">
                <span>{{ String(index + 1).padStart(2, "0") }}</span
                ><span class="cms-status">{{ status(s.parts) }}</span>
              </div>
              <h3>{{ sectionTitle(s) }}</h3>
              <template v-if="pagePreview"
                ><div v-for="p in s.parts" :key="p.key">
                  <p v-if="!snapshots[p.key]" class="cms-note">
                    {{ t("cms.reference") }}
                  </p>
                  <CmsContentPreview
                    :doc="findDoc(p.key)!"
                    :data="data(findDoc(p.key)!)"
                    :part="p"
                    :images="images"
                    :language="locale"
                  /></div
              ></template>
              <p v-else>{{ excerpt(s) }}</p>
              <div class="cms-card-actions">
                <button @click="emit('open', s)">{{ t("cms.edit") }}</button
                ><button v-if="!pagePreview" @click="emit('open', s, true)">
                  {{ t("cms.preview") }}
                </button>
              </div>
            </div>
          </article>
        </div>
        <aside
          v-if="currentPage.metadata.parts.length"
          class="cms-search-appearance"
        >
          <h3>{{ label(currentPage.metadata.title) }}</h3>
          <button class="cms-back" @click="emit('open', currentPage.metadata)">
            {{ t("cms.edit") }}
          </button>
        </aside>
      </template>
    </template>
    <template v-else-if="group === 'services'">
      <template v-if="!category">
        <h2>{{ t("cms.categories") }}</h2>
        <div class="cms-card-grid">
          <article
            v-for="doc in priceDocs.filter((d) => match([d.title, data(d)]))"
            :key="doc.key"
            class="cms-card"
            :data-category="doc.key"
          >
            <div class="cms-card-body">
              <span class="cms-status">{{ status([{ key: doc.key }]) }}</span>
              <h3>{{ label(data(doc).title) }}</h3>
              <p>{{ data(doc).items.length }} · {{ t("cms.priceItems") }}</p>
              <button
                class="cms-back"
                @click="
                  category = doc;
                  search = '';
                "
              >
                {{ t("cms.edit") }}
              </button>
            </div>
          </article>
        </div>
        <h2>{{ t("cms.servicesTitle") }}</h2>
        <div class="cms-card-grid">
          <article
            v-for="doc in serviceDocs.filter((d) => match([d.title, data(d)]))"
            :key="doc.key"
            class="cms-card"
          >
            <img
              v-if="docImage(doc, data(doc), locale, images)"
              :src="docImage(doc, data(doc), locale, images)"
              alt=""
              loading="lazy"
            />
            <div class="cms-card-body">
              <h3>{{ documentTitle(doc) }}</h3>
              <p>{{ label(data(doc).short) }}</p>
              <span class="cms-status">{{ status([{ key: doc.key }]) }}</span>
              <div class="cms-card-actions">
                <button @click="emit('open', docSection(doc))">
                  {{ t("cms.edit") }}</button
                ><button @click="emit('open', docSection(doc), true)">
                  {{ t("cms.preview") }}
                </button>
              </div>
            </div>
          </article>
        </div>
      </template>
      <template v-else>
        <button
          class="cms-back"
          @click="
            category = null;
            search = '';
          "
        >
          {{ t("cms.categoryBack") }}
        </button>
        <h2>{{ label(data(category).title) }}</h2>
        <button
          class="cms-back"
          @click="
            emit('open', {
              id: category.key,
              title: category.title,
              parts: [{ key: category.key, prefixes: ['title'] }],
            })
          "
        >
          {{ t("cms.categoryText") }} · {{ t("cms.edit") }}
        </button>
        <div class="cms-items">
          <article
            v-for="(item, i) in data(category).items"
            :key="i"
            v-show="match(item)"
            :data-item="i"
          >
            <div>
              <h3>{{ label(item.name) }}</h3>
              <span class="cms-status">{{
                status([{ key: category.key }])
              }}</span>
            </div>
            <p class="cms-price">{{ item.price }} €</p>
            <button @click="openItem(Number(i))">{{ t("cms.edit") }}</button>
          </article>
        </div>
      </template>
    </template>
    <template v-else-if="group === 'news'">
      <div class="cms-heading">
        <h2>{{ t("cms.articlesTitle") }}</h2>
        <p>{{ t("cms.articleIntro") }}</p>
      </div>
      <div class="cms-card-grid">
        <article
          v-for="doc in newsDocs.filter((d) => match(data(d)))"
          :key="doc.key"
          class="cms-card"
          :data-article="doc.key"
        >
          <img
            v-if="docImage(doc, data(doc), locale, images)"
            :src="docImage(doc, data(doc), locale, images)"
            alt=""
            loading="lazy"
          />
          <div class="cms-card-body">
            <div class="cms-topline">
              <time>{{ data(doc)[locale].date }}</time
              ><span class="cms-status">{{ status([{ key: doc.key }]) }}</span>
            </div>
            <h3>{{ documentTitle(doc) }}</h3>
            <p>{{ data(doc)[locale].excerpt }}</p>
            <div class="cms-card-actions">
              <button @click="emit('open', docSection(doc))">
                {{ t("cms.edit") }}</button
              ><button @click="emit('open', docSection(doc), true)">
                {{ t("cms.preview") }}</button
              ><button
                v-if="status([{ key: doc.key }]) === t('cms.draftState')"
                @click="emit('open', docSection(doc), true)"
              >
                {{ t("cms.publish") }}
              </button>
            </div>
          </div>
        </article>
      </div>
    </template>
    <template v-else-if="group === 'media'">
      <p class="cms-note">{{ t("cms.uploadNote") }}</p>
      <button class="cms-unavailable" disabled>{{ t("cms.upload") }}</button>
      <p class="cms-note">{{ mediaAssets.length }} · {{ t("cms.files") }}</p>
      <section
        v-if="detail"
        ref="detailPanel"
        tabindex="-1"
        class="cms-media-detail"
        aria-live="polite"
      >
        <button class="cms-back" @click="detail = null">
          {{ t("cms.close") }}
        </button>
        <h2>{{ detail.filename }}</h2>
        <img
          v-if="
            !detail.protected &&
            detail.url.startsWith('/') &&
            imageURL(detail.url)
          "
          :src="detail.url"
          :alt="detail.filename"
        />
        <p v-if="detail.protected">{{ t("cms.systemNote") }}</p>
        <dl>
          <dt>{{ t("cms.fileType") }}</dt>
          <dd>{{ detail.filename.split(".").at(-1)?.toUpperCase() }}</dd>
          <dt>{{ t("cms.fileSize") }}</dt>
          <dd>{{ Math.ceil(detail.bytes / 1024) }} KB</dd>
          <dt>{{ t("cms.usage") }}</dt>
          <dd>{{ usage(detail) }}</dd>
        </dl>
      </section>
      <div class="cms-media">
        <button
          v-for="asset in filteredMedia"
          :key="asset.id"
          class="cms-media-tile"
          @click="showDetail(asset)"
          :aria-label="t('cms.assetDetails') + ': ' + asset.filename"
        >
          <img
            v-if="
              !asset.protected &&
              asset.url.startsWith('/') &&
              imageURL(asset.url)
            "
            :src="asset.url"
            :alt="asset.filename"
            loading="lazy"
          /><span v-else class="cms-media-placeholder">{{
            imageLabel(asset)
          }}</span
          ><strong>{{ asset.filename }}</strong
          ><span
            >{{ asset.filename.split(".").at(-1)?.toUpperCase() }} ·
            {{ Math.ceil(asset.bytes / 1024) }} KB</span
          ><small>{{ usage(asset) }}</small>
        </button>
      </div>
    </template>
    <template v-else-if="group === 'settings'">
      <div class="cms-card-grid">
        <article
          v-for="s in settingsSections.filter((s) => match(s.title))"
          :key="s.id"
          class="cms-card"
          :data-setting="s.id"
        >
          <div class="cms-card-body">
            <h3>{{ label(s.title) }}</h3>
            <template v-if="s.parts.length"
              ><p>{{ excerpt(s) }}</p>
              <span class="cms-status">{{ status(s.parts) }}</span>
              <div class="cms-card-actions">
                <button @click="emit('open', s)">{{ t("cms.edit") }}</button
                ><button @click="emit('open', s, true)">
                  {{ t("cms.preview") }}
                </button>
              </div></template
            >
            <p v-else>{{ t("cms.settingUnavailable") }}</p>
          </div>
        </article>
      </div>
    </template>
    <div v-else class="cms-card-grid">
      <article v-for="doc in genericDocs" :key="doc.key" class="cms-card">
        <div class="cms-card-body">
          <h3>{{ label(doc.title) }}</h3>
          <span class="cms-status">{{ status([{ key: doc.key }]) }}</span>
          <div class="cms-card-actions">
            <button @click="emit('open', docSection(doc))">
              {{ t(doc.locked ? "cms.readOnly" : "cms.edit") }}</button
            ><button @click="emit('open', docSection(doc), true)">
              {{ t("cms.preview") }}
            </button>
          </div>
        </div>
      </article>
    </div>
  </div>
</template>
<style scoped>
.cms-search-appearance {
  margin-top: 32px;
  border-top: 1px solid var(--line);
  padding-top: 16px;
}
.cms-navigator {
  min-width: 0;
}
h2 {
  font: 400 clamp(28px, 3vw, 40px)/1.2 var(--serif);
  margin: 28px 0 18px;
}
h3 {
  font: 400 clamp(23px, 2.4vw, 30px)/1.2 var(--serif);
  margin: 12px 0;
  overflow-wrap: anywhere;
}
p {
  font-size: 13px;
  line-height: 1.7;
  overflow-wrap: anywhere;
}
.cms-note,
small {
  font-size: 12px;
  color: var(--muted);
  line-height: 1.6;
}
.cms-search {
  display: flex;
  gap: 16px;
  margin: 24px 0 32px;
}
.cms-search label {
  flex: 1;
  min-width: 0;
  font-size: 12px;
}
input,
select {
  display: block;
  width: 100%;
  min-height: 46px;
  margin-top: 8px;
  padding: 12px;
  background: var(--white);
  border: 1px solid var(--line);
  font: inherit;
  color: var(--ink);
  border-radius: 0;
}
.cms-heading {
  margin-bottom: 24px;
}
.cms-card-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
  margin-bottom: 36px;
}
.cms-card {
  border: 1px solid var(--line);
  background: var(--white);
  min-width: 0;
}
.cms-card > img {
  width: 100%;
  height: 180px;
  object-fit: cover;
}
.cms-card-body {
  padding: 24px;
}
.cms-status {
  font-size: 11px;
  line-height: 1.5;
  color: var(--muted);
}
.cms-url {
  font-size: 12px;
  color: var(--muted);
  margin-bottom: 12px;
  overflow-wrap: anywhere;
}
.cms-card-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  border-top: 1px solid var(--line);
  margin-top: 22px;
  padding-top: 10px;
}
button {
  background: transparent;
  min-height: 44px;
  font-size: 13px;
  text-align: left;
  line-height: 1.5;
  overflow-wrap: anywhere;
}
.cms-card-actions button,
.cms-items button,
.cms-back {
  padding: 10px 4px;
  text-decoration: underline;
  text-underline-offset: 5px;
}
button:hover:not(:disabled) {
  color: var(--olive);
}
.cms-topline {
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 11px;
  color: var(--muted);
}
.cms-sections {
  display: grid;
  gap: 20px;
}
.cms-section-card {
  border: 1px solid var(--line);
  display: flex;
  min-width: 0;
  background: var(--white);
}
.cms-section-card > img {
  width: 28%;
  height: 220px;
  flex-shrink: 0;
  object-fit: cover;
}
.cms-section-body {
  padding: 24px;
  flex: 1;
  min-width: 0;
}
.cms-outline {
  display: grid;
  gap: 24px;
  max-width: 900px;
}
.cms-items {
  border-top: 1px solid var(--line);
  margin: 24px 0;
}
.cms-items article {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 24px;
  padding: 20px 0;
  border-bottom: 1px solid var(--line);
}
.cms-items h3 {
  font: 500 14px/1.7 var(--sans);
  margin: 0 0 8px;
}
.cms-price {
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.cms-media {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 20px;
  margin-top: 24px;
}
.cms-media-tile {
  border: 1px solid var(--line);
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}
.cms-media-tile img,
.cms-media-placeholder {
  width: 100%;
  aspect-ratio: 4/3;
  object-fit: contain;
  background: var(--sage);
}
.cms-media-placeholder {
  display: grid;
  place-content: center;
  text-align: center;
  padding: 20px;
  font-size: 12px;
}
.cms-media-tile strong {
  font-weight: 500;
}
.cms-media-tile > span {
  font-size: 12px;
}
.cms-media-detail {
  border: 1px solid var(--line);
  padding: 24px;
  margin: 24px 0;
}
.cms-media-detail img {
  max-width: 100%;
  height: 240px;
  object-fit: contain;
}
dt {
  font-size: 12px;
  color: var(--muted);
  margin-top: 16px;
}
dd {
  margin: 4px 0;
  font-size: 13px;
  overflow-wrap: anywhere;
}
.cms-unavailable {
  border: 1px solid var(--line);
  padding: 12px;
  color: var(--muted);
  cursor: not-allowed;
}
:focus-visible {
  outline: 2px solid var(--olive);
  outline-offset: 4px;
}
@media (min-width: 1600px) {
  .cms-page-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
@media (max-width: 760px) {
  .cms-card-grid {
    grid-template-columns: 1fr;
  }
  .cms-search {
    flex-direction: column;
  }
  .cms-section-card {
    flex-direction: column;
  }
  .cms-section-card > img {
    width: 100%;
    height: 160px;
  }
  .cms-card-body,
  .cms-section-body {
    padding: 20px;
  }
  .cms-media {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .cms-items article {
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 10px;
  }
  .cms-items article > div {
    grid-column: 1/-1;
  }
}
@media (max-width: 380px) {
  .cms-media {
    grid-template-columns: 1fr;
  }
}
</style>
