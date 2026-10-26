/**
 * Satıcı konsolu sohbeti: filtreler (Sorular · Alıcılar · Moderatörler · Gizlenenler),
 * soru vurgusu, rozetler ve dokununca moderasyon eylemleri.
 */
import { useState } from 'react';
import { FlatList, ScrollView, StyleSheet, View, type ListViewToken } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut } from 'react-native-reanimated';

import { Avatar, Icon, PressableScale, Text } from '@/components/ui';
import { formatTRY } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { liveColors, radius } from '@/theme';
import type { ChatMessage } from '@/types';

import { isQuestion } from './helpers';

export type ChatFilter = 'all' | 'questions' | 'buyers' | 'mods' | 'muted';

const FILTERS: { key: ChatFilter; label: string }[] = [
  { key: 'all', label: 'Tümü' },
  { key: 'questions', label: 'Sorular' },
  { key: 'buyers', label: 'Alıcılar' },
  { key: 'mods', label: 'Moderatörler' },
  { key: 'muted', label: 'Gizlenenler' },
];

export function HostChat({
  messages,
  filter,
  onFilter,
  mods,
  buyers,
  height,
  onPressMessage,
}: {
  /** Kronolojik sırada (eski → yeni), filtre uygulanmış */
  messages: ChatMessage[];
  filter: ChatFilter;
  onFilter: (f: ChatFilter) => void;
  mods: string[];
  buyers: string[];
  /** Sabit liste yüksekliği; verilmezse kalan alanı doldurur (klavye açıkken) */
  height?: number;
  onPressMessage: (m: ChatMessage) => void;
}) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  // Taşan sohbette en üstte görünen satırlar solar (sert kırpılmış yarım satır görünmesin)
  const [topIndex, setTopIndex] = useState(-1);
  const [overflow, setOverflow] = useState(false);
  const [listH, setListH] = useState(0);
  const [viewabilityPairs] = useState(() => [
    {
      viewabilityConfig: { itemVisiblePercentThreshold: 5, minimumViewTime: 0 },
      onViewableItemsChanged: ({ viewableItems }: { viewableItems: ListViewToken[] }) => {
        let max = -1;
        for (const v of viewableItems) if (v.index != null && v.index > max) max = v.index;
        setTopIndex(max);
      },
    },
  ]);
  const data = messages.slice(-80).reverse();
  const fadeOf = (index: number) => {
    if (!overflow || topIndex < 0) return 1;
    const d = topIndex - index;
    return d <= 0 ? 0.25 : d === 1 ? 0.6 : 1;
  };
  const current = FILTERS.find((f) => f.key === filter) ?? FILTERS[0];
  return (
    <View style={height === undefined ? styles.flex : undefined}>
      <View style={styles.filterBar}>
        <PressableScale
          onPress={() => {
            haptic.tap();
            setFiltersOpen((o) => !o);
          }}
          accessibilityRole="button"
          accessibilityLabel="Sohbet filtreleri"
          style={[styles.caret, filter !== 'all' && styles.caretActive]}>
          <Icon name={filtersOpen ? 'chevron-down' : 'chevron-up'} size={13} color={filter !== 'all' ? liveColors.onPrimary : liveColors.text} />
          <Text variant="caption" color={filter !== 'all' ? liveColors.onPrimary : liveColors.text}>
            {current.label}
          </Text>
        </PressableScale>
        {filtersOpen ? (
          <Animated.View entering={FadeIn.duration(150)} exiting={FadeOut.duration(120)} style={{ flex: 1 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow} keyboardShouldPersistTaps="handled">
              {FILTERS.filter((f) => f.key !== filter).map((f) => (
                <PressableScale
                  key={f.key}
                  onPress={() => {
                    haptic.tap();
                    onFilter(f.key);
                    setFiltersOpen(false);
                  }}
                  style={styles.filterChip}>
                  <Text variant="caption" color={liveColors.text}>
                    {f.label}
                  </Text>
                </PressableScale>
              ))}
            </ScrollView>
          </Animated.View>
        ) : null}
      </View>
      <View style={height === undefined ? styles.flex : { height }} onLayout={(e) => setListH(e.nativeEvent.layout.height)}>
        {data.length === 0 ? (
          <View style={styles.empty}>
            <Text variant="footnote" color={liveColors.textSecondary}>
              {filter === 'questions'
                ? 'Henüz soru yok. Soru işareti içeren mesajlar burada sarı görünür.'
                : filter === 'buyers'
                  ? 'Bu yayında henüz alım yapan olmadı.'
                  : filter === 'mods'
                    ? 'Moderatörlerden mesaj yok.'
                    : filter === 'muted'
                      ? 'Gizlenen ya da yayından çıkarılan kimse yok.'
                      : 'Sohbet birazdan hareketlenecek…'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={data}
            inverted
            keyExtractor={(m) => m.id}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            viewabilityConfigCallbackPairs={viewabilityPairs}
            extraData={overflow ? topIndex : -1}
            onContentSizeChange={(_, h) => {
              const o = h > listH + 4;
              if (o !== overflow) setOverflow(o);
            }}
            renderItem={({ item, index }) => (
              <ChatRow
                message={item}
                isMod={!!item.isMod || mods.includes(item.username)}
                isBuyer={buyers.includes(item.username)}
                opacity={fadeOf(index)}
                onPress={onPressMessage}
              />
            )}
          />
        )}
      </View>
    </View>
  );
}

function ChatRow({ message: m, isMod, isBuyer, opacity, onPress }: { message: ChatMessage; isMod: boolean; isBuyer: boolean; opacity: number; onPress: (m: ChatMessage) => void }) {
  // Kısa etkinlik satırları
  if (m.type !== 'chat') {
    const meta = eventMeta(m);
    return (
      <Animated.View entering={FadeInDown.duration(180)}>
        <View style={[styles.eventRow, { opacity }]}>
          <Text variant="footnote" weight="600" color={meta.color} numberOfLines={2} style={styles.shadow}>
            {meta.icon ? meta.icon + ' ' : ''}
            {meta.showName ? (
              <Text variant="footnote" weight="800" color={meta.nameColor ?? meta.color}>
                {m.username + ' '}
              </Text>
            ) : null}
            {meta.text}
          </Text>
        </View>
      </Animated.View>
    );
  }
  const question = !m.isMe && isQuestion(m.text);
  const pressable = !m.isMe || m.isSeller;
  return (
    <Animated.View entering={FadeInDown.duration(180)}>
      <View style={{ opacity }}>
        <PressableScale
          disabled={!pressable}
          scaleTo={0.98}
          onPress={() => {
            haptic.tap();
            onPress(m);
          }}
          accessibilityRole="button"
          accessibilityLabel={`${m.username}: ${m.text}`}
          style={styles.row}>
          <Avatar uri={m.avatar} name={m.username} size={28} />
          <View style={styles.rowText}>
            <View style={styles.nameRow}>
              <Text variant="footnote" weight="700" color={liveColors.textSecondary} numberOfLines={1} style={[styles.shadow, { flexShrink: 1 }]}>
                {m.username}
              </Text>
              {m.isSeller || m.isMe ? <Badge label="Satıcı" tone="seller" /> : null}
              {isMod && !m.isSeller ? <Badge label="Mod" tone="mod" /> : null}
              {isBuyer && !m.isSeller ? <Badge label="Alıcı" tone="buyer" /> : null}
            </View>
            <Text variant="callout" weight="600" color={question ? liveColors.primary : liveColors.text} style={styles.shadow}>
              {m.text}
            </Text>
          </View>
        </PressableScale>
      </View>
    </Animated.View>
  );
}

function Badge({ label, tone }: { label: string; tone: 'seller' | 'mod' | 'buyer' }) {
  const bg = tone === 'seller' ? liveColors.primary : tone === 'mod' ? liveColors.glassLight : liveColors.success;
  const fg = tone === 'seller' ? liveColors.onPrimary : liveColors.text;
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text variant="caption" color={fg} style={styles.badgeText}>
        {label}
      </Text>
    </View>
  );
}

