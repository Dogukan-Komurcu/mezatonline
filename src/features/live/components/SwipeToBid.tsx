import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureDetector, usePanGesture, useSimultaneousGestures, useTapGesture } from 'react-native-gesture-handler';
import Animated, { interpolate, useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming, Extrapolation } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { Icon, Text } from '@/components/ui';
import { formatTRY } from '@/lib/format';
import { liveColors } from '@/theme';

import { alpha } from './styles';

export type SwipeToBidProps = {
  /** Kaydırınca verilecek tutar (bir sonraki geçerli minimum teklif) */
  amount: number;
  /** Kullanıcı önde: kaydırma kapalı */
  leading: boolean;
  /** Hemen Al gibi farklı etiket (ör. "Hemen Al") */
  label?: string;
  onCommit: (amount: number) => void;
  onTapHint: () => void;
};

const KNOB_RATIO = 0.8;
const PAD = 3;

/**
 * Whatnot "kaydır, teklif ver" kaydırıcısı: sarı topuz sağa kaydırılınca teklif verilir,
 * bırakılınca yaylanarak geri döner. Önde olunca yeşil "Öndesin" durumuna geçer.
 */
export function SwipeToBid({ amount, leading, label, onCommit, onTapHint }: SwipeToBidProps) {
  const [trackW, setTrackW] = useState(0);
  const x = useSharedValue(0);
  const maxX = useSharedValue(1);
  const knobW = Math.max(0, trackW * KNOB_RATIO);

  useEffect(() => {
    maxX.set(Math.max(1, trackW - knobW - PAD * 2));
  }, [trackW, knobW, maxX]);

  useEffect(() => {
    // Önde olunca topuzu sıfırla
    x.set(withSpring(0, { damping: 18, stiffness: 220 }));
  }, [leading, x]);

  const commit = () => onCommit(amount);
  const hint = () => {
    onTapHint();
    x.set(withSequence(withTiming(18, { duration: 140 }), withSpring(0, { damping: 9, stiffness: 260 })));
  };

  const pan = usePanGesture({
    enabled: !leading,
    activeOffsetX: 6,
    failOffsetY: [-16, 16],
    onUpdate: (e) => {
      x.set(Math.min(maxX.get(), Math.max(0, e.translationX)));
    },
    onDeactivate: () => {
      if (x.get() >= maxX.get() * 0.8) {
        x.set(withSequence(withTiming(maxX.get(), { duration: 70 }), withTiming(maxX.get(), { duration: 160 }), withSpring(0, { damping: 16, stiffness: 200 })));
        scheduleOnRN(commit);
      } else {
        x.set(withSpring(0, { damping: 16, stiffness: 240 }));
      }
    },
  });
  const tap = useTapGesture({
    enabled: !leading,
    maxDuration: 300,
    maxDistance: 8,
    onActivate: () => {
      scheduleOnRN(hint);
    },
  });
  const gesture = useSimultaneousGestures(pan, tap);

  const knobStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }] }));
  const hintStyle = useAnimatedStyle(() => ({ opacity: interpolate(x.get(), [0, maxX.get()], [1, 0], Extrapolation.CLAMP) }));
  const fillStyle = useAnimatedStyle(() => ({ width: x.get() + knobW * 0.5, opacity: interpolate(x.get(), [0, maxX.get()], [0, 0.35], Extrapolation.CLAMP) }));

  const tint = leading ? liveColors.success : liveColors.primary;

  return (
    <View
      style={[styles.track, { borderColor: tint, backgroundColor: alpha(tint, 0.08) }]}
      onLayout={(e) => setTrackW(e.nativeEvent.layout.width)}
      accessibilityRole="adjustable"
      accessibilityLabel={leading ? 'Öndesin' : `${formatTRY(amount)} teklif vermek için sağa kaydır`}
      accessibilityActions={leading ? undefined : [{ name: 'activate', label: 'Teklif ver' }]}
      onAccessibilityAction={() => {
        if (!leading) onCommit(amount);
      }}>
      <Animated.View style={[styles.fill, { backgroundColor: tint }, fillStyle]} />
      {!leading ? (
        <Animated.View style={[styles.hint, hintStyle]} pointerEvents="none">
          <Icon name="chevron-forward" size={16} color={alpha(liveColors.primary, 0.5)} />
          <Icon name="chevron-forward" size={16} color={alpha(liveColors.primary, 0.8)} style={styles.chev} />
        </Animated.View>
      ) : null}
      {trackW > 0 ? (
        <GestureDetector gesture={gesture}>
          <Animated.View style={[styles.knob, { width: leading ? trackW - PAD * 2 : knobW, backgroundColor: tint }, knobStyle]}>
            {leading ? (
              <>
                <Icon name="checkmark-circle" size={20} color={liveColors.onPrimary} />
                <Text variant="headline" weight="800" color={liveColors.onPrimary} numberOfLines={1}>
                  Öndesin
                </Text>
              </>
            ) : (
              <>
                <Text variant="headline" weight="800" color={liveColors.onPrimary} numberOfLines={1} style={styles.knobText} adjustsFontSizeToFit minimumFontScale={0.7}>
                  {label ?? `${formatTRY(amount)} Teklif Ver`}
                </Text>
                <View style={styles.knobChevrons}>
                  <Icon name="chevron-forward" size={16} color={liveColors.onPrimary} />
                  <Icon name="chevron-forward" size={16} color={liveColors.onPrimary} style={styles.chev} />
                </View>
              </>
            )}
          </Animated.View>
        </GestureDetector>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flex: 1, height: 52, borderRadius: 999, borderWidth: 1.5, justifyContent: 'center', overflow: 'hidden' },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 999 },
  hint: { position: 'absolute', right: 14, flexDirection: 'row', alignItems: 'center' },
  chev: { marginLeft: -9 },
  knob: {
    position: 'absolute',
    left: PAD,
    top: PAD,
    bottom: PAD,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 12,
  },
  knobText: { flexShrink: 1 },
  knobChevrons: { flexDirection: 'row', alignItems: 'center' },
});
