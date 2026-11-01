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

/** Müdavim Kartı (Kalfa seviyesi) indirim kodu */
export const MUDAVIM_COUPON_CODE = 'MUDAVIM5';

/** Geçerli kupon kodları (mock) */
const COUPON_DEFS: Record<string, CouponDef> = {
  MEZAT10: { title: '%10 indirim (en fazla ₺100)', percent: 10, maxDiscount: 100, days: 3 },
  ILKALIM: { title: '₺250 ve üzeri alışverişte ₺50 indirim', amount: 50, minSpend: 250, days: 7 },
  YAYIN15: { title: '₺300 ve üzeri alışverişte %15 indirim (en fazla ₺150)', percent: 15, maxDiscount: 150, minSpend: 300, days: 2 },
  [MUDAVIM_COUPON_CODE]: { title: 'Müdavim Kartı: %5 indirim (en fazla ₺75)', percent: 5, maxDiscount: 75, days: 5 },
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

/** Teklif kuralları metninin sürümü (onay kaydında saklanır; metin değişirse artırılır) */
export const BID_RULES_VERSION = 'teklif-kurallari-2026-11';

/** Teklif kurallarının onay kaydı (KVKK veri dışa aktarımında yer alır) */
export type BidRulesAcceptance = { version: string; at: string };

/**
 * Teklif kuralları güncel sürümüyle onaylandı mı. Kaydı olmayan eski "Okudum, devam et" onayı
 * ya da eski sürüm yeterli sayılmaz: kullanıcı kutuyu bir kez daha işaretler.
 */
export function hasAcceptedBidRules(s: { bidIntroAccepted: boolean; bidRulesAcceptance?: BidRulesAcceptance }): boolean {
  return s.bidIntroAccepted && s.bidRulesAcceptance?.version === BID_RULES_VERSION;
}

type LivePrefsState = {
  /** İlk teklif öncesi tanıtım + "teklifler bağlayıcıdır" onayı verildi mi */
  bidIntroAccepted: boolean;
  /** Teklif kuralları onayının sürümü ve zamanı */
  bidRulesAcceptance?: BidRulesAcceptance;
  /** "Yayını gizle" ile gizlenen yayınlar */
  hiddenShowIds: string[];
  coupon?: Coupon;
  /** Satın almalarda Mezat kredisini otomatik kullan */
  useCredits: boolean;
  /** "Teklif kurallarını okudum, onaylıyorum" kutusu işaretlenip kaydedildi */
  acceptBidRules: () => void;
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
      acceptBidRules: () => set({ bidIntroAccepted: true, bidRulesAcceptance: { version: BID_RULES_VERSION, at: new Date().toISOString() } }),
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
      version: 1,
      // v0 → v1: eski kulüp kuponu (KULUP5) Müdavim Kartı koduna taşınır
      migrate: (persisted, version) => {
        const s = (persisted ?? {}) as Partial<LivePrefsState>;
        if (version < 1 && s.coupon?.code === 'KULUP5') {
          s.coupon = { ...s.coupon, code: MUDAVIM_COUPON_CODE, title: COUPON_DEFS[MUDAVIM_COUPON_CODE].title };
        }
        return s as LivePrefsState;
      },
      partialize: (s) => ({ bidIntroAccepted: s.bidIntroAccepted, bidRulesAcceptance: s.bidRulesAcceptance, hiddenShowIds: s.hiddenShowIds, coupon: s.coupon, useCredits: s.useCredits }),
    },
  ),
);
