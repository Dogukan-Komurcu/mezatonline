/**
 * Ortak satın alma akışı: sipariş oluşturur, kredi uygular, bildirim + görev puanı verir.
 * Canlı yayın (kazanma, Hemen Al, flaş indirim, çekiliş) ve checkout ekranı bunu kullanır.
 */
import { getUser } from '@/data';
import { formatTRY } from '@/lib/format';
import { useInboxStore } from '@/store/inbox';
import { useOrdersStore } from '@/store/orders';
import { completeChallenge } from '@/store/rewards';
import { selectDefaultAddress, selectDefaultPayment, useWalletStore } from '@/store/wallet';
import type { Order, OrderSource, Product } from '@/types';

export type PurchaseInput = {
  product: Product;
  /** Birim fiyat (açık artırmada kazanılan tutar, çekilişte 0) */
  price: number;
  source: OrderSource;
  showId?: string;
  quantity?: number;
  /** Mezat kredisini (ürün tutarına kadar) uygula */
  applyCredits?: boolean;
  addressId?: string;
  paymentMethodId?: string;
};

export function completePurchase(input: PurchaseInput): Order {
  const wallet = useWalletStore.getState();
  const address = input.addressId ? wallet.addresses.find((a) => a.id === input.addressId) : selectDefaultAddress(wallet);
  const payment = input.paymentMethodId ? wallet.paymentMethods.find((p) => p.id === input.paymentMethodId) : selectDefaultPayment(wallet);
  const quantity = input.quantity ?? 1;
  const itemTotal = input.price * quantity;
  const creditUsed = input.applyCredits && itemTotal > 0 ? wallet.useCredits(itemTotal, `Sipariş: ${input.product.title}`) : 0;
  const order = useOrdersStore.getState().createOrder({
    product: input.product,
    price: input.price,
    source: input.source,
    showId: input.showId,
    quantity,
    addressId: address?.id,
    paymentMethodId: payment?.id,
    creditUsed,
  });
  const seller = getUser(input.product.sellerId);
  const title =
    input.source === 'auction'
      ? '🎉 Kazandın! Sipariş oluşturuldu'
      : input.source === 'giveaway'
        ? '🎁 Çekilişi kazandın!'
        : '🛍️ Siparişin alındı';
  useInboxStore.getState().pushNotification({
    type: input.source === 'giveaway' ? 'giveaway_won' : 'won',
    title,
    body: `${input.product.title} · ${input.price > 0 ? formatTRY(order.total) : 'Ücretsiz'}${seller ? ` · @${seller.username}` : ''}`,
    image: input.product.images[0],
    href: `/orders/${order.id}`,
  });
  completeChallenge('purchase');
  return order;
}
