/**
 * S40 — Yaklaşan yayın sayfası.
 * Canlıysa doğrudan canlı yayına yönlendirir; bittiyse "Yayın sona erdi" + satıcının sıradaki yayını.
 */
import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, router, useIsFocused, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { FlatList, ScrollView, StyleSheet, useWindowDimensions, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FollowButton } from '@/components/cards/UserRow';
import { ShowCard } from '@/components/cards/ShowCard';
import { Avatar, Button, EmptyState, Header, Icon, IconButton, ListRow, PressableScale, Screen, SectionGap, Sheet, Text, toast, UnderlineTabs, type IconName } from '@/components/ui';
import { getCategory, getLiveShowOf, getShowsBySeller, getSubcategory, getUpcomingShows } from '@/data';
import { BuyerProtectionSheet } from '@/features/commerce/infoSheets';
import { InfoLine } from '@/features/commerce/components';
import { useNow, useSellerOf, useShowById, useShowProducts } from '@/features/commerce/hooks';
import { PreBidSheet } from '@/features/commerce/PreBidSheet';
import { ShowItemRow } from '@/features/commerce/ShowItemRow';
import { ablativeSuffix, countdownClock, countdownParts } from '@/features/commerce/utils';
import { APP_URL, ReportSheet, shareLink } from '@/features/shared/sheets';
import { formatCompact, formatDate, formatRating, formatShowTime, formatTimeUntil, formatTRY } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { ME_ID } from '@/store/auth';
import { completeChallenge } from '@/store/rewards';
import { useSocialStore } from '@/store/social';
import { liveColors, radius, SCREEN_PADDING, useTheme } from '@/theme';
import type { Product, Show } from '@/types';

type TabKey = 'auction' | 'buy_now' | 'giveaway';

const HIGHLIGHT_META: Record<string, { label: string; icon: IconName }> = {
  '₺1 Başlangıç': { label: '₺1 Başlangıç', icon: 'flash' },
  Çekiliş: { label: 'Çekiliş', icon: 'gift' },
  'Ücretsiz Kargo': { label: 'Ücretsiz Kargo', icon: 'car' },
  'Orijinal Garantili': { label: 'Orijinal Garantili', icon: 'shield-checkmark' },
  'Hızlı Kargo': { label: 'Hızlı Kargo', icon: 'rocket' },
  'Sudden Death': { label: 'Ani Bitiş 💀', icon: 'skull' },
  'Flaş İndirim': { label: 'Flaş İndirim', icon: 'flash-outline' },
  'Yeni Satıcı': { label: 'Yeni Satıcı', icon: 'sparkles' },
};

