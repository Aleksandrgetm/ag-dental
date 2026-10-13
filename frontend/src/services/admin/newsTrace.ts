// Temporary, opt-in local diagnosis. No identifiers, content, URLs, credentials,
// error bodies or persistent storage. Production builds cannot enable this mode.
let sequence = 0;
export function newsTraceReadOnly(): boolean {
  return import.meta.env.DEV && typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('newsTrace') === 'readonly';
}
export function newsTrace(stage: string, flags: Record<string, boolean | number> = {}) {
  if (!newsTraceReadOnly()) return;
  const safe = Object.fromEntries(Object.entries(flags).filter(([, value]) =>
    typeof value === 'boolean' || (typeof value === 'number' && Number.isFinite(value))));
  console.info('[news-trace]', JSON.stringify({sequence: ++sequence, stage, ...safe}));
}
