/**
 * Ana sayfa kampanya bannerları: sayfalı yatay kaydırma + nokta göstergesi + 5 sn'de bir otomatik geçiş.
 */
import { Image } from 'expo-image';
import { router, type Href } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { FlatList, StyleSheet, useWindowDimensions, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';

import { Icon, PressableScale, Text } from '@/components/ui';
import { PROMO_BANNERS, type PromoBanner } from '@/data';
import { AUTH_REASONS, requireAuth } from '@/features/auth/gate';
import { haptic } from '@/lib/haptics';
import { brand, radius, SCREEN_PADDING, useTheme } from '@/theme';

const GAP = SCREEN_PADDING;
const HEIGHT = 128;

function Banner({ banner, width }: { banner: PromoBanner; width: number }) {
  // Banner zeminleri koyu marka tonlarıdır (data/mock PROMO_BANNERS): yazı beyaz, düğme beyaz zeminde banner renginde
  return (
    <PressableScale
      scaleTo={0.98}
      onPress={() => {
        haptic.light();
        const go = () => router.push(banner.href as Href);
        // Kampanyalar hesap ekranlarına gider (cüzdan, satıcı başvurusu): misafire önce giriş
        const seller = banner.href.startsWith('/seller');
        if (seller || banner.href === '/wallet') requireAuth(go, { reason: seller ? AUTH_REASONS.sell : AUTH_REASONS.account });
        else go();
      }}
      accessibilityRole="button"
      accessibilityLabel={banner.title}
      style={[styles.banner, { width, backgroundColor: banner.tint }]}>
      <View style={styles.texts}>
        <Text variant="title3" weight="800" color={brand.white} numberOfLines={2}>
          {banner.title}
        </Text>
        <Text variant="footnote" color={brand.white} numberOfLines={2} style={styles.subtitle}>
          {banner.subtitle}
        </Text>
        <View style={[styles.cta, { backgroundColor: brand.white }]}>
          <Text variant="footnote" weight="700" color={banner.tint}>
            Hemen bak
          </Text>
          <Icon name="arrow-forward" size={12} color={banner.tint} />
        </View>
      </View>
      <Image source={{ uri: banner.image }} style={styles.image} contentFit="cover" transition={200} cachePolicy="memory-disk" />
    </PressableScale>
  );
}

export function PromoCarousel() {
  const { colors } = useTheme();
  const { width: screenW } = useWindowDimensions();
  const width = screenW - SCREEN_PADDING * 2;
  const interval = width + GAP;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const listRef = useRef<FlatList<PromoBanner>>(null);
  const count = PROMO_BANNERS.length;

  useEffect(() => {
    if (paused || count < 2) return;
    const t = setTimeout(() => {
      const next = (index + 1) % count;
      listRef.current?.scrollToOffset({ offset: next * interval, animated: true });
      setIndex(next);
    }, 5000);
    return () => clearTimeout(t);
  }, [index, paused, count, interval]);

  const onEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / interval);
    setIndex(Math.max(0, Math.min(count - 1, i)));
    setPaused(false);
  };

  if (!count) return null;
  return (
    <View style={styles.wrap}>
      <FlatList
        ref={listRef}
        data={PROMO_BANNERS}
        keyExtractor={(b) => b.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={interval}
        decelerationRate="fast"
        disableIntervalMomentum
        contentContainerStyle={styles.content}
        ItemSeparatorComponent={() => <View style={{ width: GAP }} />}
        onScrollBeginDrag={() => setPaused(true)}
        onMomentumScrollEnd={onEnd}
        getItemLayout={(_, i) => ({ length: interval, offset: interval * i, index: i })}
        renderItem={({ item }) => <Banner banner={item} width={width} />}
      />
      {count > 1 ? (
        <View style={styles.dots}>
          {PROMO_BANNERS.map((b, i) => (
            <View key={b.id} style={[styles.dot, { backgroundColor: i === index ? colors.primary : colors.surfaceAlt, width: i === index ? 16 : 6 }]} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingVertical: 16 },
  content: { paddingHorizontal: SCREEN_PADDING },
  banner: { height: HEIGHT, borderRadius: radius.lg, flexDirection: 'row', overflow: 'hidden' },
  texts: { flex: 1, padding: 14, justifyContent: 'space-between' },
  subtitle: { opacity: 0.75, marginTop: 2 },
  cta: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 5, marginTop: 6 },
  image: { width: 116, height: '100%', borderTopLeftRadius: 40, borderBottomLeftRadius: 0 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 5, marginTop: 10 },
  dot: { height: 6, borderRadius: 3 },
});
