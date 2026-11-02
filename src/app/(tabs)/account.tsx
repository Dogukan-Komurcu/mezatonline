import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Logo } from '@/components/Logo';
import { Avatar, Button, CountBadge, EmptyState, Header, Icon, IconButton, PressableScale, Screen, Sheet, Text, toast, type IconName } from '@/components/ui';
import { DEMO_COPY, DEMO_MODE } from '@/config/demo';
import { getUser } from '@/data';
import { useAccountStore } from '@/features/account/store';
import { CARD_BRAND_NAMES, ConfirmSheet, IconCircle, MenuGroup, MenuRow, Tag } from '@/features/account/ui';
import { useQaParams } from '@/features/account/qa';
import { AUTH_REASONS, useIsGuest } from '@/features/auth/gate';
import { GuestPrompt } from '@/features/auth/GuestPrompt';
import { useInboxExtras } from '@/features/inbox/store';
import { shareLink } from '@/features/shared/sheets';
import { formatCompact, formatNumber, formatTRY } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { useAuthStore, useMe } from '@/store/auth';
import { useUnreadMessageCount, useUnreadNotificationCount } from '@/store/inbox';
import { useOrdersStore } from '@/store/orders';
import { useRewardsStore } from '@/store/rewards';
import { useSellerStore } from '@/store/seller';
import { useSettingsStore } from '@/store/settings';
import { useSocialStore } from '@/store/social';
import { selectDefaultAddress, selectDefaultPayment, useWalletStore } from '@/store/wallet';
import { radius, SCREEN_PADDING, useTheme } from '@/theme';
import type { User } from '@/types';

const APPEARANCE_LABEL = { system: 'Sistem', light: 'Açık', dark: 'Koyu' } as const;
const ACTIVE_STATUSES = ['paid', 'preparing', 'shipped', 'out_for_delivery'];
const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';
const VERSION_LABEL = DEMO_MODE ? `${DEMO_COPY.short} · v${APP_VERSION}` : `Mezatonline v${APP_VERSION}`;

export default function AccountScreen() {
  const guest = useIsGuest();
  return guest ? <GuestAccount /> : <MemberAccount />;
}

