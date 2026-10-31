/**
 * Kategori sayfası alt kategori kutucuğu (Whatnot /tag sayfası): 2:1 görsel, %50 karartma,
 * üstte ortalı beyaz ad, altta göz ikonu + izleyici. Seçili = turkuaz çerçeve.
 */
import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { Icon, PressableScale, Text } from '@/components/ui';
import { haptic } from '@/lib/haptics';
import { liveColors, radius, useTheme } from '@/theme';
import type { Subcategory } from '@/types';

import { ViewersMetric } from './ui';

export const SUBCATEGORY_TILE_W = 176;
export const SUBCATEGORY_TILE_H = 88;

export function SubcategoryTile({ sub, selected, onPress }: { sub: Subcategory; selected?: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <PressableScale
      scaleTo={0.96}
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={sub.name}
      style={[styles.tile, { backgroundColor: colors.primary }]}>
      <Image source={{ uri: sub.image }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} cachePolicy="memory-disk" recyclingKey={sub.id} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: liveColors.glassStrong }]} />
      {selected ? <View pointerEvents="none" style={[styles.ring, { borderColor: colors.primary }]} /> : null}
      <Text variant="subhead" weight="700" color={liveColors.text} align="center" numberOfLines={1} style={styles.label}>
        {sub.name}
      </Text>
      <View style={styles.bottom}>
        <ViewersMetric viewers={sub.viewers} light size="sm" />
      </View>
      {selected ? (
        <View style={[styles.check, { backgroundColor: colors.primary }]}>
          <Icon name="checkmark" size={13} color={colors.onPrimary} />
        </View>
      ) : null}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  tile: {
    width: SUBCATEGORY_TILE_W,
    height: SUBCATEGORY_TILE_H,
    borderRadius: radius.sm,
    overflow: 'hidden',
    justifyContent: 'space-between',
    paddingVertical: 9,
    paddingHorizontal: 10,
  },
  ring: { ...StyleSheet.absoluteFill, borderWidth: 3, borderRadius: radius.sm },
  label: { textShadowColor: 'rgba(0,0,0,0.35)', textShadowRadius: 3 },
  bottom: { flexDirection: 'row', justifyContent: 'center' },
  check: { position: 'absolute', top: 5, right: 5, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
