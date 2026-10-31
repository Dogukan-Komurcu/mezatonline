import { Image } from 'expo-image';
import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, FadeIn, useAnimatedStyle, useSharedValue, withTiming, ZoomIn } from 'react-native-reanimated';

import { Avatar, Icon, PressableScale, Text } from '@/components/ui';
import { CONDITION_LABELS } from '@/components/cards/ProductCard';
import { WIN_COST_NOTE } from '@/features/commerce/utils';
import { auctionFormatLabel } from '@/lib/auction';
import { formatTRY } from '@/lib/format';
import { liveColors } from '@/theme';

import type { LiveLot } from '../engine';
import { useRemaining } from '../useLiveShow';
import { Countdown } from './Countdown';
import { alpha, PANEL, textShadow } from './styles';

export type AuctionCardProps = {
  lot: LiveLot;
  shippingCost: number;
  bundled: boolean;
  couponDiscount: number;
  onPress: () => void;
  /** Kartın altındaki teklif paneli (tutar seçici + basılı tut / "Sıradaki ürün bekleniyor") */
  children?: ReactNode;
};

/** Kartın üst kenarında kalan süre çizgisi: turkuaz, son 5 sn'de nar kırmızısı */
function TimeLine({ endsAt, duration }: { endsAt: number; duration: number }) {
  const remaining = useRemaining(endsAt);
  const frac = Math.max(0, Math.min(1, remaining / Math.max(1, duration)));
  const progress = useSharedValue(frac);
  useEffect(() => {
    progress.set(withTiming(frac, { duration: 260, easing: Easing.linear }));
  }, [frac, progress]);
  const style = useAnimatedStyle(() => ({ width: `${progress.get() * 100}%` }));
  return (
    <View style={styles.track} pointerEvents="none">
      <Animated.View style={[styles.line, { backgroundColor: remaining < 5 ? liveColors.live : liveColors.primaryBright }, style]} />
    </View>
  );
}

/** Mezat biçimi çipi: "Açık artırma" (tokmak) / "Uzatmasız" (bayrak, bakır) */
function FormatChip({ suddenDeath }: { suddenDeath: boolean }) {
  const tint = suddenDeath ? liveColors.copper : liveColors.accent;
  return (
    <View style={[styles.chip, { backgroundColor: alpha(tint, 0.14), borderColor: alpha(tint, 0.4) }]}>
      <Icon name={suddenDeath ? 'flag-outline' : 'hammer-outline'} size={12} color={tint} />
      <Text variant="caption" weight="700" color={tint}>
        {auctionFormatLabel(suddenDeath)}
      </Text>
    </View>
  );
}

/** Bitmiş lot etiketi: SATILDI / SATILMADI */
function ResultBanner({ lot }: { lot: LiveLot }) {
  const sold = lot.status === 'sold';
  return (
    <Animated.View key={lot.id} entering={ZoomIn.duration(220)} style={[styles.result, !sold && styles.resultUnsold]}>
      <Text variant="footnote" weight="900" color={liveColors.text}>
        {sold ? 'SATILDI' : 'SATILMADI'}
      </Text>
      {!sold ? (
        <Text variant="footnote" weight="600" color={liveColors.textSecondary} numberOfLines={1} style={styles.shrink}>
          · Sıradaki ürün geliyor
        </Text>
      ) : null}
    </Animated.View>
  );
}

/** Kart içindeki lider satırı: "Lider: @x · N teklif" / "Lider sensin" / "Henüz teklif yok" */
function LeaderLine({ lot }: { lot: LiveLot }) {
  const running = lot.status === 'running';
  const leader = lot.leader;
  const me = !!leader?.isMe;
  const outbid = running && lot.iBid && !me;
  const count = lot.bidCount > 0 ? ` · ${lot.bidCount} teklif` : '';
  const autoMax = running && me && lot.myMaxBid && lot.myMaxBid > lot.currentBid ? lot.myMaxBid : 0;

  let content: ReactNode;
  if (!leader) {
    content = (
      <Text variant="caption" weight="600" color={liveColors.textSecondary}>
        {running ? 'Henüz teklif yok' : 'Teklif gelmedi'}
      </Text>
    );
  } else if (me) {
    content = (
      <>
        <Icon name={running ? 'checkmark-circle' : 'trophy-outline'} size={14} color={liveColors.success} />
        <Text variant="caption" weight="800" color={liveColors.success} numberOfLines={1} style={styles.shrink}>
          {running ? 'Lider sensin' : 'Kazanan sensin'}
          <Text variant="caption" weight="600" color={liveColors.textSecondary}>
            {count}
          </Text>
        </Text>
      </>
    );
  } else {
    content = (
      <>
        <Avatar uri={leader.avatar} name={leader.username} size={16} />
        <Text variant="caption" weight="600" color={liveColors.textSecondary} numberOfLines={1} style={styles.shrink}>
          {running ? 'Lider: ' : 'Kazanan: '}
          <Text variant="caption" weight="800" color={liveColors.text}>
            @{leader.username}
          </Text>
          {count}
          {outbid ? (
            <Text variant="caption" weight="800" color={liveColors.live}>
              {' · Teklifin geçildi'}
            </Text>
          ) : null}
        </Text>
      </>
    );
  }

  return (
    <Animated.View key={`${lot.id}-${leader?.id ?? 'none'}-${lot.status}`} entering={FadeIn.duration(180)} style={styles.leader}>
      <View style={styles.leaderLeft}>{content}</View>
      {autoMax ? (
        <Text variant="caption" weight="600" color={liveColors.textSecondary} numberOfLines={1}>
          Otomatik: en fazla {formatTRY(autoMax)}
        </Text>
      ) : null}
    </Animated.View>
  );
}

