/**
 * Arama özelliğine ait küçük kalıcı store: kaydedilen aramalar.
 * (Son aramalar ortak `useSocialStore` içinde tutuluyor.)
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { persistStorage, storeKey } from '@/store/storage';

export type SavedSearch = {
  query: string;
  savedAt: string;
  /** Kaydedildiği andaki sonuç sayısı ("N yeni sonuç" hesabı için) */
  resultCount: number;
};

type BrowseState = {
  savedSearches: SavedSearch[];
  /** Kaydet / kaldır. Kaydedildiyse true döner. */
  toggleSavedSearch: (query: string, resultCount: number) => boolean;
  removeSavedSearch: (query: string) => void;
};

const same = (a: string, b: string) => a.trim().toLocaleLowerCase('tr-TR') === b.trim().toLocaleLowerCase('tr-TR');

export const useBrowseStore = create<BrowseState>()(
  persist(
    (set, get) => ({
      savedSearches: [],
      toggleSavedSearch: (query, resultCount) => {
        const exists = get().savedSearches.some((s) => same(s.query, query));
        if (exists) {
          set((s) => ({ savedSearches: s.savedSearches.filter((x) => !same(x.query, query)) }));
          return false;
        }
        set((s) => ({ savedSearches: [{ query: query.trim(), savedAt: new Date().toISOString(), resultCount }, ...s.savedSearches].slice(0, 20) }));
        return true;
      },
      removeSavedSearch: (query) => set((s) => ({ savedSearches: s.savedSearches.filter((x) => !same(x.query, query)) })),
    }),
    { name: storeKey('browse'), storage: persistStorage, partialize: (s) => ({ savedSearches: s.savedSearches }) },
  ),
);

export function useIsSearchSaved(query: string): boolean {
  return useBrowseStore((s) => s.savedSearches.some((x) => same(x.query, query)));
}
