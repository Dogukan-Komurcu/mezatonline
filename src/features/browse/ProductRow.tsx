/**
 * Arama sonuçlarındaki liste düzeni ürün satırı (Whatnot "Products" sekmesi):
 * solda 150px kare görsel + kaydet hapı, sağda satıcı, başlık, alt bilgi, fiyat, yayın bilgisi.
 */
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { CONDITION_LABELS, FORMAT_LABELS } from '@/components/cards/ProductCard';
import { Avatar, Icon, PressableScale, Text, toast } from '@/components/ui';
import { getSubcategory, getUser } from '@/data';
import { formatCompact, formatRating, formatShowTime, formatTRY } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { useSocialStore } from '@/store/social';
import { radius, SCREEN_PADDING, useTheme } from '@/theme';
import type { Product } from '@/types';

import { productShow } from './filters';

export const PRODUCT_ROW_IMAGE = 150;

export function ProductRow({ product }: { product: Product }) {
  const { colors } = useTheme();
  const seller = getUser(product.sellerId);
  const saved = useSocialStore((s) => s.savedProductIds.includes(product.id));
  const toggleSave = useSocialStore((s) => s.toggleSaveProduct);
  const sub = getSubcategory(product.categoryId, product.subcategoryId);
  const show = productShow(product);
  const meta = [sub?.name, product.grade ?? CONDITION_LABELS[product.condition]].filter(Boolean).join(' · ');
  const saves = product.saves + (saved ? 1 : 0);

  return (
    <PressableScale scaleTo={0.985} onPress={() => router.push(`/product/${product.id}`)} style={styles.row} accessibilityRole="button" accessibilityLabel={product.title}>
      <View style={[styles.imageWrap, { backgroundColor: colors.skeleton }]}>
        <Image source={{ uri: product.images[0] }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} cachePolicy="memory-disk" recyclingKey={product.id} />
        <PressableScale
          scaleTo={0.88}
          hitSlop={6}
          onPress={() => {
            const on = toggleSave(product.id);
            haptic.light();
            toast.success(on ? 'Kaydedilenlere eklendi' : 'Kaydedilenlerden çıkarıldı', on ? 'bookmark' : 'bookmark-outline');
          }}
          style={[styles.savePill, { backgroundColor: colors.card }]}
          accessibilityRole="button"
          accessibilityLabel={saved ? 'Kaydedildi' : 'Kaydet'}>
          <Icon name={saved ? 'bookmark' : 'bookmark-outline'} size={13} color="text" />
          <Text variant="caption" color="text" tabular>
            {formatCompact(saves)}
          </Text>
        </PressableScale>
      </View>

      <View style={styles.body}>
        {seller ? (
          <PressableScale scaleTo={0.97} onPress={() => router.push(`/user/${seller.username}`)} style={styles.sellerRow} hitSlop={4}>
            <Avatar uri={seller.avatar} name={seller.username} size={20} />
            <Text variant="callout" weight="600" numberOfLines={1} style={styles.shrink}>
              {seller.username}
            </Text>
            <Text variant="footnote" color="textSecondary">
              •
            </Text>
            <Icon name="star" size={12} color="warning" />
            <Text variant="footnote" weight="600" color="textSecondary">
              {formatRating(seller.rating)}
            </Text>
          </PressableScale>
        ) : null}
        <Text variant="headline" numberOfLines={2}>
          {product.title}
        </Text>
        {meta ? (
          <Text variant="subhead" color="textSecondary" numberOfLines={1}>
            {meta}
          </Text>
        ) : null}
        <View style={styles.priceRow}>
          <Text variant="title3" weight="800" numberOfLines={1}>
            {formatTRY(product.price)}
          </Text>
          <Text variant="footnote" color="textSecondary" numberOfLines={1} style={styles.shrink}>
            {product.format === 'auction' ? 'Açılış · Açık Artırma' : FORMAT_LABELS[product.format]}
          </Text>
        </View>
        {show ? (
          show.status === 'live' ? (
            <View style={styles.showRow}>
              <View style={[styles.liveDot, { backgroundColor: colors.live }]} />
              <Text variant="footnote" weight="700" color="live" numberOfLines={1}>
                Şu an canlı yayında
              </Text>
            </View>
          ) : (
            <Text variant="footnote" color="textSecondary" numberOfLines={1}>
              Yayın başlıyor: {formatShowTime(show.scheduledAt)}
            </Text>
          )
        ) : null}
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12, paddingHorizontal: SCREEN_PADDING, paddingVertical: 10 },
  imageWrap: { width: PRODUCT_ROW_IMAGE, height: PRODUCT_ROW_IMAGE, borderRadius: radius.sm, overflow: 'hidden' },
  savePill: {
    position: 'absolute',
    top: 6,
    right: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  body: { flex: 1, gap: 4, paddingTop: 2 },
  sellerRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  shrink: { flexShrink: 1 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 2 },
  showRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  liveDot: { width: 7, height: 7, borderRadius: 4 },
});
