import type { Order, Product, ShippingNote } from '@/types';

/**
 * Alıcı ve satıcı ücret hesapları.
 * Fiyatlar KDV dahildir. Alıcıdan küçük bir "Alıcı Koruma" hizmet bedeli alınır.
 * Satıcıdan toplam %8 komisyon kesilir: %5 satış komisyonu + %3 kredi kartı ücreti
 * (sipariş başına ayrıca ₺5 sabit). Ayrı bir ödeme işlem ücreti yoktur.
 */

const round2 = (n: number) => Math.round(n * 100) / 100;

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

/** Kargo etiketi bedeli: kargo dahil ilanda alıcıdan alınmaz ama satıcı yine öder */
export function labelPrice(p: Pick<Product, 'shippingCost' | 'shippingProfile' | 'shippingIncluded'>): number {
  return p.shippingIncluded ? (SHIPPING_PRICES[p.shippingProfile] ?? 0) : p.shippingCost;
}

/** Aynı yayın paketinde şimdiye kadar: alıcının ödediği kargo ve toplam etiket bedeli */
export type PackageSoFar = { buyerPaid: number; label: number };

/** Bir paketin siparişlerinden PackageSoFar (etiket payı = alıcı + satıcı kısmı) */
export function packageOf(orders: Pick<Order, 'shippingCost' | 'sellerShippingCost'>[]): PackageSoFar | null {
  if (!orders.length) return null;
  const buyerPaid = orders.reduce((t, o) => t + o.shippingCost, 0);
  const label = orders.reduce((t, o) => t + o.shippingCost + (o.sellerShippingCost ?? 0), 0);
  return { buyerPaid: round2(buyerPaid), label: round2(label) };
}

export type ShippingQuote = {
  /** Alıcıdan alınacak kargo */
  buyer: number;
  /** Etiket bedelinin satıcının karşılayacağı kısmı */
  seller: number;
  /** Alıcıdan tam kargo alınmamasının nedeni */
  note?: ShippingNote;
};

/**
 * Bir alımın kargo payı. Aynı yayından aynı satıcıya alınanlar tek pakette gider:
 * paketin etiket bedeli en büyük ürünün etiketidir; alıcı yalnızca "alıcı öder" ürünlerin en yüksek
 * kargo ücretine kadar, o alımın paketi büyüttüğü kadarını öder. Kalan etiket bedelini satıcı karşılar
 * (kargo dahil ilan ya da yayının ücretsiz kargo eşiği).
 */
export function quoteShipping(
  p: Pick<Product, 'shippingCost' | 'shippingProfile' | 'shippingIncluded'>,
  opts: { pkg?: PackageSoFar | null; itemTotal?: number; freeShippingThreshold?: number } = {},
): ShippingQuote {
  const label = labelPrice(p);
  const soFar = opts.pkg ?? { buyerPaid: 0, label: 0 };
  const delta = round2(Math.max(soFar.label, label) - soFar.label);
  const waived: ShippingNote | undefined = p.shippingIncluded
    ? 'included'
    : opts.freeShippingThreshold && (opts.itemTotal ?? 0) >= opts.freeShippingThreshold
      ? 'threshold'
      : undefined;
  const target = waived ? soFar.buyerPaid : Math.max(soFar.buyerPaid, label);
  const buyer = Math.min(delta, Math.max(0, round2(target - soFar.buyerPaid)));
  const seller = round2(delta - buyer);
  const note = waived ?? (opts.pkg && buyer < label ? 'bundled' : undefined);
  return { buyer, seller, note };
}

/** Satıcının siparişten net kazancı: komisyon ve kart ücreti + karşıladığı kargo düşülür */
export function sellerOrderNet(o: Pick<Order, 'itemPrice' | 'quantity' | 'sellerShippingCost'>): number {
  return round2(sellerFees(o.itemPrice * o.quantity).net - (o.sellerShippingCost ?? 0));
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
