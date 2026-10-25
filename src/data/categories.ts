/**
 * Kategori ağacı — Whatnot'un "Browse by Category" listesinin Türkiye uyarlaması.
 * `mediaKey`, media.ts içindeki görsel havuzunu seçer.
 */
import type { Category } from '@/types';

import { categoryImage, mediaFor } from './media';

type CategoryDef = {
  id: string;
  name: string;
  shortName: string;
  emoji: string;
  tint: string;
  mediaKey: string;
  viewers: number;
  subs: [id: string, name: string][];
};

const DEFS: CategoryDef[] = [
  {
    id: 'tcg', name: 'Kart Oyunları (TCG)', shortName: 'Pokémon & TCG', emoji: '🃏', tint: '#FFE9A8', mediaKey: 'pokemon', viewers: 32700,
    subs: [['pokemon', 'Pokémon'], ['yugioh', 'Yu-Gi-Oh!'], ['magic', 'Magic: The Gathering'], ['onepiece', 'One Piece'], ['lorcana', 'Lorcana'], ['graded', 'Derecelendirilmiş (PSA)']],
  },
  {
    id: 'sports_cards', name: 'Spor Kartları', shortName: 'Spor Kartları', emoji: '⚽', tint: '#D7ECFF', mediaKey: 'sports_cards', viewers: 17000,
    subs: [['football', 'Futbol'], ['basketball', 'Basketbol'], ['superlig', 'Süper Lig Panini'], ['f1', 'Formula 1'], ['tennis', 'Tenis']],
  },
  {
    id: 'womens_fashion', name: 'Kadın Giyim', shortName: 'Kadın Giyim', emoji: '👗', tint: '#FFD9E6', mediaKey: 'womens_fashion', viewers: 34500,
    subs: [['dresses', 'Elbise'], ['outerwear', 'Dış Giyim'], ['vintage_women', 'Vintage'], ['activewear', 'Spor Giyim'], ['luxury_women', 'Lüks Markalar']],
  },
  {
    id: 'sneakers', name: 'Sneaker & Ayakkabı', shortName: 'Sneaker', emoji: '👟', tint: '#E3F7D9', mediaKey: 'sneakers', viewers: 20000,
    subs: [['jordan', 'Jordan'], ['nike', 'Nike'], ['adidas', 'Adidas'], ['newbalance', 'New Balance'], ['womens_shoes', 'Kadın Ayakkabı']],
  },
  {
    id: 'toys', name: 'Oyuncak & Hobi', shortName: 'Oyuncak', emoji: '🧸', tint: '#FFE3C7', mediaKey: 'toys', viewers: 16700,
    subs: [['funko', 'Funko Pop'], ['lego', 'LEGO'], ['figures', 'Aksiyon Figür'], ['diecast', 'Diecast Araba'], ['rc', 'Uzaktan Kumandalı']],
  },
  {
    id: 'coins', name: 'Madeni Para & Nümismatik', shortName: 'Nümismatik', emoji: '🪙', tint: '#F4E7C8', mediaKey: 'coins', viewers: 11500,
    subs: [['ottoman', 'Osmanlı Sikkeleri'], ['republic', 'Cumhuriyet Paraları'], ['commemorative', 'Hatıra Paraları'], ['banknotes', 'Kağıt Para'], ['stamps', 'Pul & Filateli'], ['gold', 'Altın & Ziynet']],
  },
  {
    id: 'electronics', name: 'Elektronik', shortName: 'Elektronik', emoji: '📱', tint: '#DCE3FF', mediaKey: 'electronics', viewers: 11400,
    subs: [['phones', 'Telefon'], ['audio', 'Kulaklık & Ses'], ['cameras', 'Fotoğraf Makinesi'], ['computers', 'Bilgisayar'], ['gadgets', 'Akıllı Cihazlar']],
  },
  {
    id: 'beauty', name: 'Güzellik & Kozmetik', shortName: 'Kozmetik', emoji: '💄', tint: '#FFDDE1', mediaKey: 'beauty', viewers: 8600,
    subs: [['makeup', 'Makyaj'], ['skincare', 'Cilt Bakımı'], ['fragrance', 'Parfüm'], ['haircare', 'Saç Bakımı']],
  },
  {
    id: 'mens_fashion', name: 'Erkek Giyim', shortName: 'Erkek Giyim', emoji: '👔', tint: '#DDE7F0', mediaKey: 'mens_fashion', viewers: 8300,
    subs: [['streetwear', 'Streetwear'], ['jackets', 'Ceket & Mont'], ['vintage_men', 'Vintage'], ['tshirts', 'Tişört & Sweat']],
  },
  {
    id: 'jewelry', name: 'Takı & Mücevher', shortName: 'Takı', emoji: '💍', tint: '#F6E6FF', mediaKey: 'jewelry', viewers: 8100,
    subs: [['gold_jewelry', 'Altın'], ['silver', 'Gümüş (925)'], ['gemstone', 'Doğal Taş Takı'], ['vintage_jewelry', 'Vintage Takı']],
  },
  {
    id: 'antiques', name: 'Antika & Vintage Dekor', shortName: 'Antika', emoji: '🏺', tint: '#EFE2D2', mediaKey: 'antiques', viewers: 3100,
    subs: [['copper', 'Bakır'], ['silverware', 'Gümüş Eşya'], ['gramophone', 'Gramofon & Radyo'], ['clocks', 'Eski Saatler'], ['porcelain', 'Porselen']],
  },
  {
    id: 'carpets', name: 'Halı & Kilim', shortName: 'Halı & Kilim', emoji: '🧶', tint: '#F7D9CC', mediaKey: 'carpets', viewers: 2600,
    subs: [['handwoven', 'El Dokuma Halı'], ['kilim', 'Kilim'], ['cushions', 'Yastık & Minder'], ['prayer_rug', 'Seccade']],
  },
  {
    id: 'bags', name: 'Çanta & Aksesuar', shortName: 'Çanta', emoji: '👜', tint: '#F3E4D7', mediaKey: 'bags', viewers: 5200,
    subs: [['luxury_bags', 'Lüks Çanta'], ['wallets', 'Cüzdan'], ['sunglasses', 'Gözlük'], ['hats', 'Şapka & Kemer']],
  },
  {
    id: 'home_garden', name: 'Ev & Bahçe', shortName: 'Ev & Bahçe', emoji: '🏡', tint: '#DFF2E6', mediaKey: 'home_garden', viewers: 5200,
    subs: [['decor', 'Dekorasyon'], ['kitchen', 'Mutfak'], ['lighting', 'Aydınlatma'], ['garden', 'Bahçe']],
  },
  {
    id: 'watches', name: 'Saat', shortName: 'Saat', emoji: '⌚', tint: '#E6E6EA', mediaKey: 'watches', viewers: 1300,
    subs: [['luxury_watches', 'Lüks Saat'], ['vintage_watches', 'Vintage Saat'], ['smartwatch', 'Akıllı Saat'], ['pocket', 'Cep Saati']],
  },
  {
    id: 'video_games', name: 'Video Oyunları', shortName: 'Oyun', emoji: '🎮', tint: '#E1DCFF', mediaKey: 'video_games', viewers: 1100,
    subs: [['retro', 'Retro Konsol'], ['playstation', 'PlayStation'], ['nintendo', 'Nintendo'], ['xbox', 'Xbox'], ['atari', 'Atari & Sega']],
  },
  {
    id: 'comics_manga', name: 'Çizgi Roman & Manga', shortName: 'Çizgi Roman', emoji: '📚', tint: '#FFE0CC', mediaKey: 'comics_manga', viewers: 1400,
    subs: [['marvel', 'Marvel'], ['dc', 'DC'], ['manga', 'Manga'], ['tommiks', 'Tommiks & Teksas'], ['anime_figures', 'Anime Figür']],
  },
  {
    id: 'sports_memorabilia', name: 'Spor Hatıraları', shortName: 'Forma & Hatıra', emoji: '🏆', tint: '#FFF2C2', mediaKey: 'sports_memorabilia', viewers: 2200,
    subs: [['jerseys', 'Forma'], ['signed', 'İmzalı Ürün'], ['scarves', 'Atkı & Bayrak'], ['balls', 'Top & Ekipman']],
  },
  {
    id: 'crystals', name: 'Taşlar & Kristaller', shortName: 'Kristal', emoji: '💎', tint: '#E8DCFF', mediaKey: 'crystals', viewers: 1300,
    subs: [['raw', 'Ham Taş'], ['towers', 'Kristal Kule'], ['fossils', 'Fosil'], ['agate', 'Akik & Oltu']],
  },
  {
    id: 'handmade', name: 'El Yapımı & Sanat', shortName: 'El Yapımı', emoji: '🎨', tint: '#D9F3F3', mediaKey: 'handmade', viewers: 3300,
    subs: [['ceramics', 'Çini & Seramik'], ['ebru', 'Ebru'], ['paintings', 'Tablo'], ['woodwork', 'Ahşap']],
  },
  {
    id: 'vintage', name: 'Vintage', shortName: 'Vintage', emoji: '🕰️', tint: '#EDE3D1', mediaKey: 'vintage', viewers: 4000,
    subs: [['retro_clothing', 'Retro Giyim'], ['retro_objects', 'Retro Obje'], ['photos', 'Eski Fotoğraf'], ['postcards', 'Kartpostal']],
  },
  {
    id: 'books', name: 'Kitap & Film', shortName: 'Kitap', emoji: '📖', tint: '#EADFD3', mediaKey: 'books', viewers: 940,
    subs: [['first_edition', 'İlk Baskı'], ['sahaf', 'Sahaf'], ['posters', 'Film Afişi'], ['dvd', 'DVD & Blu-ray']],
  },
  {
    id: 'music', name: 'Müzik & Plak', shortName: 'Plak', emoji: '🎵', tint: '#E0E0FF', mediaKey: 'vintage', viewers: 650,
    subs: [['vinyl', 'Plak (LP)'], ['45s', "45'lik"], ['cassette', 'Kaset'], ['instruments', 'Enstrüman']],
  },
  {
    id: 'plants', name: 'Bitkiler', shortName: 'Bitki', emoji: '🪴', tint: '#D8F5D4', mediaKey: 'plants', viewers: 900,
    subs: [['succulents', 'Sukulent'], ['cactus', 'Kaktüs'], ['rare_plants', 'Nadir Bitkiler'], ['pots', 'Saksı']],
  },
  {
    id: 'food', name: 'Yiyecek & İçecek', shortName: 'Lezzet', emoji: '☕', tint: '#F5E1CF', mediaKey: 'food', viewers: 2000,
    subs: [['lokum', 'Lokum & Tatlı'], ['coffee_tea', 'Kahve & Çay'], ['spices', 'Baharat'], ['honey', 'Bal & Reçel'], ['olive_oil', 'Zeytinyağı']],
  },
  {
    id: 'estate', name: 'Ev Boşaltma & Depo', shortName: 'Depo Mezatı', emoji: '📦', tint: '#E9E4DA', mediaKey: 'antiques', viewers: 2900,
    subs: [['mystery_box', 'Gizemli Kutu'], ['storage', 'Depo Açılışı'], ['lots', 'Toplu Lot']],
  },
  {
    id: 'deals', name: 'Toptan & Fırsatlar', shortName: 'Fırsat', emoji: '🏷️', tint: '#FFE6E6', mediaKey: 'electronics', viewers: 4700,
    subs: [['wholesale', 'Toptan'], ['outlet', 'Outlet'], ['returns', 'İade Paletleri']],
  },
];

