/**
 * Satıcı konsolu üst katmanları: başlık, anlık istatistikler, yayın notu, sağ ray,
 * çekiliş kartı, sabit mesaj ve uçan kalpler.
 */
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, FadeIn, FadeInUp, FadeOut, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { Avatar, Icon, IconButton, LiveBadge, PressableScale, Text, ViewerCount, type IconName } from '@/components/ui';
import type { Giveaway } from '@/features/live/engine';
import { formatCompact, formatTRY } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { brand, liveColors, radius, SCREEN_PADDING } from '@/theme';
import type { ChatMessage, User } from '@/types';

import { formatElapsed, formatTimer } from './helpers';

// ─── Başlık ──────────────────────────────────────────────────────────────────

export function HostHeader({
  me,
  rehearsal,
  elapsedSec,
  viewers,
  verifiedOnly,
  muted,
  onViewers,
  onMore,
  onClose,
}: {
  me: User;
  rehearsal: boolean;
  elapsedSec: number;
  viewers: number;
  verifiedOnly: boolean;
  muted: boolean;
  onViewers: () => void;
  onMore: () => void;
  onClose: () => void;
}) {
  return (
    <View style={styles.header}>
      <Avatar uri={me.avatar} name={me.username} size={38} />
      <View style={styles.headerText}>
        <Text variant="headline" color={liveColors.text} numberOfLines={1} style={styles.shadow}>
          {me.username}
        </Text>
        <View style={styles.headerMeta}>
          {rehearsal ? (
            <View style={styles.provaBadge}>
              <Icon name="lock-closed" size={10} color={liveColors.text} />
              <Text variant="caption" color={liveColors.text}>
                PROVA
              </Text>
            </View>
          ) : (
            <LiveBadge />
          )}
          <Text variant="footnote" weight="700" color={liveColors.text} tabular style={styles.shadow}>
            {formatElapsed(elapsedSec)}
          </Text>
          {muted ? <Icon name="mic-off" size={14} color={liveColors.danger} /> : null}
        </View>
      </View>
      <PressableScale onPress={onViewers} accessibilityRole="button" accessibilityLabel="İzleyiciler ve istatistikler" hitSlop={6} style={styles.viewerWrap}>
        <ViewerCount viewers={viewers} />
        {verifiedOnly ? (
          <View style={styles.viewerBadge}>
            <Icon name="shield-checkmark" size={12} color={liveColors.success} />
          </View>
        ) : null}
      </PressableScale>
      <IconButton name="ellipsis-horizontal" variant="glass" size={36} onPress={onMore} accessibilityLabel="Diğer" />
      <IconButton name="close" variant="glass" size={36} onPress={onClose} accessibilityLabel="Yayını bitir" />
    </View>
  );
}

// ─── Anlık istatistikler ─────────────────────────────────────────────────────

export function StatsStrip({ gross, itemsSold, peakViewers, likes, onPress }: { gross: number; itemsSold: number; peakViewers: number; likes: number; onPress: () => void }) {
  const cells: { icon: IconName; value: string; label: string; tint?: string }[] = [
    { icon: 'cash-outline', value: gross >= 100_000 ? '₺' + formatCompact(gross) : formatTRY(gross), label: 'brüt satış', tint: liveColors.success },
    { icon: 'pricetag-outline', value: String(itemsSold), label: 'satılan' },
    { icon: 'trending-up', value: formatCompact(peakViewers), label: 'zirve' },
    { icon: 'heart', value: formatCompact(likes), label: 'beğeni', tint: liveColors.live },
  ];
  return (
    <PressableScale onPress={onPress} scaleTo={0.98} accessibilityRole="button" accessibilityLabel="Yayın istatistikleri" style={styles.stats}>
      {cells.map((c, i) => (
        <View key={c.label} style={[styles.statCell, i > 0 && styles.statDivider]}>
          <View style={styles.statValueRow}>
            <Icon name={c.icon} size={12} color={c.tint ?? liveColors.textSecondary} />
            <Text variant="subhead" weight="800" color={c.tint ?? liveColors.text} numberOfLines={1} adjustsFontSizeToFit tabular>
              {c.value}
            </Text>
          </View>
          <Text variant="caption" color={liveColors.textTertiary} numberOfLines={1}>
            {c.label}
          </Text>
        </View>
      ))}
    </PressableScale>
  );
}

// ─── Yayın notu (sarı yapışkan not) ──────────────────────────────────────────

