import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { CARRIERS, orderNumber, SEED_ORDERS, trackingNumber } from '@/data/seeds';
import { getShow } from '@/data';
import { buyerServiceFee, packageOf, quoteShipping } from '@/lib/pricing';
import { random, uid } from '@/lib/rng';
import type { ID, Offer, Order, OrderSource, OrderStatus, Product } from '@/types';

import { ME_ID } from './auth';
import { persistStorage, storeKey } from './storage';

export type CreateOrderInput = {
  product: Product;
  price: number;
  source: OrderSource;
  offerId?: ID;
  showId?: ID;
  quantity?: number;
  addressId?: ID;
  paymentMethodId?: ID;
  creditUsed?: number;
};

export type PreBidStatus = 'upcoming' | 'winning' | 'outbid' | 'won' | 'lost' | 'expired';

/** Yayın öncesi verilen ön teklif (maks. teklif gibi çalışır; geri çekilemez, kurumsal satıcıda yasal cayma hakkı saklıdır) */
export type PreBid = {
  id: ID;
  productId: ID;
  showId: ID;
  maxAmount: number;
  status: PreBidStatus;
  createdAt: string;
};

type OrdersState = {
  orders: Order[];
  offers: Offer[];
  preBids: PreBid[];
  /** Ön teklif ver ya da mevcut ön teklifi yükselt (düşürülemez) */
  placePreBid: (productId: ID, showId: ID, maxAmount: number) => PreBid;
  /**
   * Yeni sipariş oluşturur. Kargo payı lib/pricing quoteShipping ile hesaplanır: aynı yayından 24 saat
   * içinde aynı satıcıya verilen siparişler tek pakete girer ("Kargo birleştirildi"), kargo dahil ilanda
   * ve yayının ücretsiz kargo eşiğini geçen alımda alıcıdan kargo alınmaz.
   */
  createOrder: (input: CreateOrderInput) => Order;
  cancelOrder: (id: ID) => void;
  requestReturn: (id: ID, reason: string) => void;
  markReviewed: (id: ID) => void;
  /** Zamana göre sipariş durumlarını ilerletir (simülasyon) */
  advanceOrders: () => void;
  makeOffer: (productId: ID, amount: number) => Offer;
  resolveOffer: (id: ID, status: Offer['status'], counterAmount?: number) => void;
};

const MIN = 60_000;

/** Aynı yayından aynı satıcıya son 24 saatte verilmiş, iptal edilmemiş siparişler (tek paket) */
export function packageOrders(orders: Order[], showId: ID, sellerId: ID, now = Date.now()): Order[] {
  return orders.filter((o) => o.showId === showId && o.sellerId === sellerId && o.status !== 'cancelled' && now - new Date(o.createdAt).getTime() < 24 * 60 * MIN);
}
/** Simülasyon: sipariş durumları bu sürelerden sonra ilerler */
const PROGRESS: { after: number; status: OrderStatus }[] = [
  { after: 2 * MIN, status: 'preparing' },
  { after: 10 * MIN, status: 'shipped' },
  { after: 40 * MIN, status: 'out_for_delivery' },
  { after: 90 * MIN, status: 'delivered' },
];
const FLOW: OrderStatus[] = ['paid', 'preparing', 'shipped', 'out_for_delivery', 'delivered'];

