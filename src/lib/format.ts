/**
 * Türkçe biçimlendirme yardımcıları. Hermes'te Intl desteğine güvenmemek için elle yazıldı.
 */

const MONTHS_SHORT = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
const MONTHS_LONG = [
  'Ocak',
  'Şubat',
  'Mart',
  'Nisan',
  'Mayıs',
  'Haziran',
  'Temmuz',
  'Ağustos',
  'Eylül',
  'Ekim',
  'Kasım',
  'Aralık',
];
const DAYS_SHORT = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
const DAYS_LONG = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

function groupThousands(intPart: string): string {
  return intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/** 1250 → "1.250", 1250.5 → "1.250,50" (decimals verilirse) */
export function formatNumber(value: number, decimals = 0): string {
  const negative = value < 0;
  const fixed = Math.abs(value).toFixed(decimals);
  const [intPart, decPart] = fixed.split('.');
  const out = groupThousands(intPart) + (decPart ? ',' + decPart : '');
  return negative ? '-' + out : out;
}

/**
 * Para biçimi: 1250 → "₺1.250". Kuruşlu tutarlar için `{ cents: true }` → "₺1.250,50".
 * Tam sayı olmayan tutarlar otomatik olarak kuruşlu gösterilir.
 */
export function formatTRY(value: number, opts: { cents?: boolean } = {}): string {
  const showCents = opts.cents ?? !Number.isInteger(Math.round(value * 100) / 100);
  const sign = value < 0 ? '-' : '';
  return `${sign}₺${formatNumber(Math.abs(value), showCents ? 2 : 0)}`;
}

/** Kısa sayı: 950 → "950", 1234 → "1,2B", 28200 → "28,2B", 1500000 → "1,5Mn" */
export function formatCompact(value: number): string {
  const abs = Math.abs(value);
  const fmt = (n: number, suffix: string) => {
    const rounded = n >= 100 ? Math.round(n).toString() : (Math.round(n * 10) / 10).toString();
    return rounded.replace('.', ',') + suffix;
  };
  if (abs >= 1_000_000_000) return fmt(value / 1_000_000_000, 'Mr');
  if (abs >= 1_000_000) return fmt(value / 1_000_000, 'Mn');
  if (abs >= 1_000) return fmt(value / 1_000, 'B');
  return String(value);
}

/** Geçen süre: "şimdi", "5 dk", "3 sa", "2 g", "3 hf", "12 Kas" */
export function timeAgo(input: string | number | Date, now: number = Date.now()): string {
  const t = new Date(input).getTime();
  const diff = Math.max(0, Math.floor((now - t) / 1000));
  if (diff < 45) return 'şimdi';
  if (diff < 3600) return `${Math.max(1, Math.floor(diff / 60))} dk`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} sa`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} g`;
  if (diff < 86400 * 30) return `${Math.floor(diff / (86400 * 7))} hf`;
  const d = new Date(t);
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
}

/** "5 dk önce" gibi uzun hal */
export function timeAgoLong(input: string | number | Date, now: number = Date.now()): string {
  const s = timeAgo(input, now);
  if (s === 'şimdi') return 'az önce';
  if (/^\d+ (dk|sa|g|hf)$/.test(s)) {
    return s.replace(' dk', ' dakika önce').replace(' sa', ' saat önce').replace(' g', ' gün önce').replace(' hf', ' hafta önce');
  }
  return s;
}

function pad2(n: number): string {
  return n < 10 ? '0' + n : String(n);
}

export function formatClock(input: string | number | Date): string {
  const d = new Date(input);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** Planlanmış yayın zamanı: "Bugün 20:00", "Yarın 21:30", "Cmt 19:00", "12 Kas 20:00" */
export function formatShowTime(input: string | number | Date, now: number = Date.now()): string {
  const d = new Date(input);
  const dayDiff = Math.round((startOfDay(d) - startOfDay(new Date(now))) / 86400000);
  const clock = formatClock(d);
  if (dayDiff === 0) return `Bugün ${clock}`;
  if (dayDiff === 1) return `Yarın ${clock}`;
  if (dayDiff === -1) return `Dün ${clock}`;
  if (dayDiff > 1 && dayDiff < 7) return `${DAYS_SHORT[d.getDay()]} ${clock}`;
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${clock}`;
}

/** "12 Kasım 2026" */
export function formatDate(input: string | number | Date): string {
  const d = new Date(input);
  return `${d.getDate()} ${MONTHS_LONG[d.getMonth()]} ${d.getFullYear()}`;
}

/** "12 Kas 2026, 14:05" */
export function formatDateTime(input: string | number | Date): string {
  const d = new Date(input);
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}, ${formatClock(d)}`;
}

/** "Cumartesi, 12 Kasım" */
export function formatDayLong(input: string | number | Date): string {
  const d = new Date(input);
  return `${DAYS_LONG[d.getDay()]}, ${d.getDate()} ${MONTHS_LONG[d.getMonth()]}`;
}

/** "Kasım 2024" — "Katılma: Kasım 2024" gibi */
export function formatMonthYear(input: string | number | Date): string {
  const d = new Date(input);
  return `${MONTHS_LONG[d.getMonth()]} ${d.getFullYear()}`;
}

/** Saniye → "0:07", "1:30", "1:02:05" */
export function formatCountdown(totalSeconds: number): string {
  const s = Math.max(0, Math.ceil(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${pad2(m)}:${pad2(sec)}`;
  return `${m}:${pad2(sec)}`;
}

/** Yayına kalan süre: "2 sa 15 dk", "45 dk", "3 gün" */
export function formatTimeUntil(input: string | number | Date, now: number = Date.now()): string {
  const diff = Math.max(0, Math.floor((new Date(input).getTime() - now) / 1000));
  if (diff < 60) return 'birazdan';
  if (diff < 3600) return `${Math.floor(diff / 60)} dk`;
  if (diff < 86400) {
    const h = Math.floor(diff / 3600);
    const m = Math.floor((diff % 3600) / 60);
    return m > 0 ? `${h} sa ${m} dk` : `${h} sa`;
  }
  return `${Math.floor(diff / 86400)} gün`;
}

/** 5321234567 → "0532 123 45 67" */
export function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '').replace(/^90/, '').replace(/^0/, '');
  if (digits.length !== 10) return raw;
  return `0${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 8)} ${digits.slice(8)}`;
}

/** Kart numarasını maskele: "•••• 4242" */
export function maskCard(last4: string): string {
  return `•••• ${last4}`;
}

/** TR IBAN gösterimi: "TR12 0006 4000 0011 2345 6789 01" */
export function formatIban(iban: string): string {
  return iban.replace(/\s/g, '').replace(/(.{4})/g, '$1 ').trim();
}

/** İlk harfi büyük (Türkçe locale ile) */
export function capitalizeTr(s: string): string {
  if (!s) return s;
  return s.charAt(0).toLocaleUpperCase('tr-TR') + s.slice(1);
}

/** Puan: 4.9 → "4,9" */
export function formatRating(r: number): string {
  return r.toFixed(1).replace('.', ',');
}
