import { create } from 'zustand';

import type { ID } from '@/types';

/** Giriş / kayıt yöntemleri (Facebook dahil — auth store'daki AuthMethod'dan geniş) */
export type AuthProvider = 'google' | 'apple' | 'facebook' | 'email' | 'phone';

/** Telefon ekranının hangi akış için açıldığı */
export type PhoneMode = 'signup' | 'finish' | 'login';

export type Gender = 'female' | 'male' | 'unspecified';

type AuthFlowState = {
  /** Kaydı başlatan yöntem */
  provider?: AuthProvider;
  /** Sosyal girişte gösterilecek ad (örn. "Google hesabın") */
  email?: string;
  /** E.164 biçiminde doğrulanmış telefon (+905321234567) */
  phone?: string;
  username: string;
  displayName: string;
  gender?: Gender;
  interests: ID[];
  setProvider: (provider: AuthProvider, email?: string) => void;
  setPhone: (phone: string) => void;
  setUsername: (username: string, displayName: string) => void;
  setGender: (gender: Gender | undefined) => void;
  setInterests: (ids: ID[]) => void;
  reset: () => void;
};

const INITIAL = {
  provider: undefined,
  email: undefined,
  phone: undefined,
  username: '',
  displayName: '',
  gender: undefined,
  interests: [] as ID[],
};

/**
 * Kayıt adımları arasında taşınan geçici durum (kalıcı değil).
 * Kayıt bitince `reset()` ile temizlenir; asıl veriler useAuthStore'a yazılır.
 */
export const useAuthFlow = create<AuthFlowState>()((set) => ({
  ...INITIAL,
  setProvider: (provider, email) => set({ provider, email }),
  setPhone: (phone) => set({ phone }),
  setUsername: (username, displayName) => set({ username, displayName }),
  setGender: (gender) => set({ gender }),
  setInterests: (interests) => set({ interests }),
  reset: () => set({ ...INITIAL, interests: [] }),
}));
