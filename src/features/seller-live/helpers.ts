/**
 * Satıcı canlı yayın konsolu — yardımcı fonksiyonlar ve ortak tipler.
 */
import { useEffect, useState } from 'react';
import { Dimensions, Keyboard, Platform, type KeyboardEvent } from 'react-native';

import { getProductsByCategory, getProductsByShow, getMarketplaceProducts } from '@/data';
import { SHIPPING_PRICES } from '@/lib/pricing';
import { uid } from '@/lib/rng';
import { ME_ID, useAuthStore } from '@/store/auth';
import { useSellerStore, type NewListingInput } from '@/store/seller';
import type { ChatMessage, Product, Show } from '@/types';

import type { SoldItem } from '@/features/live/engine';

function pad2(n: number): string {
  return n < 10 ? '0' + n : String(n);
}

/** Yayın süresi: 754 → "00:12:34" */
export function formatElapsed(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  return `${pad2(Math.floor(s / 3600))}:${pad2(Math.floor((s % 3600) / 60))}:${pad2(s % 60)}`;
}

/** Lot sayacı: 29.4 → "00:30", 125 → "02:05" */
export function formatTimer(totalSeconds: number): string {
  const s = Math.max(0, Math.ceil(totalSeconds));
  return `${pad2(Math.floor(s / 60))}:${pad2(s % 60)}`;
}

/** Süreyi okunur yaz: 3725 → "1 sa 2 dk", 95 → "1 dk 35 sn" */
export function formatDurationLong(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return m > 0 ? `${h} sa ${m} dk` : `${h} sa`;
  if (m > 0) return sec > 0 ? `${m} dk ${sec} sn` : `${m} dk`;
  return `${sec} sn`;
}

/** Belirli aralıklarla güncellenen "şu an" (ms) */
export function useNow(intervalMs = 1000, enabled = true): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!enabled) return;
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs, enabled]);
  return now;
}

/**
 * Klavye yüksekliği (kapalıyken 0). iOS'ta öneri şeridi klavye açıldıktan sonra eklenebildiği için
 * çerçeve değişimleri de dinlenir ve yükseklik ekranın altından klavyenin üst kenarına göre hesaplanır.
 */
export function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0);
  useEffect(() => {
    const fromEvent = (e: KeyboardEvent) => Math.max(0, Math.round(Dimensions.get('window').height - e.endCoordinates.screenY));
    const subs =
      Platform.OS === 'ios'
        ? [
            Keyboard.addListener('keyboardWillShow', (e) => setHeight(fromEvent(e))),
            Keyboard.addListener('keyboardWillChangeFrame', (e) => setHeight(fromEvent(e))),
            Keyboard.addListener('keyboardDidShow', (e) => setHeight(fromEvent(e))),
            Keyboard.addListener('keyboardWillHide', () => setHeight(0)),
          ]
        : [Keyboard.addListener('keyboardDidShow', (e) => setHeight(e.endCoordinates.height)), Keyboard.addListener('keyboardDidHide', () => setHeight(0))];
    return () => subs.forEach((s) => s.remove());
  }, []);
  return height;
}

/** Satıcı mı? (başvurusu onaylanmış ya da profil satıcı olarak işaretli) */
export function useIsSeller(): boolean {
  const isSeller = useAuthStore((s) => s.me.isSeller);
  const approved = useSellerStore((s) => s.application.status === 'approved');
  return isSeller || approved;
}

/** Ürünün kalan adedi */
export function remainingOf(p: Product, extraSold = 0): number {
  return Math.max(0, p.quantity - p.sold - extraSold);
}

/** Yayının ürün kimlikleri: önce yayına bağlı ilanlar, yoksa tüm aktif ilanlar */
export function resolveShowProductIds(show: Show, listings: Product[]): string[] {
  const linked = listings.filter((p) => p.showId === show.id || show.productIds.includes(p.id));
  if (linked.length) return linked.map((p) => p.id);
  return listings.filter((p) => p.sold < p.quantity).map((p) => p.id);
}

