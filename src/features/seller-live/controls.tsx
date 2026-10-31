/**
 * Konsol sheet'lerinde kullanılan küçük kontroller (her zaman koyu temada).
 */
import { Image } from 'expo-image';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Switch, View, type StyleProp, type ViewStyle } from 'react-native';

import { CONDITION_LABELS } from '@/components/cards/ProductCard';
import { Icon, PressableScale, Text, type IconName } from '@/components/ui';
import { formatTRY } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { radius, SCREEN_PADDING, useTheme } from '@/theme';
import type { Product } from '@/types';

export function FieldLabel({ title, hint }: { title: string; hint?: string }) {
  return (
    <View style={styles.fieldLabel}>
      <Text variant="headline">{title}</Text>
      {hint ? (
        <Text variant="footnote" color="textSecondary">
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

export type ChoiceOption<T extends string | number> = { value: T; label: string };

/** Yatay kaydırmalı seçim çipleri — seçili = marka turkuazı, beyaz metin */
export function OptionChips<T extends string | number>({
  options,
  value,
  onChange,
  disabled,
  wrap,
}: {
  options: ChoiceOption<T>[];
  value: T;
  onChange: (v: T) => void;
  disabled?: boolean;
  /** Satırlara sar (kaydırma yerine) */
  wrap?: boolean;
}) {
  const { colors } = useTheme();
  const items = options.map((o) => {
    const selected = o.value === value;
    return (
      <PressableScale
        key={String(o.value)}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityState={{ selected, disabled }}
        onPress={() => {
          haptic.tap();
          onChange(o.value);
        }}
        style={[styles.chip, { backgroundColor: selected ? colors.primary : colors.surfaceAlt, opacity: disabled ? 0.4 : 1 }]}>
        <Text variant="subhead" weight="700" color={selected ? colors.onPrimary : colors.text} numberOfLines={1}>
          {o.label}
        </Text>
      </PressableScale>
    );
  });
  if (wrap) return <View style={styles.wrap}>{items}</View>;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow} style={styles.chipScroll}>
      {items}
    </ScrollView>
  );
}

/** Başlık + açıklama + anahtar satırı */
export function SwitchRow({ title, subtitle, value, onChange, icon }: { title: string; subtitle?: string; value: boolean; onChange: (v: boolean) => void; icon?: IconName }) {
  const { colors } = useTheme();
  return (
    <View style={styles.switchRow}>
      {icon ? (
        <View style={[styles.rowIcon, { backgroundColor: colors.surfaceAlt }]}>
          <Icon name={icon} size={18} />
        </View>
      ) : null}
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="headline">{title}</Text>
        {subtitle ? (
          <Text variant="footnote" color="textSecondary">
            {subtitle}
          </Text>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={(v) => {
          haptic.tap();
          onChange(v);
        }}
        trackColor={{ true: colors.primary, false: colors.surfaceAlt }}
        thumbColor={colors.text}
        ios_backgroundColor={colors.surfaceAlt}
      />
    </View>
  );
}

/** Bilgi / uyarı kutusu */
export function InfoBox({
  icon = 'information-circle-outline',
  children,
  tone = 'neutral',
  style,
}: {
  icon?: IconName;
  children: ReactNode;
  tone?: 'neutral' | 'warning' | 'success';
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  const tint = tone === 'warning' ? colors.warning : tone === 'success' ? colors.success : colors.textSecondary;
  return (
    <View style={[styles.info, { backgroundColor: colors.surface, borderColor: colors.border }, style]}>
      <Icon name={icon} size={18} color={tint} />
      <Text variant="footnote" color="textSecondary" style={{ flex: 1 }}>
        {children}
      </Text>
    </View>
  );
}

/** Ürün başlığı satırı (sheet üstleri) */
export function ProductHeader({ product, right, subtitle }: { product: Product; right?: ReactNode; subtitle?: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.productHead, { backgroundColor: colors.surface }]}>
      <Image
        source={{ uri: product.images[0] }}
        style={[styles.productThumb, { backgroundColor: colors.skeleton }]}
        contentFit="cover"
        cachePolicy="memory-disk"
        recyclingKey={product.id}
      />
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="headline" numberOfLines={2}>
          {product.title}
        </Text>
        <Text variant="footnote" color="textSecondary" numberOfLines={1}>
          {subtitle ?? `${CONDITION_LABELS[product.condition]}${product.grade ? ' · ' + product.grade : ''} · ${formatTRY(product.shippingCost)} kargo`}
        </Text>
      </View>
      {right}
    </View>
  );
}

/** Seçilebilir radyo satırı */
export function RadioRow({ selected, onPress, title, subtitle, left }: { selected: boolean; onPress: () => void; title: string; subtitle?: string; left?: ReactNode }) {
  const { colors } = useTheme();
  return (
    <PressableScale
      scaleTo={0.99}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      style={[styles.radioRow, { backgroundColor: colors.surface, borderColor: selected ? colors.primary : 'transparent' }]}>
      {left}
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="callout" weight="600" numberOfLines={2}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="footnote" color="textSecondary" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <View style={[styles.radio, { borderColor: selected ? colors.primary : colors.textTertiary }]}>
        {selected ? <View style={[styles.radioDot, { backgroundColor: colors.primary }]} /> : null}
      </View>
    </PressableScale>
  );
}

/** İstatistik kutucuğu */
export function StatTile({ label, value, icon, accent, style }: { label: string; value: string; icon?: IconName; accent?: string; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.stat, { backgroundColor: colors.surface }, style]}>
      <View style={styles.statHead}>
        {icon ? <Icon name={icon} size={15} color={accent ?? colors.textSecondary} /> : null}
        <Text variant="footnote" color="textSecondary" numberOfLines={1} style={{ flexShrink: 1 }}>
          {label}
        </Text>
      </View>
      <Text variant="title3" color={accent ?? colors.text} numberOfLines={1} adjustsFontSizeToFit tabular>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fieldLabel: { gap: 2, marginTop: 18, marginBottom: 10 },
  chipScroll: { marginHorizontal: -SCREEN_PADDING },
  chipRow: { paddingHorizontal: SCREEN_PADDING, gap: 8 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minWidth: 56, height: 38, paddingHorizontal: 14, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  rowIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  info: { flexDirection: 'row', gap: 10, padding: 12, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, alignItems: 'flex-start' },
  productHead: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: radius.lg },
  productThumb: { width: 56, height: 56, borderRadius: radius.sm },
  radioRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: radius.md, borderWidth: 1.5 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 11, height: 11, borderRadius: 6 },
  stat: { flex: 1, minWidth: 140, padding: 12, borderRadius: radius.md, gap: 4 },
  statHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
