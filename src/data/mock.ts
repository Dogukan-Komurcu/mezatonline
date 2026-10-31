/**
 * Deterministik mock veri üretimi: satıcılar, alıcılar, ürünler, yayınlar, değerlendirmeler.
 * Aynı tohumla her açılışta aynı id'ler üretilir (kalıcı store'lardaki referanslar bozulmasın diye).
 * Zaman alanları "şimdi"ye göre görelidir.
 */
import { registerBotAvatars } from '@/features/live/bots';
import { createRng } from '@/lib/rng';
import { SHIPPING_PRICES } from '@/lib/pricing';
import type { Condition, Product, Review, Show, User, UserBadge } from '@/types';

import {
  HIGHLIGHT_POOL,
  PRODUCT_DESCRIPTIONS,
  PRODUCT_TEMPLATES,
  REVIEW_TEXTS,
  SHOW_DESCRIPTIONS,
  SHOW_TITLES,
} from './catalog';
import { categoryPhotos } from './categories';
import { AVATARS, BANNERS, videosFor } from './media';

const rng = createRng(20261026);
const NOW = Date.now();
const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

registerBotAvatars(AVATARS);

// ─── Satıcılar ───────────────────────────────────────────────────────────────
// Kurgusal satıcılar: marka / resmî temsilci izlenimi veren ad ve kullanıcı adı, gerçek kişi adı ve
// kutu açılışı / gizemli kutu içeriği kullanılmaz. Sıra sabittir (id'ler u1…u40 sırayla verilir).

type SellerDef = [username: string, displayName: string, city: string, categoryId: string, bio: string, followers: number, extraCats?: string[]];

