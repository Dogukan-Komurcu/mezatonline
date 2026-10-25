/**
 * Ödüller (Rewards Hub) bileşenleri: puan jetonu, günlük görev kartı, puan mağazası kartları.
 */
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

import { Icon, PressableScale, Text, type IconName } from '@/components/ui';
import { getLiveShows, getMarketplaceProducts, getSellers, getUpcomingShows } from '@/data';
import { formatNumber } from '@/lib/format';
import { useSocialStore } from '@/store/social';
import type { Challenge, ChallengeKind, ShopItem } from '@/store/rewards';
import { liveColors, radius, useTheme } from '@/theme';

import { SegmentedProgress } from '@/features/account/ui';

// ─── Puan jetonu ─────────────────────────────────────────────────────────────

export function Coin({ size = 18 }: { size?: number }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.coin, { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.primary, borderColor: colors.warning }]}>
      <Text style={{ fontSize: size * 0.55, lineHeight: size * 0.7, fontWeight: '900' }} color={colors.onPrimary}>
        M
      </Text>
    </View>
  );
}

export function PointsChip({ points, style, dark }: { points: number; style?: StyleProp<ViewStyle>; dark?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.pointsChip, { backgroundColor: dark ? liveColors.glassLight : colors.card }, style]}>
      <Coin size={16} />
      <Text variant="footnote" weight="800" color={dark ? liveColors.text : colors.text} tabular>
        {formatNumber(points)}
      </Text>
    </View>
  );
}

// ─── Gece yarısına kalan süre ────────────────────────────────────────────────

export function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

export function nextMidnight(now: number): number {
  const d = new Date(now);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime();
}

// ─── Görev hedefleri ─────────────────────────────────────────────────────────

export const CHALLENGE_CTA: Record<ChallengeKind, string> = {
  watch_show: 'Yayın izle',
  save_show: 'Yayınlara göz at',
  follow_seller: 'Satıcı keşfet',
  chat: 'Sohbete katıl',
  place_bid: 'Mezata katıl',
  enter_giveaway: 'Çekilişe git',
  purchase: 'Alışverişe başla',
};

/** Görevi tamamlamak için en uygun ekrana git */
export function goToChallenge(kind: ChallengeKind) {
  const live = getLiveShows();
  switch (kind) {
    case 'watch_show':
    case 'chat':
    case 'place_bid': {
      const show = live[0];
      if (show) router.push(`/live/${show.id}`);
      else router.navigate('/');
      return;
    }
    case 'enter_giveaway': {
      const show = live.find((s) => s.giveawayCount > 0) ?? live[0];
      if (show) router.push(`/live/${show.id}`);
      else router.navigate('/');
      return;
    }
    case 'save_show': {
      const show = getUpcomingShows()[0];
      if (show) router.push(`/show/${show.id}`);
      else router.navigate('/');
      return;
    }
    case 'follow_seller': {
      const following = useSocialStore.getState().followingIds;
      const seller = getSellers().find((s) => !following.includes(s.id));
      if (seller) router.push(`/user/${seller.username}`);
      else router.navigate('/categories');
      return;
    }
    case 'purchase': {
      const product = getMarketplaceProducts()[0];
      if (product) router.push(`/product/${product.id}`);
      else router.navigate('/categories');
      return;
    }
  }
}

// ─── Görev kartı ─────────────────────────────────────────────────────────────

export function ChallengeCard({ challenge, done, style }: { challenge: Challenge; done: boolean; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  return (
    <PressableScale
      scaleTo={0.97}
      disabled={done}
      onPress={() => goToChallenge(challenge.kind)}
      accessibilityRole="button"
      accessibilityLabel={`${challenge.title}, ${challenge.points} puan`}
      style={[styles.challenge, { backgroundColor: colors.surface }, style]}>
      <PointsChip points={challenge.points} style={styles.challengeChip} />
      <View style={[styles.challengeIcon, { backgroundColor: done ? colors.success : colors.card }]}>
        <Icon name={done ? 'checkmark' : (challenge.icon as IconName)} size={28} color={done ? '#FFFFFF' : colors.text} />
      </View>
      <Text variant="headline" align="center" numberOfLines={2} style={styles.challengeTitle}>
        {challenge.title}
      </Text>
      <SegmentedProgress total={1} done={done ? 1 : 0} style={{ alignSelf: 'stretch' }} />
      <Text variant="footnote" weight="600" color={done ? 'success' : 'textSecondary'}>
        {done ? 'Tamamlandı · puan kazanıldı' : '0 / 1'}
      </Text>
      {!done ? (
        <View style={[styles.cta, { backgroundColor: colors.inverse }]}>
          <Text variant="footnote" weight="700" color={colors.onInverse} numberOfLines={1}>
            {CHALLENGE_CTA[challenge.kind]}
          </Text>
          <Icon name="arrow-forward" size={13} color={colors.onInverse} />
        </View>
      ) : null}
    </PressableScale>
  );
}

// ─── Puan mağazası ───────────────────────────────────────────────────────────

/** Hafifçe zıplayan emoji (jumbotron önizlemesi) */
export function BouncyEmoji({ emoji, size = 72 }: { emoji: string; size?: number }) {
  const s = useSharedValue(1);
  useEffect(() => {
    s.set(withRepeat(withSequence(withTiming(1.12, { duration: 520, easing: Easing.out(Easing.quad) }), withTiming(1, { duration: 520, easing: Easing.in(Easing.quad) })), -1));
  }, [s]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: s.get() }, { rotate: `${(s.get() - 1) * 40}deg` }] }));
  return (
    <Animated.View style={style}>
      <Text style={{ fontSize: size, lineHeight: size * 1.2 }}>{emoji}</Text>
    </Animated.View>
  );
}

