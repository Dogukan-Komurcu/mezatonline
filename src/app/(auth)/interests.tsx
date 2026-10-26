import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { FlatList, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FadeOut, ZoomIn } from 'react-native-reanimated';

import { Button, Header, Icon, PressableScale, Text } from '@/components/ui';
import { CATEGORIES_BY_POPULARITY } from '@/data';
import { AuthLayout, OnboardingProgress, SkipLink, StepTitle } from '@/features/auth/components';
import { suggestedInterests } from '@/features/auth/session';
import { useAuthFlow } from '@/features/auth/store';
import { formatCompact } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { ForceScheme, liveColors, radius, SCREEN_PADDING, useTheme } from '@/theme';
import type { Category } from '@/types';

const MIN_PICKS = 2;
const GAP = 10;
const COLUMNS = 3;

function InterestTile({ category, width, selected, onPress }: { category: Category; width: number; selected: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <PressableScale
      scaleTo={0.94}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={category.name}
      onPress={onPress}
      style={[
        styles.tile,
        {
          width,
          backgroundColor: selected ? colors.primary : colors.surface,
          borderColor: selected ? colors.onPrimary : 'transparent',
        },
      ]}>
      <Text variant="footnote" weight="800" numberOfLines={2} color={selected ? colors.onPrimary : colors.text} style={styles.tileName}>
        {category.name}
      </Text>
      <View style={[styles.tileImage, { backgroundColor: category.tint }]}>
        <Image source={{ uri: category.image }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" transition={200} recyclingKey={category.id} />
        {selected ? (
          <Animated.View entering={FadeIn.duration(140)} exiting={FadeOut.duration(120)} style={[StyleSheet.absoluteFill, styles.selectedOverlay]}>
            <Animated.View entering={ZoomIn.springify().damping(14)} style={[styles.check, { backgroundColor: colors.primary, borderColor: colors.onPrimary }]}>
              <Icon name="checkmark" size={18} color={colors.onPrimary} />
            </Animated.View>
          </Animated.View>
        ) : null}
      </View>
      <View style={styles.viewers}>
        <View style={[styles.liveDot, { backgroundColor: colors.live }]}>
          <Icon name="stats-chart" size={7} color={liveColors.text} />
        </View>
        <Text variant="caption" color={selected ? colors.onPrimary : colors.textSecondary} numberOfLines={1}>
          {formatCompact(category.viewers)}
        </Text>
      </View>
    </PressableScale>
  );
}

function InterestsScreen() {
  const { width } = useWindowDimensions();
  const gender = useAuthFlow((s) => s.gender);
  const stored = useAuthFlow((s) => s.interests);
  const setInterests = useAuthFlow((s) => s.setInterests);
  const suggested = suggestedInterests(gender);
  // Yalnızca geliştirme: ekran görüntüsü QA'sı (?qa=picked → önerilenler seçili)
  const { qa } = useLocalSearchParams<{ qa?: string }>();
  const [selected, setSelected] = useState<string[]>(() => (__DEV__ && qa === 'picked' ? suggested : stored));

  // Cinsiyete göre önerilenler önde, kalanı popülerliğe göre
  const ordered = [...CATEGORIES_BY_POPULARITY.filter((c) => suggested.includes(c.id)), ...CATEGORIES_BY_POPULARITY.filter((c) => !suggested.includes(c.id))];
  const tileWidth = Math.floor((width - SCREEN_PADDING * 2 - GAP * (COLUMNS - 1)) / COLUMNS);

  const toggle = (id: string) => {
    haptic.tap();
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const pickForMe = () => {
    haptic.success();
    setSelected((prev) => Array.from(new Set([...prev, ...suggested])));
  };

  const next = (ids: string[]) => {
    setInterests(ids);
    router.push('/(auth)/follow-sellers');
  };

  const count = selected.length;
  const ready = count >= MIN_PICKS;

  return (
    <AuthLayout
      scroll={false}
      header={
        <>
          <Header right={<SkipLink onPress={() => next([])} />} />
          <OnboardingProgress step="interests" />
        </>
      }
      footer={
        <Button
          title={ready ? `Devam (${count})` : count === 1 ? 'Bir tane daha seç' : `En az ${MIN_PICKS} kategori seç`}
          size="lg"
          fullWidth
          disabled={!ready}
          onPress={() => {
            haptic.success();
            next(selected);
          }}
        />
      }>
      <FlatList
        data={ordered}
        keyExtractor={(c) => c.id}
        extraData={selected}
        numColumns={COLUMNS}
        columnWrapperStyle={styles.columns}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            <StepTitle title="Başlamak için birkaç tane seç" subtitle="Neleri seversin? En az 2 kategori seç, Sana Özel akışını buna göre hazırlayalım." style={styles.title} />
            <PressableScale onPress={pickForMe} style={styles.pickForMe} accessibilityRole="button">
              <Icon name="sparkles" size={16} color="primary" />
              <Text variant="subhead" weight="800" color="primary" style={styles.underline}>
                Benim için seç
              </Text>
            </PressableScale>
          </View>
        }
        renderItem={({ item }) => <InterestTile category={item} width={tileWidth} selected={selected.includes(item.id)} onPress={() => toggle(item.id)} />}
      />
    </AuthLayout>
  );
}

export default function Interests() {
  return (
    <ForceScheme scheme="dark">
      <InterestsScreen />
    </ForceScheme>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: SCREEN_PADDING, paddingBottom: 24, gap: GAP },
  columns: { gap: GAP },
  title: { marginBottom: 10 },
  pickForMe: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingVertical: 6, marginBottom: 14 },
  underline: { textDecorationLine: 'underline' },
  tile: { borderRadius: radius.md, padding: 8, gap: 6, borderWidth: 2 },
  tileName: { minHeight: 32 },
  tileImage: { height: 72, borderRadius: radius.sm, overflow: 'hidden' },
  selectedOverlay: { backgroundColor: 'rgba(0,0,0,0.38)', alignItems: 'center', justifyContent: 'center' },
  viewers: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  liveDot: { width: 13, height: 13, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  check: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
});
