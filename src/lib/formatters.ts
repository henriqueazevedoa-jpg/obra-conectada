export function normalizeUnit(u: string): string {
  if (!u) return u;
  const s = u.trim()
    .replace(/([a-zA-Z])2$/i, '$1²')
    .replace(/([a-zA-Z])3$/i, '$1³');
  const lower = s.toLowerCase();
  const KEEP_UPPER = new Set(['kw', 'kva', 'kn', 'mpa']);
  if (KEEP_UPPER.has(lower)) return lower.toUpperCase();
  if (/^[a-záàâãéêíóôõúç]+$/i.test(lower))
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  return lower;
}
