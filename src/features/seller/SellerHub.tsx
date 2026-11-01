/**
 * S81 — Satıcı Paneli (Seller Hub): hızlı eylemler, kontrol listesi, komisyon seviyesi, bakiye,
 * yaklaşan yayınlar, kargolanacak siparişler, hak sahibi şikâyeti uyarısı, son satışlar ve ☰ menü.
 */
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Avatar, Button, Header, Icon, IconButton, ListRow, PressableScale, Screen, SectionHeader, Text, toast, type IconName } from '@/components/ui';
import { FEATURES } from '@/config/demo';
import { isIpLocked, useTrustStore } from '@/features/trust/store';
import { formatShowTime, formatTimeUntil, formatTRY, timeAgo } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { useMe } from '@/store/auth';
import { useUnreadNotificationCount } from '@/store/inbox';
import { useSellerStore } from '@/store/seller';
import { liveColors, radius, SCREEN_PADDING, useTheme } from '@/theme';
import type { Show } from '@/types';

import { useNow } from './actions';
import { HealthSheet, HubMenuSheet, OffersSheet, RehearsalSheet, ShippingSettingsSheet, TierSheet, TipsSheet, VerifySheet, type HubSheetKey } from './HubSheets';
import { deadlineInfo, deriveOffers, formatRate, isValidIban, isValidTckn, orderBucket, resolveBuyer, SELLER_ORDER_STATUS, tierProgress } from './logic';
import { showActions, startShow } from './showActions';
import { useQaOffset, useQaParam } from './qaSeed';
import { useSellerExtras } from './store';
import { ActionSheet, Card, Confetti, ProgressBar, StatusPill, Thumb, tint } from './ui';

function QuickAction({ icon, label, onPress, primary }: { icon: IconName; label: string; onPress: () => void; primary?: boolean }) {
  const { colors } = useTheme();
  return (
    <PressableScale
      scaleTo={0.95}
      onPress={() => {
        haptic.light();
        onPress();
      }}
      style={[styles.quick, { backgroundColor: primary ? colors.primary : colors.surface }]}
      accessibilityRole="button"
      accessibilityLabel={label}>
      <Icon name={icon} size={24} color={primary ? colors.onPrimary : colors.text} />
      <Text variant="subhead" weight="700" color={primary ? colors.onPrimary : colors.text} align="center" numberOfLines={1}>
        {label}
      </Text>
    </PressableScale>
  );
}

