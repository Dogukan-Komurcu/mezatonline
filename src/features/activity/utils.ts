/**
 * Sipariş / aktivite yardımcıları: durum etiketleri, ilerleme, Alıcı Koruması süresi,
 * iptal uygunluğu, kargo takip bağlantıları ve tarih grupları.
 */
import { useEffect, useState } from 'react';

import type { ColorTokens } from '@/theme';
import type { Address, CardBrand, Carrier, Order, OrderStatus, PaymentMethod } from '@/types';

const MIN = 60_000;
const HOUR = 60 * MIN;
export const DAY = 24 * HOUR;

const MONTHS_SHORT = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
const MONTHS_LONG = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const DAYS_LONG = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

// ─── Durum ───────────────────────────────────────────────────────────────────

export type Tone = 'neutral' | 'warning' | 'info' | 'success' | 'danger' | 'accent';

export function toneColor(tone: Tone, colors: ColorTokens): string {
  switch (tone) {
    case 'warning':
      return colors.warning;
    case 'info':
      return colors.info;
    case 'success':
      return colors.success;
    case 'danger':
      return colors.danger;
    case 'accent':
      return colors.accent;
    default:
      return colors.textSecondary;
  }
}

/** Token rengine saydamlık ekler (#RRGGBB → #RRGGBBAA) */
export function withAlpha(hex: string, alpha: number): string {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return hex;
  const a = Math.round(Math.min(1, Math.max(0, alpha)) * 255)
    .toString(16)
    .padStart(2, '0');
  return hex + a;
}

/** Listede ve detayda gösterilen durum etiketi (Whatnot: Preparing Package / In Transit / Pending Review …) */
export function orderStatusDisplay(order: Order, opts: { cancelRequested?: boolean } = {}): { label: string; tone: Tone } {
  switch (order.status) {
    case 'paid':
      return opts.cancelRequested ? { label: 'İptal talebi bekleniyor', tone: 'danger' } : { label: 'Ödeme alındı', tone: 'neutral' };
    case 'preparing':
      return opts.cancelRequested ? { label: 'İptal talebi bekleniyor', tone: 'danger' } : { label: 'Hazırlanıyor', tone: 'warning' };
    case 'shipped':
      return { label: 'Kargoda', tone: 'info' };
    case 'out_for_delivery':
      return { label: 'Dağıtıma çıktı', tone: 'info' };
    case 'delivered':
      return order.reviewed ? { label: 'Tamamlandı', tone: 'success' } : { label: 'Değerlendirme bekliyor', tone: 'accent' };
    case 'cancelled':
      return { label: 'İptal edildi', tone: 'danger' };
    case 'return_requested':
      return { label: 'İade talebi', tone: 'warning' };
    case 'refunded':
      return { label: 'İade edildi', tone: 'neutral' };
  }
}

export const ORDER_STEPS = ['Hazırlanıyor', 'Kargoda', 'Dağıtıma çıktı', 'Teslim edildi'] as const;

/** Takip çubuğundaki adım (iptal / iade durumlarında -1) */
export function orderStepIndex(status: OrderStatus): number {
  switch (status) {
    case 'paid':
    case 'preparing':
      return 0;
    case 'shipped':
      return 1;
    case 'out_for_delivery':
      return 2;
    case 'delivered':
      return 3;
    default:
      return -1;
  }
}

export type PurchaseFilter = 'all' | 'active' | 'completed' | 'review' | 'cancelled';

export const PURCHASE_FILTERS: { key: PurchaseFilter; label: string }[] = [
  { key: 'all', label: 'Tümü' },
  { key: 'active', label: 'Devam eden' },
  { key: 'completed', label: 'Tamamlanan' },
  { key: 'review', label: 'Değerlendirme bekleyen' },
  { key: 'cancelled', label: 'İptal/İade' },
];

