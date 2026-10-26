/**
 * Profil başlığı (Whatnot S50): 3:1 kapak, 96'lık avatar (canlıysa kırmızı halka), kullanıcı adı,
 * puan / satış / kargolama satırı, takip sayıları, biyografi, rozetler, butonlar ve "Şu an canlı" kartı.
 */
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

import { FollowButton } from '@/components/cards/UserRow';
import { Avatar, Button, Icon, LiveBadge, PressableScale, Text, toast } from '@/components/ui';
import { getCategory } from '@/data';
import { formatCompact, formatMonthYear, formatRating, formatShowTime } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { useSocialStore } from '@/store/social';
import { liveColors, radius, SCREEN_PADDING, useTheme } from '@/theme';
import type { Show, User } from '@/types';

import { BadgeRow, shipTimeLabel } from './sections';

export type ProfileHeaderProps = {
  user: User;
  isMe: boolean;
  liveShow?: Show;
  nextShow?: Show;
  followers: number;
  following: number;
  reviewTotal: number;
  rating: number;
  purchases?: number;
  bannerH: number;
  scrollY: SharedValue<number>;
  blocked?: boolean;
  onRatingPress: () => void;
  onMessage: () => void;
  onTip: () => void;
  onShare: () => void;
};

export function ProfileHeader({
  user,
  isMe,
  liveShow,
  nextShow,
  followers,
  following,
  reviewTotal,
  rating,
  purchases,
  bannerH,
  scrollY,
  blocked,
  onRatingPress,
  onMessage,
  onTip,
  onShare,
}: ProfileHeaderProps) {
  const { colors, isDark } = useTheme();
  // Canlı kartı her iki temada da koyu kalır (Whatnot); koyu temada arka plandan ayrışsın diye bir ton açık + kenarlık
  const liveCardStyle = isDark ? { backgroundColor: liveColors.panelAlt, borderWidth: StyleSheet.hairlineWidth, borderColor: liveColors.border } : { backgroundColor: colors.inverse };
  const [bioOpen, setBioOpen] = useState(false);
  const reminded = useSocialStore((s) => (nextShow ? s.remindedShowIds.includes(nextShow.id) : false));
  const cover = user.cover ?? getCategory(user.categoryIds[0])?.image;
  const longBio = user.bio.length > 120;
  const followsHref = (tab: 'followers' | 'following') => router.push({ pathname: '/follows/[userId]', params: { userId: user.id, tab } });

  // iOS'ta aşağı çekince kapak esner
  const bannerStyle = useAnimatedStyle(() => {
    const y = scrollY.get();
    return { transform: [{ translateY: y < 0 ? y / 2 : 0 }, { scale: y < 0 ? 1 + -y / bannerH : 1 }] };
  });

  return (
    <View>
      <Animated.View style={[styles.banner, { height: bannerH, backgroundColor: colors.primary }, bannerStyle]}>
        {cover ? <Image source={{ uri: cover }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} cachePolicy="memory-disk" /> : null}
        <LinearGradient colors={[liveColors.glassStrong, 'transparent']} style={styles.bannerShade} pointerEvents="none" />
      </Animated.View>

      <View style={styles.body}>
        <View style={styles.avatarRow}>
          <PressableScale
            scaleTo={0.95}
            onPress={liveShow ? () => router.push(`/live/${liveShow.id}`) : isMe ? () => router.push('/settings/profile') : undefined}
            style={[styles.avatarWrap, { backgroundColor: colors.bg }]}
            accessibilityLabel={liveShow ? 'Canlı yayına katıl' : 'Profil fotoğrafı'}>
            <Avatar uri={user.avatar} name={user.username} size={96} live={!!liveShow} />
          </PressableScale>
        </View>

        <View style={styles.nameRow}>
          <Text variant="title2" numberOfLines={1} style={styles.shrink}>
            {user.username}
          </Text>
          {user.badges.includes('verified') ? <Icon name="checkmark-circle" size={20} color="info" /> : null}
        </View>
        <Text variant="callout" color="textSecondary" numberOfLines={1}>
          {user.displayName}
        </Text>

        {user.isSeller ? (
          <Text variant="footnote" color="textSecondary" style={styles.statsLine}>
            <Text variant="footnote" weight="700" color="text" onPress={onRatingPress} suppressHighlighting>
              ★ {rating ? formatRating(rating) : '—'}
            </Text>
            <Text variant="footnote" color="textSecondary" onPress={onRatingPress} suppressHighlighting>
              {'\u00A0Puan • '}
            </Text>
            <Text variant="footnote" weight="700" color="text" onPress={onRatingPress} suppressHighlighting>
              {formatCompact(reviewTotal)}
            </Text>
            <Text variant="footnote" color="textSecondary" onPress={onRatingPress} suppressHighlighting>
              {'\u00A0Değerlendirme • '}
            </Text>
            <Text variant="footnote" weight="700" color="text">
              {formatCompact(user.itemsSold)}
            </Text>
            {'\u00A0Satış • '}
            <Text variant="footnote" weight="700" color="text">
              {shipTimeLabel(user.avgShipDays).replace(' ', '\u00A0')}
            </Text>
            {'\u00A0Ort.\u00A0Kargolama'}
          </Text>
        ) : null}

        <View style={styles.followRow}>
          <Text variant="subhead" color="textSecondary" onPress={() => followsHref('following')} suppressHighlighting>
            <Text variant="subhead" weight="800" color="text">
              {formatCompact(following)}
            </Text>{' '}
            takip
          </Text>
          <Text variant="subhead" color="textSecondary" onPress={() => followsHref('followers')} suppressHighlighting>
            <Text variant="subhead" weight="800" color="text">
              {formatCompact(followers)}
            </Text>{' '}
            takipçi
          </Text>
          {purchases !== undefined ? (
            <Text variant="subhead" color="textSecondary">
              <Text variant="subhead" weight="800" color="text">
                {formatCompact(purchases)}
              </Text>{' '}
              alışveriş
            </Text>
          ) : null}
        </View>

        {user.bio ? (
          <View style={styles.bio}>
            <Text variant="callout" numberOfLines={bioOpen || !longBio ? undefined : 3}>
              {user.bio}
            </Text>
            {longBio ? (
              <Text variant="subhead" weight="700" color="accent" onPress={() => setBioOpen((o) => !o)} suppressHighlighting>
                {bioOpen ? 'daha az' : 'devamı'}
              </Text>
            ) : null}
          </View>
        ) : isMe ? (
          <Text variant="callout" color="textTertiary" onPress={() => router.push('/settings/profile')} suppressHighlighting style={styles.bio}>
            + Kendinden bahseden kısa bir biyografi ekle
          </Text>
        ) : null}

        <View style={styles.metaRow}>
          <View style={styles.meta}>
            <Icon name="location-outline" size={14} color="textSecondary" />
            <Text variant="footnote" color="textSecondary">
              {user.city || 'Türkiye'}
            </Text>
          </View>
          <View style={styles.meta}>
            <Icon name="calendar-outline" size={14} color="textSecondary" />
            <Text variant="footnote" color="textSecondary">
              {formatMonthYear(user.joinedAt)} tarihinde katıldı
            </Text>
          </View>
        </View>

        <BadgeRow badges={user.badges} />

        {blocked ? null : isMe ? (
          <View style={styles.buttons}>
            <Button title="Profili düzenle" size="sm" variant="secondary" icon="create-outline" style={styles.btnFlex} onPress={() => router.push('/settings/profile')} />
            <Button title="Paylaş" size="sm" variant="secondary" icon="share-outline" style={styles.btnFlex} onPress={onShare} />
          </View>
        ) : (
          <View style={styles.buttons}>
            <FollowButton user={user} style={styles.btnFlex} />
            <Button title="Mesaj" size="sm" variant="secondary" icon="chatbubble-outline" style={styles.btn} onPress={onMessage} />
            {user.isSeller ? <Button title="Bahşiş" size="sm" variant="secondary" icon="cash-outline" onPress={onTip} style={styles.btn} /> : null}
          </View>
        )}

        {liveShow && !blocked ? (
          <PressableScale scaleTo={0.98} onPress={() => router.push(`/live/${liveShow.id}`)} style={[styles.liveCard, liveCardStyle]} accessibilityRole="button" accessibilityLabel="Canlı yayına katıl">
            <View style={styles.liveThumb}>
              <Image source={{ uri: liveShow.coverImage }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" />
            </View>
            <View style={styles.liveTexts}>
              <LiveBadge viewers={liveShow.viewers} />
              <Text variant="subhead" weight="800" color={liveColors.text} numberOfLines={1}>
                {isMe ? 'ŞU AN CANLIDASIN' : 'ŞU AN CANLI'}
              </Text>
              <Text variant="footnote" color={liveColors.text} numberOfLines={2} style={styles.liveTitle}>
                {liveShow.title}
              </Text>
            </View>
            <Button title={isMe ? 'Yayına dön' : 'Katıl'} size="sm" onPress={() => router.push(isMe ? `/seller/live/${liveShow.id}` : `/live/${liveShow.id}`)} />
          </PressableScale>
        ) : nextShow && !blocked ? (
          <PressableScale scaleTo={0.98} onPress={() => router.push(`/show/${nextShow.id}`)} style={[styles.nextCard, { backgroundColor: colors.surface }]} accessibilityRole="button">
            <Icon name="calendar" size={18} />
            <View style={styles.liveTexts}>
              <Text variant="caption" color="textSecondary">
                Sıradaki yayın · {formatShowTime(nextShow.scheduledAt)}
              </Text>
              <Text variant="subhead" weight="700" numberOfLines={1}>
                {nextShow.title}
              </Text>
            </View>
            {!isMe ? (
              <Button
                title={reminded ? 'Kaydedildi' : 'Hatırlat'}
                size="sm"
                variant={reminded ? 'secondary' : 'inverse'}
                icon={reminded ? 'checkmark' : 'notifications-outline'}
                onPress={() => {
                  const on = useSocialStore.getState().toggleReminder(nextShow.id);
                  haptic.success();
                  toast.success(on ? 'Hatırlatıcı kuruldu 🔔' : 'Hatırlatıcı kaldırıldı', on ? 'notifications' : 'notifications-off');
                }}
              />
            ) : null}
          </PressableScale>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shrink: { flexShrink: 1 },
  banner: { width: '100%', overflow: 'hidden' },
  bannerShade: { position: 'absolute', left: 0, right: 0, top: 0, height: 110 },
  body: { paddingHorizontal: SCREEN_PADDING, gap: 6 },
  avatarRow: { flexDirection: 'row', alignItems: 'flex-end', marginTop: -50, marginBottom: 6 },
  avatarWrap: { borderRadius: 54, padding: 4 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statsLine: { marginTop: 4, lineHeight: 18 },
  followRow: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 16, rowGap: 4, marginTop: 2 },
  bio: { marginTop: 4, gap: 2 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 14, rowGap: 4, marginTop: 2, marginBottom: 4 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  buttons: { flexDirection: 'row', gap: 8, marginTop: 10 },
  btnFlex: { flex: 1, minHeight: 38 },
  btn: { minHeight: 38 },
  liveCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: radius.lg, padding: 10, marginTop: 12 },
  liveThumb: { width: 54, height: 72, borderRadius: radius.sm, overflow: 'hidden' },
  liveTexts: { flex: 1, gap: 3 },
  liveTitle: { opacity: 0.8 },
  nextCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: radius.lg, padding: 12, marginTop: 12 },
});
