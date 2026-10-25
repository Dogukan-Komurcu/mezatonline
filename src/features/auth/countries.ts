export type Country = {
  code: string;
  name: string;
  flag: string;
  dial: string;
  /** Ulusal numara hane sayısı (alan kodu dahil, baştaki 0 hariç) */
  length: number;
  /** Gösterim grupları: [3,3,2,2] → 532 123 45 67 */
  groups: number[];
  /** Numara bu rakamla başlamalı (TR cep: 5) */
  startsWith?: string;
  placeholder: string;
};

export const COUNTRIES: Country[] = [
  { code: 'TR', name: 'Türkiye', flag: '🇹🇷', dial: '+90', length: 10, groups: [3, 3, 2, 2], startsWith: '5', placeholder: '5XX XXX XX XX' },
  { code: 'DE', name: 'Almanya', flag: '🇩🇪', dial: '+49', length: 11, groups: [4, 7], placeholder: '15XX XXXXXXX' },
  { code: 'NL', name: 'Hollanda', flag: '🇳🇱', dial: '+31', length: 9, groups: [1, 4, 4], startsWith: '6', placeholder: '6 XXXX XXXX' },
  { code: 'AZ', name: 'Azerbaycan', flag: '🇦🇿', dial: '+994', length: 9, groups: [2, 3, 2, 2], placeholder: 'XX XXX XX XX' },
  { code: 'GB', name: 'Birleşik Krallık', flag: '🇬🇧', dial: '+44', length: 10, groups: [4, 6], startsWith: '7', placeholder: '7XXX XXXXXX' },
  { code: 'US', name: 'Amerika Birleşik Devletleri', flag: '🇺🇸', dial: '+1', length: 10, groups: [3, 3, 4], placeholder: 'XXX XXX XXXX' },
];

export const DEFAULT_COUNTRY = COUNTRIES[0];

export function getCountry(code: string | undefined): Country {
  return COUNTRIES.find((c) => c.code === code) ?? DEFAULT_COUNTRY;
}

/** Yalnızca rakamlar; TR'de baştaki 0 ve 90 öneki atılır */
export function cleanNationalNumber(text: string, country: Country): string {
  let digits = text.replace(/\D/g, '');
  if (country.code === 'TR') {
    if (digits.startsWith('90') && digits.length > 10) digits = digits.slice(2);
    digits = digits.replace(/^0+/, '');
  }
  return digits.slice(0, country.length);
}

/** Yazarken maske: "5321234" → "532 123 4" */
export function maskNational(digits: string, country: Country): string {
  const parts: string[] = [];
  let i = 0;
  for (const g of country.groups) {
    if (i >= digits.length) break;
    parts.push(digits.slice(i, i + g));
    i += g;
  }
  if (i < digits.length) parts.push(digits.slice(i));
  return parts.join(' ');
}

export function isValidNational(digits: string, country: Country): boolean {
  if (digits.length !== country.length) return false;
  if (country.startsWith && !digits.startsWith(country.startsWith)) return false;
  return true;
}

/** E.164: +905321234567 */
export function toE164(digits: string, country: Country): string {
  return `${country.dial}${digits}`;
}

/** Ekranda gösterim: +90 532 123 45 67 */
export function displayPhone(digits: string, country: Country): string {
  return `${country.dial} ${maskNational(digits, country)}`;
}
