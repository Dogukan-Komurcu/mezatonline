/**
 * En İyi Satıcılar sıralaması (Whatnot Top Seller Leaderboard, S14).
 * Kategori değiştirici, Şu An Canlı | Bugün | Bu Hafta çipleri, madalyalı sıralı liste, ⓘ açıklama sayfası.
 * Route param `id`: kategori id'si ya da "all".
 */
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FollowButton } from '@/components/cards/UserRow';
import { Avatar, Button, EmptyState, Icon, PressableScale, Sheet, Text } from '@/components/ui';
import { CATEGORIES_BY_POPULARITY, getCategory, getLiveShows } from '@/data';
import { ALL_SCOPE, getLeaderboard, PERIOD_LABELS, scopeLabel, type LeaderEntry, type LeaderboardPeriod } from '@/features/browse/leaderboard';
import { ChipScroller, FilterChip, Medal, ViewersMetric } from '@/features/browse/ui';
import { Glyph3D } from '@/features/home/Glyph3D';
import { formatCompact } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { radius, SCREEN_PADDING, useTheme } from '@/theme';

const PERIODS: LeaderboardPeriod[] = ['live', 'today', 'week'];

const PERIOD_HINTS: Record<LeaderboardPeriod, string> = {
  live: 'Şu an canlı olan satıcılar · son 4 saatteki performans',
  today: 'Son 24 saatteki satış ve izlenme performansı',
  week: 'Son 7 gündeki satış ve izlenme performansı',
};

function CircleButton({ icon, label, onPress, bg }: { icon: 'chevron-back' | 'information-circle-outline'; label: string; onPress: () => void; bg: string }) {
  return (
    <PressableScale
      scaleTo={0.9}
      hitSlop={6}
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[styles.circle, { backgroundColor: bg, shadowColor: '#000' }]}>
      <Icon name={icon} size={22} color="text" />
    </PressableScale>
  );
}

function LeaderRow({ entry, cardBg }: { entry: LeaderEntry; cardBg: string }) {
  const { colors, isDark } = useTheme();
  const { seller, liveShow } = entry;
  return (
    <PressableScale scaleTo={0.985} onPress={() => router.push(`/user/${seller.username}`)} style={[styles.card, { backgroundColor: cardBg }]} accessibilityRole="button" accessibilityLabel={`${entry.rank}. ${seller.username}`}>
      <View style={styles.rank}>
        <Medal rank={entry.rank} size={28} />
      </View>
      <Avatar uri={seller.avatar} name={seller.username} size={56} live={!!liveShow} verified={seller.badges.includes('verified')} />
      <View style={styles.cardBody}>
        <Text variant="title3" weight="600" numberOfLines={1}>
          {seller.username}
        </Text>
        <View style={styles.metaRow}>
          <ViewersMetric viewers={entry.viewers} live={!!liveShow} />
          {!liveShow ? (
            <Text variant="footnote" color="textSecondary" numberOfLines={1} style={styles.shrink}>
              · {formatCompact(entry.sales)} satış
            </Text>
          ) : null}
        </View>
      </View>
      {liveShow ? <Button title="Katıl" size="sm" variant="secondary" style={isDark ? { backgroundColor: colors.surfaceAlt } : undefined} onPress={() => router.push(`/live/${liveShow.id}`)} /> : <FollowButton user={seller} />}
    </PressableScale>
  );
}

