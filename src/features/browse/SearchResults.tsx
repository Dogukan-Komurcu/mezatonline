/**
 * Arama sonuçları (Whatnot S15): Öne Çıkanlar · Ürünler · Yayınlar · Kullanıcılar · Kategoriler sekmeleri.
 * Ürünler: Filtrele / Sırala / Yayında / Satış Şekli çipleri, "Aramayı kaydet 🔖", liste düzeni.
 * Sorgu değişince ebeveyn `key` ile yeniden kurar (filtreler sıfırlanır).
 */
import { useMemo, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, View } from 'react-native';

import { CategoryTile } from '@/components/cards/CategoryTile';
import { UserRow } from '@/components/cards/UserRow';
import { Divider, EmptyState, Icon, PressableScale, Text, toast, type TabItem } from '@/components/ui';
import { search, TRENDING_SEARCHES } from '@/data';
import { AUTH_REASONS, requireAuth } from '@/features/auth/gate';
import { ShowRail } from '@/features/home/ShowRail';
import { scanText } from '@/features/trust/counterfeit';
import { formatNumber } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { radius, SCREEN_PADDING, useTheme } from '@/theme';
import type { ListingFormat } from '@/types';

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
  type ProductFilters,
  type ProductSort,
  type ShowFilters,
  type ShowSort,
} from './filters';
import { ShowGridRow } from './grids';
import { ProductRow } from './ProductRow';
import { ChoiceSheet, ProductFilterSheet, ShowFilterSheet } from './sheets';
import { useBrowseStore, useIsSearchSaved } from './store';
import { chunk } from './text';
import { ChipScroller, FilterChip, RevealScrollView, SectionTitle, useGridWidth, type RevealTarget } from './ui';

export type ResultTab = 'top' | 'products' | 'shows' | 'users' | 'categories';

type Results = ReturnType<typeof search>;

const PRODUCT_SORTS = (Object.keys(PRODUCT_SORT_LABELS) as ProductSort[]).map((key) => ({ key, label: PRODUCT_SORT_LABELS[key] }));
const SHOW_SORTS = (Object.keys(SHOW_SORT_LABELS) as ShowSort[]).map((key) => ({ key, label: SHOW_SORT_LABELS[key] }));

type FormatChoice = 'all' | ListingFormat;
const FORMAT_CHOICES: { key: FormatChoice; label: string }[] = [
  { key: 'all', label: 'Tümü' },
  { key: 'auction', label: 'Açık Artırma' },
  { key: 'buy_now', label: 'Hemen Al' },
];

// ─── Ürünler ─────────────────────────────────────────────────────────────────