export function matchesPurchaseFilter(order: Order, filter: PurchaseFilter): boolean {
  switch (filter) {
    case 'active':
      return order.status === 'paid' || order.status === 'preparing' || order.status === 'shipped' || order.status === 'out_for_delivery';
    case 'completed':
      return order.status === 'delivered';
    case 'review':
      return order.status === 'delivered' && !order.reviewed;
    case 'cancelled':
      return order.status === 'cancelled' || order.status === 'return_requested' || order.status === 'refunded';
    default:
      return true;
  }
}

export function eventAt(order: Order, status: OrderStatus): string | undefined {
  return order.timeline.find((e) => e.status === status)?.at;
}

/** Tahmini teslim tarihi (ms): kargoya verildikten 2 gün sonra; henüz kargolanmadıysa siparişten 3 gün sonra */
export function estimatedDelivery(order: Order): number {
  const shipped = eventAt(order, 'shipped');
  if (order.status === 'out_for_delivery') return Date.now();
  if (shipped) return Date.parse(shipped) + 2 * DAY;
  return Date.parse(order.createdAt) + 3 * DAY;
}

// ─── Alıcı Koruması / iptal / cayma ─────────────────────────────────────────

/** 7 günlük koruma: kartlar, sikke, sneaker, lüks. 2 gün: bitki ve gıda. Diğerleri 14 gün (teslimattan). */
const SHORT_PROTECTION = ['tcg', 'sports_cards', 'coins', 'sneakers', 'watches', 'bags'];
const PERISHABLE = ['plants', 'food'];

export type ProtectionInfo = {
  /** Koruma hâlâ geçerli mi */
  active: boolean;
  daysLeft: number;
  deadline: number;
  /** Teslimattan sonraki gün sayısı (kategoriye göre) */
  windowDays: number;
  delivered: boolean;
};

export function protectionInfo(order: Order, categoryId: string | undefined, now: number = Date.now()): ProtectionInfo {
  const windowDays = categoryId && PERISHABLE.includes(categoryId) ? 2 : categoryId && SHORT_PROTECTION.includes(categoryId) ? 7 : 14;
  const created = Date.parse(order.createdAt);
  const purchaseLimit = created + 30 * DAY;
  const deliveredAt = eventAt(order, 'delivered');
  const deadline = deliveredAt ? Math.min(purchaseLimit, Date.parse(deliveredAt) + windowDays * DAY) : purchaseLimit;
  const msLeft = deadline - now;
  const closed = order.status === 'cancelled' || order.status === 'refunded';
  return { active: msLeft > 0 && !closed, daysLeft: Math.max(0, Math.ceil(msLeft / DAY)), deadline, windowDays, delivered: !!deliveredAt };
}

export function protectionLabel(p: ProtectionInfo): string {
  if (!p.active) return 'Koruma süresi sona erdi';
  if (p.daysLeft <= 1) return 'Koruma süresi: son gün';
  return `Koruma süresi: ${p.daysLeft} gün kaldı`;
}

/** Cayma hakkı: teslimattan itibaren 14 gün (Mesafeli Sözleşmeler Yönetmeliği) */
export function withdrawalDaysLeft(order: Order, now: number = Date.now()): number {
  const deliveredAt = eventAt(order, 'delivered');
  if (!deliveredAt || order.status !== 'delivered') return 0;
  return Math.max(0, Math.ceil((Date.parse(deliveredAt) + 14 * DAY - now) / DAY));
}

/** İptal talebi: kargo kodu oluşmadan (ödeme alındı / hazırlanıyor) ve satın almadan sonraki 24 saat içinde */
export function canRequestCancel(order: Order, now: number = Date.now()): boolean {
  return (order.status === 'paid' || order.status === 'preparing') && now - Date.parse(order.createdAt) < DAY;
}

export function cancelHoursLeft(order: Order, now: number = Date.now()): number {
  return Math.max(0, Math.ceil((Date.parse(order.createdAt) + DAY - now) / HOUR));
}

