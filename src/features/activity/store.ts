/**
 * Aktivite / sipariş akışının paylaşılan store'larda karşılığı olmayan yerel durumu:
 * yardım talepleri, iptal talepleri, gönderilen değerlendirmeler, sipariş adres değişiklikleri,
 * geri çekilen fiyat önerileri. Supabase'e geçişte bunlar ayrı tablolara taşınacak.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { persistStorage, storeKey } from '@/store/storage';
import type { ID } from '@/types';

export type HelpIssue =
  | 'not_received'
  | 'damaged'
  | 'missing'
  | 'wrong_item'
  | 'not_as_described'
  | 'counterfeit'
  | 'withdrawal';

export type HelpRequest = {
  orderId: ID;
  issue: HelpIssue;
  description: string;
  photos: string[];
  conversationId?: ID;
  createdAt: string;
};

export type CancelRequest = {
  orderId: ID;
  reason: string;
  createdAt: string;
};

export type SubmittedReview = {
  orderId: ID;
  sellerId: ID;
  rating: number;
  shipping?: number;
  packaging?: number;
  accuracy?: number;
  comment: string;
  productTitle: string;
  productImage?: string;
  createdAt: string;
};

type ActivityExtrasState = {
  helpRequests: Record<ID, HelpRequest>;
  cancelRequests: Record<ID, CancelRequest>;
  reviews: Record<ID, SubmittedReview>;
  /** Sipariş → yeni teslimat adresi id'si (kargolanmadan önce değiştirilebilir) */
  addressOverrides: Record<ID, ID>;
  withdrawnOfferIds: ID[];
  addHelpRequest: (r: HelpRequest) => void;
  addCancelRequest: (r: CancelRequest) => void;
  addReview: (r: SubmittedReview) => void;
  setAddressOverride: (orderId: ID, addressId: ID) => void;
  withdrawOffer: (offerId: ID) => void;
};

export const useActivityExtras = create<ActivityExtrasState>()(
  persist(
    (set) => ({
      helpRequests: {},
      cancelRequests: {},
      reviews: {},
      addressOverrides: {},
      withdrawnOfferIds: [],
      addHelpRequest: (r) => set((s) => ({ helpRequests: { ...s.helpRequests, [r.orderId]: r } })),
      addCancelRequest: (r) => set((s) => ({ cancelRequests: { ...s.cancelRequests, [r.orderId]: r } })),
      addReview: (r) => set((s) => ({ reviews: { ...s.reviews, [r.orderId]: r } })),
      setAddressOverride: (orderId, addressId) => set((s) => ({ addressOverrides: { ...s.addressOverrides, [orderId]: addressId } })),
      withdrawOffer: (offerId) =>
        set((s) => ({ withdrawnOfferIds: s.withdrawnOfferIds.includes(offerId) ? s.withdrawnOfferIds : [...s.withdrawnOfferIds, offerId] })),
    }),
    { name: storeKey('activity-extras'), storage: persistStorage },
  ),
);