const SELLERS: SellerDef[] = [
  ['kartmerkezi', 'Kart Merkezi', 'İstanbul', 'tcg', "Koleksiyon kartı mezatları ⚡ Her akşam 21:00'de canlıdayız! Kargolar 24 saatte.", 172500],
  ['kartkoleksiyoncusu', 'Kart Koleksiyoncusu', 'Ankara', 'tcg', '15 yıllık koleksiyoncu. PSA kartlar, Japonca paketler ve sürpriz çekilişler 🎁', 48200],
  ['sneakerhane_ist', 'Sneakerhane İstanbul', 'İstanbul', 'sneakers', 'Orijinal sneaker. Faturalı & kutulu. Her hafta canlı yayındayız 👟', 96300],
  ['antikaci_mehmet', 'Antikacı Mehmet', 'İzmir', 'antiques', 'Bakır, gümüş, porselen ve gramofonlar 🏺', 31800],
  ['gumus_dukkani', 'Gümüş Dükkanı', 'İstanbul', 'jewelry', 'Kapalıçarşı’dan 925 ayar telkari ve doğal taş takılar 💍', 27400],
  ['saatci_eminonu', 'Saatçi Eminönü', 'İstanbul', 'watches', 'Vintage & lüks saatler, ekspertizli ✅', 22100],
  ['kilimci_kapadokya', 'Kapadokya Kilim Evi', 'Nevşehir', 'carpets', 'Kapadokya’dan el dokuma halı ve kilimler. Tüm ürünler sertifikalı 🧶', 41900],
  ['lokumcu_usta', 'Lokumcu Usta', 'İstanbul', 'food', 'Geleneksel lokum, baklava ve şekerlemeler. Günlük taze üretim 🍬', 18700],
  ['vintage.ayse', 'Ayşe’nin Vintage Dolabı', 'İzmir', 'womens_fashion', 'Vintage & ikinci el kadın giyim. Her ürün yıkanmış ve ütülü gönderilir 👗', 63500],
  ['retrokonsol', 'Retro Konsol', 'Eskişehir', 'video_games', 'Atari’den PS2’ye retro konsollar. Tamamı test edilmiş ve çalışır durumda 🎮', 25600],
  ['numizmatik_ali', 'Nümismatik Ali', 'Bursa', 'coins', 'Osmanlı ve Cumhuriyet dönemi sikkeler, banknotlar, pullar. Ekspertizli 🪙', 19800],
  ['futbolkartcisi', 'Futbol Kartçısı', 'İstanbul', 'sports_cards', 'Futbol & basketbol kartları. Genç yıldız rookie kartları burada ⚽', 54300],
  ['figurevi', 'Figür Evi', 'Ankara', 'toys', 'Vinil figürler ve koleksiyon oyuncakları. Nadir ve özel seri figürler 🔥', 33700],
  ['tugla_dunyasi', 'Tuğla Dünyası', 'İzmir', 'toys', 'Kutusu açılmamış LEGO setleri ve emekli setler 🧱', 21400],
  ['makyajkutusu', 'Makyaj Kutusu', 'İstanbul', 'beauty', 'Orijinal & faturalı kozmetik. Makyaj ve cilt bakım setleri 💄', 88900],
  ['streetwear_kadikoy', 'Kadıköy Streetwear', 'İstanbul', 'mens_fashion', 'Supreme, Stüssy, Carhartt ve vintage tişörtler. Kadıköy’den canlı 🔥', 45200],
  ['iznik_cini', 'İznik Çini Atölyesi', 'Bursa', 'handmade', 'Geleneksel İznik çinileri, el yapımı. Atölyemizden canlı yayın 🎨', 15600],
  ['tas_ve_kristal', 'Taş & Kristal', 'Antalya', 'crystals', 'Doğal taşlar, kristaller ve fosiller. Her taş sertifikalı 💎', 28900],
  ['cizgiroman_sahaf', 'Çizgi Roman Sahafı', 'İstanbul', 'comics_manga', 'Eski kovboy ve macera çizgi romanları. Nostalji burada 📚', 12300],
  ['plakci_beyoglu', 'Beyoğlu Plakçısı', 'İstanbul', 'music', 'Anadolu rock, Türk pop ve yabancı plaklar. İlk baskılar 🎵', 17800],
  ['forma_arsivi', 'Forma Arşivi', 'İstanbul', 'sports_memorabilia', 'İmzalı ve maç formaları, sertifikalı. Tüm takımlara saygı 🏆', 37600],
  ['yesil_saksi', 'Yeşil Saksı', 'İzmir', 'plants', 'Nadir bitkiler, sukulentler ve el yapımı saksılar 🪴', 14200],
  ['luks_canta_outlet', 'Lüks Çanta Outlet', 'İstanbul', 'bags', 'Sertifikalı lüks çantalar ve aksesuarlar. Orijinallik garantili 👜', 52800],
  ['teknoloji_firsat', 'Teknoloji Fırsat', 'Ankara', 'electronics', 'Kutulu, faturalı teknoloji ürünleri. Garantili 📱', 39400],
  ['depo_mezati', 'Depo Mezatı', 'Kocaeli', 'estate', 'Ev boşaltmalarından eşyalar ve toplu lotlar. Her parça yayında tek tek gösterilir 📦', 26700],
  ['kartoyunlari_tr', 'Kart Oyunları Dükkanı', 'İzmir', 'tcg', 'Klasik kart oyunu kartları, 1. baskılar ve turnuva desteleri 🐉', 16900],
  ['animekart_tr', 'Anime Kart Köşesi', 'İstanbul', 'tcg', 'Anime kart oyunları: tekli kartlar ve kapalı kutu ürünler 🏴‍☠️', 21800],
  ['antep_kahvecisi', 'Antep Kahvecisi', 'Gaziantep', 'food', 'Gaziantep’ten taze kahve, menengiç ve fıstıklı lezzetler ☕', 11200],
  ['bakirci_antep', 'Gaziantep Bakırcısı', 'Gaziantep', 'antiques', 'El dövme bakır ürünler, cezveler ve siniler. Ustasından 🔨', 9800],
  ['butik_elif', 'Butik Elif', 'Ankara', 'womens_fashion', 'Yeni sezon & outlet kadın giyim. Her gece 22:00’de canlı ✨', 71200],
  ['sneakerkulubu', 'Sneaker Kulübü', 'İzmir', 'sneakers', 'Basketbol ayakkabıları: retro, OG ve nadir renkler 👟', 34100],
  ['manga_kosesi', 'Manga Köşesi', 'Ankara', 'comics_manga', 'Türkçe ve Japonca manga, anime figürleri 🍥', 13900],
  ['sahaf_kitapci', 'Sahaf Kitapçı', 'İstanbul', 'books', 'İlk baskılar, imzalı kitaplar ve Yeşilçam afişleri 📖', 8700],
  ['dekor_atolye', 'Dekor Atölye', 'İstanbul', 'home_garden', 'Ev dekorasyonu, aydınlatma ve sofra ürünleri 🏡', 19300],
  ['oltu_tasi_erzurum', 'Oltu Taşı Erzurum', 'Erzurum', 'jewelry', 'Erzurum’dan hakiki Oltu taşı tesbih ve takılar 🖤', 10400],
  ['firsat_paleti', 'Fırsat Paleti', 'İstanbul', 'deals', 'İade paletleri, toptan ve outlet fırsatlar 🏷️', 42700],
  ['eski_istanbul', 'Eski İstanbul Kartpostal', 'İstanbul', 'vintage', 'Eski İstanbul kartpostalları, fotoğraflar ve efemera 🕰️', 7600],
  ['buyukoyunlar', 'Büyük Oyunlar', 'Ankara', 'tcg', 'Fantastik kart oyunları: tekli kartlar ve hazır desteler 🧙', 9200],
  ['parfum_atolyesi', 'Parfüm Atölyesi', 'İstanbul', 'beauty', 'Orijinal parfümler, dekantlar ve nişler 🌸', 24300],
  ['retro_erkek', 'Retro Erkek', 'İzmir', 'mens_fashion', 'Vintage erkek giyim, deri ceketler ve kot 🧥', 15800],
];