export type ShopState = 'active' | 'owned' | 'affordable' | 'locked';

export function shopState(item: ShopItem, owned: string[], active: string, points: number): ShopState {
  if (owned.includes(item.id)) return item.kind === 'reaction' && active === item.id ? 'active' : 'owned';
  return points >= item.cost ? 'affordable' : 'locked';
}

export function ShopActionPill({ item, state, points, dark }: { item: ShopItem; state: ShopState; points: number; dark?: boolean }) {
  const { colors } = useTheme();
  if (state === 'active')
    return (
      <View style={[styles.pill, { backgroundColor: dark ? liveColors.glassLight : colors.inverse }]}>
        <Icon name="checkmark" size={14} color={dark ? liveColors.text : colors.onInverse} />
        <Text variant="footnote" weight="700" color={dark ? liveColors.text : colors.onInverse}>
          Kullanılıyor
        </Text>
      </View>
    );
  if (state === 'owned')
    return (
      <View style={[styles.pill, { backgroundColor: dark ? liveColors.glassLight : colors.card }]}>
        <Text variant="footnote" weight="700" color={dark ? liveColors.text : colors.text}>
          {item.kind === 'reaction' ? 'Kullan' : 'Sahipsin ✓'}
        </Text>
      </View>
    );
  if (state === 'locked')
    return (
      <View style={[styles.pill, { backgroundColor: dark ? liveColors.glassLight : colors.surfaceAlt }]}>
        <Icon name="lock-closed" size={12} color={dark ? liveColors.textSecondary : colors.textSecondary} />
        <Text variant="footnote" weight="700" color={dark ? liveColors.textSecondary : colors.textSecondary}>
          {formatNumber(item.cost - points)} puan eksik
        </Text>
      </View>
    );
  return (
    <View style={[styles.pill, { backgroundColor: colors.primary }]}>
      <Coin size={14} />
      <Text variant="footnote" weight="800" color={colors.onPrimary}>
        {formatNumber(item.cost)} · Al
      </Text>
    </View>
  );
}

export function ReactionCard({ item, state, points, onPress, style }: { item: ShopItem; state: ShopState; points: number; onPress: () => void; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  return (
    <PressableScale scaleTo={0.97} onPress={onPress} style={[styles.reaction, { backgroundColor: colors.surface, borderColor: state === 'active' ? colors.text : 'transparent' }, style]} accessibilityRole="button" accessibilityLabel={item.title}>
      {item.cost >= 250 && state !== 'active' && state !== 'owned' ? (
        <View style={[styles.newTag, { backgroundColor: colors.primary }]}>
          <Text variant="caption" weight="800" color={colors.onPrimary}>
            Yeni
          </Text>
        </View>
      ) : null}
      <Text style={styles.reactionEmoji}>{item.emoji}</Text>
      <Text variant="callout" weight="700" align="center" numberOfLines={1}>
        {item.title}
      </Text>
      <ShopActionPill item={item} state={state} points={points} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  coin: { alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  pointsChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.pill },
  challenge: { borderRadius: radius.xl, padding: 14, paddingTop: 40, alignItems: 'center', gap: 8 },
  challengeChip: { position: 'absolute', top: 10, right: 10 },
  challengeIcon: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  challengeTitle: { minHeight: 42 },
  cta: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.pill, marginTop: 2 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.pill },
  reaction: { borderRadius: radius.xl, padding: 14, alignItems: 'center', gap: 8, borderWidth: 2 },
  reactionEmoji: { fontSize: 44, lineHeight: 54 },
  newTag: { position: 'absolute', top: 10, left: 10, paddingHorizontal: 7, paddingVertical: 2, borderRadius: radius.pill },
});
