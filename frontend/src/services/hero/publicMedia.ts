import { cmsMediaAlt } from '../cms/publishedMedia';
import { media } from '../cms/content';
import { neutralHeroPoster } from '../../content/heroMedia';
// Presentation-only exclusion. Do not mutate CMS records or their history.
export function approvedPublicImage(value: string) {
  return /(?:clinic-tour\.mp4|tour-(?:poster|room|detail)\.jpg)(?:[?#]|$)/i.test(value) ? neutralHeroPoster : value;
}
export const publicMedia = new Proxy(media, {
  get(target, key, receiver) {
    const value = Reflect.get(target, key, receiver);
    return typeof value === 'string' ? approvedPublicImage(value) : value;
  },
});

export function publicImageAlt(value: string, locale: string, fallback: string) {
  return approvedPublicImage(value) === neutralHeroPoster ? "" : cmsMediaAlt(value, locale, fallback);
}
