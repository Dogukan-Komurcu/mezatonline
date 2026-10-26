import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { FollowButton } from '@/components/cards/UserRow';
import { Avatar, Button, Chip, EmptyState, Header, Icon, Text, toast } from '@/components/ui';
import { getCategory, getLiveShowOf, getSellers } from '@/data';
import { AuthLayout, OnboardingProgress, SkipLink, StepTitle } from '@/features/auth/components';
import { useAuthFlow } from '@/features/auth/store';
import { formatCompact, formatRating } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { useSocialStore } from '@/store/social';
import { ForceScheme, SCREEN_PADDING } from '@/theme';
import type { User } from '@/types';

const MIN_LIST = 12;

/** Seçilen kategorilere göre önerilen satıcılar (yetmezse en popülerlerle tamamlanır) */
function suggestedSellers(interests: string[]): User[] {
  if (!interests.length) return getSellers().slice(0, 20);
  const seen = new Set<string>();
  const out: User[] = [];
  const add = (u: User) => {
    if (seen.has(u.id)) return;
    seen.add(u.id);
    out.push(u);
  };
  interests.flatMap((c) => getSellers(c)).sort((a, b) => b.followers - a.followers).forEach(add);
  if (out.length < MIN_LIST) getSellers().forEach((u) => out.length < MIN_LIST && add(u));
  return out;
}

function SellerRow({ user }: { user: User }) {
  const live = !!getLiveShowOf(user.id);
  const category = getCategory(user.categoryIds[0]);
  return (
    <View style={styles.row}>
      <Avatar uri={user.avatar} name={user.username} size={52} live={live} verified={user.badges.includes('verified')} />
      <View style={styles.rowTexts}>
        <View style={styles.nameRow}>
          <Text variant="headline" numberOfLines={1} style={styles.name}>
            {user.username}
          </Text>
          {user.badges.includes('top_seller') ? <Icon name="ribbon" size={14} color="warning" /> : null}
        </View>
        <Text variant="footnote" color="textSecondary" numberOfLines={1}>
          {category ? `${category.shortName} · ` : ''}
          {formatCompact(user.followers)} takipçi
        </Text>
        {user.rating > 0 ? (
          <View style={styles.meta}>
            <Icon name="star" size={11} color="warning" />
            <Text variant="caption" color="textTertiary" numberOfLines={1}>
              {formatRating(user.rating)} · {formatCompact(user.itemsSold)} satış
            </Text>
          </View>
        ) : null}
      </View>
      <FollowButton user={user} />
    </View>
  );
}

function FollowSellersScreen() {
  const interests = useAuthFlow((s) => s.interests);
  const followingIds = useSocialStore((s) => s.followingIds);
  const toggleFollow = useSocialStore((s) => s.toggleFollow);
  const [filter, setFilter] = useState<string>('all');

  const all = suggestedSellers(interests);
  const list = filter === 'all' ? all : all.filter((u) => u.categoryIds.includes(filter));
  const notFollowed = list.filter((u) => !followingIds.includes(u.id));
  const allFollowed = list.length > 0 && notFollowed.length === 0;
  const anyFollowed = all.some((u) => followingIds.includes(u.id));
  const chipIds = interests.filter((id) => all.some((u) => u.categoryIds.includes(id)));

  const followAll = () => {
    if (allFollowed) return;
    notFollowed.forEach((u) => toggleFollow(u.id));
    haptic.success();
    toast.success(`${notFollowed.length} satıcı takip edildi`, 'people');
  };

  const next = () => router.push('/(auth)/notify-permission');

  const header = (
    <View>
      <View style={styles.titlePad}>
        <StepTitle title="Satıcıları takip et" subtitle="Seçtiğin kategorilerde en sevilen satıcılar. Canlı yayına geçtiklerinde ilk sen haberdar ol." style={styles.title} />
      </View>
      {chipIds.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          <Chip label="Tümü" selected={filter === 'all'} onPress={() => setFilter('all')} />
          {chipIds.map((id) => {
            const c = getCategory(id);
            return c ? <Chip key={id} label={c.shortName} emoji={c.emoji} selected={filter === id} onPress={() => setFilter(id)} /> : null;
          })}
        </ScrollView>
      ) : null}
      <View style={styles.sectionRow}>
        <Text variant="subhead" weight="700" color="textSecondary">
          {list.length} önerilen satıcı
        </Text>
        <Button
          title={allFollowed ? 'Tümü takipte' : 'Tümünü takip et'}
          icon={allFollowed ? 'checkmark' : 'person-add-outline'}
          size="sm"
          variant={allFollowed ? 'secondary' : 'outline'}
          disabled={allFollowed}
          onPress={followAll}
        />
      </View>
    </View>
  );

  return (
    <AuthLayout
      scroll={false}
      header={
        <>
          <Header right={<SkipLink onPress={next} />} />
          <OnboardingProgress step="follow" />
        </>
      }
      footer={
        <Button
          title={anyFollowed ? 'Devam' : 'Takip etmeden devam et'}
          variant={anyFollowed ? 'primary' : 'secondary'}
          size="lg"
          fullWidth
          onPress={() => {
            haptic.success();
            next();
          }}
        />
      }>
      <Animated.View entering={FadeIn.duration(250)} style={styles.flex}>
        <FlatList
          data={list}
          keyExtractor={(u) => u.id}
          extraData={followingIds}
          ListHeaderComponent={header}
          ListEmptyComponent={<EmptyState icon="storefront-outline" title="Bu kategoride satıcı yok" message="Başka bir kategori seç ya da tüm satıcılara göz at." actionLabel="Tümünü göster" onAction={() => setFilter('all')} />}
          renderItem={({ item }) => <SellerRow user={item} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      </Animated.View>
    </AuthLayout>
  );
}

export default function FollowSellers() {
  return (
    <ForceScheme scheme="dark">
      <FollowSellersScreen />
    </ForceScheme>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { paddingBottom: 24 },
  titlePad: { paddingHorizontal: SCREEN_PADDING },
  title: { marginBottom: 14 },
  chips: { paddingHorizontal: SCREEN_PADDING, gap: 8, paddingBottom: 14 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SCREEN_PADDING, paddingBottom: 6, gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: SCREEN_PADDING, paddingVertical: 10 },
  rowTexts: { flex: 1, gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { flexShrink: 1 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
