/**
 * Veri erişim katmanı (repository).
 * Ekranlar veriye SADECE buradan erişir. Supabase'e geçişte bu fonksiyonların gövdeleri değişecek.
 */
import type { Category, Product, Review, Show, User } from '@/types';

import { CATEGORIES, CATEGORIES_BY_POPULARITY, getCategory, getSubcategory } from './categories';
import { ALL_USERS, BUYER_USERS, PRODUCTS, PROMO_BANNERS, REVIEWS, SELLER_USERS, SHOWS } from './mock';

export { CATEGORIES, CATEGORIES_BY_POPULARITY, getCategory, getSubcategory, PROMO_BANNERS, SELLER_USERS, BUYER_USERS };
export type { PromoBanner } from './mock';

const userById = new Map(ALL_USERS.map((u) => [u.id, u]));
const userByName = new Map(ALL_USERS.map((u) => [u.username.toLocaleLowerCase('tr-TR'), u]));
const showById = new Map(SHOWS.map((s) => [s.id, s]));
const productById = new Map(PRODUCTS.map((p) => [p.id, p]));

// ─── Kullanıcı ───────────────────────────────────────────────────────────────

export function getUser(id: string | undefined): User | undefined {
  return id ? userById.get(id) : undefined;
}

export function getUserByUsername(username: string | undefined): User | undefined {
  return username ? userByName.get(username.replace(/^@/, '').toLocaleLowerCase('tr-TR')) : undefined;
}

export function getSellers(categoryId?: string): User[] {
  const list = categoryId ? SELLER_USERS.filter((u) => u.categoryIds.includes(categoryId)) : SELLER_USERS;
  return [...list].sort((a, b) => b.followers - a.followers);
}

/** Bir satıcının takipçi listesi (mock: alıcılar + diğer satıcılar) */
export function getFollowers(userId: string): User[] {
  const n = (parseInt(userId.replace(/\D/g, ''), 10) || 1) % 7;
  return [...BUYER_USERS.slice(n), ...SELLER_USERS.filter((u) => u.id !== userId).slice(0, 8)];
}

export function getFollowingOf(userId: string): User[] {
  const n = (parseInt(userId.replace(/\D/g, ''), 10) || 1) % 5;
  return SELLER_USERS.filter((u) => u.id !== userId).slice(n, n + 14);
}

// ─── Yayın ───────────────────────────────────────────────────────────────────

export function getShow(id: string | undefined): Show | undefined {
  return id ? showById.get(id) : undefined;
}

export function getLiveShows(filter: { categoryId?: string; subcategoryId?: string } = {}): Show[] {
  return SHOWS.filter(
    (s) =>
      s.status === 'live' &&
      (!filter.categoryId || s.categoryId === filter.categoryId) &&
      (!filter.subcategoryId || s.subcategoryId === filter.subcategoryId || s.tags.includes(filter.subcategoryId)),
  ).sort((a, b) => b.viewers - a.viewers);
}

export function getUpcomingShows(filter: { categoryId?: string; sellerIds?: string[] } = {}): Show[] {
  return SHOWS.filter(
    (s) =>
      s.status === 'scheduled' &&
      (!filter.categoryId || s.categoryId === filter.categoryId) &&
      (!filter.sellerIds || filter.sellerIds.includes(s.sellerId)),
  ).sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
}

export function getShowsBySeller(sellerId: string): { live: Show[]; upcoming: Show[]; past: Show[] } {
  const all = SHOWS.filter((s) => s.sellerId === sellerId);
  return {
    live: all.filter((s) => s.status === 'live'),
    upcoming: all.filter((s) => s.status === 'scheduled').sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt)),
    past: all.filter((s) => s.status === 'ended').sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt)),
  };
}

/** Kullanıcının canlı yayını (varsa) */
export function getLiveShowOf(sellerId: string): Show | undefined {
  return SHOWS.find((s) => s.sellerId === sellerId && s.status === 'live');
}

/** "Senin İçin" akışı: ilgi alanları + takip edilenler önce */
export function getForYouShows(interests: string[], followingIds: string[]): Show[] {
  const live = getLiveShows();
  const score = (s: Show) =>
    (followingIds.includes(s.sellerId) ? 1000 : 0) + (interests.includes(s.categoryId) ? 500 : 0) + (s.isFeatured ? 200 : 0) + Math.min(400, s.viewers);
  return [...live].sort((a, b) => score(b) - score(a));
}

