/**
 * TikTok / Whatnot tarzı dikey canlı yayın kaydırıcısı.
 * Yukarı/aşağı kaydırınca sonraki/önceki canlı yayına geçilir; yalnızca görünen sayfa aktiftir
 * (simülasyon + video çalışır).
 *
 * Not: Kaydırıcı bilinçli olarak FlatList değil, sayfalı bir ScrollView'dur. Aynı yönde iç içe
 * VirtualizedList'lerde iç liste (sohbet FlatList'i) ScrollView yerine düz bir View olarak çizilir
 * ve dış listenin kaydırma olaylarını alır → sohbet sınırsız uzar, kartın/alt çubuğun altına taşar
 * ve kaydırılamaz. Bu yüzden sayfalama burada elle yapılır (yalnızca görünen sayfa ±1 render edilir).
 */
import { router, useIsFocused } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Platform, ScrollView, StyleSheet, useWindowDimensions, View, type NativeScrollEvent, type NativeSyntheticEvent, type ScrollViewInstance } from 'react-native';

import { EmptyState, Header, Screen } from '@/components/ui';
import { getLiveShows, getShow } from '@/data';
import { TransactSetupHost } from '@/features/wallet/TransactSetup';
import { haptic } from '@/lib/haptics';
import { useSocialStore } from '@/store/social';
import { brand, ForceScheme } from '@/theme';
import type { Show } from '@/types';

import { LiveShowPage } from './LiveShowPage';
import { useLivePrefs } from './liveStore';

/** Görünen sayfanın iki yanında kaç sayfa önceden render edilir */
const WINDOW = 1;

function buildList(initialId: string): Show[] {
  const hidden = useLivePrefs.getState().hiddenShowIds;
  const blocked = useSocialStore.getState().blockedIds;
  const live = getLiveShows().filter((s) => s.id === initialId || (!hidden.includes(s.id) && !blocked.includes(s.sellerId)));
  const initial = getShow(initialId);
  if (initial && !live.some((s) => s.id === initialId)) return [initial, ...live];
  return live;
}

export function LivePager({ initialId, qa }: { initialId: string; qa?: string }) {
  const { width, height: windowH } = useWindowDimensions();
  const [pageH, setPageH] = useState(0);
  const [shows] = useState(() => buildList(initialId));
  const startIndex = Math.max(0, shows.findIndex((s) => s.id === initialId));
  const [index, setIndex] = useState(startIndex);
  const focused = useIsFocused();
  const scrollRef = useRef<ScrollViewInstance>(null);

  // Android'de `contentOffset` ilk konumu her zaman uygulamayabilir: ölçüm sonrası başlangıç sayfasına atla
  useEffect(() => {
    if (!pageH || Platform.OS === 'ios') return;
    scrollRef.current?.scrollTo({ x: 0, y: startIndex * pageH, animated: false });
  }, [pageH, startIndex]);

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
    scrollRef.current?.scrollTo({ x: 0, y: i * pageH, animated: true });
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
          <ScrollView
            ref={scrollRef}
            pagingEnabled
            decelerationRate="fast"
            showsVerticalScrollIndicator={false}
            bounces={false}
            overScrollMode="never"
            scrollsToTop={false}
            contentOffset={{ x: 0, y: startIndex * pageH }}
            onMomentumScrollEnd={onMomentumEnd}
            keyboardShouldPersistTaps="handled">
            {shows.map((item, i) => (
              <View key={item.id} style={{ width, height: pageH }}>
                {Math.abs(i - index) <= WINDOW ? (
                  <LiveShowPage
                    show={item}
                    width={width}
                    height={pageH}
                    visible={i === index}
                    focused={focused}
                    qa={i === startIndex ? qa : undefined}
                    nextShow={shows[i + 1] ?? (i > 0 ? shows[i - 1] : undefined)}
                    onClose={close}
                    onNext={() => goTo(i + 1 < shows.length ? i + 1 : i - 1)}
                  />
                ) : null}
              </View>
            ))}
          </ScrollView>
        ) : null}
        {/*
          iOS'ta kökteki TransactSetupHost'un Modal'ı, zaten tam ekran modal sunan kök denetleyiciden
          açılamaz; bu yüzden burada da render edilir. (Android'de modallar aynı pencerede olduğundan
          kökteki kopya yeterli. Toast'lar FullWindowOverlay ile her zaman en üstte.)
        */}
        {Platform.OS === 'ios' ? <TransactSetupHost scoped /> : null}
      </View>
    </ForceScheme>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: brand.ink },
});
