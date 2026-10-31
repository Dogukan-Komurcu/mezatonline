/**
 * Kategori sayfası (Whatnot /tag, S13): büyük başlık + Takip Et, alt kategori şeridi (filtre),
 * yapışkan çip satırı (Filtrele · Sırala · hızlı filtreler), canlı → yaklaşan yayın grid'i,
 * alt ortada yüzen "Yayınlar | Ürünler" hapı ile ürün grid'ine geçiş.
 */
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, RefreshControl, ScrollView, StyleSheet, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, EmptyState, Header, IconButton, Screen, Text, toast } from '@/components/ui';
import { getCategory, getLiveShows, getProductsByCategory, getUpcomingShows } from '@/data';
import {
  countProductFilters,
  countShowFilters,
  EMPTY_PRODUCT_FILTERS,
  EMPTY_SHOW_FILTERS,
  PRODUCT_SORT_LABELS,
  productMatches,
  SHOW_SORT_LABELS,
  showMatches,
  sortProducts,
  sortShows,
  toggleItem,
  type ProductFilters,
  type ProductSort,
  type ShowFilters,
  type ShowSort,
} from '@/features/browse/filters';
import { AUTH_REASONS, requireAuth } from '@/features/auth/gate';
import { ProductGridRow, ShowGridRow } from '@/features/browse/grids';
import { ModeSwitch, type BrowseMode } from '@/features/browse/ModeSwitch';
import { ChoiceSheet, ProductFilterSheet, ShowFilterSheet } from '@/features/browse/sheets';
import { SubcategoryTile } from '@/features/browse/SubcategoryTile';
import { chunk } from '@/features/browse/text';
import { ChipScroller, FilterChip, useGridWidth, ViewersMetric } from '@/features/browse/ui';
import { shareLink } from '@/features/shared/sheets';
import { formatNumber } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { useSocialStore } from '@/store/social';
import { SCREEN_PADDING, useTheme } from '@/theme';
import type { Product, Show } from '@/types';

type Row =
  | { type: 'hero'; key: string }
  | { type: 'subs'; key: string }
  | { type: 'chips'; key: string }
  | { type: 'heading'; key: string; title: string; count: number }
  | { type: 'shows'; key: string; shows: Show[] }
  | { type: 'products'; key: string; products: Product[] }
  | { type: 'empty'; key: string };

type SheetKind = 'filter' | 'sort' | null;

const SHOW_SORTS = (Object.keys(SHOW_SORT_LABELS) as ShowSort[]).map((key) => ({ key, label: SHOW_SORT_LABELS[key] }));
const PRODUCT_SORTS = (Object.keys(PRODUCT_SORT_LABELS) as ProductSort[]).map((key) => ({ key, label: PRODUCT_SORT_LABELS[key] }));

function matchesSub(show: Show, sub: string | null): boolean {
  return !sub || show.subcategoryId === sub || show.tags.includes(sub);
}