function UpcomingShowCard({ show, onMore }: { show: Show; onMore: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={styles.showCard}>
      <PressableScale
        scaleTo={0.97}
        onPress={() => (show.status === 'live' ? router.push(`/seller/live/${show.id}`) : router.push({ pathname: '/seller/schedule', params: { id: show.id } }))}
        style={[styles.showThumb, { backgroundColor: colors.skeleton }]}>
        <Image source={{ uri: show.coverImage }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" transition={150} recyclingKey={show.id} />
        <LinearGradient colors={[liveColors.glass, 'transparent', liveColors.glassStrong]} locations={[0, 0.4, 1]} style={StyleSheet.absoluteFill} />
        <View style={[styles.datePill, { backgroundColor: show.status === 'live' ? liveColors.live : liveColors.glassStrong }]}>
          <Text variant="caption" color={liveColors.text}>
            {show.status === 'live' ? 'CANLI' : formatShowTime(show.scheduledAt)}
          </Text>
        </View>
        <PressableScale scaleTo={0.85} onPress={onMore} style={[styles.more, { backgroundColor: liveColors.glassStrong }]} accessibilityLabel="Diğer seçenekler" hitSlop={8}>
          <Icon name="ellipsis-horizontal" size={16} color={liveColors.text} />
        </PressableScale>
        <View style={styles.showInfo}>
          <Text variant="footnote" weight="700" color={liveColors.text} numberOfLines={2}>
            {show.title}
          </Text>
          <Text variant="caption" color={liveColors.textSecondary}>
            {show.productIds.length} ürün
          </Text>
        </View>
      </PressableScale>
      <Button title={show.status === 'live' ? 'Yayına dön' : 'Başlat'} size="sm" variant={show.status === 'live' ? 'danger' : 'inverse'} onPress={() => startShow(show)} />
    </View>
  );
}

export function SellerHub() {
  const { colors } = useTheme();
  const me = useMe();
  const now = useNow(30_000);
  const unread = useUnreadNotificationCount();
  const shows = useSellerStore((s) => s.shows);
  const listings = useSellerStore((s) => s.listings);
  const orders = useSellerStore((s) => s.orders);
  const balance = useSellerStore((s) => s.balance);
  const pending = useSellerStore((s) => s.pendingBalance);
  const sessions = useSellerStore((s) => s.sessions);
  const iban = useSellerStore((s) => s.iban);
  const kyc = useSellerExtras((s) => s.kyc);
  const shipping = useSellerExtras((s) => s.shipping);
  const vacation = useSellerExtras((s) => s.vacation);
  const setVacation = useSellerExtras((s) => s.setVacation);
  const celebrate = useSellerExtras((s) => s.celebrate);
  const setCelebrate = useSellerExtras((s) => s.setCelebrate);
  const welcomeDismissed = useSellerExtras((s) => s.welcomeDismissed);
  const dismissWelcome = useSellerExtras((s) => s.dismissWelcome);
  const approvedAt = useSellerExtras((s) => s.approvedAt);
  const listingStatus = useSellerExtras((s) => s.listingStatus);
  const resolutions = useSellerExtras((s) => s.offerResolutions);
  const ipCases = useTrustStore((s) => s.cases);
  // Yalnızca geliştirme: /sell?qa=sheet:tips → ilgili sheet açık başlar (ekran görüntüsü QA'sı)
  const qa = useQaParam();
  const [sheet, setSheet] = useState<HubSheetKey | null>(qa?.startsWith('sheet:') ? (qa.slice(6) as HubSheetKey) : null);
  const [moreShow, setMoreShow] = useState<Show | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const qaOffset = useQaOffset();

  const upcoming = shows.filter((s) => s.status !== 'ended').sort((a, b) => (a.status === 'live' ? -1 : b.status === 'live' ? 1 : a.scheduledAt.localeCompare(b.scheduledAt)));
  const liveShow = shows.find((s) => s.status === 'live');
  const toShip = orders.filter((o) => orderBucket(o) === 'toship');
  const nearest = toShip.map((o) => deadlineInfo(o.createdAt, now)).sort((a, b) => a.deadline - b.deadline)[0];
  const recent = [...orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5);
  const anchor = [approvedAt, ...orders.map((o) => o.createdAt)].filter((x): x is string => !!x).sort()[0];
  const tier = tierProgress(orders, anchor, now);
  const periodOrders = orders.filter((o) => o.status !== 'cancelled' && now - new Date(o.createdAt).getTime() < 28 * 86_400_000).length;
  const pendingOffers = deriveOffers(listings, listingStatus, resolutions, now).filter((o) => o.status === 'pending').length;
  // Hak sahibi şikâyetiyle kaldırılan ve dosyası açık ilanlar (silinen ilanlar sayılmaz)
  const ipLocked = listings.filter((p) => isIpLocked(ipCases[p.id]));
  const ipAwaitingObjection = ipLocked.some((p) => ipCases[p.id]?.status === 'removed');

  const checklist = [
    { key: 'verify', title: 'Kimlik ve IBAN bilgilerini onayla', subtitle: 'Kazancın bu hesaba aktarılır', done: !!kyc && (isValidTckn(kyc.tckn) || !!kyc.tcknMasked) && !!iban && isValidIban(iban), onPress: () => setSheet('verify') },
    { key: 'shipping', title: 'Kargo tercihini belirle', subtitle: 'Firma ve kargo ücretini kimin ödeyeceği', done: shipping.configured, onPress: () => setSheet('shipping') },
    {
      key: 'products',
      title: 'En az 3 ürün yükle',
      subtitle: `${Math.min(3, listings.length)}/3 ürün hazır`,
      done: listings.length >= 3,
      onPress: () => router.push('/seller/listing'),
    },
    { key: 'show', title: 'İlk yayın tarihini seç', subtitle: 'Gün, saat ve kapak görseli', done: shows.length > 0 || sessions.length > 0, onPress: () => router.push('/seller/schedule') },
  ];
  const doneCount = checklist.filter((c) => c.done).length;
  const allDone = doneCount === checklist.length;
  const showChecklist = !allDone || sessions.length === 0;

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 900);
  };

  return (
    <Screen>
      <Header
        large
        title="Satıcı Paneli"
        right={
          <>
            <IconButton name="notifications-outline" dot={unread > 0} onPress={() => router.push('/notifications')} accessibilityLabel="Bildirimler" />
            <IconButton name="menu" onPress={() => setSheet('menu')} accessibilityLabel="Menü" />
          </>
        }
      />
      <ScrollView contentOffset={qaOffset} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textSecondary} />}>
        {vacation ? (
          <Card style={[styles.banner, { backgroundColor: tint(colors.info, 0.12), borderColor: tint(colors.info, 0.3) }]}>
            <Icon name="airplane" size={22} color={colors.info} />
            <View style={{ flex: 1 }}>
              <Text variant="subhead" weight="700">
                Tatil modundasın 🌴
              </Text>
              <Text variant="footnote" color="textSecondary">
                Mağazandaki Hemen Al ilanları şu an alıcılara görünmüyor. Açık siparişlerini yine 2 iş günü içinde kargolaman gerekiyor.
              </Text>
            </View>
            <Button
              title="Kapat"
              size="sm"
              variant="secondary"
              onPress={() => {
                setVacation(false);
                toast.success('Tatil modu kapatıldı, mağazan yeniden açık');
              }}
            />
          </Card>
        ) : null}

        {liveShow ? (
          <Card onPress={() => router.push(`/seller/live/${liveShow.id}`)} style={[styles.banner, { backgroundColor: tint(colors.live, 0.1), borderColor: tint(colors.live, 0.35) }]}>
            <View style={[styles.liveDot, { backgroundColor: colors.live }]} />
            <View style={{ flex: 1 }}>
              <Text variant="subhead" weight="700">
                Şu an canlı yayındasın
              </Text>
              <Text variant="footnote" color="textSecondary" numberOfLines={1}>
                {liveShow.title}
              </Text>
            </View>
            <Icon name="chevron-forward" size={18} color="textSecondary" />
          </Card>
        ) : null}

        {!welcomeDismissed ? (
          <Animated.View entering={FadeInDown.duration(350)}>
            <Card style={[styles.welcome, { backgroundColor: colors.primary, borderColor: colors.primary }]}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text variant="title3" color={colors.onPrimary}>
                  Satıcı hesabın hazır, {me.displayName.split(' ')[0]}! 🎉
                </Text>
                <Text variant="callout" color={colors.onPrimary} style={{ opacity: 0.8 }}>
                  Aşağıdaki adımları bitirdiğinde ilk canlı yayınına hazırsın. İlk 30 gününde satış komisyonu %0.
                </Text>
              </View>
              <IconButton name="close" size={30} color={colors.onPrimary} onPress={dismissWelcome} accessibilityLabel="Kapat" />
            </Card>
          </Animated.View>
        ) : null}

        <View style={styles.quickRow}>
          <QuickAction icon="calendar-outline" label="Yayın Planla" onPress={() => router.push('/seller/schedule')} />
          <QuickAction icon="pricetag-outline" label="Ürün Oluştur" onPress={() => router.push('/seller/listing')} />
          <QuickAction icon="videocam-outline" label="Canlıya Geç" primary onPress={() => router.push(liveShow ? `/seller/live/${liveShow.id}` : '/seller/go-live')} />
        </View>

        {ipLocked.length ? (
          <Card onPress={() => router.push({ pathname: '/seller/inventory', params: { tab: 'inactive' } })} style={[styles.row, { borderColor: tint(colors.danger, 0.35) }]}>
            <View style={[styles.iconCircle, { backgroundColor: tint(colors.danger, 0.14) }]}>
              <Icon name="shield-outline" size={22} color={colors.danger} />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="headline" weight="700">
                {ipLocked.length} ilanın hak sahibi şikâyetiyle kaldırıldı
              </Text>
              <Text variant="footnote" color="textSecondary">
                {ipAwaitingObjection ? 'Belgeyle itiraz edebilirsin' : 'İtirazın inceleniyor'}
              </Text>
            </View>
            <Icon name="chevron-forward" size={18} color="textTertiary" />
          </Card>
        ) : null}

        {toShip.length ? (
          <Card onPress={() => router.push({ pathname: '/seller/orders', params: { tab: 'toship' } })} style={styles.row}>
            <View style={[styles.iconCircle, { backgroundColor: tint(nearest?.tone === 'late' ? colors.danger : colors.warning, 0.15) }]}>
              <Icon name="cube" size={22} color={nearest?.tone === 'late' ? colors.danger : colors.warning} />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="headline" weight="700">
                {toShip.length} sipariş kargolanmayı bekliyor
              </Text>
              {nearest ? (
                <Text variant="footnote" color={nearest.tone === 'late' ? 'danger' : 'textSecondary'}>
                  {nearest.tone === 'late' ? 'Gönderim süresi geçen sipariş var!' : `En yakın son gönderim: ${formatShowTime(nearest.deadline, now)}`}
                </Text>
              ) : null}
            </View>
            <Icon name="chevron-forward" size={18} color="textTertiary" />
          </Card>
        ) : null}

        {pendingOffers > 0 ? (
          <Card onPress={() => setSheet('offers')} style={styles.row}>
            <View style={[styles.iconCircle, { backgroundColor: tint(colors.info, 0.14) }]}>
              <Icon name="pricetag" size={20} color={colors.info} />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="headline" weight="700">
                {pendingOffers} fiyat teklifi yanıt bekliyor
              </Text>
              <Text variant="footnote" color="textSecondary">
                Kabul et, karşı teklif ver ya da reddet
              </Text>
            </View>
            <Icon name="chevron-forward" size={18} color="textTertiary" />
          </Card>
        ) : null}

        {showChecklist ? (
          <Card padded={false}>
            <View style={styles.cardHead}>
              <View style={{ flex: 1 }}>
                <Text variant="headline" weight="700">
                  {allDone ? 'Hazırsın! İlk yayınına çık 🚀' : 'Yayına hazırlık'}
                </Text>
                <Text variant="footnote" color="textSecondary">
                  {doneCount}/{checklist.length} tamamlandı
                </Text>
              </View>
              <Text variant="title3" weight="800">
                %{Math.round((doneCount / checklist.length) * 100)}
              </Text>
            </View>
            <ProgressBar value={doneCount / checklist.length} color={colors.success} style={{ marginHorizontal: 16, marginBottom: 6 }} />
            {checklist.map((c) => (
              <ListRow
                key={c.key}
                title={c.title}
                subtitle={c.done ? 'Tamamlandı' : c.subtitle}
                onPress={c.onPress}
                left={
                  <View style={[styles.check, { borderColor: c.done ? colors.success : colors.textTertiary, backgroundColor: c.done ? colors.success : 'transparent' }]}>
                    {c.done ? <Icon name="checkmark" size={15} color={colors.bg} /> : null}
                  </View>
                }
              />
            ))}
            {allDone ? (
              <View style={{ padding: 16, paddingTop: 4 }}>
                <Button title="Canlıya Geç" icon="videocam" size="lg" fullWidth onPress={() => (upcoming[0] ? startShow(upcoming[0]) : router.push('/seller/go-live'))} />
              </View>
            ) : null}
          </Card>
        ) : null}

        <Card onPress={() => setSheet('tier')}>
          <View style={styles.rowTop}>
            <View style={{ flex: 1 }}>
              <Text variant="footnote" weight="700" color="textSecondary">
                SATIŞ KOMİSYONUN
              </Text>
              <View style={styles.inline}>
                <Text variant="title1">{formatRate(tier.current.rate)}</Text>
                <StatusPill label={tier.current.name} tone="primary" />
              </View>
            </View>
            <Icon name="information-circle-outline" size={22} color="textSecondary" />
          </View>
          <ProgressBar value={tier.progress} color={colors.success} height={8} style={{ marginTop: 12 }} />
          <View style={[styles.inline, { justifyContent: 'space-between', marginTop: 8 }]}>
            <Text variant="footnote" color="textSecondary">
              28 günlük satışın: <Text variant="footnote" weight="700">{formatTRY(tier.sales)}</Text>
            </Text>
            <Text variant="footnote" color="textSecondary">
              {tier.next ? `${tier.next.name}: ${formatTRY(tier.next.min)}` : 'En yüksek seviye'}
            </Text>
          </View>
          <Text variant="callout" style={{ marginTop: 10 }}>
            {tier.next ? (
              <>
                {tier.next.name} için <Text variant="callout" weight="800">{formatTRY(tier.remaining)}</Text> daha satış gerekiyor; ulaşırsan sonraki 28 günün oranı{' '}
                <Text variant="callout" weight="800" color="success">
                  {formatRate(tier.next.rate)}
                </Text>
              </>
            ) : (
              'Seviye tablosunun son basamağındasın.'
            )}
          </Text>
          <Text variant="footnote" color="textTertiary" style={{ marginTop: 4 }}>
            Dönemin {tier.daysElapsed}. günü · {periodOrders} sipariş · bu tempoyla dönem toplamı ≈ {formatTRY(tier.projected)}
          </Text>
        </Card>

        <View style={[styles.balance, { backgroundColor: colors.inverse }]}>
          <View style={styles.balanceCols}>
            <PressableScale scaleTo={0.98} onPress={() => router.push('/seller/payouts')} style={{ flex: 1 }}>
              <Text variant="footnote" color={colors.onInverse} style={{ opacity: 0.7 }}>
                Çekilebilir
              </Text>
              <Text variant="title2" color={colors.onInverse} numberOfLines={1} adjustsFontSizeToFit>
                {formatTRY(balance)}
              </Text>
            </PressableScale>
            <View style={[styles.vr, { backgroundColor: tint(colors.onInverse, 0.2) }]} />
            <PressableScale scaleTo={0.98} onPress={() => router.push('/seller/payouts')} style={{ flex: 1 }}>
              <Text variant="footnote" color={colors.onInverse} style={{ opacity: 0.7 }}>
                Bekleyen
              </Text>
              <Text variant="title2" color={colors.onInverse} numberOfLines={1} adjustsFontSizeToFit>
                {formatTRY(pending)}
              </Text>
            </PressableScale>
          </View>
          <View style={styles.balanceActions}>
            <Button
              title="Para Çek"
              size="sm"
              style={{ flex: 1 }}
              onPress={() =>
                balance > 0
                  ? router.push({ pathname: '/seller/payouts', params: { withdraw: '1' } })
                  : toast('Çekilebilir bakiyen yok. Siparişlerin kargolanınca bakiyene geçer.', 'information-circle')
              }
            />
            <Button title="Ödemeler" size="sm" variant="secondary" iconRight="chevron-forward" style={{ flex: 1 }} onPress={() => router.push('/seller/payouts')} />
          </View>
        </View>

        <View>
          <SectionHeader title="Yaklaşan Yayınlarım" actionLabel={shows.length ? 'Tümü' : undefined} onAction={() => router.push('/seller/shows')} style={{ paddingHorizontal: 0 }} />
          {upcoming.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -SCREEN_PADDING }} contentContainerStyle={{ paddingHorizontal: SCREEN_PADDING, gap: 12 }}>
              {upcoming.map((s) => (
                <UpcomingShowCard key={s.id} show={s} onMore={() => setMoreShow(s)} />
              ))}
              <PressableScale scaleTo={0.97} onPress={() => router.push('/seller/schedule')} style={[styles.addShow, { borderColor: colors.border }]}>
                <Icon name="add-circle-outline" size={30} color="textSecondary" />
                <Text variant="footnote" weight="700" color="textSecondary" align="center">
                  Yeni yayın planla
                </Text>
              </PressableScale>
            </ScrollView>
          ) : (
            <PressableScale scaleTo={0.98} onPress={() => router.push('/seller/schedule')} style={[styles.emptyShow, { borderColor: colors.border }]}>
              <Icon name="calendar-outline" size={28} color="textSecondary" />
              <Text variant="headline" weight="700">
                Henüz planlanmış yayının yok
              </Text>
              <Text variant="footnote" color="textSecondary" align="center">
                Yayınını en az birkaç gün önceden planla; takipçilerin hatırlatıcı kurabilsin.
              </Text>
              <Text variant="subhead" weight="800" color="accent">
                Yayın Planla
              </Text>
            </PressableScale>
          )}
          {upcoming[0] && upcoming[0].status === 'scheduled' ? (
            <Text variant="footnote" color="textSecondary" style={{ marginTop: 8 }}>
              Sıradaki yayının {formatTimeUntil(upcoming[0].scheduledAt, now)} sonra.
            </Text>
          ) : null}
        </View>

        <View>
          <SectionHeader title="Son satışlar" actionLabel={orders.length ? 'Tüm siparişler' : undefined} onAction={() => router.push('/seller/orders')} style={{ paddingHorizontal: 0 }} />
          {recent.length ? (
            <Card padded={false}>
              {recent.map((o, i) => {
                const buyer = resolveBuyer(o.buyerId);
                const bucket = orderBucket(o);
                return (
                  <PressableScale
                    key={o.id}
                    scaleTo={0.99}
                    onPress={() => router.push(`/seller/order/${o.id}`)}
                    style={[styles.sale, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}>
                    <Thumb uri={o.productImage} size={46} />
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text variant="subhead" weight="600" numberOfLines={1}>
                        {o.productTitle}
                      </Text>
                      <View style={styles.inline}>
                        <Avatar uri={buyer.avatar} name={buyer.username} size={14} />
                        <Text variant="footnote" color="textSecondary" numberOfLines={1} style={{ flexShrink: 1 }}>
                          @{buyer.username} · {timeAgo(o.createdAt, now)}
                        </Text>
                      </View>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 3 }}>
                      <Text variant="subhead" weight="800">
                        {formatTRY(o.itemPrice * o.quantity)}
                      </Text>
                      <StatusPill
                        label={SELLER_ORDER_STATUS[o.status]}
                        tone={bucket === 'toship' ? 'warning' : bucket === 'shipped' ? 'info' : bucket === 'delivered' ? 'success' : 'neutral'}
                      />
                    </View>
                  </PressableScale>
                );
              })}
            </Card>
          ) : (
            <Card style={{ alignItems: 'center', gap: 6, paddingVertical: 22 }}>
              <Text style={{ fontSize: 30, lineHeight: 36 }}>🛍️</Text>
              <Text variant="headline" weight="700">
                Henüz satış yok
              </Text>
              <Text variant="footnote" color="textSecondary" align="center">
                İlk satışın canlı yayında ya da mağazanda gerçekleştiğinde burada görünecek.
              </Text>
            </Card>
          )}
        </View>

        <Card padded={false}>
          <ListRow icon="receipt-outline" title="Siparişler" badge={toShip.length || undefined} onPress={() => router.push('/seller/orders')} />
          <ListRow icon="cube-outline" title="Envanter" value={`${listings.length} ürün`} onPress={() => router.push('/seller/inventory')} />
          <ListRow icon="videocam-outline" title="Yayınlarım" onPress={() => router.push('/seller/shows')} />
          <ListRow icon="wallet-outline" title="Ödemeler" onPress={() => router.push('/seller/payouts')} />
          <ListRow icon="bar-chart-outline" title="Analizler" onPress={() => router.push('/seller/analytics')} />
        </Card>
      </ScrollView>

      <HubMenuSheet visible={sheet === 'menu'} onClose={() => setSheet(null)} onOpen={setSheet} />
      <OffersSheet visible={sheet === 'offers'} onClose={() => setSheet(null)} />
      {FEATURES.tips ? <TipsSheet visible={sheet === 'tips'} onClose={() => setSheet(null)} /> : null}
      <HealthSheet visible={sheet === 'health'} onClose={() => setSheet(null)} />
      <ShippingSettingsSheet visible={sheet === 'shipping'} onClose={() => setSheet(null)} />
      <RehearsalSheet visible={sheet === 'rehearsal'} onClose={() => setSheet(null)} />
      <VerifySheet visible={sheet === 'verify'} onClose={() => setSheet(null)} />
      <TierSheet visible={sheet === 'tier'} onClose={() => setSheet(null)} currentLevel={tier.current.level} earnedLevel={tier.earned.level} />
      <ActionSheet visible={!!moreShow} onClose={() => setMoreShow(null)} title={moreShow?.title} subtitle={moreShow ? formatShowTime(moreShow.scheduledAt, now) : undefined} actions={moreShow ? showActions(moreShow) : []} />
      {celebrate ? <Confetti onDone={() => setCelebrate(false)} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: SCREEN_PADDING, paddingBottom: 32, gap: 14 },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  liveDot: { width: 12, height: 12, borderRadius: 6 },
  welcome: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  quickRow: { flexDirection: 'row', gap: 10 },
  quick: { flex: 1, minHeight: 84, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconCircle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  cardHead: { flexDirection: 'row', alignItems: 'center', padding: 16, paddingBottom: 10, gap: 8 },
  check: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  rowTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  balance: { borderRadius: radius.lg, padding: 16, gap: 14 },
  balanceCols: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  vr: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch' },
  balanceActions: { flexDirection: 'row', gap: 10 },
  showCard: { width: 124, gap: 8 },
  showThumb: { width: 124, height: 220, borderRadius: radius.md, overflow: 'hidden' },
  datePill: { position: 'absolute', top: 8, left: 8, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  more: { position: 'absolute', top: 6, right: 6, width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  showInfo: { position: 'absolute', left: 8, right: 8, bottom: 8, gap: 2 },
  addShow: { width: 124, height: 220, borderRadius: radius.md, borderWidth: 1.5, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 10 },
  emptyShow: { borderRadius: radius.lg, borderWidth: 1.5, borderStyle: 'dashed', alignItems: 'center', gap: 6, padding: 20 },
  sale: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
});
