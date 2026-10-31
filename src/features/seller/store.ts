/**
 * Satıcı tarafının paylaşılan `useSellerStore`'da bulunmayan ek durumu:
 * ilan durumları (aktif / taslak / pasif), yayın ayarları, KYC bilgileri, kargo ayarları,
 * kargo kodları, teklif yanıtları, tatil / prova modu.
 * Supabase'e geçişte bu alanlar `seller_profiles`, `listings.status`, `shows.settings`, `shipments` tablolarına taşınacak.
 */
import { useEffect, useState } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { AddressDraft } from '@/features/wallet/forms';
import { persistStorage, storeKey } from '@/store/storage';
import type { Carrier, ID } from '@/types';

export type ListingStatus = 'active' | 'draft' | 'inactive';

export type ShowFormat = 'auction' | 'buy_now' | 'breaks';
export type ShowVisibility = 'public' | 'private';

export type ShowMeta = {
  format: ShowFormat;
  moderators: string[];
  visibility: ShowVisibility;
};

export type SellerType = 'individual' | 'sole_proprietor' | 'company';
export type ExperienceLevel = 'new' | 'other_platforms' | 'physical_store';

export type SellerKyc = {
  sellerType: SellerType;
  /** Kimlikteki ad soyad */
  legalName: string;
  /** Yalnızca bellekte; cihaza boş yazılır (bkz. redactKyc) */
  tckn: string;
  /** "GG.AA.YYYY" · yalnızca bellekte; cihaza boş yazılır */
  birthDate: string;
  /** Cihazda saklanan maskeli TCKN (yalnızca son 2 hane), örn. "•••••••••46" */
  tcknMasked?: string;
  taxOffice?: string;
  taxNo?: string;
  companyTitle?: string;
  returnAddress: AddressDraft;
  phone: string;
  phoneVerified: boolean;
  experience: ExperienceLevel;
  platforms: string[];
  monthlyVolume: string;
  subcategoryId?: string;
  marketingConsent: boolean;
};

export type ShippingCostMode = 'buyer' | 'capped' | 'seller';

export type ShippingSettings = {
  /** Satıcı kargo ayarlarını en az bir kez gözden geçirdi mi (kontrol listesi) */
  configured: boolean;
  carrier: Carrier;
  costMode: ShippingCostMode;
  /** costMode = capped iken alıcının ödeyeceği en yüksek kargo ücreti */
  cap: number;
  /** Hazırlama süresi (iş günü) */
  handlingDays: 1 | 2;
  freePickup: boolean;
};

export type ShippingLabel = { code: string; carrier: Carrier; createdAt: string };

export type OfferResolution = { status: 'accepted' | 'declined' | 'countered'; counter?: number; at: string };

type SellerExtrasState = {
  listingStatus: Record<ID, ListingStatus>;
  showMeta: Record<ID, ShowMeta>;
  kyc?: SellerKyc;
  shipping: ShippingSettings;
  vacation: boolean;
  rehearsal: boolean;
  labels: Record<ID, ShippingLabel>;
  offerResolutions: Record<ID, OfferResolution>;
  cancelReasons: Record<ID, string>;
  /** Satıcı başvurusunun onaylandığı an */
  approvedAt?: string;
  /** Onay sonrası Satıcı Paneli'nde konfeti göster */
  celebrate: boolean;
  /** Satıcı panelindeki "hoş geldin" kartı kapatıldı mı */
  welcomeDismissed: boolean;
  setListingStatus: (id: ID, status: ListingStatus) => void;
  setListingStatuses: (ids: ID[], status: ListingStatus) => void;
  removeListingStatus: (ids: ID[]) => void;
  setShowMeta: (id: ID, meta: ShowMeta) => void;
  setKyc: (kyc: SellerKyc) => void;
  updateKyc: (patch: Partial<SellerKyc>) => void;
  setShipping: (patch: Partial<ShippingSettings>) => void;
  setVacation: (v: boolean) => void;
  setRehearsal: (v: boolean) => void;
  setLabel: (orderId: ID, label: ShippingLabel) => void;
  resolveOffer: (offerId: ID, resolution: Omit<OfferResolution, 'at'>) => void;
  setCancelReason: (orderId: ID, reason: string) => void;
  markApproved: () => void;
  setCelebrate: (v: boolean) => void;
  dismissWelcome: () => void;
};

