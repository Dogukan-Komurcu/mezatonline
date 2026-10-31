import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';

import { Icon, PressableScale, Text } from '@/components/ui';
import { formatCountdown, formatTRY } from '@/lib/format';
import { liveColors } from '@/theme';

import type { FlashSale } from '../engine';
import { useRemaining } from '../useLiveShow';
import { alpha, PANEL } from './styles';

/** Flaş indirim kartı: bakır kenarlı "Flaş %X" etiketi · geri sayım · üstü çizili eski fiyat · turkuaz Hemen Al */
export function FlashSaleCard({ flash, onBuy }: { flash: FlashSale; onBuy: () => void }) {
  const remaining = useRemaining(flash.status === 'running' ? flash.endsAt : undefined);
  const running = flash.status === 'running' && flash.remaining > 0;
  const pct = Math.round((1 - flash.price / flash.originalPrice) * 100);
  return (
    <Animated.View entering={FadeInDown.springify().damping(18)} exiting={FadeOutDown} style={styles.card}>
      <View style={styles.badge}>
        <Icon name="flash-outline" size={11} color={liveColors.copper} />
        <Text variant="caption" weight="800" color={liveColors.copper}>
          Flaş %{pct}
        </Text>
      </View>
      <Image source={{ uri: flash.product.images[0] }} style={styles.thumb} contentFit="cover" cachePolicy="memory-disk" />
      <View style={styles.info}>
        <Text variant="footnote" weight="700" color={liveColors.text} numberOfLines={1}>
          {flash.product.title}
        </Text>
        <View style={styles.priceRow}>
          <Text variant="caption" weight="600" color={liveColors.textTertiary} style={styles.strike}>
            {formatTRY(flash.originalPrice)}
          </Text>
          <Text variant="subhead" weight="800" color={liveColors.accent}>
            {formatTRY(flash.price)}
          </Text>
          <Text variant="caption" weight="700" color={running && remaining < 10 ? liveColors.live : liveColors.textSecondary} tabular>
            {running ? `· ${formatCountdown(remaining)} · ${flash.remaining} adet` : '· Sona erdi'}
          </Text>
        </View>
      </View>
      <PressableScale scaleTo={0.94} disabled={!running} onPress={onBuy} style={[styles.buy, !running && styles.buyDisabled]} accessibilityRole="button" accessibilityLabel="Hemen Al" accessibilityState={{ disabled: !running }}>
        <Text variant="footnote" weight="800" color={running ? liveColors.onPrimary : liveColors.textSecondary}>
          {running ? 'Hemen Al' : 'Bitti'}
        </Text>
      </PressableScale>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 8,
    paddingTop: 14,
    borderRadius: 16,
    backgroundColor: PANEL,
    borderWidth: 1,
    borderColor: alpha(liveColors.copper, 0.55),
    marginBottom: 8,
  },
  badge: {
    position: 'absolute',
    top: -9,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: liveColors.panel,
    borderWidth: 1,
    borderColor: liveColors.copper,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 1,
  },
  thumb: { width: 40, height: 40, borderRadius: 10, backgroundColor: liveColors.panelAlt },
  info: { flex: 1, gap: 1 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 5, flexWrap: 'wrap' },
  strike: { textDecorationLine: 'line-through' },
  buy: { backgroundColor: liveColors.primary, borderRadius: 14, paddingHorizontal: 14, height: 40, alignItems: 'center', justifyContent: 'center' },
  buyDisabled: { backgroundColor: liveColors.glassLight },
});
