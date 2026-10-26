import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { SectionList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar, Chip, EmptyState, Header, Icon, IconButton, PressableScale, Screen, Text, toast, type IconName } from '@/components/ui';
import { getUser } from '@/data';
import { useQaParams } from '@/features/account/qa';
import { timeAgoLong } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { useInboxStore } from '@/store/inbox';
import { radius, SCREEN_PADDING, useTheme, type ColorTokens } from '@/theme';
import type { AppNotification, NotificationType } from '@/types';

type Visual = { icon: IconName; tone: keyof ColorTokens; style: 'avatar' | 'thumb' | 'icon' };

const VISUALS: Record<NotificationType, Visual> = {
  show_live: { icon: 'radio', tone: 'live', style: 'avatar' },
  show_reminder: { icon: 'alarm', tone: 'warning', style: 'avatar' },
  outbid: { icon: 'trending-up', tone: 'danger', style: 'thumb' },
  won: { icon: 'trophy', tone: 'primary', style: 'thumb' },
  giveaway_won: { icon: 'gift', tone: 'primary', style: 'thumb' },
  order_shipped: { icon: 'cube', tone: 'info', style: 'thumb' },
  order_delivered: { icon: 'checkmark-circle', tone: 'success', style: 'thumb' },
  new_follower: { icon: 'person-add', tone: 'accent', style: 'avatar' },
  review: { icon: 'star', tone: 'warning', style: 'avatar' },
  price_drop: { icon: 'trending-down', tone: 'success', style: 'thumb' },
  offer: { icon: 'pricetag', tone: 'accent', style: 'thumb' },
  promo: { icon: 'gift', tone: 'primary', style: 'icon' },
  payout: { icon: 'cash', tone: 'success', style: 'icon' },
};

const DAY = 86_400_000;

function sectionOf(iso: string, now: number): 'Bugün' | 'Bu hafta' | 'Daha eski' {
  const d = new Date(iso);
  const today = new Date(now);
  const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  if (d.getTime() >= startToday) return 'Bugün';
  if (d.getTime() >= startToday - 6 * DAY) return 'Bu hafta';
  return 'Daha eski';
}

function NotificationVisual({ n }: { n: AppNotification }) {
  const { colors } = useTheme();
  const v = VISUALS[n.type] ?? VISUALS.promo;
  const actor = getUser(n.actorId);
  const badge = (
    <View style={[styles.badge, { backgroundColor: colors[v.tone], borderColor: colors.bg }]}>
      <Icon name={v.icon} size={10} color={v.tone === 'primary' || v.tone === 'warning' ? colors.onPrimary : '#FFFFFF'} />
    </View>
  );
  if (v.style === 'avatar' && (n.image || actor)) {
    return (
      <View>
        <Avatar uri={n.image ?? actor?.avatar} name={actor?.username ?? n.title} size={48} live={n.type === 'show_live'} />
        {n.type !== 'show_live' ? badge : null}
      </View>
    );
  }
  if (v.style === 'thumb' && n.image) {
    return (
      <View>
        <Image source={{ uri: n.image }} style={[styles.thumb, { backgroundColor: colors.skeleton }]} contentFit="cover" cachePolicy="memory-disk" recyclingKey={n.id} />
        {badge}
      </View>
    );
  }
  const bg = colors[v.tone];
  return (
    <View style={[styles.iconCircle, { backgroundColor: bg }]}>
      <Icon name={v.icon} size={22} color={v.tone === 'primary' || v.tone === 'warning' ? colors.onPrimary : '#FFFFFF'} />
    </View>
  );
}

