export type HeroPreferences = { animation: boolean; video: boolean };
export const preferenceKey = 'ag-hero-preferences-v1';
export function readPreferences(storage: Pick<Storage, 'getItem'> | undefined, reduced: boolean): HeroPreferences {
  try {
    const value = JSON.parse(storage?.getItem(preferenceKey) || 'null');
    if (typeof value?.animation === 'boolean' && typeof value?.video === 'boolean') return value;
  } catch { /* Restricted storage uses system preference. */ }
  return { animation: !reduced, video: true };
}
export function hasPreference(storage: Pick<Storage, 'getItem'> | undefined) {
  try { const v = JSON.parse(storage?.getItem(preferenceKey) || 'null'); return typeof v?.animation === 'boolean' && typeof v?.video === 'boolean'; } catch { return false; }
}
export function savePreferences(storage: Pick<Storage, 'setItem'> | undefined, value: HeroPreferences) {
  try { storage?.setItem(preferenceKey, JSON.stringify(value)); } catch { /* Session choice still works. */ }
}
