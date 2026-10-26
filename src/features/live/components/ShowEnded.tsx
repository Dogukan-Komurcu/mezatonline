import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar, Button, Icon, LiveBadge, PressableScale, Text, toast } from '@/components/ui';
import { getUser } from '@/data';
import { formatCompact, formatRating, formatShowTime } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { useSocialStore } from '@/store/social';
import { liveColors } from '@/theme';
import type { Show, User } from '@/types';

import { PANEL } from './styles';

export type ShowEndedProps = {
  seller: User;
  following: boolean;
  soldCount: number;
  nextShow?: Show;
  upcoming: Show[];
  /** Sayfa görünürken geri sayım işler */
  active: boolean;
  onFollow: () => void;
  onRaid: () => void;
  onHome: () => void;
};

const RAID_SECONDS = 10;

/** S34: "Yayın sona erdi" + sıradaki canlı yayına geçiş (raid) + satıcının yaklaşan yayınları */
export function ShowEnded({ seller, following, soldCount, nextShow, upcoming, active, onFollow, onRaid, onHome }: ShowEndedProps) {
  const insets = useSafeAreaInsets();
  const [count, setCount] = useState(RAID_SECONDS);
  const [cancelled, setCancelled] = useState(false);
  const reminded = useSocialStore((s) => s.remindedShowIds);
  const toggleReminder = useSocialStore((s) => s.toggleReminder);
  const nextSeller = nextShow ? getUser(nextShow.sellerId) : undefined;
  const raidRef = useRef(onRaid);
  useEffect(() => {
    raidRef.current = onRaid;
  });

  useEffect(() => {
    if (!nextShow || cancelled || !active) return;
    if (count <= 0) {
      raidRef.current();
      return;
    }
    const t = setTimeout(() => setCount((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [count, cancelled, nextShow, active]);

  return (
    <Animated.View entering={FadeIn.duration(300)} style={styles.overlay}>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 }]} showsVerticalScrollIndicator={false} nestedScrollEnabled>
        <Animated.View entering={FadeInDown.springify().damping(18)} style={styles.card}>
          <Text variant="title2" weight="900" color={liveColors.text} align="center">
            Yayın sona erdi
          </Text>
          <Text variant="footnote" color={liveColors.textSecondary} align="center">
            {soldCount > 0 ? `Bu yayında ${soldCount} ürün yeni sahibini buldu 🎉` : 'İzlediğin için teşekkürler 💛'}
          </Text>
          <Avatar uri={seller.avatar} name={seller.username} size={72} style={styles.avatar} />
          <Text variant="headline" weight="800" color={liveColors.text}>
            {seller.username}
          </Text>
          <Text variant="caption" color={liveColors.textSecondary}>
            {formatCompact(seller.followers)} takipçi · ★ {formatRating(seller.rating)}
          </Text>
          <Button
            title={following ? 'Takiptesin' : 'Takip Et'}
            icon={following ? 'checkmark' : 'person-add'}
            variant={following ? 'glass' : 'primary'}
            size="md"
            onPress={onFollow}
            style={styles.follow}
          />
        </Animated.View>

        {nextShow ? (
          <Animated.View entering={FadeInDown.delay(120).springify().damping(18)} style={styles.card}>
            <Text variant="caption" weight="800" color={liveColors.primary}>
              SIRADAKİ CANLI YAYIN
            </Text>
            <PressableScale scaleTo={0.98} onPress={onRaid} style={styles.next}>
              <View style={styles.nextCover}>
                <Image source={{ uri: nextShow.coverImage }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" />
                <LiveBadge style={styles.nextBadge} />
              </View>
              <View style={styles.flex}>
                <View style={styles.nextSeller}>
                  {nextSeller ? <Avatar uri={nextSeller.avatar} name={nextSeller.username} size={20} /> : null}
                  <Text variant="footnote" weight="700" color={liveColors.text} numberOfLines={1} style={styles.flex}>
                    {nextSeller?.username}
                  </Text>
                </View>
                <Text variant="subhead" weight="700" color={liveColors.text} numberOfLines={3}>
                  {nextShow.title}
                </Text>
                <Text variant="caption" weight="600" color={liveColors.textSecondary} style={styles.nextViewers}>
                  {formatCompact(nextShow.viewers)} kişi izliyor
                </Text>
              </View>
            </PressableScale>
            <Button
              title={cancelled ? 'Sıradaki canlı yayına geç' : `Sıradaki canlı yayına geç (${count})`}
              size="lg"
              fullWidth
              iconRight="arrow-forward"
              onPress={() => {
                haptic.medium();
                onRaid();
              }}
            />
            {!cancelled ? (
              <Text variant="footnote" weight="700" color={liveColors.textSecondary} align="center" onPress={() => setCancelled(true)} suppressHighlighting style={styles.cancel}>
                Burada kal
              </Text>
            ) : null}
          </Animated.View>
        ) : null}

        {upcoming.length ? (
          <Animated.View entering={FadeInDown.delay(220).springify().damping(18)} style={[styles.card, styles.left]}>
            <Text variant="headline" weight="800" color={liveColors.text}>
              {seller.username} yakında yine canlıda
            </Text>
            {upcoming.slice(0, 3).map((s) => {
              const on = reminded.includes(s.id);
              return (
                <View key={s.id} style={styles.upRow}>
                  <Image source={{ uri: s.coverImage }} style={styles.upThumb} contentFit="cover" cachePolicy="memory-disk" />
                  <View style={styles.flex}>
                    <Text variant="caption" weight="800" color={liveColors.primary}>
                      {formatShowTime(s.scheduledAt)}
                    </Text>
                    <Text variant="footnote" weight="600" color={liveColors.text} numberOfLines={2}>
                      {s.title}
                    </Text>
                  </View>
                  <PressableScale
                    scaleTo={0.9}
                    onPress={() => {
                      const v = toggleReminder(s.id);
                      haptic.success();
                      toast.success(v ? 'Hatırlatıcı kuruldu 🔔' : 'Hatırlatıcı kaldırıldı', v ? 'notifications' : 'notifications-off');
                    }}
                    style={[styles.remind, on && styles.remindOn]}
                    accessibilityLabel="Hatırlatıcı">
                    <Icon name={on ? 'notifications' : 'notifications-outline'} size={16} color={on ? liveColors.onPrimary : liveColors.text} />
                  </PressableScale>
                </View>
              );
            })}
          </Animated.View>
        ) : null}

        <Button title="Ana sayfaya dön" variant="glass" size="lg" fullWidth onPress={onHome} />
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: liveColors.glassStrong, zIndex: 40 },
  scroll: { paddingHorizontal: 20, gap: 12 },
  flex: { flex: 1 },
  card: { backgroundColor: PANEL, borderRadius: 22, padding: 16, alignItems: 'center', gap: 6, borderWidth: StyleSheet.hairlineWidth, borderColor: liveColors.border },
  left: { alignItems: 'stretch' },
  avatar: { marginTop: 10 },
  follow: { marginTop: 8, minWidth: 160 },
  next: { flexDirection: 'row', gap: 12, alignSelf: 'stretch', marginVertical: 6 },
  nextCover: { width: 72, height: 96, borderRadius: 10, overflow: 'hidden', backgroundColor: liveColors.panelAlt },
  nextBadge: { position: 'absolute', top: 5, left: 5 },
  nextSeller: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  nextViewers: { marginTop: 4 },
  cancel: { paddingVertical: 6 },
  upRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  upThumb: { width: 44, height: 58, borderRadius: 8, backgroundColor: liveColors.panelAlt },
  remind: { width: 34, height: 34, borderRadius: 17, backgroundColor: liveColors.glassLight, alignItems: 'center', justifyContent: 'center' },
  remindOn: { backgroundColor: liveColors.primary },
});
