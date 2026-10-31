/**
 * Mezatonline renk paleti — "Çini turkuazı ve bakır" (bkz. docs/TASARIM-KIMLIGI.md, sürüm 1.0).
 * - Turkuaz (çini): birincil eylemler, seçili durumlar, marka simgesi.
 * - Bakır: ikincil vurgu; sadakat (Müdavim Kartı), ödül ve öne çıkan etiketler.
 * - Gece laciverti nötrler: saf griler yerine hafif mavi tonlu yüzeyler ve metinler.
 *
 * Ekranlarda asla sabit renk kodu kullanma — her zaman `useTheme().colors` üzerinden token kullan.
 * Birincil zemin üstündeki metin/ikon her zaman `onPrimary` (beyaz) olmalı.
 * Canlı yayın ekranı her zaman koyu temadır: `liveColors` kullan.
 * Tema tokenları 6 haneli hex olarak kalmalı (withAlpha / tint yardımcıları bunu bekler); `overlay` hariç.
 */

const PRIMARY = '#0D9488';
const PRIMARY_PRESSED = '#0B7C72';
const PRIMARY_SOFT = '#CCF0EC';

export const brand = {
  /** Marka turkuazı (açık tema birincil) */
  primary: PRIMARY,
  primaryPressed: PRIMARY_PRESSED,
  primarySoft: PRIMARY_SOFT,
  /** Koyu zeminde parlak turkuaz (video üstü vurgular, ilerleme) */
  primaryBright: '#2DD4BF',
  /** Bakır vurgu */
  copper: '#C2703D',
  copperSoft: '#F6E3D6',
  /** Gece laciverti (en koyu nötr) */
  ink: '#0E1116',
  white: '#FFFFFF',
  /** Nar kırmızısı — CANLI rozeti */
  live: '#E0244F',
  black: '#0A0A0A',
  purple: '#7B4DFF',
  blue: '#005AE1',
} as const;

export type ColorTokens = {
  /** Ekran arka planı */
  bg: string;
  /** Kart / sheet arka planı (bg üzerinde yükseltilmiş yüzey) */
  card: string;
  /** Çip, input, ikincil buton yüzeyi */
  surface: string;
  /** Basılı / seçili yüzey */
  surfaceAlt: string;
  /** İnce ayraç ve kenarlıklar */
  border: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  /** Marka turkuazı — birincil butonlar, takip et, teklif ver, seçili durumlar */
  primary: string;
  primaryPressed: string;
  /** Birincil zemin üstündeki metin ve ikonlar (beyaz) */
  onPrimary: string;
  /** Turkuazın yumuşak tonu — seçili kutucuk, rozet ve boş durum zeminleri */
  primarySoft: string;
  /** Bağlantılar ve vurgulu metin (okunaklı koyu/açık turkuaz) */
  accent: string;
  /** Bakır — sadakat, ödül ve öne çıkan etiketler */
  copper: string;
  /** Bakırın yumuşak tonu — bakır ikonların zemini */
  copperSoft: string;
  /** CANLI rozeti, geri sayım son saniyeler (nar kırmızısı) */
  live: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
  /** Koyu "ters" yüzey (gece laciverti) — seçili çip, ikincil vurgulu buton */
  inverse: string;
  onInverse: string;
  overlay: string;
  skeleton: string;
  tabBar: string;
  tabIconInactive: string;
};

export const lightColors: ColorTokens = {
  bg: '#FFFFFF',
  card: '#FFFFFF',
  surface: '#F1F4F6',
  surfaceAlt: '#E2E8EC',
  border: '#DCE3E8',
  text: '#11161C',
  textSecondary: '#5B6670',
  textTertiary: '#9AA4AD',
  primary: PRIMARY,
  primaryPressed: PRIMARY_PRESSED,
  onPrimary: '#FFFFFF',
  primarySoft: PRIMARY_SOFT,
  accent: '#0B7A73',
  copper: brand.copper,
  copperSoft: brand.copperSoft,
  live: brand.live,
  success: '#15955A',
  warning: '#C9790A',
  danger: '#D93848',
  info: '#2563EB',
  inverse: '#11161C',
  onInverse: '#FFFFFF',
  overlay: 'rgba(8,12,18,0.45)',
  skeleton: '#E9EEF1',
  tabBar: '#FFFFFF',
  tabIconInactive: '#5B6670',
};

export const darkColors: ColorTokens = {
  bg: '#0E1116',
  card: '#161B22',
  surface: '#1E252E',
  surfaceAlt: '#2A323D',
  border: '#28303A',
  text: '#F5F7FA',
  textSecondary: '#A3ADB8',
  textTertiary: '#6B7682',
  primary: '#14A396',
  primaryPressed: '#0F8C81',
  onPrimary: '#FFFFFF',
  primarySoft: '#123A38',
  accent: '#5EEAD4',
  copper: '#E08A4F',
  copperSoft: '#3A2A20',
  live: '#F0325C',
  success: '#34C77B',
  warning: '#F2A93B',
  danger: '#F2555A',
  info: '#60A5FA',
  inverse: '#F5F7FA',
  onInverse: '#0E1116',
  overlay: 'rgba(4,6,10,0.6)',
  skeleton: '#1C232B',
  tabBar: '#0E1116',
  tabIconInactive: '#7D8794',
};

/** Canlı yayın / video üstü katmanlar için sabit koyu tokenlar (cam yüzeyler gece laciverti tonlu) */
export const liveColors = {
  text: '#FFFFFF',
  textSecondary: 'rgba(255,255,255,0.78)',
  textTertiary: 'rgba(255,255,255,0.56)',
  /** Cam yüzey (video üstü kontroller) */
  glass: 'rgba(8,12,18,0.42)',
  glassStrong: 'rgba(8,12,18,0.62)',
  glassLight: 'rgba(255,255,255,0.14)',
  border: 'rgba(255,255,255,0.16)',
  panel: '#11161C',
  panelAlt: '#1B222B',
  primary: '#14A396',
  /** Parlak turkuaz — ilerleme çizgisi, seçili ikonlar */
  primaryBright: brand.primaryBright,
  onPrimary: '#FFFFFF',
  copper: '#E08A4F',
  live: '#F0325C',
  success: '#34C77B',
  danger: '#F2555A',
  accent: '#5EEAD4',
} as const;
