import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { Icon, PressableScale, Text } from '@/components/ui';
import { haptic } from '@/lib/haptics';
import { liveColors } from '@/theme';

import { alpha } from './styles';

export type BottomBarProps = {
  shopCount: number;
  shopThumb?: string;
  reactionEmoji: string;
  onCompose: () => void;
  onReact: () => void;
  onReactLong: () => void;
  onShop: () => void;
};

/** S20-D: "Bir şey yaz…" + tepki (kalp) + Mağaza kutucuğu */
export function BottomBar({ shopCount, shopThumb, reactionEmoji, onCompose, onReact, onReactLong, onShop }: BottomBarProps) {
  return (
    <View style={styles.row}>
      <PressableScale scaleTo={0.98} onPress={onCompose} style={styles.input} accessibilityRole="button" accessibilityLabel="Bir şey yaz">
        <Icon name="chatbubble-ellipses-outline" size={17} color={liveColors.textSecondary} />
        <Text variant="callout" weight="500" color={liveColors.textSecondary} numberOfLines={1} style={styles.flex}>
          Bir şey yaz…
        </Text>
      </PressableScale>
      <PressableScale
        scaleTo={0.85}
        onPress={() => {
          haptic.light();
          onReact();
        }}
        onLongPress={() => {
          haptic.medium();
          onReactLong();
        }}
        delayLongPress={350}
        style={styles.heart}
        accessibilityRole="button"
        accessibilityLabel="Tepki gönder"
        accessibilityHint="Uzun basınca tepki seçebilirsin">
        <Text style={styles.heartEmoji}>{reactionEmoji}</Text>
      </PressableScale>
      <PressableScale scaleTo={0.9} onPress={onShop} style={styles.shop} accessibilityRole="button" accessibilityLabel={`Mağaza, ${shopCount} ürün`}>
        {shopThumb ? (
          <Image source={{ uri: shopThumb }} style={styles.shopThumb} contentFit="cover" cachePolicy="memory-disk" />
        ) : (
          <Icon name="storefront" size={20} color={liveColors.text} />
        )}
        <View style={styles.shopIcon}>
          <Icon name="storefront" size={11} color={liveColors.onPrimary} />
        </View>
        {shopCount > 0 ? (
          <View style={styles.badge}>
            <Text variant="caption" weight="800" color={liveColors.onPrimary} style={styles.badgeText}>
              {shopCount > 99 ? '99+' : shopCount}
            </Text>
          </View>
        ) : null}
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flex: { flex: 1 },
  input: {
    flex: 1,
    height: 42,
    borderRadius: 999,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: alpha(liveColors.text, 0.12),
    borderWidth: 1,
    borderColor: alpha(liveColors.text, 0.22),
  },
  heart: { width: 42, height: 42, borderRadius: 21, backgroundColor: liveColors.primary, alignItems: 'center', justifyContent: 'center' },
  heartEmoji: { fontSize: 20, lineHeight: 24 },
  shop: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: liveColors.glassStrong,
    borderWidth: 1.5,
    borderColor: alpha(liveColors.text, 0.5),
    alignItems: 'center',
    justifyContent: 'center',
  },
  shopThumb: { width: 41, height: 41, borderRadius: 10 },
  shopIcon: {
    position: 'absolute',
    left: -4,
    bottom: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: liveColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -7,
    right: -7,
    minWidth: 20,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: liveColors.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 10, lineHeight: 12 },
});
