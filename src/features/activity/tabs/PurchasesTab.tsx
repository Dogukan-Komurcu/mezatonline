import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import { Divider, EmptyState, Text } from '@/components/ui';
import { haptic } from '@/lib/haptics';
import { ME_ID } from '@/store/auth';
import { useOrdersStore } from '@/store/orders';
import { SCREEN_PADDING, useTheme } from '@/theme';
import type { Order } from '@/types';

import { FilterChips, OrderCard } from '../components';
import { dayGroupLabel, matchesPurchaseFilter, PURCHASE_FILTERS, useNow, type PurchaseFilter } from '../utils';

type Row = { kind: 'header'; key: string; label: string } | { kind: 'order'; key: string; order: Order; last: boolean };

const EMPTY: Record<PurchaseFilter, { emoji: string; title: string; message: string }> = {
  all: { emoji: '🛍️', title: 'Henüz siparişin yok', message: 'Canlı yayınlarda teklif ver ya da Hemen Al ile satın al; siparişlerin burada görünecek.' },
  active: { emoji: '📦', title: 'Devam eden siparişin yok', message: 'Hazırlanan ve kargodaki siparişlerin burada listelenir.' },
  completed: { emoji: '✅', title: 'Tamamlanan siparişin yok', message: 'Teslim edilen siparişlerin burada görünecek.' },
  review: { emoji: '⭐', title: 'Değerlendirme bekleyen sipariş yok', message: 'Teslim edilen siparişlerini 30 gün içinde puanlayabilirsin.' },
  cancelled: { emoji: '↩️', title: 'İptal veya iade yok', message: 'İptal ettiğin ya da iade talebinde bulunduğun siparişler burada görünür.' },
};

export function PurchasesTab() {
  const { colors } = useTheme();
  const orders = useOrdersStore((s) => s.orders);
  const advanceOrders = useOrdersStore((s) => s.advanceOrders);
  const [filter, setFilter] = useState<PurchaseFilter>('all');
  const [refreshing, setRefreshing] = useState(false);
  const now = useNow(60_000);

  const mine = orders.filter((o) => o.buyerId === ME_ID);
  const reviewCount = mine.filter((o) => matchesPurchaseFilter(o, 'review')).length;
  const list = mine.filter((o) => matchesPurchaseFilter(o, filter)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const rows: Row[] = [];
  let currentLabel = '';
  list.forEach((order, i) => {
    const label = dayGroupLabel(order.createdAt, now);
    if (label !== currentLabel) {
      currentLabel = label;
      rows.push({ kind: 'header', key: `h_${label}`, label });
    }
    const next = list[i + 1];
    rows.push({ kind: 'order', key: order.id, order, last: !next || dayGroupLabel(next.createdAt, now) !== label });
  });

  const onRefresh = () => {
    setRefreshing(true);
    haptic.light();
    setTimeout(() => {
      advanceOrders();
      setRefreshing(false);
    }, 800);
  };

  const empty = EMPTY[filter];
  const chips = PURCHASE_FILTERS.map((f) => (f.key === 'review' ? { ...f, count: reviewCount } : f));

  return (
    <View style={styles.flex}>
      <FilterChips options={chips} value={filter} onChange={setFilter} />
      <FlatList
        data={rows}
        keyExtractor={(r) => r.key}
        contentContainerStyle={rows.length ? styles.content : styles.emptyContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textSecondary} colors={[colors.text]} />}
        renderItem={({ item }) =>
          item.kind === 'header' ? (
            <Text variant="subhead" weight="700" color="textSecondary" style={styles.groupLabel}>
              {item.label}
            </Text>
          ) : (
            <View>
              <OrderCard order={item.order} />
              {!item.last ? <Divider inset={SCREEN_PADDING + 96} /> : null}
            </View>
          )
        }
        ListEmptyComponent={
          <EmptyState
            emoji={empty.emoji}
            title={empty.title}
            message={empty.message}
            actionLabel={filter === 'all' ? 'Canlı yayınları keşfet' : 'Tüm siparişleri gör'}
            onAction={filter === 'all' ? () => router.navigate('/') : () => setFilter('all')}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingBottom: 24 },
  emptyContent: { flexGrow: 1, justifyContent: 'center', paddingBottom: 40 },
  groupLabel: { paddingHorizontal: SCREEN_PADDING, paddingTop: 14, paddingBottom: 2 },
});
