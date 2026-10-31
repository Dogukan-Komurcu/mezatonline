import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

import { Icon, Text } from '@/components/ui';
import { SUDDEN_DEATH_LABEL } from '@/lib/auction';
import { formatCountdown } from '@/lib/format';
import { liveColors } from '@/theme';

import { useRemaining } from '../useLiveShow';
import { textShadow } from './styles';

export type CountdownProps = {
  endsAt: number;
  /** Uzatmasız mezat (ekran okuyucu etiketinde belirtilir; biçim çipi kartta gösterilir) */
  suddenDeath: boolean;
  size?: 'md' | 'lg';
  /** Saat ikonu (varsayılan açık) */
  icon?: boolean;
};

/** Açık artırma sayacı: saat ikonu + kalan süre; son 5 sn nar kırmızısı, son 3 sn nabız atar. */
export function Countdown({ endsAt, suddenDeath, size = 'md', icon = true }: CountdownProps) {
  const remaining = useRemaining(endsAt);
  const danger = remaining < 5;
  const urgent = remaining > 0 && remaining < 3;
  const pulse = useSharedValue(1);
  useEffect(() => {
    if (urgent) {
      pulse.set(withRepeat(withSequence(withTiming(1.14, { duration: 220 }), withTiming(1, { duration: 280 })), -1, false));
    } else {
      cancelAnimation(pulse);
      pulse.set(1);
    }
  }, [urgent, pulse]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: pulse.get() }] }));
  const color = danger ? liveColors.live : liveColors.text;
  const label = formatCountdown(remaining);
  return (
    <View style={styles.row} accessible accessibilityLabel={`${suddenDeath ? `${SUDDEN_DEATH_LABEL} mezat, ` : ''}kalan süre ${label}`}>
      {icon ? <Icon name="time-outline" size={size === 'lg' ? 20 : 16} color={color} /> : null}
      <Animated.View style={style}>
        <Text variant={size === 'lg' ? 'title2' : 'title3'} weight="800" tabular color={color} style={textShadow}>
          {label}
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
