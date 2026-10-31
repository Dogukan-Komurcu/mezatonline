import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import { Button, Divider, EmptyState, Icon, PressableScale, Text } from '@/components/ui';
import { getProduct, getShow, getUser } from '@/data';
import { formatShowTime, formatTimeUntil, formatTRY } from '@/lib/format';
import { PRE_BID_STATUS_LABELS, useOrdersStore, type PreBid, type PreBidStatus } from '@/store/orders';
import { radius, SCREEN_PADDING, useTheme } from '@/theme';

import { FilterChips, InfoBanner, StatusChip } from '../components';
import { DAY, useNow, type Tone } from '../utils';

type PreBidFilter = 'all' | 'active' | 'outbid' | 'won' | 'ended';

const FILTERS: { key: PreBidFilter; label: string }[] = [
  { key: 'all', label: 'Tümü' },
  { key: 'active', label: 'Öndesin' },
  { key: 'outbid', label: 'Teklifin geçildi' },
  { key: 'won', label: 'Kazandın' },
  { key: 'ended', label: 'Biten' },
];

const TONES: Record<PreBidStatus, Tone> = {
  upcoming: 'neutral',
  winning: 'success',
  outbid: 'danger',
  won: 'success',
  lost: 'neutral',
  expired: 'neutral',
};

/** Yayın başlangıcından 24 saat sonra ön teklif süresi dolar */
function effectiveStatus(bid: PreBid, now: number): PreBidStatus {
  const show = getShow(bid.showId);
  if ((bid.status === 'winning' || bid.status === 'upcoming' || bid.status === 'outbid') && show && Date.parse(show.scheduledAt) + DAY < now && show.status !== 'live') {
    return 'expired';
  }
  return bid.status;
}

function matches(status: PreBidStatus, f: PreBidFilter): boolean {
  switch (f) {
    case 'active':
      return status === 'winning' || status === 'upcoming';
    case 'outbid':
      return status === 'outbid';
    case 'won':
      return status === 'won';
    case 'ended':
      return status === 'lost' || status === 'expired';
    default:
      return true;
  }
}

export function PreBidsTab() {
  const preBids = useOrdersStore((s) => s.preBids);
  const [filter, setFilter] = useState<PreBidFilter>('all');
  const now = useNow(30_000);
  const list = preBids.map((b) => ({ bid: b, status: effectiveStatus(b, now) })).filter((x) => matches(x.status, filter));

  return (
    <View style={styles.flex}>
      <FilterChips options={FILTERS} value={filter} onChange={setFilter} />
      <FlatList
        data={list}
        keyExtractor={(x) => x.bid.id}
        contentContainerStyle={list.length ? styles.content : styles.emptyContent}
        ListHeaderComponent={
          list.length ? (
            <InfoBanner
              icon="information-circle-outline"
              text="Ön teklifler bağlayıcıdır; geri çekilemez ve düşürülemez. Kurumsal satıcılardan alımlarda 14 günlük yasal cayma hakkın saklıdır. Ürün sahneye geldiğinde maks. ön teklifine kadar senin adına otomatik teklif verilir."
              style={styles.banner}
            />
          ) : undefined
        }
        ItemSeparatorComponent={() => <Divider inset={SCREEN_PADDING + 84} />}
        renderItem={({ item }) => <PreBidRow bid={item.bid} status={item.status} now={now} />}
        ListEmptyComponent={
          <EmptyState
            emoji="⏰"
            title={filter === 'all' ? 'Ön teklifin yok' : 'Bu filtrede ön teklif yok'}
            message="Yaklaşan yayınlardaki ürünlere yayın başlamadan ön teklif verebilir, ürün sahneye geldiğinde öne geçebilirsin."
            actionLabel={filter === 'all' ? 'Yaklaşan yayınları keşfet' : 'Tüm ön teklifler'}
            onAction={filter === 'all' ? () => router.navigate('/') : () => setFilter('all')}
          />
        }
      />
    </View>
  );
}

function PreBidRow({ bid, status, now }: { bid: PreBid; status: PreBidStatus; now: number }) {
  const { colors } = useTheme();
  const product = getProduct(bid.productId);
  const show = getShow(bid.showId);
  const seller = getUser(product?.sellerId ?? show?.sellerId);
  const live = show?.status === 'live';
  const startsAt = show ? Date.parse(show.scheduledAt) : 0;
  const open = () => (product ? router.push(`/product/${product.id}`) : show ? router.push(`/show/${show.id}`) : undefined);
  return (
    <PressableScale scaleTo={0.985} onPress={open} style={styles.row} accessibilityRole="button" accessibilityLabel={product?.title ?? 'Ön teklif'}>
      <View style={[styles.thumb, { backgroundColor: colors.skeleton }]}>
        {product ? <Image source={{ uri: product.images[0] }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" recyclingKey={bid.id} /> : null}
      </View>
      <View style={styles.body}>
        <StatusChip label={PRE_BID_STATUS_LABELS[status]} tone={TONES[status]} />
        <Text variant="headline" numberOfLines={2}>
          {product?.title ?? 'Ürün'}
        </Text>
        <Text variant="footnote" color="textSecondary" numberOfLines={1}>
          Maks. ön teklifin:{' '}
          <Text variant="footnote" weight="700">
            {formatTRY(bid.maxAmount)}
          </Text>
          {product ? ` · Açılış ${formatTRY(product.price)}` : ''}
        </Text>
        <View style={styles.metaRow}>
          <Icon name={live ? 'radio' : 'calendar-outline'} size={13} color={live ? colors.live : colors.textSecondary} />
          <Text variant="footnote" color={live ? 'live' : 'textSecondary'} weight={live ? '700' : '500'} numberOfLines={1} style={styles.flexShrink}>
            {live ? 'Yayın şu an canlı' : show ? `${formatShowTime(show.scheduledAt, now)}${startsAt > now ? ` · ${formatTimeUntil(startsAt, now)} kaldı` : ''}` : 'Yayın bilgisi yok'}
            {seller ? ` · @${seller.username}` : ''}
          </Text>
        </View>
        {live && show ? (
          <Button title="Yayına katıl" size="sm" icon="play" onPress={() => router.push(`/live/${show.id}`)} style={styles.action} />
        ) : status === 'outbid' && product ? (
          <Button title="Ön teklifini artır" size="sm" onPress={() => router.push(`/product/${product.id}`)} style={styles.action} />
        ) : null}
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  flexShrink: { flexShrink: 1 },
  content: { paddingBottom: 24 },
  emptyContent: { flexGrow: 1, justifyContent: 'center', paddingBottom: 40 },
  banner: { marginHorizontal: SCREEN_PADDING, marginTop: 2, marginBottom: 6 },
  row: { flexDirection: 'row', gap: 12, paddingHorizontal: SCREEN_PADDING, paddingVertical: 12 },
  thumb: { width: 72, height: 72, borderRadius: radius.sm, overflow: 'hidden' },
  body: { flex: 1, gap: 3 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  action: { alignSelf: 'flex-start', marginTop: 6 },
});
