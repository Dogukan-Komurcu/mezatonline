/**
 * Arama ekranının giriş durumu (kaydedilen + son aramalar, popüler aramalar, popüler kategoriler)
 * ve yazarken gösterilen öneriler (sorgular, kullanıcılar, kategoriler).
 */
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { FlatList, ScrollView, StyleSheet, View } from 'react-native';

import { Avatar, Divider, Icon, PressableScale, Text, toast } from '@/components/ui';
import { CATEGORIES, CATEGORIES_BY_POPULARITY, getLiveShowOf, search, TRENDING_SEARCHES } from '@/data';
import { formatCompact, timeAgoLong } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { useSocialStore } from '@/store/social';
import { SCREEN_PADDING, useTheme } from '@/theme';
import type { Category, User } from '@/types';

import { useBrowseStore } from './store';
import { matchesQuery, normalizeTr, splitMatch } from './text';
import { ChipScroller, FilterChip } from './ui';

// ─── Ortak ───────────────────────────────────────────────────────────────────

function Highlight({ text, query, variant = 'body' }: { text: string; query: string; variant?: 'body' | 'headline' }) {
  const parts = splitMatch(text, query);
  if (!parts) {
    return (
      <Text variant={variant} numberOfLines={1} style={styles.flex}>
        {text}
      </Text>
    );
  }
  return (
    <Text variant={variant} weight="400" numberOfLines={1} style={styles.flex}>
      {parts[0]}
      <Text variant={variant} weight="800">
        {parts[1]}
      </Text>
      {parts[2]}
    </Text>
  );
}

function SectionHead({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.sectionHead}>
      <Text variant="headline" style={styles.flex}>
        {title}
      </Text>
      {action ? (
        <Text variant="subhead" weight="700" color="accent" onPress={onAction} suppressHighlighting accessibilityRole="button">
          {action}
        </Text>
      ) : null}
    </View>
  );
}

function removeRecent(q: string) {
  useSocialStore.setState((s) => ({ recentSearches: s.recentSearches.filter((x) => x !== q) }));
}

// ─── Giriş durumu ────────────────────────────────────────────────────────────

