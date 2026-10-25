/**
 * Takipçiler / Takip edilenler (Whatnot S51). Parametre: userId ('me' = ben), tab=followers|following
 */
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { UserRow } from '@/components/cards/UserRow';
import { EmptyState, Header, Screen, Text, TextField, UnderlineTabs } from '@/components/ui';
import { shareLink } from '@/features/shared/sheets';
import { getFollowers, getFollowingOf, getUser } from '@/data';
import { formatCompact } from '@/lib/format';
import { ME_ID, useMe } from '@/store/auth';
import { useSocialStore } from '@/store/social';
import { SCREEN_PADDING } from '@/theme';
import type { User } from '@/types';

type FollowTab = 'followers' | 'following';

function norm(s: string): string {
  return s
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c');
}

export default function FollowsScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ userId: string; tab?: string }>();
  const me = useMe();
  const followingIds = useSocialStore((s) => s.followingIds);
  const blockedIds = useSocialStore((s) => s.blockedIds);
  const [tab, setTab] = useState<FollowTab>(params.tab === 'following' ? 'following' : 'followers');
  const [query, setQuery] = useState('');

  const isMe = params.userId === 'me' || params.userId === ME_ID;
  const user = isMe ? me : getUser(params.userId);

  if (!user) {
    return (
      <Screen>
        <Header title="Takip" />
        <EmptyState emoji="🕵️" title="Kullanıcı bulunamadı" message="Bu hesap kapatılmış olabilir." actionLabel="Geri dön" onAction={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
      </Screen>
    );
  }

  const iFollowThem = !isMe && followingIds.includes(user.id);
  const followerCount = isMe ? me.followers : user.followers + (iFollowThem ? 1 : 0);
  const followingCount = isMe ? followingIds.length : user.following;

  const followers: User[] = isMe ? [] : getFollowers(user.id);
  const following: User[] = isMe ? followingIds.map((id) => getUser(id)).filter((u): u is User => !!u) : getFollowingOf(user.id);
  const source = (tab === 'followers' ? followers : following).filter((u) => !blockedIds.includes(u.id));
  const q = norm(query.trim());
  const list = q ? source.filter((u) => norm(u.username).includes(q) || norm(u.displayName).includes(q)) : source;
  const total = tab === 'followers' ? followerCount : followingCount;
  const more = !q && !isMe ? Math.max(0, total - source.length) : 0;

  const empty = q
    ? { emoji: '🔍', title: `“${query.trim()}” için sonuç yok`, message: 'Kullanıcı adını kontrol edip tekrar dene.' }
    : isMe && tab === 'followers'
      ? { emoji: '👋', title: 'Henüz takipçin yok', message: 'Profilini paylaş; arkadaşların seni takip etsin, canlı yayınlarından haberdar olsun.', actionLabel: 'Profilini paylaş', onAction: () => shareLink({ title: `@${me.username} · Mezatonline`, path: `/user/${me.username}` }) }
      : isMe
        ? { emoji: '✨', title: 'Henüz kimseyi takip etmiyorsun', message: 'Sevdiğin satıcıları takip et; canlı yayına başladıklarında ilk sen haberdar ol.', actionLabel: 'Satıcıları keşfet', onAction: () => router.navigate('/categories') }
        : { emoji: '👥', title: tab === 'followers' ? 'Takipçi yok' : 'Takip edilen yok', message: `@${user.username} için gösterilecek kimse yok.` };

  return (
    <Screen>
      <Header title={user.username} subtitle={user.displayName} />
      <UnderlineTabs
        equal
        tabs={[
          { key: 'followers', label: `${formatCompact(followerCount)} Takipçi` },
          { key: 'following', label: `${formatCompact(followingCount)} Takip` },
        ]}
        value={tab}
        onChange={(t) => {
          setTab(t);
          setQuery('');
        }}
      />
      <FlatList
        data={list}
        keyExtractor={(u) => u.id}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        ListHeaderComponent={
          source.length ? (
            <View style={styles.search}>
              <TextField icon="search" placeholder="Kullanıcı ara" value={query} onChangeText={setQuery} autoCapitalize="none" autoCorrect={false} clearButtonMode="while-editing" returnKeyType="search" />
            </View>
          ) : undefined
        }
        renderItem={({ item }) => (
          <UserRow user={item} subtitle={item.isSeller ? undefined : `${item.displayName} · ${formatCompact(item.followers)} takipçi`} />
        )}
        ListEmptyComponent={<EmptyState emoji={empty.emoji} title={empty.title} message={empty.message} actionLabel={'actionLabel' in empty ? empty.actionLabel : undefined} onAction={'onAction' in empty ? empty.onAction : undefined} />}
        ListFooterComponent={
          <View style={{ paddingBottom: insets.bottom + 24 }}>
            {more > 0 && list.length ? (
              <Text variant="footnote" color="textSecondary" align="center" style={styles.more}>
                ve {formatCompact(more)} kişi daha
              </Text>
            ) : null}
          </View>
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  search: { paddingHorizontal: SCREEN_PADDING, paddingTop: 12, paddingBottom: 6 },
  more: { paddingTop: 16 },
});
