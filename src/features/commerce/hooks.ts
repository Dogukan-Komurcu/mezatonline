/**
 * Ticaret ekranları için veri çözümleyiciler.
 * Ürün / yayın önce mock veri katmanından, bulunamazsa kullanıcının kendi satıcı ilanlarından aranır.
 */
import { useEffect, useState } from 'react';

import { getProduct, getShow, getUser } from '@/data';
import { useActivityExtras } from '@/features/activity/store';
import { ME_ID, useMe } from '@/store/auth';
import { useOrdersStore } from '@/store/orders';
import { useSellerStore } from '@/store/seller';
import type { Order, Product, Show, User } from '@/types';

export function useProductById(id: string | undefined): Product | undefined {
  const local = useSellerStore((s) => (id ? s.listings.find((p) => p.id === id) : undefined));
  return getProduct(id) ?? local;
}

export function useShowById(id: string | undefined): Show | undefined {
  const local = useSellerStore((s) => (id ? s.shows.find((x) => x.id === id) : undefined));
  return getShow(id) ?? local;
}

/** Satıcı (kendi ilanımızsa giriş yapmış kullanıcı) */
export function useSellerOf(sellerId: string | undefined): User | undefined {
  const me = useMe();
  if (!sellerId) return undefined;
  if (sellerId === ME_ID) return me;
  return getUser(sellerId);
}

/** Bir yayının ürünleri (mock + kullanıcının kendi ilanları) */
export function useShowProducts(show: Show | undefined): Product[] {
  const listings = useSellerStore((s) => s.listings);
  if (!show) return [];
  return show.productIds.map((pid) => getProduct(pid) ?? listings.find((p) => p.id === pid)).filter((p): p is Product => !!p);
}

/** Bu kullanıcının bu üründen aldığı adet (iptal edilmeyen siparişler) */
function purchasedQty(orders: Order[], productId: string): number {
  return orders.filter((o) => o.productId === productId && o.buyerId === ME_ID && o.status !== 'cancelled' && !o.id.startsWith('o_seed')).reduce((n, o) => n + o.quantity, 0);
}

export function usePurchasedQty(productId: string | undefined): number {
  return useOrdersStore((s) => (productId ? purchasedQty(s.orders, productId) : 0));
}

/** Satışta kalan adet (mock stok − kullanıcının aldıkları) */
export function remainingStock(product: Product, orders: Order[]): number {
  return Math.max(0, product.quantity - product.sold - purchasedQty(orders, product.id));
}

export function useRemainingStock(product: Product | undefined): number {
  const purchased = usePurchasedQty(product?.id);
  if (!product) return 0;
  return Math.max(0, product.quantity - product.sold - purchased);
}

/** Bu ürüne verilmiş en güncel ön teklif */
export function useMyPreBid(productId: string | undefined) {
  return useOrdersStore((s) => (productId ? s.preBids.find((b) => b.productId === productId) : undefined));
}

/** Bu ürüne verilmiş en güncel fiyat önerisi (geri çekilenler sayılmaz) */
export function useMyLatestOffer(productId: string | undefined) {
  const withdrawn = useActivityExtras((s) => s.withdrawnOfferIds);
  return useOrdersStore((s) => (productId ? s.offers.find((o) => o.productId === productId && !withdrawn.includes(o.id)) : undefined));
}

/** Her `intervalMs`'de bir güncellenen "şimdi" (geri sayımlar için) */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}
