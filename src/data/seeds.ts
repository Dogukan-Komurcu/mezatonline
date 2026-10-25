/**
 * Kullanıcıya ait başlangıç verileri (geçmiş siparişler, bildirimler, mesajlar).
 * Store'lar ilk açılışta bunlarla doldurulur.
 */
import { createRng } from '@/lib/rng';
import { buyerServiceFee } from '@/lib/pricing';
import type { AppNotification, Carrier, Conversation, Order, OrderEvent, OrderStatus, Payout, Product } from '@/types';

import { BUYER_USERS, PRODUCTS, SELLER_USERS, SHOWS } from './mock';

const rng = createRng(777);
const NOW = Date.now();
const HOUR = 3_600_000;
const DAY = 24 * HOUR;

export const CARRIERS: Carrier[] = ['Yurtiçi Kargo', 'Aras Kargo', 'MNG Kargo', 'PTT Kargo', 'Sürat Kargo', 'HepsiJet', 'Trendyol Express'];

export function trackingNumber(): string {
  return String(Math.floor(1e11 + Math.random() * 9e11));
}

const STATUS_FLOW: OrderStatus[] = ['paid', 'preparing', 'shipped', 'out_for_delivery', 'delivered'];

function timelineUntil(status: OrderStatus, createdAt: number): OrderEvent[] {
  const idx = STATUS_FLOW.indexOf(status);
  const gaps = [0, 3 * HOUR, 20 * HOUR, 44 * HOUR, 52 * HOUR];
  return STATUS_FLOW.slice(0, idx + 1).map((s, i) => ({ status: s, at: new Date(createdAt + gaps[i]).toISOString() }));
}

let orderSeq = 48200;
export function orderNumber(): string {
  orderSeq += rng.int(1, 37);
  return `MZ-${orderSeq}`;
}

function seedOrder(product: Product, status: OrderStatus, daysAgo: number, buyerId: string, source: Order['source']): Order {
  const createdAt = NOW - daysAgo * DAY - rng.int(0, 8) * HOUR;
  const itemPrice = source === 'giveaway' ? 0 : product.format === 'auction' ? Math.round((product.compareAtPrice ?? product.price) * rng.float(0.6, 1.1)) : product.price;
  const shippingCost = product.shippingCost;
  const serviceFee = buyerServiceFee(itemPrice);
  const shipped = STATUS_FLOW.indexOf(status) >= 2;
  return {
    id: `o_seed_${product.id}`,
    number: orderNumber(),
    buyerId,
    sellerId: product.sellerId,
    productId: product.id,
    productTitle: product.title,
    productImage: product.images[0],
    quantity: 1,
    source,
    showId: product.showId,
    itemPrice,
    shippingCost,
    serviceFee,
    creditUsed: 0,
    total: Math.round((itemPrice + shippingCost + serviceFee) * 100) / 100,
    status,
    carrier: shipped ? rng.pick(CARRIERS) : undefined,
    trackingNumber: shipped ? trackingNumber() : undefined,
    timeline: timelineUntil(status, createdAt),
    createdAt: new Date(createdAt).toISOString(),
    reviewed: status === 'delivered' && rng.chance(0.5),
  };
}

const endedProducts = PRODUCTS.filter((p) => {
  const show = SHOWS.find((s) => s.id === p.showId);
  return show?.status === 'ended';
});

/** Kullanıcının geçmiş alışverişleri */
export const SEED_ORDERS: Order[] = [
  seedOrder(endedProducts[3], 'shipped', 2, 'me', 'auction'),
  seedOrder(endedProducts[17], 'delivered', 9, 'me', 'auction'),
  seedOrder(endedProducts[40], 'delivered', 16, 'me', 'buy_now'),
  seedOrder(endedProducts[61], 'preparing', 0.4, 'me', 'giveaway'),
].filter((o) => !!o.productId);

/** Satıcı paneli için örnek gelen siparişler (kullanıcı satıcı olunca kullanılır) */
export function makeSellerOrders(myProducts: Product[]): Order[] {
  return myProducts.slice(0, 6).map((p, i) => {
    const status: OrderStatus = i < 3 ? 'paid' : i < 5 ? 'shipped' : 'delivered';
    const o = seedOrder(p, status, i * 0.7, rng.pick(BUYER_USERS).id, p.format === 'auction' ? 'auction' : 'buy_now');
    return { ...o, id: `so_${p.id}`, sellerId: 'me' };
  });
}

export const SEED_PAYOUTS: Payout[] = [];

const ago = (h: number) => new Date(NOW - h * HOUR).toISOString();

const liveShows = SHOWS.filter((s) => s.status === 'live');
const upcoming = SHOWS.filter((s) => s.status === 'scheduled');
const seller = (id: string) => SELLER_USERS.find((u) => u.id === id)!;