const BADGE_FOR_INDEX = (i: number): UserBadge[] => {
  const badges: UserBadge[] = [];
  if (i < 12) badges.push('top_seller');
  if (i % 3 === 0 || i < 6) badges.push('verified');
  if (i % 4 === 1) badges.push('fast_shipper');
  if (i % 9 === 0 && i > 0) badges.push('partner');
  if (i > 34) badges.push('new_seller');
  return badges;
};

export const SELLER_USERS: User[] = SELLERS.map(([username, displayName, city, categoryId, bio, followers], i) => {
  const avatar = AVATARS[(i * 7) % AVATARS.length];
  return {
    id: `u${i + 1}`,
    username,
    displayName,
    avatar,
    bio,
    city,
    isSeller: true,
    badges: BADGE_FOR_INDEX(i),
    rating: Math.round(rng.float(4.6, 5) * 10) / 10,
    reviewCount: Math.round(followers / rng.int(18, 40)),
    followers,
    following: rng.int(40, 600),
    itemsSold: Math.round(followers * rng.float(0.6, 2.2)),
    avgShipDays: Math.round(rng.float(0.8, 2.6) * 10) / 10,
    joinedAt: new Date(NOW - rng.int(90, 1200) * DAY).toISOString(),
    categoryIds: [categoryId],
    cover: categoryPhotos(categoryId)[i % 3],
  };
});

// ─── Alıcılar (değerlendirme, takipçi listeleri, mesajlar için) ──────────────

