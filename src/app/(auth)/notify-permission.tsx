import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, FadeInDown, FadeInUp, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

import { Logo } from '@/components/Logo';
import { Avatar, Button, Header, Icon, Text, type IconName } from '@/components/ui';
import { getLiveShows, getSellers, getUser } from '@/data';
import { AuthLayout, OnboardingProgress, StepTitle } from '@/features/auth/components';
import { finishOnboarding } from '@/features/auth/session';
import { useAuthFlow } from '@/features/auth/store';
import { formatTRY } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { useSettingsStore, type NotificationPrefs } from '@/store/settings';
import { ForceScheme, liveColors, radius, useTheme } from '@/theme';

type MockPush = { key: string; title: string; body: string; avatar?: string; name?: string; icon?: IconName };

/** Kilit ekranı bildirimi görünümünde örnek kart */
function PushCard({ push, index }: { push: MockPush; index: number }) {
  const { colors } = useTheme();
  return (
    <Animated.View entering={FadeInDown.duration(420).delay(180 + index * 160).springify().damping(16)}>
      <View style={[styles.push, { backgroundColor: colors.surfaceAlt, transform: [{ scale: 1 - index * 0.04 }], opacity: 1 - index * 0.18 }]}>
        <View style={styles.pushHead}>
          <Logo size={16} iconOnly />
          <Text variant="caption" color="textSecondary" style={styles.pushApp}>
            MEZATONLINE
          </Text>
          <Text variant="caption" color="textTertiary">
            {index === 0 ? 'şimdi' : `${index * 4} dk önce`}
          </Text>
        </View>
        <View style={styles.pushBody}>
          {push.avatar ? (
            <Avatar uri={push.avatar} name={push.name ?? 'mezat'} size={34} live={index === 0} />
          ) : (
            <View style={[styles.pushIcon, { backgroundColor: colors.primary }]}>
              <Icon name={push.icon ?? 'notifications'} size={18} color="onPrimary" />
            </View>
          )}
          <View style={styles.pushTexts}>
            <Text variant="subhead" weight="800" numberOfLines={1}>
              {push.title}
            </Text>
            <Text variant="footnote" color="textSecondary" numberOfLines={2}>
              {push.body}
            </Text>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

function Bell() {
  const { colors } = useTheme();
  const swing = useSharedValue(0);
  useEffect(() => {
    swing.set(
      withRepeat(
        withSequence(
          withTiming(-14, { duration: 120, easing: Easing.out(Easing.quad) }),
          withTiming(12, { duration: 140 }),
          withTiming(-8, { duration: 120 }),
          withTiming(5, { duration: 110 }),
          withTiming(0, { duration: 100 }),
          withTiming(0, { duration: 1900 }),
        ),
        -1,
      ),
    );
  }, [swing]);
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${swing.get()}deg` }] }));
  return (
    <Animated.View entering={FadeInUp.duration(400)} style={[styles.bellCircle, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[styles.bellInner, { backgroundColor: colors.primary }]}>
        <Animated.View style={style}>
          <Icon name="notifications" size={44} color="onPrimary" />
        </Animated.View>
      </View>
      <View style={[styles.bellBadge, { backgroundColor: colors.live, borderColor: colors.surface }]}>
        <Text variant="caption" weight="800" color={liveColors.text}>
          3
        </Text>
      </View>
    </Animated.View>
  );
}

const ALL_ON: NotificationPrefs = {
  followedLive: true,
  showReminders: true,
  outbid: true,
  orderUpdates: true,
  messages: true,
  promotions: false,
  priceDrops: true,
};

function NotificationsScreen() {
  const interests = useAuthFlow((s) => s.interests);
  const promotions = useSettingsStore((s) => s.notifications.promotions);
  const setPref = useSettingsStore((s) => s.setNotificationPref);
  const [enabling, setEnabling] = useState(false);

  // Kullanıcının ilgi alanlarından gerçekçi örnek bildirimler
  const live = getLiveShows({ categoryId: interests[0] })[0] ?? getLiveShows()[0];
  const liveSeller = getUser(live?.sellerId) ?? getSellers()[0];
  const other = getSellers(interests[1]).find((u) => u.id !== liveSeller?.id) ?? getSellers()[1];
  const pushes: MockPush[] = [
    {
      key: 'live',
      title: `${liveSeller?.username ?? 'pokemerkez'} canlı yayında 🔴`,
      body: live ? `“${live.title}” başladı. Hemen katıl, ilk teklifi sen ver!` : 'Yayın başladı. Hemen katıl!',
      avatar: liveSeller?.avatar,
      name: liveSeller?.username,
    },
    { key: 'outbid', title: 'Teklifin geçildi ⚡', body: `Yeni en yüksek teklif ${formatTRY(1250)}. Süre bitmeden geri al!`, icon: 'flash' },
    { key: 'won', title: 'Tebrikler, kazandın! 🎉', body: `${other?.username ?? 'satıcı'} siparişini hazırlıyor. Kargo kodu gelince haber vereceğiz.`, icon: 'trophy' },
  ];

  const enable = () => {
    setEnabling(true);
    setTimeout(() => {
      (Object.keys(ALL_ON) as (keyof NotificationPrefs)[]).forEach((k) => setPref(k, k === 'promotions' ? promotions : ALL_ON[k]));
      haptic.success();
      finishOnboarding();
    }, 700);
  };

  const skip = () => {
    haptic.tap();
    finishOnboarding();
  };

  return (
    <AuthLayout
      header={
        <>
          <Header />
          <OnboardingProgress step="notifications" />
        </>
      }
      footer={
        <>
          <Button title="Bildirimleri aç" icon="notifications-outline" size="lg" fullWidth loading={enabling} onPress={enable} />
          <Button title="Şimdi değil" variant="ghost" size="lg" fullWidth disabled={enabling} onPress={skip} />
        </>
      }>
      <View style={styles.illustration}>
        <Bell />
        <View style={styles.pushes}>
          {pushes.map((p, i) => (
            <PushCard key={p.key} push={p} index={i} />
          ))}
        </View>
      </View>
      <StepTitle
        title="Hiçbir yayını kaçırma"
        subtitle="Takip ettiğin satıcılar canlıya geçtiğinde, teklifin geçildiğinde ve siparişin kargoya verildiğinde anında haber verelim."
        style={styles.copy}
      />
    </AuthLayout>
  );
}

export default function OnboardingNotifications() {
  return (
    <ForceScheme scheme="dark">
      <NotificationsScreen />
    </ForceScheme>
  );
}

const styles = StyleSheet.create({
  illustration: { alignItems: 'center', marginTop: 4, marginBottom: 8 },
  bellCircle: { width: 128, height: 128, borderRadius: 64, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  bellInner: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center' },
  bellBadge: { position: 'absolute', top: 14, right: 14, minWidth: 26, height: 26, borderRadius: 13, borderWidth: 3, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  pushes: { alignSelf: 'stretch', gap: 8, marginTop: -14 },
  push: { borderRadius: radius.lg, padding: 12, gap: 8 },
  pushHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pushApp: { flex: 1, letterSpacing: 0.4 },
  pushBody: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pushIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  pushTexts: { flex: 1, gap: 1 },
  copy: { marginTop: 22, marginBottom: 0 },
});