export const SEED_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'n1', type: 'show_live', title: `${seller(liveShows[0].sellerId).username} canlı yayında 🔴`, body: liveShows[0].title,
    image: seller(liveShows[0].sellerId).avatar, actorId: liveShows[0].sellerId, href: `/live/${liveShows[0].id}`, createdAt: ago(0.1), read: false,
  },
  {
    id: 'n2', type: 'show_live', title: `${seller(liveShows[2].sellerId).username} canlı yayında 🔴`, body: liveShows[2].title,
    image: seller(liveShows[2].sellerId).avatar, actorId: liveShows[2].sellerId, href: `/live/${liveShows[2].id}`, createdAt: ago(0.6), read: false,
  },
  {
    id: 'n3', type: 'order_shipped', title: 'Siparişin kargoya verildi 📦', body: `${SEED_ORDERS[0]?.productTitle ?? 'Ürün'} — ${SEED_ORDERS[0]?.carrier ?? 'Yurtiçi Kargo'} ile yolda.`,
    image: SEED_ORDERS[0]?.productImage, href: SEED_ORDERS[0] ? `/orders/${SEED_ORDERS[0].id}` : undefined, createdAt: ago(5), read: false,
  },
  {
    id: 'n4', type: 'show_reminder', title: 'Hatırlatma: yayın yakında başlıyor ⏰', body: upcoming[0]?.title ?? '',
    image: upcoming[0] ? seller(upcoming[0].sellerId).avatar : undefined, href: upcoming[0] ? `/show/${upcoming[0].id}` : undefined, createdAt: ago(8), read: true,
  },
  {
    id: 'n5', type: 'promo', title: '₺150 hoş geldin kredin hesabında 🎉', body: 'İlk alışverişinde otomatik olarak kullanılabilir.',
    href: '/wallet', createdAt: ago(20), read: true,
  },
  {
    id: 'n6', type: 'price_drop', title: 'Kaydettiğin ürünün fiyatı düştü 📉', body: `${PRODUCTS[120]?.title ?? 'Ürün'} artık daha uygun!`,
    image: PRODUCTS[120]?.images[0], href: PRODUCTS[120] ? `/product/${PRODUCTS[120].id}` : undefined, createdAt: ago(30), read: true,
  },
  {
    id: 'n7', type: 'order_delivered', title: 'Siparişin teslim edildi ✅', body: 'Satıcıyı değerlendirmeyi unutma!',
    image: SEED_ORDERS[1]?.productImage, href: SEED_ORDERS[1] ? `/orders/${SEED_ORDERS[1].id}` : undefined, createdAt: ago(60), read: true,
  },
];

export const SEED_CONVERSATIONS: Conversation[] = [
  {
    id: 'c1',
    userId: SEED_ORDERS[0]?.sellerId ?? 'u1',
    unread: 1,
    orderId: SEED_ORDERS[0]?.id,
    messages: [
      { id: 'c1m1', fromMe: false, text: 'Merhaba! Siparişin için teşekkürler 🙏', createdAt: ago(30) },
      { id: 'c1m2', fromMe: true, text: 'Ne zaman kargolanır acaba?', createdAt: ago(29) },
      { id: 'c1m3', fromMe: false, text: 'Bugün kargoya verdim, takip numarası sipariş detayında 📦', createdAt: ago(5) },
    ],
  },
  {
    id: 'c2',
    userId: 'u3',
    unread: 0,
    messages: [
      { id: 'c2m1', fromMe: true, text: 'Merhaba, Jordan 4 Black Cat 43 numara gelecek mi?', createdAt: ago(50) },
      { id: 'c2m2', fromMe: false, text: 'Selam! Cuma akşamki yayında olacak, hatırlatıcı kurmayı unutma 👟', createdAt: ago(48) },
    ],
  },
  {
    id: 'c3',
    userId: 'u7',
    unread: 0,
    messages: [{ id: 'c3m1', fromMe: false, text: 'Kilimin ölçülerini sormuştun: 120x180 cm, el dokuma yün 🧶', createdAt: ago(120) }],
  },
];

/** Otomatik cevap havuzu (mesajlaşma simülasyonu) */
export const AUTO_REPLIES = [
  'Merhaba! Hemen bakıp dönüyorum 🙏',
  'Tabii, bir sonraki yayında gösterebilirim.',
  'Evet, ürün orijinal ve faturalı ✅',
  'Kargo genelde 24 saat içinde çıkıyor 📦',
  'Teşekkürler, iyi günler! 💛',
  'Fotoğrafını atıyorum birazdan.',
  'Bu akşam 21:00’de canlıdayım, bekliyorum!',
];
