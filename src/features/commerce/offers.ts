/**
 * Fiyat önerisi (Make Offer) simülasyonu.
 * Satıcı 4–8 sn içinde yanıt verir: %50 kabul (sipariş otomatik oluşur), %30 karşı teklif, %20 ret.
 * Zamanlayıcı modül seviyesindedir: kullanıcı ekrandan ayrılsa bile yanıt gelir.
 */
import { toast } from '@/components/ui';
import { getUser } from '@/data';
import { useActivityExtras } from '@/features/activity/store';
import { completePurchase } from '@/features/shared/purchase';
import { formatTRY } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { random } from '@/lib/rng';
import { useInboxStore } from '@/store/inbox';
import { useOrdersStore } from '@/store/orders';
import type { Offer, Product } from '@/types';

import { roundNice } from './utils';

/** Asgari öneri: satış fiyatının %50'si */
export function minOfferFor(price: number): number {
  return Math.max(1, Math.ceil(price * 0.5));
}

/** Karşı teklif tutarı: önerinle satış fiyatının arasında bir yer */
export function counterAmountFor(offer: number, price: number): number {
  const mid = offer + (price - offer) * random.float(0.4, 0.65);
  return Math.min(price - 1, Math.max(offer + 1, roundNice(mid)));
}

export function submitOffer(product: Product, amount: number): Offer {
  const offer = useOrdersStore.getState().makeOffer(product.id, amount);
  const delay = random.int(4000, 8000);
  setTimeout(() => resolveSimulated(offer.id, product, amount), delay);
  return offer;
}

function resolveSimulated(offerId: string, product: Product, amount: number) {
  const current = useOrdersStore.getState().offers.find((o) => o.id === offerId);
  if (!current || current.status !== 'pending' || useActivityExtras.getState().withdrawnOfferIds.includes(offerId)) return;
  const seller = getUser(product.sellerId);
  const sellerName = seller ? `@${seller.username}` : 'Satıcı';
  const roll = Math.random();
  const inbox = useInboxStore.getState();

  if (roll < 0.5) {
    useOrdersStore.getState().resolveOffer(offerId, 'accepted');
    const order = completePurchase({ product, price: amount, source: 'offer', showId: product.showId });
    inbox.pushNotification({
      type: 'offer',
      title: `🎉 ${sellerName} ${formatTRY(amount)} önerini kabul etti`,
      body: `${product.title} · Sipariş ${order.number} oluşturuldu, kayıtlı kartından ödeme alındı.`,
      image: product.images[0],
      actorId: product.sellerId,
      href: `/orders/${order.id}`,
    });
    haptic.success();
    toast.success(`${sellerName} önerini kabul etti! Siparişin oluşturuldu 🎉`, 'checkmark-circle');
    return;
  }

  if (roll < 0.8) {
    const counter = counterAmountFor(amount, product.price);
    useOrdersStore.getState().resolveOffer(offerId, 'countered', counter);
    inbox.pushNotification({
      type: 'offer',
      title: `💬 ${sellerName} karşı teklif verdi: ${formatTRY(counter)}`,
      body: `${product.title} için ${formatTRY(amount)} önerine karşılık. 24 saat içinde yanıtla.`,
      image: product.images[0],
      actorId: product.sellerId,
      href: `/product/${product.id}`,
    });
    haptic.medium();
    toast(`${sellerName} ${formatTRY(counter)} karşı teklif verdi`, 'chatbubble-ellipses');
    return;
  }

  useOrdersStore.getState().resolveOffer(offerId, 'declined');
  inbox.pushNotification({
    type: 'offer',
    title: `${sellerName} önerini reddetti`,
    body: `${product.title} için ${formatTRY(amount)} önerin kabul edilmedi. Yeni bir öneri yapabilir ya da hemen alabilirsin.`,
    image: product.images[0],
    actorId: product.sellerId,
    href: `/product/${product.id}`,
  });
  haptic.warning();
  toast.warning(`${sellerName} önerini reddetti`, 'close-circle');
}

/** Karşı teklifi reddet */
export function declineCounter(offer: Offer) {
  useOrdersStore.getState().resolveOffer(offer.id, 'declined', offer.counterAmount);
}
