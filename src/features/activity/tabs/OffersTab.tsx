import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import { Button, Divider, EmptyState, PressableScale, Text, toast } from '@/components/ui';
import { requireTransactSetup } from '@/features/wallet/TransactSetup';
import { getProduct, getUser } from '@/data';
import { formatTimeUntil, formatTRY } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { OFFER_STATUS_LABELS, useOrdersStore } from '@/store/orders';
import { radius, SCREEN_PADDING, useTheme } from '@/theme';
import type { Offer, Order } from '@/types';

import { CenterModal, FilterChips, InfoBanner, StatusChip } from '../components';
import { useActivityExtras } from '../store';
import { DAY, useNow, type Tone } from '../utils';

type OfferFilter = 'all' | 'pending' | 'countered' | 'accepted' | 'ended';
type DisplayStatus = Offer['status'] | 'withdrawn' | 'expired';

const FILTERS: { key: OfferFilter; label: string }[] = [
  { key: 'all', label: 'Tümü' },
  { key: 'pending', label: 'Yanıt bekleyen' },
  { key: 'countered', label: 'Karşı teklif' },
  { key: 'accepted', label: 'Kabul edilen' },
  { key: 'ended', label: 'Biten' },
];

const LABELS: Record<DisplayStatus, string> = { ...OFFER_STATUS_LABELS, withdrawn: 'Geri çekildi', expired: 'Süresi doldu' };
const TONES: Record<DisplayStatus, Tone> = {
  pending: 'warning',
  countered: 'accent',
  accepted: 'success',
  declined: 'danger',
  withdrawn: 'neutral',
  expired: 'neutral',
};

/** Fiyat önerisi 30 gün, karşı teklif 24 saat geçerlidir */
function displayStatus(offer: Offer, withdrawn: boolean, now: number): DisplayStatus {
  if (withdrawn) return 'withdrawn';
  const age = now - Date.parse(offer.createdAt);
  if (offer.status === 'pending' && age > 30 * DAY) return 'expired';
  if (offer.status === 'countered' && age > DAY) return 'expired';
  return offer.status;
}

function matches(s: DisplayStatus, f: OfferFilter): boolean {
  if (f === 'all') return true;
  if (f === 'ended') return s === 'declined' || s === 'withdrawn' || s === 'expired';
  return s === f;
}

/** Kabul edilen öneri için oluşturulmuş sipariş (varsa) */
function findOrderFor(offer: Offer, orders: Order[]): Order | undefined {
  return orders.find((o) => o.productId === offer.productId && o.source === 'offer' && o.createdAt >= offer.createdAt);
}

export function OffersTab() {
  const offers = useOrdersStore((s) => s.offers);
  const orders = useOrdersStore((s) => s.orders);
  const withdrawnIds = useActivityExtras((s) => s.withdrawnOfferIds);
  const [filter, setFilter] = useState<OfferFilter>('all');
  const [withdrawTarget, setWithdrawTarget] = useState<Offer | null>(null);
  const now = useNow(30_000);

  const list = offers
    .map((offer) => ({ offer, status: displayStatus(offer, withdrawnIds.includes(offer.id), now) }))
    .filter((x) => matches(x.status, filter));
  const counterCount = offers.filter((o) => displayStatus(o, withdrawnIds.includes(o.id), now) === 'countered').length;
  const chips = FILTERS.map((f) => (f.key === 'countered' ? { ...f, count: counterCount } : f));

  const confirmWithdraw = () => {
    if (!withdrawTarget) return;
    useActivityExtras.getState().withdrawOffer(withdrawTarget.id);
    haptic.success();
    toast.success('Fiyat önerin geri çekildi');
    setWithdrawTarget(null);
  };

  return (
    <View style={styles.flex}>
      <FilterChips options={chips} value={filter} onChange={setFilter} />
      <FlatList
        data={list}
        keyExtractor={(x) => x.offer.id}
        contentContainerStyle={list.length ? styles.content : styles.emptyContent}
        ListHeaderComponent={
          list.length ? (
            <InfoBanner
              icon="pricetags-outline"
              text="Satıcının karşı teklifini 24 saat içinde yanıtla. Kabul edersen ürün anlaşılan fiyattan satın alınır."
              style={styles.banner}
            />
          ) : undefined
        }
        ItemSeparatorComponent={() => <Divider inset={SCREEN_PADDING + 84} />}
        renderItem={({ item }) => (
          <OfferRow offer={item.offer} status={item.status} order={findOrderFor(item.offer, orders)} now={now} onWithdraw={() => setWithdrawTarget(item.offer)} />
        )}
        ListEmptyComponent={
          <EmptyState
            emoji="🤝"
            title={filter === 'all' ? 'Fiyat önerin yok' : 'Bu filtrede öneri yok'}
            message="“Fiyat Öner” seçeneği olan ürünlerde satıcıya kendi fiyatını önerebilirsin. Satıcı kabul edebilir ya da karşı teklif yapabilir."
            actionLabel={filter === 'all' ? 'Mağazalara göz at' : 'Tüm öneriler'}
            onAction={filter === 'all' ? () => router.navigate('/categories') : () => setFilter('all')}
          />
        }
      />
      <CenterModal
        visible={!!withdrawTarget}
        onClose={() => setWithdrawTarget(null)}
        icon="arrow-undo-outline"
        title="Önerini geri çekmek istiyor musun?"
        message="Satıcı henüz yanıt vermedi. Geri çektiğin öneriyi satıcı artık kabul edemez."
        actions={[
          { label: 'Geri çek', variant: 'danger', onPress: confirmWithdraw },
          { label: 'Vazgeç', variant: 'outline', onPress: () => setWithdrawTarget(null) },
        ]}
      />
    </View>
  );
}

