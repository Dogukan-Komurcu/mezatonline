/**
 * Mock satıcı davranışı: yanıt bekleyen fiyat önerilerine bir süre sonra satıcı adına
 * cevap verir (karşı teklif / kabul / ret) ve bildirim düşer. Supabase'e geçince bu,
 * satıcının gerçek yanıtıyla (realtime) değişecek.
 */
import { useEffect } from 'react';

import { getProduct, getUser } from '@/data';
import { remainingStock } from '@/features/commerce/hooks';
import { isOfferExpired } from '@/features/commerce/offers';
import { bidIncrement } from '@/lib/auction';
import { formatTRY } from '@/lib/format';
import { useInboxStore } from '@/store/inbox';
import { useOrdersStore } from '@/store/orders';
import { completePurchase } from '@/features/shared/purchase';

import { useActivityExtras } from './store';
import { hashString } from './utils';

/** Önerinin satıcıya ulaşıp yanıtlanması için geçen süre (ms) */
const RESPONSE_AFTER_MS = 45_000;

function roundToStep(value: number): number {
  const step = bidIncrement(value);
  return Math.max(step, Math.round(value / step) * step);
}

function respondToPendingOffers() {
  const { offers, resolveOffer } = useOrdersStore.getState();
  const withdrawn = useActivityExtras.getState().withdrawnOfferIds;
  const now = Date.now();
  offers.forEach((offer) => {
    if (offer.status !== 'pending' || withdrawn.includes(offer.id) || isOfferExpired(offer, now)) return;
    if (now - Date.parse(offer.createdAt) < RESPONSE_AFTER_MS) return;
    const product = getProduct(offer.productId);
    const seller = getUser(product?.sellerId);
    const listPrice = product?.price ?? offer.amount;
    const roll = hashString(offer.id) % 100;
    const push = useInboxStore.getState().pushNotification;
    const inStock = !!product && remainingStock(product, useOrdersStore.getState().orders) > 0;
    if (inStock && product && (offer.amount >= listPrice * 0.92 || (roll < 30 && offer.amount >= listPrice * 0.75))) {
      // Whatnot: satıcı kabul edince kayıtlı karttan otomatik ödeme alınır ve sipariş oluşur
      resolveOffer(offer.id, 'accepted');
      const order = completePurchase({ product, price: offer.amount, source: 'offer', offerId: offer.id, showId: product.showId });
      useInboxStore.setState((st) => ({ notifications: st.notifications.filter((n) => n.href !== `/orders/${order.id}`) }));
      push({
        type: 'offer',
        title: '✅ Fiyat önerin kabul edildi',
        body: `${product.title} · ${formatTRY(order.total)} kayıtlı kartından çekildi, siparişin oluşturuldu.`,
        image: product.images[0],
        actorId: seller?.id,
        href: `/orders/${order.id}`,
      });
    } else if (inStock && roll < 80) {
      const counter = Math.min(listPrice, Math.max(offer.amount + bidIncrement(offer.amount), roundToStep((offer.amount + listPrice) / 2)));
      resolveOffer(offer.id, 'countered', counter);
      push({
        type: 'offer',
        title: `🔁 ${seller ? `@${seller.username}` : 'Satıcı'} karşı teklif yaptı`,
        body: `${product?.title ?? 'Ürün'} için ${formatTRY(counter)} öneriyor. 24 saat içinde yanıtla.`,
        image: product?.images[0],
        actorId: seller?.id,
        href: '/activity?tab=offers',
      });
    } else {
      resolveOffer(offer.id, 'declined');
      push({
        type: 'offer',
        title: inStock ? 'Fiyat önerin reddedildi' : 'Ürün tükendi, önerin kabul edilemedi',
        body: `${product?.title ?? 'Ürün'} · ${inStock ? 'Yeni bir fiyat önerebilirsin.' : 'Kartından ödeme alınmadı.'}`,
        image: product?.images[0],
        actorId: seller?.id,
        href: '/activity?tab=offers',
      });
    }
  });
}

export function useActivitySimulation() {
  useEffect(() => {
    respondToPendingOffers();
    const t = setInterval(respondToPendingOffers, 5_000);
    return () => clearInterval(t);
  }, []);
}
