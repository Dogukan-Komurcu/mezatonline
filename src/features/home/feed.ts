/**
 * Ana sayfa akışının satırlarını üretir (FlatList için düz satır listesi).
 * 2 sütunlu yayın grid'inin arasına tam genişlik bölümler serpiştirilir: kampanya bannerı,
 * En İyi Satıcılar, Yaklaşan Yayınlar, Senin için ürünler.
 */
import type { Href } from 'expo-router';

import { getCategory, getForYouShows, getLiveShows, getMarketplaceProducts, getUpcomingShows, SELLER_USERS } from '@/data';
import { ALL_SCOPE, getLeaderboard, pickLeaderboardScope, type LeaderboardScope } from '@/features/browse/leaderboard';
import { chunk } from '@/features/browse/text';
import type { Product, Show, User } from '@/types';

import { FOLLOWING, FOR_YOU } from './CategoryRail';

export type EmptyVariant = 'no_follow' | 'none_live' | 'category_empty';

export type HomeRow =
  | { type: 'grid'; key: string; shows: Show[]; first?: boolean }
  | { type: 'band'; key: string }
  | { type: 'promo'; key: string }
  | { type: 'leaderboard'; key: string; scope: LeaderboardScope }
  | { type: 'rail'; key: string; title: string; subtitle?: string; shows: Show[]; actionLabel?: string; href?: Href }
  | { type: 'heading'; key: string; title: string; subtitle?: string; actionLabel?: string; href?: Href }
  | { type: 'products'; key: string; products: Product[] }
  | { type: 'empty'; key: string; variant: EmptyVariant; categoryId?: string }
  | { type: 'seller'; key: string; seller: User }
  | { type: 'link'; key: string; label: string; href: Href }
  | { type: 'end'; key: string };

type FeedInput = {
  selection: string;
  interests: string[];
  followingIds: string[];
  /** Engellenen satıcıların yayınları akışta gösterilmez */
  blockedIds: string[];
};

const PRODUCT_LIMIT = 12;

function gridRows(shows: Show[], prefix: string, markFirst: boolean): HomeRow[] {
  return chunk(shows, 2).map((pair, i) => ({ type: 'grid' as const, key: `${prefix}-g${i}-${pair[0].id}`, shows: pair, first: markFirst && i === 0 }));
}

function productRows(products: Product[], prefix: string): HomeRow[] {
  return chunk(products, 2).map((pair, i) => ({ type: 'products' as const, key: `${prefix}-p${i}-${pair[0].id}`, products: pair }));
}

function band(key: string): HomeRow {
  return { type: 'band', key: `band-${key}` };
}

/** Bölümleri grid satırlarının arasına (2, 5, 8. satırdan sonra) yerleştirir */
function interleave(grid: HomeRow[], sections: HomeRow[][]): HomeRow[] {
  const slots = [2, 5, 8];
  const out: HomeRow[] = [];
  let si = 0;
  grid.forEach((row, i) => {
    out.push(row);
    if (si < sections.length && i + 1 === slots[si]) {
      out.push(...sections[si]);
      si += 1;
    }
  });
  while (si < sections.length) {
    out.push(...sections[si]);
    si += 1;
  }
  return out;
}

function withBands(key: string, rows: HomeRow[]): HomeRow[] {
  return rows.length ? [band(`${key}-a`), ...rows, band(`${key}-b`)] : [];
}

function productsSection(categoryIds: string[], prefix: string, title = 'Senin için ürünler', href?: Href): HomeRow[] {
  const all = getMarketplaceProducts();
  const preferred = categoryIds.length ? all.filter((p) => categoryIds.includes(p.categoryId)) : [];
  const rest = all.filter((p) => !categoryIds.includes(p.categoryId)).sort((a, b) => b.saves - a.saves);
  const list = [...preferred.sort((a, b) => b.saves - a.saves), ...rest].slice(0, PRODUCT_LIMIT);
  if (!list.length) return [];
  return [
    { type: 'heading', key: `${prefix}-ph`, title, subtitle: 'Yayını beklemeden hemen satın al', actionLabel: href ? 'Tümünü gör' : undefined, href },
    ...productRows(list, prefix),
  ];
}

function suggestedSellers(followingIds: string[], limit: number): HomeRow[] {
  return SELLER_USERS.filter((u) => !followingIds.includes(u.id))
    .sort((a, b) => b.followers - a.followers)
    .slice(0, limit)
    .map((seller) => ({ type: 'seller' as const, key: `sg-${seller.id}`, seller }));
}

function upcomingForYou(interests: string[], followingIds: string[]): Show[] {
  const score = (s: Show) => (followingIds.includes(s.sellerId) ? 0 : interests.includes(s.categoryId) ? 1 : 2);
  return getUpcomingShows()
    .slice()
    .sort((a, b) => score(a) - score(b) || a.scheduledAt.localeCompare(b.scheduledAt))
    .slice(0, 12);
}

/** Art arda gelen / baştaki / sondaki gri bantları temizler */
function tidy(rows: HomeRow[]): HomeRow[] {
  const out: HomeRow[] = [];
  rows.forEach((row) => {
    const prev = out[out.length - 1];
    if (row.type === 'band' && (!prev || prev.type === 'band')) return;
    if (row.type === 'end' && prev?.type === 'band') out.pop();
    out.push(row);
  });
  return out;
}

