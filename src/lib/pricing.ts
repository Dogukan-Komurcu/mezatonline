/**
 * Alıcı ve satıcı ücret hesapları.
 * Fiyatlar KDV dahildir. Alıcıdan küçük bir "Alıcı Koruma" hizmet bedeli alınır,
 * satıcıdan komisyon + ödeme işlem ücreti kesilir.
 */

/** Alıcı Koruma hizmet bedeli: ürün tutarının %2'si, min ₺2, maks ₺49 */
export function buyerServiceFee(itemPrice: number): number {
  if (itemPrice <= 0) return 0;
  return Math.round(Math.min(49, Math.max(2, itemPrice * 0.02)) * 100) / 100;
}

/** Satıcı komisyon oranı (ürün bedeli üzerinden) */
export const SELLER_COMMISSION_RATE = 0.08;
/** Ödeme işlem ücreti oranı (toplam tutar üzerinden) + sabit */
export const PAYMENT_PROCESSING_RATE = 0.029;
export const PAYMENT_PROCESSING_FIXED = 0.3 * 10; // ₺3

export function sellerFees(itemPrice: number, shippingCost: number) {
  const commission = Math.round(itemPrice * SELLER_COMMISSION_RATE * 100) / 100;
  const processing = Math.round(((itemPrice + shippingCost) * PAYMENT_PROCESSING_RATE + PAYMENT_PROCESSING_FIXED) * 100) / 100;
  const net = Math.round((itemPrice - commission - processing) * 100) / 100;
  return { commission, processing, net };
}

/** Kargo profili → alıcı kargo ücreti (₺, KDV dahil, desi bazlı) */
export const SHIPPING_PRICES = {
  small: 65,
  medium: 89,
  large: 129,
  xlarge: 199,
} as const;

export const SHIPPING_PROFILE_LABELS = {
  small: 'Küçük paket (1 desi) — kart, takı, aksesuar',
  medium: 'Orta paket (5 desi) — ayakkabı, giyim, oyuncak',
  large: 'Koli (10 desi) — elektronik, dekor',
  xlarge: 'Büyük koli (20 desi) — halı, mobilya',
} as const;

/** Aynı yayında sonraki ürünler aynı pakete eklenir: kargo farkı */
export function bundledShipping(previousMax: number, current: number): number {
  return Math.max(0, Math.round((current - previousMax) * 100) / 100);
}

export type CheckoutBreakdown = {
  itemPrice: number;
  shippingCost: number;
  serviceFee: number;
  creditUsed: number;
  total: number;
};

export function checkoutBreakdown(itemPrice: number, shippingCost: number, availableCredits = 0, applyCredits = false): CheckoutBreakdown {
  const serviceFee = buyerServiceFee(itemPrice);
  const subtotal = itemPrice + shippingCost + serviceFee;
  const creditUsed = applyCredits ? Math.min(availableCredits, itemPrice) : 0;
  const total = Math.round((subtotal - creditUsed) * 100) / 100;
  return { itemPrice, shippingCost, serviceFee, creditUsed, total };
}