export default function ShowScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height: screenH } = useWindowDimensions();
  const focused = useIsFocused();
  const show = useShowById(id);
  const seller = useSellerOf(show?.sellerId);
  const products = useShowProducts(show);
  const reminded = useSocialStore((s) => !!show && s.remindedShowIds.includes(show.id));
  const toggleReminder = useSocialStore((s) => s.toggleReminder);
  const [tab, setTab] = useState<TabKey>('auction');
  const [preBidFor, setPreBidFor] = useState<Product | undefined>();
  const [preBidOpen, setPreBidOpen] = useState(false);
  const [descOpen, setDescOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [protectionOpen, setProtectionOpen] = useState(false);
  const [overHero, setOverHero] = useState(true);

  if (!show) {
    return (
      <Screen>
        <Header title="Yayın" />
        <EmptyState icon="videocam-off-outline" title="Yayın bulunamadı" message="Bu yayın kaldırılmış ya da bağlantı hatalı olabilir." actionLabel="Ana sayfaya dön" onAction={() => router.replace('/')} />
      </Screen>
    );
  }
  if (show.status === 'live') return <Redirect href={`/live/${show.id}`} />;

  const ended = show.status === 'ended';
  const heroH = Math.round(Math.min(width * 1.22, screenH * 0.6));
  const category = getCategory(show.categoryId);
  const subNames = show.tags.map((t) => getSubcategory(show.categoryId, t)?.name).filter(Boolean) as string[];
  const startAt = new Date(show.scheduledAt).getTime();
  const savedCount = show.savedCount + (reminded ? 1 : 0);
  const sellerLive = seller ? getLiveShowOf(seller.id) : undefined;
  const sellerShows = seller ? getShowsBySeller(seller.id) : { live: [], upcoming: [], past: [] };
  const otherUpcoming = sellerShows.upcoming.filter((s) => s.id !== show.id);
  const nextShow = otherUpcoming[0];
  const similar = getUpcomingShows({ categoryId: show.categoryId }).filter((s) => s.sellerId !== show.sellerId).slice(0, 10);

  const auctions = products.filter((p) => p.format === 'auction');
  const buyNow = products.filter((p) => p.format === 'buy_now');
  const giveaways = products.filter((p) => p.format === 'giveaway');
  const giveawayTotal = Math.max(show.giveawayCount, giveaways.length);
  const tabs = [
    { key: 'auction' as const, label: `Açık Artırma (${auctions.length})` },
    { key: 'buy_now' as const, label: `Hemen Al (${buyNow.length})` },
    { key: 'giveaway' as const, label: `Çekiliş (${giveawayTotal})` },
  ];
  const listed = tab === 'auction' ? auctions : tab === 'buy_now' ? buyNow : giveaways;

  const shippingLine = `Bu yayında aldıkların tek pakette gönderilir · ${formatTRY(show.shippingCost)}'${ablativeSuffix(show.shippingCost)} başlayan kargo${
    show.freeShippingThreshold ? ` · ${formatTRY(show.freeShippingThreshold)} ve üzeri ücretsiz` : ''
  }`;

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const over = e.nativeEvent.contentOffset.y < heroH - insets.top - 40;
    if (over !== overHero) setOverHero(over);
  };

  const remind = (target: Show) => {
    const on = toggleReminder(target.id);
    if (on) {
      haptic.success();
      const pts = completeChallenge('save_show');
      toast.success(`Hatırlatıcı kuruldu 🔔 Yayın başlayınca haber vereceğiz${pts ? ` · +${pts} puan` : ''}`, 'notifications');
    } else {
      haptic.light();
      toast('Hatırlatıcı kaldırıldı', 'notifications-off');
    }
  };

  const share = () =>
    shareLink({
      title: show.title,
      path: `/show/${show.id}`,
      message: `${seller ? `@${seller.username} ` : ''}${formatShowTime(show.scheduledAt)} Mezatonline'da canlı yayında: ${show.title}`,
    });

  const openPreBid = (p: Product) => {
    if (p.sellerId === ME_ID) {
      toast.error('Kendi ürününe teklif veremezsin');
      return;
    }
    haptic.tap();
    setPreBidFor(p);
    setPreBidOpen(true);
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      {focused && overHero ? <StatusBar style="light" /> : null}
      <ScrollView onScroll={onScroll} scrollEventThrottle={32} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}>
        {/* ─── Kapak ─── */}
        <View style={[styles.hero, { height: heroH, backgroundColor: colors.skeleton }]}>
          <Image source={{ uri: show.coverImage }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" transition={200} />
          <LinearGradient colors={[liveColors.glassStrong, 'transparent']} style={styles.heroTop} pointerEvents="none" />
          <LinearGradient colors={['transparent', liveColors.glassStrong, liveColors.panel]} locations={[0.3, 0.75, 1]} style={StyleSheet.absoluteFill} pointerEvents="none" />
          {ended ? <View style={[StyleSheet.absoluteFill, styles.endedDim]} pointerEvents="none" /> : null}
          <View style={styles.heroBottom}>
            <View style={styles.badgeRow}>
              <View style={styles.dateBadge}>
                <Icon name={ended ? 'checkmark-done' : 'calendar'} size={14} color={liveColors.primary} />
                <Text variant="footnote" weight="800" color={liveColors.text}>
                  {ended ? formatDate(show.scheduledAt) : formatShowTime(show.scheduledAt)}
                </Text>
              </View>
              {category ? (
                <View style={styles.catBadge}>
                  <Text variant="footnote" weight="700" color={liveColors.text}>
                    {category.emoji} {category.shortName}
                  </Text>
                </View>
              ) : null}
            </View>
            {ended ? (
              <View style={styles.countCard}>
                <Text variant="title2" color={liveColors.text}>
                  Yayın sona erdi
                </Text>
                <Text variant="footnote" color={liveColors.textSecondary}>
                  {show.endedAt ? `${formatShowTime(show.scheduledAt)} başladı · ${Math.max(1, Math.round((new Date(show.endedAt).getTime() - startAt) / 3_600_000))} saat sürdü` : 'Bu yayını kaçırdın'}
                </Text>
              </View>
            ) : (
              <ShowCountdown startAt={startAt} />
            )}
          </View>
        </View>

        {/* ─── Satıcı ─── */}
        {seller ? (
          <PressableScale scaleTo={0.99} onPress={() => (sellerLive ? router.push(`/live/${sellerLive.id}`) : router.push(`/user/${seller.username}`))} style={styles.sellerRow}>
            <Avatar uri={seller.avatar} name={seller.username} size={46} live={!!sellerLive} verified={seller.badges.includes('verified')} />
            <View style={styles.flexGap}>
              <View style={styles.nameRow}>
                <Text variant="headline" numberOfLines={1} style={styles.shrink}>
                  {seller.username}
                </Text>
                {seller.badges.includes('top_seller') ? <Icon name="ribbon" size={15} color="warning" /> : null}
              </View>
              <Text variant="footnote" color="textSecondary" numberOfLines={1}>
                ★ {formatRating(seller.rating || 5)} · {formatCompact(seller.followers)} takipçi{sellerLive ? ' · Şu an canlı' : ''}
              </Text>
            </View>
            <FollowButton user={seller} />
          </PressableScale>
        ) : null}

        {/* ─── Başlık + açıklama ─── */}
        <View style={styles.block}>
          <Text variant="title2">{show.title}</Text>
          {category ? (
            <Text variant="subhead" numberOfLines={1}>
              <Text variant="subhead" weight="700" color="accent" onPress={() => router.push(`/category/${category.id}`)} suppressHighlighting>
                {category.name}
              </Text>
              <Text variant="subhead" color="textSecondary">
                {subNames.length ? ` · ${subNames.join(', ')}` : ''}
              </Text>
            </Text>
          ) : null}
          {show.highlights.length ? (
            <View style={styles.chips}>
              {show.highlights.map((h) => {
                const meta = HIGHLIGHT_META[h] ?? { label: h, icon: 'star' as IconName };
                return (
                  <View key={h} style={[styles.chip, { backgroundColor: colors.surface }]}>
                    <Icon name={meta.icon} size={13} color="text" />
                    <Text variant="footnote" weight="700">
                      {meta.label}
                    </Text>
                  </View>
                );
              })}
            </View>
          ) : null}
          {show.description ? (
            <Text variant="callout" color="textSecondary" numberOfLines={descOpen ? undefined : 3} onPress={() => setDescOpen((v) => !v)} suppressHighlighting>
              {show.description}
            </Text>
          ) : null}
          {show.description && show.description.length > 120 ? (
            <Text variant="subhead" weight="700" color="accent" onPress={() => setDescOpen((v) => !v)} suppressHighlighting>
              {descOpen ? 'Daha az göster' : 'Devamını gör'}
            </Text>
          ) : null}
          <View style={styles.statsRow}>
            <Stat icon="bookmark" value={formatCompact(savedCount)} label="hatırlatıcı" />
            <Stat icon="pricetags" value={String(products.length)} label="ürün" />
            <Stat icon="gift" value={String(giveawayTotal)} label="çekiliş" />
          </View>
        </View>

        {/* ─── Bilgi satırları ─── */}
        <View style={styles.infoBlock}>
          <InfoLine icon="cube-outline" title="Kargo" subtitle={shippingLine} />
          {giveawayTotal > 0 && !ended ? <InfoLine icon="gift-outline" title={`${giveawayTotal} çekiliş yapılacak`} subtitle="Yayında ol, tek dokunuşla katıl ve ücretsiz kazan." /> : null}
          <InfoLine icon="shield-checkmark-outline" title="Alıcı Koruması" subtitle="Her alışverişin güvence altında" onPress={() => setProtectionOpen(true)} />
        </View>

        <SectionGap />

        {/* ─── Satıcının sıradaki yayını (bitmiş yayın) ─── */}
        {ended ? (
          <View style={styles.block}>
            <Text variant="title3">Satıcının sıradaki yayını</Text>
            {nextShow ? (
              <NextShowCard show={nextShow} />
            ) : (
              <View style={[styles.nextEmpty, { backgroundColor: colors.surface }]}>
                <Text variant="callout" color="textSecondary">
                  Satıcının planlanmış yeni bir yayını yok. Takip edersen yayına başladığında haber veririz.
                </Text>
                {seller ? <Button title="Satıcının profili" variant="secondary" size="sm" onPress={() => router.push(`/user/${seller.username}`)} /> : null}
              </View>
            )}
          </View>
        ) : null}

        {/* ─── Ürünler ─── */}
        <View style={styles.listHeader}>
          <Text variant="title3">{ended ? 'Bu yayında satılanlar' : 'Yayın ürünleri'}</Text>
          {!ended && tab === 'auction' && auctions.length ? (
            <Text variant="footnote" color="textSecondary">
              Yayın başlamadan ön teklif vererek öne geç
            </Text>
          ) : null}
        </View>
        <UnderlineTabs tabs={tabs} value={tab} onChange={setTab} />
        <View style={styles.list}>
          {tab === 'giveaway' && giveaways.length === 0 ? (
            giveawayTotal > 0 ? (
              <View style={styles.giveawayWrap}>
                {Array.from({ length: Math.min(giveawayTotal, 6) }, (_, i) => (
                  <View key={i} style={[styles.giveawayRow, { borderColor: colors.border }]}>
                    <View style={[styles.giveawayIcon, { backgroundColor: colors.primary }]}>
                      <Icon name="gift" size={24} color={colors.onPrimary} />
                    </View>
                    <View style={styles.flexGap}>
                      <Text variant="subhead" weight="700">
                        Sürpriz çekiliş #{i + 1}
                      </Text>
                      <Text variant="footnote" color="textSecondary">
                        {ended ? 'Çekiliş tamamlandı' : 'Ödül yayında açıklanacak · Ücretsiz katılım'}
                      </Text>
                    </View>
                    {ended ? null : <Icon name="lock-closed-outline" size={18} color="textTertiary" />}
                  </View>
                ))}
                {!ended ? (
                  <Text variant="footnote" color="textSecondary" style={styles.giveawayNote}>
                    Çekilişlere yayın sırasında katılabilirsin. Katılmak için yayında olman ve kayıtlı bir adres ile ödeme yöntemin olması gerekir.
                  </Text>
                ) : null}
              </View>
            ) : (
              <EmptyState icon="gift-outline" title="Bu yayında çekiliş yok" message="Satıcı yayın sırasında sürpriz çekiliş başlatırsa bildirim alırsın." />
            )
          ) : listed.length ? (
            listed.map((p) => <ShowItemRow key={p.id} product={p} ended={ended} onPreBid={ended ? undefined : openPreBid} />)
          ) : (
            <EmptyState
              icon={tab === 'auction' ? 'hammer-outline' : 'bag-handle-outline'}
              title={tab === 'auction' ? 'Henüz açık artırma ürünü yok' : 'Henüz Hemen Al ürünü yok'}
              message="Satıcı yayın öncesinde yeni ürünler ekleyebilir."
            />
          )}
        </View>

        {/* ─── Satıcının diğer yayınları ─── */}
        {!ended && otherUpcoming.length ? (
          <View style={styles.carousel}>
            <Text variant="title3" style={styles.carouselTitle}>
              Satıcının diğer yayınları
            </Text>
            <FlatList
              horizontal
              data={otherUpcoming}
              keyExtractor={(s) => s.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.carouselContent}
              renderItem={({ item }) => <ShowCard show={item} width={148} hideSeller />}
            />
          </View>
        ) : null}

        {similar.length ? (
          <View style={styles.carousel}>
            <Text variant="title3" style={styles.carouselTitle}>
              {category ? `${category.shortName} kategorisinde yaklaşan yayınlar` : 'Yaklaşan yayınlar'}
            </Text>
            <FlatList
              horizontal
              data={similar}
              keyExtractor={(s) => s.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.carouselContent}
              renderItem={({ item }) => <ShowCard show={item} width={148} />}
            />
          </View>
        ) : null}

        <Text variant="footnote" color="textTertiary" align="center" style={styles.report} onPress={() => setReportOpen(true)} suppressHighlighting>
          Bu yayını şikayet et
        </Text>
      </ScrollView>

      {/* ─── Üst çubuk ─── */}
      <View style={[styles.topBar, { paddingTop: insets.top + 4 }]} pointerEvents="box-none">
        {!overHero ? (
          <Animated.View entering={FadeIn.duration(160)} exiting={FadeOut.duration(160)} style={[StyleSheet.absoluteFill, { backgroundColor: colors.bg, borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth }]} />
        ) : null}
        <IconButton name="chevron-back" variant={overHero ? 'glass' : 'plain'} size={38} onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} accessibilityLabel="Geri" />
        <View style={styles.topTitle} pointerEvents="none">
          {!overHero ? (
            <Animated.View entering={FadeIn.duration(160)}>
              <Text variant="headline" weight="700" numberOfLines={1} align="center">
                {seller?.username ?? 'Yayın'}
              </Text>
              <Text variant="caption" color="textSecondary" weight="500" numberOfLines={1} align="center">
                {ended ? 'Yayın sona erdi' : formatShowTime(show.scheduledAt)}
              </Text>
            </Animated.View>
          ) : null}
        </View>
        <View style={styles.topRight}>
          <IconButton name="share-outline" variant={overHero ? 'glass' : 'plain'} size={38} onPress={share} accessibilityLabel="Paylaş" />
          <IconButton name="ellipsis-horizontal" variant={overHero ? 'glass' : 'plain'} size={38} onPress={() => setMoreOpen(true)} accessibilityLabel="Diğer" />
        </View>
      </View>

      {/* ─── Alt çubuk ─── */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 12), backgroundColor: colors.bg, borderTopColor: colors.border }]}>
        {ended ? (
          nextShow ? (
            <ReminderButton show={nextShow} onPress={() => remind(nextShow)} label="Sıradaki yayını hatırlat" />
          ) : (
            <Button title="Satıcının mağazasına git" icon="storefront-outline" size="lg" fullWidth onPress={() => seller && router.push(`/user/${seller.username}`)} />
          )
        ) : (
          <View style={styles.bottomRow}>
            <IconButton name="share-outline" variant="surface" size={52} onPress={share} accessibilityLabel="Paylaş" />
            <View style={styles.flex}>
              <ReminderButton show={show} onPress={() => remind(show)} count={savedCount} />
            </View>
          </View>
        )}
      </View>

      <PreBidSheet visible={preBidOpen} onClose={() => setPreBidOpen(false)} product={preBidFor} show={show} />
      <BuyerProtectionSheet visible={protectionOpen} onClose={() => setProtectionOpen(false)} />
      <ReportSheet visible={reportOpen} onClose={() => setReportOpen(false)} subject={`Yayın: ${show.title}`} />
      <Sheet visible={moreOpen} onClose={() => setMoreOpen(false)} title="Seçenekler">
        <ListRow
          icon="share-outline"
          title="Yayını paylaş"
          onPress={() => {
            setMoreOpen(false);
            setTimeout(share, 250);
          }}
          style={styles.sheetRow}
        />
        <ListRow
          icon="link-outline"
          title="Bağlantıyı kopyala"
          onPress={() => {
            Clipboard.setStringAsync(`${APP_URL}/show/${show.id}`).catch(() => {});
            haptic.success();
            toast.success('Bağlantı kopyalandı', 'copy');
            setMoreOpen(false);
          }}
          style={styles.sheetRow}
        />
        {seller ? (
          <ListRow
            icon="person-circle-outline"
            title="Satıcının profili"
            onPress={() => {
              setMoreOpen(false);
              router.push(`/user/${seller.username}`);
            }}
            style={styles.sheetRow}
          />
        ) : null}
        {!ended ? (
          <ListRow
            icon={reminded ? 'notifications-off-outline' : 'notifications-outline'}
            title={reminded ? 'Hatırlatıcıyı kaldır' : 'Hatırlatıcı kur'}
            onPress={() => {
              setMoreOpen(false);
              remind(show);
            }}
            style={styles.sheetRow}
          />
        ) : null}
        <ListRow
          icon="flag-outline"
          title="Yayını şikayet et"
          destructive
          onPress={() => {
            setMoreOpen(false);
            setTimeout(() => setReportOpen(true), 250);
          }}
          style={styles.sheetRow}
        />
      </Sheet>
    </View>
  );
}

