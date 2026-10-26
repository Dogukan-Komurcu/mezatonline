/**
 * "En İyi Satıcılar" şeridi (Whatnot Top Seller Leaderboard, ana sayfa bölümü):
 * madalyalı satıcı kartları + "Canlıya Katıl"; "Daha fazla ›" tam listeyi açar.
 */
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { FlatList, StyleSheet, View } from 'react-native';

import { Avatar, Button, PressableScale, Text } from '@/components/ui';
import { getCategory } from '@/data';
import { ALL_SCOPE, getLeaderboard, type LeaderEntry, type LeaderboardScope } from '@/features/browse/leaderboard';
import { Medal, medalFor, SectionTitle, ViewersMetric } from '@/features/browse/ui';
import { radius, SCREEN_PADDING, useTheme } from '@/theme';

import { Glyph3D } from './Glyph3D';

const CARD_W = 172;

function LeaderCard({ entry }: { entry: LeaderEntry }) {
  const { colors } = useTheme();
  const medal = medalFor(entry.rank);
  const { seller, liveShow } = entry;
  return (
    <PressableScale scaleTo={0.97} onPress={() => router.push(`/user/${seller.username}`)} style={[styles.card, { backgroundColor: colors.surface }]} accessibilityRole="button" accessibilityLabel={`${entry.rank}. ${seller.username}`}>
      <LinearGradient colors={[medal?.tint ?? 'transparent', 'transparent']} style={styles.glow} pointerEvents="none" />
      <View style={styles.avatarWrap}>
        <Avatar uri={seller.avatar} name={seller.username} size={64} live={!!liveShow} />
        <View style={styles.medal}>
          <Medal rank={entry.rank} size={24} />
        </View>
      </View>
      <Text variant="headline" weight="700" numberOfLines={1} align="center" style={styles.name}>
        {seller.username}
      </Text>
      <ViewersMetric viewers={entry.viewers} live={!!liveShow} />
      <Button
        title={liveShow ? 'Canlıya Katıl' : 'Profili Gör'}
        variant={liveShow ? 'inverse' : 'secondary'}
        size="sm"
        fullWidth
        style={styles.cta}
        onPress={() => (liveShow ? router.push(`/live/${liveShow.id}`) : router.push(`/user/${seller.username}`))}
      />
    </PressableScale>
  );
}

export function LeaderboardCarousel({ scope }: { scope: LeaderboardScope }) {
  const entries = getLeaderboard(scope, 'live', 10);
  if (!entries.length) return null;
  const category = scope === ALL_SCOPE ? undefined : getCategory(scope);
  return (
    <View style={styles.wrap}>
      <SectionTitle
        title="En İyi Satıcılar"
        subtitle={category ? `Şu an canlı · ${category.shortName}` : 'Şu an canlı olan en iyiler'}
        onAction={() => router.push(`/top-sellers/${scope}`)}
        left={<Glyph3D name="trophy" size={40} />}
      />
      <FlatList
        data={entries}
        keyExtractor={(e) => e.seller.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ width: 10 }} />}
        renderItem={({ item }) => <LeaderCard entry={item} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingVertical: 18 },
  list: { paddingHorizontal: SCREEN_PADDING },
  card: { width: CARD_W, borderRadius: radius.lg, padding: 12, alignItems: 'center', overflow: 'hidden' },
  glow: { position: 'absolute', left: 0, right: 0, top: 0, height: 90 },
  avatarWrap: { marginTop: 6, marginBottom: 10 },
  medal: { position: 'absolute', top: -8, left: -10 },
  name: { alignSelf: 'stretch', marginBottom: 3 },
  cta: { marginTop: 12 },
});
