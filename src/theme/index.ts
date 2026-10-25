import { createContext, createElement, useContext, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { useSettingsStore } from '@/store/settings';

import { darkColors, lightColors, type ColorTokens } from './colors';

export { brand, darkColors, lightColors, liveColors, type ColorTokens } from './colors';

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
} as const;

export const radius = {
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  pill: 999,
} as const;

/** Ekran kenar boşluğu — tüm ekranlarda yatay padding bu olmalı */
export const SCREEN_PADDING = 16;

export const typography = {
  display: { fontSize: 32, lineHeight: 38, fontWeight: '800' },
  title1: { fontSize: 26, lineHeight: 32, fontWeight: '800' },
  title2: { fontSize: 22, lineHeight: 28, fontWeight: '700' },
  title3: { fontSize: 18, lineHeight: 24, fontWeight: '700' },
  headline: { fontSize: 16, lineHeight: 21, fontWeight: '600' },
  body: { fontSize: 15, lineHeight: 21, fontWeight: '400' },
  bodyBold: { fontSize: 15, lineHeight: 21, fontWeight: '700' },
  callout: { fontSize: 14, lineHeight: 19, fontWeight: '500' },
  subhead: { fontSize: 13, lineHeight: 18, fontWeight: '500' },
  footnote: { fontSize: 12, lineHeight: 16, fontWeight: '500' },
  caption: { fontSize: 11, lineHeight: 14, fontWeight: '600' },
} as const;

export type TypographyVariant = keyof typeof typography;

export type Theme = {
  colors: ColorTokens;
  isDark: boolean;
  scheme: 'light' | 'dark';
};

const SchemeOverride = createContext<'light' | 'dark' | null>(null);

/**
 * Alt ağaçta temayı zorla (ör. canlı yayın ekranı ve üstündeki sheet'ler her zaman koyu).
 * <ForceScheme scheme="dark">...</ForceScheme>
 */
export function ForceScheme({ scheme, children }: { scheme: 'light' | 'dark'; children: ReactNode }) {
  return createElement(SchemeOverride.Provider, { value: scheme }, children);
}

/** Aktif tema. Ayarlardaki görünüm tercihine (sistem / açık / koyu) uyar; ForceScheme varsa onu kullanır. */
export function useTheme(): Theme {
  const system = useColorScheme();
  const appearance = useSettingsStore((s) => s.appearance);
  const forced = useContext(SchemeOverride);
  const scheme = forced ?? (appearance === 'system' ? (system === 'dark' ? 'dark' : 'light') : appearance);
  return {
    colors: scheme === 'dark' ? darkColors : lightColors,
    isDark: scheme === 'dark',
    scheme,
  };
}

/** Sadece renk tokenlarına ihtiyaç varsa kısa yol */
export function useColors(): ColorTokens {
  return useTheme().colors;
}
