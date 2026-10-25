/**
 * Satıcı konsolunun alt kartı: çalışan açık artırma, flaş indirim, sabitlenmiş ürün,
 * son lot sonucu ya da boş durum.
 */
import { Image } from 'expo-image';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming, cancelAnimation } from 'react-native-reanimated';

import { Button, Icon, IconButton, Text } from '@/components/ui';
import type { FlashSale, LiveLot } from '@/features/live/engine';
import { formatTRY } from '@/lib/format';
import { liveColors, radius } from '@/theme';
import type { Product } from '@/types';

import { formatTimer, useNow } from './helpers';

export type LotCardProps = {
  lot?: LiveLot;
  /** Biten lotun sonucu kapatıldı mı */
  resultDismissed: boolean;
  flash?: FlashSale;
  /** Flaş indirimde konsolun yerel olarak kaydettiği ek satışlar */
  flashExtraSold: number;
  pinned?: Product;
  pinnedRemaining: number;
  remainingOf: (p: Product) => number;
  onStartAuction: (p: Product) => void;
  onFlash: (p: Product) => void;
  onUnpin: () => void;
  onOpenShop: (tab?: 'auction' | 'buy_now' | 'giveaway' | 'sold') => void;
  onDismissResult: () => void;
};

export function LotCard(props: LotCardProps) {
  const { lot, flash, pinned } = props;
  const running = lot?.status === 'running';
  const flashRunning = flash?.status === 'running';
  const now = useNow(250, running || flashRunning);

  if (lot && running) return <RunningLot lot={lot} now={now} />;
  if (flash && flashRunning) return <FlashCard flash={flash} now={now} extraSold={props.flashExtraSold} />;
  if (pinned) return <PinnedCard {...props} pinned={pinned} />;
  if (lot && !props.resultDismissed) return <ResultCard {...props} lot={lot} />;
  return <EmptyCard onOpenShop={props.onOpenShop} />;
}

function Thumb({ uri, id }: { uri?: string; id: string }) {
  return <Image source={{ uri }} style={styles.thumb} contentFit="cover" cachePolicy="memory-disk" recyclingKey={id} />;
}

