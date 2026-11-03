/**
 * Mezatonline alan modelleri.
 * Şu an mock veriyle çalışır; Supabase'e geçişte tablo şemaları bu tiplerden türetilecek.
 * Tüm tarih alanları ISO-8601 string, tüm para alanları TL (₺) cinsinden number'dır.
 */

export type ID = string;

// ─── Kategori ────────────────────────────────────────────────────────────────

export interface Subcategory {
  id: ID;
  categoryId: ID;
  name: string;
  image: string;
  viewers: number;
}

export interface Category {
  id: ID;
  name: string;
  /** Kısa ad (çip / sekme için) */
  shortName: string;
  emoji: string;
  image: string;
  /** Kategori kutucuğu arka plan rengi */
  tint: string;
  viewers: number;
  subcategories: Subcategory[];
}

// ─── Kullanıcı ───────────────────────────────────────────────────────────────

export type UserBadge = 'top_seller' | 'verified' | 'fast_shipper' | 'new_seller' | 'partner';

export interface User {
  id: ID;
  username: string;
  displayName: string;
  avatar: string;
  bio: string;
  city: string;
  isSeller: boolean;
  badges: UserBadge[];
  /** 0-5 arası satıcı puanı */
  rating: number;
  reviewCount: number;
  followers: number;
  following: number;
  itemsSold: number;
  /** Ortalama kargoya verme süresi (gün) */
  avgShipDays: number;
  joinedAt: string;
  /** Satıcının ana kategorileri */
  categoryIds: ID[];
  /** Profil kapak görseli */
  cover?: string;
}

// ─── Ürün / İlan ─────────────────────────────────────────────────────────────

export type ListingFormat = 'auction' | 'buy_now' | 'giveaway';

export type Condition = 'new' | 'like_new' | 'very_good' | 'good' | 'fair' | 'graded';

export type ShippingProfile = 'small' | 'medium' | 'large' | 'xlarge';

/** Orijinallik belgesi türü (bkz. features/trust/counterfeit.ts PROOF_KINDS) */
export type ProofKind = 'invoice' | 'receipt' | 'certificate' | 'dealer';

/**
 * Satıcının riskli kategoride / marka geçen ilanda yüklediği orijinallik belgesi.
 * Alıcılara gösterilmez; hak sahibi şikâyetinde itiraz dayanağıdır (ETAHS Yönetmeliği md. 13/1-c).
 */
export interface AuthenticityProof {
  kind: ProofKind;
  /** Belge görselleri (yerel URI) ya da demo örnek belgeleri ("sample:<ad>") */
  docs: string[];
  /** Satıcının "orijinaldir" beyanını onayladığı an */
  declaredAt: string;
}

export interface Product {
  id: ID;
  sellerId: ID;
  title: string;
  description: string;
  images: string[];
  categoryId: ID;
  subcategoryId?: ID;
  condition: Condition;
  /** Derecelendirilmiş kartlar için: "PSA 10" vb. */
  grade?: string;
  format: ListingFormat;
  /** Hemen Al fiyatı ya da açık artırma başlangıç fiyatı */
  price: number;
  /** İndirim öncesi fiyat (flaş indirim / indirimli ürün) */
  compareAtPrice?: number;
  quantity: number;
  sold: number;
  shippingProfile: ShippingProfile;
  /** Alıcının ödeyeceği kargo ücreti (kargo dahil ilanda 0) */
  shippingCost: number;
  /** Kargo dahil: gönderim bedelini satıcı karşılar, alıcıdan kargo ücreti alınmaz */
  shippingIncluded?: boolean;
  /** Sudden death: son teklifle süre uzamaz */
  suddenDeath: boolean;
  /** Teklif (pazarlık) kabul ediyor mu — mağaza ilanları için */
  acceptsOffers: boolean;
  /** Bu ürünün listelendiği yayın (varsa) */
  showId?: ID;
  createdAt: string;
  saves: number;
  tags: string[];
  /** Orijinallik belgesi (riskli kategori / marka geçen ilanlarda zorunlu) */
  authenticity?: AuthenticityProof;
}

// ─── Yayın ───────────────────────────────────────────────────────────────────

export type ShowStatus = 'live' | 'scheduled' | 'ended';

export interface Show {
  id: ID;
  sellerId: ID;
  title: string;
  description: string;
  coverImage: string;
  /** Canlı yayın videosu (mock: döngülü mp4). Yoksa kapak görseli Ken Burns efektiyle oynatılır. */
  videoUrl?: string;
  categoryId: ID;
  subcategoryId?: ID;
  tags: string[];
  status: ShowStatus;
  viewers: number;
  scheduledAt: string;
  startedAt?: string;
  endedAt?: string;
  productIds: ID[];
  /** Yayın boyunca kargo bir kez ödenir; bu yayının kargo ücreti */
  shippingCost: number;
  freeShippingThreshold?: number;
  giveawayCount: number;
  /** Hatırlatıcı kuran / kaydeden kişi sayısı */
  savedCount: number;
  /** Yayının öne çıkan rozetleri: "Çekiliş", "₺1 Başlangıç", "Ücretsiz Kargo" vb. */
  highlights: string[];
  isFeatured: boolean;
}

// ─── Sohbet / Canlı olaylar ──────────────────────────────────────────────────

export type ChatMessageType =
  | 'chat'
  | 'join'
  | 'bid'
  | 'won'
  | 'purchase'
  | 'giveaway_entry'
  | 'giveaway_won'
  | 'tip'
  | 'follow'
  | 'system';

