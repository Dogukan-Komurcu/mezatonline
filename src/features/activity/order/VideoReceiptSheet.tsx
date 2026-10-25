/**
 * Satın alma videosu (Whatnot "Video Receipt"): canlı yayında ürünü kazandığın / satın aldığın anın kaydı.
 * Mock: yayının döngülü videosu (yoksa ürün görseli) + satış anı katmanı.
 */
import { useEvent } from 'expo';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useVideoPlayer, VideoView, type VideoPlayer } from 'expo-video';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { Avatar, Button, IconButton, Sheet, Text } from '@/components/ui';
import { shareLink } from '@/features/shared/sheets';
import { getShow, getUser } from '@/data';
import { formatDateTime, formatTRY } from '@/lib/format';
import { useMe } from '@/store/auth';
import { ORDER_SOURCE_LABELS } from '@/store/orders';
import { liveColors, radius } from '@/theme';
import type { Order } from '@/types';

import { videoReceiptDaysLeft } from '../utils';

/** React Compiler: hook'tan dönen player'ın alanlarını bileşen içinde atamıyoruz */
function setPlayerMuted(player: VideoPlayer, muted: boolean) {
  player.muted = muted;
}

export function VideoReceiptSheet({ visible, onClose, order }: { visible: boolean; onClose: () => void; order: Order }) {
  const daysLeft = videoReceiptDaysLeft(order);
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      dark
      title="Satın alma videosu"
      subtitle={daysLeft > 0 ? `${daysLeft} gün daha izlenebilir` : 'Bu videonun süresi doldu'}
      showClose
      maxHeight={0.94}
      footer={
        <Button
          title="Videoyu paylaş"
          icon="share-outline"
          variant="glass"
          size="lg"
          fullWidth
          onPress={() => shareLink({ title: `Mezatonline'da ${order.productTitle} aldım!`, path: `/orders/${order.id}` })}
        />
      }>
      {/* Sheet içeriği yalnız açıkken mount edilir; player da onunla birlikte oluşur/kapanır */}
      <ReceiptPlayer order={order} expired={daysLeft <= 0} />
      <Text variant="footnote" color={liveColors.textSecondary} align="center" style={styles.note}>
        Bu kayıt, ürünü satın aldığın anı gösterir. Bir sorun yaşarsan destek talebinde kanıt olarak kullanılabilir.
      </Text>
    </Sheet>
  );
}

function ReceiptPlayer({ order, expired }: { order: Order; expired: boolean }) {
  const { width } = useWindowDimensions();
  const me = useMe();
  const show = getShow(order.showId);
  const seller = getUser(order.sellerId);
  const uri = !expired ? show?.videoUrl : undefined;
  const player = useVideoPlayer(uri ? { uri, useCaching: true } : null, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });
  const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: player.playing });
  const { muted } = useEvent(player, 'mutedChange', { muted: player.muted });
  const boxW = Math.min(width - 64, 280);
  const boxH = Math.round((boxW * 16) / 9);
  const soldAt = order.timeline[0]?.at ?? order.createdAt;

  return (
    <View style={[styles.box, { width: boxW, height: boxH }]}>
      {uri ? (
        <VideoView
          player={player}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          nativeControls={false}
          allowsPictureInPicture={false}
          fullscreenOptions={{ enable: false }}
          surfaceType="textureView"
        />
      ) : (
        <Image source={{ uri: show?.coverImage ?? order.productImage }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" blurRadius={expired ? 12 : 0} />
      )}
      <LinearGradient colors={[liveColors.glassStrong, 'transparent']} style={styles.topShade} pointerEvents="none" />
      <LinearGradient colors={['transparent', liveColors.glassStrong]} style={styles.bottomShade} pointerEvents="none" />

      <View style={styles.topRow}>
        <View style={[styles.soldPill, { backgroundColor: liveColors.primary }]}>
          <Text variant="caption" weight="800" color={liveColors.onPrimary}>
            {order.source === 'auction' ? 'SATILDI' : order.source === 'giveaway' ? 'KAZANDIN' : 'SATIN ALINDI'}
          </Text>
        </View>
        {uri ? (
          <View style={styles.controls}>
            <IconButton name={muted ? 'volume-mute' : 'volume-high'} variant="glass" size={34} onPress={() => setPlayerMuted(player, !muted)} accessibilityLabel={muted ? 'Sesi aç' : 'Sesi kapat'} />
            <IconButton
              name={isPlaying ? 'pause' : 'play'}
              variant="glass"
              size={34}
              onPress={() => (isPlaying ? player.pause() : player.play())}
              accessibilityLabel={isPlaying ? 'Duraklat' : 'Oynat'}
            />
          </View>
        ) : null}
      </View>

      {expired ? (
        <View style={styles.expired}>
          <Text variant="headline" color={liveColors.text} align="center">
            Videonun süresi doldu
          </Text>
          <Text variant="footnote" color={liveColors.textSecondary} align="center">
            Satın alma videoları 60 gün saklanır.
          </Text>
        </View>
      ) : null}

      <View style={styles.bottom}>
        {seller ? (
          <View style={styles.sellerRow}>
            <Avatar uri={seller.avatar} name={seller.username} size={26} />
            <Text variant="subhead" weight="700" color={liveColors.text} numberOfLines={1} style={styles.flexShrink}>
              {seller.username}
            </Text>
          </View>
        ) : null}
        <View style={[styles.saleCard, { backgroundColor: liveColors.glassStrong, borderColor: liveColors.border }]}>
          <Text variant="caption" color={liveColors.textSecondary}>
            {ORDER_SOURCE_LABELS[order.source]} · {formatDateTime(soldAt)}
          </Text>
          <Text variant="subhead" weight="700" color={liveColors.text} numberOfLines={2}>
            {order.productTitle}
          </Text>
          <Text variant="headline" weight="800" color={liveColors.primary}>
            {order.source === 'giveaway' ? `🎁 @${me.username} kazandı` : `🎉 @${me.username} · ${formatTRY(order.itemPrice)}`}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flexShrink: { flexShrink: 1 },
  box: { alignSelf: 'center', borderRadius: radius.lg, overflow: 'hidden', backgroundColor: liveColors.panelAlt },
  topShade: { position: 'absolute', left: 0, right: 0, top: 0, height: 90 },
  bottomShade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 200 },
  topRow: { position: 'absolute', top: 10, left: 10, right: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  soldPill: { borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3 },
  controls: { flexDirection: 'row', gap: 8 },
  expired: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 4 },
  bottom: { position: 'absolute', left: 10, right: 10, bottom: 10, gap: 8 },
  sellerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  saleCard: { borderRadius: radius.md, padding: 10, gap: 2, borderWidth: StyleSheet.hairlineWidth },
  note: { marginTop: 14 },
});
