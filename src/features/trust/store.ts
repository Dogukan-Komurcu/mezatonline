/**
 * Fikri mülkiyet (marka / tasarım / patent / telif) şikâyet kayıtları — demo: yalnızca bu cihazda.
 *
 * - complaints: hak sahibinin (ya da vekilinin) uygulama içi form ile yaptığı başvurular
 *   (6563 md. 9/3, ETAHS Yönetmeliği md. 12). Kimlik numarası cihaza yalnızca maskeli yazılır.
 * - cases: satıcının ilanı hakkındaki şikâyet dosyaları (kaldırma → belgeyle itiraz → yeniden yayın).
 *   İlan kaldırılınca envanterde "pasif"e alınır; dosya açıkken yeniden yayımlanamaz (isIpLocked).
 *
 * Gerçek sürümde bu kayıtlar sunucuda tutulur, 48 saat (kaldırma) ve 24 saat (itiraz) süreleri
 * izlenir, kayıtlar 10 yıl saklanır (6563 md. 11/3).
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { persistStorage, storeKey } from '@/store/storage';
import type { ID, ProofKind } from '@/types';

export type RightType = 'trademark' | 'design' | 'patent' | 'copyright';

export const RIGHT_TYPE_LABELS: Record<RightType, string> = {
  trademark: 'Marka',
  design: 'Tasarım',
  patent: 'Patent / faydalı model',
  copyright: 'Telif (FSEK)',
};

export type IpComplaint = {
  id: ID;
  /** Başvuru numarası, ör. "FM-48213" */
  number: string;
  createdAt: string;
  applicant: 'owner' | 'agent';
  /** Hak sahibi ya da vekilin adı / unvanı */
  name: string;
  /** Vekil başvurusunda temsil edilen hak sahibi */
  rightHolder?: string;
  /** T.C. kimlik / vergi no — yalnızca son 2 hane, ör. "•••••••••46" */
  idMasked: string;
  email: string;
  phone: string;
  rightType: RightType;
  /** TÜRKPATENT tescil / başvuru no ya da telif belge no */
  registrationNo: string;
  /** Şikâyet edilen ilan: uygulamadaki ürün ya da serbest metin (ilan bağlantısı / başlık) */
  target: { productId?: ID; text: string };
  reason: string;
  /** Eklenen belge sayısı (görseller cihaza yazılmaz) */
  docCount: number;
  status: 'received';
};

export type IpCaseStatus = 'removed' | 'objected' | 'reinstated';

export type IpObjection = { kind: ProofKind; docs: string[]; note: string; at: string };

export type IpCase = {
  listingId: ID;
  complaintNo: string;
  rightType: RightType;
  rightHolder: string;
  removedAt: string;
  status: IpCaseStatus;
  objection?: IpObjection;
  reinstatedAt?: string;
};

type TrustState = {
  complaints: IpComplaint[];
  cases: Record<ID, IpCase>;
  addComplaint: (c: Omit<IpComplaint, 'id' | 'number' | 'createdAt' | 'status'>) => IpComplaint;
  setCase: (c: IpCase) => void;
  patchCase: (listingId: ID, patch: Partial<IpCase>) => void;
};

const MAX_COMPLAINTS = 100;

export const useTrustStore = create<TrustState>()(
  persist(
    (set) => ({
      complaints: [],
      cases: {},
      addComplaint: (c) => {
        const complaint: IpComplaint = {
          ...c,
          id: `fm_${Date.now().toString(36)}`,
          number: `FM-${Math.floor(10000 + Math.random() * 89999)}`,
          createdAt: new Date().toISOString(),
          status: 'received',
        };
        set((s) => ({ complaints: [complaint, ...s.complaints].slice(0, MAX_COMPLAINTS) }));
        return complaint;
      },
      setCase: (c) => set((s) => ({ cases: { ...s.cases, [c.listingId]: c } })),
      patchCase: (listingId, patch) => set((s) => (s.cases[listingId] ? { cases: { ...s.cases, [listingId]: { ...s.cases[listingId], ...patch } } } : {})),
    }),
    { name: storeKey('trust'), storage: persistStorage },
  ),
);

/** İlan hak sahibi şikâyetiyle kaldırılmış ve dosya henüz kapanmamış mı (yeniden yayımlanamaz) */
export function isIpLocked(c: IpCase | undefined): boolean {
  return !!c && (c.status === 'removed' || c.status === 'objected');
}

/** T.C. kimlik / vergi no → "•••••••••46" (cihaza tam numara yazılmaz) */
export function maskId(raw: string): string {
  const d = raw.replace(/\D/g, '');
  return d.length >= 2 ? `${'•'.repeat(Math.max(0, d.length - 2))}${d.slice(-2)}` : '';
}
