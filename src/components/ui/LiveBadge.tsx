import { useEffect } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

import { formatCompact } from '@/lib/format';
import { brand } from '@/theme';

import { Icon } from './Icon';
import { Text } from './Text';

export type LiveBadgeProps = {
  viewers?: number;
  size?: 'sm' | 'md';
  style?: StyleProp<ViewStyle>;
};

/** Kırmızı "Canlı · 284" rozeti (Whatnot kart rozeti) */
export function LiveBadge({ viewers, size = 'sm', style }: LiveBadgeProps) {
  const pulse = useSharedValue(1);
  useEffect(() => {
    pulse.set(withRepeat(withSequence(withTiming(0.35, { duration: 700 }), withTiming(1, { duration: 700 })), -1));
  }, [pulse]);
  const dotStyle = useAnimatedStyle(() => ({ opacity: pulse.get() }));
  return (
    <View style={[styles.badge, size === 'md' && styles.md, style]}>
      <Animated.View style={[styles.dot, dotStyle]} />
      <Text variant={size === 'md' ? 'footnote' : 'caption'} weight="700" color="#FFFFFF">
        CANLI{viewers !== undefined ? ` • ${formatCompact(viewers)}` : ''}
      </Text>
    </View>
  );
}

/** Video üstünde izleyici sayısı: göz ikonu + sayı */
export function ViewerCount({ viewers, style }: { viewers: number; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.viewers, style]}>
      <View style={styles.viewersIcon}>
        <Icon name="stats-chart" size={10} color="#FFFFFF" />
      </View>
      <Text variant="footnote" weight="700" color="#FFFFFF" tabular>
        {formatCompact(viewers)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: brand.live,
    borderRadius: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  md: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFFFFF' },
  viewers: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 999,
    paddingLeft: 3,
    paddingRight: 9,
    paddingVertical: 3,
  },
  viewersIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: brand.live,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