function eventMeta(m: ChatMessage): { icon: string; text: string; color: string; nameColor?: string; showName: boolean } {
  const amount = m.amount !== undefined ? formatTRY(m.amount) : '';
  switch (m.type) {
    case 'join':
      return { icon: '👋', text: 'katıldı', color: liveColors.textTertiary, showName: true };
    case 'bid':
      return { icon: '🔨', text: `${amount} teklif verdi`, color: liveColors.textSecondary, nameColor: liveColors.text, showName: true };
    case 'won':
      return { icon: '🏆', text: amount ? `${m.text} · ${amount}` : m.text, color: liveColors.primary, showName: true };
    case 'purchase':
      return { icon: '🛍️', text: amount ? `${m.text} · ${amount}` : m.text, color: liveColors.success, showName: true };
    case 'giveaway_entry':
      return { icon: '🎁', text: 'çekilişe katıldı', color: liveColors.textTertiary, showName: true };
    case 'giveaway_won':
      return { icon: '🎉', text: 'çekilişi kazandı!', color: liveColors.primary, showName: true };
    case 'tip':
      return { icon: '💛', text: `${amount} bahşiş gönderdi!`, color: liveColors.success, showName: true };
    case 'follow':
      return { icon: '➕', text: 'seni takip etti', color: liveColors.textSecondary, nameColor: liveColors.text, showName: true };
    default:
      return { icon: '', text: m.text, color: liveColors.textSecondary, showName: false };
  }
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  shadow: { textShadowColor: liveColors.glassStrong, textShadowRadius: 3, textShadowOffset: { width: 0, height: 1 } },
  filterBar: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4, minHeight: 26 },
  caret: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: liveColors.glass, borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 4 },
  caretActive: { backgroundColor: liveColors.primary },
  filterRow: { gap: 6, paddingRight: 8 },
  filterChip: { backgroundColor: liveColors.glassLight, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  empty: { flex: 1, justifyContent: 'flex-end', paddingBottom: 8 },
  row: { flexDirection: 'row', gap: 8, paddingVertical: 4, alignItems: 'flex-start' },
  rowText: { flex: 1, gap: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  badge: { borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
  badgeText: { fontSize: 9, lineHeight: 12 },
  eventRow: { paddingVertical: 3, paddingLeft: 2 },
});
