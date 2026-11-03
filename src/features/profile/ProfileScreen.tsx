/**
 * Kullanıcı / satıcı profili (Whatnot S50).
 * Kapak + başlık listeyle birlikte kayar; üst bar kapağın altına inince opaklaşır,
 * sekmeler üst barın altına yapışır (yüzen kopya ile).
 */
import * as Clipboard from 'expo-clipboard';
import { router, useIsFocused } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useRef, useState } from 'react';
import { FlatList, StyleSheet, useWindowDimensions, View, type LayoutChangeEvent } from 'react-native';
import Animated, { Extrapolation, interpolate, useAnimatedReaction, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { ProductCard } from '@/components/cards/ProductCard';
import { ShowCard } from '@/components/cards/ShowCard';
import { Divider, EmptyState, Header, IconButton, Screen, Text, toast, UnderlineTabs, useTopInset, type TabItem } from '@/components/ui';
import { FEATURES } from '@/config/demo';
import { AUTH_REASONS, requireAuth, useIsGuest } from '@/features/auth/gate';
import { GuestPrompt } from '@/features/auth/GuestPrompt';
import { APP_URL, ReportSheet, shareLink, TipSheet } from '@/features/shared/sheets';
import { getProductsByShow, getShopProducts, getShowsBySeller, getUserByUsername } from '@/data';
import { haptic } from '@/lib/haptics';
import { useMe } from '@/store/auth';
import { useInboxStore } from '@/store/inbox';
import { useOrdersStore } from '@/store/orders';
import { useSellerStore } from '@/store/seller';
import { useSocialStore } from '@/store/social';
import { SCREEN_PADDING, useTheme } from '@/theme';
import type { Product, Show, User } from '@/types';

import { CenterModal, FilterChips } from '../activity/components';
import { ProfileHeader } from './ProfileHeader';
import { MoreSheet, NotifySheet } from './ProfileSheets';
import { AboutSection, RatingSummary, ReviewCard, useSellerReviews, type ReviewView } from './sections';
import { useProfilePrefs } from './store';

type ProfileTab = 'shop' | 'shows' | 'reviews' | 'about';
type ShopFilter = 'buy_now' | 'auction' | 'sold';
type SheetKind = 'none' | 'more' | 'notify' | 'tip' | 'report' | 'block' | 'reviewReport';

type Row =
  | { kind: 'chips'; key: string }
  | { kind: 'products'; key: string; items: Product[] }
  | { kind: 'shows'; key: string; items: Show[] }
  | { kind: 'title'; key: string; title: string; subtitle?: string }
  | { kind: 'rating'; key: string }
  | { kind: 'review'; key: string; review: ReviewView }
  | { kind: 'about'; key: string }
  | { kind: 'empty'; key: string; emoji: string; title: string; message?: string; actionLabel?: string; onAction?: () => void };

const TOP_BAR = 52;
const GAP = 12;
const MODAL_SWAP_DELAY = 420;

function pairs<T>(items: T[], prefix: string): { key: string; items: T[] }[] {
  const out: { key: string; items: T[] }[] = [];
  for (let i = 0; i < items.length; i += 2) out.push({ key: `${prefix}_${i}`, items: items.slice(i, i + 2) });
  return out;
}

function dedupe(list: Product[]): Product[] {
  const seen = new Set<string>();
  return list.filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true)));
}