/** Saniyede bir güncellenen geri sayım kartı (sayfanın geri kalanı yeniden çizilmez) */
function ShowCountdown({ startAt }: { startAt: number }) {
  const now = useNow(1000);
  const parts = countdownParts(startAt, now);
  const soon = parts.total <= 0;
  return (
    <Animated.View entering={FadeIn.duration(300)} style={styles.countCard}>
      <Text variant="footnote" weight="600" color={liveColors.textSecondary}>
        {soon ? 'Satıcı yayını başlatmak üzere' : 'Yayının başlamasına'}
      </Text>
      <Text style={styles.countText} color={liveColors.primary} tabular>
        {soon ? 'Birazdan' : countdownClock(startAt, now)}
      </Text>
      {!soon ? (
        <Text variant="footnote" color={liveColors.textSecondary}>
          {parts.total < 60 ? 'Birkaç saniye içinde başlıyor' : `${formatTimeUntil(startAt, now)} sonra başlıyor`}
        </Text>
      ) : null}
    </Animated.View>
  );
}

function ReminderButton({ show, onPress, count, label }: { show: Show; onPress: () => void; count?: number; label?: string }) {
  const reminded = useSocialStore((s) => s.remindedShowIds.includes(show.id));
  return (
    <Button
      title={reminded ? 'Hatırlatıcı kuruldu' : (label ?? 'Hatırlat 🔔')}
      subtitle={count !== undefined ? `${formatCompact(count)} kişi hatırlatıcı kurdu` : formatShowTime(show.scheduledAt)}
      icon={reminded ? 'checkmark-circle' : undefined}
      variant={reminded ? 'secondary' : 'primary'}
      size="lg"
      fullWidth
      onPress={onPress}
    />
  );
}

