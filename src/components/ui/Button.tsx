import type { ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { haptic } from '@/lib/haptics';
import { liveColors, radius, useTheme } from '@/theme';

import { Icon, type IconName } from './Icon';
import { PressableScale } from './Pressable';
import { Text } from './Text';

export type ButtonVariant = 'primary' | 'secondary' | 'inverse' | 'outline' | 'ghost' | 'danger' | 'glass';
export type ButtonSize = 'sm' | 'md' | 'lg';

export type ButtonProps = {
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName;
  iconRight?: IconName;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  /** Başlığın altında ikinci satır (ör. "₺1.250") */
  subtitle?: string;
  style?: StyleProp<ViewStyle>;
  /** Basınca titreşim (varsayılan: açık) */
  haptics?: boolean;
  children?: ReactNode;
  testID?: string;
};

const HEIGHT: Record<ButtonSize, number> = { sm: 34, md: 44, lg: 52 };
const PAD: Record<ButtonSize, number> = { sm: 14, md: 18, lg: 22 };
const FONT: Record<ButtonSize, 'subhead' | 'headline'> = { sm: 'subhead', md: 'headline', lg: 'headline' };

/**
 * Whatnot tarzı hap (pill) buton.
 * primary = marka sarısı, inverse = siyah/beyaz, secondary = gri yüzey, glass = video üstü yarı saydam
 */
export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  loading,
  disabled,
  fullWidth,
  subtitle,
  style,
  haptics = true,
  testID,
}: ButtonProps) {
  const { colors } = useTheme();
  const palette: Record<ButtonVariant, { bg: string; fg: string; border?: string }> = {
    primary: { bg: colors.primary, fg: colors.onPrimary },
    secondary: { bg: colors.surface, fg: colors.text },
    inverse: { bg: colors.inverse, fg: colors.onInverse },
    outline: { bg: 'transparent', fg: colors.text, border: colors.border },
    ghost: { bg: 'transparent', fg: colors.text },
    danger: { bg: colors.danger, fg: '#FFFFFF' },
    glass: { bg: liveColors.glassLight, fg: '#FFFFFF', border: liveColors.border },
  };
  const p = palette[variant];
  const isDisabled = disabled || loading;
  return (
    <PressableScale
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={title}
      disabled={isDisabled}
      onPress={() => {
        if (haptics) haptic.light();
        onPress?.();
      }}
      style={[
        styles.base,
        {
          minHeight: subtitle ? HEIGHT[size] + 10 : HEIGHT[size],
          paddingHorizontal: PAD[size],
          backgroundColor: p.bg,
          borderColor: p.border ?? 'transparent',
          borderWidth: p.border ? StyleSheet.hairlineWidth * 2 : 0,
          opacity: isDisabled && !loading ? 0.45 : 1,
          alignSelf: fullWidth ? 'stretch' : 'auto',
        },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={p.fg} />
      ) : (
        <View style={styles.row}>
          {icon ? <Icon name={icon} size={size === 'sm' ? 16 : 19} color={p.fg} /> : null}
          <View style={styles.labels}>
            <Text variant={FONT[size]} weight="700" color={p.fg} numberOfLines={1}>
              {title}
            </Text>
            {subtitle ? (
              <Text variant="caption" color={p.fg} style={{ opacity: 0.8 }} numberOfLines={1}>
                {subtitle}
              </Text>
            ) : null}
          </View>
          {iconRight ? <Icon name={iconRight} size={size === 'sm' ? 16 : 19} color={p.fg} /> : null}
        </View>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  labels: {
    alignItems: 'center',
  },
});