export const CATEGORIES: Category[] = DEFS.map((d) => ({
  id: d.id,
  name: d.name,
  shortName: d.shortName,
  emoji: d.emoji,
  tint: d.tint,
  viewers: d.viewers,
  image: categoryImage(d.mediaKey, 0),
  subcategories: d.subs.map(([id, name], i) => ({
    id,
    categoryId: d.id,
    name,
    image: categoryImage(d.mediaKey, i + 1),
    viewers: Math.round(d.viewers / (i + 2) + (i * 137) % 400),
  })),
}));

const CATEGORY_MEDIA_KEY: Record<string, string> = Object.fromEntries(DEFS.map((d) => [d.id, d.mediaKey]));

/** Kategori için ürün görsel havuzu */
export function categoryPhotos(categoryId: string): string[] {
  return mediaFor(CATEGORY_MEDIA_KEY[categoryId] ?? 'vintage');
}

export function getCategory(id: string | undefined): Category | undefined {
  return CATEGORIES.find((c) => c.id === id);
}

export function getSubcategory(categoryId: string | undefined, subId: string | undefined) {
  return getCategory(categoryId)?.subcategories.find((s) => s.id === subId);
}

/** Popülerliğe göre sıralı */
export const CATEGORIES_BY_POPULARITY = [...CATEGORIES].sort((a, b) => b.viewers - a.viewers);