const BUYER_NAMES = [
  ['zeynep.k', 'Zeynep K.'], ['emre_1907', 'Emre'], ['ayse_koleksiyon', 'Ayşe'], ['burak34', 'Burak'], ['elif.vintage', 'Elif'],
  ['can_kartci', 'Can'], ['deniz.tcg', 'Deniz'], ['mert_sneaker', 'Mert'], ['selin_antika', 'Selin'], ['kaan1905', 'Kaan'],
  ['irem.taki', 'İrem'], ['onur_retro', 'Onur'], ['cem.saat', 'Cem'], ['tugce_beauty', 'Tuğçe'], ['gizem.plak', 'Gizem'],
  ['baris_lego', 'Barış'], ['yusuf.coin', 'Yusuf'], ['ali_kilim', 'Ali'], ['hakan.forma', 'Hakan'], ['serkan_manga', 'Serkan'],
  ['ozan.oyun', 'Ozan'], ['efe_pokemon', 'Efe'], ['doga.bitki', 'Doğa'], ['ilayda_s', 'İlayda'], ['nisa.k', 'Nisa'],
  ['kerem_1903', 'Kerem'], ['umut.depo', 'Umut'], ['sinan_tr', 'Sinan'], ['cansu.mz', 'Cansu'], ['merve_kristal', 'Merve'],
];

export const BUYER_USERS: User[] = BUYER_NAMES.map(([username, displayName], i) => ({
  id: `b${i + 1}`,
  username,
  displayName,
  avatar: AVATARS[(i * 5 + 3) % AVATARS.length],
  bio: '',
  city: rng.pick(['İstanbul', 'Ankara', 'İzmir', 'Bursa', 'Antalya', 'Adana', 'Konya', 'Eskişehir', 'Trabzon', 'Kayseri']),
  isSeller: false,
  badges: [],
  rating: 0,
  reviewCount: 0,
  followers: rng.int(3, 250),
  following: rng.int(10, 400),
  itemsSold: 0,
  avgShipDays: 0,
  joinedAt: new Date(NOW - rng.int(30, 900) * DAY).toISOString(),
  categoryIds: [],
}));

export const ALL_USERS: User[] = [...SELLER_USERS, ...BUYER_USERS];

// ─── Ürünler & Yayınlar ──────────────────────────────────────────────────────

const CONDITIONS: Condition[] = ['new', 'like_new', 'very_good', 'good'];
let productSeq = 0;

function roundPrice(v: number): number {
  if (v < 100) return Math.round(v / 5) * 5 || 5;
  if (v < 1000) return Math.round(v / 10) * 10;
  if (v < 10000) return Math.round(v / 50) * 50;
  return Math.round(v / 500) * 500;
}

function makeProduct(seller: User, categoryId: string, opts: { showId?: string; format?: Product['format']; createdAt?: number } = {}): Product {
  const templates = PRODUCT_TEMPLATES[categoryId] ?? PRODUCT_TEMPLATES.vintage;
  const [title, min, max, sub, ship = 'small'] = rng.pick(templates);
  const value = roundPrice(rng.float(min, max));
  const format: Product['format'] = opts.format ?? (rng.chance(0.68) ? 'auction' : 'buy_now');
  const photos = categoryPhotos(categoryId);
  const first = rng.int(0, photos.length - 1);
  const images = [0, 1, 2].map((k) => photos[(first + k * 3) % photos.length]);
  const oneLira = format === 'auction' && rng.chance(0.35);
  const price = format === 'auction' ? (oneLira ? 1 : roundPrice(value * rng.float(0.3, 0.7))) : value;
  const discounted = format === 'buy_now' && rng.chance(0.3);
  const isGraded = /PSA|CGC/.test(title);
  productSeq += 1;
  return {
    id: `p${productSeq}`,
    sellerId: seller.id,
    title,
    description: rng.pick(PRODUCT_DESCRIPTIONS),
    images,
    categoryId,
    subcategoryId: sub,
    condition: isGraded ? 'graded' : rng.pick(CONDITIONS),
    grade: isGraded ? (title.match(/(PSA|CGC) [\d.]+/)?.[0] ?? 'PSA 10') : undefined,
    format,
    price: discounted ? roundPrice(value * 0.8) : price,
    compareAtPrice: format === 'auction' ? value : discounted ? value : undefined,
    quantity: format === 'buy_now' ? rng.int(1, 12) : 1,
    sold: 0,
    shippingProfile: ship,
    shippingCost: SHIPPING_PRICES[ship],
    suddenDeath: format === 'auction' && rng.chance(0.25),
    acceptsOffers: format === 'buy_now' && rng.chance(0.5),
    showId: opts.showId,
    createdAt: new Date(opts.createdAt ?? NOW - rng.int(1, 30) * DAY).toISOString(),
    saves: rng.int(0, 240),
    tags: [],
  };
}

