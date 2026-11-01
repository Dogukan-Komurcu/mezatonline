/**
 * Yayın ve ürün listeleri için filtre / sıralama mantığı (Kategori sayfası + Arama sonuçları).
 * Saf fonksiyonlar: ekranlar sonucu useMemo ile hesaplar.
 */
import { CONDITION_LABELS, FORMAT_LABELS } from '@/components/cards/ProductCard';
import { getProductsByShow, getShow, getUser } from '@/data';
import { SUDDEN_DEATH_LABEL } from '@/lib/auction';
import type { Condition, ListingFormat, Product, Show } from '@/types';

// ─── Yayınlar ────────────────────────────────────────────────────────────────

export type ShowStatusFilter = 'live' | 'scheduled';

export type ShowFilters = {
  /** Boş = hepsi */
  status: ShowStatusFilter[];
  freeShipping: boolean;
  giveaway: boolean;
  oneLira: boolean;
  suddenDeath: boolean;
  /** En İyi Satıcılar */
  topSellers: boolean;
  /** Yeni ve Dikkat Çekenler */
  fresh: boolean;
};

export const EMPTY_SHOW_FILTERS: ShowFilters = {
  status: [],
  freeShipping: false,
  giveaway: false,
  oneLira: false,
  suddenDeath: false,
  topSellers: false,
  fresh: false,
};

export type ShowSort = 'recommended' | 'viewers' | 'soonest' | 'saved';

export const SHOW_SORT_LABELS: Record<ShowSort, string> = {
  recommended: 'Önerilen',
  viewers: 'En çok izlenen',
  soonest: 'Yakında başlayacak',
  saved: 'En çok hatırlatıcı kurulan',
};

export const SHOW_STATUS_LABELS: Record<ShowStatusFilter, string> = {
  live: 'Şu an canlı',
  scheduled: 'Yaklaşan yayınlar',
};

const YEAR = 365 * 24 * 3600 * 1000;

export function showHasOneLira(show: Show): boolean {
  return show.highlights.includes('₺1 Başlangıç') || getProductsByShow(show.id).some((p) => p.format === 'auction' && p.price <= 1);
}

export function showHasSuddenDeath(show: Show): boolean {
  return show.highlights.some((h) => h === SUDDEN_DEATH_LABEL || h === 'Sudden Death' || h.startsWith('Ani Bitiş')) || getProductsByShow(show.id).some((p) => p.suddenDeath);
}

/** Ücretsiz kargo kampanyası (tek alımda eşik) ya da kargo dahil ürünü olan yayınlar */
export function showHasFreeShipping(show: Show): boolean {
  return show.highlights.includes('Ücretsiz Kargo') || show.freeShippingThreshold !== undefined || getProductsByShow(show.id).some((p) => p.shippingIncluded);
}

export function showIsFresh(show: Show): boolean {
  const seller = getUser(show.sellerId);
  if (!seller) return false;
  return show.isFeatured || seller.badges.includes('new_seller') || Date.now() - new Date(seller.joinedAt).getTime() < YEAR / 2;
}

export function showMatches(show: Show, f: ShowFilters): boolean {
  if (show.status === 'ended') return false;
  if (f.status.length && !f.status.includes(show.status)) return false;
  if (f.freeShipping && !showHasFreeShipping(show)) return false;
  if (f.giveaway && show.giveawayCount <= 0) return false;
  if (f.oneLira && !showHasOneLira(show)) return false;
  if (f.suddenDeath && !showHasSuddenDeath(show)) return false;
  if (f.topSellers && !getUser(show.sellerId)?.badges.includes('top_seller')) return false;
  if (f.fresh && !showIsFresh(show)) return false;
  return true;
}

/** Varsayılan: önce canlılar (izleyiciye göre), sonra yaklaşanlar (zamana göre) */
export function sortShows(list: readonly Show[], sort: ShowSort): Show[] {
  const live = list.filter((s) => s.status === 'live');
  const upcoming = list.filter((s) => s.status === 'scheduled');
  const byViewers = (a: Show, b: Show) => b.viewers - a.viewers;
  const byTime = (a: Show, b: Show) => a.scheduledAt.localeCompare(b.scheduledAt);
  switch (sort) {
    case 'viewers':
      return [...live.sort(byViewers), ...upcoming.sort((a, b) => b.savedCount - a.savedCount)];
    case 'soonest':
      return [...upcoming.sort(byTime), ...live.sort(byViewers)];
    case 'saved':
      return [...list].sort((a, b) => b.savedCount - a.savedCount);
    default: {
      const score = (s: Show) => s.viewers + (s.isFeatured ? 150 : 0) + (getUser(s.sellerId)?.badges.includes('top_seller') ? 80 : 0);
      return [...live.sort((a, b) => score(b) - score(a)), ...upcoming.sort(byTime)];
    }
  }
}

