import { StyleSheet } from 'react-native';

import { brand, liveColors } from '@/theme';

/** Video üstündeki metinler için okunabilirlik gölgesi */
export const textShadow = {
  textShadowColor: alpha(brand.black, 0.6),
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 3,
} as const;

export const liveStyles = StyleSheet.create({
  shadow: textShadow,
  glassCard: {
    backgroundColor: liveColors.glassStrong,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: liveColors.border,
  },
  pill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: liveColors.glass,
  },
});

/** Kargo süresi etiketi: 0.8 → "<1 gün", 1.6 → "2 gün" */
export function shipDaysLabel(days: number): string {
  if (!days || days < 1) return '<1 gün';
  return `${Math.round(days)} gün`;
}

/** Tema renginden yarı saydam ton üretir: alpha(liveColors.success, 0.16) */
export function alpha(hex: string, a: number): string {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h.slice(0, 6);
  const n = parseInt(full, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/** Video üstü koyu panel (kartlar) */
export const PANEL = alpha(liveColors.panel, 0.8);