const VIDEO_KEY: Record<string, string> = {
  tcg: 'tcg_other', sports_cards: 'tcg_other', sneakers: 'sneakers', womens_fashion: 'womens_fashion', mens_fashion: 'mens_fashion',
  bags: 'womens_fashion', jewelry: 'jewelry', watches: 'watches', beauty: 'beauty', toys: 'toys', video_games: 'unboxing',
  electronics: 'electronics', coins: 'antiques', antiques: 'antiques', carpets: 'handmade', handmade: 'handmade', food: 'food',
  vintage: 'vintage', estate: 'unboxing', deals: 'unboxing', home_garden: 'handmade', comics_manga: 'unboxing', books: 'vintage',
};

function videoForCategory(categoryId: string): string | undefined {
  const pool = videosFor(VIDEO_KEY[categoryId] ?? 'live_selling');
  const portrait = pool.filter((v) => v.portrait);
  const list = portrait.length ? portrait : pool;
  return list.length ? rng.pick(list).url : undefined;
}

export const PRODUCTS: Product[] = [];
export const SHOWS: Show[] = [];

let showSeq = 0;
function makeShow(seller: User, status: Show['status'], at: number): Show {
  const categoryId = seller.categoryIds[0];
  showSeq += 1;
  const id = `s${showSeq}`;
  const titles = SHOW_TITLES[categoryId] ?? ['Canlı Mezat 🔥'];
  const productCount = rng.int(9, 15);
  const products: Product[] = [];
  for (let i = 0; i < productCount; i++) {
    products.push(makeProduct(seller, categoryId, { showId: id, createdAt: at - rng.int(1, 5) * DAY }));
  }
  // En az 3 açık artırma ve 2 hemen al olsun
  const auctions = products.filter((p) => p.format === 'auction').length;
  if (auctions < 3) products.slice(0, 3).forEach((p) => { p.format = 'auction'; p.quantity = 1; p.compareAtPrice = p.compareAtPrice ?? p.price; });
  PRODUCTS.push(...products);
  const photos = categoryPhotos(categoryId);
  const viewers = status === 'live' ? Math.round(Math.max(8, seller.followers / rng.int(80, 400))) : 0;
  const highlights = rng.pickMany(HIGHLIGHT_POOL, rng.int(1, 3));
  return {
    id,
    sellerId: seller.id,
    title: rng.pick(titles),
    description: rng.pick(SHOW_DESCRIPTIONS),
    coverImage: photos[(showSeq * 3) % photos.length],
    videoUrl: videoForCategory(categoryId),
    categoryId,
    subcategoryId: products[0]?.subcategoryId,
    tags: Array.from(new Set(products.map((p) => p.subcategoryId).filter(Boolean) as string[])).slice(0, 3),
    status,
    viewers,
    scheduledAt: new Date(at).toISOString(),
    startedAt: status !== 'scheduled' ? new Date(at).toISOString() : undefined,
    endedAt: status === 'ended' ? new Date(at + rng.int(60, 180) * MIN).toISOString() : undefined,
    productIds: products.map((p) => p.id),
    shippingCost: products.length ? Math.min(...products.map((p) => p.shippingCost)) : 69.9,
    freeShippingThreshold: rng.chance(0.3) ? rng.pick([500, 750, 1000]) : undefined,
    giveawayCount: highlights.includes('Çekiliş') ? rng.int(3, 12) : rng.int(0, 3),
    savedCount: rng.int(12, 900),
    highlights,
    isFeatured: rng.chance(0.2),
  };
}

