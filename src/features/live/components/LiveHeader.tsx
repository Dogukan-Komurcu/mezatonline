import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, ZoomOut } from 'react-native-reanimated';

import { Avatar, Icon, IconButton, PressableScale, Text, ViewerCount } from '@/components/ui';
import { formatRating } from '@/lib/format';
import { liveColors, SCREEN_PADDING } from '@/theme';
import type { Show, User } from '@/types';

import { shipDaysLabel, textShadow } from './styles';

export type LiveHeaderProps = {
  show: Show;
  seller: User;
  viewers: number;
  following: boolean;
  topInset: number;
  onFollow: () => void;
  onSellerPress: () => void;
  onViewersPress: () => void;
  onClose: () => void;
};

/** S20-A: satıcı bilgisi + Takip Et + izleyici sayısı + kapat */
export function LiveHeader({ show, seller, viewers, following, topInset, onFollow, onSellerPress, onViewersPress, onClose }: LiveHeaderProps) {
  const verified = seller.badges.includes('verified');
  return (
    <View style={{ paddingTop: topInset + 6 }}>
      <View style={styles.row}>
        <PressableScale scaleTo={0.97} onPress={onSellerPress} style={styles.seller} accessibilityLabel={`${seller.username} profili`}>
          <Avatar uri={seller.avatar} name={seller.username} size={40} ring={seller.badges.includes('top_seller')} />
          <View style={styles.sellerText}>
            <View style={styles.nameRow}>
              <Text variant="headline" weight="700" color={liveColors.text} numberOfLines={1} style={[styles.name, textShadow]}>
                {seller.username}
              </Text>
              {verified ? <Icon name="checkmark-circle" size={14} color={liveColors.primary} /> : null}
            </View>
            <Text variant="footnote" weight="600" color={liveColors.textSecondary} numberOfLines={1} style={textShadow}>
              ★ {formatRating(seller.rating)} · 🚚 {shipDaysLabel(seller.avgShipDays)}
            </Text>
          </View>
        </PressableScale>
        {!following ? (
          <Animated.View entering={FadeIn} exiting={ZoomOut.duration(180)}>
            <PressableScale scaleTo={0.92} onPress={onFollow} style={styles.follow} accessibilityRole="button" accessibilityLabel="Takip Et">
              <Text variant="footnote" weight="800" color={liveColors.onPrimary}>
                Takip Et
              </Text>
            </PressableScale>
          </Animated.View>
        ) : null}
        <View style={styles.spacer} />
        <PressableScale scaleTo={0.94} onPress={onViewersPress} accessibilityLabel="İzleyiciler" hitSlop={6}>
          <ViewerCount viewers={viewers} />
        </PressableScale>
        <IconButton name="chevron-down" variant="glass" size={36} onPress={onClose} accessibilityLabel="Yayından çık" />
      </View>
      <Text variant="footnote" weight="600" color={liveColors.text} numberOfLines={1} style={[styles.title, textShadow]}>
        {show.title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SCREEN_PADDING - 4, gap: 6 },
  seller: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  sellerText: { flexShrink: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  name: { flexShrink: 1, maxWidth: 160 },
  follow: { backgroundColor: liveColors.primary, borderRadius: 999, paddingHorizontal: 10, height: 26, alignItems: 'center', justifyContent: 'center' },
  spacer: { flex: 1 },
  title: { paddingHorizontal: SCREEN_PADDING, marginTop: 8, opacity: 0.92 },
});
