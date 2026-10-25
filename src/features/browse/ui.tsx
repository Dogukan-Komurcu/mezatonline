/**
 * Keşif ekranlarının (Ana Sayfa, Kategoriler, Kategori, Arama, En İyi Satıcılar) ortak küçük bileşenleri.
 */
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View, type StyleProp, type ViewStyle } from 'react-native';

import { Icon, PressableScale, Text, type IconName } from '@/components/ui';
import { formatCompact } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { radius, SCREEN_PADDING, useTheme } from '@/theme';

/** Grid kart genişliği (ekran kenar boşluğu 16, sütun arası 12) */
export function useGridWidth(columns = 2, gap = 12): number {
  const { width } = useWindowDimensions();
  return Math.floor((width - SCREEN_PADDING * 2 - gap * (columns - 1)) / columns);
}

// ─── Filtre çipi ─────────────────────────────────────────────────────────────

export type FilterChipProps = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: IconName;
  /** Sağda ⌄ (açılır seçim) */
  chevron?: boolean;
  /** Etkin filtre sayısı rozeti */
  count?: number;
  style?: StyleProp<ViewStyle>;
};

/** Whatnot filtre çipi: gri hap, seçili = koyu dolgu + beyaz metin */
export function FilterChip({ label, selected, onPress, icon, chevron, count, style }: FilterChipProps) {
  const { colors } = useTheme();
  const fg = selected ? colors.onInverse : colors.text;
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      scaleTo={0.95}
      onPress={() => {
        haptic.tap();
        onPress?.();
      }}
      style={[styles.chip, { backgroundColor: selected ? colors.inverse : colors.surface }, style]}>
      {icon ? <Icon name={icon} size={15} color={fg} /> : null}
      <Text variant="subhead" weight="600" color={fg} numberOfLines={1}>
        {label}
      </Text>
      {count ? (
        <View style={[styles.chipCount, { backgroundColor: selected ? colors.onInverse : colors.inverse }]}>
          <Text variant="caption" color={selected ? colors.inverse : colors.onInverse} style={styles.chipCountText}>
            {count}
          </Text>
        </View>
      ) : null}
      {chevron ? <Icon name="chevron-down" size={14} color={fg} /> : null}
    </PressableScale>
  );
}

/** Yatay kaydırılan çip satırı */
export function ChipScroller({ children, style, contentStyle }: { children: ReactNode; style?: StyleProp<ViewStyle>; contentStyle?: StyleProp<ViewStyle> }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={style} contentContainerStyle={[styles.scroller, contentStyle]} keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  );
}

// ─── Arama hapı ──────────────────────────────────────────────────────────────