export const useOrdersStore = create<OrdersState>()(
  persist(
    (set, get) => ({
      orders: SEED_ORDERS,
      offers: [],
      preBids: [],
      placePreBid: (productId, showId, maxAmount) => {
        const existing = get().preBids.find((b) => b.productId === productId);
        if (existing) {
          const updated = { ...existing, maxAmount: Math.max(existing.maxAmount, maxAmount), status: 'winning' as const };
          set((s) => ({ preBids: s.preBids.map((b) => (b.id === existing.id ? updated : b)) }));
          return updated;
        }
        const bid: PreBid = { id: uid('pb'), productId, showId, maxAmount, status: 'winning', createdAt: new Date().toISOString() };
        set((s) => ({ preBids: [bid, ...s.preBids] }));
        return bid;
      },
      createOrder: ({ product, price, source, offerId, showId, quantity = 1, addressId, paymentMethodId, creditUsed = 0 }) => {
        const now = Date.now();
        const itemPrice = price * quantity;
        // Aynı yayından aynı satıcıya alınanlar tek pakette gider; kargo dahil ilan ve yayının ücretsiz kargo eşiği de burada uygulanır
        const bundle = showId ? packageOrders(get().orders, showId, product.sellerId, now) : [];
        const ship = quoteShipping(product, { pkg: packageOf(bundle), itemTotal: itemPrice, freeShippingThreshold: getShow(showId)?.freeShippingThreshold });
        const shippingCost = ship.buyer;
        const serviceFee = buyerServiceFee(itemPrice);
        const order: Order = {
          id: uid('o'),
          number: orderNumber(),
          buyerId: ME_ID,
          sellerId: product.sellerId,
          productId: product.id,
          productTitle: product.title,
          productImage: product.images[0],
          quantity,
          source,
          offerId,
          showId,
          itemPrice,
          shippingCost,
          sellerShippingCost: ship.seller || undefined,
          shippingNote: ship.note,
          serviceFee,
          creditUsed,
          total: Math.max(0, Math.round((itemPrice + shippingCost + serviceFee - creditUsed) * 100) / 100),
          status: 'paid',
          addressId,
          paymentMethodId,
          timeline: [{ status: 'paid', at: new Date(now).toISOString(), note: ship.note === 'bundled' ? 'Kargo aynı yayındaki siparişinle birleştirildi' : undefined }],
          createdAt: new Date(now).toISOString(),
          reviewed: false,
        };
        set((s) => ({ orders: [order, ...s.orders] }));
        return order;
      },
      cancelOrder: (id) =>
        set((s) => ({
          orders: s.orders.map((o) =>
            o.id === id && (o.status === 'paid' || o.status === 'preparing')
              ? { ...o, status: 'cancelled', timeline: [...o.timeline, { status: 'cancelled', at: new Date().toISOString(), note: 'İade tutarının kartına yansıması bankana göre 2–10 iş günü sürebilir' }] }
              : o,
          ),
        })),
      requestReturn: (id, reason) =>
        set((s) => ({
          orders: s.orders.map((o) =>
            o.id === id ? { ...o, status: 'return_requested', timeline: [...o.timeline, { status: 'return_requested', at: new Date().toISOString(), note: reason }] } : o,
          ),
        })),
      markReviewed: (id) => set((s) => ({ orders: s.orders.map((o) => (o.id === id ? { ...o, reviewed: true } : o)) })),
      advanceOrders: () => {
        const now = Date.now();
        let changed = false;
        const orders = get().orders.map((o) => {
          if (o.id.startsWith('o_seed')) return o;
          const idx = FLOW.indexOf(o.status);
          if (idx < 0 || o.status === 'delivered') return o;
          const age = now - new Date(o.createdAt).getTime();
          let target: OrderStatus = o.status;
          for (const p of PROGRESS) if (age >= p.after) target = p.status;
          const targetIdx = FLOW.indexOf(target);
          if (targetIdx <= idx) return o;
          changed = true;
          const created = new Date(o.createdAt).getTime();
          const events = FLOW.slice(idx + 1, targetIdx + 1).map((st) => ({
            status: st,
            at: new Date(created + (PROGRESS.find((p) => p.status === st)?.after ?? 0)).toISOString(),
          }));
          const shipped = targetIdx >= 2;
          return {
            ...o,
            status: target,
            carrier: o.carrier ?? (shipped ? random.pick(CARRIERS) : undefined),
            trackingNumber: o.trackingNumber ?? (shipped ? trackingNumber() : undefined),
            timeline: [...o.timeline, ...events],
          };
        });
        if (changed) set({ orders });
      },
      makeOffer: (productId, amount) => {
        const offer: Offer = { id: uid('of'), productId, amount, status: 'pending', createdAt: new Date().toISOString() };
        set((s) => ({ offers: [offer, ...s.offers] }));
        return offer;
      },
      resolveOffer: (id, status, counterAmount) =>
        set((s) => ({ offers: s.offers.map((o) => (o.id === id ? { ...o, status, counterAmount, counteredAt: status === 'countered' ? new Date().toISOString() : o.counteredAt } : o)) })),
    }),
    { name: storeKey('orders'), storage: persistStorage },
  ),
);

export const PRE_BID_STATUS_LABELS: Record<PreBidStatus, string> = {
  upcoming: 'Yaklaşan',
  winning: 'Öndesin',
  outbid: 'Teklifin geçildi',
  won: 'Kazandın',
  lost: 'Kaybettin',
  expired: 'Süresi doldu',
};

export const OFFER_STATUS_LABELS: Record<Offer['status'], string> = {
  pending: 'Yanıt bekleniyor',
  countered: 'Karşı teklif',
  accepted: 'Kabul edildi',
  declined: 'Reddedildi',
};

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  paid: 'Ödeme alındı',
  preparing: 'Hazırlanıyor',
  shipped: 'Kargoda',
  out_for_delivery: 'Dağıtıma çıktı',
  delivered: 'Teslim edildi',
  cancelled: 'İptal edildi',
  return_requested: 'İade talebi',
  refunded: 'İade edildi',
};

export const ORDER_SOURCE_LABELS: Record<OrderSource, string> = {
  auction: 'Açık artırma',
  buy_now: 'Hemen Al',
  giveaway: 'Çekiliş',
  offer: 'Teklif',
  flash_sale: 'Flaş indirim',
};
