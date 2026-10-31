import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { persistStorage, storeKey } from './storage';

export type Appearance = 'system' | 'light' | 'dark';

export type NotificationPrefs = {
  followedLive: boolean;
  showReminders: boolean;
  outbid: boolean;
  orderUpdates: boolean;
  messages: boolean;
  promotions: boolean;
  priceDrops: boolean;
};

type SettingsState = {
  appearance: Appearance;
  haptics: boolean;
  autoplayPreviews: boolean;
  /** Canlı yayına girince ses açık mı */
  liveSoundOn: boolean;
  dataSaver: boolean;
  notifications: NotificationPrefs;
  /** Ana sayfadaki demo bilgilendirme şeridi kapatıldı mı (cihaz tercihi) */
  demoBannerDismissed: boolean;
  setAppearance: (a: Appearance) => void;
  setHaptics: (v: boolean) => void;
  setAutoplayPreviews: (v: boolean) => void;
  setLiveSoundOn: (v: boolean) => void;
  setDataSaver: (v: boolean) => void;
  setNotificationPref: (key: keyof NotificationPrefs, value: boolean) => void;
  dismissDemoBanner: () => void;
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      appearance: 'system',
      haptics: true,
      autoplayPreviews: true,
      liveSoundOn: false,
      dataSaver: false,
      notifications: {
        followedLive: true,
        showReminders: true,
        outbid: true,
        orderUpdates: true,
        messages: true,
        // Pazarlama niteliğindeki bildirimler açık rıza olmadan kapalı başlar
        promotions: false,
        priceDrops: false,
      },
      demoBannerDismissed: false,
      setAppearance: (appearance) => set({ appearance }),
      setHaptics: (haptics) => set({ haptics }),
      setAutoplayPreviews: (autoplayPreviews) => set({ autoplayPreviews }),
      setLiveSoundOn: (liveSoundOn) => set({ liveSoundOn }),
      setDataSaver: (dataSaver) => set({ dataSaver }),
      setNotificationPref: (key, value) => set((s) => ({ notifications: { ...s.notifications, [key]: value } })),
      dismissDemoBanner: () => set({ demoBannerDismissed: true }),
    }),
    {
      name: storeKey('settings'),
      storage: persistStorage,
      version: 1,
      // v0'da fiyat düşüşü bildirimleri varsayılan olarak açıktı (rıza alınmadan)
      migrate: (persisted, version) => {
        const s = persisted as SettingsState;
        if (version < 1 && s?.notifications) return { ...s, notifications: { ...s.notifications, priceDrops: false } };
        return s;
      },
    },
  ),
);
