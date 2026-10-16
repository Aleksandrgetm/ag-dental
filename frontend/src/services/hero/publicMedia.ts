import { clinicPhotoMetadata, clinicPhotoReplacements } from '../../content/clinicPhotography';
import { cmsMediaAlt } from '../cms/publishedMedia';
import { media } from '../cms/content';
import { neutralHeroPoster } from '../../content/heroMedia';
// Presentation-only exclusion. Do not mutate CMS records or their history.
export function approvedPublicImage(value: string) {
  if (clinicPhotoReplacements[value]) return clinicPhotoReplacements[value];
  return /(?:clinic-tour\.mp4|tour-(?:poster|room|detail)\.jpg)(?:[?#]|$)/i.test(value) ? neutralHeroPoster : value;
}
export const publicMedia = new Proxy(media, {
  get(target, key, receiver) {
    const value = Reflect.get(target, key, receiver);
    return typeof value === 'string' ? approvedPublicImage(value) : value;
  },
});

export function publicImageAlt(value: string, locale: string, fallback: string) {
  const photo = clinicPhotoMetadata(value);
  if (photo) return photo.alt[locale as keyof typeof photo.alt] || photo.alt.lv;
  return approvedPublicImage(value) === neutralHeroPoster ? "" : cmsMediaAlt(value, locale, fallback);
}

export { sectionPhoto, servicePhoto } from '../../content/clinicPhotography';