export function buildHomeFeed(input: FeedInput): HomeRow[] {
  const blocked = new Set(input.blockedIds);
  const rows = build(input).map((row): HomeRow => {
    if (!blocked.size) return row;
    if (row.type === 'grid' || row.type === 'rail') return { ...row, shows: row.shows.filter((s) => !blocked.has(s.sellerId)) };
    if (row.type === 'products') return { ...row, products: row.products.filter((p) => !blocked.has(p.sellerId)) };
    if (row.type === 'seller' && blocked.has(row.seller.id)) return { type: 'band', key: `blocked-${row.key}` };
    return row;
  });
  return tidy(rows.filter((r) => !((r.type === 'grid' || r.type === 'rail') && !r.shows.length) && !(r.type === 'products' && !r.products.length)));
}

function build({ selection, interests, followingIds }: FeedInput): HomeRow[] {
  // ─── Sana Özel ───
  if (selection === FOR_YOU) {
    const shows = getForYouShows(interests, followingIds);
    const scope = pickLeaderboardScope(interests);
    const upcoming = upcomingForYou(interests, followingIds);
    const sections: HomeRow[][] = [
      withBands('promo', [{ type: 'promo', key: 'promo' }]),
      withBands('lb', [{ type: 'leaderboard', key: `lb-${scope}`, scope }]),
      withBands('up', upcoming.length ? [{ type: 'rail', key: 'up-rail', title: 'Yaklaşan Yayınlar', subtitle: 'Hatırlatıcı kur, başlayınca haber verelim', shows: upcoming }] : []),
    ];
    return [...interleave(gridRows(shows, 'fy', true), sections), band('fy-prod'), ...productsSection(interests, 'fy'), { type: 'end', key: 'end' }];
  }

  // ─── Takip Ettiklerin ───
  if (selection === FOLLOWING) {
    if (!followingIds.length) {
      return [
        { type: 'empty', key: 'empty-follow', variant: 'no_follow' },
        band('sg'),
        { type: 'heading', key: 'sg-h', title: 'Takip edebileceğin satıcılar', subtitle: 'Canlıya geçtiklerinde ilk sen haberdar ol' },
        ...suggestedSellers(followingIds, 8),
        { type: 'end', key: 'end' },
      ];
    }
    const live = getLiveShows().filter((s) => followingIds.includes(s.sellerId));
    const upcoming = getUpcomingShows({ sellerIds: followingIds });
    const rows: HomeRow[] = [];
    if (live.length) {
      rows.push({ type: 'heading', key: 'fl-live-h', title: 'Şu an canlı', subtitle: `Takip ettiğin ${live.length} satıcı yayında` }, ...gridRows(live, 'fl', true));
    } else {
      rows.push({ type: 'empty', key: 'empty-none-live', variant: 'none_live' });
    }
    if (upcoming.length) {
      rows.push(band('fl-up'), { type: 'heading', key: 'fl-up-h', title: 'Yaklaşan yayınlar', subtitle: 'Takip ettiklerinin planlanmış yayınları' }, ...gridRows(upcoming, 'flu', false));
    }
    rows.push(band('fl-sg'), { type: 'heading', key: 'sg-h', title: 'Önerilen satıcılar', subtitle: 'Sevebileceğin yeni satıcıları keşfet' }, ...suggestedSellers(followingIds, 6));
    rows.push({ type: 'end', key: 'end' });
    return rows;
  }

  // ─── Kategori ───
  const category = getCategory(selection);
  if (!category) return [{ type: 'end', key: 'end' }];
  const live = getLiveShows({ categoryId: category.id });
  const upcoming = getUpcomingShows({ categoryId: category.id });
  const scope = getLeaderboard(category.id, 'live', 3).length >= 2 ? category.id : ALL_SCOPE;
  const others = getForYouShows(interests, followingIds)
    .filter((s) => s.categoryId !== category.id)
    .slice(0, 8);
  const rows: HomeRow[] = live.length ? gridRows(live, `c-${category.id}`, true) : [{ type: 'empty', key: `empty-${category.id}`, variant: 'category_empty', categoryId: category.id }];
  rows.push({ type: 'link', key: `link-${category.id}`, label: `Tüm ${category.shortName} yayınları ve ürünleri`, href: `/category/${category.id}` });
  rows.push(...withBands('c-lb', [{ type: 'leaderboard', key: `lb-${scope}`, scope }]));
  if (upcoming.length) {
    rows.push(
      { type: 'rail', key: `c-up-${category.id}`, title: 'Yaklaşan Yayınlar', subtitle: `${category.shortName} kategorisinde`, shows: upcoming.slice(0, 12), actionLabel: 'Tümünü gör', href: `/category/${category.id}` },
      band('c-up'),
    );
  }
  if (others.length) {
    rows.push({ type: 'heading', key: 'c-oth-h', title: 'Diğer canlı yayınlar', subtitle: 'Sana önerilen yayınlar' }, ...gridRows(others, 'c-oth', false), band('c-prod'));
  }
  rows.push(...productsSection([category.id], `c-${category.id}`, `${category.shortName} ürünleri`, { pathname: '/category/[id]', params: { id: category.id, view: 'products' } }));
  rows.push({ type: 'end', key: 'end' });
  return rows;
}
