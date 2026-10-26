/**
 * Yayınlarım: Yaklaşan (planlanmış + canlı) | Geçmiş (yayın özetleri: brüt satış, satılan ürün, en yüksek izleyici)
 */
import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import { Button, EmptyState, Header, IconButton, LiveBadge, PressableScale, Screen, Text, toast, UnderlineTabs } from '@/components/ui';
import { formatCompact, formatDateTime, formatShowTime, formatTimeUntil, formatTRY } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { useSellerStore, type LiveSessionSummary } from '@/store/seller';
import { radius, SCREEN_PADDING, useTheme } from '@/theme';
import type { Show } from '@/types';

import { useNow } from './actions';
import { HOUR } from './logic';
import { useQaParam } from './qaSeed';
import { shareShow, showActions, startShow } from './showActions';
import { ActionSheet, Card, StatusPill, Thumb } from './ui';

type PastItem = { key: string; show?: Show; session?: LiveSessionSummary; at: number };

function duration(a: string, b: string): string {
  const min = Math.max(1, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 60_000));
  const h = Math.floor(min / 60);
  return h ? `${h} sa ${min % 60} dk` : `${min} dk`;
}

export function ShowsScreen() {
  const { colors } = useTheme();
  const now = useNow(30_000);
  const shows = useSellerStore((s) => s.shows);
  const sessions = useSellerStore((s) => s.sessions);
  const updateShow = useSellerStore((s) => s.updateShow);
  const qa = useQaParam();
  const [tab, setTab] = useState<'upcoming' | 'past'>(qa === 'past' ? 'past' : 'upcoming');
  const [more, setMore] = useState<Show | null>(null);

  const upcoming = shows
    .filter((s) => s.status !== 'ended')
    .sort((a, b) => (a.status === 'live' ? -1 : b.status === 'live' ? 1 : a.scheduledAt.localeCompare(b.scheduledAt)));
  const sessionShowIds = new Set(sessions.map((s) => s.showId));
  const past: PastItem[] = [
    ...sessions.map((session) => ({ key: session.id, session, show: shows.find((s) => s.id === session.showId), at: new Date(session.startedAt).getTime() })),
    ...shows
      .filter((s) => s.status === 'ended' && !sessionShowIds.has(s.id))
      .map((show) => ({ key: show.id, show, at: new Date(show.endedAt ?? show.scheduledAt).getTime() })),
  ].sort((a, b) => b.at - a.at);
  const totalGross = sessions.reduce((s, x) => s + x.gross, 0);

  const restart = (show: Show) => {
    updateShow(show.id, { status: 'scheduled', scheduledAt: new Date().toISOString(), endedAt: undefined });
    haptic.success();
    toast.success('Yayın yeniden başlatılıyor');
    router.push({ pathname: '/seller/go-live', params: { showId: show.id } });
  };

  return (
    <Screen>
      <Header title="Yayınlarım" right={<IconButton name="add" onPress={() => router.push('/seller/schedule')} accessibilityLabel="Yayın planla" />} />
      <UnderlineTabs
        equal
        value={tab}
        onChange={setTab}
        tabs={[
          { key: 'upcoming', label: 'Yaklaşan', count: upcoming.length },
          { key: 'past', label: 'Geçmiş', count: past.length },
        ]}
      />
      {tab === 'upcoming' ? (
        <FlatList
          data={upcoming}
          keyExtractor={(s) => s.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <EmptyState emoji="📅" title="Planlanmış yayının yok" message="Yayınını önceden planla; takipçilerin hatırlatıcı kurup seni bekleyebilsin." actionLabel="Yayın Planla" onAction={() => router.push('/seller/schedule')} />
          }
          renderItem={({ item: show }) => (
            <Card padded={false} style={styles.card}>
              <PressableScale
                scaleTo={0.98}
                onPress={() => (show.status === 'live' ? router.push(`/seller/live/${show.id}`) : router.push({ pathname: '/seller/schedule', params: { id: show.id } }))}
                style={styles.cardInner}>
                <Thumb uri={show.coverImage} size={72} height={128} rounded={radius.md} />
                <View style={{ flex: 1, gap: 6 }}>
                  {show.status === 'live' ? <LiveBadge /> : <StatusPill label={formatShowTime(show.scheduledAt, now)} icon="calendar" />}
                  <Text variant="headline" weight="700" numberOfLines={2}>
                    {show.title}
                  </Text>
                  <Text variant="footnote" color="textSecondary" numberOfLines={1}>
                    {show.productIds.length} ürün
                    {show.status === 'scheduled' ? (new Date(show.scheduledAt).getTime() > now ? ` · ${formatTimeUntil(show.scheduledAt, now)} sonra` : ' · başlama saati geldi') : ''}
                  </Text>
                  <View style={styles.btns}>
                    <Button title={show.status === 'live' ? 'Yayına dön' : 'Başlat'} size="sm" variant={show.status === 'live' ? 'danger' : 'primary'} icon="videocam" onPress={() => startShow(show)} />
                    <IconButton name="share-outline" variant="surface" size={34} onPress={() => shareShow(show)} accessibilityLabel="Paylaş" />
                  </View>
                </View>
                <IconButton name="ellipsis-horizontal" size={34} onPress={() => setMore(show)} accessibilityLabel="Diğer seçenekler" />
              </PressableScale>
            </Card>
          )}
        />
      ) : (
        <FlatList
          data={past}
          keyExtractor={(p) => p.key}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            sessions.length ? (
              <View style={[styles.summary, { backgroundColor: colors.surface }]}>
                <View style={{ flex: 1 }}>
                  <Text variant="footnote" color="textSecondary">
                    Toplam brüt satış
                  </Text>
                  <Text variant="title2">{formatTRY(totalGross)}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text variant="footnote" color="textSecondary">
                    Yayın
                  </Text>
                  <Text variant="title2">{sessions.length}</Text>
                </View>
              </View>
            ) : undefined
          }
          ListEmptyComponent={<EmptyState emoji="🎬" title="Henüz yayın yapmadın" message="İlk canlı yayınından sonra satış, izleyici ve ürün özetleri burada görünür." actionLabel="Canlıya Geç" onAction={() => router.push('/seller/go-live')} />}
          renderItem={({ item }) => {
            const title = item.show?.title ?? 'Canlı yayın';
            const s = item.session;
            const endedAt = s?.endedAt ?? item.show?.endedAt;
            const canRestart = !!item.show && item.show.status === 'ended' && !!endedAt && now - new Date(endedAt).getTime() < 2 * HOUR;
            return (
              <Card padded={false} style={styles.card}>
                <View style={styles.cardInner}>
                  <Thumb uri={item.show?.coverImage} size={56} height={100} rounded={radius.md} />
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text variant="headline" weight="700" numberOfLines={2}>
                      {title}
                    </Text>
                    <Text variant="footnote" color="textSecondary">
                      {formatDateTime(s?.startedAt ?? item.show?.startedAt ?? item.show?.scheduledAt ?? item.at)}
                      {s ? ` · ${duration(s.startedAt, s.endedAt)}` : ''}
                    </Text>
                  </View>
                </View>
                <View style={[styles.kpis, { borderTopColor: colors.border }]}>
                  {[
                    ['Brüt satış', formatTRY(s?.gross ?? 0)],
                    ['Satılan ürün', String(s?.itemsSold ?? 0)],
                    ['En yüksek izleyici', formatCompact(s?.peakViewers ?? 0)],
                  ].map(([k, v], i) => (
                    <View key={k} style={[styles.kpi, i > 0 && { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: colors.border }]}>
                      <Text variant="headline" weight="800" align="center" numberOfLines={1}>
                        {v}
                      </Text>
                      <Text variant="caption" color="textSecondary" align="center" numberOfLines={1}>
                        {k}
                      </Text>
                    </View>
                  ))}
                </View>
                <View style={[styles.pastActions, { borderTopColor: colors.border }]}>
                  <Button
                    title="Siparişleri gör"
                    size="sm"
                    variant="secondary"
                    icon="receipt-outline"
                    style={{ flex: 1 }}
                    onPress={() => router.push({ pathname: '/seller/orders', params: item.show ? { showId: item.show.id } : {} })}
                  />
                  {canRestart && item.show ? (
                    <Button title="Yeniden başlat" size="sm" icon="refresh" style={{ flex: 1 }} onPress={() => restart(item.show!)} />
                  ) : (
                    <Button title="Analizler" size="sm" variant="secondary" icon="bar-chart-outline" style={{ flex: 1 }} onPress={() => router.push('/seller/analytics')} />
                  )}
                </View>
              </Card>
            );
          }}
        />
      )}
      <ActionSheet visible={!!more} onClose={() => setMore(null)} title={more?.title} subtitle={more ? formatShowTime(more.scheduledAt, now) : undefined} actions={more ? showActions(more) : []} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { padding: SCREEN_PADDING, gap: 12, flexGrow: 1 },
  card: { overflow: 'hidden' },
  cardInner: { flexDirection: 'row', gap: 12, padding: 12 },
  btns: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  summary: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: radius.lg, marginBottom: 2 },
  kpis: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, paddingVertical: 10 },
  kpi: { flex: 1, paddingHorizontal: 4, gap: 2 },
  pastActions: { flexDirection: 'row', gap: 8, padding: 10, borderTopWidth: StyleSheet.hairlineWidth },
});