export default function CategoryScreen() {
  const params = useLocalSearchParams<{ id: string; sub?: string; view?: string; qa?: string }>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const cardW = useGridWidth(2);
  const category = getCategory(params.id);

  const followed = useSocialStore((s) => (category ? s.followedCategoryIds.includes(category.id) : false));
  const toggleFollowCategory = useSocialStore((s) => s.toggleFollowCategory);

  const [sub, setSub] = useState<string | null>(params.sub && category?.subcategories.some((s) => s.id === params.sub) ? params.sub : null);
  const [mode, setMode] = useState<BrowseMode>(params.view === 'products' ? 'products' : 'shows');
  const [showFilters, setShowFilters] = useState<ShowFilters>(EMPTY_SHOW_FILTERS);
  const [showSort, setShowSort] = useState<ShowSort>('recommended');
  const [productFilters, setProductFilters] = useState<ProductFilters>(EMPTY_PRODUCT_FILTERS);
  const [productSort, setProductSort] = useState<ProductSort>('recommended');
  const [sheet, setSheet] = useState<SheetKind>(null);
  const [sheetKey, setSheetKey] = useState(0);
  const [titleShown, setTitleShown] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // ─── Veri ───
  const baseShows = useMemo<Show[]>(() => {
    if (!category) return [];
    return [...getLiveShows({ categoryId: category.id }), ...getUpcomingShows({ categoryId: category.id })].filter((s) => matchesSub(s, sub));
  }, [category, sub]);
  const shows = useMemo(() => sortShows(baseShows.filter((s) => showMatches(s, showFilters)), showSort), [baseShows, showFilters, showSort]);

  const baseProducts = useMemo<Product[]>(() => (category ? getProductsByCategory(category.id, { subcategoryId: sub ?? undefined }) : []), [category, sub]);
  const products = useMemo(() => sortProducts(baseProducts.filter((p) => productMatches(p, productFilters)), productSort), [baseProducts, productFilters, productSort]);

  const liveCount = baseShows.filter((s) => s.status === 'live').length;

  // Yalnızca geliştirme: ekran görüntüsü QA'sı (?qa=filter | sort | scroll)
  const listRef = useRef<FlatList<Row>>(null);
  useEffect(() => {
    if (!__DEV__ || !params.qa) return;
    const t = setTimeout(() => {
      if (params.qa === 'filter' || params.qa === 'sort') {
        setSheetKey((k) => k + 1);
        setSheet(params.qa);
      } else if (params.qa === 'scroll') listRef.current?.scrollToOffset({ offset: 700, animated: false });
    }, 900);
    return () => clearTimeout(t);
  }, [params.qa]);

  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [
      { type: 'hero', key: 'hero' },
      { type: 'subs', key: 'subs' },
      { type: 'chips', key: 'chips' },
    ];
    if (mode === 'shows') {
      if (!shows.length) {
        out.push({ type: 'empty', key: 'empty-shows' });
      } else if (showSort === 'recommended' || showSort === 'viewers') {
        const live = shows.filter((s) => s.status === 'live');
        const upcoming = shows.filter((s) => s.status === 'scheduled');
        if (live.length) {
          out.push({ type: 'heading', key: 'h-live', title: 'Şu an canlı', count: live.length });
          chunk(live, 2).forEach((pair, i) => out.push({ type: 'shows', key: `l-${i}-${pair[0].id}`, shows: pair }));
        }
        if (upcoming.length) {
          out.push({ type: 'heading', key: 'h-up', title: 'Yaklaşan yayınlar', count: upcoming.length });
          chunk(upcoming, 2).forEach((pair, i) => out.push({ type: 'shows', key: `u-${i}-${pair[0].id}`, shows: pair }));
        }
      } else {
        out.push({ type: 'heading', key: 'h-all', title: SHOW_SORT_LABELS[showSort], count: shows.length });
        chunk(shows, 2).forEach((pair, i) => out.push({ type: 'shows', key: `s-${i}-${pair[0].id}`, shows: pair }));
      }
    } else if (!products.length) {
      out.push({ type: 'empty', key: 'empty-products' });
    } else {
      out.push({ type: 'heading', key: 'h-products', title: productSort === 'recommended' ? 'Ürünler' : PRODUCT_SORT_LABELS[productSort], count: products.length });
      chunk(products, 2).forEach((pair, i) => out.push({ type: 'products', key: `p-${i}-${pair[0].id}`, products: pair }));
    }
    return out;
  }, [mode, shows, products, showSort, productSort]);

  if (!category) {
    return (
      <Screen>
        <Header title="Kategori" />
        <EmptyState icon="grid-outline" title="Kategori bulunamadı" message="Aradığın kategori kaldırılmış ya da taşınmış olabilir." actionLabel="Kategorilere dön" onAction={() => router.navigate('/categories')} />
      </Screen>
    );
  }

  const openSheet = (kind: Exclude<SheetKind, null>) => {
    setSheetKey((k) => k + 1);
    setSheet(kind);
  };

  const onFollow = () => {
    const was = useSocialStore.getState().followedCategoryIds.includes(category.id);
    requireAuth(
      () => {
        // Kayıtta ilgi alanı olarak seçildiyse takibi geri alma
        if (useSocialStore.getState().followedCategoryIds.includes(category.id) !== was) {
          if (!was) toast.success(`${category.shortName} takip ediliyor. Yeni yayınlardan haberdar olacaksın.`, 'heart');
          return;
        }
        const on = toggleFollowCategory(category.id);
        haptic.success();
        toast.success(on ? `${category.shortName} takip ediliyor. Yeni yayınlardan haberdar olacaksın.` : 'Kategori takipten çıkarıldı', on ? 'heart' : 'heart-dislike-outline');
      },
      { reason: AUTH_REASONS.follow },
    );
  };

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const shown = e.nativeEvent.contentOffset.y > 44;
    if (shown !== titleShown) setTitleShown(shown);
  };

  const clearAll = () => {
    haptic.tap();
    if (mode === 'shows') {
      setShowFilters(EMPTY_SHOW_FILTERS);
      setShowSort('recommended');
    } else {
      setProductFilters(EMPTY_PRODUCT_FILTERS);
      setProductSort('recommended');
    }
    setSub(null);
  };

  const flag = (key: Exclude<keyof ShowFilters, 'status'>) => setShowFilters((f) => ({ ...f, [key]: !f[key] }));
  const filterCount = mode === 'shows' ? countShowFilters(showFilters) : countProductFilters(productFilters);
  const sortLabel = mode === 'shows' ? (showSort === 'recommended' ? 'Sırala' : SHOW_SORT_LABELS[showSort]) : productSort === 'recommended' ? 'Sırala' : PRODUCT_SORT_LABELS[productSort];
  const sortActive = mode === 'shows' ? showSort !== 'recommended' : productSort !== 'recommended';

  const renderRow = ({ item }: { item: Row }) => {
    switch (item.type) {
      case 'hero':
        return (
          <View style={styles.hero}>
            <Text variant="title1" numberOfLines={2}>
              {category.name}
            </Text>
            <View style={styles.heroRow}>
              <Button
                title={followed ? 'Takip ediliyor' : 'Takip Et'}
                icon={followed ? 'checkmark' : 'add'}
                size="sm"
                variant={followed ? 'secondary' : 'primary'}
                onPress={onFollow}
              />
              <ViewersMetric viewers={category.viewers} />
              <Text variant="footnote" weight="600" color="textSecondary" numberOfLines={1} style={styles.liveCount}>
                · {liveCount} canlı yayın
              </Text>
            </View>
          </View>
        );
      case 'subs':
        return (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.subs}>
            {category.subcategories.map((s) => (
              <SubcategoryTile key={s.id} sub={s} selected={sub === s.id} onPress={() => setSub((cur) => (cur === s.id ? null : s.id))} />
            ))}
          </ScrollView>
        );
      case 'chips':
        return (
          <View style={[styles.chipBar, { backgroundColor: colors.bg, borderBottomColor: colors.border }]}>
            <ChipScroller>
              <FilterChip label="Filtrele" icon="options-outline" count={filterCount} selected={filterCount > 0} onPress={() => openSheet('filter')} />
              <FilterChip label={sortLabel} chevron selected={sortActive} onPress={() => openSheet('sort')} />
              {mode === 'shows' ? (
                <>
                  <FilterChip label="Önerilen" selected={showSort === 'recommended'} onPress={() => setShowSort('recommended')} />
                  <FilterChip label="En İyi Satıcılar" selected={showFilters.topSellers} onPress={() => flag('topSellers')} />
                  <FilterChip label="Yeni ve Dikkat Çekenler" selected={showFilters.fresh} onPress={() => flag('fresh')} />
                  <FilterChip label="₺1 Başlangıç" selected={showFilters.oneLira} onPress={() => flag('oneLira')} />
                  <FilterChip label="Ani Bitiş 💀" selected={showFilters.suddenDeath} onPress={() => flag('suddenDeath')} />
                  <FilterChip label="Ücretsiz Kargo" selected={showFilters.freeShipping} onPress={() => flag('freeShipping')} />
                  <FilterChip label="Çekiliş" selected={showFilters.giveaway} onPress={() => flag('giveaway')} />
                </>
              ) : (
                <>
                  <FilterChip label="Önerilen" selected={productSort === 'recommended'} onPress={() => setProductSort('recommended')} />
                  <FilterChip
                    label="Açık Artırma"
                    selected={productFilters.formats.includes('auction')}
                    onPress={() => setProductFilters((f) => ({ ...f, formats: toggleItem(f.formats, 'auction') }))}
                  />
                  <FilterChip
                    label="Hemen Al"
                    selected={productFilters.formats.includes('buy_now')}
                    onPress={() => setProductFilters((f) => ({ ...f, formats: toggleItem(f.formats, 'buy_now') }))}
                  />
                  <FilterChip label="Yayında" selected={productFilters.inShow} onPress={() => setProductFilters((f) => ({ ...f, inShow: !f.inShow }))} />
                  <FilterChip label="Fiyat Önerisine Açık" selected={productFilters.acceptsOffers} onPress={() => setProductFilters((f) => ({ ...f, acceptsOffers: !f.acceptsOffers }))} />
                </>
              )}
            </ChipScroller>
          </View>
        );
      case 'heading':
        return (
          <View style={styles.heading}>
            <Text variant="headline">{item.title}</Text>
            <Text variant="footnote" color="textSecondary">
              {formatNumber(item.count)} {mode === 'shows' ? 'yayın' : 'ürün'}
            </Text>
          </View>
        );
      case 'shows':
        return <ShowGridRow shows={item.shows} width={cardW} />;
      case 'products':
        return <ProductGridRow products={item.products} width={cardW} />;
      case 'empty':
        return (
          <EmptyState
            icon={mode === 'shows' ? 'videocam-outline' : 'pricetags-outline'}
            title={mode === 'shows' ? 'Bu seçime uygun yayın yok' : 'Bu seçime uygun ürün yok'}
            message={
              mode === 'shows'
                ? 'Filtreleri temizleyebilir ya da kategoriyi takip edip yeni yayınlardan ilk sen haberdar olabilirsin.'
                : 'Fiyat aralığını genişletmeyi ya da filtreleri temizlemeyi dene.'
            }
            actionLabel="Filtreleri temizle"
            onAction={clearAll}
          />
        );
      default:
        return null;
    }
  };

  return (
    <View style={[styles.flex, { backgroundColor: colors.bg }]}>
      <Header
        title={titleShown ? category.shortName : undefined}
        border={titleShown}
        right={
          <>
            <IconButton name="search-outline" accessibilityLabel="Ara" onPress={() => router.push('/search')} />
            <IconButton
              name="share-outline"
              accessibilityLabel="Paylaş"
              onPress={() => shareLink({ title: `${category.name} — Mezatonline`, path: `/category/${category.id}`, message: `${category.name} kategorisindeki canlı mezatlara göz at 🔥` })}
            />
          </>
        }
      />
      <FlatList
        ref={listRef}
        data={rows}
        keyExtractor={(r) => r.key}
        renderItem={renderRow}
        stickyHeaderIndices={[2]}
        onScroll={onScroll}
        scrollEventThrottle={32}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 96 }}
        initialNumToRender={8}
        windowSize={9}
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
      />
      <ModeSwitch value={mode} onChange={setMode} bottom={insets.bottom + 16} />

      {mode === 'shows' ? (
        <ShowFilterSheet
          key={`sf-${sheetKey}`}
          visible={sheet === 'filter'}
          onClose={() => setSheet(null)}
          value={showFilters}
          onApply={setShowFilters}
          countFor={(f) => baseShows.filter((s) => showMatches(s, f)).length}
        />
      ) : (
        <ProductFilterSheet
          key={`pf-${sheetKey}`}
          visible={sheet === 'filter'}
          onClose={() => setSheet(null)}
          value={productFilters}
          onApply={setProductFilters}
          countFor={(f) => baseProducts.filter((p) => productMatches(p, f)).length}
        />
      )}
      {mode === 'shows' ? (
        <ChoiceSheet title="Sırala" visible={sheet === 'sort'} onClose={() => setSheet(null)} options={SHOW_SORTS} value={showSort} onSelect={setShowSort} />
      ) : (
        <ChoiceSheet title="Sırala" visible={sheet === 'sort'} onClose={() => setSheet(null)} options={PRODUCT_SORTS} value={productSort} onSelect={setProductSort} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  liveCount: { flexShrink: 1, marginLeft: -5 },
  hero: { paddingHorizontal: SCREEN_PADDING, paddingTop: 2, paddingBottom: 16, gap: 12 },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  subs: { paddingHorizontal: SCREEN_PADDING, gap: 8, paddingBottom: 14 },
  chipBar: { paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  heading: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: SCREEN_PADDING, paddingTop: 16, paddingBottom: 12 },
});
