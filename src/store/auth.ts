import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { ID, User } from '@/types';

import { persistStorage, storeKey } from './storage';

export const ME_ID = 'me';

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
  /** Hesap oluşturma / giriş: sahte doğrulama sonrası çağrılır */
  signIn: (method: AuthMethod, identifier?: string) => void;
  completeOnboarding: (data: { username: string; displayName?: string; interests: ID[] }) => void;
  setInterests: (ids: ID[]) => void;
  updateProfile: (patch: Partial<Pick<User, 'username' | 'displayName' | 'bio' | 'avatar' | 'city' | 'cover'>>) => void;
  /** Satıcı başvurusu onaylanınca */
  becomeSeller: () => void;
  signOut: () => void;
};

const DEFAULT_ME: User = {
  id: ME_ID,
  username: 'yeni_kullanici',
  displayName: 'Yeni Kullanıcı',
  avatar: 'https://randomuser.me/api/portraits/lego/5.jpg',
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
      completeOnboarding: ({ username, displayName, interests }) =>
        set((s) => ({
          onboarded: true,
          interests,
          me: { ...s.me, username, displayName: displayName || username, categoryIds: interests },
        })),
      setInterests: (interests) => set((s) => ({ interests, me: { ...s.me, categoryIds: interests } })),
      updateProfile: (patch) => set((s) => ({ me: { ...s.me, ...patch } })),
      becomeSeller: () =>
        set((s) => ({ me: { ...s.me, isSeller: true, badges: Array.from(new Set([...s.me.badges, 'new_seller' as const])) } })),
      signOut: () => set({ status: 'signedOut', onboarded: false, method: undefined, phone: undefined, email: undefined, me: DEFAULT_ME, interests: [] }),
    }),
    { name: storeKey('auth'), storage: persistStorage },
  ),
);

/** Kısa yol: giriş yapmış kullanıcı */
export const useMe = () => useAuthStore((s) => s.me);
