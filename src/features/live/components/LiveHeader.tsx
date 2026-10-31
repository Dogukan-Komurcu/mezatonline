import { StyleSheet, View } from 'react-native';
import Animated, { ZoomIn, ZoomOut } from 'react-native-reanimated';

import { Avatar, Icon, PressableScale, Text, ViewerCount } from '@/components/ui';
import { formatCompact } from '@/lib/format';
import { liveColors, SCREEN_PADDING } from '@/theme';
import type { Show, User } from '@/types';

import { LIVE_RADIUS, liveStyles, textShadow } from './styles';

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

const AVATAR = 42;

/**
 * S20-A: üst bilgi. Solda satıcı avatarı (takip edilmiyorsa sağ altında turkuaz "+" rozeti),
 * kullanıcı adı + doğrulama rozeti ve altında takipçi sayısı; sağda cam izleyici sayacı ve cam "×".
 */
export function LiveHeader({ show, seller, viewers, following, topInset, onFollow, onSellerPress, onViewersPress, onClose }: LiveHeaderProps) {
  const verified = seller.badges.includes('verified');
  return (
    <View style={{ paddingTop: topInset + 6 }}>
      <View style={styles.row}>
        <View style={styles.seller}>
          <View style={styles.avatarWrap}>
            <PressableScale scaleTo={0.95} onPress={onSellerPress} accessibilityLabel={`${seller.username} profili`}>
              <Avatar uri={seller.avatar} name={seller.username} size={AVATAR} ring={seller.badges.includes('top_seller')} />
            </PressableScale>
            {!following ? (
              <Animated.View entering={ZoomIn.springify().damping(14)} exiting={ZoomOut.duration(160)} style={styles.followWrap}>
                <PressableScale
                  scaleTo={0.85}
                  onPress={onFollow}
                  style={styles.follow}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={`${seller.username} adlı satıcıyı takip et`}>
                  <Icon name="add" size={14} color={liveColors.onPrimary} />
                </PressableScale>
              </Animated.View>
            ) : null}
          </View>
          <PressableScale scaleTo={0.97} onPress={onSellerPress} style={styles.sellerText} accessibilityLabel={`${seller.username} profili`}>
            <View style={styles.nameRow}>
              <Text variant="headline" weight="700" color={liveColors.text} numberOfLines={1} style={[styles.name, textShadow]}>
                {seller.username}
              </Text>
              {verified ? <Icon name="checkmark-circle" size={14} color={liveColors.accent} /> : null}
            </View>
            <Text variant="footnote" weight="600" color={liveColors.textSecondary} numberOfLines={1} style={textShadow}>
              {formatCompact(seller.followers)} takipçi
            </Text>
          </PressableScale>
        </View>
        <View style={styles.spacer} />
        <PressableScale scaleTo={0.94} onPress={onViewersPress} accessibilityRole="button" accessibilityLabel={`İzleyiciler, ${formatCompact(viewers)}`} hitSlop={6}>
          <ViewerCount viewers={viewers} />
        </PressableScale>
        <PressableScale scaleTo={0.9} onPress={onClose} style={[liveStyles.glass, styles.close]} hitSlop={6} accessibilityRole="button" accessibilityLabel="Yayından çık">
          <Icon name="close" size={20} color={liveColors.text} />
        </PressableScale>
      </View>
      <Text variant="footnote" weight="600" color={liveColors.text} numberOfLines={1} style={[styles.title, textShadow]}>
        {show.title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SCREEN_PADDING - 4, gap: 8 },
  seller: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 },
  avatarWrap: { width: AVATAR, height: AVATAR },
  followWrap: { position: 'absolute', right: -4, bottom: -4 },
  follow: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: liveColors.primary,
    borderWidth: 2,
    borderColor: liveColors.panel,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sellerText: { flexShrink: 1, gap: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4, maxWidth: '100%' },
  name: { flexShrink: 1 },
  spacer: { flex: 1 },
  close: { width: 36, height: 36, borderRadius: LIVE_RADIUS.button, alignItems: 'center', justifyContent: 'center' },
  title: { paddingHorizontal: SCREEN_PADDING, marginTop: 8, opacity: 0.92 },
});
