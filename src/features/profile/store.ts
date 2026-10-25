/**
 * Profil tercihleri: takip edilen satıcı başına bildirim zili (Whatnot: All Notifications / No Notifications).
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { persistStorage, storeKey } from '@/store/storage';
import type { ID } from '@/types';

export type SellerNotifyLevel = 'all' | 'none';

type ProfilePrefsState = {
  /** Varsayılan: takip edilen satıcının tüm bildirimleri açık */
  notify: Record<ID, SellerNotifyLevel>;
  setNotify: (userId: ID, level: SellerNotifyLevel) => void;
};

export const useProfilePrefs = create<ProfilePrefsState>()(
  persist(
    (set) => ({
      notify: {},
      setNotify: (userId, level) => set((s) => ({ notify: { ...s.notify, [userId]: level } })),
    }),
    { name: storeKey('profile-prefs'), storage: persistStorage },
  ),
);
