/**
 * İlk açılış ipucu (Whatnot coachmark): ilk yayın kartı turkuaz çerçeveyle vurgulanır, ekranın geri kalanı
 * karartılır, altında/üstünde işaretçili beyaz balon. Hedefe dokunmak yayını açar, "Anladım" kapatır.
 */
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FadeOut, ZoomIn } from 'react-native-reanimated';

import { Button, Text } from '@/components/ui';
import { haptic } from '@/lib/haptics';
import { radius, SCREEN_PADDING, useTheme } from '@/theme';

export type Rect = { x: number; y: number; w: number; h: number };

const INFLATE = 6;
const TIP_H = 128;

export function Coachmark({ rect, containerHeight, onTarget, onDismiss }: { rect: Rect; containerHeight: number; onTarget: () => void; onDismiss: () => void }) {
  const { colors } = useTheme();
  const { width: screenW } = useWindowDimensions();
  const hole = { x: rect.x - INFLATE, y: rect.y - INFLATE, w: rect.w + INFLATE * 2, h: rect.h + INFLATE * 2 };
  const tipW = Math.min(310, screenW - SCREEN_PADDING * 2);
  const tipLeft = Math.max(SCREEN_PADDING, Math.min(hole.x, screenW - tipW - SCREEN_PADDING));
  const below = hole.y + hole.h + 14 + TIP_H < containerHeight;
  const pointerLeft = Math.max(16, Math.min(tipW - 30, hole.x + hole.w / 2 - tipLeft - 8));
  const dim = colors.overlay;

  return (
    <Animated.View entering={FadeIn.duration(250)} exiting={FadeOut.duration(180)} style={StyleSheet.absoluteFill}>
      <View style={[styles.dim, { backgroundColor: dim, top: 0, left: 0, right: 0, height: Math.max(0, hole.y) }]} />
      <View style={[styles.dim, { backgroundColor: dim, top: hole.y + hole.h, left: 0, right: 0, bottom: 0 }]} />
      <View style={[styles.dim, { backgroundColor: dim, top: hole.y, left: 0, width: Math.max(0, hole.x), height: hole.h }]} />
      <View style={[styles.dim, { backgroundColor: dim, top: hole.y, left: hole.x + hole.w, right: 0, height: hole.h }]} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Yayını izle"
        onPress={() => {
          haptic.light();
          onTarget();
        }}
        style={[styles.hole, { left: hole.x, top: hole.y, width: hole.w, height: hole.h, borderColor: colors.primary }]}
      />
      <Animated.View
        entering={ZoomIn.delay(150).springify().damping(16)}
        style={[
          styles.tip,
          { width: tipW, left: tipLeft, backgroundColor: colors.card, shadowColor: '#000' },
          below ? { top: hole.y + hole.h + 14 } : { bottom: containerHeight - hole.y + 14 },
        ]}>
        <View style={[styles.pointer, { left: pointerLeft, backgroundColor: colors.card }, below ? { top: -7 } : { bottom: -7 }]} />
        <Text variant="body">
          İlk mezatın <Text variant="bodyBold">bu kartın arkasında</Text>
        </Text>
        <Text variant="subhead" color="textSecondary" style={styles.sub}>
          Dokununca yayın açılır; ürünü canlı izle, teklif ver, satıcıya soru sor.
        </Text>
        <Button
          title="Tamam, başlayalım"
          size="sm"
          variant="inverse"
          style={styles.ok}
          onPress={() => {
            haptic.success();
            onDismiss();
          }}
        />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  dim: { position: 'absolute' },
  hole: { position: 'absolute', borderWidth: 3, borderRadius: radius.md + 4 },
  tip: {
    position: 'absolute',
    borderRadius: radius.lg,
    padding: 14,
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 12,
  },
  pointer: { position: 'absolute', width: 16, height: 16, transform: [{ rotate: '45deg' }], borderRadius: 3 },
  sub: { marginTop: 4 },
  ok: { alignSelf: 'flex-end', marginTop: 10 },
});