function ProductsTab({ query, results, bottomInset }: { query: string; results: Results; bottomInset: number }) {
  const [filters, setFilters] = useState<ProductFilters>(EMPTY_PRODUCT_FILTERS);
  const [sort, setSort] = useState<ProductSort>('recommended');
  const [sheet, setSheet] = useState<'filter' | 'sort' | 'format' | null>(null);
  const [sheetKey, setSheetKey] = useState(0);
  const saved = useIsSearchSaved(query);
  const toggleSaved = useBrowseStore((s) => s.toggleSavedSearch);
  const list = useMemo(() => sortProducts(results.products.filter((p) => productMatches(p, filters)), sort), [results, filters, sort]);
  const filterCount = countProductFilters(filters);
  const formatChoice: FormatChoice = filters.formats.length === 1 ? filters.formats[0] : 'all';

  const open = (kind: 'filter' | 'sort' | 'format') => {
    setSheetKey((k) => k + 1);
    setSheet(kind);
  };

  const header = (
    <View>
      <ChipScroller contentStyle={styles.chips}>
        <FilterChip label="Filtrele" icon="options-outline" count={filterCount} selected={filterCount > 0} onPress={() => open('filter')} />
        <FilterChip label={sort === 'recommended' ? 'Sırala' : PRODUCT_SORT_LABELS[sort]} chevron selected={sort !== 'recommended'} onPress={() => open('sort')} />
        <FilterChip label="Yayında" selected={filters.inShow} onPress={() => setFilters((f) => ({ ...f, inShow: !f.inShow }))} />
        <FilterChip label={formatChoice === 'all' ? 'Satış Şekli' : FORMAT_CHOICES.find((c) => c.key === formatChoice)!.label} chevron selected={formatChoice !== 'all'} onPress={() => open('format')} />
      </ChipScroller>
      <View style={styles.resultsRow}>
        <Text variant="headline" style={styles.flex}>
          Sonuçlar{' '}
          <Text variant="subhead" color="textSecondary">
            ({formatNumber(list.length)})
          </Text>
        </Text>
        <PressableScale
          scaleTo={0.94}
          hitSlop={8}
          onPress={() =>
            requireAuth(
              () => {
                const on = toggleSaved(query, results.products.length);
                haptic.success();
                if (on) toast.success('Arama kaydedildi. Yeni sonuçlar çıktığında haber vereceğiz 🔔', 'bookmark');
                else toast('Kayıtlı arama kaldırıldı', 'bookmark-outline');
              },
              { reason: AUTH_REASONS.save },
            )
          }
          style={styles.saveBtn}
          accessibilityRole="button"
          accessibilityState={{ selected: saved }}
          accessibilityLabel={saved ? 'Arama kaydedildi' : 'Aramayı kaydet'}>
          <Text variant="subhead" weight="700" color="accent">
            {saved ? 'Kaydedildi' : 'Aramayı kaydet'}
          </Text>
          <Icon name={saved ? 'bookmark' : 'bookmark-outline'} size={16} color="accent" />
        </PressableScale>
      </View>
    </View>
  );

  const sheets = (
    <>
      <ProductFilterSheet
        key={`pf-${sheetKey}`}
        visible={sheet === 'filter'}
        onClose={() => setSheet(null)}
        value={filters}
        onApply={setFilters}
        countFor={(f) => results.products.filter((p) => productMatches(p, f)).length}
      />
      <ChoiceSheet title="Sırala" visible={sheet === 'sort'} onClose={() => setSheet(null)} options={PRODUCT_SORTS} value={sort} onSelect={setSort} />
      <ChoiceSheet
        title="Satış şekli"
        visible={sheet === 'format'}
        onClose={() => setSheet(null)}
        options={FORMAT_CHOICES}
        value={formatChoice}
        onSelect={(k) => setFilters((f) => ({ ...f, formats: k === 'all' ? [] : [k] }))}
      />
    </>
  );

  return (
    <View style={styles.flex}>
      <FlatList
        data={list}
        keyExtractor={(p) => p.id}
        ListHeaderComponent={header}
        renderItem={({ item }) => <ProductRow product={item} />}
        ItemSeparatorComponent={() => <Divider inset={SCREEN_PADDING} />}
        keyboardDismissMode="on-drag"
        contentContainerStyle={{ paddingBottom: bottomInset + 24 }}
        initialNumToRender={6}
        windowSize={9}
        ListEmptyComponent={
          <EmptyState
            icon="pricetags-outline"
            title="Bu filtrelere uygun ürün yok"
            message="Filtreleri temizleyip tekrar dene."
            actionLabel="Filtreleri temizle"
            onAction={() => {
              setFilters(EMPTY_PRODUCT_FILTERS);
              setSort('recommended');
            }}
          />
        }
      />
      {sheets}
    </View>
  );
}

// ─── Yayınlar ────────────────────────────────────────────────────────────────

