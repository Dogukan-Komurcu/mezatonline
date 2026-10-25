/**
 * Türkçe karakterlere duyarsız metin karşılaştırma yardımcıları (arama, öneri vurgulama).
 */

/** "Osmanlı Şİkke" → "osmanli sikke" (uzunluk korunur: vurgulama için indeksler eşleşir) */
export function normalizeTr(s: string): string {
  return s
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[éèê]/g, 'e')
    .replace(/[âà]/g, 'a')
    .replace(/î/g, 'i')
    .replace(/û/g, 'u');
}

/** Metin, sorgunun tüm kelimelerini içeriyor mu */
export function matchesQuery(text: string, query: string): boolean {
  const q = normalizeTr(query.trim());
  if (!q) return false;
  const t = normalizeTr(text);
  return q.split(/\s+/).every((term) => t.includes(term));
}

/** Vurgulama için: metni [önce, eşleşen, sonra] parçalarına böler (eşleşme yoksa null) */
export function splitMatch(text: string, query: string): [string, string, string] | null {
  const q = normalizeTr(query.trim());
  if (!q) return null;
  const t = normalizeTr(text);
  if (t.length !== text.length) return null;
  const i = t.indexOf(q);
  if (i < 0) return null;
  return [text.slice(0, i), text.slice(i, i + q.length), text.slice(i + q.length)];
}

/** Diziyi n'li satırlara böler (2 sütunlu grid'ler için) */
export function chunk<T>(list: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

/** "Pokémon kartları" gibi bir metnin baş harfini büyütür */
export function capitalize(s: string): string {
  return s ? s.charAt(0).toLocaleUpperCase('tr-TR') + s.slice(1) : s;
}
