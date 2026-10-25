/**
 * Mock kupon kodları + kullanılmış kupon kaydı.
 * Uygulama sırası (Whatnot ile aynı): Kupon → Mezat Kredisi → Kart. Kupon ve kredi yalnızca ürün tutarına uygulanır.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { formatTRY } from '@/lib/format';
import { persistStorage, storeKey } from '@/store/storage';
import type { OrderSource } from '@/types';

export type Coupon = {
  code: string;
  /** Kısa açıklama: "₺100 hoş geldin indirimi" */
  label: string;
  kind: 'fixed' | 'percent';
  value: number;
  /** Yüzde kuponlarda azami indirim */
  max?: number;
  /** Asgari ürün tutarı */
  minSubtotal?: number;
  /** Kullanıcı başına tek kullanım */
  oncePerUser?: boolean;
};

export const COUPONS: Record<string, Coupon> = {
  HOSGELDIN: { code: 'HOSGELDIN', label: '₺100 hoş geldin indirimi', kind: 'fixed', value: 100, oncePerUser: true },
  MEZAT10: { code: 'MEZAT10', label: '%10 indirim (en fazla ₺250)', kind: 'percent', value: 10, max: 250 },
};

/** "hoşgeldin " → "HOSGELDIN" */
export function normalizeCode(raw: string): string {
  return raw
    .trim()
    .toLocaleUpperCase('tr-TR')
    .replace(/\s+/g, '')
    .replace(/İ/g, 'I')
    .replace(/Ş/g, 'S')
    .replace(/Ğ/g, 'G')
    .replace(/Ü/g, 'U')
    .replace(/Ö/g, 'O')
    .replace(/Ç/g, 'C');
}

export function couponDiscount(coupon: Coupon, subtotal: number): number {
  const raw = coupon.kind === 'fixed' ? coupon.value : Math.round(subtotal * coupon.value) / 100;
  const capped = coupon.max ? Math.min(coupon.max, raw) : raw;
  return Math.max(0, Math.min(subtotal, Math.round(capped * 100) / 100));
}

export type CouponCheck = { ok: true; coupon: Coupon } | { ok: false; error: string };

export function checkCoupon(raw: string, ctx: { subtotal: number; source: OrderSource; used: string[] }): CouponCheck {
  const code = normalizeCode(raw);
  if (!code) return { ok: false, error: 'Kupon kodunu gir' };
  const coupon = COUPONS[code];
  if (!coupon) return { ok: false, error: 'Geçersiz kupon kodu' };
  if (ctx.source === 'offer') return { ok: false, error: 'Kuponlar fiyat önerisiyle alınan ürünlerde kullanılamaz' };
  if (coupon.oncePerUser && ctx.used.includes(code)) return { ok: false, error: 'Bu kuponu daha önce kullandın' };
  if (coupon.minSubtotal && ctx.subtotal < coupon.minSubtotal) {
    return { ok: false, error: `Bu kupon ${formatTRY(coupon.minSubtotal)} ve üzeri alışverişlerde geçerli` };
  }
  return { ok: true, coupon };
}

type CouponState = {
  used: string[];
  markUsed: (code: string) => void;
};

export const useCouponStore = create<CouponState>()(
  persist(
    (set) => ({
      used: [],
      markUsed: (code) => set((s) => ({ used: s.used.includes(code) ? s.used : [...s.used, code] })),
    }),
    { name: storeKey('coupons'), storage: persistStorage },
  ),
);
