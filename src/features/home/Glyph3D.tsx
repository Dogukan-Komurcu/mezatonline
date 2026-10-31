/**
 * Parlak "3B" turkuaz küre içinde simge (Sana Özel, Takip Ettiklerin, En İyi Satıcılar başlıkları):
 * açık turkuazdan koyu çini turkuazına degrade dolgu, sol üstte parlama vurgusu, turkuaz gölge,
 * ortada beyaz Ionicons simgesi. Emojiye bağlı değildir; her platformda aynı görünür.
 */
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Icon, type IconName } from '@/components/ui';
import { brand, darkColors, liveColors } from '@/theme';

/** Üst parlak ton → marka turkuazı → basılı (koyu) turkuaz */
const TURQUOISE = [liveColors.accent, darkColors.primary, brand.primaryPressed] as const;

export function Glyph3D({ name, size = 54, iconColor = brand.white, style }: { name: IconName; size?: number; iconColor?: string; style?: StyleProp<ViewStyle> }) {
  const r = size / 2;
  return (
    <View style={[styles.shadow, { width: size, height: size, borderRadius: r }, style]}>
      <LinearGradient colors={TURQUOISE} start={{ x: 0.15, y: 0 }} end={{ x: 0.85, y: 1 }} style={[StyleSheet.absoluteFill, styles.fill, { borderRadius: r }]} />
      <View pointerEvents="none" style={[styles.shine, { top: size * 0.09, left: size * 0.2, width: size * 0.42, height: size * 0.2, borderRadius: size * 0.1 }]} />
      <Icon name={name} size={Math.round(size * 0.5)} color={iconColor} style={styles.icon} />
    </View>
  );
}

const styles = StyleSheet.create({
  shadow: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: brand.primaryPressed,
    shadowOpacity: 0.4,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  fill: { borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(8,12,18,0.12)' },
  shine: { position: 'absolute', backgroundColor: 'rgba(255,255,255,0.45)', transform: [{ rotate: '-18deg' }] },
  icon: { marginTop: 2, textShadowColor: 'rgba(4,49,46,0.35)', textShadowOffset: { width: 0, height: 1.5 }, textShadowRadius: 2 },
});
