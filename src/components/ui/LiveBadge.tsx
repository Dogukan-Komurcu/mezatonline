import { useEffect } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

import { formatCompact } from '@/lib/format';
import { brand, liveColors } from '@/theme';

import { Icon } from './Icon';
import { Text } from './Text';

export type LiveBadgeProps = {
  viewers?: number;
  size?: 'sm' | 'md';
  style?: StyleProp<ViewStyle>;
};

/** Nar kırmızısı "CANLI · 284" hap etiketi (kartlar ve listeler); nokta yavaşça nabız atar */
export function LiveBadge({ viewers, size = 'sm', style }: LiveBadgeProps) {
  const pulse = useSharedValue(1);
  useEffect(() => {
    pulse.set(withRepeat(withSequence(withTiming(0.35, { duration: 700 }), withTiming(1, { duration: 700 })), -1));
  }, [pulse]);
  const dotStyle = useAnimatedStyle(() => ({ opacity: pulse.get() }));
  return (
    <View style={[styles.badge, size === 'md' && styles.md, style]}>
      <Animated.View style={[styles.dot, dotStyle]} />
      <Text variant={size === 'md' ? 'footnote' : 'caption'} weight="700" color={brand.white}>
        CANLI{viewers !== undefined ? ` · ${formatCompact(viewers)}` : ''}
      </Text>
    </View>
  );
}

/** Video üstünde izleyici sayacı: cam hap içinde göz ikonu + sayı */
export function ViewerCount({ viewers, style }: { viewers: number; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.viewers, style]}>
      <Icon name="eye-outline" size={15} color={liveColors.text} />
      <Text variant="footnote" weight="700" color={liveColors.text} tabular>
        {formatCompact(viewers)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: brand.live,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  md: { paddingHorizontal: 10, paddingVertical: 4 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: brand.white },
  viewers: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 32,
    backgroundColor: liveColors.glass,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: liveColors.border,
    borderRadius: 999,
    paddingHorizontal: 10,
  },
});