/** Prova modunda ilanı olmayan satıcı için demo ürünler (kaydedilmez) */
export function demoProducts(categoryId: string): Product[] {
  const fromCategory = getProductsByCategory(categoryId).slice(0, 10);
  const list = fromCategory.length >= 4 ? fromCategory : [...fromCategory, ...getMarketplaceProducts().slice(0, 8)];
  return list.map((p) => ({ ...p, id: 'demo_' + p.id, sellerId: ME_ID, sold: 0 }));
}

/** Boş mağaza için kategoriye uygun örnek ilan girdileri (envantere kaydedilir) */
export function sampleListingInputs(categoryId: string, showId: string, count = 6): NewListingInput[] {
  const fromCategory = getProductsByCategory(categoryId);
  // Açık artırma ve Hemen Al karışık olsun
  const auctions = fromCategory.filter((p) => p.format === 'auction').slice(0, Math.ceil(count / 2));
  const bins = fromCategory.filter((p) => p.format === 'buy_now').slice(0, count - auctions.length);
  let picked = [...auctions, ...bins];
  if (picked.length < count)
    picked = [
      ...picked,
      ...getMarketplaceProducts()
        .filter((p) => !picked.includes(p))
        .slice(0, count - picked.length),
    ];
  return picked.map((p) => ({
    title: p.title,
    description: p.description,
    images: p.images,
    categoryId: p.categoryId,
    subcategoryId: p.subcategoryId,
    condition: p.condition,
    grade: p.grade,
    format: p.format,
    price: p.price,
    compareAtPrice: p.compareAtPrice,
    quantity: Math.max(1, p.quantity - p.sold),
    shippingProfile: p.shippingProfile,
    shippingCost: p.shippingCost,
    suddenDeath: p.suddenDeath,
    acceptsOffers: p.acceptsOffers,
    showId,
    tags: p.tags,
  }));
}

/** Veri katmanındaki (mock) yayın ürünleri */
export function dataShowProducts(showId: string): Product[] {
  return getProductsByShow(showId);
}

/** "Sürpriz hediye" çekiliş ödülü */
export function makeSurprisePrize(show: Show): Product {
  return {
    id: uid('gift'),
    sellerId: ME_ID,
    title: '🎁 Sürpriz Hediye',
    description: 'Satıcının seçtiği sürpriz hediye paketi.',
    images: [show.coverImage],
    categoryId: show.categoryId,
    condition: 'new',
    format: 'giveaway',
    price: 0,
    quantity: 1,
    sold: 0,
    shippingProfile: 'small',
    shippingCost: SHIPPING_PRICES.small,
    suddenDeath: false,
    acceptsOffers: false,
    showId: show.id,
    createdAt: new Date().toISOString(),
    saves: 0,
    tags: [],
  };
}

/** Konsola özel sohbet/etkinlik satırı (motor dışı: bahşiş, takip, mağaza satışları, moderasyon) */
export type LocalEvent = ChatMessage;

/** Yayın sonu özeti */
export type ShowSummaryData = {
  showId: string;
  title: string;
  rehearsal: boolean;
  durationSec: number;
  gross: number;
  itemsSold: number;
  orders: number;
  peakViewers: number;
  newFollowers: number;
  tips: number;
  giveaways: number;
  shares: number;
  topItem?: SoldItem;
  sales: SoldItem[];
  raidTo?: { username: string; avatar?: string; showId: string; viewers: number };
};

export const VIA_LABELS: Record<SoldItem['via'], string> = {
  auction: 'Açık artırma',
  buy_now: 'Hemen Al',
  giveaway: 'Çekiliş',
  flash_sale: 'Flaş indirim',
};

export const ZOOM_LEVELS = [
  { label: 'Normal', value: 0 },
  { label: 'Yakın', value: 0.08 },
  { label: 'Çok yakın', value: 0.2 },
] as const;

/** Sohbette soru mu? */
export function isQuestion(text: string): boolean {
  return text.includes('?');
}
