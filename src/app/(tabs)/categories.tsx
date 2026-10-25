/**
 * Kategoriler sekmesi (Whatnot Browse, S12): arama hapı, Önerilen | Popüler | A-Z çipleri,
 * 3 sütunlu kategori kutucukları; takip edilen kategoriler en üstte ayrı bölümde.
 */
import { useScrollToTop } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CategoryTile } from '@/components/cards/CategoryTile';
import { Text } from '@/components/ui';
import { CATEGORIES, CATEGORIES_BY_POPULARITY } from '@/data';
import { chunk } from '@/features/browse/text';
import { ChipScroller, FilterChip, SearchPill, useGridWidth } from '@/features/browse/ui';
import { formatCompact } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { useAuthStore } from '@/store/auth';
import { useSocialStore } from '@/store/social';
import { SCREEN_PADDING, useTheme } from '@/theme';
import type { Category } from '@/types';

type SortKey = 'recommended' | 'popular' | 'az';

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'recommended', label: 'Önerilen' },
  { key: 'popular', label: 'Popüler' },
  { key: 'az', label: 'A - Z' },
];

const GAP = 8;

type Row = { type: 'title'; key: string; title: string; subtitle?: string } | { type: 'tiles'; key: string; items: Category[] };

function sortCategories(sort: SortKey, interests: string[]): Category[] {
  if (sort === 'popular') return CATEGORIES_BY_POPULARITY;
  if (sort === 'az') return [...CATEGORIES].sort((a, b) => a.name.localeCompare(b.name, 'tr-TR'));
  // Önerilen: önce ilgi alanları, sonra küratörlü sıra
  return [...CATEGORIES.filter((c) => interests.includes(c.id)), ...CATEGORIES.filter((c) => !interests.includes(c.id))];
}

export default function CategoriesScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const tileW = useGridWidth(3, GAP);
  const interests = useAuthStore((s) => s.interests);
  const followed = useSocialStore((s) => s.followedCategoryIds);
  const [sort, setSort] = useState<SortKey>('recommended');
  const [refreshing, setRefreshing] = useState(false);
  const listRef = useRef<FlatList<Row>>(null);
  useScrollToTop(listRef);

  const totalViewers = useMemo(() => CATEGORIES.reduce((s, c) => s + c.viewers, 0), []);

  const rows = useMemo<Row[]>(() => {
    const sorted = sortCategories(sort, interests);
    const followedCats = followed.map((id) => CATEGORIES.find((c) => c.id === id)).filter(Boolean) as Category[];
    const out: Row[] = [];
    if (followedCats.length) {
      out.push({ type: 'title', key: 't-followed', title: 'Takip ettiğin kategoriler' });
      chunk(followedCats, 3).forEach((items, i) => out.push({ type: 'tiles', key: `f-${i}-${items[0].id}`, items }));
      out.push({ type: 'title', key: 't-all', title: 'Tüm kategoriler', subtitle: `${CATEGORIES.length} kategori` });
    }
    chunk(sorted, 3).forEach((items, i) => out.push({ type: 'tiles', key: `a-${sort}-${i}-${items[0].id}`, items }));
    return out;
  }, [sort, interests, followed]);

  return (
    <View style={[styles.flex, { backgroundColor: colors.bg, paddingTop: insets.top }]}>
      <View style={styles.top}>
        <SearchPill placeholder="Kategori, satıcı veya ürün ara" variant="filled" height={46} />
      </View>
      <FlatList
        ref={listRef}
        data={rows}
        keyExtractor={(r) => r.key}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={colors.textSecondary}
            colors={[colors.text]}
            progressBackgroundColor={colors.card}
            onRefresh={() => {
              setRefreshing(true);
              haptic.light();
              setTimeout(() => setRefreshing(false), 800);
            }}
          />
        }
        ListHeaderComponent={
          <View>
            <ChipScroller contentStyle={styles.chips}>
              {SORTS.map((s) => (
                <FilterChip key={s.key} label={s.label} selected={sort === s.key} onPress={() => setSort(s.key)} />
              ))}
            </ChipScroller>
            <View style={styles.live}>
              <View style={[styles.liveDot, { backgroundColor: colors.live }]} />
              <Text variant="footnote" weight="600" color="textSecondary">
                Şu an {formatCompact(totalViewers)} kişi canlı yayın izliyor
              </Text>
            </View>
          </View>
        }
        renderItem={({ item }) =>
          item.type === 'title' ? (
            <View style={styles.title}>
              <Text variant="title3">{item.title}</Text>
              {item.subtitle ? (
                <Text variant="footnote" color="textSecondary">
                  {item.subtitle}
                </Text>
              ) : null}
            </View>
          ) : (
            <View style={styles.row}>
              {item.items.map((c) => (
                <CategoryTile key={c.id} category={c} width={tileW} />
              ))}
            </View>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  top: { paddingHorizontal: SCREEN_PADDING, paddingTop: 6, paddingBottom: 10 },
  chips: { paddingBottom: 4 },
  live: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: SCREEN_PADDING, paddingTop: 10, paddingBottom: 14 },
  liveDot: { width: 7, height: 7, borderRadius: 4 },
  content: { paddingBottom: 24 },
  title: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: SCREEN_PADDING, paddingTop: 10, paddingBottom: 10 },
  row: { flexDirection: 'row', gap: GAP, paddingHorizontal: SCREEN_PADDING, marginBottom: GAP },
});
