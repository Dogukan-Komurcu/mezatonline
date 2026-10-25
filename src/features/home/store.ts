/**
 * Ana sayfaya ait küçük kalıcı durum: ilk açılış ipucu (coachmark) gösterildi mi.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { persistStorage, storeKey } from '@/store/storage';

type HomeState = {
  coachmarkDone: boolean;
  /** AsyncStorage'dan yüklendi mi (yüklenmeden ipucu gösterilmez) */
  hydrated: boolean;
  dismissCoachmark: () => void;
};

export const useHomeStore = create<HomeState>()(
  persist(
    (set) => ({
      coachmarkDone: false,
      hydrated: false,
      dismissCoachmark: () => set({ coachmarkDone: true }),
    }),
    {
      name: storeKey('home'),
      storage: persistStorage,
      partialize: (s) => ({ coachmarkDone: s.coachmarkDone }),
      onRehydrateStorage: () => () => {
        useHomeStore.setState({ hydrated: true });
      },
    },
  ),
);
