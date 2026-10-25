import { Image } from 'expo-image';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import Animated, { cancelAnimation, FadeInDown, FadeOutUp, useAnimatedStyle, useSharedValue, withRepeat, withTiming, ZoomIn } from 'react-native-reanimated';

import { Avatar, Icon, PressableScale, Text } from '@/components/ui';
import { formatCompact } from '@/lib/format';
import { liveColors, SCREEN_PADDING } from '@/theme';

import type { Giveaway } from '../engine';
import { useRemaining } from '../useLiveShow';
import { alpha, PANEL } from './styles';

export type GiveawayCardProps = {
  giveaway: Giveaway;
  onEnter: () => void;
  onDismiss: () => void;
  onInfo: () => void;
};

/** S27: ekranın üstünde çekiliş kartı (alıcılar süreyi görmez; son saniyelerde "Kazanan seçiliyor…") */
export function GiveawayCard({ giveaway, onEnter, onDismiss, onInfo }: GiveawayCardProps) {
  const remaining = useRemaining(giveaway.status === 'running' ? giveaway.endsAt : undefined);
  const selecting = giveaway.status === 'running' && remaining > 0 && remaining < 3.2;
  const shimmer = useSharedValue(1);
  useEffect(() => {
    if (selecting) shimmer.set(withRepeat(withTiming(0.45, { duration: 450 }), -1, true));
    else {
      cancelAnimation(shimmer);
      shimmer.set(1);
    }
  }, [selecting, shimmer]);
  const shimmerStyle = useAnimatedStyle(() => ({ opacity: shimmer.get() }));

  if (giveaway.status === 'done' && giveaway.winner) {
    const mine = giveaway.winner.isMe;
    return (
      <Animated.View entering={ZoomIn.springify().damping(16)} exiting={FadeOutUp} style={[styles.card, styles.winnerCard, mine && styles.winnerMine]}>
        <View style={styles.winnerHead}>
          <Text variant="headline" weight="800" color={liveColors.text}>
            {mine ? '🎉 Çekilişi kazandın!' : '🎉 Çekiliş kazananı'}
          </Text>
          <PressableScale onPress={onDismiss} hitSlop={10} style={styles.close} accessibilityLabel="Kapat">
            <Icon name="close" size={16} color={liveColors.text} />
          </PressableScale>
        </View>
        <View style={styles.winnerPill}>
          <Avatar uri={giveaway.winner.avatar} name={giveaway.winner.username} size={22} />
          <Text variant="headline" weight="800" color={liveColors.primary} numberOfLines={1} style={styles.flexShrink}>
            {mine ? `Tebrikler @${giveaway.winner.username}!` : `@${giveaway.winner.username} kazandı!`}
          </Text>
        </View>
        <Text variant="caption" color={liveColors.textSecondary} numberOfLines={1}>
          {giveaway.product.title.replace(/^🎁\s*/, '')}
        </Text>
      </Animated.View>
    );
  }

  return (
    <Animated.View entering={FadeInDown.springify().damping(18)} exiting={FadeOutUp} style={styles.card}>
      <PressableScale scaleTo={0.98} onPress={onInfo} style={styles.row} accessibilityLabel="Çekiliş bilgisi">
        <View style={styles.thumbWrap}>
          <Image source={{ uri: giveaway.product.images[0] }} style={styles.thumb} contentFit="cover" cachePolicy="memory-disk" />
          <View style={styles.giftBadge}>
            <Text style={styles.giftEmoji}>🎁</Text>
          </View>
        </View>
        <View style={styles.texts}>
          <View style={styles.titleRow}>
            <Text variant="caption" weight="800" color={liveColors.primary}>
              ÇEKİLİŞ
            </Text>
            {giveaway.requiresFollow ? (
              <View style={styles.tag}>
                <Text variant="caption" color={liveColors.text} style={styles.tagText}>
                  Takipçilere özel
                </Text>
              </View>
            ) : null}
          </View>
          <Text variant="subhead" weight="700" color={liveColors.text} numberOfLines={1}>
            {giveaway.product.title.replace(/^🎁\s*(Çekiliş:\s*)?/, '')}
          </Text>
          {selecting ? (
            <Animated.View style={[styles.selecting, shimmerStyle]}>
              <ActivityIndicator size="small" color={liveColors.primary} />
              <Text variant="caption" weight="700" color={liveColors.primary}>
                Kazanan seçiliyor…
              </Text>
            </Animated.View>
          ) : (
            <Text variant="caption" color={liveColors.textSecondary} numberOfLines={1}>
              {giveaway.entered ? 'Katıldın ✓ · Çekiliş bitene kadar yayında kal' : `${formatCompact(giveaway.entrants)} katılımcı · Ücretsiz`}
            </Text>
          )}
        </View>
      </PressableScale>
      {giveaway.entered ? (
        <View style={[styles.button, styles.buttonDone]}>
          <Icon name="checkmark" size={15} color={liveColors.success} />
          <Text variant="footnote" weight="800" color={liveColors.success}>
            Katıldın
          </Text>
        </View>
      ) : (
        <PressableScale scaleTo={0.94} onPress={onEnter} style={styles.button} accessibilityRole="button" accessibilityLabel="Çekilişe katıl">
          <Text variant="footnote" weight="800" color={liveColors.onPrimary} numberOfLines={1}>
            Çekilişe katıl
          </Text>
        </PressableScale>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: SCREEN_PADDING - 4,
    marginTop: 10,
    borderRadius: 16,
    padding: 10,
    backgroundColor: PANEL,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: liveColors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  row: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  thumbWrap: { width: 46, height: 46 },
  thumb: { width: 46, height: 46, borderRadius: 10, backgroundColor: liveColors.panelAlt },
  giftBadge: { position: 'absolute', right: -5, bottom: -5, width: 22, height: 22, borderRadius: 11, backgroundColor: liveColors.primary, alignItems: 'center', justifyContent: 'center' },
  giftEmoji: { fontSize: 12, lineHeight: 15 },
  texts: { flex: 1, gap: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tag: { backgroundColor: liveColors.glassLight, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 },
  tagText: { fontSize: 10, lineHeight: 13 },
  selecting: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  button: { backgroundColor: liveColors.primary, borderRadius: 999, paddingHorizontal: 14, height: 34, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 4 },
  buttonDone: { backgroundColor: alpha(liveColors.success, 0.16) },
  winnerCard: { flexDirection: 'column', alignItems: 'stretch', gap: 8, paddingVertical: 12, paddingHorizontal: 14 },
  winnerMine: { borderColor: liveColors.primary, borderWidth: 1.5 },
  winnerHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  close: { width: 26, height: 26, borderRadius: 13, backgroundColor: liveColors.glassLight, alignItems: 'center', justifyContent: 'center' },
  winnerPill: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: liveColors.glassStrong, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8 },
  flexShrink: { flexShrink: 1 },
});
