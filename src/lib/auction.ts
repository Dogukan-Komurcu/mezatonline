/**
 * Açık artırma kuralları (Whatnot mekaniklerinin ₺ uyarlaması — bkz. docs/research/buyer.md §4-6).
 *
 * - Normal açık artırma: kalan süre 10 sn'nin altındayken gelen her teklif süreyi
 *   satıcının "karşı teklif süresi"ne (counterBidTime, varsayılan 10 sn) çeker; süre asla kısalmaz.
 * - Uzatmasız mezat (kodda `suddenDeath`): süre asla uzamaz; 00:01'de son teklif veren kazanır.
 * - Özel tutar + "Otomatik teklif (en fazla)" açıksa (varsayılan kapalı): sistem yalnızca biri sana
 *   karşı teklif verdiğinde, minimum artışla, belirlediğin tavana kadar otomatik teklif verir (gizli).
 * - Tüm teklifler bağlayıcıdır; kurumsal satıcılardan alımlarda alıcının 14 günlük yasal cayma hakkı saklıdır
 *   (alıcıya gösterilen metin: features/commerce/utils.ts BINDING_BID_TEXT).
 */

/** Kullanıcıya gösterilen mezat biçimi adları (Ani Bitiş → Uzatmasız, bkz. docs/TASARIM-KIMLIGI.md §5) */
export const AUCTION_FORMAT_LABEL = 'Açık artırma';
export const SUDDEN_DEATH_LABEL = 'Uzatmasız';

/** Mezat biçimi etiketi: suddenDeath → "Uzatmasız", değilse "Açık artırma" */
export function auctionFormatLabel(suddenDeath: boolean): string {
  return suddenDeath ? SUDDEN_DEATH_LABEL : AUCTION_FORMAT_LABEL;
}

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

/**
 * Özel tutar penceresindeki hızlı artış düğmeleri (₺).
 * Fiyat ölçeğine uyar: ₺100 altı +5 / +10 / +20; ₺1.000 altı +10 / +50 / +100; ₺10.000 altı +100 / +500 / +1.000 …
 */
export function quickIncrements(min: number): [number, number, number] {
  if (min < 100) return [5, 10, 20];
  if (min < 1_000) return [10, 50, 100];
  if (min < 10_000) return [100, 500, 1_000];
  if (min < 100_000) return [1_000, 5_000, 10_000];
  return [10_000, 50_000, 100_000];
}

/** Teklif panelindeki tutar seçicide [−] ile bir alt adım (en düşük geçerli teklifin altına inmez) */
export function stepDown(amount: number, min: number): number {
  return Math.max(min, amount - bidIncrement(Math.max(0, amount - 1)));
}

/** Teklif panelindeki tutar seçicide [+] ile bir üst adım */
export function stepUp(amount: number): number {
  return amount + bidIncrement(amount);
}

/**
 * Kabul edilen bir teklif sonrası yeni bitiş zamanı (ms).
 * Kalan < 10 sn ise: endsAt = now + max(kalan, counterBidTime). Uzatmasız mezatta değişmez.
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
