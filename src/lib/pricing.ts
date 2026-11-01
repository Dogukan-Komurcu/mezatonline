/**
 * Alıcı ve satıcı ücret hesapları.
 * Fiyatlar KDV dahildir. Alıcıdan küçük bir "Alıcı Koruma" hizmet bedeli alınır.
 * Satıcıdan toplam %8 komisyon kesilir: %5 satış komisyonu + %3 kredi kartı ücreti
 * (sipariş başına ayrıca ₺5 sabit). Ayrı bir ödeme işlem ücreti yoktur.
 */

/** Alıcı Koruma hizmet bedeli: ürün tutarının %2'si, min ₺2, maks ₺49 */
export function buyerServiceFee(itemPrice: number): number {
  if (itemPrice <= 0) return 0;
  return Math.round(Math.min(49, Math.max(2, itemPrice * 0.02)) * 100) / 100;
}

/** Satış komisyonu oranı (ürün bedeli üzerinden) */
export const SELLER_COMMISSION_RATE = 0.05;
/** Kredi kartı ücreti: ürün bedelinin %3'ü + sipariş başına sabit ₺5 */
export const CARD_FEE_RATE = 0.03;
export const CARD_FEE_FIXED = 5;
/** Toplam komisyon oranı (satış komisyonu + kart ücreti; sabit ₺5 hariç) */
export const TOTAL_FEE_RATE = SELLER_COMMISSION_RATE + CARD_FEE_RATE;

/** 0.05 → "%5", 0.035 → "%3,5" */
const pct = (rate: number) => '%' + String(Math.round(rate * 1000) / 10).replace('.', ',');

/** Satıcı ekranlarındaki ücret adları; oranlar değişirse metinler de buradan güncellenir */
export const SELLER_FEE_TEXT = {
  commissionRate: pct(SELLER_COMMISSION_RATE),
  cardFee: `${pct(CARD_FEE_RATE)} + ₺${CARD_FEE_FIXED}`,
  totalRate: pct(TOTAL_FEE_RATE),
  commissionLabel: `Satış komisyonu (${pct(SELLER_COMMISSION_RATE)})`,
  cardFeeLabel: `Kredi kartı ücreti (${pct(CARD_FEE_RATE)} + ₺${CARD_FEE_FIXED})`,
  /** "toplam %8 + sipariş başına ₺5" */
  total: `toplam ${pct(TOTAL_FEE_RATE)} + sipariş başına ₺${CARD_FEE_FIXED}`,
} as const;

/**
 * Satıcı kesintileri (ürün bedeli üzerinden; alıcının ödediği kargo hesaba girmez).
 * Bedelsiz siparişte (ör. çekiliş) kart ücreti alınmaz.
 */
export function sellerFees(itemPrice: number) {
  const commission = Math.round(itemPrice * SELLER_COMMISSION_RATE * 100) / 100;
  const cardFee = itemPrice > 0 ? Math.round((itemPrice * CARD_FEE_RATE + CARD_FEE_FIXED) * 100) / 100 : 0;
  const net = Math.round((itemPrice - commission - cardFee) * 100) / 100;
  return { commission, cardFee, net };
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
