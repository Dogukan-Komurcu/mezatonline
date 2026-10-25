import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { haptic } from '@/lib/haptics';
import { radius, useTheme } from '@/theme';

import { Icon, type IconName } from './Icon';
import { PressableScale } from './Pressable';
import { Text } from './Text';

export type ChipProps = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: IconName;
  emoji?: string;
  /** Sağda küçük gri sayı (ör. izleyici) */
  count?: string;
  size?: 'sm' | 'md';
  style?: StyleProp<ViewStyle>;
};

/** Seçilebilir hap çip. Seçili = siyah (koyu temada beyaz), değil = gri yüzey. */
export function Chip({ label, selected, onPress, icon, emoji, count, size = 'md', style }: ChipProps) {
  const { colors } = useTheme();
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={() => {
        haptic.tap();
        onPress?.();
      }}
      style={[
        styles.chip,
        size === 'sm' ? styles.sm : styles.md,
        { backgroundColor: selected ? colors.inverse : colors.surface },
        style,
      ]}>
      <View style={styles.row}>
        {emoji ? <Text variant="subhead">{emoji}</Text> : null}
        {icon ? <Icon name={icon} size={15} color={selected ? colors.onInverse : colors.text} /> : null}
        <Text variant={size === 'sm' ? 'footnote' : 'subhead'} weight="600" color={selected ? colors.onInverse : colors.text} numberOfLines={1}>
          {label}
        </Text>
        {count ? (
          <Text variant="caption" color={selected ? colors.onInverse : colors.textSecondary}>
            {count}
          </Text>
        ) : null}
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  chip: { borderRadius: radius.sm },
  md: { paddingHorizontal: 12, paddingVertical: 8 },
  sm: { paddingHorizontal: 10, paddingVertical: 5 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
