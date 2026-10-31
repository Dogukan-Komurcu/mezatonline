/**
 * Satıcı konsolunun alt kartı: çalışan açık artırma, flaş indirim, sabitlenmiş ürün,
 * son lot sonucu ya da boş durum. Çalışan lotta kalan süre kartın üst kenarındaki ince
 * çizgiyle gösterilir (son 5 sn nar kırmızısı); biçim çipi Açık artırma / Uzatmasız (bayrak).
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
  /** Sahne boşken önerilen sıradaki ürün */
  next?: Product;
  onPin: (p: Product) => void;
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
  return <EmptyCard {...props} />;
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
    <Animated.View entering={FadeInDown.springify().damping(18)} style={[styles.card, styles.cardRunning, urgent && styles.cardUrgent]}>
      <View style={styles.edgeTrack}>
        <View style={[styles.progressFill, { width: `${pct * 100}%`, backgroundColor: urgent ? liveColors.live : liveColors.primary }]} />
      </View>
      <View style={styles.row}>
        <Thumb uri={lot.product.images[0]} id={lot.product.id} />
        <View style={styles.mid}>
          <View style={styles.tagRow}>
            <View style={[styles.tag, styles.formatChip]}>
              <Icon name={lot.suddenDeath ? 'flag-outline' : 'hammer-outline'} size={11} color={liveColors.text} />
              <Text variant="caption" color={liveColors.text}>
                {lot.suddenDeath ? 'Uzatmasız' : 'Açık artırma'}
              </Text>
            </View>
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
          <Timer seconds={remaining} urgent={urgent} />
        </View>
      </View>
    </Animated.View>
  );
}

function Timer({ seconds, urgent }: { seconds: number; urgent: boolean }) {
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
      <Icon name="time-outline" size={15} color={urgent ? liveColors.live : liveColors.textSecondary} />
      <Text variant="headline" weight="800" color={urgent ? liveColors.live : liveColors.text} tabular>
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
              <Icon name="pin-outline" size={11} color={liveColors.text} />
              <Text variant="caption" color={liveColors.text}>
                Sabitlendi
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
          <Button title="Açık Artırmayı Başlat" icon="hammer-outline" size="sm" onPress={() => onStartAuction(pinned)} disabled={soldOut} style={{ flex: 1 }} />
        ) : (
          <Button title="Flaş İndirim" icon="flash-outline" size="sm" onPress={() => onFlash(pinned)} disabled={soldOut} style={{ flex: 1 }} />
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
        <Button title="Sonraki ürün" icon="play-forward-outline" size="sm" onPress={() => onOpenShop('auction')} style={{ flex: 1 }} />
        {canRerun ? <Button title="Tekrar başlat" icon="refresh-outline" variant="glass" size="sm" onPress={() => onStartAuction(lot.product)} /> : null}
      </View>
    </Animated.View>
  );
}

function EmptyCard({ next, onOpenShop, onStartAuction, onPin }: LotCardProps) {
  // Sıradaki ürün önerisi: alt çubuktaki "Mağaza" düğmesini tekrarlamak yerine tek dokunuşla sahneye al
  if (next) {
    const auction = next.format === 'auction';
    return (
      <Animated.View entering={FadeInDown} style={[styles.card, styles.emptyCard]}>
        <Thumb uri={next.images[0]} id={next.id} />
        <View style={styles.mid}>
          <Text variant="caption" weight="700" color={liveColors.textSecondary}>
            SIRADAKİ ÜRÜN
          </Text>
          <Text variant="subhead" weight="700" color={liveColors.text} numberOfLines={2}>
            {next.title}
          </Text>
          <Text variant="caption" color={liveColors.textSecondary} numberOfLines={1}>
            {auction ? `Açılış ${formatTRY(next.price)}` : `Hemen Al · ${formatTRY(next.price)}`}
          </Text>
        </View>
        <Button title={auction ? 'Başlat' : 'Sabitle'} icon={auction ? 'hammer-outline' : 'pin-outline'} size="sm" onPress={() => (auction ? onStartAuction(next) : onPin(next))} />
      </Animated.View>
    );
  }
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
          Mağazana ürün ekle, sonra sabitle ya da açık artırma başlat
        </Text>
      </View>
      <Button title="Ürün ekle" icon="add" size="sm" onPress={() => onOpenShop()} />
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
  cardRunning: { overflow: 'hidden', paddingTop: 13 },
  cardUrgent: { borderColor: liveColors.live },
  cardFlash: { borderColor: liveColors.primary },
  cardSold: { borderColor: liveColors.success },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  thumb: { width: 56, height: 56, borderRadius: radius.sm, backgroundColor: liveColors.panelAlt },
  mid: { flex: 1, gap: 2 },
  right: { alignItems: 'flex-end', maxWidth: 120, gap: 2 },
  tagRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  formatChip: { backgroundColor: liveColors.glassLight },
  timer: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  strike: { textDecorationLine: 'line-through' },
  edgeTrack: { position: 'absolute', top: 0, left: 0, right: 0, height: 3, backgroundColor: liveColors.glassLight },
  progressFill: { height: 3, borderRadius: 2 },
  actions: { flexDirection: 'row', gap: 8 },
  emptyCard: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  emptyIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: liveColors.glassLight, alignItems: 'center', justifyContent: 'center' },
});
