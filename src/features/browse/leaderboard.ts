/**
 * "En İyi Satıcılar" sıralaması (Whatnot Top Seller Leaderboard).
 * Canlı: son 4 saatteki performans (yalnız şu an canlı olanlar). Bugün: son 24 saat. Bu Hafta: son 7 gün.
 * Mock: canlı sıralama izleyiciye göre; günlük/haftalık skorlar gün bazlı deterministik üretilir.
 */
import { getCategory, getLiveShowOf, getLiveShows, getSellers, getUser } from '@/data';
import { createRng } from '@/lib/rng';
import type { Show, User } from '@/types';

export type LeaderboardPeriod = 'live' | 'today' | 'week';

export const PERIOD_LABELS: Record<LeaderboardPeriod, string> = {
  live: 'Şu An Canlı',
  today: 'Bugün',
  week: 'Bu Hafta',
};

export type LeaderEntry = {
  rank: number;
  seller: User;
  /** Şu an canlıysa yayını */
  liveShow?: Show;
  /** Canlıysa anlık izleyici, değilse dönem içindeki en yüksek izleyici */
  viewers: number;
  /** Dönem içindeki satış adedi (mock) */
  sales: number;
};

/** 'all' = tüm kategoriler */
export type LeaderboardScope = string;

export const ALL_SCOPE = 'all';

export function scopeLabel(scope: LeaderboardScope): string {
  return scope === ALL_SCOPE ? 'Tüm Kategoriler' : (getCategory(scope)?.name ?? 'Tüm Kategoriler');
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function dayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function periodStats(seller: User, period: Exclude<LeaderboardPeriod, 'live'>, live?: Show): { viewers: number; sales: number; score: number } {
  const rng = createRng(hash(`${dayKey()}:${period}:${seller.id}`));
  const days = period === 'today' ? 1 : 7;
  const base = seller.followers / 1000;
  const sales = Math.round(base * rng.float(0.6, 1.8) * days + rng.int(2, 12) * days);
  const peak = Math.max(live?.viewers ?? 0, Math.round(seller.followers / rng.int(60, 260)) + rng.int(5, 60));
  const score = sales * 3 + peak + (live ? live.viewers * 2 : 0) + seller.rating * 10;
  return { viewers: peak, sales, score };
}

export function getLeaderboard(scope: LeaderboardScope, period: LeaderboardPeriod, limit = 25): LeaderEntry[] {
  const categoryId = scope === ALL_SCOPE ? undefined : scope;
  if (period === 'live') {
    const shows = getLiveShows({ categoryId });
    const seen = new Set<string>();
    const entries: LeaderEntry[] = [];
    shows.forEach((show) => {
      const seller = getUser(show.sellerId);
      if (!seller || seen.has(seller.id)) return;
      seen.add(seller.id);
      const rng = createRng(hash(`${dayKey()}:live:${seller.id}`));
      entries.push({ rank: 0, seller, liveShow: show, viewers: show.viewers, sales: rng.int(3, 40) });
    });
    entries.sort((a, b) => b.viewers + b.sales * 2 - (a.viewers + a.sales * 2));
    return entries.slice(0, limit).map((e, i) => ({ ...e, rank: i + 1 }));
  }
  const sellers = getSellers(categoryId);
  return sellers
    .map((seller) => {
      const live = getLiveShowOf(seller.id);
      const stats = periodStats(seller, period, live);
      return { seller, liveShow: live, viewers: stats.viewers, sales: stats.sales, score: stats.score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((e, i) => ({ rank: i + 1, seller: e.seller, liveShow: e.liveShow, viewers: e.viewers, sales: e.sales }));
}

/**
 * Ana sayfa şeridi için en uygun kapsam: tercih edilen kategoride en az 2 canlı satıcı varsa o kategori,
 * yoksa tüm kategoriler.
 */
export function pickLeaderboardScope(preferred: readonly string[]): LeaderboardScope {
  for (const id of preferred) {
    if (getLeaderboard(id, 'live', 3).length >= 2) return id;
  }
  return ALL_SCOPE;
}