export interface ChatMessage {
  id: ID;
  type: ChatMessageType;
  userId?: ID;
  username: string;
  avatar?: string;
  text: string;
  amount?: number;
  isSeller?: boolean;
  isMod?: boolean;
  isMe?: boolean;
  createdAt: number;
}

// ─── Değerlendirme ───────────────────────────────────────────────────────────

export interface Review {
  id: ID;
  sellerId: ID;
  buyerId: ID;
  rating: number;
  text: string;
  productTitle: string;
  productImage?: string;
  /** Alt puanlar: kargo hızı, ürün açıklamaya uygunluk, iletişim */
  shipping: number;
  accuracy: number;
  communication: number;
  createdAt: string;
}

// ─── Adres & Ödeme ───────────────────────────────────────────────────────────

export interface Address {
  id: ID;
  /** "Ev", "İş" vb. */
  title: string;
  fullName: string;
  phone: string;
  city: string;
  district: string;
  neighborhood: string;
  line: string;
  postalCode: string;
  isDefault: boolean;
}

export type CardBrand = 'visa' | 'mastercard' | 'troy' | 'amex';

export interface PaymentMethod {
  id: ID;
  brand: CardBrand;
  last4: string;
  holder: string;
  /** "MM/YY" */
  expiry: string;
  bank: string;
  isDefault: boolean;
}

// ─── Sipariş ─────────────────────────────────────────────────────────────────

export type Carrier =
  | 'Yurtiçi Kargo'
  | 'Aras Kargo'
  | 'MNG Kargo'
  | 'PTT Kargo'
  | 'Sürat Kargo'
  | 'HepsiJet'
  | 'Trendyol Express';

export type OrderStatus =
  | 'paid'
  | 'preparing'
  | 'shipped'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'
  | 'return_requested'
  | 'refunded';

export type OrderSource = 'auction' | 'buy_now' | 'giveaway' | 'offer' | 'flash_sale';

export interface OrderEvent {
  status: OrderStatus;
  at: string;
  note?: string;
}

/** bundled: aynı yayın paketine eklendi · included: kargo dahil ilan · threshold: yayının ücretsiz kargo eşiği */
export type ShippingNote = 'bundled' | 'included' | 'threshold';

export interface Order {
  id: ID;
  /** Kısa sipariş no, ör. "MZ-48213" */
  number: string;
  buyerId: ID;
  sellerId: ID;
  productId: ID;
  productTitle: string;
  productImage: string;
  quantity: number;
  source: OrderSource;
  /** Sipariş bir fiyat önerisinden geldiyse o öneri */
  offerId?: ID;
  showId?: ID;
  itemPrice: number;
  /** Alıcının ödediği kargo ücreti */
  shippingCost: number;
  /**
   * Bu siparişte kargo etiketinin satıcının karşıladığı kısmı (kargo dahil ilan, ücretsiz kargo eşiği
   * ya da pakette alıcıdan alınmayan fark). Etiket payı = shippingCost + sellerShippingCost.
   */
  sellerShippingCost?: number;
  /** Alıcıdan kargo ücreti (tamamı ya da bir kısmı) neden alınmadı */
  shippingNote?: ShippingNote;
  /** Alıcı hizmet bedeli */
  serviceFee: number;
  /** Kullanılan Mezat kredisi (indirim) */
  creditUsed: number;
  total: number;
  status: OrderStatus;
  carrier?: Carrier;
  trackingNumber?: string;
  addressId?: ID;
  paymentMethodId?: ID;
  timeline: OrderEvent[];
  createdAt: string;
  reviewed: boolean;
}

// ─── Bildirim & Mesaj ────────────────────────────────────────────────────────

export type NotificationType =
  | 'show_live'
  | 'show_reminder'
  | 'outbid'
  | 'won'
  | 'giveaway_won'
  | 'order_shipped'
  | 'order_delivered'
  | 'new_follower'
  | 'review'
  | 'price_drop'
  | 'offer'
  | 'promo'
  | 'payout'
  /** Kural / hak ihlali bildirimi (ör. ilan hak sahibi şikâyetiyle kaldırıldı) */
  | 'policy';

export interface AppNotification {
  id: ID;
  type: NotificationType;
  title: string;
  body: string;
  image?: string;
  actorId?: ID;
  /** Dokununca gidilecek expo-router yolu */
  href?: string;
  createdAt: string;
  read: boolean;
}

export interface DirectMessage {
  id: ID;
  fromMe: boolean;
  text: string;
  image?: string;
  createdAt: string;
}

export interface Conversation {
  id: ID;
  userId: ID;
  messages: DirectMessage[];
  unread: number;
  /** İlgili sipariş (varsa) */
  orderId?: ID;
}

// ─── Satıcı ──────────────────────────────────────────────────────────────────

export type PayoutStatus = 'pending' | 'processing' | 'paid';

export interface Payout {
  id: ID;
  amount: number;
  status: PayoutStatus;
  iban: string;
  createdAt: string;
  orderCount: number;
}

export interface SellerApplication {
  status: 'none' | 'pending' | 'approved';
  categoryId?: ID;
  experience?: string;
  monthlyVolume?: string;
  storeName?: string;
  iban?: string;
  taxType?: 'individual' | 'sole_proprietor' | 'company';
  submittedAt?: string;
}

// ─── Teklif (pazarlık) ───────────────────────────────────────────────────────

export interface Offer {
  id: ID;
  productId: ID;
  amount: number;
  status: 'pending' | 'accepted' | 'declined' | 'countered';
  counterAmount?: number;
  /** Karşı teklifin yapıldığı an: 24 saatlik süre buradan işler */
  counteredAt?: string;
  createdAt: string;
}