function RunningLot({ lot, now }: { lot: LiveLot; now: number }) {
  const remaining = Math.max(0, (lot.endsAt - now) / 1000);
  const urgent = remaining < 5;
  const total = Math.max(lot.duration, lot.counterBidTime, 1);
  const pct = Math.min(1, remaining / total);
  return (
    <Animated.View entering={FadeInDown.springify().damping(18)} style={[styles.card, urgent && styles.cardUrgent]}>
      <View style={styles.row}>
        <Thumb uri={lot.product.images[0]} id={lot.product.id} />
        <View style={styles.mid}>
          <View style={styles.tagRow}>
            <View style={[styles.tag, { backgroundColor: liveColors.live }]}>
              <Text variant="caption" color={liveColors.text}>
                AÇIK ARTIRMA
              </Text>
            </View>
            {lot.suddenDeath ? (
              <Text variant="caption" color={liveColors.textSecondary}>
                💀 Ani Bitiş
              </Text>
            ) : null}
          </View>
          <Text variant="subhead" weight="700" color={liveColors.text} numberOfLines={2}>
            {lot.product.title}
          </Text>
          <Text variant="caption" color={liveColors.textSecondary} numberOfLines={1}>
            {lot.bidCount > 0 ? `${lot.bidCount} teklif · 🏆 @${lot.leader?.username ?? '—'}` : `Açılış ${formatTRY(lot.startPrice)} · henüz teklif yok`}
          </Text>
        </View>
        <View style={styles.right}>
          <Text variant="title2" color={liveColors.text} tabular numberOfLines={1} adjustsFontSizeToFit>
            {formatTRY(lot.currentBid)}
          </Text>
          <Timer seconds={remaining} urgent={urgent} suddenDeath={lot.suddenDeath} />
        </View>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${pct * 100}%`, backgroundColor: urgent ? liveColors.live : liveColors.primary }]} />
      </View>
    </Animated.View>
  );
}

function Timer({ seconds, urgent, suddenDeath }: { seconds: number; urgent: boolean; suddenDeath?: boolean }) {
  const pulse = useSharedValue(1);
  useEffect(() => {
    if (urgent) pulse.set(withRepeat(withSequence(withTiming(1.12, { duration: 220 }), withTiming(1, { duration: 280 })), -1));
    else {
      cancelAnimation(pulse);
      pulse.set(1);
    }
  }, [urgent, pulse]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: pulse.get() }] }));
  return (
    <Animated.View style={[styles.timer, style]}>
      {suddenDeath ? <Text variant="subhead">💀</Text> : null}
      <Text variant="headline" weight="800" color={urgent ? liveColors.live : liveColors.primary} tabular>
        {formatTimer(seconds)}
      </Text>
    </Animated.View>
  );
}

function FlashCard({ flash, now, extraSold }: { flash: FlashSale; now: number; extraSold: number }) {
  const remaining = Math.max(0, (flash.endsAt - now) / 1000);
  const left = Math.max(0, flash.remaining - extraSold);
  const discount = Math.round((1 - flash.price / Math.max(1, flash.originalPrice)) * 100);
  return (
    <Animated.View entering={FadeInDown.springify().damping(18)} style={[styles.card, styles.cardFlash]}>
      <View style={styles.row}>
        <Thumb uri={flash.product.images[0]} id={flash.product.id} />
        <View style={styles.mid}>
          <View style={styles.tagRow}>
            <View style={[styles.tag, { backgroundColor: liveColors.primary }]}>
              <Text variant="caption" color={liveColors.onPrimary}>
                ⚡ FLAŞ İNDİRİM · %{discount}
              </Text>
            </View>
          </View>
          <Text variant="subhead" weight="700" color={liveColors.text} numberOfLines={2}>
            {flash.product.title}
          </Text>
          <Text variant="caption" color={left > 0 ? liveColors.primary : liveColors.live} numberOfLines={1}>
            {left > 0 ? `${left} adet kaldı` : 'Tükendi'}
          </Text>
        </View>
        <View style={styles.right}>
          <Text variant="footnote" color={liveColors.textTertiary} style={styles.strike}>
            {formatTRY(flash.originalPrice)}
          </Text>
          <Text variant="title2" color={liveColors.primary} tabular numberOfLines={1} adjustsFontSizeToFit>
            {formatTRY(flash.price)}
          </Text>
          <Timer seconds={remaining} urgent={remaining < 5} />
        </View>
      </View>
    </Animated.View>
  );
}

function PinnedCard({ pinned, pinnedRemaining, onStartAuction, onFlash, onUnpin }: LotCardProps & { pinned: Product }) {
  const auction = pinned.format === 'auction';
  const soldOut = pinnedRemaining <= 0;
  return (
    <Animated.View entering={FadeInDown.springify().damping(18)} style={styles.card}>
      <View style={styles.row}>
        <Thumb uri={pinned.images[0]} id={pinned.id} />
        <View style={styles.mid}>
          <View style={styles.tagRow}>
            <View style={[styles.tag, { backgroundColor: liveColors.glassLight }]}>
              <Text variant="caption" color={liveColors.text}>
                📌 SABİTLENDİ
              </Text>
            </View>
          </View>
          <Text variant="subhead" weight="700" color={liveColors.text} numberOfLines={2}>
            {pinned.title}
          </Text>
          <Text variant="caption" color={soldOut ? liveColors.live : liveColors.textSecondary} numberOfLines={1}>
            {soldOut ? 'Tükendi' : auction ? 'Açık artırma başlamadı' : `Hemen Al · ${pinnedRemaining} adet`}
          </Text>
        </View>
        <View style={styles.right}>
          <Text variant="caption" color={liveColors.textSecondary}>
            {auction ? 'Açılış' : 'Fiyat'}
          </Text>
          <Text variant="title3" color={liveColors.text} tabular numberOfLines={1} adjustsFontSizeToFit>
            {formatTRY(pinned.price)}
          </Text>
        </View>
      </View>
      <View style={styles.actions}>
        {auction ? (
          <Button title="Açık Artırmayı Başlat" icon="hammer" size="sm" onPress={() => onStartAuction(pinned)} disabled={soldOut} style={{ flex: 1 }} />
        ) : (
          <Button title="Flaş İndirim" icon="flash" size="sm" onPress={() => onFlash(pinned)} disabled={soldOut} style={{ flex: 1 }} />
        )}
        <Button title="Kaldır" variant="glass" size="sm" onPress={onUnpin} />
      </View>
    </Animated.View>
  );
}

function ResultCard({ lot, remainingOf, onStartAuction, onOpenShop, onDismissResult }: LotCardProps & { lot: LiveLot }) {
  const sold = lot.status === 'sold';
  const canRerun = remainingOf(lot.product) > 0;
  return (
    <Animated.View entering={FadeInDown.springify().damping(18)} style={[styles.card, sold ? styles.cardSold : null]}>
      <View style={styles.row}>
        <Thumb uri={lot.product.images[0]} id={lot.product.id} />
        <View style={styles.mid}>
          <Text variant="subhead" weight="800" color={sold ? liveColors.success : liveColors.danger}>
            {sold ? `Satıldı! ${formatTRY(lot.currentBid)}` : 'Teklif gelmedi'}
          </Text>
          <Text variant="footnote" weight="600" color={liveColors.text} numberOfLines={1}>
            {lot.product.title}
          </Text>
          <Text variant="caption" color={liveColors.textSecondary} numberOfLines={1}>
            {sold ? `Kazanan @${lot.leader?.username ?? '—'} · ${lot.bidCount} teklif` : 'Tekrar başlatabilir ya da sıradaki ürüne geçebilirsin'}
          </Text>
        </View>
        <IconButton name="close" variant="glass" size={30} onPress={onDismissResult} accessibilityLabel="Kapat" />
      </View>
      <View style={styles.actions}>
        <Button title="Sonraki ürün" icon="play-forward" size="sm" onPress={() => onOpenShop('auction')} style={{ flex: 1 }} />
        {canRerun ? <Button title="Tekrar başlat" icon="refresh" variant="glass" size="sm" onPress={() => onStartAuction(lot.product)} /> : null}
      </View>
    </Animated.View>
  );
}

function EmptyCard({ onOpenShop }: { onOpenShop: LotCardProps['onOpenShop'] }) {
  return (
    <Animated.View entering={FadeInDown} style={[styles.card, styles.emptyCard]}>
      <View style={styles.emptyIcon}>
        <Icon name="storefront-outline" size={20} color={liveColors.text} />
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="subhead" weight="700" color={liveColors.text}>
          Sahnede ürün yok
        </Text>
        <Text variant="caption" color={liveColors.textSecondary} numberOfLines={2}>
          Bir ürün sabitle ya da açık artırma başlat
        </Text>
      </View>
      <Button title="Mağaza" icon="storefront" size="sm" onPress={() => onOpenShop()} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: liveColors.glassStrong,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: liveColors.border,
    padding: 10,
    gap: 8,
  },
  cardUrgent: { borderColor: liveColors.live },
  cardFlash: { borderColor: liveColors.primary },
  cardSold: { borderColor: liveColors.success },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  thumb: { width: 56, height: 56, borderRadius: radius.sm, backgroundColor: liveColors.panelAlt },
  mid: { flex: 1, gap: 2 },
  right: { alignItems: 'flex-end', maxWidth: 120, gap: 2 },
  tagRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tag: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 1 },
  timer: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  strike: { textDecorationLine: 'line-through' },
  progressTrack: { height: 3, borderRadius: 2, backgroundColor: liveColors.glassLight, overflow: 'hidden' },
  progressFill: { height: 3, borderRadius: 2 },
  actions: { flexDirection: 'row', gap: 8 },
  emptyCard: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  emptyIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: liveColors.glassLight, alignItems: 'center', justifyContent: 'center' },
});