function ShowsTab({ results, bottomInset }: { results: Results; bottomInset: number }) {
  const cardW = useGridWidth(2);
  const [filters, setFilters] = useState<ShowFilters>(EMPTY_SHOW_FILTERS);
  const [sort, setSort] = useState<ShowSort>('recommended');
  const [sheet, setSheet] = useState<'filter' | 'sort' | null>(null);
  const [sheetKey, setSheetKey] = useState(0);
  const list = useMemo(() => sortShows(results.shows.filter((s) => showMatches(s, filters)), sort), [results, filters, sort]);
  const rows = useMemo(() => chunk(list, 2), [list]);
  const filterCount = countShowFilters(filters);
  const onlyStatus = (st: 'live' | 'scheduled') =>
    setFilters((f) => ({ ...f, status: f.status.length === 1 && f.status[0] === st ? [] : [st] }));

  return (
    <View style={styles.flex}>
      <FlatList
        data={rows}
        keyExtractor={(r) => r.map((s) => s.id).join('-')}
        ListHeaderComponent={
          <View>
            <ChipScroller contentStyle={styles.chips}>
              <FilterChip
                label="Filtrele"
                icon="options-outline"
                count={filterCount}
                selected={filterCount > 0}
                onPress={() => {
                  setSheetKey((k) => k + 1);
                  setSheet('filter');
                }}
              />
              <FilterChip label={sort === 'recommended' ? 'Sırala' : SHOW_SORT_LABELS[sort]} chevron selected={sort !== 'recommended'} onPress={() => setSheet('sort')} />
              <FilterChip label="Şu an canlı" selected={filters.status.length === 1 && filters.status[0] === 'live'} onPress={() => onlyStatus('live')} />
              <FilterChip label="Yaklaşan" selected={filters.status.length === 1 && filters.status[0] === 'scheduled'} onPress={() => onlyStatus('scheduled')} />
            </ChipScroller>
            <Text variant="headline" style={styles.countLine}>
              {formatNumber(list.length)} yayın
            </Text>
          </View>
        }
        renderItem={({ item }) => <ShowGridRow shows={item} width={cardW} />}
        keyboardDismissMode="on-drag"
        contentContainerStyle={{ paddingBottom: bottomInset + 24 }}
        ListEmptyComponent={
          <EmptyState icon="videocam-outline" title="Bu filtrelere uygun yayın yok" actionLabel="Filtreleri temizle" onAction={() => setFilters(EMPTY_SHOW_FILTERS)} />
        }
      />
      <ShowFilterSheet
        key={`sf-${sheetKey}`}
        visible={sheet === 'filter'}
        onClose={() => setSheet(null)}
        value={filters}
        onApply={setFilters}
        countFor={(f) => results.shows.filter((s) => showMatches(s, f)).length}
      />
      <ChoiceSheet title="Sırala" visible={sheet === 'sort'} onClose={() => setSheet(null)} options={SHOW_SORTS} value={sort} onSelect={setSort} />
    </View>
  );
}

// ─── Kullanıcılar & Kategoriler ──────────────────────────────────────────────

function UsersTab({ results, bottomInset }: { results: Results; bottomInset: number }) {
  return (
    <FlatList
      data={results.users}
      keyExtractor={(u) => u.id}
      renderItem={({ item }) => <UserRow user={item} />}
      keyboardDismissMode="on-drag"
      contentContainerStyle={{ paddingTop: 6, paddingBottom: bottomInset + 24 }}
      ListEmptyComponent={<EmptyState icon="people-outline" title="Kullanıcı bulunamadı" message="Kullanıcı adını kontrol edip tekrar dene." />}
    />
  );
}

function CategoriesTab({ results, bottomInset }: { results: Results; bottomInset: number }) {
  const tileW = useGridWidth(3, 8);
  const rows = chunk(results.categories, 3);
  return (
    <FlatList
      data={rows}
      keyExtractor={(r) => r.map((c) => c.id).join('-')}
      renderItem={({ item }) => (
        <View style={styles.tileRow}>
          {item.map((c) => (
            <CategoryTile key={c.id} category={c} width={tileW} />
          ))}
        </View>
      )}
      contentContainerStyle={{ paddingTop: 12, paddingBottom: bottomInset + 24 }}
      ListEmptyComponent={<EmptyState icon="grid-outline" title="Kategori bulunamadı" />}
    />
  );
}

// ─── Öne Çıkanlar ────────────────────────────────────────────────────────────

