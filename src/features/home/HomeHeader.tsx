/**
 * Ana sayfa üst satırı: "Mezatonline'da ara" hapı + Gelen Kutusu + Bildirimler + Ödüller (hediye).
 */
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { CountBadge, Icon, PressableScale, type IconName } from '@/components/ui';
import { AUTH_REASONS, requireAuth, useIsGuest } from '@/features/auth/gate';
import { SearchPill } from '@/features/browse/ui';
import { haptic } from '@/lib/haptics';
import { useUnreadMessageCount, useUnreadNotificationCount } from '@/store/inbox';
import { SCREEN_PADDING, useTheme } from '@/theme';

function HeaderIcon({ name, badge, onPress, label }: { name: IconName; badge: number; onPress: () => void; label: string }) {
  return (
    <PressableScale
      scaleTo={0.88}
      hitSlop={8}
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={badge ? `${label}, ${badge} okunmamış` : label}
      style={styles.icon}>
      <Icon name={name} size={27} color="text" />
      {badge > 0 ? <CountBadge count={badge} style={styles.badge} /> : null}
    </PressableScale>
  );
}

export function HomeHeader() {
  const { colors, isDark } = useTheme();
  const guest = useIsGuest();
  const unreadMessages = useUnreadMessageCount();
  const unreadNotifications = useUnreadNotificationCount();
  return (
    <View style={styles.row}>
      <SearchPill placeholder="Mezatonline'da ara" style={styles.search} />
      <HeaderIcon name="chatbubble-ellipses-outline" label="Gelen Kutusu" badge={guest ? 0 : unreadMessages} onPress={() => requireAuth(() => router.push('/inbox'), { reason: AUTH_REASONS.inbox })} />
      <HeaderIcon name="notifications-outline" label="Bildirimler" badge={guest ? 0 : unreadNotifications} onPress={() => requireAuth(() => router.push('/notifications'), { reason: AUTH_REASONS.notifications })} />
      <PressableScale
        scaleTo={0.88}
        hitSlop={6}
        onPress={() => {
          haptic.light();
          requireAuth(() => router.push('/rewards'), { reason: AUTH_REASONS.rewards });
        }}
        accessibilityRole="button"
        accessibilityLabel="Ödüller"
        style={[styles.gift, { backgroundColor: isDark ? colors.primary : colors.inverse }]}>
        <Icon name="gift-outline" size={21} color={isDark ? colors.onPrimary : colors.primary} />
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { height: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: SCREEN_PADDING, gap: 12 },
  search: { flex: 1 },
  icon: { width: 30, height: 32, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: -3, right: -7 },
  gift: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
