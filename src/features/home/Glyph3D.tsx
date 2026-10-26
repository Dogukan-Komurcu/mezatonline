/**
 * Whatnot'taki 3B nesne ikonlarının (sarı kalp, kupa…) emojiye bağlı olmayan karşılığı:
 * degrade dolgulu, parlama vurgulu ve gölgeli sarı daire içinde Ionicons simgesi.
 */
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Icon, type IconName } from '@/components/ui';

const YELLOW = ['#FFF59A', '#FFE414', '#EFC400'] as const;

export function Glyph3D({ name, size = 54, iconColor = '#1C1C1C', style }: { name: IconName; size?: number; iconColor?: string; style?: StyleProp<ViewStyle> }) {
  const r = size / 2;
  return (
    <View style={[styles.shadow, { width: size, height: size, borderRadius: r }, style]}>
      <LinearGradient colors={YELLOW} start={{ x: 0.15, y: 0 }} end={{ x: 0.85, y: 1 }} style={[StyleSheet.absoluteFill, styles.fill, { borderRadius: r }]} />
      <View pointerEvents="none" style={[styles.shine, { top: size * 0.09, left: size * 0.2, width: size * 0.42, height: size * 0.2, borderRadius: size * 0.1 }]} />
      <Icon name={name} size={Math.round(size * 0.5)} color={iconColor} style={styles.icon} />
    </View>
  );
}

const styles = StyleSheet.create({
  shadow: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7A6400',
    shadowOpacity: 0.35,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  fill: { borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(0,0,0,0.12)' },
  shine: { position: 'absolute', backgroundColor: 'rgba(255,255,255,0.55)', transform: [{ rotate: '-18deg' }] },
  icon: { marginTop: 2, textShadowColor: 'rgba(0,0,0,0.18)', textShadowOffset: { width: 0, height: 1.5 }, textShadowRadius: 1.5 },
});
