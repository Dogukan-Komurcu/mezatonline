/**
 * Sahte / taklit ürün önlemleri: ilan ve yayın metinlerinde yasaklı ifade taraması,
 * orijinallik belgesi gerektiren kategori ve markalar, kademeli yaptırım metinleri.
 *
 * Dayanak (özet): taklit markalı ürünü satışa sunmak SMK md. 29/30 kapsamında tecavüz ve suçtur;
 * "replika", "A kalite", "muadil" gibi ifadeler ürünü bir markanın kopyası olarak sunduğu için
 * ayrıca Reklam Yönetmeliği md. 12/2 ve 8/1-a'ya aykırıdır. Platform hukuka aykırılıktan haberdar
 * olunca içeriği kaldırmakla yükümlüdür (6563 md. 9/2). Bu filtre ilk savunma hattıdır; tek başına
 * yeterli değildir (yayın içi moderasyon ve hak sahibi şikâyetleri ayrıca işlenir).
 */
import type { ProofKind } from '@/types';

export type PhraseHit = { term: string; kind: 'banned' | 'brand' | 'claim' };

/** Türkçe karakterleri sadeleştirip küçük harfe çevirir: "İHRAÇ Fazlası" → "ihrac fazlasi" */
export function normalizeText(s: string): string {
  return s
    .toLocaleLowerCase('tr-TR')
    .replace(/[ıîì]/g, 'i')
    .replace(/[şș]/g, 's')
    .replace(/ğ/g, 'g')
    .replace(/[üûù]/g, 'u')
    .replace(/[öô]/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[âàá]/g, 'a')
    .replace(/[éèê]/g, 'e')
    .replace(/[’'`´]/g, '')
    .replace(/\s+/g, ' ');
}

type Rule = { re: RegExp; term: string };

/** Her zaman yasak: ürünü taklit / kopya olarak sunan ifadeler */
const BANNED: Rule[] = [
  { re: /\brepli[ck]a\w*/g, term: 'replika' },
  { re: /\bmuadil\w*/g, term: 'muadil' },
  // "çakmak" (ateş) ve çekimleri hariç
  { re: /\bcakma(?![kg])\w*/g, term: 'çakma' },
  { re: /\b(super\s*)?fake\b/g, term: 'fake' },
  { re: /\bdupe\w*/g, term: 'dupe' },
  // "Clone Trooper", "Clone Wars", "Klon Savaşları" gibi oyuncak / film adları hariç
  { re: /\b(klon|clone)\b(?!\s*(trooper|wars|asker|savas))/g, term: 'klon' },
  { re: /\bproxy\b/g, term: 'proxy' },
  { re: /\b(a{1,3}\+*|a plus|master|mirror)\s*(kalite\w*|quality)/g, term: 'A kalite' },
  { re: /\b1\s*[:/]\s*1\s*(kalite\w*|kopya\w*|replika\w*|orijinal\w*|orjinal\w*)/g, term: '1:1 kalite' },
  { re: /\b(orijinal|orjinal)\s*(kalitesinde|ayarinda)\b/g, term: 'orijinal kalitesinde' },
  { re: /\bbire\s?bir\s*(kopya\w*|replika\w*|kalite\w*)/g, term: 'birebir kopya' },
  { re: /\b(taklit|kopya)\s*(urun|saat|canta|ayakkabi|parfum|kalite)\w*/g, term: 'taklit ürün' },
];

/** Yasak değil ama belge gerektiren iddialar (TTK md. 55/1-a-2: stok hakkında yanıltıcı açıklama) */
const CLAIMS: Rule[] = [
  { re: /\bihrac(at)?\s*(fazla\w*|urunu\w*)/g, term: 'ihraç fazlası' },
  { re: /\bfabrika\s*(fazla\w*|cikis\w*)/g, term: 'fabrika fazlası' },
];

type Brand = { name: string; re: RegExp; /** Yalnızca bu kategorilerde say (yoksa her yerde) */ scope?: string[] };

const FASHION = ['womens_fashion', 'mens_fashion', 'sneakers', 'bags', 'sports_memorabilia', 'vintage', 'deals'];

const brand = (name: string, re: RegExp, scope?: string[]): Brand => ({ name, re, scope });

/** Taklidi yaygın, orijinallik belgesi istenen markalar (tam liste değildir; gerçek sürümde sunucudan güncellenir) */
const BRANDS: Brand[] = [
  brand('Louis Vuitton', /\blouis\s*vuitton\b/g),
  brand('Gucci', /\bgucci\b/g),
  brand('Prada', /\bprada\b/g),
  brand('Chanel', /\bchanel\b/g),
  brand('Hermès', /\bhermes\b/g),
  brand('Dior', /\bdior\b/g),
  brand('Fendi', /\bfendi\b/g),
  brand('Balenciaga', /\bbalenciaga\b/g),
  brand('Burberry', /\bburberry\b/g),
  brand('Versace', /\bversace\b/g),
  brand('Givenchy', /\bgivenchy\b/g),
  brand('Saint Laurent', /\b(saint\s*laurent|ysl)\b/g),
  brand('Bottega Veneta', /\bbottega\b/g),
  brand('Miu Miu', /\bmiu\s*miu\b/g),
  brand('Moncler', /\bmoncler\b/g),
  brand('Stone Island', /\bstone\s*island\b/g),
  brand('Canada Goose', /\bcanada\s*goose\b/g),
  // "off white" aynı zamanda renk adı; yalnızca marka bağlamı varsa say (c/o Virgil, Industrial kemer, Out of Office…)
  brand('Off-White', /\boff[\s-]*white\s*(c\s*\/\s*o|virgil|abloh|industrial|out\s*of\s*office|odsy)\b/g),
  brand('Lacoste', /\blacoste\b/g),
  brand('Ralph Lauren', /\bralph\s*lauren\b/g),
  brand('Michael Kors', /\bmichael\s*kors\b/g),
  brand('Ray-Ban', /\bray[\s-]*ban\b/g),
  brand('Cartier', /\bcartier\b/g),
  brand('Bvlgari', /\b(bvlgari|bulgari)\b/g),
  brand('Tiffany', /\btiffany\b/g),
  brand('Rolex', /\brolex\b/g),
  brand('Omega', /\bomega\s*(seamaster|speedmaster|constellation|saat)/g),
  brand('Patek Philippe', /\bpatek\b/g),
  brand('Audemars Piguet', /\baudemars\b/g),
  brand('Hublot', /\bhublot\b/g),
  brand('TAG Heuer', /\btag\s*heuer\b/g),
  brand('Breitling', /\bbreitling\b/g),
  brand('Nike', /\bnike\b/g),
  brand('Air Jordan', /\b(air\s*)?jordan\s*\d/g, FASHION),
  brand('Adidas', /\badidas\b/g),
  brand('Yeezy', /\byeezy\b/g),
  brand('New Balance', /\bnew\s*balance\b/g),
  brand('Tom Ford', /\btom\s*ford\b/g),
  brand('Creed', /\bcreed\s*(aventus|parfum|edp|edt)/g),
  brand('Baccarat Rouge', /\bbaccarat\s*rouge\b/g),
  brand('Jo Malone', /\bjo\s*malone\b/g),
  brand('Dyson', /\bdyson\b/g),
  brand('AirPods', /\bair\s*pods?\b/g),
  brand('Apple Watch', /\bapple\s*watch\b/g),
  brand('Galatasaray', /\bgalatasaray\b/g, FASHION),
  brand('Fenerbahçe', /\bfenerbahce\b/g, FASHION),
  brand('Beşiktaş', /\bbesiktas\b/g, FASHION),
  brand('Trabzonspor', /\btrabzonspor\b/g, FASHION),
];

/**
 * Markadan sonra gelince taklit izlenimi veren ifadeler.
 * - Güçlü ifadeler markanın hemen ardından ya da yalnızca boşlukla ayrılmış 1–3 kelimeden sonra
 *   sayılır ("Dior Sauvage kokusu"); virgül araya girerse sayılmaz ("Dior Sauvage EDT, kokusu kalıcı").
 * - "model" ve "kalite" yalnızca markanın hemen ardından gelirse sayılır ("Rolex model saat");
 *   alan etiketi ("Model: Air Max"), "model no/numarası/kodu" ve model kodu ("model A2770") hariç.
 */
const BRAND_MARKER_STRONG = /^(?:\W{0,3}|(?: \w+){1,3} )(tarzi|benzeri|kokusu|esintili|ilhamli|inspired|birebir|kopya\w*|kalitesinde)/;
const BRAND_MARKER_DIRECT = /^\W{0,3}(model|kalite)\b(?!\s?[:=]|\s?(no|numarasi|kodu)\b|\s?[a-z]{0,3}\d)/;

/** Normalize edilmiş işaret kelimesinin kullanıcıya gösterilecek hâli */
const MARKER_LABEL: Record<string, string> = { tarzi: 'tarzı', ilhamli: 'ilhamlı' };
const markerLabel = (w: string) => (w.startsWith('kopya') ? 'kopyası' : (MARKER_LABEL[w] ?? w));

function negated(text: string, end: number): boolean {
  // "replika değildir", "replika veya çakma değildir", "replika, çakma ya da taklit değildir"
  return /^\W{0,3}(?:(?:,\s*|\b(?:ve|veya|ya da|yahut)\s+)\w+\W{1,3}){0,4}(?:\w+\W{1,3})?degil/.test(text.slice(end, end + 60));
}

function collect(text: string, rules: Rule[], kind: PhraseHit['kind'], out: PhraseHit[]) {
  for (const r of rules) {
    r.re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = r.re.exec(text))) {
      if (!negated(text, m.index + m[0].length) && !out.some((h) => h.term === r.term)) out.push({ term: r.term, kind });
      if (m[0].length === 0) r.re.lastIndex++;
    }
  }
}

