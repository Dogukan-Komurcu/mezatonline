import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, StyleSheet, useWindowDimensions, View } from 'react-native';

import { ProductCard } from '@/components/cards/ProductCard';
import { ShowCard } from '@/components/cards/ShowCard';
import { EmptyState, Segmented, Text } from '@/components/ui';
import { getProduct, getShow } from '@/data';
import { useSocialStore } from '@/store/social';
import { SCREEN_PADDING } from '@/theme';
import type { Product, Show } from '@/types';

type SavedSegment = 'shows' | 'products';

const GAP = 12;
const STATUS_ORDER: Record<Show['status'], number> = { live: 0, scheduled: 1, ended: 2 };

export function SavedTab() {
  const { width } = useWindowDimensions();
  const [segment, setSegment] = useState<SavedSegment>('shows');
  const remindedIds = useSocialStore((s) => s.remindedShowIds);
  const savedIds = useSocialStore((s) => s.savedProductIds);
  const cardW = Math.floor((width - SCREEN_PADDING * 2 - GAP) / 2);

  const shows = remindedIds
    .map((id) => getShow(id))
    .filter((s): s is Show => !!s)
    .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || a.scheduledAt.localeCompare(b.scheduledAt));
  const products = savedIds.map((id) => getProduct(id)).filter((p): p is Product => !!p);

  const header = (
    <View style={styles.header}>
      <Segmented
        options={[
          { key: 'shows', label: `Yayınlar${shows.length ? ` (${shows.length})` : ''}` },
          { key: 'products', label: `Ürünler${products.length ? ` (${products.length})` : ''}` },
        ]}
        value={segment}
        onChange={setSegment}
      />
      {segment === 'shows' && shows.length ? (
        <Text variant="footnote" color="textSecondary" style={styles.hint}>
          Hatırlatıcı kurduğun yayınlar başladığında sana bildirim göndeririz.
        </Text>
      ) : null}
      {segment === 'products' && products.length ? (
        <Text variant="footnote" color="textSecondary" style={styles.hint}>
          Kaydettiğin ürünün fiyatı düşerse ya da yayında sahneye gelirse haber veririz.
        </Text>
      ) : null}
    </View>
  );

  if (segment === 'shows') {
    return (
      <FlatList
        key="saved-shows"
        data={shows}
        keyExtractor={(s) => s.id}
        numColumns={2}
        ListHeaderComponent={header}
        columnWrapperStyle={styles.column}
        contentContainerStyle={shows.length ? styles.content : styles.emptyContent}
        renderItem={({ item }) => <ShowCard show={item} width={cardW} />}
        ListEmptyComponent={
          <EmptyState
            emoji="🔖"
            title="Kaydedilen yayın yok"
            message="Yaklaşan yayınlarda kaydet simgesine dokunarak hatırlatıcı kur; yayın başlayınca haber verelim."
            actionLabel="Yayınları keşfet"
            onAction={() => router.navigate('/')}
          />
        }
      />
    );
  }

  return (
    <FlatList
      key="saved-products"
      data={products}
      keyExtractor={(p) => p.id}
      numColumns={2}
      ListHeaderComponent={header}
      columnWrapperStyle={styles.column}
      contentContainerStyle={products.length ? styles.content : styles.emptyContent}
      renderItem={({ item }) => <ProductCard product={item} width={cardW} />}
      ListEmptyComponent={
        <EmptyState
          emoji="❤️"
          title="Kaydedilen ürün yok"
          message="Beğendiğin ürünleri kalp simgesiyle kaydet; fiyatı düştüğünde sana haber verelim."
          actionLabel="Ürünlere göz at"
          onAction={() => router.navigate('/categories')}
        />
      }
    />
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: SCREEN_PADDING, paddingTop: 12, paddingBottom: 14, gap: 10 },
  hint: { marginHorizontal: 2 },
  column: { paddingHorizontal: SCREEN_PADDING, gap: GAP, marginBottom: 20 },
  content: { paddingBottom: 24 },
  emptyContent: { flexGrow: 1, paddingBottom: 40 },
});
