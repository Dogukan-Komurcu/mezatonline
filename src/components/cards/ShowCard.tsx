import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Avatar, Icon, LiveBadge, PressableScale, Text, toast } from '@/components/ui';
import { getCategory, getSubcategory, getUser } from '@/data';
import { formatShowTime } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { useSocialStore } from '@/store/social';
import { radius, useTheme } from '@/theme';
import type { Show } from '@/types';
import { AUTH_REASONS, requireAuth } from '@/features/auth/gate';

export type ShowCardProps = {
  show: Show;
  /** Kart genişliği (grid'de hesaplanır) */
  width: number;
  /** Satıcı satırını gizle (profil sayfasında) */
  hideSeller?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** Canlı yayın / planlanmış yayın açılış yolu */
export function openShow(show: Show) {
  if (show.status === 'live') router.push(`/live/${show.id}`);
  else router.push(`/show/${show.id}`);
}

/**
 * Whatnot yayın kartı: üstte satıcı avatar+kullanıcı adı, 3:4 kapak (sol üstte "Canlı · 284"),
 * altta başlık, mor kategori linki + gri alt etiketler.
 */
export function ShowCard({ show, width, hideSeller, style }: ShowCardProps) {
  const { colors } = useTheme();
  const seller = getUser(show.sellerId);
  const category = getCategory(show.categoryId);
  const reminded = useSocialStore((s) => s.remindedShowIds.includes(show.id));
  const toggleReminder = useSocialStore((s) => s.toggleReminder);
  const tags = show.tags.map((t) => getSubcategory(show.categoryId, t)?.name).filter(Boolean) as string[];
  const imageH = Math.round(width * 1.33);

  return (
    <PressableScale onPress={() => openShow(show)} style={[{ width }, style]} accessibilityRole="button" accessibilityLabel={show.title}>
      {!hideSeller && seller ? (
        <PressableScale scaleTo={0.98} onPress={() => router.push(`/user/${seller.username}`)} style={styles.sellerRow}>
          <Avatar uri={seller.avatar} name={seller.username} size={22} />
          <Text variant="footnote" weight="600" numberOfLines={1} style={{ flex: 1 }}>
            {seller.username}
          </Text>
        </PressableScale>
      ) : null}
      <View style={[styles.cover, { height: imageH, backgroundColor: colors.skeleton }]}>
        <Image source={{ uri: show.coverImage }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} cachePolicy="memory-disk" recyclingKey={show.id} />
        <LinearGradient colors={['rgba(0,0,0,0.35)', 'transparent']} style={styles.topShade} />
        <View style={styles.badgeRow}>
          {show.status === 'live' ? (
            <LiveBadge viewers={show.viewers} />
          ) : (
            <View style={styles.timePill}>
              <Text variant="caption" color="#FFFFFF" weight="700">
                {formatShowTime(show.scheduledAt)}
              </Text>
            </View>
          )}
        </View>
        {show.status === 'scheduled' ? (
          <PressableScale
            scaleTo={0.85}
            onPress={() =>
              requireAuth(
                () => {
                  const on = toggleReminder(show.id);
                  haptic.success();
                  toast.success(on ? 'Hatırlatıcı kuruldu 🔔' : 'Hatırlatıcı kaldırıldı', on ? 'notifications' : 'notifications-off');
                },
                { reason: AUTH_REASONS.remind },
              )
            }
            style={styles.bookmark}
            accessibilityLabel="Hatırlatıcı">
            <Icon name={reminded ? 'bookmark' : 'bookmark-outline'} size={18} color={reminded ? colors.primary : '#FFFFFF'} />
          </PressableScale>
        ) : null}
        {show.highlights.length ? (
          <View style={styles.highlightRow}>
            <View style={styles.highlight}>
              <Text variant="caption" color="#0A0A0A" weight="700" numberOfLines={1}>
                {show.highlights[0]}
              </Text>
            </View>
          </View>
        ) : null}
      </View>
      <Text variant="subhead" weight="600" numberOfLines={2} style={styles.title}>
        {show.title}
      </Text>
      <Text variant="footnote" numberOfLines={1} color="textSecondary">
        <Text variant="footnote" weight="600" color="accent">
          {category?.shortName ?? ''}
        </Text>
        {tags.length ? ` · ${tags.join(', ')}` : ''}
      </Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  sellerRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  cover: { borderRadius: radius.md, overflow: 'hidden' },
  topShade: { position: 'absolute', left: 0, right: 0, top: 0, height: 56 },
  badgeRow: { position: 'absolute', top: 8, left: 8 },
  timePill: { backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  bookmark: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  highlightRow: { position: 'absolute', left: 8, bottom: 8, right: 8, flexDirection: 'row' },
  highlight: { backgroundColor: '#FFE414', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, maxWidth: '100%' },
  title: { marginTop: 8, marginBottom: 2 },
});
