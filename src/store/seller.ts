import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { CARRIERS, makeSellerOrders, trackingNumber } from '@/data/seeds';
import { packageOf, quoteShipping, sellerOrderNet, SHIPPING_PRICES } from '@/lib/pricing';
import { uid } from '@/lib/rng';
import type { Carrier, ID, Order, Payout, Product, SellerApplication, Show } from '@/types';

import { ME_ID } from './auth';
import { persistStorage, storeKey } from './storage';

export type NewListingInput = Omit<Product, 'id' | 'sellerId' | 'sold' | 'createdAt' | 'saves' | 'shippingCost'> & { shippingCost?: number };

export type NewShowInput = Pick<Show, 'title' | 'description' | 'coverImage' | 'categoryId' | 'subcategoryId' | 'scheduledAt' | 'tags'> & {
  productIds?: ID[];
  freeShippingThreshold?: number;
};

export type LiveSessionSummary = {
  id: ID;
  showId: ID;
  startedAt: string;
  endedAt: string;
  gross: number;
  itemsSold: number;
  peakViewers: number;
};

type SellerState = {
  application: SellerApplication;
  listings: Product[];
  shows: Show[];
  orders: Order[];
  payouts: Payout[];
  /** Çekilebilir bakiye (₺) */
  balance: number;
  /** Bekleyen bakiye (teslimat onayı bekleyen) */
  pendingBalance: number;
  sessions: LiveSessionSummary[];
  iban?: string;
  submitApplication: (a: Omit<SellerApplication, 'status' | 'submittedAt'>) => void;
  approveApplication: () => void;
  createListing: (input: NewListingInput) => Product;
  updateListing: (id: ID, patch: Partial<Product>) => void;
  deleteListing: (id: ID) => void;
  scheduleShow: (input: NewShowInput) => Show;
  updateShow: (id: ID, patch: Partial<Show>) => void;
  cancelShow: (id: ID) => void;
  setShowStatus: (id: ID, status: Show['status']) => void;
  /** Canlı yayında satılan ürünü siparişe dönüştürür */
  recordSale: (input: { product: Product; price: number; buyerUsername: string; showId?: ID; source: Order['source'] }) => void;
  markShipped: (orderId: ID, carrier?: Carrier) => void;
  addSession: (s: Omit<LiveSessionSummary, 'id'>) => void;
  requestPayout: (amount: number) => Payout | null;
  setIban: (iban: string) => void;
};