// Canlı yayınlar: ilk 26 satıcı şu an canlı
SELLER_USERS.forEach((seller, i) => {
  if (i < 26) SHOWS.push(makeShow(seller, 'live', NOW - rng.int(5, 140) * MIN));
});

// Planlanmış yayınlar: önümüzdeki 7 gün
SELLER_USERS.forEach((seller, i) => {
  const count = i < 10 ? 2 : 1;
  for (let k = 0; k < count; k++) {
    const dayOffset = rng.int(0, 6);
    const hour = rng.pick([12, 14, 18, 19, 20, 21, 22]);
    const d = new Date(NOW + dayOffset * DAY);
    d.setHours(hour, rng.pick([0, 0, 30]), 0, 0);
    let at = d.getTime();
    if (at < NOW + 20 * MIN) at = NOW + rng.int(25, 300) * MIN;
    SHOWS.push(makeShow(seller, 'scheduled', at));
  }
});

// Geçmiş yayınlar (profil sayfası için)
SELLER_USERS.forEach((seller) => {
  for (let k = 0; k < 2; k++) {
    SHOWS.push(makeShow(seller, 'ended', NOW - rng.int(1, 20) * DAY - rng.int(0, 10) * HOUR));
  }
});
// Biten yayınların ürünleri satılmış sayılır
SHOWS.filter((s) => s.status === 'ended').forEach((s) => {
  s.productIds.forEach((pid) => {
    const p = PRODUCTS.find((x) => x.id === pid);
    if (p) p.sold = p.quantity;
  });
});

// Mağaza (yayın dışı) ilanları
SELLER_USERS.forEach((seller) => {
  const n = rng.int(6, 12);
  for (let k = 0; k < n; k++) {
    PRODUCTS.push(makeProduct(seller, seller.categoryIds[0], { format: 'buy_now' }));
  }
});

// ─── Değerlendirmeler ────────────────────────────────────────────────────────

export const REVIEWS: Review[] = [];
let reviewSeq = 0;
SELLER_USERS.forEach((seller) => {
  const n = rng.int(8, 18);
  const sellerProducts = PRODUCTS.filter((p) => p.sellerId === seller.id);
  for (let k = 0; k < n; k++) {
    reviewSeq += 1;
    const rating = rng.chance(0.82) ? 5 : rng.chance(0.7) ? 4 : 3;
    const product = rng.pick(sellerProducts);
    REVIEWS.push({
      id: `r${reviewSeq}`,
      sellerId: seller.id,
      buyerId: rng.pick(BUYER_USERS).id,
      rating,
      text: rng.pick(REVIEW_TEXTS),
      productTitle: product?.title ?? 'Ürün',
      productImage: product?.images[0],
      shipping: Math.min(5, rating + (rng.chance(0.3) ? 0 : 0)),
      accuracy: rating,
      communication: Math.min(5, rating + (rng.chance(0.5) ? 1 : 0)),
      createdAt: new Date(NOW - rng.int(1, 120) * DAY).toISOString(),
    });
  }
});
REVIEWS.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

// ─── Ana sayfa bannerları ────────────────────────────────────────────────────

export type PromoBanner = { id: string; title: string; subtitle: string; image: string; href: string; tint: string };

export const PROMO_BANNERS: PromoBanner[] = [
  { id: 'bn1', title: '₺150 hoş geldin kredisi', subtitle: 'İlk alışverişinde otomatik uygulanır', image: BANNERS[0], href: '/wallet', tint: '#FFE414' },
  { id: 'bn2', title: 'Arkadaşını davet et', subtitle: 'İkiniz de ₺100 kazanın', image: BANNERS[1 % BANNERS.length], href: '/wallet', tint: '#C9F2DD' },
  { id: 'bn3', title: 'Satıcı ol, bu akşam canlı yayına çık', subtitle: 'İlk ay %0 komisyon', image: BANNERS[2 % BANNERS.length], href: '/seller/apply', tint: '#DCD6FF' },
];