function OfferRow({ offer, status, order, now, onWithdraw }: { offer: Offer; status: DisplayStatus; order?: Order; now: number; onWithdraw: () => void }) {
  const { colors } = useTheme();
  const product = getProduct(offer.productId);
  const seller = getUser(product?.sellerId);
  const agreed = offer.counterAmount ?? offer.amount;

  const checkout = (price: number) => {
    if (!product) {
      toast.error('Ürün artık satışta değil');
      return;
    }
    router.push({ pathname: '/checkout/[id]', params: { id: product.id, price: String(price), source: 'offer' } });
  };

  const acceptCounter = () => {
    if (!offer.counterAmount) return;
    const amount = offer.counterAmount;
    requireTransactSetup(() => {
      useOrdersStore.getState().resolveOffer(offer.id, 'accepted', amount);
      haptic.success();
      toast.success(`Karşı teklif kabul edildi: ${formatTRY(amount)}`, 'checkmark-circle');
      checkout(amount);
    });
  };

  const rejectCounter = () => {
    useOrdersStore.getState().resolveOffer(offer.id, 'declined', offer.counterAmount);
    haptic.warning();
    toast('Karşı teklifi reddettin', 'close-circle');
  };

  return (
    <PressableScale
      scaleTo={0.985}
      onPress={() => (product ? router.push(`/product/${product.id}`) : undefined)}
      style={styles.row}
      accessibilityRole="button"
      accessibilityLabel={product?.title ?? 'Fiyat önerisi'}>
      <View style={[styles.thumb, { backgroundColor: colors.skeleton }]}>
        {product ? <Image source={{ uri: product.images[0] }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" recyclingKey={offer.id} /> : null}
      </View>
      <View style={styles.body}>
        <StatusChip label={LABELS[status]} tone={TONES[status]} />
        <Text variant="headline" numberOfLines={2}>
          {product?.title ?? 'Ürün'}
        </Text>
        <Text variant="footnote" color="textSecondary" numberOfLines={1}>
          Önerin:{' '}
          <Text variant="footnote" weight="700">
            {formatTRY(offer.amount)}
          </Text>
          {product ? ` · Liste fiyatı ${formatTRY(product.price)}` : ''}
        </Text>
        {seller ? (
          <Text variant="footnote" color="textSecondary" numberOfLines={1}>
            Satıcı:{' '}
            <Text variant="footnote" weight="700" color="accent" suppressHighlighting onPress={() => router.push(`/user/${seller.username}`)}>
              @{seller.username}
            </Text>
          </Text>
        ) : null}

        {status === 'countered' && offer.counterAmount ? (
          <View style={[styles.counterBox, { backgroundColor: colors.surface }]}>
            <View style={styles.counterHead}>
              <Text variant="subhead" weight="700">
                Karşı teklif: {formatTRY(offer.counterAmount)}
              </Text>
              <Text variant="caption" color="warning">
                {formatTimeUntil(Date.parse(offer.createdAt) + DAY, now)} kaldı
              </Text>
            </View>
            <View style={styles.actions}>
              <Button title="Kabul et" size="sm" onPress={acceptCounter} style={styles.flex} />
              <Button title="Reddet" size="sm" variant="outline" onPress={rejectCounter} style={styles.flex} />
            </View>
          </View>
        ) : status === 'pending' ? (
          <View style={styles.inlineRow}>
            <Text variant="caption" color="textSecondary" style={styles.flex}>
              Satıcının yanıtı bekleniyor
            </Text>
            <Button title="Geri çek" size="sm" variant="outline" onPress={onWithdraw} />
          </View>
        ) : status === 'accepted' ? (
          order ? (
            <Button title="Siparişi görüntüle" size="sm" variant="secondary" iconRight="chevron-forward" onPress={() => router.push(`/orders/${order.id}`)} style={styles.action} />
          ) : (
            <Button title={`${formatTRY(agreed)} ile satın al`} size="sm" onPress={() => requireTransactSetup(() => checkout(agreed))} style={styles.action} />
          )
        ) : product ? (
          <Button title="Yeni fiyat öner" size="sm" variant="secondary" onPress={() => router.push(`/product/${product.id}`)} style={styles.action} />
        ) : null}
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingBottom: 24 },
  emptyContent: { flexGrow: 1, justifyContent: 'center', paddingBottom: 40 },
  banner: { marginHorizontal: SCREEN_PADDING, marginTop: 2, marginBottom: 6 },
  row: { flexDirection: 'row', gap: 12, paddingHorizontal: SCREEN_PADDING, paddingVertical: 12 },
  thumb: { width: 72, height: 72, borderRadius: radius.sm, overflow: 'hidden' },
  body: { flex: 1, gap: 3 },
  counterBox: { borderRadius: radius.md, padding: 10, gap: 8, marginTop: 6 },
  counterHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  actions: { flexDirection: 'row', gap: 8 },
  inlineRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  action: { alignSelf: 'flex-start', marginTop: 6 },
});