export const useSellerStore = create<SellerState>()(
  persist(
    (set, get) => ({
      application: { status: 'none' },
      listings: [],
      shows: [],
      orders: [],
      payouts: [],
      balance: 0,
      pendingBalance: 0,
      sessions: [],
      submitApplication: (a) => set({ application: { ...a, status: 'pending', submittedAt: new Date().toISOString() }, iban: a.iban }),
      approveApplication: () => set((s) => ({ application: { ...s.application, status: 'approved' } })),
      createListing: (input) => {
        const product: Product = {
          ...input,
          id: uid('my'),
          sellerId: ME_ID,
          sold: 0,
          saves: 0,
          createdAt: new Date().toISOString(),
          shippingCost: input.shippingIncluded ? 0 : (input.shippingCost ?? SHIPPING_PRICES[input.shippingProfile]),
        };
        set((s) => {
          const listings = [product, ...s.listings];
          // İlk ilanlardan sonra örnek siparişler oluştur (satıcı paneli boş görünmesin)
          const orders = s.orders.length === 0 && listings.length >= 3 ? makeSellerOrders(listings) : s.orders;
          return { listings, orders };
        });
        return product;
      },
      updateListing: (id, patch) => set((s) => ({ listings: s.listings.map((p) => (p.id === id ? { ...p, ...patch } : p)) })),
      deleteListing: (id) => set((s) => ({ listings: s.listings.filter((p) => p.id !== id) })),
      scheduleShow: (input) => {
        const show: Show = {
          id: uid('myshow'),
          sellerId: ME_ID,
          title: input.title,
          description: input.description,
          coverImage: input.coverImage,
          categoryId: input.categoryId,
          subcategoryId: input.subcategoryId,
          tags: input.tags,
          status: 'scheduled',
          viewers: 0,
          scheduledAt: input.scheduledAt,
          productIds: input.productIds ?? [],
          shippingCost: SHIPPING_PRICES.small,
          freeShippingThreshold: input.freeShippingThreshold,
          giveawayCount: 0,
          savedCount: 0,
          highlights: [],
          isFeatured: false,
        };
        set((s) => ({ shows: [show, ...s.shows] }));
        return show;
      },
      updateShow: (id, patch) => set((s) => ({ shows: s.shows.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
      cancelShow: (id) => set((s) => ({ shows: s.shows.filter((x) => x.id !== id) })),
      setShowStatus: (id, status) =>
        set((s) => ({
          shows: s.shows.map((x) =>
            x.id === id
              ? { ...x, status, startedAt: status === 'live' ? new Date().toISOString() : x.startedAt, endedAt: status === 'ended' ? new Date().toISOString() : x.endedAt }
              : x,
          ),
        })),
      recordSale: ({ product, price, buyerUsername, showId, source }) => {
        const now = Date.now();
        // Aynı alıcıya aynı yayından son 24 saatte satılanlar tek pakette gider; çekiliş ödülünün kargosunu satıcı öder
        const bundle = showId
          ? get().orders.filter((o) => o.showId === showId && o.buyerId === buyerUsername && o.status !== 'cancelled' && now - new Date(o.createdAt).getTime() < 86_400_000)
          : [];
        const ship = quoteShipping(source === 'giveaway' ? { ...product, shippingIncluded: true } : product, {
          pkg: packageOf(bundle),
          itemTotal: price,
          freeShippingThreshold: get().shows.find((sh) => sh.id === showId)?.freeShippingThreshold,
        });
        const order: Order = {
          id: uid('so'),
          number: 'MZ-' + Math.floor(50000 + Math.random() * 40000),
          buyerId: buyerUsername,
          sellerId: ME_ID,
          productId: product.id,
          productTitle: product.title,
          productImage: product.images[0],
          quantity: 1,
          source,
          showId,
          itemPrice: price,
          shippingCost: ship.buyer,
          sellerShippingCost: ship.seller || undefined,
          shippingNote: ship.note,
          serviceFee: 0,
          creditUsed: 0,
          total: price + ship.buyer,
          status: 'paid',
          timeline: [{ status: 'paid', at: new Date().toISOString() }],
          createdAt: new Date().toISOString(),
          reviewed: false,
        };
        set((s) => ({
          orders: [order, ...s.orders],
          pendingBalance: Math.round((s.pendingBalance + sellerOrderNet(order)) * 100) / 100,
          listings: s.listings.map((p) => (p.id === product.id ? { ...p, sold: Math.min(p.quantity, p.sold + 1) } : p)),
        }));
      },
      markShipped: (orderId, carrier) =>
        set((s) => {
          const order = s.orders.find((o) => o.id === orderId);
          if (!order || order.status !== 'paid') return {};
          const net = sellerOrderNet(order);
          return {
            orders: s.orders.map((o) =>
              o.id === orderId
                ? {
                    ...o,
                    status: 'shipped',
                    carrier: carrier ?? CARRIERS[0],
                    trackingNumber: trackingNumber(),
                    timeline: [...o.timeline, { status: 'shipped', at: new Date().toISOString() }],
                  }
                : o,
            ),
            // Kargolanınca bekleyen bakiye çekilebilir bakiyeye geçer (demo)
            // Kırpılmaz: satıcının karşıladığı kargo (ör. çekiliş ödülü) siparişin netini eksiye düşürebilir
            pendingBalance: Math.round((s.pendingBalance - net) * 100) / 100,
            balance: Math.round((s.balance + net) * 100) / 100,
          };
        }),
      addSession: (session) => set((s) => ({ sessions: [{ ...session, id: uid('sess') }, ...s.sessions] })),
      requestPayout: (amount) => {
        const { balance, iban } = get();
        if (amount <= 0 || amount > balance) return null;
        const payout: Payout = {
          id: uid('po'),
          amount,
          status: 'processing',
          iban: iban ?? 'TR00 0000 0000 0000 0000 0000 00',
          createdAt: new Date().toISOString(),
          orderCount: get().orders.filter((o) => o.status !== 'paid').length,
        };
        set((s) => ({ payouts: [payout, ...s.payouts], balance: Math.round((s.balance - amount) * 100) / 100 }));
        return payout;
      },
      setIban: (iban) => set({ iban }),
    }),
    {
      name: storeKey('seller'),
      storage: persistStorage,
      version: 1,
      // v0: bakiyeler eski ücretlerle (%8 + %2,9 + ₺3) birikmişti → siparişlerden yeni ücretlerle yeniden hesapla
      migrate: (persisted, version) => {
        const s = (persisted ?? {}) as SellerState;
        if (version < 1 && Array.isArray(s.orders)) {
          const r2 = (n: number) => Math.round(n * 100) / 100;
          const net = (o: Order) => sellerOrderNet(o);
          const toShip = s.orders.filter((o) => o.status === 'paid' || o.status === 'preparing');
          const settled = s.orders.filter((o) => o.status !== 'paid' && o.status !== 'preparing' && o.status !== 'cancelled' && o.status !== 'refunded');
          const paidOut = (s.payouts ?? []).reduce((t, p) => t + p.amount, 0);
          s.pendingBalance = r2(toShip.reduce((t, o) => t + net(o), 0));
          s.balance = Math.max(0, r2(settled.reduce((t, o) => t + net(o), 0) - paidOut));
        }
        return s;
      },
    },
  ),
);
