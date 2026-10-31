import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { ID, User } from '@/types';

import { persistStorage, storeKey } from './storage';

export const ME_ID = 'me';

/** Kayıtta onaylanan hukuki metinlerin sürümü (avukat incelemesi bekleyen taslaklar) */
export const LEGAL_VERSION = 'taslak-2026-11';

/** Kullanım Koşulları + Gizlilik Politikası onayı ve 18 yaş beyanı */
export type TermsAcceptance = {
  version: string;
  acceptedAt: string;
  adult: boolean;
  /** Onayın alındığı kayıt ekranı */
  source: 'email' | 'username';
};

export type AuthMethod = 'phone' | 'email' | 'apple' | 'google' | 'facebook';

type AuthState = {
  status: 'signedOut' | 'signedIn';
  /** Kayıt akışı tamamlandı mı (kullanıcı adı + ilgi alanları seçildi) */
  onboarded: boolean;
  method?: AuthMethod;
  phone?: string;
  email?: string;
  me: User;
  interests: ID[];
  termsAcceptance?: TermsAcceptance;
  /** Hesap oluşturma / giriş: sahte doğrulama sonrası çağrılır */
  signIn: (method: AuthMethod, identifier?: string) => void;
  completeOnboarding: (data: { username: string; displayName?: string; interests: ID[]; categoryIds?: ID[] }) => void;
  setInterests: (ids: ID[]) => void;
  /** 18 yaş beyanı + Kullanım Koşulları ve Gizlilik Politikası onayını kaydet */
  acceptTerms: (source: TermsAcceptance['source']) => void;
  updateProfile: (patch: Partial<Pick<User, 'username' | 'displayName' | 'bio' | 'avatar' | 'city' | 'cover'>>) => void;
  /** Satıcı başvurusu onaylanınca */
  becomeSeller: () => void;
  signOut: () => void;
};

/** v0'daki varsayılan avatar (üçüncü taraf görsel); boş avatar baş harfleri gösterir */
const LEGACY_AVATAR = 'https://randomuser.me/api/portraits/lego/5.jpg';

const DEFAULT_ME: User = {
  id: ME_ID,
  username: 'yeni_kullanici',
  displayName: 'Yeni Kullanıcı',
  avatar: '',
  bio: '',
  city: 'İstanbul',
  isSeller: false,
  badges: [],
  rating: 0,
  reviewCount: 0,
  followers: 0,
  following: 0,
  itemsSold: 0,
  avgShipDays: 0,
  joinedAt: new Date().toISOString(),
  categoryIds: [],
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      status: 'signedOut',
      onboarded: false,
      me: DEFAULT_ME,
      interests: [],
      signIn: (method, identifier) =>
        set((s) => ({
          status: 'signedIn',
          method,
          phone: method === 'phone' ? identifier : s.phone,
          email: method === 'email' ? identifier : s.email,
          me: { ...s.me, joinedAt: s.status === 'signedOut' ? new Date().toISOString() : s.me.joinedAt },
        })),
      completeOnboarding: ({ username, displayName, interests, categoryIds }) =>
        set((s) => ({
          onboarded: true,
          interests,
          me: { ...s.me, username, displayName: displayName || username, categoryIds: categoryIds ?? interests },
        })),
      setInterests: (interests) => set((s) => ({ interests, me: { ...s.me, categoryIds: interests } })),
      acceptTerms: (source) => set({ termsAcceptance: { version: LEGAL_VERSION, acceptedAt: new Date().toISOString(), adult: true, source } }),
      updateProfile: (patch) => set((s) => ({ me: { ...s.me, ...patch } })),
      becomeSeller: () =>
        set((s) => ({ me: { ...s.me, isSeller: true, badges: Array.from(new Set([...s.me.badges, 'new_seller' as const])) } })),
      signOut: () =>
        set({ status: 'signedOut', onboarded: false, method: undefined, phone: undefined, email: undefined, me: DEFAULT_ME, interests: [], termsAcceptance: undefined }),
    }),
    {
      name: storeKey('auth'),
      storage: persistStorage,
      version: 1,
      migrate: (persisted, version) => {
        const s = persisted as AuthState;
        if (version < 1 && s?.me?.avatar === LEGACY_AVATAR) return { ...s, me: { ...s.me, avatar: '' } };
        return s;
      },
    },
  ),
);

/** Kısa yol: giriş yapmış kullanıcı */
export const useMe = () => useAuthStore((s) => s.me);