export function countShowFilters(f: ShowFilters): number {
  return (
    (f.status.length ? 1 : 0) +
    (f.freeShipping ? 1 : 0) +
    (f.giveaway ? 1 : 0) +
    (f.oneLira ? 1 : 0) +
    (f.suddenDeath ? 1 : 0) +
    (f.topSellers ? 1 : 0) +
    (f.fresh ? 1 : 0)
  );
}

// ─── Ürünler ─────────────────────────────────────────────────────────────────

export type ProductFilters = {
  formats: ListingFormat[];
  conditions: Condition[];
  minPrice: number | null;
  maxPrice: number | null;
  /** Yalnız canlı / yaklaşan bir yayında satılanlar */
  inShow: boolean;
  acceptsOffers: boolean;
};

export const EMPTY_PRODUCT_FILTERS: ProductFilters = {
  formats: [],
  conditions: [],
  minPrice: null,
  maxPrice: null,
  inShow: false,
  acceptsOffers: false,
};

export type ProductSort = 'recommended' | 'ending' | 'newest' | 'price_asc' | 'price_desc';

export const PRODUCT_SORT_LABELS: Record<ProductSort, string> = {
  recommended: 'Önerilen',
  ending: 'Yakında bitecek',
  newest: 'Yeni eklenenler',
  price_asc: 'Fiyat: Düşükten yükseğe',
  price_desc: 'Fiyat: Yüksekten düşüğe',
};

export const PRODUCT_FORMAT_OPTIONS: { key: ListingFormat; label: string }[] = [
  { key: 'auction', label: FORMAT_LABELS.auction },
  { key: 'buy_now', label: FORMAT_LABELS.buy_now },
];

export const CONDITION_OPTIONS: { key: Condition; label: string }[] = (Object.keys(CONDITION_LABELS) as Condition[]).map((key) => ({
  key,
  label: CONDITION_LABELS[key],
}));

/** Ürün aktif (canlı ya da planlanmış) bir yayında mı */
export function productShow(product: Product): Show | undefined {
  const show = product.showId ? getShow(product.showId) : undefined;
  return show && show.status !== 'ended' ? show : undefined;
}

export function productMatches(p: Product, f: ProductFilters): boolean {
  if (f.formats.length && !f.formats.includes(p.format)) return false;
  if (f.conditions.length && !f.conditions.includes(p.condition)) return false;
  if (f.minPrice !== null && p.price < f.minPrice) return false;
  if (f.maxPrice !== null && p.price > f.maxPrice) return false;
  if (f.inShow && !productShow(p)) return false;
  if (f.acceptsOffers && !p.acceptsOffers) return false;
  return true;
}

export function sortProducts(list: readonly Product[], sort: ProductSort): Product[] {
  const out = [...list];
  switch (sort) {
    case 'price_asc':
      return out.sort((a, b) => a.price - b.price);
    case 'price_desc':
      return out.sort((a, b) => b.price - a.price);
    case 'newest':
      return out.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    case 'ending': {
      // Canlı yayındakiler önce, sonra yayın saatine göre, en sonda mağaza ürünleri
      const rank = (p: Product) => {
        const show = productShow(p);
        if (!show) return Number.MAX_SAFE_INTEGER;
        if (show.status === 'live') return 0;
        return new Date(show.scheduledAt).getTime();
      };
      return out.sort((a, b) => rank(a) - rank(b));
    }
    default:
      return out.sort((a, b) => b.saves - a.saves);
  }
}

export function countProductFilters(f: ProductFilters): number {
  return (
    (f.formats.length ? 1 : 0) +
    (f.conditions.length ? 1 : 0) +
    (f.minPrice !== null || f.maxPrice !== null ? 1 : 0) +
    (f.inShow ? 1 : 0) +
    (f.acceptsOffers ? 1 : 0)
  );
}

export function toggleItem<T>(list: readonly T[], item: T): T[] {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
}