export default function TopSellersScreen() {
  const params = useLocalSearchParams<{ id: string; qa?: string }>();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [scope, setScope] = useState<string>(params.id && (params.id === ALL_SCOPE || getCategory(params.id)) ? params.id : ALL_SCOPE);
  const [period, setPeriod] = useState<LeaderboardPeriod>('live');
  const [infoOpen, setInfoOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Yalnızca geliştirme: ekran görüntüsü QA'sı (?qa=info | picker | today)
  useEffect(() => {
    if (!__DEV__ || !params.qa) return;
    const t = setTimeout(() => {
      if (params.qa === 'info') setInfoOpen(true);
      else if (params.qa === 'picker') setPickerOpen(true);
      else if (params.qa === 'today') setPeriod('today');
    }, 900);
    return () => clearTimeout(t);
  }, [params.qa]);

  const pageBg = isDark ? colors.bg : colors.surface;
  const cardBg = isDark ? colors.surface : colors.card;
  const category = scope === ALL_SCOPE ? undefined : getCategory(scope);
  const heroImage = category?.image ?? CATEGORIES_BY_POPULARITY[0]?.image;
  const entries = useMemo(() => getLeaderboard(scope, period, 25), [scope, period]);

  const scopes = useMemo(
    () => [
      { id: ALL_SCOPE, label: 'Tüm Kategoriler', image: undefined as string | undefined, live: getLiveShows().length },
      ...CATEGORIES_BY_POPULARITY.map((c) => ({ id: c.id, label: c.name, image: c.image as string | undefined, live: getLiveShows({ categoryId: c.id }).length })),
    ],
    [],
  );

  const header = (
    <View style={styles.hero}>
      {heroImage ? <Image source={{ uri: heroImage }} style={styles.heroImage} contentFit="cover" transition={250} cachePolicy="memory-disk" /> : null}
      <Text variant="title1" color="textSecondary">
        En İyi Satıcılar
      </Text>
      <PressableScale
        scaleTo={0.98}
        onPress={() => {
          haptic.tap();
          setPickerOpen(true);
        }}
        accessibilityRole="button"
        accessibilityLabel={`Kategori: ${scopeLabel(scope)}. Değiştir`}
        style={styles.scopeBtn}>
        <Text variant="display" numberOfLines={2} style={styles.scopeText}>
          {scopeLabel(scope)}
          {'  '}
          <Icon name="chevron-down" size={24} color="textSecondary" />
        </Text>
      </PressableScale>
      <ChipScroller style={styles.chipsWrap} contentStyle={styles.chips}>
        {PERIODS.map((p) => (
          <FilterChip key={p} label={PERIOD_LABELS[p]} selected={period === p} onPress={() => setPeriod(p)} style={period === p ? undefined : { backgroundColor: cardBg }} />
        ))}
      </ChipScroller>
      <Text variant="footnote" color="textSecondary" style={styles.hint}>
        {PERIOD_HINTS[period]}
      </Text>
    </View>
  );

  return (
    <View style={[styles.flex, { backgroundColor: pageBg }]}>
      <FlatList
        data={entries}
        keyExtractor={(e) => e.seller.id}
        ListHeaderComponent={header}
        renderItem={({ item }) => <LeaderRow entry={item} cardBg={cardBg} />}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        contentContainerStyle={{ paddingTop: insets.top + 60, paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            progressViewOffset={insets.top + 56}
            tintColor={colors.textSecondary}
            colors={[colors.text]}
            progressBackgroundColor={colors.card}
            onRefresh={() => {
              setRefreshing(true);
              haptic.light();
              setTimeout(() => setRefreshing(false), 800);
            }}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon="radio-outline"
            title={period === 'live' ? 'Şu an canlı satıcı yok' : 'Bu dönemde sıralama yok'}
            message={period === 'live' ? `${scopeLabel(scope)} kategorisinde şu an yayında olan satıcı bulunmuyor.` : 'Başka bir kategori seçmeyi dene.'}
            actionLabel={period === 'live' ? 'Bugünün sıralamasına bak' : 'Tüm kategorilere bak'}
            onAction={() => (period === 'live' ? setPeriod('today') : setScope(ALL_SCOPE))}
          />
        }
      />

      <View style={[styles.nav, { paddingTop: insets.top + 6 }]} pointerEvents="box-none">
        <CircleButton icon="chevron-back" label="Geri" bg={cardBg} onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
        <CircleButton icon="information-circle-outline" label="En İyi Satıcılar hakkında" bg={cardBg} onPress={() => setInfoOpen(true)} />
      </View>

      <Sheet visible={infoOpen} onClose={() => setInfoOpen(false)} title="En İyi Satıcılar hakkında" showClose footer={<Button title="Anladım" fullWidth onPress={() => setInfoOpen(false)} />}>
        <View style={styles.infoBlock}>
          <View style={[styles.infoIcon, { backgroundColor: colors.surface }]}>
            <Icon name="podium-outline" size={20} color="text" />
          </View>
          <View style={styles.flex}>
            <Text variant="headline">Satıcılar nasıl sıralanır?</Text>
            <Text variant="callout" color="textSecondary" style={styles.infoText}>
              Satıcılar; satışlarına, yayınlarının izlenmesine ve siparişleri ne kadar güvenilir şekilde gönderdiklerine göre sıralanır.
            </Text>
          </View>
        </View>
        <View style={styles.infoBlock}>
          <View style={[styles.infoIcon, { backgroundColor: colors.surface }]}>
            <Icon name="time-outline" size={20} color="text" />
          </View>
          <View style={styles.flex}>
            <Text variant="headline">Sıralamalar neden değişir?</Text>
            <Text variant="callout" color="textSecondary" style={styles.infoText}>
              Canlı sıralama, son 4 saatteki performansa göre şu an yayında olan en iyi satıcıları gösterir. Günlük sıralama son 24 saati, haftalık sıralama ise son 7 günü kapsar.
            </Text>
          </View>
        </View>
        <View style={styles.infoBlock}>
          <View style={[styles.infoIcon, { backgroundColor: colors.surface }]}>
            <Icon name="shield-checkmark-outline" size={20} color="text" />
          </View>
          <View style={styles.flex}>
            <Text variant="headline">Herkes için aynı</Text>
            <Text variant="callout" color="textSecondary" style={styles.infoText}>
              Sıralama Türkiye'deki tüm kullanıcılar için aynıdır; reklam ya da ücretli öne çıkarma sıralamayı etkilemez.
            </Text>
          </View>
        </View>
      </Sheet>

      <Sheet visible={pickerOpen} onClose={() => setPickerOpen(false)} title="Kategori seç" showClose height={0.75}>
        {scopes.map((s) => {
          const selected = s.id === scope;
          return (
            <PressableScale
              key={s.id}
              scaleTo={0.99}
              onPress={() => {
                haptic.tap();
                setScope(s.id);
                setPickerOpen(false);
              }}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              style={styles.pickRow}>
              {s.image ? (
                <Image source={{ uri: s.image }} style={[styles.pickThumb, { backgroundColor: colors.surface }]} contentFit="cover" cachePolicy="memory-disk" recyclingKey={s.id} />
              ) : (
                <Glyph3D name="trophy" size={38} />
              )}
              <View style={styles.flex}>
                <Text variant="body" weight={selected ? '700' : '500'} numberOfLines={1}>
                  {s.label}
                </Text>
                <Text variant="footnote" color="textSecondary">
                  {s.live ? `${s.live} canlı yayın` : 'Şu an canlı yayın yok'}
                </Text>
              </View>
              {selected ? <Icon name="checkmark" size={20} color="text" /> : null}
            </PressableScale>
          );
        })}
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  shrink: { flexShrink: 1 },
  nav: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: SCREEN_PADDING },
  circle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  hero: { paddingHorizontal: SCREEN_PADDING, paddingBottom: 14, overflow: 'visible' },
  heroImage: { position: 'absolute', right: -56, top: -6, width: 150, height: 150, borderRadius: 30, transform: [{ rotate: '12deg' }], opacity: 0.95 },
  scopeBtn: { marginTop: 2, maxWidth: '78%' },
  scopeText: { flexShrink: 1 },
  chipsWrap: { marginHorizontal: -SCREEN_PADDING, marginTop: 18 },
  chips: { paddingRight: SCREEN_PADDING },
  hint: { marginTop: 10 },
  card: {
    marginHorizontal: SCREEN_PADDING,
    minHeight: 84,
    borderRadius: radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 12,
  },
  rank: { width: 30, alignItems: 'center' },
  cardBody: { flex: 1, gap: 3 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  infoBlock: { flexDirection: 'row', gap: 12, paddingVertical: 10 },
  infoIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  infoText: { marginTop: 3 },
  pickRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  pickThumb: { width: 38, height: 38, borderRadius: 19 },
});
