import { useRef, useState } from 'react';
import { FlatList, StyleSheet, View, type ListViewToken, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { Icon, PressableScale, Text } from '@/components/ui';
import { liveColors } from '@/theme';
import type { ChatMessage } from '@/types';

import { ChatRow } from './ChatRow';

export type ChatListProps = {
  messages: ChatMessage[];
  height: number;
  pinned?: ChatMessage;
  blockedIds: string[];
  onUserPress: (msg: ChatMessage) => void;
};

/** S20-C: sol alttaki ters sıralı sohbet; üstteki satırlar solar, üstte turkuaz sol kenarlıklı cam sabit mesaj kutusu */
export function ChatList({ messages, height, pinned, blockedIds, onUserPress }: ChatListProps) {
  const [topIndex, setTopIndex] = useState(-1);
  const [overflow, setOverflow] = useState(false);
  const [scrolledUp, setScrolledUp] = useState(false);
  const [pinOpen, setPinOpen] = useState(false);
  const listRef = useRef<FlatList<ChatMessage>>(null);
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
  const [listH, setListH] = useState(0);

  const data = messages.filter((m) => !m.userId || !blockedIds.includes(m.userId)).reverse();

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const up = e.nativeEvent.contentOffset.y > 80;
    if (up !== scrolledUp) setScrolledUp(up);
  };

  return (
    <View style={[styles.root, { height }]} pointerEvents="box-none">
      {pinned ? (
        <PressableScale scaleTo={0.98} onPress={() => setPinOpen((o) => !o)} style={styles.pinned} accessibilityLabel="Sabitlenmiş mesaj">
          <Icon name="pin-outline" size={14} color={liveColors.accent} />
          <Text variant="footnote" weight="600" color={liveColors.text} numberOfLines={pinOpen ? 4 : 1} style={styles.flex}>
            <Text variant="footnote" weight="800" color={liveColors.accent}>
              {pinned.username}{' '}
            </Text>
            {pinned.text.replace(/^📌\s*/, '')}
          </Text>
          <Icon name={pinOpen ? 'chevron-up' : 'chevron-down'} size={14} color={liveColors.textSecondary} />
        </PressableScale>
      ) : null}
      {/* Liste kapsayıcısını mutlak olarak doldurur ve kırpılır: sohbet asla kartın/alt çubuğun üstüne taşmaz */}
      <View style={styles.listWrap} onLayout={(e) => setListH(e.nativeEvent.layout.height)}>
        <FlatList
          ref={listRef}
          style={StyleSheet.absoluteFill}
          data={data}
          inverted
          keyExtractor={(m) => m.id}
          renderItem={({ item, index }) => (
            <ChatRow msg={item} fade={overflow && topIndex >= 0 ? Math.max(0, topIndex - index) : 9} onUserPress={onUserPress} />
          )}
          extraData={overflow ? topIndex : -1}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          viewabilityConfigCallbackPairs={viewabilityPairs}
          onContentSizeChange={(_, h) => {
            const o = h > listH + 4;
            if (o !== overflow) setOverflow(o);
          }}
          onScroll={onScroll}
          scrollEventThrottle={64}
          contentContainerStyle={styles.content}
          initialNumToRender={14}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={false}
          nestedScrollEnabled
        />
        {scrolledUp ? (
          <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.newWrap}>
            <PressableScale
              scaleTo={0.94}
              onPress={() => {
                listRef.current?.scrollToOffset({ offset: 0, animated: true });
                setScrolledUp(false);
              }}
              style={styles.newPill}
              accessibilityLabel="En yeni mesajlara git">
              <Icon name="arrow-down" size={13} color={liveColors.onPrimary} />
              <Text variant="caption" weight="800" color={liveColors.onPrimary}>
                Yeni mesajlar
              </Text>
            </PressableScale>
          </Animated.View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { overflow: 'hidden' },
  flex: { flex: 1 },
  listWrap: { flex: 1, minHeight: 0, overflow: 'hidden' },
  content: { paddingTop: 4, gap: 2 },
  pinned: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    maxWidth: '100%',
    marginBottom: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 12,
    backgroundColor: liveColors.glass,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: liveColors.border,
    borderLeftWidth: 3,
    borderLeftColor: liveColors.primary,
  },
  newWrap: { position: 'absolute', bottom: 6, left: 0, right: 0, alignItems: 'center' },
  newPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: liveColors.primary, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
});