function TopTab({ results, onTab, bottomInset }: { results: Results; onTab: (t: ResultTab) => void; bottomInset: number }) {
  const products = results.products.slice(0, 4);
  return (
    <ScrollView keyboardDismissMode="on-drag" contentContainerStyle={{ paddingBottom: bottomInset + 24 }} showsVerticalScrollIndicator={false}>
      {results.users.length ? (
        <View style={styles.topSection}>
          <SectionTitle title="Kullanıcılar" actionLabel="Tümünü gör" onAction={results.users.length > 3 ? () => onTab('users') : undefined} />
          {results.users.slice(0, 3).map((u) => (
            <UserRow key={u.id} user={u} />
          ))}
        </View>
      ) : null}
      <ShowRail title="Yayınlar" subtitle="Canlı ve yaklaşan" shows={results.shows.slice(0, 10)} actionLabel="Tümünü gör" onAction={() => onTab('shows')} />
      {products.length ? (
        <View style={styles.topSection}>
          <SectionTitle title="Ürünler" actionLabel="Tümünü gör" onAction={() => onTab('products')} />
          {products.map((p, i) => (
            <View key={p.id}>
              {i > 0 ? <Divider inset={SCREEN_PADDING} /> : null}
              <ProductRow product={p} />
            </View>
          ))}
        </View>
      ) : null}
      {results.categories.length ? (
        <View style={styles.topSection}>
          <SectionTitle title="Kategoriler" actionLabel="Tümünü gör" onAction={results.categories.length > 3 ? () => onTab('categories') : undefined} />
          <ChipScroller contentStyle={styles.catRail}>
            {results.categories.slice(0, 8).map((c) => (
              <CategoryTile key={c.id} category={c} width={118} />
            ))}
          </ChipScroller>
        </View>
      ) : null}
    </ScrollView>
  );
}

// ─── Sekme satırı ────────────────────────────────────────────────────────────

/**
 * Alt çizgili sekmeler (ortak UnderlineTabs görünümü) + etkin sekmeyi görünür alana kaydırma:
 * "Tümünü gör" ile ekran dışındaki Kullanıcılar / Kategoriler sekmesine geçilince çizgi görünür kalır.
 */
function ResultTabs({ tabs, value, onChange }: { tabs: TabItem<ResultTab>[]; value: ResultTab; onChange: (t: ResultTab) => void }) {
  const { colors } = useTheme();
  const [layouts, setLayouts] = useState<Record<string, RevealTarget>>({});
  return (
    <View style={[styles.tabsWrap, { borderBottomColor: colors.border }]}>
      <RevealScrollView target={layouts[value]} contentStyle={styles.tabsScroll}>
        {tabs.map((t) => {
          const selected = t.key === value;
          return (
            <PressableScale
              key={t.key}
              scaleTo={0.96}
              onPress={() => {
                haptic.tap();
                onChange(t.key);
              }}
              onLayout={(e) => {
                const { x, width } = e.nativeEvent.layout;
                setLayouts((prev) => (prev[t.key]?.x === x && prev[t.key]?.w === width ? prev : { ...prev, [t.key]: { x, w: width } }));
              }}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              style={styles.tab}>
              <Text variant="callout" weight={selected ? '700' : '600'} color={selected ? colors.text : colors.textSecondary} numberOfLines={1}>
                {t.label}
              </Text>
              <View style={[styles.indicator, { backgroundColor: selected ? colors.text : 'transparent' }]} />
            </PressableScale>
          );
        })}
      </RevealScrollView>
    </View>
  );
}

// ─── Taklit ürün uyarısı ─────────────────────────────────────────────────────

/** Sorguda "replika", "muadil", "A kalite" gibi yasaklı ifade varsa sonuçların üstünde gösterilir */
function CounterfeitNotice() {
  const { colors } = useTheme();
  return (
    <View style={[styles.notice, { backgroundColor: colors.surface }]}>
      <Icon name="shield-checkmark-outline" size={18} color="textSecondary" style={{ marginTop: 1 }} />
      <Text variant="footnote" color="textSecondary" style={styles.flex}>
        Mezatonline’da replika, taklit ya da bir markanın kopyası olarak sunulan ürünler satılmaz; böyle bir ilan görürsen ilan sayfasındaki “İlanı şikayet et” ile bildir.
      </Text>
    </View>
  );
}

