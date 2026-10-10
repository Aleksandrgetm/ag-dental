<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import {
  imageURL,
  valueAt,
  visibleFields,
  type Doc,
  type Part,
} from "../../services/cms/catalog";
const props = defineProps<{
  doc: Doc;
  data: any;
  language: string;
  part?: Part;
  images?: Record<string, string>;
}>();
const { t } = useI18n();
const fields = computed(() =>
  visibleFields(props.doc, props.language, props.part),
);
const text = (field: any) => valueAt(props.data, field.path);
const heading = (field: any) =>
  /title|headline|heading/i.test(field.path.join("."));
</script>
<template>
  <div class="cms-content-preview" :lang="language">
    <template v-for="field in fields" :key="field.path.join('/')">
      <figure
        v-if="
          ['media', 'image-key'].includes(field.type) &&
          imageURL(text(field), images)
        "
      >
        <img
          :src="imageURL(text(field), images)"
          :alt="t('cms.image')"
          loading="lazy"
        />
      </figure>
      <template
        v-else-if="
          typeof text(field) === 'string' &&
          !['media', 'image-key'].includes(field.type)
        "
      >
        <h3 v-if="heading(field)">{{ text(field) }}</h3>
        <time v-else-if="field.type === 'date'" :datetime="text(field)">{{
          text(field)
        }}</time>
        <p v-else :class="{ 'cms-preview-price': field.type === 'price' }">
          {{ text(field) }}{{ field.type === "price" ? " €" : "" }}
        </p>
      </template>
    </template>
  </div>
</template>
<style scoped>
.cms-content-preview {
  overflow-wrap: anywhere;
}
h3 {
  font: 400 clamp(24px, 3vw, 36px)/1.2 var(--serif);
  margin: 18px 0;
}
p {
  white-space: pre-wrap;
  font-size: 14px;
  line-height: 1.8;
  margin: 14px 0;
}
figure {
  margin: 20px 0;
}
img {
  width: 100%;
  max-height: 360px;
  object-fit: cover;
}
time {
  font-size: 12px;
  color: var(--muted);
}
.cms-preview-price {
  font-variant-numeric: tabular-nums;
}
</style>
