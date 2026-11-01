/**
 * Satıcı tarafı saf yardımcıları: doğrulayıcılar (TCKN, IBAN, vergi no), iş günü / kargo süresi,
 * komisyon seviyesi, hesap hareketleri, analiz verisi, gelen teklifler ve bahşişler (mock türetme).
 * React'ten bağımsızdır; "şimdi" gerektiren her fonksiyon `now` parametresi alır.
 */
import { BUYER_USERS, getMarketplaceProducts, getUser, getUserByUsername } from '@/data';
import { districtsOf, neighborhoodsOf } from '@/data/turkey';
import { TIP_PRESETS } from '@/lib/auction';
import { formatTRY } from '@/lib/format';
import { SELLER_COMMISSION_RATE, SELLER_FEE_TEXT, sellerFees, sellerOrderNet } from '@/lib/pricing';
import { createRng, random } from '@/lib/rng';
import type { LiveSessionSummary } from '@/store/seller';
import type { Carrier, ID, Order, Payout, Product, Show } from '@/types';

import type { ListingStatus, OfferResolution, ShippingLabel } from './store';

const SHARE_PREVIEW = process.env.EXPO_PUBLIC_SHARE_PREVIEW === '1';

export const HOUR = 3_600_000;
export const DAY = 24 * HOUR;

const MONTHS_SHORT = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
const DAYS_SHORT = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];

/** Deterministik string hash (FNV-1a) */
export function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function shortDate(input: number | string | Date): string {
  const d = new Date(input);
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
}

/** 0.08 → "%8", 0.065 → "%6,5" */
export function formatRate(rate: number): string {
  return '%' + String(Math.round(rate * 1000) / 10).replace('.', ',');
}

export function formatPercent(v: number): string {
  return '%' + String(Math.round(v * 1000) / 10).replace('.', ',');
}

// ─── Kimlik / vergi / IBAN doğrulama ─────────────────────────────────────────

/** T.C. Kimlik No: 11 hane, ilk hane 0 olamaz, 10. ve 11. haneler kontrol hanesi */
export function isValidTckn(value: string): boolean {
  if (SHARE_PREVIEW) return /^\d{11}$/.test(value);
  if (!/^[1-9]\d{10}$/.test(value)) return false;
  const d = value.split('').map(Number);
  const odd = d[0] + d[2] + d[4] + d[6] + d[8];
  const even = d[1] + d[3] + d[5] + d[7];
  const d10 = (((odd * 7 - even) % 10) + 10) % 10;
  if (d10 !== d[9]) return false;
  const d11 = d.slice(0, 10).reduce((a, b) => a + b, 0) % 10;
  return d11 === d[10];
}

/** Vergi no: şirketler için 10 hane (VKN), şahıs şirketlerinde TCKN (11 hane) kullanılır */
export function isValidTaxNo(value: string): boolean {
  return /^\d{10}$/.test(value) || isValidTckn(value);
}

/** "GG.AA.YYYY" → yaş (geçersizse null) */
export function ageFromBirthDate(value: string, now: number): number | null {
  const m = value.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!m) return null;
  const day = +m[1];
  const month = +m[2];
  const year = +m[3];
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  const today = new Date(now);
  let age = today.getFullYear() - year;
  if (today.getMonth() < month - 1 || (today.getMonth() === month - 1 && today.getDate() < day)) age -= 1;
  return age;
}

