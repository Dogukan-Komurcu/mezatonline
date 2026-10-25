import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { ID } from '@/types';

import { persistStorage, storeKey } from './storage';

type SocialState = {
  /** Takip edilen kullanıcı id'leri */
  followingIds: ID[];
  /** Hatırlatıcı kurulan (kaydedilen) yayınlar */
  remindedShowIds: ID[];
  /** Kaydedilen (favori) ürünler */
  savedProductIds: ID[];
  /** Takip edilen kategoriler */
  followedCategoryIds: ID[];
  blockedIds: ID[];
  /** Son aramalar (en yeni başta) */
  recentSearches: string[];
  isFollowing: (id: ID) => boolean;
  toggleFollow: (id: ID) => boolean;
  toggleReminder: (showId: ID) => boolean;
  toggleSaveProduct: (productId: ID) => boolean;
  toggleFollowCategory: (categoryId: ID) => boolean;
  block: (id: ID) => void;
  unblock: (id: ID) => void;
  addRecentSearch: (q: string) => void;
  removeRecentSearch: (q: string) => void;
  clearRecentSearches: () => void;
};

function toggleIn(list: ID[], id: ID): [ID[], boolean] {
  return list.includes(id) ? [list.filter((x) => x !== id), false] : [[id, ...list], true];
}

export const useSocialStore = create<SocialState>()(
  persist(
    (set, get) => ({
      followingIds: [],
      remindedShowIds: [],
      savedProductIds: [],
      followedCategoryIds: [],
      blockedIds: [],
      recentSearches: ['pokemon 151', 'jordan 1', 'osmanlı sikke'],
      isFollowing: (id) => get().followingIds.includes(id),
      toggleFollow: (id) => {
        const [next, on] = toggleIn(get().followingIds, id);
        set({ followingIds: next });
        return on;
      },
      toggleReminder: (showId) => {
        const [next, on] = toggleIn(get().remindedShowIds, showId);
        set({ remindedShowIds: next });
        return on;
      },
      toggleSaveProduct: (productId) => {
        const [next, on] = toggleIn(get().savedProductIds, productId);
        set({ savedProductIds: next });
        return on;
      },
      toggleFollowCategory: (categoryId) => {
        const [next, on] = toggleIn(get().followedCategoryIds, categoryId);
        set({ followedCategoryIds: next });
        return on;
      },
      block: (id) => set((s) => ({ blockedIds: s.blockedIds.includes(id) ? s.blockedIds : [...s.blockedIds, id], followingIds: s.followingIds.filter((x) => x !== id) })),
      unblock: (id) => set((s) => ({ blockedIds: s.blockedIds.filter((x) => x !== id) })),
      addRecentSearch: (q) => {
        const query = q.trim();
        if (!query) return;
        set((s) => ({ recentSearches: [query, ...s.recentSearches.filter((x) => x.toLocaleLowerCase('tr-TR') !== query.toLocaleLowerCase('tr-TR'))].slice(0, 10) }));
      },
      removeRecentSearch: (q) => set((s) => ({ recentSearches: s.recentSearches.filter((x) => x !== q) })),
      clearRecentSearches: () => set({ recentSearches: [] }),
    }),
    { name: storeKey('social'), storage: persistStorage },
  ),
);
