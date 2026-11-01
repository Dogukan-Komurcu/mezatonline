/**
 * Canlı yayın simülasyonu için sahte izleyiciler ve Türkçe sohbet havuzu.
 * Gerçek kişi adları kullanılmaz; kapalı özelliklere (çekiliş vb.) atıf yapan satırlar bayrakla süzülür.
 */
import { FEATURES } from '@/config/demo';
import { random } from '@/lib/rng';

/** Çekiliş kapalıysa çekilişten bahseden satırları çıkar */
const giveawayLines = (lines: string[]) => (FEATURES.giveaways ? lines : []);

export type Bot = {
  id: string;
  username: string;
  avatar?: string;
  /** Teklif verme iştahı 0-1 */
  appetite: number;
};

const FIRST = [
  'ahmet', 'mehmet', 'ayse', 'zeynep', 'emre', 'burak', 'elif', 'can', 'deniz', 'ece', 'mert', 'selin', 'kaan',
  'berk', 'irem', 'onur', 'cem', 'tugce', 'gizem', 'baris', 'yusuf', 'ali', 'hakan', 'serkan', 'ozan', 'efe',
  'doga', 'ilayda', 'nisa', 'kerem', 'umut', 'sinan', 'cansu', 'merve', 'hande', 'tolga', 'volkan', 'gokhan',
  'eren', 'arda', 'ege', 'yigit', 'batu', 'furkan', 'sude', 'ceren', 'busra', 'esra', 'murat', 'ozge', 'pinar',
  'sevgi', 'taner', 'levent', 'koray', 'alper', 'ibrahim', 'huseyin', 'fatma', 'emine', 'hatice', 'oguz',
];
const SUFFIX = [
  '34', '06', '35', '16', '07', '01', '42', '61', '_tr', '.tr', '1903', '1907', '1905', '_ist', '_ank', '_izm',
  '.koleksiyon', '_cards', '_kart', 'x', '_', '99', '2000', '_88', '.vintage', '_sneaker', '.mezat', 'kartci',
  '_pokemon', '.antika', '_tcg', '.store', '_official', '27', '55', '26', '_07', '.33',
];

const AVATAR_POOL: string[] = [];

/** Bot avatar havuzunu mock medya ile doldur (data katmanı çağırır) */
export function registerBotAvatars(urls: string[]) {
  AVATAR_POOL.splice(0, AVATAR_POOL.length, ...urls);
}

export function makeBot(): Bot {
  const name = random.pick(FIRST) + random.pick(SUFFIX);
  return {
    id: 'bot_' + name + random.int(0, 999),
    username: name,
    avatar: AVATAR_POOL.length && random.chance(0.6) ? random.pick(AVATAR_POOL) : undefined,
    appetite: random.float(0.15, 1),
  };
}

export function makeBots(n: number): Bot[] {
  const seen = new Set<string>();
  const out: Bot[] = [];
  while (out.length < n) {
    const b = makeBot();
    if (seen.has(b.username)) continue;
    seen.add(b.username);
    out.push(b);
  }
  return out;
}

export const GENERIC_CHAT = [
  'selamlar 👋', 'hayırlı yayınlar 🙌', 'bereket versin 🙏', 'W', 'W W W', '🔥🔥🔥', 'kargo ne zaman çıkar?',
  ...giveawayLines(['çekiliş ne zaman?']), 'abi bunu bir daha gösterir misin', 'kaçtan başlıyor?', 'bu orijinal mi?', 'kondisyonu nasıl?',
  'yakından görebilir miyiz 🙏', 'ilk defa izliyorum, çok güzel yayın', 'takip ettim ❤️', 'ses biraz kısık',
  'fiyatlar çok iyi', 'bende de var bundan', 'hadi bakalım 👀', 'geçen hafta aldım, çok memnunum', 'kargo birleşiyor mu?',
  "Ankara'dan selamlar", "İzmir'den selam 👋", "Bursa'dan selamlar", 'yayın kaçta bitiyor?', 'pahalı gitti ya 😅',
  'ucuz kaldı bu', 'tebrikler 👏', 'hayırlı olsun', 'gg', 'sıradaki ne?', 'devam devam', '❤️❤️', 'efsane',
  'beyler sakin 😂', 'kalbim dayanmaz', 'bunu kaçırmam', 'bir tane de bana 😂', 'nasıl teklif veriliyor?',
  'ödeme kartla mı?', 'iade var mı?', 'işte bu!', 'yine geldim 😎', 'sabahtan beri bekliyordum', 'çok iyi paketliyor bu satıcı',
  'geçen ki siparişim 1 günde geldi 👌', 'güven veren satıcı', 'mükemmel', 'abi selam', 'hocam selam',
];

export const BIDDING_CHAT = ['hadi hadi', 'bırakmam 😤', 'bu benim', 'son teklif!', 'yok artık 😂', 'değer ama', 'kim bu ya 😂', 'çekişmeli 🔥'];

export const SOLD_CHAT = ['hayırlı olsun 🎉', 'tebrikler!', 'güle güle kullan', 'kaçırdım ya 😩', 'bir dahakine', 'ucuz kaldı', 'GG', 'iyi kapattın'];

