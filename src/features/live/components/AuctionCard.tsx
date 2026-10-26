import { Image } from 'expo-image';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, ZoomIn } from 'react-native-reanimated';

import { Avatar, Icon, PressableScale, Text } from '@/components/ui';
import { CONDITION_LABELS } from '@/components/cards/ProductCard';
import { formatTRY } from '@/lib/format';
import { liveColors } from '@/theme';

import type { LiveLot } from '../engine';
import { Countdown } from './Countdown';
import { alpha, PANEL, textShadow } from './styles';

export type AuctionCardProps = {
  lot: LiveLot;
  shippingCost: number;
  bundled: boolean;
  couponDiscount: number;
  onPress: () => void;
  /** Kartın altındaki eylem satırı ([Özel] + kaydır-teklif-ver / "Sıradaki ürün bekleniyor") */
  children?: ReactNode;
};

/** Kartın üstündeki durum hapı: "@x önde!" / "@x kazandı!" */
function StatusPill({ lot }: { lot: LiveLot }) {
  if (!lot.leader) return null;
  const finished = lot.status !== 'running';
  const me = lot.leader.isMe;
  return (
    <Animated.View key={`${lot.id}-${lot.leader.id}-${lot.status}`} entering={FadeIn.duration(180)} style={styles.status}>
      <Avatar uri={lot.leader.avatar} name={lot.leader.username} size={20} />
      <Text variant="footnote" weight="700" color={liveColors.text} numberOfLines={1} style={styles.statusText}>
        {me ? 'Sen ' : `${lot.leader.username} `}
        <Text variant="footnote" weight="800" color={me && !finished ? liveColors.success : liveColors.primary}>
          {finished ? (me ? 'kazandın!' : 'kazandı!') : me ? 'öndesin!' : 'önde!'}
        </Text>
      </Text>
    </Animated.View>
  );
}

