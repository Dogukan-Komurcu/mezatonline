import AsyncStorage from '@react-native-async-storage/async-storage';
import { createJSONStorage } from 'zustand/middleware';

/** Tüm kalıcı store'lar için ortak AsyncStorage adaptörü */
export const persistStorage = createJSONStorage(() => AsyncStorage);

/** Kalıcı store anahtar öneki — şema değişince versiyonu artır */
export const storeKey = (name: string) => `mezat:${name}:v1`;
