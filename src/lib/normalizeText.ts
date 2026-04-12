/**
 * Normalize a material name for matching:
 * - lowercase
 * - trim
 * - remove double spaces
 * - remove accents
 */
export function normalizeMaterialName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}
