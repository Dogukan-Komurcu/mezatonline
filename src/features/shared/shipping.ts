/**
 * Alıcı ekranları için kargo teklifi ve metinleri. Hesap lib/pricing.ts quoteShipping'dedir:
 * aynı yayından aynı satıcıya alınanlar tek pakette gider, kargo dahil ilanda ve yayının ücretsiz
 * kargo eşiğini geçen alımlarda alıcıdan kargo alınmaz (etiket bedelini satıcı öder).
 */
import { getShow } from '@/data';
import { formatTRY } from '@/lib/format';
import { packageOf, quoteShipping, type ShippingQuote } from '@/lib/pricing';
import { packageOrders, useOrdersStore } from '@/store/orders';
import type { ID, Order, Product } from '@/types';

export type { ShippingQuote };

type QuoteProduct = Pick<Product, 'sellerId' | 'shippingCost' | 'shippingProfile' | 'shippingIncluded'>;

/** Bu alımda alıcının ödeyeceği kargo (sipariş oluşturmadan önce gösterim için) */
export function shippingQuoteFor(product: QuoteProduct, showId?: ID, itemTotal?: number, orders: Order[] = useOrdersStore.getState().orders): ShippingQuote {
  const bundle = showId ? packageOrders(orders, showId, product.sellerId) : [];
  return quoteShipping(product, { pkg: packageOf(bundle), itemTotal, freeShippingThreshold: getShow(showId)?.freeShippingThreshold });
}

/** Reaktif sürüm: aynı yayından yeni bir sipariş verilince kargo satırı güncellenir */
export function useShippingQuote(product: QuoteProduct | undefined, showId?: ID, itemTotal?: number): ShippingQuote {
  const orders = useOrdersStore((s) => s.orders);
  if (!product) return { buyer: 0, seller: 0 };
  return shippingQuoteFor(product, showId, itemTotal, orders);
}

/** Alıcıya gösterilecek kısa kargo metni: "Kargo: ₺65", "Kargo dahil", "Kargo: ₺0 · aynı pakette" … */
export function shippingText(q: ShippingQuote): string {
  if (q.buyer > 0) return q.note === 'bundled' ? `Kargo: ${formatTRY(q.buyer)} · paket farkı` : `Kargo: ${formatTRY(q.buyer)}`;
  if (q.note === 'included') return 'Kargo dahil';
  if (q.note === 'threshold') return 'Ücretsiz kargo · yayın kampanyası';
  if (q.note === 'bundled') return 'Kargo: ₺0 · aynı pakette';
  return 'Ücretsiz kargo';
}

/** Teklif vermeden önce maliyet notu (hizmet bedeli: lib/pricing.ts buyerServiceFee) */
export function winCostNote(q: ShippingQuote): string {
  return q.buyer > 0 ? 'Kazanırsan: teklif + kargo + %2 Alıcı Koruması bedeli (en az ₺2, en çok ₺49)' : 'Kazanırsan: teklif + %2 Alıcı Koruması bedeli (en az ₺2, en çok ₺49); kargo ücreti alınmaz';
}

/** Yayının ücretsiz kargo eşiği metni (alım başına; küçük alımlar toplanmaz): "₺500 ve üzeri her alımda kargo ücretsiz" */
export function thresholdText(threshold: number): string {
  return `${formatTRY(threshold)} ve üzeri her alımda kargo ücretsiz`;
}
