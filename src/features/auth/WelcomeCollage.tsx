import { Image } from 'expo-image';
import { useIsFocused } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { Avatar, Text } from '@/components/ui';
import { getLiveShows, getUser } from '@/data';
import { formatCompact } from '@/lib/format';
import { liveColors, radius, useTheme } from '@/theme';
import type { Show } from '@/types';

const GAP = 10;
const COLUMNS = 3;
/** Sonsuz döngü için büyük bir hedef: her tur = 1 birim */
const LOOPS = 1000;

type Tile = { id: string; cover: string; viewers: number; username: string; avatar: string; title: string };

function toTile(show: Show): Tile {
  const seller = getUser(show.sellerId);
  return { id: show.id, cover: show.coverImage, viewers: show.viewers, username: seller?.username ?? 'mezatonline', avatar: seller?.avatar ?? '', title: show.title };
}

function CollageTile({ tile, width }: { tile: Tile; width: number }) {
  const { colors } = useTheme();
  const height = Math.round((width * 4) / 3);
  return (
    <View style={[styles.tile, { width, height, backgroundColor: colors.surface }]}>
      <Image source={{ uri: tile.cover }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" transition={250} recyclingKey={tile.id} />
      <View style={[styles.live, { backgroundColor: colors.live }]}>
        <View style={styles.liveDot} />
        <Text variant="caption" weight="800" color={liveColors.text} style={styles.liveText}>
          CANLI • {formatCompact(tile.viewers)}
        </Text>
      </View>
      <View style={styles.tileFooter}>
        <Avatar uri={tile.avatar} name={tile.username} size={16} />
        <Text variant="caption" weight="700" color={liveColors.text} numberOfLines={1} style={styles.username}>
          {tile.username}
        </Text>
      </View>
    </View>
  );
}

function MarqueeColumn({ tiles, width, direction, secondsPerLoop, active }: { tiles: Tile[]; width: number; direction: 'up' | 'down'; secondsPerLoop: number; active: boolean }) {
  const tileH = Math.round((width * 4) / 3);
  const loopH = tiles.length * (tileH + GAP);
  const progress = useSharedValue(0);

  useEffect(() => {
    if (!active) {
      cancelAnimation(progress);
      return;
    }
    const from = progress.get() % 1;
    progress.set(from);
    progress.set(withTiming(from + LOOPS, { duration: secondsPerLoop * 1000 * LOOPS, easing: Easing.linear }));
    return () => cancelAnimation(progress);
  }, [active, progress, secondsPerLoop]);

  const style = useAnimatedStyle(() => {
    const p = progress.get() % 1;
    const y = direction === 'up' ? -p * loopH : (p - 1) * loopH;
    return { transform: [{ translateY: y }] };
  });

  return (
    <Animated.View style={[styles.column, { width }, style]}>
      {[...tiles, ...tiles].map((t, i) => (
        <CollageTile key={`${t.id}-${i}`} tile={t} width={width} />
      ))}
    </Animated.View>
  );
}

/**
 * Karşılama ekranı arka planı: canlı yayın kapaklarından oluşan, yavaşça kayan 3 sütunlu kolaj.
 * Ekran odakta değilken animasyon durur.
 */
export function WelcomeCollage() {
  const { width } = useWindowDimensions();
  const focused = useIsFocused();
  const shows = getLiveShows();
  const tiles = shows.map(toTile);
  // Döngü yüksekliği ekranı aşsın diye en az 7 kart/sütun
  const pool = tiles.length >= COLUMNS * 7 ? tiles : [...tiles, ...tiles, ...tiles];
  const columns: Tile[][] = Array.from({ length: COLUMNS }, (_, c) => pool.filter((_, i) => i % COLUMNS === c));
  // Kolaj hafif eğik ve büyütülmüş; kenarlar ekran dışında kalır
  const colWidth = Math.round((width * 1.26 - GAP * (COLUMNS + 1)) / COLUMNS);
  return (
    <View style={styles.wrap} pointerEvents="none">
      <View style={[styles.rotator, { width: width * 1.26, left: -width * 0.13 }]}>
        {columns.map((col, i) => (
          <MarqueeColumn key={i} tiles={col} width={colWidth} direction={i % 2 === 0 ? 'up' : 'down'} secondsPerLoop={i === 1 ? 70 : 58 + i * 6} active={focused} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { ...StyleSheet.absoluteFill, overflow: 'hidden' },
  rotator: {
    position: 'absolute',
    top: -140,
    bottom: -140,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: GAP,
    transform: [{ rotate: '-7deg' }],
  },
  column: { gap: GAP },
  tile: { borderRadius: radius.md, overflow: 'hidden' },
  live: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  liveDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: liveColors.text },
  liveText: { fontSize: 9, lineHeight: 12 },
  tileFooter: { position: 'absolute', left: 8, right: 8, bottom: 8, flexDirection: 'row', alignItems: 'center', gap: 5 },
  username: { flexShrink: 1, fontSize: 10, textShadowColor: liveColors.glassStrong, textShadowRadius: 3 },
});