/**
 * Sabitlenmiş ürün / açık artırma kartı (Mezatonline tasarım kimliği, docs/TASARIM-KIMLIGI.md §4):
 * üst kenarda kalan süre çizgisi, biçim çipi + saat ikonlu sayaç, ürün görseli ve başlık,
 * "Güncel teklif" ile büyük fiyat ve kartın içinde lider bilgisi. Ayrı "önde" etiketi yoktur.
 */
export function AuctionCard({ lot, shippingCost, bundled, couponDiscount, onPress, children }: AuctionCardProps) {
  const running = lot.status === 'running';
  const leading = !!lot.leader?.isMe;
  const outbid = running && lot.iBid && !leading;
  const product = lot.product;
  const shippingLine = bundled ? 'Kargo: +₺0 (aynı pakete eklendi)' : shippingCost > 0 ? `Kargo: ${formatTRY(shippingCost)}` : 'Ücretsiz kargo';
  const condition = product.grade ?? CONDITION_LABELS[product.condition];
  const priceLabel = lot.status === 'sold' ? 'Satış fiyatı' : lot.bidCount === 0 ? 'Açılış fiyatı' : 'Güncel teklif';
  const priceColor = running ? liveColors.text : lot.status === 'sold' ? liveColors.live : liveColors.textSecondary;

  return (
    <View style={[styles.card, leading && running && styles.cardLeading, outbid && styles.cardOutbid]}>
      {running ? <TimeLine key={lot.id} endsAt={lot.endsAt} duration={lot.duration} /> : null}
      <PressableScale scaleTo={0.985} onPress={onPress} accessibilityRole="button" accessibilityLabel={`${product.title} ürün ayrıntıları`}>
        <View style={styles.top}>
          {running ? <FormatChip suddenDeath={lot.suddenDeath} /> : <ResultBanner lot={lot} />}
          {running ? <Countdown endsAt={lot.endsAt} suddenDeath={lot.suddenDeath} /> : null}
        </View>
        <View style={styles.row}>
          <Image source={{ uri: product.images[0] }} style={styles.thumb} contentFit="cover" cachePolicy="memory-disk" transition={150} recyclingKey={product.id} />
          <View style={styles.info}>
            <Text variant="subhead" weight="700" color={liveColors.text} numberOfLines={2} style={textShadow}>
              {product.title}
            </Text>
            <Text variant="caption" weight="500" color={bundled ? liveColors.success : liveColors.textSecondary} numberOfLines={1}>
              {shippingLine} · {condition}
            </Text>
          </View>
          <View style={styles.price}>
            <Text variant="caption" weight="600" color={liveColors.textTertiary} numberOfLines={1}>
              {priceLabel}
            </Text>
            <Text variant="title2" weight="800" color={priceColor} tabular numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={textShadow}>
              {formatTRY(lot.currentBid)}
            </Text>
          </View>
        </View>
        <LeaderLine lot={lot} />
        {couponDiscount > 0 && running ? (
          <View style={styles.coupon}>
            <Icon name="pricetag-outline" size={10} color={liveColors.success} />
            <Text variant="caption" weight="700" color={liveColors.success} style={styles.small}>
              Kazanırsan kupon: -{formatTRY(couponDiscount)}
            </Text>
          </View>
        ) : null}
        {running ? (
          <Text variant="caption" weight="500" color={liveColors.textTertiary} numberOfLines={2} style={[styles.small, styles.costNote]}>
            {WIN_COST_NOTE}
          </Text>
        ) : null}
      </PressableScale>
      {children ? <View style={styles.actions}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: PANEL,
    borderRadius: 18,
    padding: 10,
    paddingTop: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: liveColors.border,
    overflow: 'hidden',
  },
  cardLeading: { borderColor: alpha(liveColors.success, 0.7), borderWidth: 1 },
  cardOutbid: { borderColor: alpha(liveColors.live, 0.7), borderWidth: 1 },
  track: { position: 'absolute', top: 0, left: 0, right: 0, height: 3, backgroundColor: alpha(liveColors.text, 0.08) },
  line: { height: 3, borderTopRightRadius: 2, borderBottomRightRadius: 2 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8, minHeight: 24 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 8, paddingVertical: 3 },
  result: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 1,
    backgroundColor: liveColors.live,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  resultUnsold: { backgroundColor: liveColors.panelAlt },
  shrink: { flexShrink: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  thumb: { width: 52, height: 52, borderRadius: 10, backgroundColor: liveColors.panelAlt },
  info: { flex: 1, gap: 2 },
  price: { alignItems: 'flex-end', maxWidth: '38%', minWidth: 76 },
  leader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 8, minHeight: 18 },
  leaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 5, flexShrink: 1 },
  coupon: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4 },
  small: { fontSize: 10, lineHeight: 13 },
  costNote: { marginTop: 4 },
  actions: { marginTop: 10 },
});
