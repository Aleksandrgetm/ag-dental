import { media } from './content';
import { API_URL } from '../api';
import { mediaID, publicMediaURL } from './mediaReference';

// News is editorial content: never apply presentation-only clinic photo replacements.
export function newsImage(value: string | undefined): string | undefined {
  if (!value) return undefined;
  if (mediaID(value)) return publicMediaURL(API_URL, value);
  const resolved = (media as Record<string, string>)[value] || value;
  if (mediaID(resolved)) return publicMediaURL(API_URL, resolved);
  const prefix = API_URL ? `${API_URL}/cms/media/` : undefined;
  if (prefix && resolved.startsWith(prefix)) {
    const id = resolved.slice(prefix.length).split('/')[0];
    return publicMediaURL(API_URL, `cms-media:${id}`);
  }
  return resolved.startsWith('/media/') && !resolved.includes('..') ? resolved : undefined;
}
