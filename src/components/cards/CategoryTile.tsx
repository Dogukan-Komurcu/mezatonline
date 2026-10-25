import { Image } from 'expo-image';
import { router } from 'expo-router';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Icon, PressableScale, Text } from '@/components/ui';
import { formatCompact } from '@/lib/format';
import { radius, useTheme } from '@/theme';
import type { Category, Subcategory } from '@/types';

/**
 * "Kategoriye Göz At" kutucuğu (Whatnot /browse grid'i):
 * sol üstte kategori adı, ortada görsel, altta kırmızı ikon + "34,5B izleyici".
 */
export function CategoryTile({ category, width, style }: { category: Category; width: number; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  return (
    <PressableScale onPress={() => router.push(`/category/${category.id}`)} style={[styles.tile, { width, backgroundColor: colors.surface }, style]} accessibilityRole="button" accessibilityLabel={category.name}>
      <Text variant="subhead" weight="700" numberOfLines={2} style={styles.name}>
        {category.name}
      </Text>
      <View style={[styles.imageWrap, { backgroundColor: category.tint }]}>
        <Image source={{ uri: category.image }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} cachePolicy="memory-disk" />
      </View>
      <View style={styles.viewers}>
        <View style={[styles.liveIcon, { backgroundColor: colors.live }]}>
          <Icon name="stats-chart" size={8} color="#FFFFFF" />
        </View>
        <Text variant="caption" color="textSecondary">
          {formatCompact(category.viewers)} izleyici
        </Text>
      </View>
    </PressableScale>
  );
}

/** Alt kategori çipi: küçük görsel + ad + izleyici (kategori sayfası üst şeridi) */
export function SubcategoryPill({ sub, selected, onPress }: { sub: Subcategory; selected?: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <PressableScale onPress={onPress} style={[styles.pill, { borderColor: selected ? colors.text : 'transparent', backgroundColor: colors.surface }]}>
      <Image source={{ uri: sub.image }} style={styles.pillImage} contentFit="cover" />
      <View style={styles.pillShade} />
      <View style={styles.pillTexts}>
        <Text variant="footnote" weight="700" color="#FFFFFF" numberOfLines={1}>
          {sub.name}
        </Text>
        <View style={styles.viewers}>
          <View style={[styles.liveIcon, { backgroundColor: colors.live }]}>
            <Icon name="stats-chart" size={8} color="#FFFFFF" />
          </View>
          <Text variant="caption" color="#FFFFFF">
            {formatCompact(sub.viewers)}
          </Text>
        </View>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  tile: { borderRadius: radius.md, padding: 10, gap: 8 },
  name: { minHeight: 36 },
  imageWrap: { height: 74, borderRadius: radius.sm, overflow: 'hidden' },
  viewers: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  liveIcon: { width: 14, height: 14, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  pill: { width: 142, height: 70, borderRadius: radius.md, overflow: 'hidden', borderWidth: 2 },
  pillImage: { ...StyleSheet.absoluteFill },
  pillShade: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.45)' },
  pillTexts: { flex: 1, padding: 8, justifyContent: 'space-between' },
});
