import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

import { Text } from '@/components/ui';
import { formatCountdown } from '@/lib/format';
import { liveColors } from '@/theme';

import { useRemaining } from '../useLiveShow';
import { textShadow } from './styles';

/** Açık artırma sayacı: sarı; 5 sn altı kırmızı, 3 sn altı nabız; Ani Bitiş'te 💀 */
export function Countdown({ endsAt, suddenDeath, size = 'md' }: { endsAt: number; suddenDeath: boolean; size?: 'md' | 'lg' }) {
  const remaining = useRemaining(endsAt);
  const danger = remaining < 5;
  const urgent = remaining > 0 && remaining < 3;
  const pulse = useSharedValue(1);
  useEffect(() => {
    if (urgent) {
      pulse.set(withRepeat(withSequence(withTiming(1.16, { duration: 220 }), withTiming(1, { duration: 280 })), -1, false));
    } else {
      cancelAnimation(pulse);
      pulse.set(1);
    }
  }, [urgent, pulse]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: pulse.get() }] }));
  return (
    <View style={styles.row}>
      {suddenDeath ? <Text style={styles.skull}>💀</Text> : null}
      <Animated.View style={style}>
        <Text
          variant={size === 'lg' ? 'title2' : 'title3'}
          weight="800"
          tabular
          color={danger ? liveColors.live : liveColors.primary}
          style={textShadow}>
          {formatCountdown(remaining)}
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  skull: { fontSize: 15, lineHeight: 20 },
});