export default function NotificationsScreen() {
  const qa = useQaParams();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const notifications = useInboxStore((s) => s.notifications);
  const markRead = useInboxStore((s) => s.markNotificationRead);
  const markAll = useInboxStore((s) => s.markAllNotificationsRead);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [now] = useState(() => Date.now());

  const unread = notifications.filter((n) => !n.read).length;

  const sections = useMemo(() => {
    const list = filter === 'unread' ? notifications.filter((n) => !n.read) : notifications;
    const sorted = [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const order: ('Bugün' | 'Bu hafta' | 'Daha eski')[] = ['Bugün', 'Bu hafta', 'Daha eski'];
    return order
      .map((title) => ({ title, data: sorted.filter((n) => sectionOf(n.createdAt, now) === title) }))
      .filter((s) => s.data.length > 0);
  }, [notifications, filter, now]);

  const readAll = () => {
    markAll();
    haptic.success();
    toast.success('Tüm bildirimler okundu olarak işaretlendi', 'checkmark-done');
  };

  const open = (n: AppNotification) => {
    haptic.tap();
    if (!n.read) markRead(n.id);
    if (n.href) router.navigate(n.href as Parameters<typeof router.navigate>[0]);
  };

  return (
    <Screen>
      <Header
        title="Bildirimler"
        right={
          <>
            <IconButton name="checkmark-done-outline" disabled={unread === 0} color={unread === 0 ? colors.textTertiary : undefined} accessibilityLabel="Tümünü okundu işaretle" onPress={readAll} />
            <IconButton name="settings-outline" accessibilityLabel="Bildirim ayarları" onPress={() => router.push('/settings/notifications')} />
          </>
        }
      />
      <SectionList
        contentOffset={qa.offset}
        sections={sections}
        keyExtractor={(n) => n.id}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24, flexGrow: 1 }}
        ListHeaderComponent={
          <View style={styles.top}>
            <Chip label="Tümü" selected={filter === 'all'} onPress={() => setFilter('all')} />
            <Chip label="Okunmamış" count={unread ? String(unread) : undefined} selected={filter === 'unread'} onPress={() => setFilter('unread')} />
          </View>
        }
        renderSectionHeader={({ section }) => (
          <Text variant="title3" style={styles.sectionTitle}>
            {section.title}
          </Text>
        )}
        ListEmptyComponent={
          filter === 'unread' ? (
            <EmptyState icon="checkmark-done-outline" title="Hepsini okudun 🎉" message="Okunmamış bildirimin yok." actionLabel="Tümünü göster" onAction={() => setFilter('all')} />
          ) : (
            <EmptyState
              icon="notifications-outline"
              title="Henüz bildirimin yok"
              message="Yayınları izle, satıcıları takip et ve mezatlara katıl; gelişmelerden ilk sen haberdar ol."
              actionLabel="Yayınları keşfet"
              onAction={() => router.navigate('/')}
            />
          )
        }
        renderItem={({ item: n }) => (
          <PressableScale scaleTo={0.985} onPress={() => open(n)} style={styles.row} accessibilityRole="button" accessibilityLabel={n.title}>
            {!n.read ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: colors.primary, opacity: 0.1 }]} /> : null}
            <NotificationVisual n={n} />
            <View style={styles.texts}>
              <Text variant="callout" weight={n.read ? '600' : '800'} numberOfLines={2}>
                {n.title}
              </Text>
              {n.body ? (
                <Text variant="subhead" weight="400" color="textSecondary" numberOfLines={2}>
                  {n.body}
                </Text>
              ) : null}              <Text variant="footnote" color="textTertiary">
                {timeAgoLong(n.createdAt)}
              </Text>
            </View>
            {!n.read ? <View style={[styles.dot, { backgroundColor: colors.accent }]} /> : <View style={styles.dotSpace} />}
          </PressableScale>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: SCREEN_PADDING, paddingTop: 4, paddingBottom: 4 },
  sectionTitle: { paddingHorizontal: SCREEN_PADDING, paddingTop: 18, paddingBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: SCREEN_PADDING, paddingVertical: 12 },
  texts: { flex: 1, gap: 2 },
  thumb: { width: 48, height: 48, borderRadius: radius.sm },
  iconCircle: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', right: -4, bottom: -4, width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 9, height: 9, borderRadius: 5 },
  dotSpace: { width: 9 },
});
