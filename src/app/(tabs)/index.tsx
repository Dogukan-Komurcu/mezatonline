/**
 * Ana Sayfa (Whatnot Home feed, S11): arama + gelen kutusu/bildirim/ödüller başlığı, büyük kategori şeridi
 * (kaydırınca kompakt çipler), seçime göre 2 sütunlu canlı yayın grid'i ve arasına serpiştirilmiş bölümler.
 */
import { router, useLocalSearchParams, useScrollToTop } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View, type NativeScrollEvent, type NativeSyntheticEvent, type ViewInstance } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { openShow } from '@/components/cards/ShowCard';
import { UserRow } from '@/components/cards/UserRow';
import { Button, EmptyState, Icon, PressableScale, Text, toast } from '@/components/ui';
import { DEMO_COPY, DEMO_MODE } from '@/config/demo';
import { getCategory } from '@/data';
import { AUTH_REASONS, requireAuth, useIsGuest } from '@/features/auth/gate';
import { ProductGridRow, ShowGridRow } from '@/features/browse/grids';
import { Band, SectionTitle, useGridWidth } from '@/features/browse/ui';
import { CategoryRail, CompactRail, FOLLOWING, FOR_YOU, useRailItems } from '@/features/home/CategoryRail';
import { Coachmark, type Rect } from '@/features/home/Coachmark';
import { buildHomeFeed, type HomeRow } from '@/features/home/feed';
import { HomeHeader } from '@/features/home/HomeHeader';
import { LeaderboardCarousel } from '@/features/home/LeaderboardCarousel';
import { PromoCarousel } from '@/features/home/PromoCarousel';
import { ShowRail } from '@/features/home/ShowRail';
import { useHomeStore } from '@/features/home/store';
import { haptic } from '@/lib/haptics';
import { useAuthStore } from '@/store/auth';
import { useSettingsStore } from '@/store/settings';
import { useSocialStore } from '@/store/social';
import { radius, SCREEN_PADDING, useTheme } from '@/theme';

const NONE: string[] = [];

/** İnce demo bilgilendirme şeridi; kapatılınca bu cihazda bir daha gösterilmez */
function DemoBanner() {
  const { colors } = useTheme();
  const dismissed = useSettingsStore((s) => s.demoBannerDismissed);
  const dismiss = useSettingsStore((s) => s.dismissDemoBanner);
  if (!DEMO_MODE || dismissed) return null;
  return (
    <View style={[styles.demo, { backgroundColor: colors.surface }]}>
      <Icon name="flask-outline" size={16} color="textSecondary" />
      <Text variant="footnote" color="textSecondary" style={styles.demoText}>
        {DEMO_COPY.banner}{' '}
        <Text
          variant="footnote"
          weight="700"
          color="text"
          style={styles.underline}
          accessibilityRole="link"
          onPress={() => router.push({ pathname: '/settings/legal', params: { doc: 'demo' } })}
          suppressHighlighting>
          Ayrıntılar
        </Text>
      </Text>
      <PressableScale
        hitSlop={10}
        onPress={() => {
          haptic.tap();
          dismiss();
        }}
        accessibilityRole="button"
        accessibilityLabel="Demo bilgilendirmesini kapat">
        <Icon name="close" size={16} color="textSecondary" />
      </PressableScale>
    </View>
  );
}

function CategoryEmpty({ categoryId }: { categoryId: string }) {
  const category = getCategory(categoryId);
  const followed = useSocialStore((s) => s.followedCategoryIds.includes(categoryId));
  const toggle = useSocialStore((s) => s.toggleFollowCategory);
  if (!category) return null;
  return (
    <EmptyState
      icon="videocam-off-outline"
      title={`${category.shortName} kategorisinde şu an canlı yayın yok`}
      message="Yaklaşan yayınlara hatırlatıcı kurabilir ya da kategoriyi takip edip yeni yayınlardan haberdar olabilirsin."
      actionLabel={followed ? 'Takip ediliyor ✓' : 'Kategoriyi takip et'}
      onAction={() => {
        const was = followed;
        requireAuth(
          () => {
            // Kayıtta ilgi alanı olarak seçildiyse takibi geri alma
            if (useSocialStore.getState().followedCategoryIds.includes(categoryId) !== was) {
              if (!was) toast.success(`${category.shortName} takip ediliyor`, 'heart');
              return;
            }
            const on = toggle(categoryId);
            haptic.success();
            toast.success(on ? `${category.shortName} takip ediliyor` : 'Kategori takipten çıkarıldı', on ? 'heart' : 'heart-dislike-outline');
          },
          { reason: AUTH_REASONS.follow },
        );
      }}
      style={styles.empty}
    />
  );
}

