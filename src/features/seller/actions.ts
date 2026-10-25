/**
 * Satıcı tarafı iş akışları (birden çok store'u birlikte güncelleyen eylemler).
 * Ekranlar bunları çağırır; Supabase'e geçişte RPC / edge function çağrılarına dönüşecek.
 */
import { useEffect, useState } from 'react';

import { toast } from '@/components/ui';
import { haptic } from '@/lib/haptics';
import { useAuthStore } from '@/store/auth';
import { useInboxStore } from '@/store/inbox';
import { useSellerStore, type NewListingInput } from '@/store/seller';
import type { Carrier, ID, Product } from '@/types';

import { makeLabelCode, orderNet, type IncomingOffer } from './logic';
import { useSellerExtras, type ListingStatus } from './store';

/** Her `intervalMs`'de yenilenen "şimdi" (React Compiler uyumlu) */
export function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

// ─── Başvuru onayı ───────────────────────────────────────────────────────────

let approvalTimer: ReturnType<typeof setTimeout> | undefined;
let approvalDueAt = 0;

/** Başvuruyu onayla: satıcı yetkisi + bildirim + panelde konfeti */
export function approveSellerNow() {
  if (approvalTimer) {
    clearTimeout(approvalTimer);
    approvalTimer = undefined;
  }
  const seller = useSellerStore.getState();
  const auth = useAuthStore.getState();
  if (seller.application.status === 'approved' && auth.me.isSeller) return;
  seller.approveApplication();
  auth.becomeSeller();
  const extras = useSellerExtras.getState();
  extras.markApproved();
  extras.setCelebrate(true);
  useInboxStore.getState().pushNotification({
    type: 'promo',
    title: 'Satıcı başvurun onaylandı 🎉',
    body: "Satıcı Paneli'ne hoş geldin! İlk yayınını planlayarak satışa başla.",
    href: '/sell',
  });
  haptic.success();
}

/** Başvuru gönderildikten sonra otomatik onay (modal kapansa da çalışır) */
export function scheduleAutoApproval(delayMs = 4000) {
  const due = Date.now() + delayMs;
  // Daha erken planlanmış bir onay varsa onu erteleme
  if (approvalTimer && approvalDueAt <= due) return;
  if (approvalTimer) clearTimeout(approvalTimer);
  approvalDueAt = due;
  approvalTimer = setTimeout(() => {
    approvalTimer = undefined;
    if (useSellerStore.getState().application.status !== 'pending') return;
    approveSellerNow();
    toast.success('Satıcı başvurun onaylandı 🎉', 'storefront');
  }, delayMs);
}

// ─── Sipariş / kargo ─────────────────────────────────────────────────────────

export function createLabel(orderId: ID, carrier: Carrier) {
  useSellerExtras.getState().setLabel(orderId, { code: makeLabelCode(carrier), carrier, createdAt: new Date().toISOString() });
}

/** Kargoya verildi olarak işaretle (paylaşılan store "paid" dışını işlemediği için yedekli) */
export function shipOrder(orderId: ID, carrier: Carrier) {
  const store = useSellerStore.getState();
  store.markShipped(orderId, carrier);
  const after = useSellerStore.getState().orders.find((o) => o.id === orderId);
  if (after && after.status !== 'shipped') {
    const net = orderNet(after);
    useSellerStore.setState((s) => ({
      orders: s.orders.map((o) =>
        o.id === orderId
          ? { ...o, status: 'shipped', carrier, trackingNumber: String(Math.floor(1e11 + Math.random() * 9e11)), timeline: [...o.timeline, { status: 'shipped', at: new Date().toISOString() }] }
          : o,
      ),
      pendingBalance: Math.max(0, Math.round((s.pendingBalance - net) * 100) / 100),
      balance: Math.round((s.balance + net) * 100) / 100,
    }));
  }
  // Etikette seçilen firma ile kargo firması aynı kalsın
  useSellerStore.setState((s) => ({ orders: s.orders.map((o) => (o.id === orderId ? { ...o, carrier } : o)) }));
}

/** Satıcı kaynaklı iptal: sipariş iptal edilir, bekleyen bakiyeden düşülür, ürün stoğa döner */
export function cancelSellerOrder(orderId: ID, reason: string) {
  const order = useSellerStore.getState().orders.find((o) => o.id === orderId);
  if (!order || (order.status !== 'paid' && order.status !== 'preparing')) return;
  const net = orderNet(order);
  useSellerStore.setState((s) => ({
    orders: s.orders.map((o) =>
      o.id === orderId ? { ...o, status: 'cancelled', timeline: [...o.timeline, { status: 'cancelled', at: new Date().toISOString(), note: reason }] } : o,
    ),
    pendingBalance: Math.max(0, Math.round((s.pendingBalance - net) * 100) / 100),
    listings: s.listings.map((p) => (p.id === order.productId ? { ...p, sold: Math.max(0, p.sold - order.quantity) } : p)),
  }));
  useSellerExtras.getState().setCancelReason(orderId, reason);
}

