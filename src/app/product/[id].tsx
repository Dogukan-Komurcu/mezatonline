/**
 * S41 — Ürün / ilan detayı.
 * Görsel galerisi (tam ekran yakınlaştırma), fiyat, satıcı kartı, kargo, Alıcı Koruması, açıklama, detaylar,
 * benzer ürünler ve formata göre sabit alt çubuk (Hemen Al · Fiyat Öner · Ön Teklif · Yayına Git).
 */
import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useIsFocused, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState, type ReactNode } from 'react';
import { FlatList, ScrollView, StyleSheet, useWindowDimensions, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CONDITION_LABELS, FORMAT_LABELS, ProductCard } from '@/components/cards/ProductCard';
import { FollowButton } from '@/components/cards/UserRow';
import { Avatar, Button, EmptyState, Header, Icon, IconButton, ListRow, PressableScale, Screen, SectionGap, Sheet, Text, toast, type IconName } from '@/components/ui';
import { getCategory, getLiveShowOf, getShopProducts, getSimilarProducts, getSubcategory } from '@/data';
import { BlockTitle, InfoLine, KeyValueTable, NoticeBox } from '@/features/commerce/components';
import { useIsBundled, useMyLatestOffer, useMyPreBid, useNow, useProductById, useRemainingStock, useSellerOf, useShowById } from '@/features/commerce/hooks';
import { ImageViewer } from '@/features/commerce/ImageViewer';
import { BuyerProtectionSheet } from '@/features/commerce/infoSheets';
import { declineCounter } from '@/features/commerce/offers';
import { OfferSheet } from '@/features/commerce/OfferSheet';
import { PreBidSheet } from '@/features/commerce/PreBidSheet';
import { CARRIER_LINE, deliveryWindow, discountPercent } from '@/features/commerce/utils';
import { APP_URL, ReportSheet, shareLink } from '@/features/shared/sheets';
import { formatCompact, formatDate, formatRating, formatShowTime, formatTimeUntil, formatTRY } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { SHIPPING_PROFILE_LABELS } from '@/lib/pricing';
import { ME_ID } from '@/store/auth';
import { useInboxStore } from '@/store/inbox';
import { OFFER_STATUS_LABELS, PRE_BID_STATUS_LABELS, useOrdersStore } from '@/store/orders';
import { completeChallenge } from '@/store/rewards';
import { useSocialStore } from '@/store/social';
import { liveColors, radius, SCREEN_PADDING, useTheme } from '@/theme';
import type { Offer, Product } from '@/types';

const GRID_GAP = 12;

