import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureDetector, useLongPressGesture, useSimultaneousGestures, useTapGesture } from 'react-native-gesture-handler';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { Icon, Text } from '@/components/ui';
import { formatTRY } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { brand, liveColors } from '@/theme';

import { alpha } from './styles';

/** Teklifin onaylanması için düğmenin basılı tutulması gereken süre (ms) */
export const HOLD_TO_BID_MS = 500;

export type HoldToBidProps = {
  /** Basılı tutma tamamlanınca verilecek tutar */
  amount: number;
  /** Kullanıcı önde: düğme kapalı, "Öndesin" gösterilir */
  leading: boolean;
  /** Düğme yazısı (varsayılan "Teklif ver") */
  label?: string;
  onCommit: (amount: number) => void;
  /** Kısa dokunuş (basılı tutmadan): "basılı tut" ipucu için */
  onTapHint: () => void;
};

const RADIUS = 14;

/**
 * Basılı tutarak teklif verme düğmesi (Mezatonline teklif paneli).
 * Basılı tutulurken düğmenin içi soldan sağa dolar; ~0,5 sn sonunda titreşimle teklif verilir.
 * Erken bırakılırsa dolum yaylanarak geri çekilir, kısa dokunuşta ipucu gösterilir.
 * Ekran okuyucuda "etkinleştir" eylemi doğrudan teklif verir.
 */
export function HoldToBid({ amount, leading, label = 'Teklif ver', onCommit, onTapHint }: HoldToBidProps) {
  const progress = useSharedValue(0);
  const scale = useSharedValue(1);
  const completed = useSharedValue(false);

  useEffect(() => {
    // Önde olma durumu değişince dolumu sıfırla
    cancelAnimation(progress);
    progress.set(0);
  }, [leading, progress]);

  const commit = () => {
    haptic.heavy();
    onCommit(amount);
  };

  const hold = useLongPressGesture({
    enabled: !leading,
    minDuration: HOLD_TO_BID_MS,
    maxDistance: 24,
    onBegin: () => {
      completed.set(false);
      scale.set(withSpring(0.97, { damping: 20, stiffness: 400 }));
      progress.set(withTiming(1, { duration: HOLD_TO_BID_MS, easing: Easing.linear }));
    },
    onActivate: () => {
      completed.set(true);
      scheduleOnRN(commit);
    },
    onFinalize: () => {
      scale.set(withSpring(1, { damping: 15, stiffness: 300 }));
      if (completed.get()) {
        progress.set(withSequence(withTiming(1, { duration: 120 }), withTiming(0, { duration: 260 })));
      } else {
        progress.set(withSpring(0, { damping: 18, stiffness: 240, overshootClamping: true }));
      }
    },
  });
  const tap = useTapGesture({
    enabled: !leading,
    maxDuration: 250,
    maxDistance: 10,
    onActivate: () => {
      scheduleOnRN(onTapHint);
    },
  });
  const gesture = useSimultaneousGestures(hold, tap);

  const fillStyle = useAnimatedStyle(() => ({ width: `${Math.max(0, Math.min(1, progress.get())) * 100}%` }));
  const scaleStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));

  if (leading) {
    return (
      <View style={[styles.button, styles.leading]} accessible accessibilityRole="button" accessibilityState={{ disabled: true }} accessibilityLabel="Öndesin, en yüksek teklif senin">
        <Icon name="checkmark-circle" size={20} color={liveColors.success} />
        <Text variant="headline" weight="800" color={liveColors.success} numberOfLines={1}>
          Öndesin
        </Text>
      </View>
    );
  }

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        style={[styles.button, styles.primary, scaleStyle]}
        accessible
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${formatTRY(amount)}`}
        accessibilityHint="Teklif vermek için basılı tut"
        accessibilityActions={[{ name: 'activate', label }]}
        onAccessibilityAction={(e) => {
          if (e.nativeEvent.actionName === 'activate') commit();
        }}>
        <Animated.View pointerEvents="none" style={[styles.fill, fillStyle]} />
        <Animated.View pointerEvents="none" style={[styles.edge, fillStyle]} />
        <Icon name="hammer-outline" size={18} color={liveColors.onPrimary} />
        <View style={styles.labels}>
          <Text variant="headline" weight="800" color={liveColors.onPrimary} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
            {label}
          </Text>
          <Text variant="caption" weight="600" color={alpha(liveColors.onPrimary, 0.82)} numberOfLines={1}>
            Basılı tut
          </Text>
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  button: {
    flex: 1,
    height: 52,
    borderRadius: RADIUS,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 12,
    overflow: 'hidden',
  },
  primary: { backgroundColor: liveColors.primary },
  leading: {
    backgroundColor: alpha(liveColors.success, 0.16),
    borderWidth: 1,
    borderColor: alpha(liveColors.success, 0.55),
  },
  // Dolum: düğmeyi soldan sağa koyulaştırır (beyaz yazı okunur kalır), alt kenarda parlak ilerleme çizgisi
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: alpha(brand.ink, 0.28) },
  edge: { position: 'absolute', left: 0, bottom: 0, height: 3, backgroundColor: liveColors.primaryBright },
  labels: { flexShrink: 1, alignItems: 'flex-start' },
});
