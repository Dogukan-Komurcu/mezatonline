import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { uid } from '@/lib/rng';
import type { ID } from '@/types';

import { persistStorage, storeKey } from './storage';

/**
 * Şikâyet kayıtları (demo): yalnızca bu cihazda tutulur.
 * Gerçek sürümde sunucudaki moderasyon kuyruğuna gönderilmeli ve yanıt süresiyle takip edilmelidir.
 */
export type ModerationReport = {
  id: ID;
  /** Şikâyet edilen kullanıcı / yayın / ilan (ör. "@kullanici", "Yayın: …") */
  subject: string;
  reason: string;
  details?: string;
  createdAt: string;
  status: 'pending';
};

type ModerationState = {
  reports: ModerationReport[];
  addReport: (r: { subject: string; reason: string; details?: string }) => ModerationReport;
};

const MAX_REPORTS = 200;

export const useModerationStore = create<ModerationState>()(
  persist(
    (set) => ({
      reports: [],
      addReport: ({ subject, reason, details }) => {
        const report: ModerationReport = {
          id: uid('rep'),
          subject,
          reason,
          details: details?.trim() || undefined,
          createdAt: new Date().toISOString(),
          status: 'pending',
        };
        set((s) => ({ reports: [report, ...s.reports].slice(0, MAX_REPORTS) }));
        return report;
      },
    }),
    { name: storeKey('moderation'), storage: persistStorage },
  ),
);