export default function ProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height: screenH } = useWindowDimensions();
  const focused = useIsFocused();
  const product = useProductById(id);
  const show = useShowById(product?.showId);
  const seller = useSellerOf(product?.sellerId);
  const remaining = useRemainingStock(product);
  const preBid = useMyPreBid(product?.id);
  const offer = useMyLatestOffer(product?.id);
  const bundled = useIsBundled(product?.sellerId, product?.showId);
  const saved = useSocialStore((s) => !!product && s.savedProductIds.includes(product.id));
  const toggleSave = useSocialStore((s) => s.toggleSaveProduct);
  const reminded = useSocialStore((s) => !!show && s.remindedShowIds.includes(show.id));
  const toggleReminder = useSocialStore((s) => s.toggleReminder);
  const latestOrder = useOrdersStore((s) => (product ? s.orders.find((o) => o.productId === product.id && o.buyerId === ME_ID) : undefined));
  const now = useNow(30_000);
  const [page, setPage] = useState(0);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [offerOpen, setOfferOpen] = useState(false);
  const [preBidOpen, setPreBidOpen] = useState(false);
  const [protectionOpen, setProtectionOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [descOpen, setDescOpen] = useState(false);
  const [overHero, setOverHero] = useState(true);

  if (!product) {
    return (
      <Screen>
        <Header title="Ürün" />
        <EmptyState icon="pricetag-outline" title="Ürün bulunamadı" message="Bu ilan kaldırılmış ya da bağlantı hatalı olabilir." actionLabel="Keşfetmeye devam et" onAction={() => router.replace('/')} />
      </Screen>
    );
  }

  const heroH = Math.round(Math.min(width * 1.05, screenH * 0.56));
  const own = product.sellerId === ME_ID;
  const soldOut = remaining <= 0;
  const discount = discountPercent(product);
  const category = getCategory(product.categoryId);
  const sub = getSubcategory(product.categoryId, product.subcategoryId);
  const showLive = show?.status === 'live';
  const showScheduled = show?.status === 'scheduled';
  const sellerLive = seller && !own ? getLiveShowOf(seller.id) : undefined;
  const saveCount = product.saves + (saved ? 1 : 0);
  const views = product.saves * 6 + 37;
  const delivery = deliveryWindow(now);
  const moreFromSeller = getShopProducts(product.sellerId).filter((p) => p.id !== product.id).slice(0, 12);
  const similar = getSimilarProducts(product, 10);
  const cardW = Math.floor((width - SCREEN_PADDING * 2 - GRID_GAP) / 2);
  const shippingFree = product.shippingCost <= 0;
  const avgShip = seller && seller.avgShipDays > 0 ? (seller.avgShipDays < 1 ? '<1 gün' : `${Math.round(seller.avgShipDays)} gün`) : '1–2 gün';

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const over = e.nativeEvent.contentOffset.y < heroH - insets.top - 52;
    if (over !== overHero) setOverHero(over);
  };

  const share = () =>
    shareLink({
      title: product.title,
      path: `/product/${product.id}`,
      message: `${product.title} · ${formatTRY(product.price)}${seller ? ` · @${seller.username}` : ''} — Mezatonline'da gör`,
    });

  const onSave = () => {
    const on = toggleSave(product.id);
    haptic.light();
    if (on) toast.success('Kaydedilenlere eklendi', 'heart');
    else toast('Kaydedilenlerden çıkarıldı', 'heart-dislike-outline');
  };

  const onRemind = () => {
    if (!show) return;
    const on = toggleReminder(show.id);
    if (on) {
      haptic.success();
      const pts = completeChallenge('save_show');
      toast.success(`Hatırlatıcı kuruldu 🔔${pts ? ` · +${pts} puan` : ''}`, 'notifications');
    } else {
      haptic.light();
      toast('Hatırlatıcı kaldırıldı', 'notifications-off');
    }
  };

  const message = () => {
    if (!seller || own) return;
    const conv = useInboxStore.getState().ensureConversation(seller.id);
    haptic.tap();
    router.push(`/inbox/${conv.id}`);
  };

  const buyNow = (price?: number, source: 'buy_now' | 'offer' = 'buy_now') => {
    const params: Record<string, string> = { id: product.id, source };
    if (price !== undefined) params.price = String(price);
    if (product.showId) params.showId = product.showId;
    router.push({ pathname: '/checkout/[id]', params: params as { id: string } });
  };

  // ─── Alt çubuk ─────────────────────────────────────────────────────────────
  let bottom: ReactNode;
  if (own) {
    bottom = <Button title="İlanı düzenle" icon="create-outline" variant="inverse" size="lg" fullWidth onPress={() => router.push({ pathname: '/seller/listing', params: { id: product.id } })} />;
  } else if (soldOut) {
    bottom = (
      <View style={styles.bottomRow}>
        <Button title={product.format === 'auction' ? 'Satıldı' : 'Tükendi'} size="lg" disabled style={styles.flex} />
        {seller ? <Button title="Satıcıya sor" variant="outline" size="lg" icon="chatbubble-outline" onPress={message} /> : null}
      </View>
    );
  } else if (product.format === 'buy_now') {
    bottom = (
      <View style={styles.bottomRow}>
        {product.acceptsOffers ? (
          <Button
            title="Fiyat Öner"
            variant="outline"
            size="lg"
            onPress={() => {
              if (offer?.status === 'pending') {
                toast('Önerin satıcıda. Yanıt geldiğinde bildirim alacaksın.', 'hourglass-outline');
                return;
              }
              setOfferOpen(true);
            }}
            style={styles.flex}
          />
        ) : null}
        <Button title="Hemen Al" subtitle={formatTRY(product.price)} size="lg" onPress={() => buyNow()} style={styles.flex} />
      </View>
    );
  } else if (product.format === 'auction') {
    if (showLive && show) {
      bottom = <Button title="Yayına Git" subtitle="🔴 Canlı · Açık artırmaya katıl" icon="radio" size="lg" fullWidth onPress={() => router.push(`/live/${show.id}`)} />;
    } else if (showScheduled && show) {
      bottom = (
        <Button
          title={preBid ? 'Ön Teklifini Yükselt' : 'Ön Teklif Ver'}
          subtitle={preBid ? `Mevcut: ${formatTRY(preBid.maxAmount)}` : `Açılış ${formatTRY(product.price)} · ${formatShowTime(show.scheduledAt)}`}
          icon="hammer"
          size="lg"
          fullWidth
          onPress={() => setPreBidOpen(true)}
        />
      );
    } else {
      bottom = <Button title="Şu an satışta değil" size="lg" fullWidth disabled />;
    }
  } else {
    bottom =
      showLive && show ? (
        <Button title="Yayında Çekilişe Katıl" icon="gift" size="lg" fullWidth onPress={() => router.push(`/live/${show.id}`)} />
      ) : (
        <Button title="Çekiliş yayında yapılacak" icon="gift-outline" size="lg" fullWidth disabled />
      );
  }

  const detailRows: [string, string][] = [
    ['Kategori', category?.name ?? '—'],
    ...(sub ? ([['Alt kategori', sub.name]] as [string, string][]) : []),
    ['Durum', CONDITION_LABELS[product.condition]],
    ...(product.grade ? ([['Derece', product.grade]] as [string, string][]) : []),
    ['Satış türü', FORMAT_LABELS[product.format]],
    ['Kargo profili', SHIPPING_PROFILE_LABELS[product.shippingProfile].split(' — ')[0]],
    ['Stok', product.format === 'buy_now' ? `${remaining} adet` : '1 adet'],
    ['İlan tarihi', formatDate(product.createdAt)],
    ['İlan no', product.id.toUpperCase()],
  ];

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      {focused && overHero ? <StatusBar style="light" /> : null}
      <ScrollView onScroll={onScroll} scrollEventThrottle={32} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 + insets.bottom }}>
        {/* ─── Galeri ─── */}
        <View style={[styles.hero, { height: heroH, backgroundColor: colors.skeleton }]}>
          <FlatList
            data={product.images}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(uri, i) => `${uri}-${i}`}
            onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}
            renderItem={({ item, index }) => (
              <PressableScale scaleTo={1} onPress={() => setViewerIndex(index)} accessibilityLabel="Görseli büyüt" style={{ width, height: heroH }}>
                <Image source={{ uri: item }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" transition={200} recyclingKey={item} />
              </PressableScale>
            )}
          />
          <LinearGradient colors={[liveColors.glassStrong, 'transparent']} style={styles.heroTop} pointerEvents="none" />
          {soldOut ? (
            <View style={[StyleSheet.absoluteFill, styles.soldOverlay]} pointerEvents="none">
              <View style={styles.soldPill}>
                <Text variant="headline" weight="900" color={liveColors.text}>
                  {product.format === 'auction' ? 'SATILDI' : 'TÜKENDİ'}
                </Text>
              </View>
            </View>
          ) : null}
          {product.images.length > 1 ? (
            <View style={styles.dotsWrap} pointerEvents="none">
              <View style={styles.dots}>
                {product.images.map((uri, i) => (
                  <View key={`${uri}-${i}`} style={[styles.dot, i === page ? styles.dotActive : null]} />
                ))}
              </View>
            </View>
          ) : null}
          <View style={styles.heroBottom} pointerEvents="none">
            {discount > 0 && !soldOut ? (
              <View style={[styles.heroTag, { backgroundColor: colors.live }]}>
                <Text variant="footnote" weight="800" color={liveColors.text}>
                  %{discount} İNDİRİM
                </Text>
              </View>
            ) : (
              <View />
            )}
            <View style={styles.expand}>
              <Icon name="expand" size={14} color={liveColors.text} />
            </View>
          </View>
        </View>

        {/* ─── Yayın durumu ─── */}
        {showLive && show && !soldOut ? (
          <PressableScale scaleTo={0.99} onPress={() => router.push(`/live/${show.id}`)} style={[styles.liveBanner, { backgroundColor: colors.live }]}>
            <View style={styles.liveDot} />
            <Text variant="subhead" weight="800" color={liveColors.text} style={styles.flex} numberOfLines={1}>
              CANLI · Bu ürün şu an yayında
            </Text>
            <Text variant="subhead" weight="800" color={liveColors.text}>
              Yayına git ›
            </Text>
          </PressableScale>
        ) : null}
        {showScheduled && show ? (
          <View style={[styles.scheduleCard, { backgroundColor: colors.surface }]}>
            <View style={styles.flexGap}>
              <Text variant="caption" color="textSecondary" weight="600">
                YAYIN BAŞLIYOR
              </Text>
              <Text variant="headline" weight="800">
                {formatShowTime(show.scheduledAt)}
              </Text>
              <Text variant="footnote" color="textSecondary" numberOfLines={1} onPress={() => router.push(`/show/${show.id}`)} suppressHighlighting>
                {formatTimeUntil(show.scheduledAt, now)} sonra · <Text variant="footnote" weight="700" color="accent">Yayın sayfası</Text>
              </Text>
            </View>
            <Button title={reminded ? 'Hatırlatılacak' : 'Hatırlat'} icon={reminded ? 'notifications' : 'notifications-outline'} size="sm" variant={reminded ? 'secondary' : 'inverse'} onPress={onRemind} />
          </View>
        ) : null}

        {/* ─── Başlık + fiyat ─── */}
        <View style={styles.block}>
          <Text variant="title2">{product.title}</Text>
          {product.format === 'auction' ? (
            <View style={styles.priceBlock}>
              <Text variant="footnote" color="textSecondary" weight="600">
                {soldOut ? 'Açık artırma tamamlandı' : 'Açılış fiyatı'}
              </Text>
              <View style={styles.priceRow}>
                <Text style={styles.price} tabular>
                  {formatTRY(product.price)}
                </Text>
                {product.compareAtPrice && product.compareAtPrice > product.price ? (
                  <Text variant="footnote" color="textSecondary">
                    Tahmini değer ~{formatTRY(product.compareAtPrice)}
                  </Text>
                ) : null}
              </View>
            </View>
          ) : product.format === 'giveaway' ? (
            <View style={styles.priceRow}>
              <Text style={styles.price}>Ücretsiz</Text>
              <Text variant="footnote" color="textSecondary">
                Yayında çekilişle
              </Text>
            </View>
          ) : (
            <View style={styles.priceRow}>
              <Text style={styles.price} tabular>
                {formatTRY(product.price)}
              </Text>
              {discount > 0 && product.compareAtPrice ? (
                <>
                  <Text variant="headline" weight="500" color="textTertiary" style={styles.strike}>
                    {formatTRY(product.compareAtPrice)}
                  </Text>
                  <View style={[styles.pctPill, { backgroundColor: colors.live }]}>
                    <Text variant="caption" color={liveColors.text}>
                      %{discount}
                    </Text>
                  </View>
                </>
              ) : null}
            </View>
          )}
          <Text variant="subhead" color="textSecondary">
            {bundled ? (
              <Text variant="subhead" weight="700" color="success">
                Kargo +₺0 · aynı pakete eklenir
              </Text>
            ) : shippingFree ? (
              <Text variant="subhead" weight="700" color="success">
                Ücretsiz kargo
              </Text>
            ) : (
              `+ ${formatTRY(product.shippingCost)} kargo`
            )}
            {' · KDV dahil'}
          </Text>

          <View style={styles.chips}>
            <Tag label={FORMAT_LABELS[product.format]} icon={product.format === 'auction' ? 'hammer' : product.format === 'giveaway' ? 'gift' : 'flash'} strong />
            <Tag label={CONDITION_LABELS[product.condition]} icon="sparkles-outline" />
            {product.grade ? <Tag label={product.grade} icon="ribbon-outline" /> : null}
            {product.suddenDeath && product.format === 'auction' ? <Tag label="Ani Bitiş 💀" /> : null}
            {product.acceptsOffers && product.format === 'buy_now' ? <Tag label="Fiyat önerisine açık" icon="pricetags-outline" /> : null}
          </View>

          <View style={styles.metaRow}>
            {product.format === 'buy_now' && !soldOut ? (
              <Text variant="footnote" weight="700" color={remaining <= 2 ? 'live' : 'text'}>
                {remaining === 1 ? 'Son 1 adet!' : `Stokta ${remaining} adet`}
              </Text>
            ) : product.format === 'auction' && !soldOut ? (
              <Text variant="footnote" weight="700">
                1 adet · Canlı açık artırma
              </Text>
            ) : null}
            <Text variant="footnote" color="textSecondary">
              {formatCompact(views)} görüntülenme · {formatCompact(saveCount)} kaydetme
            </Text>
          </View>

          {soldOut && latestOrder && !own ? (
            <NoticeBox icon="bag-check-outline" tone="success" title={`Bu ürünü satın aldın · ${formatTRY(latestOrder.itemPrice / Math.max(1, latestOrder.quantity))}`}>
              <Text variant="footnote" color="textSecondary">
                Sipariş {latestOrder.number}.{' '}
                <Text variant="footnote" weight="700" color="accent" onPress={() => router.push(`/orders/${latestOrder.id}`)} suppressHighlighting>
                  Siparişi görüntüle
                </Text>
              </Text>
            </NoticeBox>
          ) : null}
          {offer && !(offer.status === 'accepted' && soldOut) ? <OfferBanner productPrice={product.price} offer={offer} onAccept={(p) => buyNow(p, 'offer')} orderId={latestOrder?.id} onNewOffer={() => setOfferOpen(true)} /> : null}
          {preBid ? (
            <NoticeBox icon="trending-up" tone={preBid.status === 'outbid' ? 'warning' : 'success'} title={`Ön teklifin: ${formatTRY(preBid.maxAmount)} · ${PRE_BID_STATUS_LABELS[preBid.status]}`}>
              Ürün yayında sahneye geldiğinde bu tutara kadar senin adına otomatik teklif verilir.
            </NoticeBox>
          ) : null}
        </View>

        <SectionGap />

        {/* ─── Satıcı ─── */}
        {seller ? (
          <View style={styles.block}>
            <PressableScale scaleTo={0.99} onPress={() => (sellerLive ? router.push(`/live/${sellerLive.id}`) : router.push(`/user/${seller.username}`))} style={styles.sellerRow}>
              <Avatar uri={seller.avatar} name={seller.username} size={52} live={!!sellerLive} verified={seller.badges.includes('verified')} />
              <View style={styles.flexGap}>
                <View style={styles.nameRow}>
                  <Text variant="headline" numberOfLines={1} style={styles.shrink}>
                    {seller.username}
                  </Text>
                  {seller.badges.includes('top_seller') ? <Icon name="ribbon" size={15} color="warning" /> : null}
                </View>
                <Text variant="footnote" color="textSecondary" numberOfLines={1}>
                  <Text variant="footnote" weight="700">
                    ★ {formatRating(seller.rating || 5)}
                  </Text>{' '}
                  ({formatCompact(seller.reviewCount)}) · {formatCompact(seller.followers)} takipçi
                </Text>
                <Text variant="footnote" color="textSecondary" numberOfLines={1}>
                  {formatCompact(seller.itemsSold)} satış · Ort. kargolama {avgShip}
                </Text>
              </View>
              <Icon name="chevron-forward" size={18} color="textTertiary" />
            </PressableScale>
            {!own ? (
              <View style={styles.sellerActions}>
                <Button title="Mesaj gönder" icon="chatbubble-outline" variant="secondary" size="md" onPress={message} style={styles.flex} />
                <View style={styles.flex}>
                  <FollowButton user={seller} size="md" style={styles.followFull} />
                </View>
              </View>
            ) : null}
          </View>
        ) : null}

        <SectionGap />

        {/* ─── Kargo ─── */}
        <View style={styles.block}>
          <BlockTitle title="Kargo ve teslimat" style={styles.noMargin} />
          <InfoLine
            icon="car-outline"
            title={bundled ? 'Kargo: +₺0 (aynı pakete eklenir)' : shippingFree ? 'Ücretsiz kargo' : `Kargo ücreti: ${formatTRY(product.shippingCost)}`}
            subtitle={bundled ? 'Bu yayından aldığın diğer ürünlerle tek pakette gelir.' : product.showId ? 'Aynı yayından alacağın diğer ürünler tek pakette, ek kargo ücreti olmadan gelir.' : 'Fiyatlara KDV dahildir.'}
          />
          <InfoLine icon="business-outline" title="Anlaşmalı kargo firmaları" subtitle={CARRIER_LINE} />
          <InfoLine icon="time-outline" title="Satıcı 2 iş günü içinde kargolar" subtitle={`Bu satıcının ortalama kargolama süresi: ${avgShip}`} />
          <InfoLine icon="calendar-outline" title="Tahmini teslimat: 2–4 iş günü" subtitle={delivery.label} />
          {seller ? <InfoLine icon="location-outline" title="Gönderim yeri" subtitle={`${seller.city}, Türkiye`} /> : null}
          <InfoLine icon="shield-checkmark" tint={colors.success} title="Alıcı Koruması" subtitle="Ürün gelmezse ya da açıklandığı gibi değilse paran iade edilir." onPress={() => setProtectionOpen(true)} />
        </View>

        <SectionGap />

        {/* ─── Açıklama + detaylar ─── */}
        <View style={styles.block}>
          <BlockTitle title="Açıklama" style={styles.noMargin} />
          <Text variant="callout" color="textSecondary" numberOfLines={descOpen ? undefined : 4}>
            {product.description}
          </Text>
          {product.description.length > 160 ? (
            <Text variant="subhead" weight="700" color="accent" onPress={() => setDescOpen((v) => !v)} suppressHighlighting>
              {descOpen ? 'Daha az göster' : 'Devamını gör'}
            </Text>
          ) : null}
          <BlockTitle title="Ürün detayları" style={styles.detailsTitle} />
          <KeyValueTable rows={detailRows} />
        </View>

        {/* ─── Satıcının diğer ürünleri ─── */}
        {moreFromSeller.length ? (
          <View style={styles.carousel}>
            <View style={styles.carouselHead}>
              <Text variant="title3" style={styles.flex} numberOfLines={1}>
                Satıcının diğer ürünleri
              </Text>
              {seller ? (
                <Text variant="subhead" weight="700" color="accent" onPress={() => router.push(`/user/${seller.username}`)} suppressHighlighting>
                  Mağaza
                </Text>
              ) : null}
            </View>
            <FlatList
              horizontal
              data={moreFromSeller}
              keyExtractor={(p) => p.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.carouselContent}
              renderItem={({ item }) => <ProductCard product={item} width={146} />}
            />
          </View>
        ) : null}

        {/* ─── Benzer ürünler ─── */}
        {similar.length ? (
          <View style={styles.similar}>
            <Text variant="title3" style={styles.similarTitle}>
              Benzer ürünler
            </Text>
            <View style={styles.grid}>
              {similar.map((p: Product) => (
                <ProductCard key={p.id} product={p} width={cardW} />
              ))}
            </View>
          </View>
        ) : null}

        <View style={styles.reportWrap}>
          <Button title="İlanı şikayet et" icon="flag-outline" variant="ghost" size="sm" onPress={() => setReportOpen(true)} />
        </View>
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
              <Text variant="subhead" weight="700" numberOfLines={1} align="center">
                {product.title}
              </Text>
              <Text variant="caption" color="textSecondary" weight="600" numberOfLines={1} align="center">
                {product.format === 'giveaway' ? 'Çekiliş' : formatTRY(product.price)}
              </Text>
            </Animated.View>
          ) : null}
        </View>
        <View style={styles.topRight}>
          <IconButton name="share-outline" variant={overHero ? 'glass' : 'plain'} size={38} onPress={share} accessibilityLabel="Paylaş" />
          <PressableScale scaleTo={0.9} onPress={onSave} accessibilityLabel={saved ? 'Kaydedilenlerden çıkar' : 'Kaydet'} style={[styles.savePill, { backgroundColor: overHero ? liveColors.glass : colors.surface }]}>
            <Icon name={saved ? 'heart' : 'heart-outline'} size={19} color={saved ? colors.live : overHero ? liveColors.text : colors.text} />
            <Text variant="footnote" weight="800" color={overHero ? liveColors.text : colors.text} tabular>
              {formatCompact(saveCount)}
            </Text>
          </PressableScale>
          <IconButton name="ellipsis-horizontal" variant={overHero ? 'glass' : 'plain'} size={38} onPress={() => setMoreOpen(true)} accessibilityLabel="Diğer" />
        </View>
      </View>

      {/* ─── Alt çubuk ─── */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 12), backgroundColor: colors.bg, borderTopColor: colors.border }]}>{bottom}</View>

      <ImageViewer images={product.images} index={viewerIndex ?? 0} visible={viewerIndex !== null} onClose={() => setViewerIndex(null)} />
      <OfferSheet visible={offerOpen} onClose={() => setOfferOpen(false)} product={product} />
      <PreBidSheet visible={preBidOpen} onClose={() => setPreBidOpen(false)} product={product} show={show} />
      <BuyerProtectionSheet visible={protectionOpen} onClose={() => setProtectionOpen(false)} />
      <ReportSheet visible={reportOpen} onClose={() => setReportOpen(false)} subject={`İlan: ${product.title}`} />
      <Sheet visible={moreOpen} onClose={() => setMoreOpen(false)} title="Seçenekler">
        <ListRow
          icon="share-outline"
          title="İlanı paylaş"
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
            Clipboard.setStringAsync(`${APP_URL}/product/${product.id}`).catch(() => {});
            haptic.success();
            toast.success('Bağlantı kopyalandı', 'copy');
            setMoreOpen(false);
          }}
          style={styles.sheetRow}
        />
        {seller && !own ? (
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
        {show && show.status !== 'ended' ? (
          <ListRow
            icon="videocam-outline"
            title={showLive ? 'Canlı yayına git' : 'Yayın sayfasını aç'}
            onPress={() => {
              setMoreOpen(false);
              router.push(showLive ? `/live/${show.id}` : `/show/${show.id}`);
            }}
            style={styles.sheetRow}
          />
        ) : null}
        <ListRow
          icon="flag-outline"
          title="İlanı şikayet et"
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

// ─── Parçalar ────────────────────────────────────────────────────────────────

function Tag({ label, icon, strong }: { label: string; icon?: IconName; strong?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.tag, { backgroundColor: strong ? colors.inverse : colors.surface }]}>
      {icon ? <Icon name={icon} size={13} color={strong ? colors.onInverse : colors.text} /> : null}
      <Text variant="footnote" weight="700" color={strong ? colors.onInverse : colors.text}>
        {label}
      </Text>
    </View>
  );
}

