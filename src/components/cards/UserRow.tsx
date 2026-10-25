import { router } from 'expo-router';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Avatar, Button, Icon, PressableScale, Text, toast } from '@/components/ui';
import { getLiveShowOf } from '@/data';
import { formatCompact, formatRating } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { ME_ID } from '@/store/auth';
import { useSocialStore } from '@/store/social';
import { SCREEN_PADDING } from '@/theme';
import type { User } from '@/types';

/** Takip Et / Takip Ediliyor butonu */
export function FollowButton({ user, size = 'sm', style, variant }: { user: User; size?: 'sm' | 'md'; style?: StyleProp<ViewStyle>; variant?: 'primary' | 'glass' }) {
  const following = useSocialStore((s) => s.followingIds.includes(user.id));
  const toggle = useSocialStore((s) => s.toggleFollow);
  if (user.id === ME_ID) return null;
  return (
    <Button
      title={following ? 'Takiptesin' : 'Takip Et'}
      size={size}
      variant={following ? (variant === 'glass' ? 'glass' : 'secondary') : 'primary'}
      icon={following ? 'checkmark' : undefined}
      style={style}
      onPress={() => {
        const on = toggle(user.id);
        haptic.success();
        if (on) toast.success(`${user.username} takip ediliyor`, 'person-add');
      }}
    />
  );
}

/** Kullanıcı / satıcı satırı: avatar, ad, puan, takipçi + Takip Et */
export function UserRow({ user, subtitle, showFollow = true, style }: { user: User; subtitle?: string; showFollow?: boolean; style?: StyleProp<ViewStyle> }) {
  const live = user.isSeller && !!getLiveShowOf(user.id);
  return (
    <PressableScale scaleTo={0.99} onPress={() => router.push(`/user/${user.username}`)} style={[styles.row, style]}>
      <Avatar uri={user.avatar} name={user.username} size={48} live={live} verified={user.badges.includes('verified')} />
      <View style={styles.texts}>
        <View style={styles.nameRow}>
          <Text variant="headline" numberOfLines={1} style={{ flexShrink: 1 }}>
            {user.username}
          </Text>
          {user.badges.includes('top_seller') ? <Icon name="ribbon" size={14} color="warning" /> : null}
        </View>
        <Text variant="footnote" color="textSecondary" numberOfLines={1}>
          {subtitle ??
            (user.isSeller
              ? `★ ${formatRating(user.rating)} · ${formatCompact(user.followers)} takipçi · ${formatCompact(user.itemsSold)} satış`
              : `${formatCompact(user.followers)} takipçi`)}
        </Text>
      </View>
      {showFollow ? <FollowButton user={user} /> : null}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: SCREEN_PADDING, paddingVertical: 10 },
  texts: { flex: 1, gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
