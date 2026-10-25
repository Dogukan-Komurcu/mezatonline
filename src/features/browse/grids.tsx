/**
 * FlatList satırı olarak kullanılan 2 sütunlu grid satırları (performans için satır bazlı sanallaştırma).
 */
import type { Ref } from 'react';
import { StyleSheet, View, type ViewInstance } from 'react-native';

import { ProductCard } from '@/components/cards/ProductCard';
import { ShowCard } from '@/components/cards/ShowCard';
import { SCREEN_PADDING } from '@/theme';
import type { Product, Show } from '@/types';

export const GRID_GAP = 12;
export const GRID_ROW_GAP = 20;

/** İki yayın kartı yan yana. `firstRef` ilk kartın sarmalayıcısına bağlanır (ilk açılış ipucu için). */
export function ShowGridRow({ shows, width, firstRef }: { shows: Show[]; width: number; firstRef?: Ref<ViewInstance> }) {
  return (
    <View style={styles.row}>
      {shows.map((show, i) => (
        <View key={show.id} ref={i === 0 ? firstRef : undefined} collapsable={false}>
          <ShowCard show={show} width={width} />
        </View>
      ))}
    </View>
  );
}

export function ProductGridRow({ products, width }: { products: Product[]; width: number }) {
  return (
    <View style={styles.row}>
      {products.map((p) => (
        <ProductCard key={p.id} product={p} width={width} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: GRID_GAP, paddingHorizontal: SCREEN_PADDING, marginBottom: GRID_ROW_GAP },
});
