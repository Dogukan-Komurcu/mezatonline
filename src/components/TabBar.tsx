import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { StyleSheet, View } from 'react-native';

import { Avatar, CountBadge, Icon, PressableScale, Text, type IconName } from '@/components/ui';
import { useIsGuest } from '@/features/auth/gate';
import { haptic } from '@/lib/haptics';
import { useMe } from '@/store/auth';
import { useUnreadMessageCount } from '@/store/inbox';
import { useSellerStore } from '@/store/seller';
import { useTheme } from '@/theme';

type TabDef = { label: string; icon: IconName; iconActive: IconName };

const TABS: Record<string, TabDef> = {
  index: { label: 'Ana Sayfa', icon: 'home-outline', iconActive: 'home' },
  categories: { label: 'Kategoriler', icon: 'search-outline', iconActive: 'search' },
  sell: { label: 'Sat', icon: 'add-circle-outline', iconActive: 'add-circle' },
  activity: { label: 'Aktivite', icon: 'chatbubble-ellipses-outline', iconActive: 'chatbubble-ellipses' },
  account: { label: 'Hesap', icon: 'person-circle-outline', iconActive: 'person-circle' },
};

/**
 * Whatnot tarzı alt sekme çubuğu: Ana Sayfa · Kategoriler · Sat (satıcıysa Satıcı Paneli) · Aktivite · Hesap (profil fotoğrafı)
 */
export function TabBar({ state, descriptors, emitter, navigateToTab, insets }: BottomTabBarProps) {
  const { colors } = useTheme();
  const me = useMe();
  const guest = useIsGuest();
  const unreadMessages = useUnreadMessageCount();
  const toShip = useSellerStore((s) => s.orders.filter((o) => o.status === 'paid').length);
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8), backgroundColor: colors.tabBar, borderTopColor: colors.border }]}>
      {state.routes.map((route, index) => {
        const def = TABS[route.name];
        if (!def) return null;
        const focused = index === state.index;
        const options = descriptors[route.key]?.options;
        const onPress = () => {
          haptic.tap();
          const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigateToTab(route.key);
        };
        const color = focused ? colors.text : colors.tabIconInactive;
        const isSellerHub = route.name === 'sell' && me.isSeller && !guest;
        const label = isSellerHub ? 'Satıcı Paneli' : def.label;
        const icon: IconName = isSellerHub ? (focused ? 'grid' : 'grid-outline') : focused ? def.iconActive : def.icon;
        const badge = guest ? 0 : route.name === 'activity' ? unreadMessages : isSellerHub ? toShip : 0;
        return (
          <PressableScale
            key={route.key}
            scaleTo={0.92}
            onPress={onPress}
            style={styles.item}
            accessibilityRole="tab"
            accessibilityLabel={label}
            accessibilityState={{ selected: focused }}
            testID={options?.tabBarButtonTestID}>
            <View>
              {route.name === 'account' ? (
                guest ? (
                  <Icon name={focused ? 'person-circle' : 'person-circle-outline'} size={26} color={color} />
                ) : (
                  <View style={[styles.avatarRing, { borderColor: focused ? colors.text : 'transparent' }]}>
                    <Avatar uri={me.avatar} name={me.username} size={24} />
                  </View>
                )
              ) : (
                <Icon name={icon} size={25} color={color} />
              )}
              {badge > 0 ? <CountBadge count={badge} style={styles.badge} /> : null}
            </View>
            <Text variant="caption" weight={focused ? '700' : '600'} color={color} style={styles.label} numberOfLines={1}>
              {label}
            </Text>
          </PressableScale>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 6 },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2 },
  label: { fontSize: 10, lineHeight: 13 },
  avatarRing: { borderWidth: 1.5, borderRadius: 16, padding: 1 },
  badge: { position: 'absolute', top: -4, right: -10 },
});