// ─── Teklifler ───────────────────────────────────────────────────────────────

export function acceptOffer(offer: IncomingOffer) {
  useSellerStore.getState().recordSale({ product: offer.listing, price: offer.amount, buyerUsername: offer.buyer.id, source: 'offer' });
  useSellerExtras.getState().resolveOffer(offer.id, { status: 'accepted' });
}

// ─── İlan ↔ yayın ilişkisi ───────────────────────────────────────────────────

/** İlanları bir yayına ata (önceki yayınlardan çıkarır) */
export function assignListingsToShow(listingIds: ID[], showId: ID | undefined) {
  const ids = new Set(listingIds);
  useSellerStore.setState((s) => ({
    listings: s.listings.map((p) => (ids.has(p.id) ? { ...p, showId } : p)),
    shows: s.shows.map((show) => {
      const kept = show.productIds.filter((id) => !ids.has(id));
      const productIds = show.id === showId ? [...kept, ...listingIds] : kept;
      return productIds.length === show.productIds.length && productIds.every((id, i) => id === show.productIds[i]) ? show : { ...show, productIds };
    }),
  }));
}

/** Yayının ürün listesini belirle (yayına eklenen ilanların showId'si güncellenir) */
export function setShowProducts(showId: ID, productIds: ID[]) {
  const selected = new Set(productIds);
  useSellerStore.setState((s) => ({
    shows: s.shows.map((show) => (show.id === showId ? { ...show, productIds } : { ...show, productIds: show.productIds.filter((id) => !selected.has(id)) })),
    listings: s.listings.map((p) => (selected.has(p.id) ? { ...p, showId } : p.showId === showId ? { ...p, showId: undefined } : p)),
  }));
}

export function deleteListings(ids: ID[]) {
  const set = new Set(ids);
  useSellerStore.setState((s) => ({
    listings: s.listings.filter((p) => !set.has(p.id)),
    shows: s.shows.map((show) => (show.productIds.some((id) => set.has(id)) ? { ...show, productIds: show.productIds.filter((id) => !set.has(id)) } : show)),
  }));
  useSellerExtras.getState().removeListingStatus(ids);
}

/**
 * İlan oluştur + durumunu yaz.
 * Paylaşılan store 3. ilanda örnek siparişler üretiyor ama bakiye / stok güncellemiyor;
 * burada bu siparişler bakiyeye ve satılan adetlere yansıtılır (taslak ilanlara ait olanlar atılır).
 */
export function createListingWithStatus(input: NewListingInput, status: ListingStatus): Product {
  const before = new Set(useSellerStore.getState().orders.map((o) => o.id));
  const product = useSellerStore.getState().createListing(input);
  useSellerExtras.getState().setListingStatus(product.id, status);
  const seeded = useSellerStore.getState().orders.filter((o) => !before.has(o.id));
  if (seeded.length) {
    const statusMap = useSellerExtras.getState().listingStatus;
    const keep = seeded.filter((o) => (statusMap[o.productId] ?? 'active') !== 'draft');
    const dropIds = new Set(seeded.filter((o) => !keep.includes(o)).map((o) => o.id));
    const soldBy = new Map<ID, number>();
    let pendingAdd = 0;
    let balanceAdd = 0;
    keep.forEach((o) => {
      soldBy.set(o.productId, (soldBy.get(o.productId) ?? 0) + o.quantity);
      const net = orderNet(o);
      if (o.status === 'paid' || o.status === 'preparing') pendingAdd += net;
      else if (o.status !== 'cancelled' && o.status !== 'refunded') balanceAdd += net;
    });
    useSellerStore.setState((s) => ({
      orders: s.orders.filter((o) => !dropIds.has(o.id)),
      listings: s.listings.map((p) => (soldBy.has(p.id) ? { ...p, sold: Math.min(p.quantity, p.sold + (soldBy.get(p.id) ?? 0)) } : p)),
      pendingBalance: Math.round((s.pendingBalance + pendingAdd) * 100) / 100,
      balance: Math.round((s.balance + balanceAdd) * 100) / 100,
    }));
  }
  return product;
}

/** İlanı kopyala: ayrı stoklu yeni bir taslak oluşturur */
export function duplicateListing(p: Product): Product {
  const { id: _id, sellerId: _s, sold: _sold, createdAt: _c, saves: _saves, ...rest } = p;
  return createListingWithStatus({ ...rest, title: `${p.title} (kopya)`.slice(0, 80), showId: undefined }, 'draft');
}

/** Yayını iptal et: ürünler envantere döner */
export function cancelShow(showId: ID) {
  useSellerStore.setState((s) => ({ listings: s.listings.map((p) => (p.showId === showId ? { ...p, showId: undefined } : p)) }));
  useSellerStore.getState().cancelShow(showId);
}
