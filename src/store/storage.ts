import AsyncStorage from '@react-native-async-storage/async-storage';
import { createJSONStorage } from 'zustand/middleware';

// file:// and private browser windows can reject localStorage. Keep the preview
// usable in memory in that case, including completion of store hydration.
const previewMemory = new Map<string, string>();
const previewStorage = {
  getItem: async (key: string) => {
    try { return localStorage.getItem(key) ?? previewMemory.get(key) ?? null; }
    catch { return previewMemory.get(key) ?? null; }
  },
  setItem: async (key: string, value: string) => {
    previewMemory.set(key, value);
    try { localStorage.setItem(key, value); } catch { /* Memory fallback. */ }
  },
  removeItem: async (key: string) => {
    previewMemory.delete(key);
    try { localStorage.removeItem(key); } catch { /* Memory fallback. */ }
  },
};

/** Tüm kalıcı store'lar için ortak depolama adaptörü */
export const persistStorage = createJSONStorage(() => process.env.EXPO_PUBLIC_SHARE_PREVIEW === '1' ? previewStorage : AsyncStorage);

/** Kalıcı store anahtar öneki — şema değişince versiyonu artır */
export const storeKey = (name: string) => `mezat:${name}:v1`;
