/**
 * Ana sayfa kategori şeridi (Whatnot 2026): büyük kare kutucuklar — Sana Özel, Takip Ettiklerin,
 * ilgi alanların, diğer kategoriler ve Tüm Kategoriler. Kaydırınca üstte kompakt metin çipleri görünür.
 */
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { Avatar, PressableScale, Text } from '@/components/ui';
import { CATEGORIES, CATEGORIES_BY_POPULARITY } from '@/data';
import { RevealScrollView, type RevealTarget } from '@/features/browse/ui';
import { haptic } from '@/lib/haptics';
import { useAuthStore, useMe } from '@/store/auth';
import { useSocialStore } from '@/store/social';
import { radius, SCREEN_PADDING, useTheme } from '@/theme';
import type { Category } from '@/types';

import { Glyph3D } from './Glyph3D';

export const FOR_YOU = 'for_you';
export const FOLLOWING = 'following';
const ALL = 'all';

export type RailItem =
  | { key: typeof FOR_YOU; kind: 'for_you'; label: string }
  | { key: typeof FOLLOWING; kind: 'following'; label: string }
  | { key: string; kind: 'category'; label: string; category: Category }
  | { key: typeof ALL; kind: 'all'; label: string };

const MAX_CATEGORY_TILES = 14;

/** Sıra: Sana Özel, Takip Ettiklerin, (ilgi alanları + takip edilen kategoriler), popüler kategoriler, Tüm Kategoriler */
export function useRailItems(): RailItem[] {
  const interests = useAuthStore((s) => s.interests);
  const followedCats = useSocialStore((s) => s.followedCategoryIds);
  return useMemo(() => {
    const preferred = Array.from(new Set([...interests, ...followedCats]));
    const ordered = [
      ...(preferred.map((id) => CATEGORIES.find((c) => c.id === id)).filter(Boolean) as Category[]),
      ...CATEGORIES_BY_POPULARITY.filter((c) => !preferred.includes(c.id)),
    ].slice(0, Math.max(MAX_CATEGORY_TILES, preferred.length));
    return [
      { key: FOR_YOU, kind: 'for_you', label: 'Sana Özel' },
      { key: FOLLOWING, kind: 'following', label: 'Takip Ettiklerin' },
      ...ordered.map((c) => ({ key: c.id, kind: 'category' as const, label: c.shortName, category: c })),
      { key: ALL, kind: 'all', label: 'Tüm Kategoriler' },
    ];
  }, [interests, followedCats]);
}

function select(item: RailItem, onSelect: (key: string) => void) {
  haptic.tap();
  if (item.kind === 'all') {
    router.navigate('/categories');
    return;
  }
  onSelect(item.key);
}

// ─── Büyük kutucuk ───────────────────────────────────────────────────────────

const TILE_W = 104;
const TILE_H = 112;
const RAIL_GAP = 8;

function TileArt({ item }: { item: RailItem }) {
  const { colors } = useTheme();
  const me = useMe();
  switch (item.kind) {
    case 'for_you':
      return (
        <View style={[styles.avatarRing, { backgroundColor: colors.card }]}>
          <Avatar uri={me.avatar} name={me.username} size={50} />
        </View>
      );
    case 'following':
      return <Glyph3D name="heart" size={54} />;
    case 'all': {
      const pics = CATEGORIES_BY_POPULARITY.slice(0, 4);
      return (
        <View style={styles.collage}>
          {pics.map((c, i) => (
            <Image
              key={c.id}
              source={{ uri: c.image }}
              style={[styles.collageImg, { borderColor: colors.card, transform: [{ rotate: `${i % 2 ? 6 : -6}deg` }] }]}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
          ))}
        </View>
      );
    }
    default:
      return (
        <Image
          source={{ uri: item.category.image }}
          style={[styles.photo, { borderColor: colors.card }]}
          contentFit="cover"
          transition={200}
          cachePolicy="memory-disk"
          recyclingKey={item.key}
        />
      );
  }
}

function RailTile({ item, selected, onSelect }: { item: RailItem; selected: boolean; onSelect: (key: string) => void }) {
  const { colors, isDark } = useTheme();
  const bg = selected
    ? colors.primary
    : item.kind === 'for_you'
      ? colors.primary
      : item.kind === 'all'
        ? colors.card
        : item.kind === 'category' && !isDark
          ? item.category.tint
          : colors.surface;
  const onYellow = selected || item.kind === 'for_you';
  return (
    <PressableScale
      scaleTo={0.94}
      onPress={() => select(item, onSelect)}
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      accessibilityLabel={item.label}
      style={[styles.tile, { backgroundColor: bg }]}>
      {selected ? (
        <>
          <View pointerEvents="none" style={[styles.outerRing, { borderColor: colors.text }]} />
          <View pointerEvents="none" style={[styles.innerRing, { borderColor: colors.bg }]} />
        </>
      ) : item.kind === 'all' ? (
        <View pointerEvents="none" style={[styles.outerRing, styles.hairRing, { borderColor: colors.border }]} />
      ) : null}
      <Text weight="700" color={onYellow ? colors.onPrimary : colors.text} align="center" numberOfLines={2} style={styles.tileLabel}>
        {item.label}
      </Text>
      <View style={styles.art}>
        <TileArt item={item} />
      </View>
    </PressableScale>
  );
}