export function NotesSticky({ text, collapsed, onPress, onToggle }: { text: string; collapsed: boolean; onPress: () => void; onToggle: () => void }) {
  if (collapsed) {
    return (
      <PressableScale onPress={onToggle} style={styles.noteCollapsed} accessibilityLabel="Yayın notlarını göster">
        <Icon name="document-text" size={14} color={brand.black} />
        <Text variant="caption" color={brand.black}>
          Notlar
        </Text>
      </PressableScale>
    );
  }
  return (
    <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.note}>
      <PressableScale onPress={onPress} scaleTo={0.97} accessibilityLabel="Yayın notlarını düzenle" style={{ flex: 1 }}>
        <View style={styles.noteHead}>
          <Text variant="caption" weight="800" color={brand.black}>
            Yayın Notları
          </Text>
          <PressableScale onPress={onToggle} hitSlop={10} accessibilityLabel="Notları küçült">
            <Icon name="remove-circle-outline" size={15} color={brand.black} />
          </PressableScale>
        </View>
        <Text variant="caption" weight="500" color={brand.black} numberOfLines={4} style={{ lineHeight: 15 }}>
          {text || 'Not eklemek için dokun'}
        </Text>
      </PressableScale>
      <View style={styles.noteFold} />
    </Animated.View>
  );
}

// ─── Sağ ray ─────────────────────────────────────────────────────────────────

export type RailItem = { key: string; icon: IconName; label: string; onPress: () => void; active?: boolean; danger?: boolean };