export const CATEGORY_CHAT: Record<string, string[]> = {
  tcg: ['Charizard var mı? 🙏', '151 paketi var mı?', 'japonca mı ingilizce mi?', 'alt art var mı?', 'PSA 10 mu?', 'sleeve içinde mi gönderiyorsunuz?', 'booster box ne kadar?'],
  sports_cards: ['genç yıldız rookie kartı var mı?', 'milli takım kartı var mı?', 'Panini mi?', 'imzalı mı bu?', 'numaralı mı?'],
  sneakers: ['numarası kaç?', '43 var mı?', 'faturası var mı?', 'kutusu orijinal mi?', '44.5 olsa alırdım', 'giyilmiş mi?'],
  womens_fashion: ['bedeni ne?', 'S beden var mı?', 'kumaşı ne?', 'rengi çok güzel', 'boyu kaç cm?'],
  mens_fashion: ['bedeni ne?', 'L var mı?', 'vintage mi bu?', 'kalıbı dar mı?'],
  bags: ['seri numarası var mı?', 'orijinal mi?', 'kaç cm?', 'tozluğu var mı?'],
  jewelry: ['ayarı kaç?', 'gram kaç?', '925 mi?', 'taşı doğal mı?', 'sertifikalı mı?'],
  watches: ['mekanizması ne?', 'kutu-belge var mı?', 'çalışıyor mu?', 'hangi yıl?'],
  beauty: ['son kullanma tarihi?', 'orijinal mi?', 'tester mı?', 'ton numarası ne?'],
  toys: ['kutusu açılmamış mı?', 'eksik parça var mı?', 'ilk seri mi?'],
  video_games: ['çalışıyor mu?', 'kolu var mı?', 'bölge kodu?', 'kutulu mu?'],
  electronics: ['garantisi var mı?', 'pil sağlığı kaç?', 'kutusu var mı?'],
  coins: ['hangi döneme ait?', 'gümüş mü?', 'ekspertizli mi?', 'çilli mi?', 'kaç gram?'],
  antiques: ['hangi döneme ait?', 'gümüş ayarı kaç?', 'sertifikası var mı?', 'kalay var mı?', 'damgalı mı?'],
  carpets: ['kaça kaç?', 'el dokuma mı?', 'yün mü ipek mi?', 'kaç yıllık?', 'yıkanmış mı?'],
  home_garden: ['ölçüleri ne?', 'malzemesi ne?', 'çok şık'],
  plants: ['saksısıyla mı?', 'kaç cm?', 'bakımı zor mu?', 'kargoda zarar görmez mi?'],
  crystals: ['doğal mı?', 'kaç gram?', 'nereden çıkarılmış?', 'çok enerjik 😍'],
  comics_manga: ['ilk baskı mı?', 'kaçıncı sayı?', 'Tommiks var mı?', 'cildi sağlam mı?'],
  books: ['ilk baskı mı?', 'imzalı mı?', 'kaç sayfa?', 'sahaf kokusu 😍'],
  music: ['plak çizik mi?', 'ilk baskı mı?', 'hangi yıl?', 'Türk pop var mı?'],
  sports_memorabilia: ['imzalı mı?', 'maç forması mı?', 'sertifikalı mı?', 'Cimbom 💛❤️', 'Fener 💛💙', 'Beşiktaş 🖤🤍'],
  food: ['taze mi?', 'son kullanma tarihi?', 'Antep fıstıklı mı?', 'kaç gram?'],
  handmade: ['el yapımı mı?', 'İznik mi Kütahya mı?', 'kaç cm?', 'çok emek var'],
  vintage: ['hangi yıl?', 'orijinal mi?', 'çok nostaljik'],
};

export const SELLER_LINES = [
  'Hoş geldiniz arkadaşlar! 🙌',
  'Sıradaki ürüne geçiyoruz 👇',
  ...giveawayLines(['Takip etmeyi unutmayın, çekiliş geliyor 🎁']),
  'Kargolar en geç 2 iş gününde çıkıyor 📦',
  'Kusur varsa kamerada tek tek gösteriyorum, sormaktan çekinmeyin 🔍',
  'Aynı yayında aldıklarınız tek kargoda gelir 👍',
  'Yeni gelenler hoş geldi, kalpleri bırakın ❤️',
  'Bu ürün çok özel, kaçırmayın 🔥',
  'Sorularınızı yazın, cevaplıyorum',
];

export const PINNED_LINES = [
  ...giveawayLines(['📌 Yayın boyunca çekilişler var, takipçiler katılabilir ❤️']),
  '📌 Aynı yayındaki tüm alımlar tek kargo ücretiyle gönderilir 📦',
  '📌 ₺1 başlangıçlı açık artırmalar — kaçırmayın 🔥',
  '📌 Ürünlerin durumu ve kusurları açıklamada yazılı ✅',
];

export const MOD_NAMES = ['mod_selin', 'mod.kaan', 'yardimci_ece', 'mod_burak34'];

/** Moderatörlerin ara ara yazdığı satırlar */
export const MOD_LINES = [
  'Lütfen birbirimize saygılı olalım 🙏',
  'Sorularınızı yazın, satıcımıza iletiyorum 💬',
  'Aynı yayındaki alımlar tek kargoda gelir 📦',
  ...giveawayLines(['Çekilişe katılmak için takip etmeyi unutmayın 🎁']),
  'Teklifler bağlayıcıdır; kurumsal satıcılarda 14 günlük cayma hakkı saklıdır. ⚖️',
  'Yeni gelenler hoş geldiniz! Teklif için tutarı seçip «Teklif ver» düğmesini basılı tutun 👇',
];

/** Kalabalık tepkileri (uçan emojiler) */
export const CROWD_REACTIONS = ['❤️', '🔥', '😍', '👏', '❤️', '💙', '❤️'];