export type ScanResult = {
  /** Yayınlanmasına izin verilmeyen ifadeler (yasaklı kelimeler + "marka + model/kokusu" kalıpları) */
  banned: PhraseHit[];
  /** Belge gerektiren iddialar ("ihraç fazlası") */
  claims: PhraseHit[];
  /** Metinde geçen ve belge gerektiren markalar */
  brands: string[];
};

/** İlan / yayın metinlerini tarar. categoryId verilirse kategoriye özel markalar da sayılır. */
export function scanText(texts: string[], categoryId?: string): ScanResult {
  const text = normalizeText(texts.filter(Boolean).join(' \n '));
  const banned: PhraseHit[] = [];
  const claims: PhraseHit[] = [];
  collect(text, BANNED, 'banned', banned);
  collect(text, CLAIMS, 'claim', claims);
  const brands: string[] = [];
  for (const b of BRANDS) {
    if (b.scope && (!categoryId || !b.scope.includes(categoryId))) continue;
    b.re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = b.re.exec(text))) {
      if (!brands.includes(b.name)) brands.push(b.name);
      const after = text.slice(m.index + m[0].length, m.index + m[0].length + 40);
      const marker = BRAND_MARKER_DIRECT.exec(after) ?? BRAND_MARKER_STRONG.exec(after);
      if (marker && !negated(text, m.index + m[0].length + marker[0].length)) {
        const term = `${b.name} ${markerLabel(marker[1])}`;
        if (!banned.some((h) => h.term === term)) banned.push({ term, kind: 'brand' });
      }
    }
  }
  return { banned, claims, brands };
}

