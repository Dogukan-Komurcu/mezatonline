import { Image } from 'expo-image';
import { router } from 'expo-router';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Icon, PressableScale, Text, toast } from '@/components/ui';
import { formatTRY } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { useSocialStore } from '@/store/social';
import { radius, useTheme } from '@/theme';
import type { Product } from '@/types';
import { AUTH_REASONS, requireAuth } from '@/features/auth/gate';

export type ProductCardProps = {
  product: Product;
  width: number;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  /** Kalp (kaydet) düğmesini gizle */
  hideSave?: boolean;
};

export const FORMAT_LABELS = { auction: 'Açık Artırma', buy_now: 'Hemen Al', giveaway: 'Çekiliş' } as const;

export const CONDITION_LABELS = {
  new: 'Yeni',
  like_new: 'Yeni gibi',
  very_good: 'Çok iyi',
  good: 'İyi',
  fair: 'Orta',
  graded: 'Derecelendirilmiş',
} as const;

/** Pazaryeri ürün kartı: kare görsel, fiyat, başlık, format etiketi */
export function ProductCard({ product, width, style, onPress, hideSave }: ProductCardProps) {
  const { colors } = useTheme();
  const saved = useSocialStore((s) => s.savedProductIds.includes(product.id));
  const toggleSave = useSocialStore((s) => s.toggleSaveProduct);
  const soldOut = product.sold >= product.quantity;
  const discount = product.compareAtPrice && product.format === 'buy_now' && product.compareAtPrice > product.price
    ? Math.round((1 - product.price / product.compareAtPrice) * 100)
    : 0;
  return (
    <PressableScale onPress={onPress ?? (() => router.push(`/product/${product.id}`))} style={[{ width }, style]} accessibilityRole="button" accessibilityLabel={product.title}>
      <View style={[styles.imageWrap, { width, height: width, backgroundColor: colors.skeleton }]}>
        <Image source={{ uri: product.images[0] }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} cachePolicy="memory-disk" recyclingKey={product.id} />
        {!hideSave ? (
          <PressableScale
            scaleTo={0.85}
            style={styles.heart}
            onPress={() =>
              requireAuth(
                () => {
                  const on = toggleSave(product.id);
                  haptic.light();
                  if (on) toast.success('Kaydedilenlere eklendi', 'heart');
                },
                { reason: AUTH_REASONS.save },
              )
            }
            accessibilityLabel="Kaydet">
            <Icon name={saved ? 'heart' : 'heart-outline'} size={18} color={saved ? colors.live : '#FFFFFF'} />
          </PressableScale>
        ) : null}
        {discount > 0 ? (
          <View style={[styles.tag, { backgroundColor: colors.live }]}>
            <Text variant="caption" color="#FFFFFF">
              %{discount}
            </Text>
          </View>
        ) : product.grade ? (
          <View style={[styles.tag, { backgroundColor: '#0A0A0A' }]}>
            <Text variant="caption" color="#FFE414">
              {product.grade}
            </Text>
          </View>
        ) : null}
        {soldOut ? (
          <View style={styles.soldOut}>
            <Text variant="subhead" weight="800" color="#FFFFFF">
              SATILDI
            </Text>
          </View>
        ) : null}
      </View>
      <View style={styles.priceRow}>
        <Text variant="headline" weight="800" numberOfLines={1}>
          {formatTRY(product.price)}
        </Text>
        {discount > 0 && product.compareAtPrice ? (
          <Text variant="footnote" color="textTertiary" style={styles.strike} numberOfLines={1}>
            {formatTRY(product.compareAtPrice)}
          </Text>
        ) : null}
      </View>
      <Text variant="subhead" numberOfLines={2} style={{ marginTop: 1 }}>
        {product.title}
      </Text>
      <Text variant="footnote" color="textSecondary" numberOfLines={1} style={{ marginTop: 2 }}>
        {FORMAT_LABELS[product.format]} · {product.shippingCost > 0 ? `+${formatTRY(product.shippingCost)} kargo` : 'Ücretsiz kargo'}
      </Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  imageWrap: { borderRadius: radius.md, overflow: 'hidden' },
  heart: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tag: { position: 'absolute', left: 6, top: 6, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  soldOut: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 8 },
  strike: { textDecorationLine: 'line-through' },
});