/** Dokununca arama ekranını açan sahte arama kutusu */
export function SearchPill({ placeholder, variant = 'outline', height = 44, style }: { placeholder: string; variant?: 'outline' | 'filled'; height?: number; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  return (
    <PressableScale
      scaleTo={0.98}
      accessibilityRole="search"
      accessibilityLabel={placeholder}
      onPress={() => {
        haptic.tap();
        router.push('/search');
      }}
      style={[
        styles.search,
        {
          height,
          backgroundColor: variant === 'filled' ? colors.surface : colors.bg,
          borderColor: variant === 'outline' ? colors.border : 'transparent',
          borderWidth: variant === 'outline' ? 1 : 0,
        },
        style,
      ]}>
      <Icon name="search" size={19} color="textSecondary" />
      <Text variant="body" color="textSecondary" numberOfLines={1} style={styles.flex}>
        {placeholder}
      </Text>
    </PressableScale>
  );
}

// ─── İzleyici metriği ────────────────────────────────────────────────────────

/** Kırmızı daire içinde sinyal ikonu + "2,3B izleyici" (kategori kutucukları, satıcı kartları) */
export function ViewersMetric({ viewers, live = true, light, suffix = ' izleyici', size = 'md' }: { viewers: number; live?: boolean; light?: boolean; suffix?: string; size?: 'sm' | 'md' }) {
  const { colors } = useTheme();
  const dot = size === 'sm' ? 14 : 16;
  return (
    <View style={styles.metric}>
      <View style={[styles.metricDot, { width: dot, height: dot, borderRadius: dot / 2, backgroundColor: live ? colors.live : colors.textTertiary }]}>
        <Icon name="stats-chart" size={dot * 0.55} color="#FFFFFF" />
      </View>
      <Text variant={size === 'sm' ? 'caption' : 'footnote'} weight="600" color={light ? '#FFFFFF' : 'textSecondary'} numberOfLines={1}>
        {formatCompact(viewers)}
        {suffix}
      </Text>
    </View>
  );
}

// ─── Madalya (sıralama) ──────────────────────────────────────────────────────

/** Altın / gümüş / bronz madalya renkleri (temadan bağımsız sabit metal tonları) */
export const MEDAL_COLORS = {
  1: { fill: '#F4BE2C', ring: '#D99A00', tint: 'rgba(244,190,44,0.42)' },
  2: { fill: '#B9C1CC', ring: '#8F99A6', tint: 'rgba(185,193,204,0.5)' },
  3: { fill: '#D58E5B', ring: '#B06A36', tint: 'rgba(213,142,91,0.4)' },
} as const;

export function medalFor(rank: number) {
  return rank === 1 || rank === 2 || rank === 3 ? MEDAL_COLORS[rank] : undefined;
}

/** ①②③ kurdeleli madalya; 4 ve sonrası sade gri numara */
export function Medal({ rank, size = 26 }: { rank: number; size?: number }) {
  const { colors } = useTheme();
  const medal = medalFor(rank);
  if (!medal) {
    return (
      <View style={[styles.medalBox, { width: size, height: size + 8 }]}>
        <Text variant="headline" weight="800" color="textSecondary" tabular>
          {rank}
        </Text>
      </View>
    );
  }
  const ribbonW = size * 0.32;
  const ribbonH = size * 0.55;
  return (
    <View style={{ width: size, height: size + 8 }} accessibilityLabel={`${rank}. sıra`}>
      <View style={[styles.ribbon, { width: ribbonW, height: ribbonH, left: size / 2 - ribbonW - 1, backgroundColor: colors.live, transform: [{ rotate: '18deg' }] }]} />
      <View style={[styles.ribbon, { width: ribbonW, height: ribbonH, left: size / 2 + 1, backgroundColor: colors.info, transform: [{ rotate: '-18deg' }] }]} />
      <View style={[styles.medal, { width: size, height: size, borderRadius: size / 2, backgroundColor: medal.fill, borderColor: medal.ring }]}>
        <Text weight="900" color="#FFFFFF" style={{ fontSize: size * 0.5, lineHeight: size * 0.62 }}>
          {rank}
        </Text>
      </View>
    </View>
  );
}

// ─── Bölüm ayıracı ───────────────────────────────────────────────────────────

/** Tam genişlik bölümler arası 8px gri bant */
export function Band() {
  const { colors } = useTheme();
  return <View style={{ height: 8, backgroundColor: colors.surface }} />;
}

/** Bölüm başlığı: başlık + alt başlık + sağda "Daha fazla ›" */
export function SectionTitle({ title, subtitle, actionLabel = 'Daha fazla', onAction, left }: { title: string; subtitle?: string; actionLabel?: string; onAction?: () => void; left?: ReactNode }) {
  return (
    <View style={styles.sectionRow}>
      {left}
      <View style={styles.flex}>
        <Text variant="title3" numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="footnote" color="textSecondary" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {onAction ? (
        <PressableScale scaleTo={0.94} onPress={onAction} hitSlop={8} style={styles.sectionAction} accessibilityRole="button" accessibilityLabel={actionLabel}>
          <Text variant="subhead" weight="700" color="accent">
            {actionLabel}
          </Text>
          <Icon name="chevron-forward" size={14} color="accent" />
        </PressableScale>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 34,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
  },
  chipCount: { minWidth: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  chipCountText: { fontSize: 10, lineHeight: 12 },
  scroller: { paddingHorizontal: SCREEN_PADDING, gap: 8, alignItems: 'center' },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
  },
  metric: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metricDot: { alignItems: 'center', justifyContent: 'center' },
  medalBox: { alignItems: 'center', justifyContent: 'center' },
  ribbon: { position: 'absolute', top: 0, borderBottomLeftRadius: 2, borderBottomRightRadius: 2 },
  medal: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SCREEN_PADDING, gap: 10, marginBottom: 12 },
  sectionAction: { flexDirection: 'row', alignItems: 'center', gap: 2 },
});