/** Yasaklı ifade uyarısı: "“replika”, “A kalite” ifadeleri kullanılamaz…" */
export function bannedMessage(hits: PhraseHit[]): string | undefined {
  if (!hits.length) return undefined;
  const shown = hits.slice(0, 3);
  const list = shown.map((h) => `“${h.term}”`).join(', ');
  return `${list} ${shown.length > 1 ? 'ifadeleri' : 'ifadesi'} kullanılamaz. Replika, taklit ya da başka bir markanın kopyası olarak sunulan ürünler Mezatonline'da satılamaz.`;
}

/** Orijinallik belgesi istenen alt kategoriler */
export const HIGH_RISK_SUBCATEGORIES: Record<string, string> = {
  jordan: 'Sneaker',
  nike: 'Sneaker',
  adidas: 'Sneaker',
  newbalance: 'Sneaker',
  luxury_women: 'Lüks marka giyim',
  luxury_bags: 'Lüks çanta',
  luxury_watches: 'Lüks saat',
  fragrance: 'Parfüm',
  makeup: 'Makyaj',
  jerseys: 'Forma',
  signed: 'İmzalı ürün',
};

export type AuthenticityRequirement = {
  required: boolean;
  /** Kullanıcıya gösterilecek gerekçeler: "Kategori: Lüks çanta", "Marka: Chanel", "“ihraç fazlası” iddiası" */
  reasons: string[];
  scan: ScanResult;
};