function NextShowCard({ show }: { show: Show }) {
  const { colors } = useTheme();
  return (
    <PressableScale onPress={() => router.push(`/show/${show.id}`)} style={[styles.nextCard, { backgroundColor: colors.surface }]}>
      <Image source={{ uri: show.coverImage }} style={[styles.nextThumb, { backgroundColor: colors.skeleton }]} contentFit="cover" cachePolicy="memory-disk" />
      <View style={styles.flexGap}>
        <View style={[styles.nextTime, { backgroundColor: colors.inverse }]}>
          <Text variant="caption" color={colors.onInverse}>
            {formatShowTime(show.scheduledAt)}
          </Text>
        </View>
        <Text variant="subhead" weight="700" numberOfLines={2}>
          {show.title}
        </Text>
        <Text variant="footnote" color="textSecondary">
          {formatTimeUntil(show.scheduledAt)} sonra · {formatCompact(show.savedCount)} hatırlatıcı
        </Text>
      </View>
      <Icon name="chevron-forward" size={18} color="textTertiary" />
    </PressableScale>
  );
}

function Stat({ icon, value, label }: { icon: IconName; value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Icon name={icon} size={14} color="textSecondary" />
      <Text variant="footnote" weight="800">
        {value}
      </Text>
      <Text variant="footnote" color="textSecondary">
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  flexGap: { flex: 1, gap: 3 },
  shrink: { flexShrink: 1 },
  hero: { width: '100%', overflow: 'hidden' },
  heroTop: { position: 'absolute', left: 0, right: 0, top: 0, height: 140 },
  endedDim: { backgroundColor: liveColors.glassStrong },
  heroBottom: { position: 'absolute', left: SCREEN_PADDING, right: SCREEN_PADDING, bottom: 16, gap: 10 },
  badgeRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  dateBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: liveColors.glassStrong, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  catBadge: { backgroundColor: liveColors.glassLight, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  countCard: { backgroundColor: liveColors.glassStrong, borderRadius: radius.lg, padding: 14, gap: 2, borderWidth: StyleSheet.hairlineWidth, borderColor: liveColors.border },
  countText: { fontSize: 34, lineHeight: 40, fontWeight: '900', letterSpacing: 0.5 },
  sellerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: SCREEN_PADDING, paddingTop: 16, paddingBottom: 6 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  block: { paddingHorizontal: SCREEN_PADDING, paddingVertical: 12, gap: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 6 },
  statsRow: { flexDirection: 'row', gap: 16, flexWrap: 'wrap', marginTop: 2 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  infoBlock: { paddingHorizontal: SCREEN_PADDING, paddingBottom: 8 },
  listHeader: { paddingHorizontal: SCREEN_PADDING, paddingTop: 18, paddingBottom: 2, gap: 2 },
  list: { paddingTop: 6, minHeight: 120 },
  giveawayWrap: { paddingHorizontal: SCREEN_PADDING, gap: 10, paddingTop: 6 },
  giveawayRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: StyleSheet.hairlineWidth * 2, borderRadius: radius.md, padding: 12 },
  giveawayIcon: { width: 48, height: 48, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  giveawayNote: { marginTop: 2 },
  nextCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: radius.md, padding: 10 },
  nextThumb: { width: 72, height: 96, borderRadius: radius.sm },
  nextTime: { alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  nextEmpty: { borderRadius: radius.md, padding: 14, gap: 10, alignItems: 'flex-start' },
  carousel: { marginTop: 22 },
  carouselTitle: { paddingHorizontal: SCREEN_PADDING, marginBottom: 10 },
  carouselContent: { paddingHorizontal: SCREEN_PADDING, gap: 12 },
  report: { marginTop: 28, paddingVertical: 8 },
  topBar: { position: 'absolute', left: 0, right: 0, top: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingBottom: 6 },
  topRight: { flexDirection: 'row', gap: 8 },
  topTitle: { flex: 1, paddingHorizontal: 8 },
  bottomBar: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: SCREEN_PADDING, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth },
  bottomRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sheetRow: { paddingHorizontal: 0 },
});