// ─── Ana bileşen ─────────────────────────────────────────────────────────────

export function SearchResults({ query, bottomInset, onSearch, initialTab = 'top' }: { query: string; bottomInset: number; onSearch: (q: string) => void; initialTab?: ResultTab }) {
  const results = useMemo(() => search(query), [query]);
  const counterfeitQuery = useMemo(() => scanText([query]).banned.length > 0, [query]);
  const [tab, setTab] = useState<ResultTab>(initialTab);
  const total = results.products.length + results.shows.length + results.users.length + results.categories.length;

  if (!total) {
    return (
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: bottomInset + 24 }}>
        {counterfeitQuery ? <CounterfeitNotice /> : null}
        <EmptyState icon="search-outline" title={`“${query}” için sonuç bulunamadı`} message="Yazımı kontrol et ya da daha genel bir kelimeyle aramayı dene." />
        <Text variant="headline" style={styles.tryTitle}>
          Bunları denemeye ne dersin?
        </Text>
        <View style={styles.wrapChips}>
          {TRENDING_SEARCHES.slice(0, 8).map((q) => (
            <FilterChip key={q} label={q} icon="trending-up" onPress={() => onSearch(q)} />
          ))}
        </View>
      </ScrollView>
    );
  }

  // Sayılar etikete Türkçe biçimle (1.210) eklenir; 0 sonuçlu sekmede sayı gösterilmez
  const withCount = (label: string, n: number) => (n > 0 ? `${label} ${formatNumber(n)}` : label);
  const tabs: TabItem<ResultTab>[] = [
    { key: 'top', label: 'Öne Çıkanlar' },
    { key: 'products', label: withCount('Ürünler', results.products.length) },
    { key: 'shows', label: withCount('Yayınlar', results.shows.length) },
    { key: 'users', label: withCount('Kullanıcılar', results.users.length) },
    { key: 'categories', label: withCount('Kategoriler', results.categories.length) },
  ];

  return (
    <View style={styles.flex}>
      <ResultTabs tabs={tabs} value={tab} onChange={setTab} />
      {counterfeitQuery ? <CounterfeitNotice /> : null}
      {tab === 'top' ? <TopTab results={results} onTab={setTab} bottomInset={bottomInset} /> : null}
      {tab === 'products' ? <ProductsTab query={query} results={results} bottomInset={bottomInset} /> : null}
      {tab === 'shows' ? <ShowsTab results={results} bottomInset={bottomInset} /> : null}
      {tab === 'users' ? <UsersTab results={results} bottomInset={bottomInset} /> : null}
      {tab === 'categories' ? <CategoriesTab results={results} bottomInset={bottomInset} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  tabsWrap: { borderBottomWidth: StyleSheet.hairlineWidth },
  tabsScroll: { paddingHorizontal: SCREEN_PADDING - 8 },
  tab: { paddingHorizontal: 10, paddingTop: 12, alignItems: 'center' },
  indicator: { height: 3, borderRadius: 2, alignSelf: 'stretch', marginTop: 10 },
  chips: { paddingTop: 12, paddingBottom: 4 },
  resultsRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SCREEN_PADDING, paddingTop: 12, paddingBottom: 4, gap: 10 },
  saveBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  countLine: { paddingHorizontal: SCREEN_PADDING, paddingTop: 12, paddingBottom: 12 },
  tileRow: { flexDirection: 'row', gap: 8, paddingHorizontal: SCREEN_PADDING, marginBottom: 8 },
  topSection: { paddingTop: 18 },
  catRail: { gap: 8 },
  tryTitle: { paddingHorizontal: SCREEN_PADDING, marginBottom: 10 },
  wrapChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: SCREEN_PADDING },
  notice: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginHorizontal: SCREEN_PADDING, marginTop: 12, padding: 12, borderRadius: radius.md },
});