/** Misafir: giriş istemi + hesap gerektirmeyen ayarlar ve destek */
function GuestAccount() {
  const appearance = useSettingsStore((s) => s.appearance);
  return (
    <Screen>
      <Header large title="Hesap" back={false} />
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        <GuestPrompt
          fill={false}
          icon="person-circle-outline"
          title="Mezatonline’a katıl"
          message="Teklif ver, satıcıları takip et; siparişlerini, cüzdanını ve ödüllerini tek yerden yönet."
          reason={AUTH_REASONS.account}
          style={styles.guestPrompt}
        />
        <MenuGroup title="Uygulama">
          <MenuRow icon="settings-outline" title="Tercihler" value={`Görünüm: ${APPEARANCE_LABEL[appearance]}`} onPress={() => router.push('/settings/preferences')} />
        </MenuGroup>
        <MenuGroup title="Destek">
          <MenuRow icon="help-circle-outline" title="Yardım Merkezi" subtitle="Sık sorulan sorular ve rehberler" onPress={() => router.push('/settings/help')} />
          <MenuRow icon="document-text-outline" title="Yasal & KVKK" onPress={() => router.push('/settings/legal')} />
          <MenuRow icon="business-outline" title="Künye ve İletişim" onPress={() => router.push('/settings/kunye')} />
        </MenuGroup>
        <View style={styles.footer}>
          <Logo size={20} />
          <Text variant="footnote" color="textTertiary">
            {VERSION_LABEL}
          </Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

function MemberAccount() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const me = useMe();
  const signOut = useAuthStore((s) => s.signOut);
  const followingCount = useSocialStore((s) => s.followingIds.length);
  const savedCount = useSocialStore((s) => s.savedProductIds.length + s.remindedShowIds.length);
  const blockedIds = useSocialStore((s) => s.blockedIds);
  const unblock = useSocialStore((s) => s.unblock);
  const orders = useOrdersStore((s) => s.orders);
  const application = useSellerStore((s) => s.application.status);
  const sellerBalance = useSellerStore((s) => s.balance);
  const sellerToShip = useSellerStore((s) => s.orders.filter((o) => o.status === 'paid').length);
  const credits = useWalletStore((s) => s.credits);
  const payment = useWalletStore(selectDefaultPayment);
  const address = useWalletStore(selectDefaultAddress);
  const points = useRewardsStore((s) => s.points);
  const appearance = useSettingsStore((s) => s.appearance);
  const verified = useAccountStore((s) => s.verified);
  const unreadNotifications = useUnreadNotificationCount();
  const unreadMessages = useUnreadMessageCount();
  const supportUnread = useInboxExtras((s) => s.supportUnread);
  const referralCode = useWalletStore((s) => s.referralCode);
  const qa = useQaParams();

  const [blockedOpen, setBlockedOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);

  const isSeller = me.isSeller || application === 'approved';
  const purchases = orders.filter((o) => o.buyerId === me.id || o.buyerId === 'me');
  const activeOrders = purchases.filter((o) => ACTIVE_STATUSES.includes(o.status)).length;
  const blockedUsers = blockedIds.map((id) => getUser(id)).filter((u): u is User => !!u);

  const goActivity = (tab: 'purchases' | 'saved') => router.navigate({ pathname: '/activity', params: { tab } });

  const shareProfile = () =>
    shareLink({ title: `${me.displayName} · Mezatonline`, path: `/user/${me.username}`, message: `Mezatonline'da beni takip et: @${me.username}` });

  const invite = () =>
    shareLink({
      title: "Mezatonline'a katıl",
      path: `/davet/${referralCode}`,
      message: `Mezatonline'a ${referralCode} koduyla üye ol. İlk siparişin sana ulaştığında ikimizin cüzdanına da ₺250 Mezat Kredisi geçiyor 🎁`,
    });

  return (
    <View style={[styles.flex, { backgroundColor: colors.bg }]}>
      {/* Üst ikonlar */}
      <View style={[styles.topBar, { paddingTop: insets.top + 4, backgroundColor: colors.bg }]}>
        <View style={{ flex: 1 }} />
        <PressableScale scaleTo={0.9} onPress={() => router.push('/rewards')} accessibilityRole="button" accessibilityLabel="Ödüller" style={[styles.gift, { backgroundColor: colors.copperSoft }]}>
          <Icon name="gift" size={20} color={colors.copper} />
        </PressableScale>
        <IconButton name="chatbubble-ellipses-outline" badge={unreadMessages + supportUnread} onPress={() => router.push('/inbox')} accessibilityLabel="Mesajlar" />
        <IconButton name="notifications-outline" badge={unreadNotifications} onPress={() => router.push('/notifications')} accessibilityLabel="Bildirimler" />
      </View>
      <ScrollView contentOffset={qa.offset} contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        {/* Profil başlığı */}
        <View style={styles.profile}>
          <PressableScale scaleTo={0.95} onPress={() => router.push('/settings/profile')} accessibilityLabel="Profil fotoğrafını değiştir">
            <Avatar uri={me.avatar} name={me.username} size={56} verified={verified} />
          </PressableScale>
          <View style={{ flex: 1 }}>
            <Text variant="title2" numberOfLines={1}>
              {me.displayName || me.username}
            </Text>
            <Text variant="subhead" color="textSecondary" numberOfLines={1}>
              @{me.username}
            </Text>
          </View>
          <IconButton name="create-outline" variant="surface" size={38} onPress={() => router.push('/settings/profile')} accessibilityLabel="Profili düzenle" />
        </View>
        <View style={styles.profileActions}>
          <PressableScale onPress={() => router.push(`/user/${me.username}`)} style={[styles.pill, { backgroundColor: colors.inverse }]} accessibilityRole="button">
            <Text variant="subhead" weight="700" color={colors.onInverse}>
              Profili görüntüle
            </Text>
            <Icon name="chevron-forward" size={14} color={colors.onInverse} />
          </PressableScale>
          <PressableScale onPress={shareProfile} style={[styles.pill, { backgroundColor: colors.surface }]} accessibilityRole="button">
            <Icon name="share-outline" size={15} />
            <Text variant="subhead" weight="700">
              Paylaş
            </Text>
          </PressableScale>
        </View>

        {/* İstatistikler */}
        <View style={[styles.stats, { backgroundColor: colors.surface }]}>
          <Stat value={formatCompact(me.followers)} label="Takipçi" onPress={() => router.push({ pathname: '/follows/[userId]', params: { userId: me.id, tab: 'followers' } })} />
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <Stat value={formatCompact(followingCount)} label="Takip" onPress={() => router.push({ pathname: '/follows/[userId]', params: { userId: me.id, tab: 'following' } })} />
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          {isSeller ? (
            <Stat value={formatCompact(me.itemsSold)} label="Satış" onPress={() => router.navigate('/sell')} />
          ) : (
            <Stat value={formatCompact(purchases.length)} label="Alış" onPress={() => goActivity('purchases')} />
          )}
        </View>

        {/* Satıcı kartı */}
        <View style={styles.pad}>
          {isSeller ? (
            <PressableScale scaleTo={0.98} onPress={() => router.navigate('/sell')} style={[styles.sellerCard, { backgroundColor: colors.inverse }]} accessibilityRole="button">
              <IconCircle name="grid" size={44} bg={colors.primary} color={colors.onPrimary} />
              <View style={{ flex: 1 }}>
                <Text variant="headline" color={colors.onInverse}>
                  Satıcı Paneli
                </Text>
                <Text variant="footnote" color={colors.onInverse} style={{ opacity: 0.7 }} numberOfLines={2}>
                  {sellerToShip > 0 ? `${sellerToShip} sipariş kargolanmayı bekliyor · ` : ''}Bakiye {formatTRY(sellerBalance)}
                </Text>
              </View>
              {sellerToShip > 0 ? <CountBadge count={sellerToShip} /> : null}
              <Icon name="chevron-forward" size={18} color={colors.onInverse} />
            </PressableScale>
          ) : application === 'pending' ? (
            <PressableScale scaleTo={0.98} onPress={() => router.navigate('/sell')} style={[styles.sellerCard, { backgroundColor: colors.surface }]} accessibilityRole="button">
              <IconCircle name="hourglass-outline" size={44} bg={colors.card} />
              <View style={{ flex: 1 }}>
                <Text variant="headline">Başvurun inceleniyor</Text>
                <Text variant="footnote" color="textSecondary" numberOfLines={2}>
                  {DEMO_MODE ? 'Demo sürümde başvuru kısa süre içinde otomatik onaylanır.' : 'İnceleme bitince sonucu bildirim olarak göndereceğiz.'}
                </Text>
              </View>
              <Tag label="Beklemede" tone="warning" />
            </PressableScale>
          ) : (
            <PressableScale scaleTo={0.98} onPress={() => router.push('/seller/apply')} style={[styles.sellCard, { backgroundColor: colors.primary }]} accessibilityRole="button">
              <Icon name="storefront" size={96} color={colors.onPrimary} style={styles.sellDeco} />
              <Text variant="title3" color={colors.onPrimary}>
                Mezatonline'da satış yap
              </Text>
              <Text variant="subhead" color={colors.onPrimary} style={{ opacity: 0.8, maxWidth: '78%' }}>
                Ürünlerini canlı yayında açık artırmaya çıkar. İlk ay satış komisyonu %0.
              </Text>
              <View style={[styles.sellCta, { backgroundColor: colors.onPrimary }]}>
                <Text variant="subhead" weight="700" color={colors.primary}>
                  Satıcı ol
                </Text>
                <Icon name="arrow-forward" size={14} color={colors.primary} />
              </View>
            </PressableScale>
          )}
        </View>

        {/* Kredi + puan kartları */}
        <View style={[styles.pad, styles.tiles]}>
          <QuickTile icon="wallet-outline" title="Mezat Kredisi" label="Bakiye" value={formatTRY(credits)} onPress={() => router.push('/wallet')} />
          <QuickTile icon="trophy-outline" title="Ödüllerim" label="Puan" value={formatNumber(points)} onPress={() => router.push('/rewards')} />
        </View>

        <MenuGroup title="Alışveriş">
          <MenuRow icon="bag-handle-outline" title="Siparişlerim" value={activeOrders ? `${activeOrders} aktif` : undefined} onPress={() => goActivity('purchases')} />
          <MenuRow icon="bookmark-outline" title="Kaydedilenler" value={savedCount ? String(savedCount) : undefined} onPress={() => goActivity('saved')} />
          <MenuRow icon="wallet-outline" title="Cüzdan & Kredi" value={formatTRY(credits)} onPress={() => router.push('/wallet')} />
          <MenuRow icon="gift-outline" title="Ödüller" value={`${formatNumber(points)} puan`} onPress={() => router.push('/rewards')} />
          <MenuRow icon="person-add-outline" title="Arkadaşını davet et" subtitle="İlk siparişi teslim edilince ₺250 sana, ₺250 arkadaşına" onPress={invite} />
        </MenuGroup>

        <MenuGroup title="Hesap">
          <MenuRow icon="person-circle-outline" title="Profili düzenle" onPress={() => router.push('/settings/profile')} />
          <MenuRow
            icon="card-outline"
            title="Ödeme ve Kargo"
            subtitle={payment ? `${CARD_BRAND_NAMES[payment.brand]} •••• ${payment.last4}` : 'Teklif verebilmek için kart ekle'}
            onPress={() => router.push('/settings/payments')}
          />
          <MenuRow
            icon="location-outline"
            title="Adreslerim"
            subtitle={address ? `${address.title} · ${address.district}/${address.city}` : 'Teslimat adresi ekle'}
            onPress={() => router.push('/settings/addresses')}
          />
          <MenuRow icon="notifications-outline" title="Bildirimler" onPress={() => router.push('/settings/notifications')} />
          <MenuRow icon="hourglass-outline" title="Hesap Kontrolleri" subtitle="İzleme süresi, harcama limitleri, mesajlar" onPress={() => router.push('/settings/account-controls')} />
          <MenuRow
            icon="shield-checkmark-outline"
            title="Doğrulanmış Alıcı"
            right={verified ? <Tag label="Doğrulandı" tone="success" icon="checkmark" /> : <Tag label="Doğrulan" tone="neutral" />}
            onPress={() => router.push('/settings/verified')}
          />
          <MenuRow icon="settings-outline" title="Tercihler" value={`Görünüm: ${APPEARANCE_LABEL[appearance]}`} onPress={() => router.push('/settings/preferences')} />
          <MenuRow icon="ban-outline" title="Engellenen kullanıcılar" value={blockedUsers.length ? String(blockedUsers.length) : undefined} onPress={() => setBlockedOpen(true)} />
        </MenuGroup>

        <MenuGroup title="Destek">
          <MenuRow icon="help-circle-outline" title="Yardım Merkezi" subtitle="Sık sorulan sorular ve rehberler" onPress={() => router.push('/settings/help')} />
          <MenuRow icon="chatbubbles-outline" title="Bize Ulaş" subtitle="Destek ekibiyle sohbet et" badge={supportUnread} onPress={() => router.push('/inbox/support')} />
          <MenuRow icon="document-text-outline" title="Yasal & KVKK" onPress={() => router.push('/settings/legal')} />
          <MenuRow icon="business-outline" title="Künye ve İletişim" onPress={() => router.push('/settings/kunye')} />
        </MenuGroup>

        <View style={[styles.pad, { marginTop: 28 }]}>
          <Button title="Çıkış yap" variant="secondary" size="lg" fullWidth icon="log-out-outline" onPress={() => setLogoutOpen(true)} />
        </View>
        <View style={styles.footer}>
          <Logo size={20} />
          <Text variant="footnote" color="textTertiary">
            {VERSION_LABEL}
          </Text>
        </View>
      </ScrollView>

      <Sheet
        visible={blockedOpen}
        onClose={() => setBlockedOpen(false)}
        title="Engellenen kullanıcılar"
        subtitle="Bu listedekiler sana yazamaz, seni takip edemez ve yayınlarını açamaz. Engeli kaldırmak için kişinin yanındaki düğmeyi kullan."
        showClose
        contentStyle={{ paddingHorizontal: 0 }}>
        {blockedUsers.length ? (
          blockedUsers.map((u) => (
            <View key={u.id} style={styles.blockedRow}>
              <Avatar uri={u.avatar} name={u.username} size={44} />
              <View style={{ flex: 1 }}>
                <Text variant="headline" numberOfLines={1}>
                  {u.username}
                </Text>
                <Text variant="footnote" color="textSecondary" numberOfLines={1}>
                  {u.displayName}
                </Text>
              </View>
              <Button
                title="Engeli kaldır"
                variant="secondary"
                size="sm"
                onPress={() => {
                  unblock(u.id);
                  haptic.success();
                  toast.success(`${u.username} artık engelli değil`);
                }}
              />
            </View>
          ))
        ) : (
          <EmptyState icon="ban-outline" title="Engellediğin kimse yok" message="Bir profilde ya da sohbette ⋯ menüsünden kullanıcıları engelleyebilirsin." />
        )}
      </Sheet>

      <ConfirmSheet
        visible={logoutOpen}
        onClose={() => setLogoutOpen(false)}
        icon="log-out-outline"
        destructive
        title="Çıkış yapılsın mı?"
        message="Misafir olarak gezinmeye ve canlı yayın izlemeye devam edebilirsin. Teklif vermek ve satın almak için yeniden giriş yapman gerekir."
        confirmLabel="Çıkış yap"
        onConfirm={() => {
          setLogoutOpen(false);
          haptic.medium();
          setTimeout(() => {
            signOut();
            toast('Çıkış yapıldı. Görüşmek üzere 👋');
          }, 250);
        }}
      />
    </View>
  );
}

function Stat({ value, label, onPress }: { value: string; label: string; onPress: () => void }) {
  return (
    <PressableScale scaleTo={0.95} onPress={onPress} style={styles.stat} accessibilityRole="button" accessibilityLabel={`${value} ${label}`}>
      <Text variant="title3" tabular>
        {value}
      </Text>
      <Text variant="footnote" color="textSecondary">
        {label}
      </Text>
    </PressableScale>
  );
}

function QuickTile({ icon, title, label, value, onPress }: { icon: IconName; title: string; label: string; value: string; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <PressableScale scaleTo={0.97} onPress={onPress} style={[styles.tile, { backgroundColor: colors.surface }]} accessibilityRole="button" accessibilityLabel={title}>
      <IconCircle name={icon} size={36} bg={colors.card} />
      <Text variant="headline" numberOfLines={1}>
        {title}
      </Text>
      <Text variant="subhead" color="textSecondary" numberOfLines={1}>
        {label}:{' '}
        <Text variant="subhead" weight="700" color="success">
          {value}
        </Text>
      </Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  guestPrompt: { paddingTop: 20, paddingBottom: 24 },
  pad: { paddingHorizontal: SCREEN_PADDING },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingLeft: SCREEN_PADDING, paddingRight: 8, paddingBottom: 2 },
  gift: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', marginRight: 4 },
  profile: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: SCREEN_PADDING, paddingTop: 8 },
  profileActions: { flexDirection: 'row', gap: 8, paddingHorizontal: SCREEN_PADDING, marginTop: 12 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 32, paddingHorizontal: 14, borderRadius: radius.pill },
  stats: { flexDirection: 'row', alignItems: 'center', marginHorizontal: SCREEN_PADDING, marginTop: 16, marginBottom: 16, borderRadius: radius.md, paddingVertical: 12 },
  stat: { flex: 1, alignItems: 'center', gap: 1 },
  statDivider: { width: StyleSheet.hairlineWidth, height: 28 },
  sellerCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius.lg },
  sellCard: { padding: 18, borderRadius: radius.lg, gap: 6, overflow: 'hidden' },
  sellDeco: { position: 'absolute', right: -10, bottom: -14, opacity: 0.12 },
  sellCta: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 14, height: 34, borderRadius: radius.pill, marginTop: 8 },
  tiles: { flexDirection: 'row', gap: 12, marginTop: 12 },
  tile: { flex: 1, borderRadius: radius.md, padding: 14, gap: 6 },
  footer: { alignItems: 'center', gap: 6, marginTop: 24 },
  blockedRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: SCREEN_PADDING, paddingVertical: 10 },
});