/** Teslimat adresi yalnız kargoya verilmeden önce değiştirilebilir */
export function canChangeAddress(order: Order): boolean {
  return order.status === 'paid' || order.status === 'preparing';
}

/** Satın alma videosu: satın almadan itibaren 60 gün */
export function videoReceiptDaysLeft(order: Order, now: number = Date.now()): number {
  return Math.max(0, Math.ceil((Date.parse(order.createdAt) + 60 * DAY - now) / DAY));
}

// ─── Kargo takip ────────────────────────────────────────────────────────────

export function carrierTrackingUrl(carrier: Carrier | undefined, no: string | undefined): string {
  const n = encodeURIComponent(no ?? '');
  switch (carrier) {
    case 'Yurtiçi Kargo':
      return `https://www.yurticikargo.com/tr/online-servisler/gonderi-sorgula?code=${n}`;
    case 'Aras Kargo':
      return `https://kargotakip.araskargo.com.tr/mainpage.aspx?code=${n}`;
    case 'MNG Kargo':
      return `https://www.mngkargo.com.tr/gonderi-takip?takipNo=${n}`;
    case 'PTT Kargo':
      return `https://gonderitakip.ptt.gov.tr/Track/Verify?q=${n}`;
    case 'Sürat Kargo':
      return `https://www.suratkargo.com.tr/KargoTakip/?kargotakipno=${n}`;
    case 'HepsiJet':
      return `https://www.hepsijet.com/gonderi-takibi/${n}`;
    case 'Trendyol Express':
      return `https://www.trendyolexpress.com/gonderi-takip?trackingNumber=${n}`;
    default:
      return `https://www.google.com/search?q=${encodeURIComponent(`kargo takip ${no ?? ''}`)}`;
  }
}

// ─── Biçimlendirme ──────────────────────────────────────────────────────────

function startOfDay(t: number): number {
  const d = new Date(t);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** "28 Eki" */
export function shortDate(input: string | number): string {
  const d = new Date(input);
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
}

/** "Çarşamba, 28 Ekim" */
export function longDay(input: string | number): string {
  const d = new Date(input);
  return `${DAYS_LONG[d.getDay()]}, ${d.getDate()} ${MONTHS_LONG[d.getMonth()]}`;
}

/** Liste grup başlığı: Bugün / Dün / Çarşamba, 21 Ekim / 3 Eylül 2026 */
export function dayGroupLabel(input: string, now: number = Date.now()): string {
  const t = Date.parse(input);
  const diff = Math.round((startOfDay(now) - startOfDay(t)) / DAY);
  if (diff <= 0) return 'Bugün';
  if (diff === 1) return 'Dün';
  if (diff < 7) return longDay(t);
  const d = new Date(t);
  return `${d.getDate()} ${MONTHS_LONG[d.getMonth()]} ${d.getFullYear()}`;
}

export const CARD_BRAND_LABELS: Record<CardBrand, string> = {
  visa: 'Visa',
  mastercard: 'Mastercard',
  troy: 'Troy',
  amex: 'American Express',
};

export function paymentLabel(p: PaymentMethod | undefined): string {
  if (!p) return 'Kayıtlı kart';
  return `${CARD_BRAND_LABELS[p.brand]} •••• ${p.last4}`;
}

export function addressLines(a: Address): { title: string; line1: string; line2: string } {
  return {
    title: `${a.title} · ${a.fullName}`,
    line1: `${a.neighborhood}${/mah/i.test(a.neighborhood) ? '' : ' Mah.'} ${a.line}`.trim(),
    line2: `${a.district} / ${a.city}${a.postalCode ? ` ${a.postalCode}` : ''}`,
  };
}

/** Basit 32-bit hash (deterministik mock değerler için) */
export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Saniyede/dakikada bir güncellenen "şimdi" (geri sayımlar için) */
export function useNow(intervalMs = 60_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}