export default function HomeScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const cardW = useGridWidth(2);
  const railItems = useRailItems();
  // Misafirin akışı hesaba bağlı ilgi alanı/takip verisi olmadan kurulur
  const guest = useIsGuest();
  const interests = useAuthStore((s) => (guest ? NONE : s.interests));
  const followingIds = useSocialStore((s) => (guest ? NONE : s.followingIds));
  const blockedIds = useSocialStore((s) => (guest ? NONE : s.blockedIds));
  const [selection, setSelection] = useState<string>(FOR_YOU);
  const [compact, setCompact] = useState(false);
  const [railH, setRailH] = useState(140);
  const [refreshing, setRefreshing] = useState(false);
  const listRef = useRef<FlatList<HomeRow>>(null);
  const scrollY = useRef(0);
  useScrollToTop(listRef);

  const rows = useMemo(() => buildHomeFeed({ selection, interests, followingIds, blockedIds }), [selection, interests, followingIds, blockedIds]);

  // ─── İlk açılış ipucu ───
  const coachDone = useHomeStore((s) => s.coachmarkDone);
  const homeHydrated = useHomeStore((s) => s.hydrated);
  const dismissCoach = useHomeStore((s) => s.dismissCoachmark);
  const [root, setRoot] = useState<ViewInstance | null>(null);
  const [target, setTarget] = useState<ViewInstance | null>(null);
  const [coach, setCoach] = useState<{ rect: Rect; height: number } | null>(null);
  const wantCoach = homeHydrated && !coachDone && selection === FOR_YOU;
  const firstShow = rows.find((r): r is Extract<HomeRow, { type: 'grid' }> => r.type === 'grid' && !!r.first)?.shows[0];

  useEffect(() => {
    if (!wantCoach || !target || !root) return;
    const t = setTimeout(() => {
      if (scrollY.current > 4) return;
      root.measureInWindow((rx, ry, _rw, rh) => {
        target.measureInWindow((x, y, w, h) => {
          if (w > 0 && h > 0) setCoach({ rect: { x: x - rx, y: y - ry, w, h }, height: rh });
        });
      });
    }, 900);
    return () => clearTimeout(t);
  }, [wantCoach, target, root]);

  const coachVisible = wantCoach && coach !== null;

  // Yalnızca geliştirme: ekran görüntüsü QA'sı (/?qa=scroll | y<offset> | bottom | following | cat_<id>, virgülle birleştirilebilir)
  const { qa } = useLocalSearchParams<{ qa?: string }>();
  useEffect(() => {
    if (!__DEV__ || !qa) return;
    dismissCoach();
    const parts = qa.split(',');
    const sel = parts.find((p) => p === 'following' || p.startsWith('cat_'));
    if (sel === 'following') setSelection(FOLLOWING);
    else if (sel) setSelection(sel.slice(4));
    const pos = parts.find((p) => p === 'scroll' || p === 'bottom' || /^y\d+$/.test(p));
    const offset = pos === 'scroll' ? 1500 : pos?.startsWith('y') ? Number(pos.slice(1)) || 0 : 0;
    if (!offset && pos !== 'bottom') return;
    const timers = [1200, 1700, 2200, 2700].map((ms) => setTimeout(() => (offset ? listRef.current?.scrollToOffset({ offset, animated: false }) : listRef.current?.scrollToEnd({ animated: false })), ms));
    return () => timers.forEach(clearTimeout);
  }, [qa, dismissCoach]);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    scrollY.current = y;
    const next = y > railH - 12;
    if (next !== compact) setCompact(next);
  };

  const onSelect = (key: string) => {
    if (key === selection) {
      listRef.current?.scrollToOffset({ offset: 0, animated: true });
      return;
    }
    setSelection(key);
    if (compact) listRef.current?.scrollToOffset({ offset: 0, animated: false });
  };

  const onRefresh = () => {
    setRefreshing(true);
    haptic.light();
    setTimeout(() => setRefreshing(false), 900);
  };

  const renderRow = ({ item, index }: { item: HomeRow; index: number }) => {
    const prev = index > 0 ? rows[index - 1] : undefined;
    const afterBand = prev?.type === 'band';
    switch (item.type) {
      case 'band':
        return <Band />;
      case 'grid':
        return (
          <View style={afterBand ? styles.afterBand : undefined}>
            <ShowGridRow shows={item.shows} width={cardW} firstRef={item.first && wantCoach ? setTarget : undefined} />
          </View>
        );
      case 'products':
        return <ProductGridRow products={item.products} width={cardW} />;
      case 'promo':
        return <PromoCarousel />;
      case 'leaderboard':
        return <LeaderboardCarousel scope={item.scope} />;
      case 'rail':
        return <ShowRail title={item.title} subtitle={item.subtitle} shows={item.shows} actionLabel={item.actionLabel} onAction={item.href ? () => router.push(item.href!) : undefined} />;
      case 'heading':
        return (
          <View style={{ paddingTop: prev?.type === 'grid' ? 4 : 18 }}>
            <SectionTitle title={item.title} subtitle={item.subtitle} actionLabel={item.actionLabel} onAction={item.href ? () => router.push(item.href!) : undefined} />
          </View>
        );
      case 'seller':
        return <UserRow user={item.seller} />;
      case 'link':
        return (
          <PressableScale scaleTo={0.98} onPress={() => router.push(item.href)} style={[styles.link, { backgroundColor: colors.surface }]} accessibilityRole="link">
            <Text variant="callout" weight="700" numberOfLines={1} style={styles.linkText}>
              {item.label}
            </Text>
            <Icon name="chevron-forward" size={16} color="text" />
          </PressableScale>
        );
      case 'empty':
        if (item.variant === 'category_empty' && item.categoryId) return <CategoryEmpty categoryId={item.categoryId} />;
        if (item.variant === 'no_follow') {
          return (
            <EmptyState
              icon="heart-outline"
              title="Henüz kimseyi takip etmiyorsun"
              message="Sevdiğin satıcıları takip et; canlıya geçtiklerinde yayınları burada seni bekliyor olacak."
              style={styles.empty}
            />
          );
        }
        return (
          <EmptyState
            icon="videocam-off-outline"
            title="Takip ettiklerin şu an canlı değil"
            message="Yaklaşan yayınlarına hatırlatıcı kurabilir ya da aşağıdan yeni satıcılar keşfedebilirsin."
            actionLabel="Sana Özel yayınlara bak"
            onAction={() => setSelection(FOR_YOU)}
            style={styles.empty}
          />
        );
      case 'end':
        return (
          <View style={styles.end}>
            <Text variant="callout" weight="700" align="center">
              Şimdilik hepsi bu kadar
            </Text>
            <Text variant="footnote" color="textSecondary" align="center">
              Yeni yayınlar için aşağı çekip yenileyebilir ya da kategorilere göz atabilirsin.
            </Text>
            <Button title="Kategorilere göz at" variant="secondary" size="sm" icon="grid-outline" onPress={() => router.navigate('/categories')} style={styles.endBtn} />
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <View ref={setRoot} collapsable={false} style={[styles.flex, { backgroundColor: colors.bg, paddingTop: insets.top }]}>
      <HomeHeader />
      <View style={styles.flex}>
        <FlatList
          ref={listRef}
          data={rows}
          keyExtractor={(r) => r.key}
          renderItem={renderRow}
          ListHeaderComponent={
            <View onLayout={(e) => setRailH(e.nativeEvent.layout.height)}>
              <DemoBanner />
              <CategoryRail items={railItems} selected={selection} onSelect={onSelect} />
            </View>
          }
          onScroll={onScroll}
          scrollEventThrottle={16}
          scrollEnabled={!coachVisible}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textSecondary} colors={[colors.text]} progressBackgroundColor={colors.card} />}
          contentContainerStyle={styles.content}
          initialNumToRender={6}
          maxToRenderPerBatch={6}
          windowSize={9}
        />
        {compact ? (
          <View style={styles.compact}>
            <CompactRail items={railItems} selected={selection} onSelect={onSelect} />
          </View>
        ) : null}
      </View>
      {coachVisible && coach ? (
        <Coachmark
          rect={coach.rect}
          containerHeight={coach.height}
          onDismiss={dismissCoach}
          onTarget={() => {
            dismissCoach();
            if (firstShow) openShow(firstShow);
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingBottom: 24 },
  compact: { position: 'absolute', top: 0, left: 0, right: 0 },
  afterBand: { paddingTop: 18 },
  empty: { paddingVertical: 36 },
  demo: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: SCREEN_PADDING, marginTop: 4, marginBottom: 8, paddingVertical: 8, paddingHorizontal: 12, borderRadius: radius.md },
  demoText: { flex: 1 },
  underline: { textDecorationLine: 'underline' },
  link: {
    marginHorizontal: SCREEN_PADDING,
    marginBottom: 18,
    height: 46,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 14,
  },
  linkText: { flexShrink: 1 },
  end: { paddingHorizontal: SCREEN_PADDING * 2, paddingTop: 28, paddingBottom: 12, gap: 6, alignItems: 'center' },
  endBtn: { marginTop: 8 },
});
