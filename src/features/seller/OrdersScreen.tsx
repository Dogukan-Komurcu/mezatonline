/**
 * Satıcı siparişleri: Kargolanacak | Kargoda | Teslim edildi | İptal.
 * ?tab= başlangıç sekmesi, ?showId= tek yayının siparişleri. Toplu kargo kodu oluşturma.
 */
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import { Avatar, Button, Chip, EmptyState, Header, Icon, PressableScale, Screen, Text, toast, UnderlineTabs } from '@/components/ui';
import { ORDER_SOURCE_LABELS } from '@/store/orders';
import { formatDate, formatShowTime, formatTRY, timeAgo } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { useSellerStore } from '@/store/seller';
import { radius, SCREEN_PADDING, useTheme } from '@/theme';
import type { Order } from '@/types';

import { createLabel, useNow } from './actions';
import { deadlineInfo, orderBucket, resolveBuyer, type OrderBucket } from './logic';
import { useSellerExtras } from './store';
import { StatusPill, Thumb, tint } from './ui';

const TABS: { key: OrderBucket; label: string }[] = [
  { key: 'toship', label: 'Kargolanacak' },
  { key: 'shipped', label: 'Kargoda' },
  { key: 'delivered', label: 'Teslim edildi' },
  { key: 'cancelled', label: 'İptal' },
];

const EMPTY: Record<OrderBucket, { emoji: string; title: string; message: string }> = {
  toship: { emoji: '✅', title: 'Kargolanacak sipariş yok', message: 'Yeni satışların burada görünür. 2 iş günü içinde kargoya vermeyi unutma.' },
  shipped: { emoji: '🚚', title: 'Yolda paket yok', message: 'Kargoya verdiğin siparişleri buradan takip edebilirsin.' },
  delivered: { emoji: '📬', title: 'Teslim edilen sipariş yok', message: 'Alıcıya ulaşan siparişlerin burada listelenir.' },
  cancelled: { emoji: '🧾', title: 'İptal edilen sipariş yok', message: 'İptal ve iade edilen siparişler burada görünür.' },
};

function Separator() {
  const { colors } = useTheme();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: SCREEN_PADDING + 68 }} />;
}

function OrderRow({ order, now }: { order: Order; now: number }) {
  const { colors } = useTheme();
  const label = useSellerExtras((s) => s.labels[order.id]);
  const buyer = resolveBuyer(order.buyerId);
  const bucket = orderBucket(order);
  const due = bucket === 'toship' ? deadlineInfo(order.createdAt, now) : undefined;
  const dueColor = due?.tone === 'late' ? colors.danger : due?.tone === 'soon' ? colors.warning : colors.textSecondary;
  const shippedAt = order.timeline.find((e) => e.status === 'shipped')?.at;
  const deliveredAt = order.timeline.find((e) => e.status === 'delivered')?.at;
  return (
    <PressableScale scaleTo={0.99} onPress={() => router.push(`/seller/order/${order.id}`)} style={styles.row}>
      <Thumb uri={order.productImage} size={56} />
      <View style={{ flex: 1, gap: 3 }}>
        <Text variant="subhead" weight="600" numberOfLines={1}>
          {order.productTitle}
        </Text>
        <View style={styles.inline}>
          <Avatar uri={buyer.avatar} name={buyer.username} size={16} />
          <Text variant="footnote" color="textSecondary" numberOfLines={1} style={{ flexShrink: 1 }}>
            @{buyer.username} · #{order.number} · {ORDER_SOURCE_LABELS[order.source]}
          </Text>
        </View>
        {due ? (
          <View style={styles.inline}>
            <Icon name={due.tone === 'late' ? 'alert-circle' : 'time-outline'} size={14} color={dueColor} />
            <Text variant="footnote" weight="700" color={dueColor} numberOfLines={1} style={{ flexShrink: 1 }}>
              {due.tone === 'late' ? 'Gönderim süresi geçti' : `Son gönderim: ${formatShowTime(due.deadline, now)} · ${due.left}`}
            </Text>
          </View>
        ) : bucket === 'shipped' ? (
          <Text variant="footnote" color="textSecondary" numberOfLines={1}>
            {order.carrier ?? 'Kargo'} · {order.trackingNumber ?? '—'}
            {shippedAt ? ` · ${timeAgo(shippedAt, now)}` : ''}
          </Text>
        ) : bucket === 'delivered' ? (
          <Text variant="footnote" color="textSecondary">
            Teslim: {formatDate(deliveredAt ?? order.createdAt)}
          </Text>
        ) : (
          <Text variant="footnote" color="textSecondary">
            {formatDate(order.createdAt)}
          </Text>
        )}
      </View>
      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        <Text variant="subhead" weight="800">
          {formatTRY(order.itemPrice * order.quantity)}
        </Text>
        {bucket === 'toship' ? (
          label ? <StatusPill label="Kod hazır" tone="info" icon="barcode-outline" /> : <StatusPill label="Kod bekliyor" tone="warning" />
        ) : bucket === 'shipped' ? (
          <StatusPill label="Kargoda" tone="info" />
        ) : bucket === 'delivered' ? (
          <StatusPill label="Teslim edildi" tone="success" />
        ) : (
          <StatusPill label={order.status === 'refunded' ? 'İade edildi' : order.status === 'return_requested' ? 'İade talebi' : 'İptal'} />
        )}
      </View>
    </PressableScale>
  );
}

