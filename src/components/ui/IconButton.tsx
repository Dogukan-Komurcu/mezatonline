import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { haptic } from '@/lib/haptics';
import { brand, liveColors, useTheme } from '@/theme';

import { Icon, type IconName } from './Icon';
import { PressableScale } from './Pressable';
import { Text } from './Text';

export type IconButtonProps = {
  name: IconName;
  onPress?: () => void;
  size?: number;
  /** plain = arkaplansız, surface = nötr daire, glass = video üstü cam daire (ince açık kenarlık), primary = turkuaz */
  variant?: 'plain' | 'surface' | 'glass' | 'primary' | 'inverse';
  color?: string;
  /** Sağ üstte kırmızı sayı rozeti */
  badge?: number;
  /** Sağ üstte kırmızı nokta */
  dot?: boolean;
  label?: string;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
};

export function IconButton({ name, onPress, size = 40, variant = 'plain', color, badge, dot, label, accessibilityLabel, style, disabled }: IconButtonProps) {
  const { colors } = useTheme();
  const bg =
    variant === 'surface' ? colors.surface : variant === 'glass' ? liveColors.glass : variant === 'primary' ? colors.primary : variant === 'inverse' ? colors.inverse : 'transparent';
  const fg =
    color ?? (variant === 'glass' ? liveColors.text : variant === 'primary' ? colors.onPrimary : variant === 'inverse' ? colors.onInverse : colors.text);
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label ?? name}
      onPress={() => {
        haptic.tap();
        onPress?.();
      }}
      disabled={disabled}
      hitSlop={6}
      scaleTo={0.9}
      style={[styles.wrap, style]}>
      <View style={[styles.circle, { width: size, height: size, borderRadius: size / 2, backgroundColor: bg }, variant === 'glass' && styles.glassBorder]}>
        <Icon name={name} size={Math.round(size * 0.55)} color={fg} />
        {badge ? (
          <View style={[styles.badge, { backgroundColor: colors.live }]}>
            <Text variant="caption" color={brand.white} style={styles.badgeText}>
              {badge > 99 ? '99+' : badge}
            </Text>
          </View>
        ) : dot ? (
          <View style={[styles.dot, { backgroundColor: colors.live }]} />
        ) : null}
      </View>
      {label ? (
        <Text variant="caption" color={variant === 'glass' ? liveColors.text : 'textSecondary'} style={styles.label} numberOfLines={1}>
          {label}
        </Text>
      ) : null}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  circle: { alignItems: 'center', justifyContent: 'center' },
  glassBorder: { borderWidth: StyleSheet.hairlineWidth, borderColor: liveColors.border },
  badge: {
    position: 'absolute',
    top: -2,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 10, lineHeight: 12 },
  dot: { position: 'absolute', top: 4, right: 4, width: 9, height: 9, borderRadius: 5 },
  label: { marginTop: 3, textShadowColor: 'rgba(0,0,0,0.4)', textShadowRadius: 3 },
});
