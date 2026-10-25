/**
 * Hesap alanına ait yerel (kalıcı) tercihler:
 * Hesap Kontrolleri (PIN, izleme/harcama hatırlatıcı ve limitleri, DM), Doğrulanmış Alıcı durumu,
 * kargo tercihleri, gizlilik / İYS izinleri, kullanılan promosyon kodları.
 * Supabase'e geçişte bunlar `profiles` / `user_settings` tablolarına taşınacak.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { persistStorage, storeKey } from '@/store/storage';

export type ControlKind = 'watch' | 'spend';
export type ControlPeriod = 'weekly' | 'monthly';
export type ControlType = 'reminder' | 'limit';

/** watch → dakika, spend → ₺ */
export type ControlValues = Record<ControlPeriod, { reminder?: number; limit?: number }>;

export type DeliveryPreference = 'door' | 'branch';

type AccountState = {
  // ── Hesap Kontrolleri
  pin?: string;
  watch: ControlValues;
  spend: ControlValues;
  dmEnabled: boolean;
  privateEntry: boolean;
  activityStatus: boolean;
  // ── Doğrulanmış Alıcı
  verified: boolean;
  verifiedAt?: string;
  verifiedCardLast4?: string;
  // ── Kargo tercihleri
  weeklyBundling: boolean;
  deliveryPreference: DeliveryPreference;
  // ── Gizlilik
  showLoyaltyBadge: boolean;
  suggestAccount: boolean;
  personalizedAds: boolean;
  // ── Bildirim / İYS izinleri
  quietHours: boolean;
  iysSms: boolean;
  iysEmail: boolean;
  iysCall: boolean;
  // ── Diğer
  redeemedCodes: string[];
  usernameChangedAt?: string;

  setPin: (pin: string) => void;
  setControl: (kind: ControlKind, period: ControlPeriod, type: ControlType, value: number | undefined) => void;
  setFlag: (key: AccountFlag, value: boolean) => void;
  setDeliveryPreference: (p: DeliveryPreference) => void;
  markVerified: (last4?: string) => void;
  redeemCode: (code: string) => void;
  markUsernameChanged: () => void;
};

export type AccountFlag =
  | 'dmEnabled'
  | 'privateEntry'
  | 'activityStatus'
  | 'weeklyBundling'
  | 'showLoyaltyBadge'
  | 'suggestAccount'
  | 'personalizedAds'
  | 'quietHours'
  | 'iysSms'
  | 'iysEmail'
  | 'iysCall';

const emptyControls = (): ControlValues => ({ weekly: {}, monthly: {} });

export const useAccountStore = create<AccountState>()(
  persist(
    (set) => ({
      pin: undefined,
      watch: emptyControls(),
      spend: emptyControls(),
      dmEnabled: true,
      privateEntry: false,
      activityStatus: true,
      verified: false,
      weeklyBundling: false,
      deliveryPreference: 'door',
      showLoyaltyBadge: true,
      suggestAccount: true,
      personalizedAds: false,
      quietHours: false,
      iysSms: false,
      iysEmail: true,
      iysCall: false,
      redeemedCodes: [],
      setPin: (pin) => set({ pin }),
      setControl: (kind, period, type, value) =>
        set((s) => {
          const next: ControlValues = { ...s[kind], [period]: { ...s[kind][period], [type]: value } };
          return kind === 'watch' ? { watch: next } : { spend: next };
        }),
      setFlag: (key, value) => set({ [key]: value } as Partial<AccountState>),
      setDeliveryPreference: (deliveryPreference) => set({ deliveryPreference }),
      markVerified: (last4) => set({ verified: true, verifiedAt: new Date().toISOString(), verifiedCardLast4: last4 }),
      redeemCode: (code) => set((s) => ({ redeemedCodes: s.redeemedCodes.includes(code) ? s.redeemedCodes : [...s.redeemedCodes, code] })),
      markUsernameChanged: () => set({ usernameChangedAt: new Date().toISOString() }),
    }),
    { name: storeKey('account'), storage: persistStorage },
  ),
);

// ─── Dönem hesapları (Hafta: Pazartesi 00:00 – Pazar 23:59, Türkiye saati) ─────

export function periodStart(period: ControlPeriod, now = new Date()): Date {
  if (period === 'monthly') return new Date(now.getFullYear(), now.getMonth(), 1);
  const dow = (now.getDay() + 6) % 7; // Pazartesi = 0
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - dow);
}

export function periodEnd(period: ControlPeriod, now = new Date()): Date {
  if (period === 'monthly') return new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const start = periodStart('weekly', now);
  return new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7);
}

/**
 * İzleme süresi (dakika). Mock: canlı yayın izleme takibi sunucu tarafında yapılacak;
 * şimdilik günün ve haftanın ilerleyişine göre tutarlı bir değer üretir.
 */
export function watchMinutes(period: ControlPeriod, now = new Date()): number {
  const dow = (now.getDay() + 6) % 7;
  const weekly = 38 + dow * 41 + Math.min(now.getHours(), 22) * 3;
  if (period === 'weekly') return weekly;
  const earlierDaysThisMonth = Math.max(0, now.getDate() - 1 - dow);
  return weekly + earlierDaysThisMonth * 33;
}

/** 205 → "3 sa 25 dk", 45 → "45 dk" */
export function formatMinutes(min: number): string {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (h === 0) return `${m} dk`;
  return m ? `${h} sa ${m} dk` : `${h} sa`;
}

export const WATCH_PRESETS = [60, 120, 300, 600, 1200] as const;
export const SPEND_PRESETS = [500, 1000, 2500, 5000, 10000] as const;