export function ProfileScreen({ username, initialTab }: { username: string; initialTab?: ProfileTab }) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const topInset = useTopInset();
  const { width } = useWindowDimensions();
  const focused = useIsFocused();
  const me = useMe();
  const guest = useIsGuest();
  const meRequested = username === 'me' || username.replace(/^@/, '').toLocaleLowerCase('tr-TR') === me.username.toLocaleLowerCase('tr-TR');
  // Misafirin profili yok: /user/me ya da varsayılan kullanıcı adı "kendi profilim" sayılmaz
  const isMe = meRequested && !guest;
  const other = meRequested ? undefined : getUserByUsername(username);
  const user: User | undefined = isMe ? me : other;

  const followingIds = useSocialStore((s) => s.followingIds);
  const blockedIds = useSocialStore((s) => s.blockedIds);
  const myListings = useSellerStore((s) => s.listings);
  const myShows = useSellerStore((s) => s.shows);
  const purchasesCount = useOrdersStore((s) => s.orders.length);
  const notifyMap = useProfilePrefs((s) => s.notify);
  const reviewData = useSellerReviews(user, me);

  const [tab, setTab] = useState<ProfileTab>(initialTab ?? 'shop');
  const [shopFilter, setShopFilter] = useState<ShopFilter>('buy_now');
  const [sheet, setSheet] = useState<SheetKind>('none');
  const [solidBar, setSolidBar] = useState(false);
  const listRef = useRef<FlatList<Row>>(null);

  const topBarH = topInset + TOP_BAR;
  const bannerH = Math.round(width / 3) + topInset;
  const fadeEnd = bannerH - topBarH;
  const scrollY = useSharedValue(0);
  const threshold = useSharedValue(1_000_000);
  const onScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollY.set(e.contentOffset.y);
    },
  });
  useAnimatedReaction(
    () => scrollY.get() > fadeEnd - 8,
    (cur, prev) => {
      if (cur !== prev) scheduleOnRN(setSolidBar, cur);
    },
  );
  const barBgStyle = useAnimatedStyle(() => ({ opacity: interpolate(scrollY.get(), [fadeEnd - 44, fadeEnd], [0, 1], Extrapolation.CLAMP) }));
  const floatingTabsStyle = useAnimatedStyle(() => ({ transform: [{ translateY: scrollY.get() >= threshold.get() ? 0 : -3000 }] }));

  if (!user && meRequested) {
    return (
      <Screen>
        <Header title="Profil" />
        <GuestPrompt
          icon="person-circle-outline"
          title="Profilin burada"
          message="Satıcıları takip etmek, ürün kaydetmek ve kendi profilini oluşturmak için giriş yap."
          reason={AUTH_REASONS.account}
        />
      </Screen>
    );
  }
  if (!user) {
    return (
      <Screen>
        <Header title="Profil" />
        <EmptyState
          emoji="🕵️"
          title="Kullanıcı bulunamadı"
          message={`@${username.replace(/^@/, '')} adında bir kullanıcı yok ya da hesap kapatılmış.`}
          actionLabel="Ana sayfaya dön"
          onAction={() => router.navigate('/')}
        />
      </Screen>
    );
  }

  // Misafirin sosyal durumu yok (cihazda önceki hesaptan kalan liste sayılmaz)
  const blocked = !isMe && !guest && blockedIds.includes(user.id);
  const following = !isMe && !guest && followingIds.includes(user.id);
  const followers = isMe ? me.followers : user.followers + (following ? 1 : 0);
  const followingCount = isMe ? followingIds.length : user.following;
  const notifyLevel = notifyMap[user.id] ?? 'all';

  // ── Yayınlar ve ürünler
  const shows = isMe
    ? {
        live: myShows.filter((s) => s.status === 'live'),
        upcoming: myShows.filter((s) => s.status === 'scheduled').sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt)),
        past: myShows.filter((s) => s.status === 'ended').sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt)),
      }
    : getShowsBySeller(user.id);
  const liveShow = shows.live[0];
  const nextShow = shows.upcoming[0];
  let buyNow: Product[];
  let auctions: Product[];
  let sold: Product[];
  if (isMe) {
    buyNow = myListings.filter((p) => p.format === 'buy_now' && p.sold < p.quantity);
    auctions = myListings.filter((p) => p.format === 'auction' && p.sold < p.quantity);
    sold = myListings.filter((p) => p.sold >= p.quantity);
  } else {
    const showProducts = [...shows.live, ...shows.upcoming].flatMap((s) => getProductsByShow(s.id));
    buyNow = dedupe([...getShopProducts(user.id), ...showProducts.filter((p) => p.format === 'buy_now' && p.sold < p.quantity)]);
    auctions = showProducts.filter((p) => p.format === 'auction' && p.sold < p.quantity);
    sold = shows.past.flatMap((s) => getProductsByShow(s.id)).slice(0, 24);
  }

  const isSellerProfile = user.isSeller && !blocked;
  const tabs: TabItem<ProfileTab>[] = isSellerProfile
    ? [
        { key: 'shop', label: 'Mağaza' },
        { key: 'shows', label: 'Yayınlar' },
        { key: 'reviews', label: 'Değerlendirmeler' },
        { key: 'about', label: 'Hakkında' },
      ]
    : [];
  const activeTab: ProfileTab = isSellerProfile ? tab : 'about';

  const cardW = Math.floor((width - SCREEN_PADDING * 2 - GAP) / 2);

  // ── Satırlar
  const rows: Row[] = [];
  if (blocked) {
    rows.push({
      kind: 'empty',
      key: 'blocked',
      emoji: '🚫',
      title: `@${user.username} engellendi`,
      message: 'Engel kalkana kadar bu kişi sana yazamaz, yayınlarına giremez ve mağazandan alışveriş yapamaz.',
      actionLabel: 'Engeli kaldır',
      onAction: () => {
        useSocialStore.getState().unblock(user.id);
        haptic.success();
        toast.success(`@${user.username} engeli kaldırıldı`);
      },
    });
  } else if (activeTab === 'shop') {
    rows.push({ kind: 'chips', key: 'chips' });
    const list = shopFilter === 'buy_now' ? buyNow : shopFilter === 'auction' ? auctions : sold;
    if (list.length) pairs(list, `p_${shopFilter}`).forEach((p) => rows.push({ kind: 'products', key: p.key, items: p.items }));
    else
      rows.push({
        kind: 'empty',
        key: 'shop_empty',
        emoji: shopFilter === 'sold' ? '🏷️' : '🛍️',
        title: shopFilter === 'buy_now' ? 'Hemen Al ürünü yok' : shopFilter === 'auction' ? 'Yaklaşan açık artırma yok' : 'Henüz satılan ürün yok',
        message: isMe ? 'Mağazana ürün ekleyerek satışa başlayabilirsin.' : 'Satıcıyı takip et; yeni ürün eklediğinde ve canlı yayına başladığında haber verelim.',
        actionLabel: isMe ? 'Ürün ekle' : undefined,
        onAction: isMe ? () => router.push('/seller/listing') : undefined,
      });
  } else if (activeTab === 'shows') {
    const total = shows.live.length + shows.upcoming.length + shows.past.length;
    if (shows.live.length) {
      rows.push({ kind: 'title', key: 't_live', title: 'Şu an canlı' });
      pairs(shows.live, 's_live').forEach((p) => rows.push({ kind: 'shows', key: p.key, items: p.items }));
    }
    if (shows.upcoming.length) {
      rows.push({ kind: 'title', key: 't_up', title: `Yaklaşan yayınlar (${shows.upcoming.length})`, subtitle: 'Kaydet simgesiyle hatırlatıcı kur' });
      pairs(shows.upcoming, 's_up').forEach((p) => rows.push({ kind: 'shows', key: p.key, items: p.items }));
    }
    if (shows.past.length) {
      rows.push({ kind: 'title', key: 't_past', title: 'Geçmiş yayınlar' });
      pairs(shows.past, 's_past').forEach((p) => rows.push({ kind: 'shows', key: p.key, items: p.items }));
    }
    if (!total)
      rows.push({
        kind: 'empty',
        key: 'shows_empty',
        emoji: '📺',
        title: 'Henüz yayın yok',
        message: isMe ? 'İlk canlı yayınını planla, takipçilerine haber verelim.' : 'Takip et; yayın planladığında ilk sen öğren.',
        actionLabel: isMe ? 'Yayın planla' : undefined,
        onAction: isMe ? () => router.push('/seller/schedule') : undefined,
      });
  } else if (activeTab === 'reviews') {
    if (reviewData.reviews.length) {
      rows.push({ kind: 'rating', key: 'rating' });
      rows.push({ kind: 'title', key: 't_reviews', title: `Değerlendirmeler (${reviewData.reviews.length})`, subtitle: 'Yorum bırakılmış puanlar · yeniden eskiye' });
      reviewData.reviews.forEach((r) => rows.push({ kind: 'review', key: r.id, review: r }));
    } else
      rows.push({
        kind: 'empty',
        key: 'reviews_empty',
        emoji: '⭐',
        title: 'Henüz değerlendirme yok',
        message: isMe ? 'Alıcıların teslimattan sonra seni değerlendirebilir.' : 'Bu satıcıdan alışveriş yapan ilk kişilerden biri ol.',
      });
  } else {
    rows.push({ kind: 'about', key: 'about' });
    if (isMe && !user.isSeller)
      rows.push({
        kind: 'empty',
        key: 'become_seller',
        emoji: '🚀',
        title: 'Mezatonline’da satış yap',
        message: 'Kendi canlı yayınını aç, ürünlerini takipçilerine mezatla sat. İlk ay satış komisyonu %0.',
        actionLabel: 'Satıcı ol',
        onAction: () => router.push('/seller/apply'),
      });
  }

  // ── Eylemler
  const share = () =>
    shareLink({
      title: `${user.displayName} (@${user.username}) · Mezatonline`,
      path: `/user/${user.username}`,
      message: `${user.displayName} Mezatonline’da! ${user.isSeller ? 'Canlı yayınlarını kaçırma 👇' : 'Beni takip et 👇'}`,
    });
  const copyLink = async () => {
    try {
      await Clipboard.setStringAsync(`${APP_URL}/user/${user.username}`);
      haptic.success();
      toast.success('Profil bağlantısı kopyalandı', 'link');
    } catch {
      toast.error('Kopyalanamadı');
    }
  };
  const message = () =>
    requireAuth(
      () => {
        const conv = useInboxStore.getState().ensureConversation(user.id);
        router.push(`/inbox/${conv.id}`);
      },
      { reason: AUTH_REASONS.message },
    );
  const openReport = (kind: 'report' | 'reviewReport') => requireAuth(() => setSheet(kind), { reason: AUTH_REASONS.report });
  const swapTo = (next: SheetKind, after?: () => void) => {
    setSheet('none');
    setTimeout(() => {
      if (after) after();
      else setSheet(next);
    }, MODAL_SWAP_DELAY);
  };
  const changeTab = (t: ProfileTab) => {
    setTab(t);
    const th = threshold.get();
    if (scrollY.get() > th) listRef.current?.scrollToOffset({ offset: th, animated: false });
  };
  const showReviews = () => {
    setTab('reviews');
    const th = threshold.get();
    if (th < 1_000_000) setTimeout(() => listRef.current?.scrollToOffset({ offset: th, animated: true }), 60);
  };
  const onTabsLayout = (e: LayoutChangeEvent) => {
    threshold.set(Math.max(0, e.nativeEvent.layout.y - topBarH));
  };
  const confirmBlock = () => {
    useSocialStore.getState().block(user.id);
    haptic.warning();
    toast(`@${user.username} engellendi`, 'ban');
    setSheet('none');
  };

  const shopChips: { key: ShopFilter; label: string; count: number }[] = [
    { key: 'buy_now', label: 'Hemen Al', count: buyNow.length },
    { key: 'auction', label: 'Açık Artırma', count: auctions.length },
    { key: 'sold', label: 'Satılanlar', count: sold.length },
  ];

  const tabsEl = tabs.length ? <UnderlineTabs tabs={tabs} value={activeTab} onChange={changeTab} /> : null;

  const header = (
    <View>
      <ProfileHeader
        user={user}
        isMe={isMe}
        liveShow={blocked ? undefined : liveShow}
        nextShow={blocked ? undefined : nextShow}
        followers={followers}
        following={followingCount}
        reviewTotal={reviewData.total}
        rating={reviewData.average || user.rating}
        purchases={isMe ? purchasesCount : undefined}
        bannerH={bannerH}
        scrollY={scrollY}
        blocked={blocked}
        onRatingPress={showReviews}
        onMessage={message}
        onTip={FEATURES.tips ? () => requireAuth(() => setSheet('tip'), { reason: AUTH_REASONS.tip }) : undefined}
        onShare={share}
      />
      <View onLayout={onTabsLayout} style={styles.tabsWrap}>
        {tabsEl ?? (blocked ? null : <Divider style={styles.headerDivider} />)}
      </View>
    </View>
  );

  const renderRow = ({ item }: { item: Row }) => {
    switch (item.kind) {
      case 'chips':
        return (
          <View style={styles.chips}>
            <FilterChips options={shopChips} value={shopFilter} onChange={setShopFilter} />
          </View>
        );
      case 'products':
        return (
          <View style={styles.gridRow}>
            {item.items.map((p) => (
              <ProductCard key={p.id} product={p} width={cardW} />
            ))}
          </View>
        );
      case 'shows':
        return (
          <View style={styles.gridRow}>
            {item.items.map((s) => (
              <ShowCard key={s.id} show={s} width={cardW} hideSeller />
            ))}
          </View>
        );
      case 'title':
        return (
          <View style={styles.title}>
            <Text variant="title3">{item.title}</Text>
            {item.subtitle ? (
              <Text variant="footnote" color="textSecondary">
                {item.subtitle}
              </Text>
            ) : null}
          </View>
        );
      case 'rating':
        return <RatingSummary average={reviewData.average || user.rating} total={reviewData.total} counts={reviewData.counts} />;
      case 'review':
        return (
          <View>
            <ReviewCard review={item.review} onMore={() => openReport('reviewReport')} />
            <Divider inset={SCREEN_PADDING} />
          </View>
        );
      case 'about':
        return (
          <AboutSection
            user={user}
            followers={followers}
            following={followingCount}
            purchases={isMe ? purchasesCount : undefined}
            nextShow={nextShow}
            onReport={isMe ? undefined : () => openReport('report')}
          />
        );
      case 'empty':
        return <EmptyState emoji={item.emoji} title={item.title} message={item.message} actionLabel={item.actionLabel} onAction={item.onAction} style={styles.empty} />;
    }
  };

  const barIconsLight = !solidBar;
  const rightButtons = (variant: 'glass' | 'plain') => (
    <View style={styles.barRight}>
      {following ? (
        <IconButton
          name={notifyLevel === 'all' ? 'notifications' : 'notifications-off-outline'}
          variant={variant}
          size={36}
          onPress={() => setSheet('notify')}
          accessibilityLabel="Bildirim tercihi"
        />
      ) : null}
      <IconButton name="share-outline" variant={variant} size={36} onPress={share} accessibilityLabel="Paylaş" />
      <IconButton name="ellipsis-horizontal" variant={variant} size={36} onPress={() => setSheet('more')} accessibilityLabel="Daha fazla" />
    </View>
  );
  const back = (variant: 'glass' | 'plain') => (
    <IconButton name="chevron-back" variant={variant} size={36} onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} accessibilityLabel="Geri" />
  );

  return (
    <Screen>
      {focused ? <StatusBar style={barIconsLight ? 'light' : isDark ? 'light' : 'dark'} /> : null}
      <Animated.FlatList
        ref={listRef}
        data={rows}
        keyExtractor={(r: Row) => r.key}
        renderItem={renderRow}
        ListHeaderComponent={header}
        ListFooterComponent={<View style={{ height: insets.bottom + 32 }} />}
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        initialNumToRender={8}
        windowSize={9}
      />

      {/* Yüzen sekmeler (üst barın altına yapışır) */}
      {tabsEl ? (
        <Animated.View style={[styles.floatingTabs, { top: topBarH, backgroundColor: colors.bg }, floatingTabsStyle]} pointerEvents="box-none">
          {tabsEl}
        </Animated.View>
      ) : null}

      {/* Üst bar: kapak üstünde cam butonlar, kaydırınca opak arka plan + kullanıcı adı */}
      <View style={[styles.topBar, { height: topBarH, paddingTop: topInset }]} pointerEvents="box-none">
        <View style={styles.barRow} pointerEvents="box-none">
          {back('glass')}
          <View style={styles.flex} />
          {rightButtons('glass')}
        </View>
      </View>
      <Animated.View
        style={[styles.topBar, { height: topBarH, paddingTop: topInset, backgroundColor: colors.bg, borderBottomColor: colors.border }, styles.topBarSolid, barBgStyle]}
        pointerEvents={solidBar ? 'auto' : 'none'}>
        <View style={styles.barRow}>
          {back('plain')}
          <View style={styles.barTitle}>
            <Text variant="headline" weight="700" numberOfLines={1} align="center">
              {user.username}
            </Text>
          </View>
          {rightButtons('plain')}
        </View>
      </Animated.View>

      <MoreSheet
        visible={sheet === 'more'}
        onClose={() => setSheet('none')}
        user={user}
        isMe={isMe}
        blocked={blocked}
        onShare={() => swapTo('none', share)}
        onCopy={() => {
          setSheet('none');
          copyLink();
        }}
        onEdit={() => swapTo('none', () => router.push('/settings/profile'))}
        onBlock={() => {
          if (blocked) {
            useSocialStore.getState().unblock(user.id);
            haptic.success();
            toast.success(`@${user.username} engeli kaldırıldı`);
            setSheet('none');
          } else swapTo('none', () => requireAuth(() => setSheet('block'), { reason: AUTH_REASONS.block }));
        }}
        onReport={() => swapTo('none', () => openReport('report'))}
      />
      {following ? (
        <NotifySheet
          visible={sheet === 'notify'}
          onClose={() => setSheet('none')}
          user={user}
          value={notifyLevel}
          onChange={(v) => {
            useProfilePrefs.getState().setNotify(user.id, v);
            haptic.success();
            toast.success(v === 'all' ? `@${user.username} için tüm bildirimler açık 🔔` : `@${user.username} bildirimleri kapatıldı`, v === 'all' ? 'notifications' : 'notifications-off');
            setSheet('none');
          }}
        />
      ) : null}
      {FEATURES.tips && user.isSeller && !isMe ? <TipSheet visible={sheet === 'tip'} onClose={() => setSheet('none')} seller={user} /> : null}
      <ReportSheet visible={sheet === 'report'} onClose={() => setSheet('none')} subject={`@${user.username}`} />
      <ReportSheet visible={sheet === 'reviewReport'} onClose={() => setSheet('none')} subject="Değerlendirme" />
      <CenterModal
        visible={sheet === 'block'}
        onClose={() => setSheet('none')}
        icon="ban-outline"
        iconTone="danger"
        title={`@${user.username} engellensin mi?`}
        message="Engel sessizce uygulanır; karşı tarafa bildirim gitmez. Bundan sonra bu kişi profilini açamaz, sana yazamaz, yayınlarına giremez ve mağazandan alışveriş yapamaz. Engeli Hesap → Engellenen kullanıcılar listesinden kaldırabilirsin."
        actions={[
          { label: 'Engelle', variant: 'danger', onPress: confirmBlock },
          { label: 'Vazgeç', variant: 'outline', onPress: () => setSheet('none') },
        ]}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  tabsWrap: { marginTop: 14 },
  headerDivider: { marginTop: 4 },
  chips: { paddingTop: 2, paddingBottom: 4 },
  gridRow: { flexDirection: 'row', gap: GAP, paddingHorizontal: SCREEN_PADDING, marginBottom: 20 },
  title: { paddingHorizontal: SCREEN_PADDING, paddingTop: 18, paddingBottom: 12, gap: 2 },
  empty: { paddingVertical: 40 },
  floatingTabs: { position: 'absolute', left: 0, right: 0, zIndex: 5 },
  topBar: { position: 'absolute', left: 0, right: 0, top: 0, zIndex: 10 },
  topBarSolid: { borderBottomWidth: StyleSheet.hairlineWidth },
  barRow: { height: TOP_BAR, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, gap: 4 },
  barTitle: { flex: 1, paddingHorizontal: 4 },
  barRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