export function SearchEntry({ onSearch, bottomInset }: { onSearch: (q: string) => void; bottomInset: number }) {
  const { colors } = useTheme();
  const recents = useSocialStore((s) => s.recentSearches);
  const clearRecents = useSocialStore((s) => s.clearRecentSearches);
  const saved = useBrowseStore((s) => s.savedSearches);
  const removeSaved = useBrowseStore((s) => s.removeSavedSearch);

  return (
    <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={{ paddingBottom: bottomInset + 24 }} showsVerticalScrollIndicator={false}>
      {saved.length ? (
        <View style={styles.section}>
          <SectionHead title="Kaydettiğin aramalar" />
          {saved.map((s) => (
            <PressableScale key={s.query} scaleTo={0.99} onPress={() => onSearch(s.query)} style={styles.row} accessibilityRole="button" accessibilityLabel={s.query}>
              <View style={[styles.iconCircle, { backgroundColor: colors.surface }]}>
                <Icon name="bookmark" size={16} color="text" />
              </View>
              <View style={styles.flex}>
                <Text variant="body" weight="600" numberOfLines={1}>
                  {s.query}
                </Text>
                <Text variant="footnote" color="textSecondary">
                  Kaydedildi · {timeAgoLong(s.savedAt)} · Yeni sonuçlarda bildirim alırsın
                </Text>
              </View>
              <PressableScale
                scaleTo={0.85}
                hitSlop={10}
                onPress={() => {
                  haptic.tap();
                  removeSaved(s.query);
                  toast('Kayıtlı arama silindi', 'bookmark-outline');
                }}
                accessibilityLabel="Kayıtlı aramayı sil">
                <Icon name="close" size={18} color="textTertiary" />
              </PressableScale>
            </PressableScale>
          ))}
        </View>
      ) : null}

      <View style={styles.section}>
        <SectionHead
          title="Son aramaların"
          action={recents.length ? 'Temizle' : undefined}
          onAction={() => {
            haptic.tap();
            clearRecents();
          }}
        />
        {recents.length ? (
          recents.map((q) => (
            <PressableScale key={q} scaleTo={0.99} onPress={() => onSearch(q)} style={styles.row} accessibilityRole="button" accessibilityLabel={q}>
              <Icon name="time-outline" size={20} color="textSecondary" />
              <Text variant="body" numberOfLines={1} style={styles.flex}>
                {q}
              </Text>
              <PressableScale
                scaleTo={0.85}
                hitSlop={10}
                onPress={() => {
                  haptic.tap();
                  removeRecent(q);
                }}
                accessibilityLabel={`${q} aramasını kaldır`}>
                <Icon name="close" size={18} color="textTertiary" />
              </PressableScale>
            </PressableScale>
          ))
        ) : (
          <Text variant="callout" color="textSecondary" style={styles.muted}>
            Henüz arama yapmadın.
          </Text>
        )}
      </View>

      <View style={styles.section}>
        <SectionHead title="Popüler aramalar" />
        <View style={styles.wrapChips}>
          {TRENDING_SEARCHES.map((q) => (
            <FilterChip key={q} label={q} icon="trending-up" onPress={() => onSearch(q)} />
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <SectionHead title="Popüler kategoriler" action="Tümü" onAction={() => router.navigate('/categories')} />
        <ChipScroller contentStyle={styles.catChips}>
          {CATEGORIES_BY_POPULARITY.slice(0, 10).map((c) => (
            <PressableScale key={c.id} scaleTo={0.95} onPress={() => router.push(`/category/${c.id}`)} style={[styles.catChip, { backgroundColor: colors.surface }]} accessibilityRole="button" accessibilityLabel={c.name}>
              <Image source={{ uri: c.image }} style={styles.catThumb} contentFit="cover" cachePolicy="memory-disk" recyclingKey={c.id} />
              <Text variant="subhead" weight="600" numberOfLines={1}>
                {c.shortName}
              </Text>
            </PressableScale>
          ))}
        </ChipScroller>
      </View>
    </ScrollView>
  );
}

// ─── Yazarken öneriler ───────────────────────────────────────────────────────

type Suggestion =
  | { type: 'submit'; key: string; text: string }
  | { type: 'query'; key: string; text: string; recent: boolean }
  | { type: 'user'; key: string; user: User }
  | { type: 'category'; key: string; category: Category }
  | { type: 'divider'; key: string };

function shortTitle(title: string): string {
  return title
    .replace(/[^0-9A-Za-zÀ-ÿçğıöşüÇĞİÖŞÜ\s'&.:-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 4)
    .join(' ');
}

function buildSuggestions(text: string, recents: string[]): Suggestion[] {
  const q = text.trim();
  if (!q) return [];
  const nq = normalizeTr(q);
  const results = search(q);
  const pool = [
    ...recents,
    ...TRENDING_SEARCHES,
    ...CATEGORIES.flatMap((c) => [c.shortName, ...c.subcategories.map((s) => s.name)]),
    ...results.products.slice(0, 30).map((p) => shortTitle(p.title)),
  ];
  const seen = new Set<string>([nq]);
  const queries: string[] = [];
  pool.forEach((p) => {
    const n = normalizeTr(p);
    if (!p || seen.has(n) || !matchesQuery(p, q)) return;
    seen.add(n);
    queries.push(p);
  });
  queries.sort((a, b) => Number(!normalizeTr(a).startsWith(nq)) - Number(!normalizeTr(b).startsWith(nq)));
  const recentSet = new Set(recents.map(normalizeTr));
  const out: Suggestion[] = [{ type: 'submit', key: 'submit', text: q }];
  queries.slice(0, 6).forEach((t) => out.push({ type: 'query', key: `q-${t}`, text: t, recent: recentSet.has(normalizeTr(t)) }));
  const users = results.users.slice(0, 4);
  const cats = results.categories.slice(0, 3);
  if (users.length) {
    out.push({ type: 'divider', key: 'd-users' });
    users.forEach((u) => out.push({ type: 'user', key: `u-${u.id}`, user: u }));
  }
  if (cats.length) {
    out.push({ type: 'divider', key: 'd-cats' });
    cats.forEach((c) => out.push({ type: 'category', key: `c-${c.id}`, category: c }));
  }
  return out;
}

export function SearchSuggestions({ text, onSearch, onFill, bottomInset }: { text: string; onSearch: (q: string) => void; onFill: (q: string) => void; bottomInset: number }) {
  const { colors } = useTheme();
  const recents = useSocialStore((s) => s.recentSearches);
  const items = useMemo(() => buildSuggestions(text, recents), [text, recents]);

  return (
    <FlatList
      data={items}
      keyExtractor={(i) => i.key}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      contentContainerStyle={{ paddingBottom: bottomInset + 24, paddingTop: 4 }}
      renderItem={({ item }) => {
        switch (item.type) {
          case 'submit':
            return (
              <PressableScale scaleTo={0.99} onPress={() => onSearch(item.text)} style={styles.row} accessibilityRole="button">
                <Icon name="search" size={20} color="text" />
                <Text variant="body" numberOfLines={1} style={styles.flex}>
                  <Text variant="body" weight="700">
                    “{item.text}”
                  </Text>{' '}
                  için ara
                </Text>
              </PressableScale>
            );
          case 'query':
            return (
              <PressableScale scaleTo={0.99} onPress={() => onSearch(item.text)} style={styles.row} accessibilityRole="button" accessibilityLabel={item.text}>
                <Icon name={item.recent ? 'time-outline' : 'search-outline'} size={20} color="textSecondary" />
                <Highlight text={item.text} query={text} />
                <PressableScale scaleTo={0.85} hitSlop={10} onPress={() => onFill(item.text)} accessibilityLabel="Arama kutusuna yaz">
                  <Icon name="arrow-up-outline" size={18} color="textTertiary" style={styles.fillIcon} />
                </PressableScale>
              </PressableScale>
            );
          case 'user': {
            const live = !!getLiveShowOf(item.user.id);
            return (
              <PressableScale scaleTo={0.99} onPress={() => router.push(`/user/${item.user.username}`)} style={styles.row} accessibilityRole="button" accessibilityLabel={item.user.username}>
                <Avatar uri={item.user.avatar} name={item.user.username} size={34} verified={item.user.badges.includes('verified')} />
                <View style={styles.flex}>
                  <Highlight text={item.user.username} query={text} variant="headline" />
                  <Text variant="footnote" color="textSecondary" numberOfLines={1}>
                    {item.user.displayName} · {formatCompact(item.user.followers)} takipçi
                  </Text>
                </View>
                {live ? (
                  <View style={[styles.liveTag, { backgroundColor: colors.live }]}>
                    <Text variant="caption" color="#FFFFFF">
                      CANLI
                    </Text>
                  </View>
                ) : null}
              </PressableScale>
            );
          }
          case 'category':
            return (
              <PressableScale scaleTo={0.99} onPress={() => router.push(`/category/${item.category.id}`)} style={styles.row} accessibilityRole="button" accessibilityLabel={item.category.name}>
                <Image source={{ uri: item.category.image }} style={[styles.iconCircle, { backgroundColor: colors.surface }]} contentFit="cover" cachePolicy="memory-disk" recyclingKey={item.category.id} />
                <View style={styles.flex}>
                  <Highlight text={item.category.name} query={text} />
                  <Text variant="footnote" color="textSecondary">
                    Kategori · {formatCompact(item.category.viewers)} izleyici
                  </Text>
                </View>
                <Icon name="chevron-forward" size={16} color="textTertiary" />
              </PressableScale>
            );
          default:
            return <Divider style={styles.divider} />;
        }
      }}
    />
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  section: { paddingTop: 18 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SCREEN_PADDING, marginBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: SCREEN_PADDING, paddingVertical: 11, minHeight: 48 },
  iconCircle: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  muted: { paddingHorizontal: SCREEN_PADDING, paddingVertical: 8 },
  wrapChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: SCREEN_PADDING, paddingTop: 6 },
  catChips: { paddingTop: 6 },
  catChip: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 40, paddingLeft: 6, paddingRight: 14, borderRadius: 12 },
  catThumb: { width: 28, height: 28, borderRadius: 7 },
  fillIcon: { transform: [{ rotate: '-45deg' }] },
  liveTag: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  divider: { marginVertical: 4, marginLeft: SCREEN_PADDING },
});