// ─── Ürün ────────────────────────────────────────────────────────────────────

export function getProduct(id: string | undefined): Product | undefined {
  return id ? productById.get(id) : undefined;
}

export function getProductsByShow(showId: string): Product[] {
  const show = getShow(showId);
  if (!show) return [];
  return show.productIds.map((id) => productById.get(id)).filter(Boolean) as Product[];
}

/** Satıcının mağazası: satıştaki Hemen Al ürünleri */
export function getShopProducts(sellerId: string): Product[] {
  return PRODUCTS.filter((p) => p.sellerId === sellerId && p.format === 'buy_now' && p.sold < p.quantity);
}

export function getProductsByCategory(categoryId: string, opts: { format?: Product['format']; subcategoryId?: string } = {}): Product[] {
  return PRODUCTS.filter(
    (p) =>
      p.categoryId === categoryId &&
      p.sold < p.quantity &&
      (!opts.format || p.format === opts.format) &&
      (!opts.subcategoryId || p.subcategoryId === opts.subcategoryId),
  );
}

/** Pazaryeri: yayın dışında satın alınabilir ürünler */
export function getMarketplaceProducts(categoryId?: string): Product[] {
  return PRODUCTS.filter((p) => p.format === 'buy_now' && p.sold < p.quantity && (!categoryId || p.categoryId === categoryId));
}

export function getSimilarProducts(product: Product, limit = 10): Product[] {
  return PRODUCTS.filter((p) => p.id !== product.id && p.categoryId === product.categoryId && p.format === 'buy_now' && p.sold < p.quantity).slice(0, limit);
}

// ─── Değerlendirme ───────────────────────────────────────────────────────────

export function getReviewsForSeller(sellerId: string): Review[] {
  return REVIEWS.filter((r) => r.sellerId === sellerId);
}

export function getRatingBreakdown(sellerId: string): { average: number; total: number; counts: Record<1 | 2 | 3 | 4 | 5, number> } {
  const list = getReviewsForSeller(sellerId);
  const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<1 | 2 | 3 | 4 | 5, number>;
  list.forEach((r) => {
    counts[r.rating as 1 | 2 | 3 | 4 | 5] += 1;
  });
  const average = list.length ? list.reduce((s, r) => s + r.rating, 0) / list.length : 0;
  return { average: Math.round(average * 10) / 10, total: list.length, counts };
}

// ─── Arama ───────────────────────────────────────────────────────────────────

function norm(s: string): string {
  return s
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/é/g, 'e');
}

export type SearchResults = { shows: Show[]; products: Product[]; users: User[]; categories: Category[] };

export function search(query: string): SearchResults {
  const q = norm(query.trim());
  if (!q) return { shows: [], products: [], users: [], categories: [] };
  const terms = q.split(/\s+/);
  const hit = (text: string) => {
    const t = norm(text);
    return terms.every((term) => t.includes(term));
  };
  const categories = CATEGORIES.filter((c) => hit(c.name) || c.subcategories.some((s) => hit(s.name)));
  const catIds = new Set(categories.map((c) => c.id));
  const users = ALL_USERS.filter((u) => u.isSeller && (hit(u.username) || hit(u.displayName)));
  const shows = SHOWS.filter((s) => s.status !== 'ended' && (hit(s.title) || catIds.has(s.categoryId) || hit(getUser(s.sellerId)?.username ?? '')))
    .sort((a, b) => (a.status === 'live' ? 0 : 1) - (b.status === 'live' ? 0 : 1) || b.viewers - a.viewers);
  const products = PRODUCTS.filter((p) => p.sold < p.quantity && (hit(p.title) || hit(getSubcategory(p.categoryId, p.subcategoryId)?.name ?? '')));
  return { shows, products, users, categories };
}

/** Arama önerileri (otomatik tamamlama) */
export const TRENDING_SEARCHES = [
  'Charizard', 'Jordan 1', 'Osmanlı sikke', 'Arda Güler', 'Kilim', 'LEGO', 'Funko Pop', 'Rolex', 'Plak', 'Oltu taşı', 'Game Boy', 'Lokum',
];
