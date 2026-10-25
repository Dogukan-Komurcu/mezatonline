import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Icon, Text } from '@/components/ui';
import { brand, useTheme } from '@/theme';

/**
 * Mezatonline logosu: sarı yuvarlatılmış kare içinde tokmak + "mezatonline" yazısı.
 * <Logo size={28} />            → ikon + yazı
 * <Logo size={28} iconOnly />   → sadece ikon
 * <Logo color="#0A0A0A" />      → sarı zemin üstünde siyah yazı
 */
export function Logo({ size = 28, iconOnly, color, style }: { size?: number; iconOnly?: boolean; color?: string; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.row, style]} accessibilityRole="image" accessibilityLabel="Mezatonline">
      <View style={[styles.mark, { width: size, height: size, borderRadius: size * 0.3, backgroundColor: brand.yellow }]}>
        <Icon name="hammer" size={size * 0.62} color="#0A0A0A" style={{ transform: [{ rotate: '-20deg' }] }} />
      </View>
      {iconOnly ? null : (
        <Text style={{ fontSize: size * 0.82, lineHeight: size, fontWeight: '900', letterSpacing: -0.8 }} color={color ?? colors.text}>
          mezat<Text style={{ fontSize: size * 0.82, lineHeight: size, fontWeight: '900', letterSpacing: -0.8 }} color={color ?? colors.text}>online</Text>
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mark: { alignItems: 'center', justifyContent: 'center' },
});
