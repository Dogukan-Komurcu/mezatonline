/**
 * Canlı yayın içi satın alma yardımcıları: kupon + Mezat kredisi uygulayarak ortak
 * `completePurchase` akışını çağırır; aynı yayından paketleme (kargo birleştirme) kontrolü.
 */
import { completePurchase } from '@/features/shared/purchase';
import { useOrdersStore } from '@/store/orders';
import type { Order, OrderSource, Product } from '@/types';

import { useLivePrefs } from './liveStore';

const DAY = 86_400_000;

export type LivePurchaseInput = {
  product: Product;
  /** Birim fiyat */
  price: number;
  source: OrderSource;
  showId: string;
  quantity?: number;
};

export type LivePurchaseResult = { order: Order; discount: number };

/** Sipariş oluşturur. Kupon yalnızca tek adetlik alımlarda uygulanır (çekilişte uygulanmaz). */
export function purchaseInLive({ product, price, source, showId, quantity = 1 }: LivePurchaseInput): LivePurchaseResult {
  const prefs = useLivePrefs.getState();
  const discount = quantity === 1 && source !== 'giveaway' && price > 0 ? prefs.consumeCoupon(price) : 0;
  const order = completePurchase({
    product,
    price: Math.max(0, price - discount),
    source,
    showId,
    quantity,
    applyCredits: prefs.useCredits && price > 0,
  });
  return { order, discount };
}

/** Bu yayından bu satıcıya ait son 24 saatte açık bir sipariş var mı (kargo tek sefer) */
export function hasBundleInShow(showId: string, sellerId: string): boolean {
  const now = Date.now();
  return useOrdersStore
    .getState()
    .orders.some((o) => o.showId === showId && o.sellerId === sellerId && o.status !== 'cancelled' && now - new Date(o.createdAt).getTime() < DAY);
}

/** Reaktif sürüm: kartlarda "Kargo: +₺0 (aynı pakete eklendi)" göstermek için */
export function useShowBundle(showId: string, sellerId: string): boolean {
  return useOrdersStore((s) =>
    s.orders.some((o) => o.showId === showId && o.sellerId === sellerId && o.status !== 'cancelled' && Date.now() - new Date(o.createdAt).getTime() < DAY),
  );
}