function OfferBanner({
  offer,
  productPrice,
  onAccept,
  onNewOffer,
  orderId,
}: {
  offer: Offer;
  productPrice: number;
  onAccept: (price: number) => void;
  onNewOffer: () => void;
  orderId?: string;
}) {
  const { colors } = useTheme();
  if (offer.status === 'countered' && offer.counterAmount) {
    const counter = offer.counterAmount;
    return (
      <View style={[styles.counterCard, { borderColor: colors.primary, backgroundColor: colors.surface }]}>
        <View style={styles.counterHead}>
          <Icon name="chatbubble-ellipses" size={18} color="text" />
          <Text variant="callout" weight="800" style={styles.flex}>
            Karşı teklif: {formatTRY(counter)}
          </Text>
          <Text variant="caption" color="textSecondary" weight="600">
            24 saat geçerli
          </Text>
        </View>
        <Text variant="footnote" color="textSecondary">
          {formatTRY(offer.amount)} önerine karşılık satıcı {formatTRY(counter)} istedi (satış fiyatı {formatTRY(productPrice)}).
        </Text>
        <View style={styles.counterActions}>
          <Button
            title="Reddet"
            variant="outline"
            size="sm"
            onPress={() => {
              declineCounter(offer);
              haptic.light();
              toast('Karşı teklifi reddettin', 'close-circle-outline');
            }}
            style={styles.flex}
          />
          <Button title={`${formatTRY(counter)} Kabul et`} size="sm" onPress={() => onAccept(counter)} style={styles.flex} />
        </View>
      </View>
    );
  }
  if (offer.status === 'pending') {
    return (
      <NoticeBox icon="hourglass-outline" title={`Fiyat önerin: ${formatTRY(offer.amount)} · ${OFFER_STATUS_LABELS.pending}`}>
        Satıcı önerini inceliyor. Kabul ederse kayıtlı kartından otomatik ödeme alınır.
      </NoticeBox>
    );
  }
  if (offer.status === 'accepted') {
    return (
      <NoticeBox icon="checkmark-circle" tone="success" title={`${formatTRY(offer.counterAmount ?? offer.amount)} önerin kabul edildi`}>
        <Text variant="footnote" color="textSecondary">
          Siparişin oluşturuldu.{' '}
          {orderId ? (
            <Text variant="footnote" weight="700" color="accent" onPress={() => router.push(`/orders/${orderId}`)} suppressHighlighting>
              Siparişi görüntüle
            </Text>
          ) : null}
        </Text>
      </NoticeBox>
    );
  }
  return (
    <NoticeBox icon="close-circle-outline" tone="warning" title={`${formatTRY(offer.amount)} önerin kabul edilmedi`}>
      <Text variant="footnote" color="textSecondary">
        Yeni bir öneri yapabilir ya da hemen alabilirsin.{' '}
        <Text variant="footnote" weight="700" color="accent" onPress={onNewOffer} suppressHighlighting>
          Yeni öneri yap
        </Text>
      </Text>
    </NoticeBox>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  flexGap: { flex: 1, gap: 2 },
  shrink: { flexShrink: 1 },
  noMargin: { marginBottom: 0 },
  hero: { width: '100%', overflow: 'hidden' },
  heroTop: { position: 'absolute', left: 0, right: 0, top: 0, height: 120 },
  heroBottom: { position: 'absolute', left: 12, right: 12, bottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroTag: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  dotsWrap: { position: 'absolute', left: 0, right: 0, bottom: 18, alignItems: 'center' },
  dots: { flexDirection: 'row', gap: 5, backgroundColor: liveColors.glass, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: liveColors.textTertiary },
  dotActive: { width: 16, backgroundColor: liveColors.text },
  expand: { width: 28, height: 28, borderRadius: 14, backgroundColor: liveColors.glass, alignItems: 'center', justifyContent: 'center' },
  soldOverlay: { backgroundColor: liveColors.glass, alignItems: 'center', justifyContent: 'center' },
  soldPill: { backgroundColor: liveColors.glassStrong, borderRadius: radius.md, paddingHorizontal: 18, paddingVertical: 8, borderWidth: 1, borderColor: liveColors.border },
  liveBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: SCREEN_PADDING, paddingVertical: 11 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: liveColors.text },
  scheduleCard: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: SCREEN_PADDING, marginTop: 14, borderRadius: radius.md, padding: 12 },
  block: { paddingHorizontal: SCREEN_PADDING, paddingVertical: 14, gap: 10 },
  priceBlock: { gap: 2 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  price: { fontSize: 30, lineHeight: 36, fontWeight: '900' },
  strike: { textDecorationLine: 'line-through' },
  pctPill: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 6 },
  metaRow: { gap: 2 },
  sellerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sellerActions: { flexDirection: 'row', gap: 10 },
  followFull: { alignSelf: 'stretch' },
  counterCard: { borderWidth: 1.5, borderRadius: radius.md, padding: 12, gap: 8 },
  counterHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  counterActions: { flexDirection: 'row', gap: 8 },
  detailsTitle: { marginTop: 10, marginBottom: 0 },
  carousel: { marginTop: 10 },
  carouselHead: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SCREEN_PADDING, marginBottom: 10, gap: 8 },
  carouselContent: { paddingHorizontal: SCREEN_PADDING, gap: 12 },
  similar: { marginTop: 24, paddingHorizontal: SCREEN_PADDING },
  similarTitle: { marginBottom: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', columnGap: GRID_GAP, rowGap: 18 },
  reportWrap: { alignItems: 'center', marginTop: 24 },
  topBar: { position: 'absolute', left: 0, right: 0, top: 0, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingBottom: 6 },
  topTitle: { flex: 1, paddingHorizontal: 8 },
  topRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  savePill: { height: 38, borderRadius: 19, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 11 },
  bottomBar: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: SCREEN_PADDING, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth },
  bottomRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  sheetRow: { paddingHorizontal: 0 },
});