export function CategoryRail({ items, selected, onSelect }: { items: RailItem[]; selected: string; onSelect: (key: string) => void }) {
  // Kutucuklar sabit genişlikte: seçili kutucuğun konumu hesapla bilinir
  const index = items.findIndex((it) => it.key === selected);
  const target = index < 0 ? undefined : { x: SCREEN_PADDING + index * (TILE_W + RAIL_GAP), w: TILE_W };
  return (
    <RevealScrollView target={target} contentStyle={styles.rail}>
      {items.map((item) => (
        <RailTile key={item.key} item={item} selected={item.key === selected} onSelect={onSelect} />
      ))}
    </RevealScrollView>
  );
}

// ─── Kompakt çip şeridi (kaydırınca üstte sabit) ─────────────────────────────

export function CompactRail({ items, selected, onSelect }: { items: RailItem[]; selected: string; onSelect: (key: string) => void }) {
  const { colors, isDark } = useTheme();
  // Çip genişlikleri değişken: seçili çipin konumu ölçülünce şerit ona kaydırılır (kompakt şerit her açılışta yeniden kurulur)
  const [layouts, setLayouts] = useState<Record<string, RevealTarget>>({});
  return (
    <Animated.View entering={FadeIn.duration(160)} exiting={FadeOut.duration(120)} style={[styles.compactWrap, { backgroundColor: colors.bg, borderBottomColor: colors.border }]}>
      <RevealScrollView target={layouts[selected]} animated={false} contentStyle={styles.compactRail}>
        {items.map((item) => {
          const isSel = item.key === selected;
          const bg = isSel ? colors.primary : item.kind === 'category' && !isDark ? item.category.tint : colors.surface;
          return (
            <PressableScale
              key={item.key}
              scaleTo={0.94}
              onPress={() => select(item, onSelect)}
              onLayout={(e) => {
                const { x, width } = e.nativeEvent.layout;
                setLayouts((prev) => (prev[item.key]?.x === x && prev[item.key]?.w === width ? prev : { ...prev, [item.key]: { x, w: width } }));
              }}
              accessibilityRole="tab"
              accessibilityState={{ selected: isSel }}
              style={[styles.compactChip, { backgroundColor: bg, borderColor: isSel ? colors.text : 'transparent' }]}>
              <Text variant="callout" weight="700" color={isSel ? colors.onPrimary : colors.text} numberOfLines={1}>
                {item.label}
              </Text>
            </PressableScale>
          );
        })}
      </RevealScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  rail: { paddingHorizontal: SCREEN_PADDING, gap: RAIL_GAP, paddingTop: 4, paddingBottom: 16 },
  tile: {
    width: TILE_W,
    height: TILE_H,
    borderRadius: radius.md,
    paddingTop: 9,
    paddingHorizontal: 6,
    alignItems: 'center',
    overflow: 'hidden',
  },
  outerRing: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderWidth: 2.5, borderRadius: radius.md },
  hairRing: { borderWidth: 1 },
  innerRing: { position: 'absolute', top: 2.5, left: 2.5, right: 2.5, bottom: 2.5, borderWidth: 2, borderRadius: radius.md - 2.5 },
  tileLabel: { fontSize: 14, lineHeight: 17 },
  art: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 4 },
  avatarRing: { padding: 3, borderRadius: 30 },
  photo: { width: 54, height: 54, borderRadius: 12, borderWidth: 2, transform: [{ rotate: '-6deg' }] },
  collage: { width: 64, height: 56, flexDirection: 'row', flexWrap: 'wrap', gap: 3, justifyContent: 'center', alignContent: 'center' },
  collageImg: { width: 27, height: 25, borderRadius: 6, borderWidth: 1.5 },
  compactWrap: { borderBottomWidth: StyleSheet.hairlineWidth },
  compactRail: { paddingHorizontal: SCREEN_PADDING, gap: RAIL_GAP, paddingVertical: 8 },
  compactChip: { height: 40, paddingHorizontal: 14, borderRadius: 10, borderWidth: 2, justifyContent: 'center' },
});
