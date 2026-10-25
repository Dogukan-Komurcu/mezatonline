/**
 * Ekranın altında ortada yüzen "Yayınlar | Ürünler" hapı (Whatnot kategori akışı).
 * Siyah kapsül; seçili bölüm ters renkli hap.
 */
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { PressableScale, Text } from '@/components/ui';
import { haptic } from '@/lib/haptics';
import { radius, useTheme } from '@/theme';

export type BrowseMode = 'shows' | 'products';

const OPTIONS: { key: BrowseMode; label: string }[] = [
  { key: 'shows', label: 'Yayınlar' },
  { key: 'products', label: 'Ürünler' },
];

export function ModeSwitch({ value, onChange, bottom }: { value: BrowseMode; onChange: (m: BrowseMode) => void; bottom: number }) {
  const { colors } = useTheme();
  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom }]}>
      <Animated.View entering={FadeInDown.springify().damping(18)} style={[styles.capsule, { backgroundColor: colors.inverse, shadowColor: '#000' }]}>
        {OPTIONS.map((o) => {
          const selected = o.key === value;
          return (
            <PressableScale
              key={o.key}
              scaleTo={0.95}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              onPress={() => {
                if (selected) return;
                haptic.tap();
                onChange(o.key);
              }}
              style={[styles.item, selected && { backgroundColor: colors.onInverse }]}>
              <Text variant="callout" weight="700" color={selected ? colors.inverse : colors.onInverse}>
                {o.label}
              </Text>
            </PressableScale>
          );
        })}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  capsule: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: radius.pill,
    shadowOpacity: 0.25,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  item: { paddingHorizontal: 20, paddingVertical: 9, borderRadius: radius.pill },
});