/** Bu ilan orijinallik belgesi gerektiriyor mu? */
export function authenticityRequirement(input: { categoryId?: string; subcategoryId?: string; title: string; description?: string }): AuthenticityRequirement {
  const scan = scanText([input.title, input.description ?? ''], input.categoryId);
  const reasons: string[] = [];
  const sub = input.subcategoryId ? HIGH_RISK_SUBCATEGORIES[input.subcategoryId] : undefined;
  if (sub) reasons.push(`Kategori: ${sub}`);
  if (scan.brands.length) reasons.push(`Marka: ${scan.brands.slice(0, 3).join(', ')}`);
  scan.claims.forEach((c) => reasons.push(`“${c.term}” iddiası`));
  return { required: reasons.length > 0, reasons, scan };
}

export const PROOF_KINDS: { key: ProofKind; label: string; hint: string }[] = [
  { key: 'invoice', label: 'Fatura / e-Arşiv', hint: 'Yetkili satıcıdan ya da markadan alındığını gösteren fatura' },
  { key: 'receipt', label: 'Satın alma belgesi', hint: 'Sipariş özeti, fiş veya mağaza kaydı' },
  { key: 'certificate', label: 'Orijinallik sertifikası', hint: 'Marka kartı, bağımsız doğrulama raporu ya da imza sertifikası (COA)' },
  { key: 'dealer', label: 'Yetkili satıcı belgesi', hint: 'Distribütör veya bayi sözleşmesi, tedarik zinciri belgeleri' },
];

export const PROOF_KIND_LABEL: Record<ProofKind, string> = Object.fromEntries(PROOF_KINDS.map((k) => [k.key, k.label])) as Record<ProofKind, string>;

/** Demo örnek belgesi ("sample:Fatura-…") mı? */
export const isSampleDoc = (uri: string) => uri.startsWith('sample:');

/** Satıcının orijinallik beyanı (belge bölümündeki onay kutusu) */
export const AUTHENTICITY_DECLARATION =
  'Ürünün orijinal olduğunu ve gerektiğinde fatura veya tedarik zinciri belgeleriyle hak sahibine kadar ispatlayabileceğimi beyan ederim.';

/** Kademeli yaptırım (satıcı sözleşmesi ve kurallarda aynı metin) */
export const STRIKE_POLICY: string[] = [
  '1. ihlal: ilan kaldırılır, satıcı uyarılır ve kurallar hakkında bilgilendirilir.',
  '2. ihlal: 30 gün boyunca belge gerektiren kategorilerde ve marka geçen ilanlarda satış kısıtlanır; ilgili siparişlerin ödemeleri inceleme bitene kadar bekletilir.',
  '3. ihlal ya da bilerek taklit ürün satışı: hesap kalıcı olarak kapatılır, ilgili ödemeler inceleme sonuna kadar bekletilir ve durum yetkili kamu kurumlarına bildirilir.',
];

/** Hak sahibi şikâyetine ilişkin süreler (6563 md. 9/3, ETAHS Yönetmeliği md. 12–14) */
export const IP_PROCESS = {
  takedownHours: 48,
  reinstateHours: 24,
} as const;
