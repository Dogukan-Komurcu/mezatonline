import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { uid } from '@/lib/rng';
import type { ID } from '@/types';

import { persistStorage, storeKey } from './storage';

/** Günlük görev türleri. Şansa dayalı çekiliş katılımına puan verilmez (çekiliş görevi yoktur). */
export type ChallengeKind = 'watch_show' | 'save_show' | 'follow_seller' | 'place_bid' | 'purchase' | 'chat';

export type Challenge = {
  kind: ChallengeKind;
  title: string;
  points: number;
  icon: string;
};

export const DAILY_CHALLENGES: Challenge[] = [
  { kind: 'watch_show', title: 'Bir canlı yayın izle', points: 50, icon: 'play-circle' },
  { kind: 'save_show', title: 'Bir yayına hatırlatıcı kur', points: 30, icon: 'bookmark' },
  { kind: 'follow_seller', title: 'Yeni bir satıcıyı takip et', points: 30, icon: 'person-add' },
  { kind: 'chat', title: 'Yayın sohbetine mesaj yaz', points: 20, icon: 'chatbubble' },
  { kind: 'place_bid', title: 'Bir açık artırmaya teklif ver', points: 75, icon: 'hammer' },
  { kind: 'purchase', title: 'Bir ürün satın al', points: 150, icon: 'bag-handle' },
];

/** Puan Mağazası: tepkiler ve jumbotron kutlamaları */
export type ShopItem = { id: ID; kind: 'reaction' | 'jumbotron'; title: string; emoji: string; cost: number };

export const POINTS_SHOP: ShopItem[] = [
  { id: 'r_fire', kind: 'reaction', title: 'Ateş Tepkisi', emoji: '🔥', cost: 100 },
  { id: 'r_heart', kind: 'reaction', title: 'Kalp Yağmuru', emoji: '💛', cost: 100 },
  { id: 'r_crown', kind: 'reaction', title: 'Taç', emoji: '👑', cost: 250 },
  { id: 'r_nazar', kind: 'reaction', title: 'Nazar Boncuğu', emoji: '🧿', cost: 300 },
  { id: 'j_confetti', kind: 'jumbotron', title: 'Konfeti Jumbotron', emoji: '🎉', cost: 500 },
  { id: 'j_fireworks', kind: 'jumbotron', title: 'Havai Fişek Jumbotron', emoji: '🎆', cost: 800 },
  { id: 'j_gold', kind: 'jumbotron', title: 'Altın Kutlama', emoji: '🏆', cost: 1200 },
];

type RewardsState = {
  points: number;
  /** 'YYYY-MM-DD' → tamamlanan görevler */
  completed: Record<string, ChallengeKind[]>;
  owned: ID[];
  activeReaction: ID;
  history: { id: ID; points: number; label: string; at: string }[];
  /** Görev tamamla (günde bir kez puan verir). Puan kazanıldıysa kazanılan puanı döner. */
  complete: (kind: ChallengeKind) => number;
  redeem: (itemId: ID) => boolean;
  setActiveReaction: (itemId: ID) => void;
};

export function todayKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const useRewardsStore = create<RewardsState>()(
  persist(
    (set, get) => ({
      points: 120,
      completed: {},
      owned: ['r_heart'],
      activeReaction: 'r_heart',
      history: [{ id: 'h0', points: 120, label: 'Hoş geldin puanı', at: new Date().toISOString() }],
      complete: (kind) => {
        const key = todayKey();
        const done = get().completed[key] ?? [];
        if (done.includes(kind)) return 0;
        const challenge = DAILY_CHALLENGES.find((c) => c.kind === kind);
        if (!challenge) return 0;
        set((s) => ({
          points: s.points + challenge.points,
          completed: { [key]: [...done, kind] },
          history: [{ id: uid('h'), points: challenge.points, label: challenge.title, at: new Date().toISOString() }, ...s.history].slice(0, 50),
        }));
        return challenge.points;
      },
      redeem: (itemId) => {
        const item = POINTS_SHOP.find((i) => i.id === itemId);
        if (!item || get().points < item.cost || get().owned.includes(itemId)) return false;
        set((s) => ({
          points: s.points - item.cost,
          owned: [...s.owned, itemId],
          history: [{ id: uid('h'), points: -item.cost, label: item.title, at: new Date().toISOString() }, ...s.history].slice(0, 50),
        }));
        return true;
      },
      setActiveReaction: (itemId) => set({ activeReaction: itemId }),
    }),
    { name: storeKey('rewards'), storage: persistStorage },
  ),
);

/** Ödül kazanınca toast göstermek için yardımcı: tamamla + puanı döndür */
export function completeChallenge(kind: ChallengeKind): number {
  return useRewardsStore.getState().complete(kind);
}
