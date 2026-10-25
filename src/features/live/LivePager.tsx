/**
 * TikTok / Whatnot tarzı dikey canlı yayın kaydırıcısı.
 * Yukarı/aşağı kaydırınca sonraki/önceki canlı yayına geçilir; yalnızca görünen sayfa aktiftir
 * (simülasyon + video çalışır).
 */
import { router, useIsFocused } from 'expo-router';
import { useRef, useState } from 'react';
import { FlatList, Platform, StyleSheet, useWindowDimensions, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';

import { EmptyState, Header, Screen } from '@/components/ui';
import { getLiveShows, getShow } from '@/data';
import { TransactSetupHost } from '@/features/wallet/TransactSetup';
import { haptic } from '@/lib/haptics';
import { useSocialStore } from '@/store/social';
import { brand, ForceScheme } from '@/theme';
import type { Show } from '@/types';

import { LiveShowPage } from './LiveShowPage';
import { useLivePrefs } from './liveStore';

function buildList(initialId: string): Show[] {
  const hidden = useLivePrefs.getState().hiddenShowIds;
  const blocked = useSocialStore.getState().blockedIds;
  const live = getLiveShows().filter((s) => s.id === initialId || (!hidden.includes(s.id) && !blocked.includes(s.sellerId)));
  const initial = getShow(initialId);
  if (initial && !live.some((s) => s.id === initialId)) return [initial, ...live];
  return live;
}

export function LivePager({ initialId }: { initialId: string }) {
  const { width, height: windowH } = useWindowDimensions();
  const [pageH, setPageH] = useState(0);
  const [shows] = useState(() => buildList(initialId));
  const startIndex = Math.max(0, shows.findIndex((s) => s.id === initialId));
  const [index, setIndex] = useState(startIndex);
  const focused = useIsFocused();
  const listRef = useRef<FlatList<Show>>(null);

  const close = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  const goTo = (i: number) => {
    if (i < 0 || i >= shows.length) {
      close();
      return;
    }
    haptic.light();
    listRef.current?.scrollToIndex({ index: i, animated: true });
    setIndex(i);
  };

  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!pageH) return;
    const i = Math.round(e.nativeEvent.contentOffset.y / pageH);
    if (i !== index && i >= 0 && i < shows.length) {
      haptic.tap();
      setIndex(i);
    }
  };

  if (!getShow(initialId) || !shows.length) {
    return (
      <ForceScheme scheme="dark">
        <Screen>
          <Header title="Canlı yayın" back="close" onBack={close} />
          <EmptyState emoji="📡" title="Yayın bulunamadı" message="Bu yayın sona ermiş ya da kaldırılmış olabilir. Şu an canlı olan diğer yayınlara göz at." actionLabel="Ana sayfaya dön" onAction={close} />
        </Screen>
      </ForceScheme>
    );
  }

  return (
    <ForceScheme scheme="dark">
      <View style={styles.root} onLayout={(e) => setPageH(Math.round(e.nativeEvent.layout.height) || windowH)}>
        {pageH > 0 ? (
          <FlatList
            ref={listRef}
            data={shows}
            keyExtractor={(s) => s.id}
            renderItem={({ item, index: i }) => (
              <LiveShowPage
                show={item}
                width={width}
                height={pageH}
                visible={i === index}
                focused={focused}
                nextShow={shows[i + 1] ?? (i > 0 ? shows[i - 1] : undefined)}
                onClose={close}
                onNext={() => goTo(i + 1 < shows.length ? i + 1 : i - 1)}
              />
            )}
            extraData={`${index}-${focused}-${pageH}`}
            pagingEnabled
            decelerationRate="fast"
            showsVerticalScrollIndicator={false}
            bounces={false}
            overScrollMode="never"
            scrollsToTop={false}
            initialScrollIndex={startIndex}
            getItemLayout={(_, i) => ({ length: pageH, offset: pageH * i, index: i })}
            onMomentumScrollEnd={onMomentumEnd}
            windowSize={3}
            initialNumToRender={1}
            maxToRenderPerBatch={1}
            removeClippedSubviews={Platform.OS === 'android'}
            keyboardShouldPersistTaps="handled"
          />
        ) : null}
        {/*
          iOS'ta tam ekran modal, kök layout'taki ToastHost'u örter ve kökteki TransactSetupHost'un
          Modal'ı zaten bir modal sunan kök denetleyiciden açılamaz. Bu yüzden ikisi burada da render edilir.
          (Android'de modallar aynı pencerede olduğundan kökteki kopyalar yeterli.)
        */}
        {Platform.OS === 'ios' ? <TransactSetupHost scoped /> : null}
        
      </View>
    </ForceScheme>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: brand.black },
});
