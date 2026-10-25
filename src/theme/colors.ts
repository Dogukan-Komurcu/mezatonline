/**
 * Mezatonline renk paleti.
 * Ekranlarda asla sabit renk kodu kullanma — her zaman `useTheme().colors` üzerinden token kullan.
 * Canlı yayın ekranı her zaman koyu temadır: `liveColors` kullan.
 */

export const brand = {
  yellow: '#FFE414',
  yellowPressed: '#EED300',
  yellowSoft: '#FFF6B3',
  black: '#0A0A0A',
  white: '#FFFFFF',
  live: '#EF233C',
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
  /** Marka sarısı — birincil butonlar, takip et, teklif ver */
  primary: string;
  primaryPressed: string;
  onPrimary: string;
  /** Kategori linkleri, vurgulu metin (Whatnot'taki mor link) */
  accent: string;
  /** CANLI rozeti, geri sayım son saniyeler */
  live: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
  /** Koyu "inverse" buton (siyah pill) */
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
  surface: '#F2F2F2',
  surfaceAlt: '#E3E3E3',
  border: '#DDDDDD',
  text: '#1C1C1C',
  textSecondary: '#6A6A6A',
  textTertiary: '#AAAAAA',
  primary: brand.yellow,
  primaryPressed: brand.yellowPressed,
  onPrimary: '#0A0A0A',
  accent: '#005AE1',
  live: brand.live,
  success: '#009E52',
  warning: '#E89B0C',
  danger: '#E5484D',
  info: '#2F7CF6',
  inverse: '#1C1C1C',
  onInverse: '#FFFFFF',
  overlay: 'rgba(0,0,0,0.45)',
  skeleton: '#EDEDF0',
  tabBar: '#FFFFFF',
  tabIconInactive: '#6B6B6B',
};

export const darkColors: ColorTokens = {
  bg: '#121212',
  card: '#1C1C1C',
  surface: '#262628',
  surfaceAlt: '#343437',
  border: '#2F2F32',
  text: '#FFFFFF',
  textSecondary: '#A6A6AF',
  textTertiary: '#6E6E78',
  primary: brand.yellow,
  primaryPressed: brand.yellowPressed,
  onPrimary: '#0A0A0A',
  accent: '#4D8DFF',
  live: brand.live,
  success: '#2BC062',
  warning: '#F5B031',
  danger: '#FF5A5F',
  info: '#5B9BFF',
  inverse: '#FFFFFF',
  onInverse: '#0A0A0A',
  overlay: 'rgba(0,0,0,0.6)',
  skeleton: '#232328',
  tabBar: '#121212',
  tabIconInactive: '#7A7A84',
};

/** Canlı yayın / video üstü katmanlar için sabit koyu tokenlar */
export const liveColors = {
  text: '#FFFFFF',
  textSecondary: 'rgba(255,255,255,0.75)',
  textTertiary: 'rgba(255,255,255,0.55)',
  glass: 'rgba(0,0,0,0.35)',
  glassStrong: 'rgba(0,0,0,0.55)',
  glassLight: 'rgba(255,255,255,0.16)',
  border: 'rgba(255,255,255,0.18)',
  panel: '#141416',
  panelAlt: '#222226',
  primary: brand.yellow,
  onPrimary: '#0A0A0A',
  live: brand.live,
  success: '#2BC062',
  danger: '#FF5A5F',
  accent: '#B7A8FF',
} as const;
