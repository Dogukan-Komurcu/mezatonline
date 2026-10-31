/**
 * Açık artırma kuralları (Whatnot mekaniklerinin ₺ uyarlaması — bkz. docs/research/buyer.md §4-6).
 *
 * - Normal açık artırma: kalan süre 10 sn'nin altındayken gelen her teklif süreyi
 *   satıcının "karşı teklif süresi"ne (counterBidTime, varsayılan 10 sn) çeker; süre asla kısalmaz.
 * - Ani Bitiş (sudden death 💀): süre asla uzamaz; 00:01'de son teklif veren kazanır.
 * - Özel teklif + "Maks. teklif" açık (varsayılan): sistem yalnızca biri sana karşı teklif
 *   verdiğinde, minimum artışla, belirlediğin tavana kadar otomatik teklif verir (gizli).
 * - Tüm teklifler bağlayıcıdır; kurumsal satıcılardan alımlarda alıcının 14 günlük yasal cayma hakkı saklıdır
 *   (alıcıya gösterilen metin: features/commerce/utils.ts BINDING_BID_TEXT).
 */

/** Son kaç saniye içinde gelen teklif süreyi uzatır (Whatnot ile aynı, sabit) */
export const EXTEND_THRESHOLD_SEC = 10;

/** Satıcının seçebileceği açık artırma süreleri (sn) */
export const AUCTION_DURATIONS = [5, 7, 10, 15, 20, 30, 45, 60, 120, 180, 300] as const;
export const DEFAULT_AUCTION_DURATION = 15;
export const DEFAULT_SUDDEN_DEATH_DURATION = 10;

/** Karşı teklif süresi seçenekleri (sn) */
export const COUNTER_BID_OPTIONS = [5, 7, 10, 15, 20] as const;
export const DEFAULT_COUNTER_BID_TIME = 10;

/** Çekiliş süresi seçenekleri (sn) — Whatnot: en fazla 5 dk */
export const GIVEAWAY_DURATIONS = [30, 60, 120, 180, 300] as const;

/** Flaş indirim süre seçenekleri (sn) — en az 30 sn önerilir */
export const FLASH_SALE_DURATIONS = [30, 60, 90, 120, 300] as const;

/** Bahşiş hazır tutarları (₺) — özel tutar yok */
export const TIP_PRESETS = [20, 50, 100, 250, 500, 1000] as const;

/** ₺ teklif artış tablosu */
const INCREMENT_TABLE: { below: number; step: number }[] = [
  { below: 20, step: 1 },
  { below: 50, step: 2 },
  { below: 100, step: 5 },
  { below: 500, step: 10 },
  { below: 1_000, step: 25 },
  { below: 2_500, step: 50 },
  { below: 5_000, step: 100 },
  { below: 10_000, step: 250 },
  { below: 25_000, step: 500 },
  { below: 50_000, step: 1_000 },
  { below: Infinity, step: 2_500 },
];

/** Mevcut fiyata göre minimum artış */
export function bidIncrement(current: number): number {
  for (const row of INCREMENT_TABLE) {
    if (current < row.below) return row.step;
  }
  return 2_500;
}

/**
 * Bir sonraki geçerli minimum teklif.
 * Henüz teklif yoksa açılış fiyatıdır.
 */
export function nextMinBid(current: number, hasBids: boolean): number {
  if (!hasBids) return Math.max(1, current);
  return current + bidIncrement(current);
}

/** Özel teklif ekranındaki hızlı seçim çipleri */
export function quickBidOptions(current: number, hasBids: boolean): number[] {
  const min = nextMinBid(current, hasBids);
  const step = bidIncrement(min);
  return [min, min + step, min + step * 3, min + step * 7, min + step * 15];
}

/**
 * Kabul edilen bir teklif sonrası yeni bitiş zamanı (ms).
 * Kalan < 10 sn ise: endsAt = now + max(kalan, counterBidTime). Ani bitişte değişmez.
 */
export function extendedEndsAt(endsAt: number, now: number, suddenDeath: boolean, counterBidTime: number = DEFAULT_COUNTER_BID_TIME): number {
  if (suddenDeath) return endsAt;
  const remaining = (endsAt - now) / 1000;
  if (remaining < EXTEND_THRESHOLD_SEC) return now + Math.max(remaining, counterBidTime) * 1000;
  return endsAt;
}

/** Teklif tutarı geçerli mi? (artış tablosuna uyması gerekmez, minimumun üstünde tam sayı olmalı) */
export function isValidBid(amount: number, current: number, hasBids: boolean): boolean {
  return Number.isFinite(amount) && Number.isInteger(amount) && amount >= nextMinBid(current, hasBids);
}

/** Süre etiketi: 15 → "15 sn", 120 → "2 dk" */
export function durationLabel(sec: number): string {
  return sec >= 60 && sec % 60 === 0 ? `${sec / 60} dk` : `${sec} sn`;
}
