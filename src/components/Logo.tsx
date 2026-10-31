import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Text } from '@/components/ui';
import { brand, useTheme } from '@/theme';

// Tokmak geometrisi — assets/images/source/render.mjs ile aynı (uygulama simgesiyle birebir).
// Yerel koordinatlar; pivot = tokmak başının merkezi. Baş + sap -40° döner, ses tahtası düz durur.
const BOX = { cx: 42, cy: 117, size: 684 };
const HEAD_PARTS = [
  { x: -142, y: -80, w: 284, h: 160, r: 32 },
  { x: -216, y: -106, w: 64, h: 212, r: 26 },
  { x: 152, y: -106, w: 64, h: 212, r: 26 },
  { x: -40, y: 94, w: 80, h: 460, r: 40 },
];
const BLOCK_PARTS = [
  { x: -250, y: 262, w: 204, h: 80, r: 18 },
  { x: -304, y: 320, w: 312, h: 66, r: 22 },
];
const GROUP = 1160;

/** Beyaz tokmak işareti (SVG'siz, View'larla çizilir). `size` = işaretin kapladığı kare. */
export function GavelMark({ size, color = brand.white }: { size: number; color?: string }) {
  const k = size / BOX.size;
  const px = (x: number) => (x - BOX.cx) * k + size / 2;
  const py = (y: number) => (y - BOX.cy) * k + size / 2;
  const g = GROUP * k;
  return (
    <View style={{ width: size, height: size }} pointerEvents="none">
      <View style={{ position: 'absolute', width: g, height: g, left: px(0) - g / 2, top: py(0) - g / 2, transform: [{ rotate: '-40deg' }] }}>
        {HEAD_PARTS.map((p, i) => (
          <View key={i} style={{ position: 'absolute', left: p.x * k + g / 2, top: p.y * k + g / 2, width: p.w * k, height: p.h * k, borderRadius: p.r * k, backgroundColor: color }} />
        ))}
      </View>
      {BLOCK_PARTS.map((p, i) => (
        <View key={i} style={{ position: 'absolute', left: px(p.x), top: py(p.y), width: p.w * k, height: p.h * k, borderRadius: p.r * k, backgroundColor: color }} />
      ))}
    </View>
  );
}

/**
 * Mezatonline logosu: turkuaz yuvarlatılmış kare (köşe = boyutun %28'i) içinde beyaz tokmak
 * + küçük harf "mezatonline" yazısı ("online" vurgu turkuazında). Uygulama simgesiyle aynı işaret.
 * <Logo size={28} />                → işaret + yazı
 * <Logo size={28} iconOnly />       → sadece işaret
 * <Logo color={colors.onPrimary} /> → renkli zemin üstünde yazının tamamını tek renge zorla
 */
export function Logo({ size = 28, iconOnly, color, style }: { size?: number; iconOnly?: boolean; color?: string; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  const wordmark = { fontSize: size * 0.82, lineHeight: size, fontWeight: '900', letterSpacing: -0.8 } as const;
  return (
    <View style={[styles.row, style]} accessibilityRole="image" accessibilityLabel="Mezatonline">
      <View style={[styles.mark, { width: size, height: size, borderRadius: size * 0.28, backgroundColor: brand.primary }]}>
        <GavelMark size={size * 0.62} />
      </View>
      {iconOnly ? null : (
        <Text style={wordmark} color={color ?? colors.text}>
          mezat<Text style={wordmark} color={color ?? colors.accent}>online</Text>
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mark: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});
