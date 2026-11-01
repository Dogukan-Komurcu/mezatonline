/**
 * Yalnızca geliştirme (QA): satıcı panelini örnek ilan + planlı yayınla doldurur.
 * `/sell?qa=seed` ile tetiklenir (bkz. src/app/(tabs)/sell.tsx). Üretim derlemesinde çalışmaz.
 * `/seller/inventory?qa=ipcase`: örnek hak sahibi şikâyeti dosyası açar (seedIpCaseQa).
 */
import { useLocalSearchParams } from 'expo-router';

import { getProductsByCategory } from '@/data';
import { takeDownListing } from '@/features/trust/actions';
import { authenticityRequirement } from '@/features/trust/counterfeit';
import { useSellerStore } from '@/store/seller';
import type { ID } from '@/types';

import { createListingWithStatus, setShowProducts } from './actions';
import { listingTab } from './logic';
import { useSellerExtras } from './store';

export function seedSellerQa() {
  if (!__DEV__) return;
  const seller = useSellerStore.getState();
  const source = getProductsByCategory('tcg').slice(0, 6);
  const ids =
    seller.listings.length >= 3
      ? seller.listings.filter((p) => p.sold < p.quantity).map((p) => p.id)
      : source.map((p, i) => {
          const { id: _id, sellerId: _s, sold: _sold, createdAt: _c, saves: _saves, showId: _show, ...rest } = p;
          return createListingWithStatus({ ...rest, format: i % 3 === 2 ? 'buy_now' : 'auction', quantity: Math.max(1, rest.quantity) }, i === 5 ? 'draft' : 'active').id;
        });
  // Bitmemiş bir yayın zaten varsa yenisini planlama
  if (useSellerStore.getState().shows.some((s) => s.status !== 'ended')) return;
  const at = new Date(Date.now() + 26 * 3_600_000);
  at.setMinutes(0, 0, 0);
  const show = useSellerStore.getState().scheduleShow({
    title: 'Pazar Akşamı Pokémon Mezatı',
    description: 'Ön pey açık, ₺1 başlangıçlı mezatlar.',
    coverImage: source[0]?.images[0] ?? '',
    categoryId: 'tcg',
    scheduledAt: at.toISOString(),
    tags: ['₺1 Başlangıç'],
  });
  setShowProducts(show.id, ids.slice(0, 5));
  useSellerExtras.getState().setShowMeta(show.id, { format: 'auction', moderators: [], visibility: 'public' });
}

/**
 * Yalnızca geliştirme: aktif bir ilanı örnek hak sahibi şikâyetiyle yayından kaldırır
 * (`/seller/inventory?qa=ipcase`). Orijinallik belgesi gerektiren ilanı tercih eder; aktif ilan
 * yoksa önce örnek ilanları ekler. Kaldırılan ilanın kimliğini döner.
 */
export function seedIpCaseQa(): ID | undefined {
  if (!__DEV__) return undefined;
  const pick = () => {
    const status = useSellerExtras.getState().listingStatus;
    const active = useSellerStore.getState().listings.filter((p) => listingTab(p, status) === 'active');
    return active.find((p) => authenticityRequirement(p).required) ?? active[0];
  };
  let target = pick();
  if (!target) {
    seedSellerQa();
    target = pick();
  }
  if (!target) return undefined;
  takeDownListing(target.id, { complaintNo: `FM-${Math.floor(10000 + Math.random() * 90000)}`, rightType: 'trademark', rightHolder: 'Örnek Marka A.Ş. (demo)' });
  return target.id;
}

/** Yalnızca geliştirme: `?qaY=600` → kaydırma görünümünü bu ofsetle aç (ekran görüntüsü QA'sı) */
export function useQaOffset(): { x: number; y: number } | undefined {
  const { qaY } = useLocalSearchParams<{ qaY?: string }>();
  if (!__DEV__ || !qaY) return undefined;
  return { x: 0, y: Number(qaY) || 0 };
}

/** Yalnızca geliştirme: `?qa=<anahtar>` QA parametresi */
export function useQaParam(): string | undefined {
  const { qa } = useLocalSearchParams<{ qa?: string }>();
  return __DEV__ ? qa : undefined;
}