/** S20-F: sabitlenmiş ürün / açık artırma kartı */
export function AuctionCard({ lot, shippingCost, bundled, couponDiscount, onPress, children }: AuctionCardProps) {
  const running = lot.status === 'running';
  const leading = !!lot.leader?.isMe;
  const outbid = running && lot.iBid && !leading;
  const product = lot.product;
  const shippingLine = bundled ? 'Kargo: +₺0 (aynı pakete eklendi)' : shippingCost > 0 ? `Kargo: ${formatTRY(shippingCost)}` : 'Ücretsiz kargo';
  const meta = lot.bidCount === 0 ? 'Henüz teklif yok · Açılış fiyatı' : `${lot.bidCount} teklif`;

  return (
    <View>
      <StatusPill lot={lot} />
      <View style={[styles.card, leading && running && styles.cardLeading, outbid && styles.cardOutbid]}>
        <PressableScale scaleTo={0.985} onPress={onPress} accessibilityLabel={`${product.title} ürün ayrıntıları`}>
        {!running ? (
          <Animated.View key={lot.id} entering={ZoomIn.springify().damping(14)} style={[styles.soldBanner, lot.status === 'unsold' && styles.unsoldBanner]}>
            <Text variant="footnote" weight="900" color={liveColors.text}>
              {lot.status === 'sold' ? 'SATILDI' : 'SATILMADI'}
            </Text>
            {lot.status === 'sold' && lot.leader ? (
              <Text variant="footnote" weight="700" color={liveColors.text} numberOfLines={1} style={styles.flexShrink}>
                · {formatTRY(lot.currentBid)} · {lot.leader.isMe ? 'Sen kazandın 🎉' : `@${lot.leader.username}`}
              </Text>
            ) : (
              <Text variant="footnote" weight="600" color={liveColors.textSecondary}>
                · Sıradaki ürün geliyor
              </Text>
            )}
          </Animated.View>
        ) : null}
        <View style={styles.row}>
          <Image source={{ uri: product.images[0] }} style={styles.thumb} contentFit="cover" cachePolicy="memory-disk" transition={150} recyclingKey={product.id} />
          <View style={styles.info}>
            <Text variant="subhead" weight="700" color={liveColors.text} numberOfLines={2} style={textShadow}>
              {product.title}
            </Text>
            <Text variant="caption" weight="500" color={bundled ? liveColors.success : liveColors.textSecondary} numberOfLines={1}>
              {shippingLine}
              {product.grade ? ` · ${product.grade}` : ` · ${CONDITION_LABELS[product.condition]}`}
            </Text>
            <Animated.View key={leading ? 'lead' : outbid ? 'out' : 'none'} entering={FadeInDown.duration(160)} style={styles.metaRow}>
              <Text variant="caption" weight="600" color={liveColors.textSecondary}>
                {meta}
              </Text>
              {running && leading ? (
                <Text variant="caption" weight="800" color={liveColors.success}>
                  · Öndesin ✓
                </Text>
              ) : null}
              {outbid ? (
                <Text variant="caption" weight="800" color={liveColors.live}>
                  · Teklifin geçildi
                </Text>
              ) : null}
            </Animated.View>
            {couponDiscount > 0 && running ? (
              <View style={styles.coupon}>
                <Icon name="pricetag" size={10} color={liveColors.success} />
                <Text variant="caption" weight="700" color={liveColors.success} style={styles.couponText}>
                  Kazanırsan kupon: -{formatTRY(couponDiscount)}
                </Text>
              </View>
            ) : null}
          </View>
          <View style={styles.right}>
            <Text variant="title2" weight="800" color={running ? liveColors.text : lot.status === 'sold' ? liveColors.live : liveColors.textSecondary} tabular style={textShadow}>
              {formatTRY(lot.currentBid)}
            </Text>
            {running ? (
              <Countdown endsAt={lot.endsAt} suddenDeath={lot.suddenDeath} />
            ) : (
              <Text variant="subhead" weight="800" color={lot.status === 'sold' ? liveColors.live : liveColors.textSecondary}>
                {lot.status === 'sold' ? 'Satıldı' : 'Satılmadı'}
              </Text>
            )}
            {running && lot.suddenDeath ? (
              <Text variant="caption" weight="800" color={liveColors.live}>
                Ani Bitiş
              </Text>
            ) : null}
            {running && leading && lot.myMaxBid && lot.myMaxBid > lot.currentBid ? (
              <Text variant="caption" weight="600" color={liveColors.textSecondary}>
                Maks. {formatTRY(lot.myMaxBid)}
              </Text>
            ) : null}
          </View>
        </View>
        </PressableScale>
        {children ? <View style={styles.actions}>{children}</View> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: liveColors.glassStrong,
    borderRadius: 999,
    paddingLeft: 3,
    paddingRight: 10,
    paddingVertical: 3,
    marginBottom: 6,
    maxWidth: '80%',
  },
  statusText: { flexShrink: 1 },
  card: { backgroundColor: PANEL, borderRadius: 18, padding: 10, borderWidth: StyleSheet.hairlineWidth, borderColor: liveColors.border, overflow: 'hidden' },
  actions: { marginTop: 10 },
  cardLeading: { borderColor: alpha(liveColors.success, 0.7), borderWidth: 1 },
  cardOutbid: { borderColor: alpha(liveColors.live, 0.7), borderWidth: 1 },
  soldBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: liveColors.live,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 8,
    maxWidth: '100%',
  },
  unsoldBanner: { backgroundColor: liveColors.panelAlt },
  flexShrink: { flexShrink: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  thumb: { width: 58, height: 58, borderRadius: 10, backgroundColor: liveColors.panelAlt },
  info: { flex: 1, gap: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 3, flexWrap: 'wrap' },
  coupon: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  couponText: { fontSize: 10, lineHeight: 13 },
  right: { alignItems: 'flex-end', minWidth: 76, gap: 1 },
});
