/**
 * Canlı yayın oynatıcısına özel küçük kalıcı tercih deposu:
 * ilk teklif onayı (Alıcı Koruması / teklifler bağlayıcıdır), gizlenen yayınlar,
 * cüzdandan uygulanan kupon ve Mezat kredisi kullanımı.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { persistStorage, storeKey } from '@/store/storage';

export type Coupon = {
  code: string;
  title: string;
  percent?: number;
  amount?: number;
  maxDiscount?: number;
  minSpend?: number;
  expiresAt: string;
};

type CouponDef = Omit<Coupon, 'code' | 'expiresAt'> & { days: number };

/** Geçerli kupon kodları (mock) */
const COUPON_DEFS: Record<string, CouponDef> = {
  MEZAT10: { title: '%10 indirim (en fazla ₺100)', percent: 10, maxDiscount: 100, days: 3 },
  ILKALIM: { title: '₺250 ve üzeri alışverişte ₺50 indirim', amount: 50, minSpend: 250, days: 7 },
  YAYIN15: { title: '₺300 ve üzeri alışverişte %15 indirim (en fazla ₺150)', percent: 15, maxDiscount: 150, minSpend: 300, days: 2 },
  KULUP5: { title: 'Sadakat Kulübü: %5 indirim (en fazla ₺75)', percent: 5, maxDiscount: 75, days: 5 },
};

/** Kuponun bu tutara uygulayacağı indirim (₺, tam sayı) */
export function couponDiscount(coupon: Coupon | undefined, price: number): number {
  if (!coupon || price <= 1) return 0;
  if (new Date(coupon.expiresAt).getTime() < Date.now()) return 0;
  if (coupon.minSpend && price < coupon.minSpend) return 0;
  const raw = coupon.percent ? (price * coupon.percent) / 100 : (coupon.amount ?? 0);
  const capped = coupon.maxDiscount ? Math.min(raw, coupon.maxDiscount) : raw;
  return Math.max(0, Math.min(price - 1, Math.round(capped)));
}

export type ApplyCouponResult = { ok: true; coupon: Coupon } | { ok: false; error: string };

type LivePrefsState = {
  /** İlk teklif öncesi tanıtım + "teklifler bağlayıcıdır" onayı verildi mi */
  bidIntroAccepted: boolean;
  /** "Yayını gizle" ile gizlenen yayınlar */
  hiddenShowIds: string[];
  coupon?: Coupon;
  /** Satın almalarda Mezat kredisini otomatik kullan */
  useCredits: boolean;
  acceptBidIntro: () => void;
  hideShow: (id: string) => void;
  applyCoupon: (code: string) => ApplyCouponResult;
  clearCoupon: () => void;
  setUseCredits: (v: boolean) => void;
  /** Satın alma sırasında kuponu tüketir; uygulanan indirimi döner (indirim yoksa kupon korunur) */
  consumeCoupon: (price: number) => number;
};

export const useLivePrefs = create<LivePrefsState>()(
  persist(
    (set, get) => ({
      bidIntroAccepted: false,
      hiddenShowIds: [],
      coupon: undefined,
      useCredits: true,
      acceptBidIntro: () => set({ bidIntroAccepted: true }),
      hideShow: (id) => set((s) => ({ hiddenShowIds: s.hiddenShowIds.includes(id) ? s.hiddenShowIds : [id, ...s.hiddenShowIds].slice(0, 50) })),
      applyCoupon: (raw) => {
        const code = raw.trim().toLocaleUpperCase('tr-TR').replace(/İ/g, 'I');
        if (!code) return { ok: false, error: 'Bir kupon kodu gir' };
        const def = COUPON_DEFS[code];
        if (!def) return { ok: false, error: 'Bu kupon kodu geçerli değil' };
        if (get().coupon?.code === code) return { ok: false, error: 'Bu kupon zaten uygulandı' };
        const { days, ...rest } = def;
        const coupon: Coupon = { ...rest, code, expiresAt: new Date(Date.now() + days * 86_400_000).toISOString() };
        set({ coupon });
        return { ok: true, coupon };
      },
      clearCoupon: () => set({ coupon: undefined }),
      setUseCredits: (useCredits) => set({ useCredits }),
      consumeCoupon: (price) => {
        const discount = couponDiscount(get().coupon, price);
        if (discount > 0) set({ coupon: undefined });
        return discount;
      },
    }),
    {
      name: storeKey('live-prefs'),
      storage: persistStorage,
      partialize: (s) => ({ bidIntroAccepted: s.bidIntroAccepted, hiddenShowIds: s.hiddenShowIds, coupon: s.coupon, useCredits: s.useCredits }),
    },
  ),
);
