/**
 * Ticaret ekranları (yayın sayfası, ürün sayfası, ödeme) için saf yardımcılar.
 */
import type { CardBrand, Product } from '@/types';

const MONTHS_SHORT = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
const DAYS_SHORT = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];

export const DAY_MS = 86_400_000;

/** Platformun anlaştığı kargo firmaları (alıcıya gösterilen kısa liste) */
export const CARRIER_LINE = 'Yurtiçi · Aras · MNG · PTT · HepsiJet';

/**
 * Türkçe ayrılma hâli eki (-dan/-den/-tan/-ten), sayının okunuşuna göre.
 * 65 → "ten" (altmış beş), 89 → "dan" (seksen dokuz), 100 → "den" (yüz), 1000 → "den" (bin)
 */
export function ablativeSuffix(n: number): string {
  const v = Math.abs(Math.round(n));
  if (v === 0) return 'dan';
  const lastDigit = v % 10;
  if (lastDigit !== 0) {
    return ({ 1: 'den', 2: 'den', 3: 'ten', 4: 'ten', 5: 'ten', 6: 'dan', 7: 'den', 8: 'den', 9: 'dan' } as Record<number, string>)[lastDigit];
  }
  const tens = Math.floor(v / 10) % 10;
  if (tens !== 0) {
    return ({ 1: 'dan', 2: 'den', 3: 'dan', 4: 'tan', 5: 'den', 6: 'tan', 7: 'ten', 8: 'den', 9: 'dan' } as Record<number, string>)[tens];
  }
  // yüz, bin, milyon
  if (v % 1_000_000 === 0) return 'dan';
  return 'den';
}

/** "₺65'ten" */
export function withAblative(formatted: string, n: number): string {
  return `${formatted}'${ablativeSuffix(n)}`;
}

function isWeekend(d: Date) {
  return d.getDay() === 0 || d.getDay() === 6;
}

export function addBusinessDays(from: Date, days: number): Date {
  const d = new Date(from.getTime());
  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    if (!isWeekend(d)) added += 1;
  }
  return d;
}

/** "29 Eki Çar" */
export function shortDay(d: Date): string {
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${DAYS_SHORT[d.getDay()]}`;
}

/** Tahmini teslimat aralığı: satıcı 2 iş günü içinde kargolar, teslimat 2–4 iş günü */
export function deliveryWindow(now: number = Date.now()): { from: Date; to: Date; label: string } {
  const start = new Date(now);
  const from = addBusinessDays(start, 2);
  const to = addBusinessDays(start, 4);
  return { from, to, label: `${shortDay(from)} – ${shortDay(to)}` };
}

/** Kalan süre parçaları */
export function countdownParts(target: number, now: number) {
  const total = Math.max(0, Math.floor((target - now) / 1000));
  return {
    total,
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}

export function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** "3g 04:15:32" ya da "04:15:32" */
export function countdownClock(target: number, now: number): string {
  const p = countdownParts(target, now);
  const clock = `${pad2(p.hours)}:${pad2(p.minutes)}:${pad2(p.seconds)}`;
  return p.days > 0 ? `${p.days}g ${clock}` : clock;
}

/** İndirim yüzdesi (Hemen Al ürünlerinde üstü çizili fiyat varsa) */
export function discountPercent(product: Product): number {
  if (!product.compareAtPrice || product.format !== 'buy_now' || product.compareAtPrice <= product.price) return 0;
  return Math.round((1 - product.price / product.compareAtPrice) * 100);
}

/** Fiyatı "temiz" bir sayıya yuvarla (teklif önerileri için) */
export function roundNice(v: number): number {
  if (v < 100) return Math.max(1, Math.round(v));
  if (v < 1000) return Math.round(v / 5) * 5;
  if (v < 10000) return Math.round(v / 10) * 10;
  return Math.round(v / 50) * 50;
}

/** Kullanıcı girişini tam liraya çevir ("1.250" → 1250) */
export function parseLira(text: string): number {
  const digits = text.replace(/[^\d]/g, '');
  return digits ? parseInt(digits, 10) : 0;
}

/** Tam lira girişini binlik ayraçla göster ("1250" → "1.250") */
export function formatLiraInput(n: number): string {
  if (!n) return '';
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export const CARD_BRAND_LABELS: Record<CardBrand, string> = {
  visa: 'Visa',
  mastercard: 'Mastercard',
  troy: 'Troy',
  amex: 'American Express',
};

/** 3D Secure sağlayıcısı adı */
export const SECURE_PROGRAM: Record<CardBrand, string> = {
  visa: 'Visa Secure',
  mastercard: 'Mastercard ID Check',
  troy: 'TROY 3D Secure',
  amex: 'American Express SafeKey',
};

/** Telefonu maskele: "0532 123 45 67" → "+90 5** *** ** 67" */
export function maskPhone(raw: string | undefined): string {
  const digits = (raw ?? '').replace(/\D/g, '').replace(/^90/, '').replace(/^0/, '');
  if (digits.length !== 10) return '+90 5** *** ** **';
  return `+90 ${digits[0]}** *** ** ${digits.slice(8)}`;
}

/** Kısa adres satırı: "Caferağa Mah., Moda Cad. No:5, Kadıköy/İstanbul" */
export function addressLine(a: { neighborhood: string; line: string; district: string; city: string }): string {
  return [a.neighborhood, a.line].filter(Boolean).join(', ') + `, ${a.district}/${a.city}`;
}
