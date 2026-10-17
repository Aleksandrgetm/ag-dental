import { computed, type Ref } from 'vue';
import { articles, createdContent, localizeArticle } from '../services/cms/content';

// One published list for homepage and News; preserve existing CMS/fallback resolution.
export function usePublicNews(locale: Ref<string>, newsLabel: () => string) {
  return computed(() => {
    const language = locale.value as 'lv' | 'ru' | 'en';
    return [
      ...articles.map(article => localizeArticle(article, locale.value)),
      ...createdContent.value
        .filter(row => row.key.startsWith('created.news.'))
        .sort((a, b) => a.payload.order - b.payload.order)
        .map(({ payload }) => ({
          slug: payload.slug,
          image: payload.image,
          date: payload.date,
          category: payload.category?.[language] || newsLabel(),
          title: payload.title[language],
          excerpt: payload.summary[language],
        })),
    ].sort((a, b) => b.date.localeCompare(a.date));
  });
}