export function RightRail({ items, compact }: { items: RailItem[]; compact?: boolean }) {
  return (
    <View style={[styles.rail, compact && styles.railCompact]}>
      {items.map((it) => (
        <View key={it.key} style={styles.railItem}>
          <IconButton
            name={it.icon}
            variant="glass"
            size={compact ? 38 : 42}
            color={it.danger ? liveColors.danger : it.active ? liveColors.primary : liveColors.text}
            onPress={it.onPress}
            accessibilityLabel={it.label}
          />
          <Text variant="caption" color={it.active ? liveColors.primary : liveColors.text} numberOfLines={1} style={[styles.shadow, styles.railLabel]}>
            {it.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

// ─── Çekiliş kartı (yalnız satıcı geri sayımı görür) ─────────────────────────

export function GiveawayBanner({ giveaway, now }: { giveaway: Giveaway; now: number }) {
  const running = giveaway.status === 'running';
  const remaining = (giveaway.endsAt - now) / 1000;
  return (
    <Animated.View entering={FadeInUp.springify().damping(16)} exiting={FadeOut} style={[styles.giveaway, !running && styles.giveawayDone]}>
      <View style={styles.giftIcon}>
        <Icon name="gift" size={16} color={liveColors.onPrimary} />
      </View>
      <View style={{ flex: 1, gap: 1 }}>
        <Text variant="caption" weight="800" color={liveColors.primary}>
          {running ? (giveaway.requiresFollow ? 'ÇEKİLİŞ · TAKİPÇİLERE ÖZEL' : 'ÇEKİLİŞ') : 'ÇEKİLİŞ KAZANANI'}
        </Text>
        {running ? (
          <>
            <Text variant="footnote" weight="700" color={liveColors.text} numberOfLines={1}>
              {giveaway.product.title}
            </Text>
            <Text variant="caption" color={liveColors.textSecondary} tabular>
              ⏱ {formatTimer(remaining)} · {formatCompact(giveaway.entrants)} katılımcı
            </Text>
          </>
        ) : (
          <Text variant="subhead" weight="800" color={liveColors.text} numberOfLines={1}>
            @{giveaway.winner?.username ?? '—'} 🎉
          </Text>
        )}
      </View>
    </Animated.View>
  );
}

// ─── Sabitlenmiş mesaj ───────────────────────────────────────────────────────

export function PinnedMessage({ message, onHide }: { message: ChatMessage; onHide: () => void }) {
  return (
    <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.pinned}>
      <Icon name="pin" size={14} color={liveColors.primary} />
      <View style={{ flex: 1 }}>
        <Text variant="caption" weight="800" color={liveColors.primary} numberOfLines={1}>
          {message.isSeller ? 'Sabitlenmiş duyuru' : `@${message.username} · Mod`}
        </Text>
        <Text variant="footnote" weight="600" color={liveColors.text} numberOfLines={2}>
          {message.text.replace(/^📌\s*/, '')}
        </Text>
      </View>
      <PressableScale
        onPress={() => {
          haptic.tap();
          onHide();
        }}
        hitSlop={10}
        accessibilityLabel="Sabitlemeyi kaldır">
        <Icon name="close" size={16} color={liveColors.textSecondary} />
      </PressableScale>
    </Animated.View>
  );
}

// ─── Uçan kalpler ────────────────────────────────────────────────────────────

const HEART_COLORS = [liveColors.live, liveColors.primary, liveColors.accent, liveColors.success];

export function FloatingHearts({ ids }: { ids: number[] }) {
  return (
    <View style={styles.hearts} pointerEvents="none">
      {ids.map((id) => (
        <Heart key={id} seed={id} />
      ))}
    </View>
  );
}

function Heart({ seed }: { seed: number }) {
  const p = useSharedValue(0);
  const drift = ((seed * 9301 + 49297) % 233280) / 233280 - 0.5;
  const color = HEART_COLORS[seed % HEART_COLORS.length];
  useEffect(() => {
    p.set(withTiming(1, { duration: 1800, easing: Easing.out(Easing.quad) }));
  }, [p]);
  const style = useAnimatedStyle(() => {
    const v = p.get();
    return {
      opacity: v < 0.15 ? v / 0.15 : 1 - (v - 0.15) / 0.85,
      transform: [{ translateY: -170 * v }, { translateX: Math.sin(v * 6) * 14 + drift * 40 * v }, { scale: 0.6 + v * 0.6 }],
    };
  });
  return (
    <Animated.View style={[styles.heart, style]}>
      <Icon name="heart" size={26} color={color} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  shadow: { textShadowColor: liveColors.glassStrong, textShadowRadius: 4, textShadowOffset: { width: 0, height: 1 } },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: SCREEN_PADDING - 4 },
  headerText: { flex: 1, gap: 3 },
  headerMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  provaBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: liveColors.panelAlt, borderRadius: 4, paddingHorizontal: 7, paddingVertical: 2 },
  viewerWrap: { flexDirection: 'row', alignItems: 'center' },
  viewerBadge: { position: 'absolute', right: -4, top: -6, backgroundColor: liveColors.panel, borderRadius: 8, padding: 1 },
  stats: {
    flexDirection: 'row',
    marginHorizontal: SCREEN_PADDING - 4,
    marginTop: 10,
    backgroundColor: liveColors.glass,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: liveColors.border,
    paddingVertical: 7,
  },
  statCell: { flex: 1, alignItems: 'center', gap: 1, paddingHorizontal: 4 },
  statDivider: { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: liveColors.border },
  statValueRow: { flexDirection: 'row', alignItems: 'center', gap: 4, maxWidth: '100%' },
  note: {
    width: 122,
    minHeight: 92,
    backgroundColor: brand.yellowSoft,
    borderRadius: radius.xs,
    padding: 8,
    paddingBottom: 12,
    transform: [{ rotate: '-1.5deg' }],
    shadowColor: brand.black,
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  noteHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 },
  noteFold: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 0,
    height: 0,
    borderStyle: 'solid',
    borderRightWidth: 14,
    borderTopWidth: 14,
    borderRightColor: liveColors.glassStrong,
    borderTopColor: brand.yellow,
  },
  noteCollapsed: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: brand.yellowSoft,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignSelf: 'flex-start',
  },
  rail: { gap: 10, alignItems: 'center', paddingBottom: 4 },
  railCompact: { gap: 4 },
  railItem: { alignItems: 'center', width: 56 },
  railLabel: { marginTop: 2, fontSize: 10 },
  giveaway: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: liveColors.glassStrong,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: liveColors.primary,
    padding: 8,
  },
  giveawayDone: { borderColor: liveColors.success },
  giftIcon: { width: 30, height: 30, borderRadius: 15, backgroundColor: liveColors.primary, alignItems: 'center', justifyContent: 'center' },
  pinned: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: liveColors.glassStrong,
    borderRadius: radius.md,
    borderLeftWidth: 3,
    borderLeftColor: liveColors.primary,
    paddingVertical: 7,
    paddingHorizontal: 10,
    marginBottom: 6,
  },
  hearts: { position: 'absolute', right: 0, bottom: '100%', width: 60, height: 200 },
  heart: { position: 'absolute', bottom: 0, right: 14 },
});
