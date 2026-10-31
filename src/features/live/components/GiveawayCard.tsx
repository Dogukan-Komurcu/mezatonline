import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { cancelAnimation, FadeInDown, FadeOutUp, useAnimatedStyle, useSharedValue, withRepeat, withTiming, ZoomIn } from 'react-native-reanimated';

import { Avatar, Icon, PressableScale, Text } from '@/components/ui';
import { DEMO_COPY, DEMO_MODE } from '@/config/demo';
import { formatCompact } from '@/lib/format';
import { liveColors } from '@/theme';

import type { Giveaway } from '../engine';
import { useRemaining } from '../useLiveShow';
import { alpha, LIVE_RADIUS, liveStyles } from './styles';

export type GiveawayCardProps = {
  giveaway: Giveaway;
  onEnter: () => void;
  onDismiss: () => void;
  onInfo: () => void;
  style?: StyleProp<ViewStyle>;
};

function clock(sec: number): string {
  const s = Math.ceil(sec);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

const prizeName = (g: Giveaway) => g.product.title.replace(/^🎁\s*(Çekiliş:\s*)?/, '');

/**
 * S27: sohbet alanının üstünde ince cam çekiliş şeridi — bakır daire içinde hediye ikonu, ödül adı,
 * geri sayım, takipçilere özel etiketi ve küçük turkuaz "Katıl" düğmesi. Son saniyelerde
 * "Kazanan seçiliyor…" yazar; bitince turkuaz kenarlıklı "Kazanan: @x" şeridine dönüşür.
 * Demo sürümde gerçek ödül verilmediği şeritte de yazar (DEMO_COPY.giveaway).
 */
export function GiveawayCard({ giveaway, onEnter, onDismiss, onInfo, style }: GiveawayCardProps) {
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
      <Animated.View entering={ZoomIn.springify().damping(16)} exiting={FadeOutUp} style={[liveStyles.glass, styles.ribbon, styles.winner, style]}>
        <Avatar uri={giveaway.winner.avatar} name={giveaway.winner.username} size={28} />
        <View style={styles.texts}>
          <Text variant="subhead" weight="800" color={liveColors.text} numberOfLines={1}>
            Kazanan:{' '}
            <Text variant="subhead" weight="800" color={liveColors.accent}>
              {mine ? 'Sen 🎉' : `@${giveaway.winner.username}`}
            </Text>
          </Text>
          <Text variant="caption" color={liveColors.textSecondary} numberOfLines={1}>
            {prizeName(giveaway)}
          </Text>
          {DEMO_MODE ? (
            <Text variant="caption" weight="600" color={liveColors.textTertiary} numberOfLines={2} style={styles.demo}>
              {DEMO_COPY.giveaway}
            </Text>
          ) : null}
        </View>
        <PressableScale onPress={onDismiss} hitSlop={10} style={styles.close} accessibilityRole="button" accessibilityLabel="Kapat">
          <Icon name="close" size={14} color={liveColors.text} />
        </PressableScale>
      </Animated.View>
    );
  }

  return (
    <Animated.View entering={FadeInDown.springify().damping(18)} exiting={FadeOutUp} style={[liveStyles.glass, styles.ribbon, style]}>
      <PressableScale scaleTo={0.98} onPress={onInfo} style={styles.body} accessibilityRole="button" accessibilityLabel={`Çekiliş: ${prizeName(giveaway)}`}>
        <View style={styles.gift}>
          <Icon name="gift-outline" size={16} color={liveColors.text} />
        </View>
        <View style={styles.texts}>
          <Text variant="footnote" weight="700" color={liveColors.text} numberOfLines={1}>
            {prizeName(giveaway)}
          </Text>
          {selecting ? (
            <Animated.View style={[styles.meta, shimmerStyle]}>
              <ActivityIndicator size="small" color={liveColors.accent} />
              <Text variant="caption" weight="700" color={liveColors.accent}>
                Kazanan seçiliyor…
              </Text>
            </Animated.View>
          ) : (
            <View style={[styles.meta, styles.wrap]}>
              {giveaway.status === 'running' ? (
                <>
                  <Icon name="time-outline" size={11} color={liveColors.copper} />
                  <Text variant="caption" weight="700" color={liveColors.copper} tabular>
                    {clock(remaining)}
                  </Text>
                </>
              ) : null}
              <Text variant="caption" color={liveColors.textSecondary} numberOfLines={1}>
                {giveaway.entered ? '· Katıldın, yayında kal' : `· ${formatCompact(giveaway.entrants)} kişi`}
              </Text>
              {giveaway.requiresFollow ? (
                <View style={styles.tag}>
                  <Text variant="caption" weight="600" color={liveColors.text} style={styles.tagText}>
                    Takipçilere özel
                  </Text>
                </View>
              ) : null}
            </View>
          )}
          {DEMO_MODE ? (
            <Text variant="caption" weight="600" color={liveColors.textTertiary} numberOfLines={2} style={styles.demo}>
              {DEMO_COPY.giveaway}
            </Text>
          ) : null}
        </View>
      </PressableScale>
      {giveaway.entered ? (
        <View style={[styles.join, styles.joined]} accessible accessibilityLabel="Çekilişe katıldın">
          <Icon name="checkmark" size={14} color={liveColors.success} />
        </View>
      ) : (
        <PressableScale scaleTo={0.92} onPress={onEnter} style={styles.join} hitSlop={6} accessibilityRole="button" accessibilityLabel="Çekilişe katıl">
          <Text variant="footnote" weight="800" color={liveColors.onPrimary}>
            Katıl
          </Text>
        </PressableScale>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  ribbon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'stretch',
    borderRadius: LIVE_RADIUS.button,
    paddingVertical: 6,
    paddingLeft: 6,
    paddingRight: 6,
    backgroundColor: liveColors.glassStrong,
  },
  winner: { borderWidth: 1.5, borderColor: liveColors.primary, paddingLeft: 8 },
  body: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  gift: { width: 30, height: 30, borderRadius: 15, backgroundColor: liveColors.copper, alignItems: 'center', justifyContent: 'center' },
  texts: { flex: 1, gap: 1 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  wrap: { flexWrap: 'wrap', rowGap: 2 },
  tag: { backgroundColor: liveColors.glassLight, borderRadius: 999, paddingHorizontal: 6, paddingVertical: 1 },
  tagText: { fontSize: 10, lineHeight: 13 },
  demo: { fontSize: 10, lineHeight: 13 },
  join: { height: 30, minWidth: 30, paddingHorizontal: 12, borderRadius: 10, backgroundColor: liveColors.primary, alignItems: 'center', justifyContent: 'center' },
  joined: { paddingHorizontal: 0, width: 30, backgroundColor: alpha(liveColors.success, 0.16) },
  close: { width: 24, height: 24, borderRadius: 12, backgroundColor: liveColors.glassLight, alignItems: 'center', justifyContent: 'center' },
});