/** Doğum tarihi yazarken otomatik nokta ekle: "01021990" → "01.02.1990" */
export function maskBirthDate(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}.${d.slice(2)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 4)}.${d.slice(4)}`;
}

/** IBAN'ı normalize et: boşluksuz, büyük harf */
export function normalizeIban(value: string): string {
  return value.replace(/\s/g, '').toUpperCase();
}

/** TR IBAN: "TR" + 24 hane, mod-97 kontrolü */
export function isValidIban(value: string): boolean {
  const s = normalizeIban(value);
  if (!/^TR\d{24}$/.test(s)) return false;
  if (SHARE_PREVIEW) return true;
  const rearranged = s.slice(4) + s.slice(0, 4);
  let mod = 0;
  for (const ch of rearranged) {
    const v = /[A-Z]/.test(ch) ? String(ch.charCodeAt(0) - 55) : ch;
    for (const digit of v) mod = (mod * 10 + Number(digit)) % 97;
  }
  return mod === 1;
}

/** IBAN rakam girişi (TR önekinden sonraki 24 hane) gruplu gösterim: "33 0006 1005 …" */
export function groupIbanDigits(digits: string): string {
  const d = digits.replace(/\D/g, '').slice(0, 24);
  if (d.length <= 2) return d;
  return `${d.slice(0, 2)} ${d.slice(2).replace(/(.{4})/g, '$1 ').trim()}`;
}

export function maskIban(iban: string): string {
  const s = normalizeIban(iban);
  if (s.length < 8) return s;
  return `${s.slice(0, 4)} •••• •••• ${s.slice(-4)}`;
}

export function maskTckn(tckn: string): string {
  if (tckn.length < 4) return tckn;
  return `${tckn.slice(0, 2)}•••••••${tckn.slice(-2)}`;
}

const BANK_CODES: Record<string, string> = {
  '00010': 'Ziraat Bankası',
  '00012': 'Halkbank',
  '00015': 'VakıfBank',
  '00032': 'TEB',
  '00046': 'Akbank',
  '00059': 'Şekerbank',
  '00062': 'Garanti BBVA',
  '00064': 'İş Bankası',
  '00067': 'Yapı Kredi',
  '00099': 'ING',
  '00103': 'Fibabanka',
  '00111': 'QNB',
  '00123': 'HSBC',
  '00124': 'Alternatif Bank',
  '00134': 'DenizBank',
  '00135': 'Anadolubank',
  '00146': 'Odeabank',
  '00203': 'Albaraka Türk',
  '00205': 'Kuveyt Türk',
  '00206': 'Türkiye Finans',
  '00209': 'Ziraat Katılım',
  '00210': 'Vakıf Katılım',
};

/** IBAN'daki 5 haneli banka kodundan banka adı */
export function bankFromIban(iban: string): string | undefined {
  const s = normalizeIban(iban);
  if (s.length < 9) return undefined;
  return BANK_CODES[s.slice(4, 9)];
}

// ─── İş günü ve kargo süresi ─────────────────────────────────────────────────

const TR_HOLIDAYS = new Set([
  '2026-01-01', '2026-03-20', '2026-03-21', '2026-03-22', '2026-04-23', '2026-05-01', '2026-05-19', '2026-05-27', '2026-05-28',
  '2026-05-29', '2026-05-30', '2026-07-15', '2026-08-30', '2026-10-29', '2027-01-01', '2027-03-09', '2027-03-10', '2027-03-11',
  '2027-04-23', '2027-05-01', '2027-05-16', '2027-05-17', '2027-05-18', '2027-05-19', '2027-07-15', '2027-08-30', '2027-10-29',
]);

function dayKey(d: Date): string {
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return `${d.getFullYear()}-${m < 10 ? '0' + m : m}-${day < 10 ? '0' + day : day}`;
}

export function isBusinessDay(d: Date): boolean {
  const wd = d.getDay();
  return wd !== 0 && wd !== 6 && !TR_HOLIDAYS.has(dayKey(d));
}

/** `from` tarihinden itibaren n iş günü sonrası (saat korunur) */
export function addBusinessDays(from: number, n: number): Date {
  const cur = new Date(from);
  let count = 0;
  while (count < n) {
    cur.setDate(cur.getDate() + 1);
    if (isBusinessDay(cur)) count += 1;
  }
  return cur;
}

/** Son gönderim: satıştan sonraki 2. iş gününün sonu (Cuma satış → Salı 23:59) */
export function shipDeadline(createdAt: string | number): number {
  const d = addBusinessDays(new Date(createdAt).getTime(), 2);
  d.setHours(23, 59, 0, 0);
  return d.getTime();
}

export type DeadlineTone = 'ok' | 'soon' | 'late';

export function deadlineInfo(createdAt: string, now: number): { deadline: number; left: string; tone: DeadlineTone } {
  const deadline = shipDeadline(createdAt);
  const ms = deadline - now;
  if (ms <= 0) return { deadline, left: 'Gecikti', tone: 'late' };
  const totalMin = Math.floor(ms / 60_000);
  const days = Math.floor(totalMin / 1440);
  const hours = Math.floor((totalMin % 1440) / 60);
  const mins = totalMin % 60;
  const left = days > 0 ? `${days} g ${hours} sa kaldı` : hours > 0 ? `${hours} sa ${mins} dk kaldı` : `${Math.max(1, mins)} dk kaldı`;
  return { deadline, left, tone: ms < DAY ? 'soon' : 'ok' };
}

// ─── Alıcı bilgisi (mock) ────────────────────────────────────────────────────

export type BuyerInfo = { id: string; userId?: string; username: string; displayName: string; avatar?: string; city: string };

const CITIES = ['İstanbul', 'Ankara', 'İzmir', 'Bursa', 'Antalya', 'Kocaeli', 'Eskişehir', 'Konya', 'Adana', 'Trabzon'];
const LAST_NAMES = ['Yılmaz', 'Kaya', 'Demir', 'Şahin', 'Çelik', 'Yıldız', 'Aydın', 'Öztürk', 'Arslan', 'Doğan', 'Kılıç', 'Aslan'];
const STREETS = ['Bağdat Cad.', 'Atatürk Cad.', 'Cumhuriyet Cad.', 'Gül Sok.', 'Lale Sok.', 'Menekşe Sok.', 'İstiklal Cad.', 'Çınar Sok.', 'Papatya Sok.'];
const PLATE: Record<string, string> = { İstanbul: '34', Ankara: '06', İzmir: '35', Bursa: '16', Antalya: '07', Kocaeli: '41', Eskişehir: '26', Konya: '42', Adana: '01', Trabzon: '61', Kayseri: '38' };

/** Sipariş alıcısı: kullanıcı id'si (BUYER_USERS) ya da canlı yayın botunun kullanıcı adı olabilir */
export function resolveBuyer(buyerId: string): BuyerInfo {
  const u = getUser(buyerId) ?? getUserByUsername(buyerId);
  if (u) return { id: buyerId, userId: u.id, username: u.username, displayName: u.displayName, avatar: u.avatar, city: u.city };
  const name = buyerId.replace(/^@/, '');
  return { id: buyerId, username: name, displayName: name, city: CITIES[hashStr(buyerId) % CITIES.length] };
}

export type MockAddress = { fullName: string; phone: string; line: string; neighborhood: string; district: string; city: string; postalCode: string };

/** Alıcının teslimat adresi (mock, deterministik) */
export function buyerAddress(buyer: BuyerInfo): MockAddress {
  const h = hashStr(buyer.id);
  const city = buyer.city || CITIES[h % CITIES.length];
  const districts = districtsOf(city);
  const district = districts[h % districts.length];
  const hoods = neighborhoodsOf(district);
  const first = buyer.displayName.replace(/[._\d]/g, ' ').trim().split(/\s+/)[0] || 'Alıcı';
  const fullName = /\s/.test(buyer.displayName.trim()) ? buyer.displayName : `${first.charAt(0).toLocaleUpperCase('tr-TR')}${first.slice(1)} ${LAST_NAMES[(h >>> 4) % LAST_NAMES.length]}`;
  return {
    fullName,
    phone: `05${(h % 5) + 30} ••• •• ${String(10 + (h % 89)).slice(0, 2)}`,
    line: `${STREETS[(h >>> 6) % STREETS.length]} No: ${(h % 58) + 2} D: ${((h >>> 9) % 18) + 1}`,
    neighborhood: `${hoods[(h >>> 3) % hoods.length]} Mah.`,
    district,
    city,
    postalCode: `${PLATE[city] ?? '34'}${String(100 + ((h >>> 2) % 800)).padStart(3, '0')}`,
  };
}

// ─── Kargo ───────────────────────────────────────────────────────────────────

export const SHIP_CARRIERS: Carrier[] = ['Yurtiçi Kargo', 'Aras Kargo', 'MNG Kargo', 'PTT Kargo', 'Sürat Kargo', 'HepsiJet'];

const CARRIER_PREFIX: Record<Carrier, string> = {
  'Yurtiçi Kargo': 'YK',
  'Aras Kargo': 'AR',
  'MNG Kargo': 'MNG',
  'PTT Kargo': 'PTT',
  'Sürat Kargo': 'SR',
  HepsiJet: 'HJ',
  'Trendyol Express': 'TEX',
};

/** Şubede gösterilecek gönderi kodu: "YK-4829-1736" */
export function makeLabelCode(carrier: Carrier): string {
  return `${CARRIER_PREFIX[carrier]}-${random.int(1000, 9999)}-${random.int(1000, 9999)}`;
}

export type OrderBucket = 'toship' | 'shipped' | 'delivered' | 'cancelled';

export function orderBucket(o: Order): OrderBucket {
  switch (o.status) {
    case 'paid':
    case 'preparing':
      return 'toship';
    case 'shipped':
    case 'out_for_delivery':
      return 'shipped';
    case 'delivered':
      return 'delivered';
    default:
      return 'cancelled';
  }
}

export const SELLER_ORDER_STATUS: Record<Order['status'], string> = {
  paid: 'Kargolanacak',
  preparing: 'Hazırlanıyor',
  shipped: 'Kargoda',
  out_for_delivery: 'Dağıtımda',
  delivered: 'Teslim edildi',
  cancelled: 'İptal edildi',
  return_requested: 'İade talebi',
  refunded: 'İade edildi',
};

export function orderNet(o: Order): number {
  return sellerOrderNet(o);
}

// ─── Envanter ────────────────────────────────────────────────────────────────

export type InventoryTab = 'active' | 'draft' | 'sold' | 'inactive';

export function listingTab(p: Product, statusMap: Record<ID, ListingStatus>): InventoryTab {
  if (p.quantity > 0 && p.sold >= p.quantity) return 'sold';
  return statusMap[p.id] ?? 'active';
}

export function priceLabel(p: Product): string {
  if (p.format === 'giveaway') return 'Çekiliş';
  if (p.format === 'auction') return `Açılış ${formatTRY(p.price)}`;
  return formatTRY(p.price);
}

// ─── Satış komisyonu seviyeleri (28 günlük dönem; kart ücreti seviyeden etkilenmez) ───────────────────────────────────

export type CommissionTier = { level: number; name: string; min: number; rate: number };

export const COMMISSION_TIERS: CommissionTier[] = [
  { level: 0, name: 'Standart', min: 0, rate: SELLER_COMMISSION_RATE },
  { level: 1, name: 'Seviye 1', min: 100_000, rate: 0.045 },
  { level: 2, name: 'Seviye 2', min: 250_000, rate: 0.04 },
  { level: 3, name: 'Seviye 3', min: 500_000, rate: 0.035 },
];

export const PERIOD_DAYS = 28;

function tierFor(sales: number): CommissionTier {
  let t = COMMISSION_TIERS[0];
  for (const tier of COMMISSION_TIERS) if (sales >= tier.min) t = tier;
  return t;
}

function isCountable(o: Order): boolean {
  return o.status !== 'cancelled' && o.status !== 'refunded';
}

export type TierProgress = {
  current: CommissionTier;
  earned: CommissionTier;
  next?: CommissionTier;
  sales: number;
  projected: number;
  daysElapsed: number;
  periodEnd: number;
  progress: number;
  remaining: number;
};

export function tierProgress(orders: Order[], anchorISO: string | undefined, now: number): TierProgress {
  const anchor = anchorISO ? new Date(anchorISO).getTime() : now;
  const period = PERIOD_DAYS * DAY;
  const idx = Math.max(0, Math.floor((now - anchor) / period));
  const periodStart = anchor + idx * period;
  const sumBetween = (a: number, b: number) =>
    orders.filter((o) => isCountable(o)).reduce((sum, o) => {
      const t = new Date(o.createdAt).getTime();
      return t >= a && t < b ? sum + o.itemPrice * o.quantity : sum;
    }, 0);
  const sales = sumBetween(periodStart, now + 1);
  const previous = idx > 0 ? sumBetween(periodStart - period, periodStart) : 0;
  const daysElapsed = Math.min(PERIOD_DAYS, Math.max(1, Math.ceil((now - periodStart) / DAY)));
  const projected = Math.round((sales / daysElapsed) * PERIOD_DAYS);
  const current = tierFor(previous);
  const earned = tierFor(sales);
  const next = COMMISSION_TIERS.find((t) => t.level === earned.level + 1);
  return {
    current,
    earned,
    next,
    sales,
    projected,
    daysElapsed,
    periodEnd: periodStart + period,
    progress: next ? Math.min(1, sales / next.min) : 1,
    remaining: next ? Math.max(0, next.min - sales) : 0,
  };
}

/** Yeni satıcı kampanyası: onaydan sonraki 30 gün satış komisyonu iadesi (kart ücreti iade edilmez) */
export function inLaunchCampaign(approvedAt: string | undefined, at: string | number): boolean {
  if (!approvedAt) return false;
  const start = new Date(approvedAt).getTime();
  const t = new Date(at).getTime();
  return t >= start - DAY && t <= start + 30 * DAY;
}

// ─── Ödemeler ve hesap hareketleri ───────────────────────────────────────────

export function payoutArrival(p: Payout): number {
  const d = addBusinessDays(new Date(p.createdAt).getTime(), 1);
  return d.getTime();
}

export function payoutDisplay(p: Payout, now: number): { label: string; tone: 'success' | 'warning'; arrival: number } {
  const arrival = payoutArrival(p);
  if (p.status === 'paid' || now >= arrival) return { label: 'Hesabına geçti', tone: 'success', arrival };
  return { label: 'İşleniyor', tone: 'warning', arrival };
}

export type LedgerKind = 'sale' | 'commission' | 'card_fee' | 'shipping_in' | 'shipping_out' | 'payout';

export type LedgerEntry = {
  id: string;
  at: number;
  kind: LedgerKind;
  title: string;
  subtitle: string;
  amount: number;
  status: 'processing' | 'completed';
  orderId?: ID;
};

export function buildLedger(orders: Order[], payouts: Payout[], labels: Record<ID, ShippingLabel>, now: number): LedgerEntry[] {
  const out: LedgerEntry[] = [];
  orders.forEach((o) => {
    if (!isCountable(o)) return;
    const t = new Date(o.createdAt).getTime();
    const status: LedgerEntry['status'] = orderBucket(o) === 'toship' ? 'processing' : 'completed';
    const gross = o.itemPrice * o.quantity;
    const fees = sellerFees(gross);
    const sub = `${o.number} · ${o.productTitle}`;
    if (gross > 0) out.push({ id: `${o.id}_sale`, at: t, kind: 'sale', title: 'Satış', subtitle: sub, amount: gross, status, orderId: o.id });
    if (fees.commission > 0) out.push({ id: `${o.id}_com`, at: t + 1, kind: 'commission', title: SELLER_FEE_TEXT.commissionLabel, subtitle: sub, amount: -fees.commission, status, orderId: o.id });
    if (fees.cardFee > 0) out.push({ id: `${o.id}_card`, at: t + 2, kind: 'card_fee', title: SELLER_FEE_TEXT.cardFeeLabel, subtitle: sub, amount: -fees.cardFee, status, orderId: o.id });
    const label = labels[o.id];
    const shippedEvent = o.timeline.find((e) => e.status === 'shipped');
    if (o.shippingCost > 0 && (label || shippedEvent)) {
      const at = label ? new Date(label.createdAt).getTime() : new Date(shippedEvent!.at).getTime();
      out.push({ id: `${o.id}_shin`, at, kind: 'shipping_in', title: 'Kargo ücreti (alıcıdan)', subtitle: sub, amount: o.shippingCost, status: 'completed', orderId: o.id });
      out.push({ id: `${o.id}_shout`, at: at + 1, kind: 'shipping_out', title: `Kargo etiketi · ${label?.carrier ?? o.carrier ?? 'Kargo'}`, subtitle: sub, amount: -o.shippingCost, status: 'completed', orderId: o.id });
    }
    // Satıcının karşıladığı kargo (kargo dahil ilan, ücretsiz kargo eşiği, çekiliş ödülü ya da paket farkı): satışla birlikte bakiyeden düşer
    const ownShipping = o.sellerShippingCost ?? 0;
    if (ownShipping > 0) {
      const title =
        o.source === 'giveaway' ? 'Kargo · çekiliş ödülü' : o.shippingNote === 'threshold' ? 'Kargo · ücretsiz kargo eşiği' : o.shippingNote === 'included' ? 'Kargo · ilanda kargo dahil' : 'Kargo · paket farkı';
      out.push({ id: `${o.id}_shown`, at: t + 3, kind: 'shipping_out', title, subtitle: sub, amount: -ownShipping, status, orderId: o.id });
    }
  });
  payouts.forEach((p) => {
    const d = payoutDisplay(p, now);
    out.push({
      id: `${p.id}_po`,
      at: new Date(p.createdAt).getTime(),
      kind: 'payout',
      title: 'Para çekme',
      subtitle: `IBAN ${maskIban(p.iban)}`,
      amount: -p.amount,
      status: d.tone === 'success' ? 'completed' : 'processing',
    });
  });
  return out.sort((a, b) => b.at - a.at);
}

// ─── Gelen fiyat teklifleri (mock) ───────────────────────────────────────────

export type IncomingOffer = {
  id: ID;
  listing: Product;
  buyer: BuyerInfo;
  amount: number;
  createdAt: number;
  status: 'pending' | 'accepted' | 'declined' | 'countered';
  counter?: number;
};

/** Teklif kabul eden aktif Hemen Al ilanlarına zamanla alıcı teklifleri "gelir" */
export function deriveOffers(
  listings: Product[],
  statusMap: Record<ID, ListingStatus>,
  resolutions: Record<ID, OfferResolution>,
  now: number,
): IncomingOffer[] {
  const out: IncomingOffer[] = [];
  listings.forEach((p) => {
    if (p.format !== 'buy_now' || !p.acceptsOffers || p.price < 20) return;
    const h = hashStr(p.id);
    const count = (h % 3) + (p.price >= 500 ? 1 : 0);
    for (let i = 0; i < count; i++) {
      const id = `${p.id}_of${i}`;
      const resolution = resolutions[id];
      const createdAt = new Date(p.createdAt).getTime() + (i + 1) * (2 + ((h >>> (i + 2)) % 9)) * 60_000;
      if (createdAt > now) continue;
      const tab = listingTab(p, statusMap);
      if (!resolution && tab !== 'active') continue;
      const pct = 0.7 + ((h >>> (i * 3)) % 20) / 100;
      const step = p.price >= 1000 ? 50 : p.price >= 200 ? 10 : 5;
      const amount = Math.max(step, Math.round((p.price * pct) / step) * step);
      const buyerUser = BUYER_USERS[(h + i * 7) % BUYER_USERS.length];
      out.push({
        id,
        listing: p,
        buyer: resolveBuyer(buyerUser.id),
        amount,
        createdAt,
        status: resolution?.status ?? 'pending',
        counter: resolution?.counter,
      });
    }
  });
  return out.sort((a, b) => b.createdAt - a.createdAt);
}

// ─── Bahşişler (mock) ────────────────────────────────────────────────────────

export type TipItem = { id: string; buyer: BuyerInfo; amount: number; message: string; at: number; showTitle: string };

const TIP_MESSAGES = ['Harika yayındı ❤️', 'Kolay gelsin!', 'Hızlı kargo için teşekkürler 📦', 'Efsane ürünler 🔥', "Bursa'dan selamlar 👋", 'Yine bekleriz!', 'Paketleme çok özenliydi 🙏'];

export function deriveTips(sessions: LiveSessionSummary[], shows: Show[]): TipItem[] {
  const out: TipItem[] = [];
  sessions.forEach((s) => {
    const h = hashStr(s.id);
    const count = (h % 4) + (s.peakViewers > 50 ? 1 : 0);
    const title = shows.find((x) => x.id === s.showId)?.title ?? 'Canlı yayın';
    for (let i = 0; i < count; i++) {
      const buyerUser = BUYER_USERS[(h >>> i) % BUYER_USERS.length];
      out.push({
        id: `${s.id}_tip${i}`,
        buyer: resolveBuyer(buyerUser.id),
        amount: TIP_PRESETS[(h >>> (i + 3)) % 4],
        message: TIP_MESSAGES[(h >>> (i + 1)) % TIP_MESSAGES.length],
        at: new Date(s.startedAt).getTime() + (i + 1) * 7 * 60_000,
        showTitle: title,
      });
    }
  });
  return out.sort((a, b) => b.at - a.at);
}

// ─── Hesap sağlığı ───────────────────────────────────────────────────────────

export type HealthMetrics = { sample: number; onTime: number | null; cancelFree: number | null; refundFree: number | null; avgShipDays: number | null };

export function accountHealth(orders: Order[]): HealthMetrics {
  const sample = orders.length;
  if (!sample) return { sample, onTime: null, cancelFree: null, refundFree: null, avgShipDays: null };
  const shipped = orders
    .map((o) => ({ o, ev: o.timeline.find((e) => e.status === 'shipped') }))
    .filter((x) => !!x.ev);
  const onTimeCount = shipped.filter((x) => new Date(x.ev!.at).getTime() <= shipDeadline(x.o.createdAt)).length;
  const avg = shipped.length
    ? shipped.reduce((s, x) => s + (new Date(x.ev!.at).getTime() - new Date(x.o.createdAt).getTime()) / DAY, 0) / shipped.length
    : null;
  const cancelled = orders.filter((o) => o.status === 'cancelled').length;
  const refunded = orders.filter((o) => o.status === 'refunded' || o.status === 'return_requested').length;
  return {
    sample,
    onTime: shipped.length ? onTimeCount / shipped.length : null,
    cancelFree: 1 - cancelled / sample,
    refundFree: 1 - refunded / sample,
    avgShipDays: avg === null ? null : Math.round(avg * 10) / 10,
  };
}

// ─── Yayın planlama: gün ve saat seçenekleri ─────────────────────────────────

export type DayOption = { key: string; top: string; bottom: string; date: number };

export function dayOptions(now: number, count = 14): DayOption[] {
  const base = new Date(now);
  base.setHours(0, 0, 0, 0);
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    return {
      key: dayKey(d),
      top: i === 0 ? 'Bugün' : i === 1 ? 'Yarın' : DAYS_SHORT[d.getDay()],
      bottom: `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`,
      date: d.getTime(),
    };
  });
}

export function dayKeyOf(ts: number): string {
  return dayKey(new Date(ts));
}

export type TimeSlot = { key: string; label: string; minutes: number };

/** 30 dakikalık saat dilimleri; bugünse en az 15 dk sonrası */
export function timeSlots(dayStart: number, now: number): TimeSlot[] {
  const out: TimeSlot[] = [];
  for (let m = 0; m < 24 * 60; m += 30) {
    const ts = dayStart + m * 60_000;
    if (ts < now + 15 * 60_000) continue;
    const hh = Math.floor(m / 60);
    const mm = m % 60;
    const label = `${hh < 10 ? '0' + hh : hh}:${mm === 0 ? '00' : mm}`;
    out.push({ key: label, label, minutes: m });
  }
  return out;
}

// ─── Analizler ───────────────────────────────────────────────────────────────

export type AnalyticsKpis = { sales: number; orders: number; aov: number; viewers: number; followers: number; net: number };
export type AnalyticsBar = { key: string; label: string; value: number; orders: number; isCurrent: boolean };
export type TopProduct = { id: string; title: string; image?: string; count: number; revenue: number };
export type ShowRow = { id: string; title: string; date: number; gross: number; items: number; viewers: number; durationMin: number };

export type Analytics = {
  demo: boolean;
  kpis: AnalyticsKpis;
  previous: AnalyticsKpis;
  bars: AnalyticsBar[];
  topProducts: TopProduct[];
  shows: ShowRow[];
};

type SaleLike = { at: number; amount: number; qty: number; net: number; productId: string; title: string; image?: string };
type SessionLike = { id: string; title: string; at: number; gross: number; items: number; viewers: number; durationMin: number };

const DEMO_SHOW_TITLES = ["🔥 ₺1'den Başlayan Gece Mezatı", 'Pazar Akşamı Koleksiyon Saati', 'Yeni Gelenler Özel ⚡', 'Hafta Sonu Fırsatları 🎁', 'Kapalı Kutu Ürünler Gecesi 🎉'];

function demoData(now: number): { sales: SaleLike[]; sessions: SessionLike[] } {
  const rng = createRng(4242);
  const products = getMarketplaceProducts().slice(0, 8);
  const sales: SaleLike[] = [];
  for (let d = 0; d < 60; d++) {
    const n = rng.int(0, d % 7 === 5 || d % 7 === 6 ? 6 : 3);
    for (let i = 0; i < n; i++) {
      const p = rng.pick(products);
      const amount = Math.round(rng.float(0.5, 1.4) * Math.min(p.price, 4000));
      sales.push({ at: now - d * DAY - rng.int(1, 20) * HOUR, amount, qty: 1, net: sellerFees(amount).net, productId: p.id, title: p.title, image: p.images[0] });
    }
  }
  const sessions: SessionLike[] = DEMO_SHOW_TITLES.map((title, i) => ({
    id: `demo_s${i}`,
    title,
    at: now - (i * 6 + 1) * DAY,
    gross: rng.int(2500, 18000),
    items: rng.int(8, 46),
    viewers: rng.int(40, 420),
    durationMin: rng.int(45, 150),
  }));
  return { sales, sessions };
}

export function buildAnalytics(orders: Order[], sessions: LiveSessionSummary[], shows: Show[], periodDays: 7 | 28, now: number): Analytics {
  const real = orders.length > 0 || sessions.length > 0;
  const data = real
    ? {
        sales: orders.filter(isCountable).map<SaleLike>((o) => ({
          at: new Date(o.createdAt).getTime(),
          amount: o.itemPrice * o.quantity,
          qty: o.quantity,
          net: orderNet(o),
          productId: o.productId,
          title: o.productTitle,
          image: o.productImage,
        })),
        sessions: sessions.map<SessionLike>((s) => ({
          id: s.id,
          title: shows.find((x) => x.id === s.showId)?.title ?? 'Canlı yayın',
          at: new Date(s.startedAt).getTime(),
          gross: s.gross,
          items: s.itemsSold,
          viewers: s.peakViewers,
          durationMin: Math.max(1, Math.round((new Date(s.endedAt).getTime() - new Date(s.startedAt).getTime()) / 60_000)),
        })),
      }
    : demoData(now);

  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);
  const end = dayStart.getTime() + DAY;
  const start = end - periodDays * DAY;
  const prevStart = start - periodDays * DAY;

  const kpisBetween = (a: number, b: number): AnalyticsKpis => {
    const s = data.sales.filter((x) => x.at >= a && x.at < b);
    const sess = data.sessions.filter((x) => x.at >= a && x.at < b);
    const sales = s.reduce((sum, x) => sum + x.amount, 0);
    const viewers = sess.reduce((sum, x) => sum + x.viewers, 0);
    return {
      sales,
      orders: s.length,
      aov: s.length ? Math.round(sales / s.length) : 0,
      viewers,
      followers: sess.reduce((sum, x) => sum + Math.round(x.viewers * 0.12 + (hashStr(x.id) % 5)), 0),
      net: Math.round(s.reduce((sum, x) => sum + x.net, 0) * 100) / 100,
    };
  };

  const bars: AnalyticsBar[] = [];
  if (periodDays === 7) {
    for (let i = 6; i >= 0; i--) {
      const a = dayStart.getTime() - i * DAY;
      const s = data.sales.filter((x) => x.at >= a && x.at < a + DAY);
      const d = new Date(a);
      bars.push({ key: dayKey(d), label: i === 0 ? 'Bugün' : DAYS_SHORT[d.getDay()], value: s.reduce((sum, x) => sum + x.amount, 0), orders: s.length, isCurrent: i === 0 });
    }
  } else {
    for (let w = 3; w >= 0; w--) {
      const a = end - (w + 1) * 7 * DAY;
      const s = data.sales.filter((x) => x.at >= a && x.at < a + 7 * DAY);
      bars.push({ key: `w${w}`, label: shortDate(a), value: s.reduce((sum, x) => sum + x.amount, 0), orders: s.length, isCurrent: w === 0 });
    }
  }

  const byProduct = new Map<string, TopProduct>();
  data.sales
    .filter((x) => x.at >= start && x.at < end)
    .forEach((x) => {
      const cur = byProduct.get(x.productId) ?? { id: x.productId, title: x.title, image: x.image, count: 0, revenue: 0 };
      cur.count += x.qty;
      cur.revenue += x.amount;
      byProduct.set(x.productId, cur);
    });

  return {
    demo: !real,
    kpis: kpisBetween(start, end),
    previous: kpisBetween(prevStart, start),
    bars,
    topProducts: [...byProduct.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 5),
    shows: [...data.sessions]
      .sort((a, b) => b.at - a.at)
      .slice(0, 10)
      .map((s) => ({ id: s.id, title: s.title, date: s.at, gross: s.gross, items: s.items, viewers: s.viewers, durationMin: s.durationMin })),
  };
}

/** Değişim yüzdesi: önceki 0 ise null */
export function delta(current: number, previous: number): number | null {
  if (!previous) return current > 0 ? null : 0;
  return (current - previous) / previous;
}