/** TCKN ve doğum tarihi AsyncStorage'a yazılmaz; görüntüleme için yalnızca maskeli hâli saklanır */
function redactKyc(kyc: SellerKyc | undefined): SellerKyc | undefined {
  if (!kyc) return kyc;
  const digits = (kyc.tckn ?? '').replace(/\D/g, '');
  return { ...kyc, tckn: '', birthDate: '', tcknMasked: digits.length === 11 ? `•••••••••${digits.slice(-2)}` : kyc.tcknMasked };
}

const DEFAULT_SHIPPING: ShippingSettings = {
  configured: false,
  carrier: 'Yurtiçi Kargo',
  costMode: 'buyer',
  cap: 49,
  handlingDays: 2,
  freePickup: false,
};

export const useSellerExtras = create<SellerExtrasState>()(
  persist(
    (set) => ({
      listingStatus: {},
      showMeta: {},
      kyc: undefined,
      shipping: DEFAULT_SHIPPING,
      vacation: false,
      rehearsal: false,
      labels: {},
      offerResolutions: {},
      cancelReasons: {},
      approvedAt: undefined,
      celebrate: false,
      welcomeDismissed: false,
      setListingStatus: (id, status) => set((s) => ({ listingStatus: { ...s.listingStatus, [id]: status } })),
      setListingStatuses: (ids, status) =>
        set((s) => {
          const next = { ...s.listingStatus };
          ids.forEach((id) => {
            next[id] = status;
          });
          return { listingStatus: next };
        }),
      removeListingStatus: (ids) =>
        set((s) => {
          const next = { ...s.listingStatus };
          ids.forEach((id) => {
            delete next[id];
          });
          return { listingStatus: next };
        }),
      setShowMeta: (id, meta) => set((s) => ({ showMeta: { ...s.showMeta, [id]: meta } })),
      setKyc: (kyc) => set({ kyc }),
      updateKyc: (patch) => set((s) => (s.kyc ? { kyc: { ...s.kyc, ...patch } } : {})),
      setShipping: (patch) => set((s) => ({ shipping: { ...s.shipping, ...patch } })),
      setVacation: (vacation) => set({ vacation }),
      setRehearsal: (rehearsal) => set({ rehearsal }),
      setLabel: (orderId, label) => set((s) => ({ labels: { ...s.labels, [orderId]: label } })),
      resolveOffer: (offerId, resolution) =>
        set((s) => ({ offerResolutions: { ...s.offerResolutions, [offerId]: { ...resolution, at: new Date().toISOString() } } })),
      setCancelReason: (orderId, reason) => set((s) => ({ cancelReasons: { ...s.cancelReasons, [orderId]: reason } })),
      markApproved: () => set((s) => ({ approvedAt: s.approvedAt ?? new Date().toISOString() })),
      setCelebrate: (celebrate) => set({ celebrate }),
      dismissWelcome: () => set({ welcomeDismissed: true }),
    }),
    {
      name: storeKey('seller-extras'),
      storage: persistStorage,
      partialize: (s) => ({ ...s, kyc: redactKyc(s.kyc) }),
      version: 1,
      // v0 TCKN ve doğum tarihini açık metin saklıyordu
      migrate: (persisted, version) => {
        const s = persisted as SellerExtrasState;
        return version < 1 && s ? { ...s, kyc: redactKyc(s.kyc) } : s;
      },
    },
  ),
);

/** Ek satıcı store'u AsyncStorage'dan yüklendi mi (kök layout bu store'u beklemediği için) */
export function useSellerExtrasHydrated(): boolean {
  const [hydrated, setHydrated] = useState(() => useSellerExtras.persist.hasHydrated());
  useEffect(() => {
    if (hydrated) return;
    const unsub = useSellerExtras.persist.onFinishHydration(() => setHydrated(true));
    if (useSellerExtras.persist.hasHydrated()) setHydrated(true);
    return unsub;
  }, [hydrated]);
  return hydrated;
}