export function OrdersScreen() {
  const { colors } = useTheme();
  const now = useNow(30_000);
  const params = useLocalSearchParams<{ tab?: string; showId?: string }>();
  const orders = useSellerStore((s) => s.orders);
  const shows = useSellerStore((s) => s.shows);
  const labels = useSellerExtras((s) => s.labels);
  const carrier = useSellerExtras((s) => s.shipping.carrier);
  const initialTab = TABS.some((t) => t.key === params.tab) ? (params.tab as OrderBucket) : 'toship';
  const [tab, setTab] = useState<OrderBucket>(initialTab);
  const [showFilter, setShowFilter] = useState<string | undefined>(params.showId);

  const scoped = showFilter ? orders.filter((o) => o.showId === showFilter) : orders;
  const counts: Record<OrderBucket, number> = { toship: 0, shipped: 0, delivered: 0, cancelled: 0 };
  scoped.forEach((o) => {
    counts[orderBucket(o)] += 1;
  });
  const list = scoped
    .filter((o) => orderBucket(o) === tab)
    .sort((a, b) => (tab === 'toship' ? a.createdAt.localeCompare(b.createdAt) : b.createdAt.localeCompare(a.createdAt)));
  const needLabel = list.filter((o) => !labels[o.id]);
  const late = tab === 'toship' ? list.filter((o) => deadlineInfo(o.createdAt, now).tone === 'late').length : 0;
  const filterShow = showFilter ? shows.find((s) => s.id === showFilter) : undefined;

  const bulkLabels = () => {
    needLabel.forEach((o) => createLabel(o.id, carrier));
    haptic.success();
    toast.success(`${needLabel.length} sipariş için ${carrier} kargo kodu oluşturuldu`, 'barcode');
  };

  return (
    <Screen>
      <Header title="Siparişler" subtitle={`${scoped.length} sipariş`} />
      {showFilter ? (
        <View style={styles.filter}>
          <Chip
            label={filterShow ? (filterShow.title.length > 34 ? `${filterShow.title.slice(0, 33)}…` : filterShow.title) : 'Seçili yayın'}
            icon="close"
            selected
            size="sm"
            onPress={() => setShowFilter(undefined)}
          />
        </View>
      ) : null}
      <UnderlineTabs tabs={TABS.map((t) => ({ ...t, count: counts[t.key] }))} value={tab} onChange={setTab} />
      <FlatList
        data={list}
        keyExtractor={(o) => o.id}
        ItemSeparatorComponent={Separator}
        contentContainerStyle={{ paddingBottom: 32, flexGrow: 1 }}
        ListHeaderComponent={
          tab === 'toship' && list.length ? (
            <View style={{ padding: SCREEN_PADDING, gap: 10 }}>
              <View style={[styles.info, { backgroundColor: tint(late ? colors.danger : colors.warning, 0.1) }]}>
                <Icon name={late ? 'alert-circle' : 'information-circle'} size={20} color={late ? colors.danger : colors.warning} />
                <Text variant="footnote" color="textSecondary" style={{ flex: 1 }}>
                  {late
                    ? `${late} siparişin gönderim süresi geçti. Hemen kargola; gecikmeler hesap sağlığını etkiler.`
                    : 'Siparişleri satıştan sonraki 2 iş günü içinde kargoya ver. Hafta sonu ve resmi tatiller sayılmaz.'}
                </Text>
              </View>
              {needLabel.length > 1 ? (
                <Button title={`${needLabel.length} sipariş için kargo kodu oluştur`} icon="barcode-outline" variant="inverse" fullWidth onPress={bulkLabels} />
              ) : null}
            </View>
          ) : undefined
        }
        ListEmptyComponent={<EmptyState emoji={EMPTY[tab].emoji} title={EMPTY[tab].title} message={EMPTY[tab].message} />}
        renderItem={({ item }) => <OrderRow order={item} now={now} />}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  filter: { paddingHorizontal: SCREEN_PADDING, paddingBottom: 6, flexDirection: 'row' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: SCREEN_PADDING, paddingVertical: 12 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  info: { flexDirection: 'row', gap: 10, padding: 12, borderRadius: radius.md, alignItems: 'flex-start' },
});
