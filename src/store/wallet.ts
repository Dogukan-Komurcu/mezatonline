import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { uid } from '@/lib/rng';
import type { Address, CardBrand, ID, PaymentMethod } from '@/types';

import { persistStorage, storeKey } from './storage';

export type CreditTransaction = {
  id: ID;
  amount: number;
  /** "Hoş geldin kredisi", "Davet ödülü", "Sipariş #MZ-123'te kullanıldı" */
  description: string;
  createdAt: string;
};

type WalletState = {
  addresses: Address[];
  paymentMethods: PaymentMethod[];
  /** Mezat Kredisi bakiyesi (₺) */
  credits: number;
  creditHistory: CreditTransaction[];
  referralCode: string;
  referralCount: number;
  addAddress: (a: Omit<Address, 'id' | 'isDefault'> & { isDefault?: boolean }) => Address;
  updateAddress: (id: ID, patch: Partial<Omit<Address, 'id'>>) => void;
  removeAddress: (id: ID) => void;
  setDefaultAddress: (id: ID) => void;
  addPaymentMethod: (p: { number: string; holder: string; expiry: string; isDefault?: boolean }) => PaymentMethod;
  removePaymentMethod: (id: ID) => void;
  setDefaultPaymentMethod: (id: ID) => void;
  addCredits: (amount: number, description: string) => void;
  /** Kredi düşer, gerçekten düşülen tutarı döner */
  spendCredits: (max: number, description: string) => number;
  /** @deprecated spendCredits kullan (React Compiler "use" önekini hook sanar) */
  useCredits: (max: number, description: string) => number;
};

export function detectCardBrand(number: string): CardBrand {
  const n = number.replace(/\D/g, '');
  if (/^4/.test(n)) return 'visa';
  if (/^(5[1-5]|2[2-7])/.test(n)) return 'mastercard';
  if (/^3[47]/.test(n)) return 'amex';
  if (/^(9792|65)/.test(n)) return 'troy';
  return 'mastercard';
}

const BANKS = ['Garanti BBVA', 'İş Bankası', 'Yapı Kredi', 'Akbank', 'Ziraat Bankası', 'QNB', 'Enpara', 'VakıfBank', 'Halkbank', 'DenizBank'];

export const useWalletStore = create<WalletState>()(
  persist(
    (set, get) => ({
      addresses: [],
      paymentMethods: [],
      credits: 150,
      creditHistory: [
        { id: 'ct_welcome', amount: 150, description: 'Hoş geldin kredisi 🎉', createdAt: new Date().toISOString() },
      ],
      referralCode: 'MEZAT' + Math.floor(1000 + Math.random() * 9000),
      referralCount: 0,
      addAddress: (a) => {
        const isFirst = get().addresses.length === 0;
        const address: Address = { ...a, id: uid('adr'), isDefault: a.isDefault || isFirst };
        set((s) => ({
          addresses: [...(address.isDefault ? s.addresses.map((x) => ({ ...x, isDefault: false })) : s.addresses), address],
        }));
        return address;
      },
      updateAddress: (id, patch) =>
        set((s) => ({
          addresses: s.addresses.map((x) =>
            x.id === id ? { ...x, ...patch } : patch.isDefault ? { ...x, isDefault: false } : x,
          ),
        })),
      removeAddress: (id) =>
        set((s) => {
          const rest = s.addresses.filter((x) => x.id !== id);
          if (rest.length && !rest.some((x) => x.isDefault)) rest[0] = { ...rest[0], isDefault: true };
          return { addresses: rest };
        }),
      setDefaultAddress: (id) => set((s) => ({ addresses: s.addresses.map((x) => ({ ...x, isDefault: x.id === id })) })),
      addPaymentMethod: ({ number, holder, expiry, isDefault }) => {
        const digits = number.replace(/\D/g, '');
        const isFirst = get().paymentMethods.length === 0;
        const pm: PaymentMethod = {
          id: uid('pm'),
          brand: detectCardBrand(digits),
          last4: digits.slice(-4),
          holder: holder.toLocaleUpperCase('tr-TR'),
          expiry,
          bank: BANKS[parseInt(digits.slice(-2) || '0', 10) % BANKS.length],
          isDefault: isDefault || isFirst,
        };
        set((s) => ({
          paymentMethods: [...(pm.isDefault ? s.paymentMethods.map((x) => ({ ...x, isDefault: false })) : s.paymentMethods), pm],
        }));
        return pm;
      },
      removePaymentMethod: (id) =>
        set((s) => {
          const rest = s.paymentMethods.filter((x) => x.id !== id);
          if (rest.length && !rest.some((x) => x.isDefault)) rest[0] = { ...rest[0], isDefault: true };
          return { paymentMethods: rest };
        }),
      setDefaultPaymentMethod: (id) =>
        set((s) => ({ paymentMethods: s.paymentMethods.map((x) => ({ ...x, isDefault: x.id === id })) })),
      addCredits: (amount, description) =>
        set((s) => ({
          credits: s.credits + amount,
          creditHistory: [{ id: uid('ct'), amount, description, createdAt: new Date().toISOString() }, ...s.creditHistory],
        })),
      spendCredits: (max, description) => get().useCredits(max, description),
      useCredits: (max, description) => {
        const amount = Math.min(get().credits, Math.max(0, max));
        if (amount <= 0) return 0;
        set((s) => ({
          credits: s.credits - amount,
          creditHistory: [{ id: uid('ct'), amount: -amount, description, createdAt: new Date().toISOString() }, ...s.creditHistory],
        }));
        return amount;
      },
    }),
    { name: storeKey('wallet'), storage: persistStorage },
  ),
);

/** Teklif vermek / satın almak için ödeme yöntemi + adres hazır mı? */
export function useCanTransact(): boolean {
  return useWalletStore((s) => s.addresses.length > 0 && s.paymentMethods.length > 0);
}

export const selectDefaultAddress = (s: WalletState) => s.addresses.find((a) => a.isDefault) ?? s.addresses[0];
export const selectDefaultPayment = (s: WalletState) => s.paymentMethods.find((p) => p.isDefault) ?? s.paymentMethods[0];
