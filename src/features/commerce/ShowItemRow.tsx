/**
 * Yayın sayfasındaki ürün satırları (Açık Artırma / Hemen Al / Çekiliş sekmeleri).
 */
import { Image } from 'expo-image';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Icon, PressableScale, Text, type IconName } from '@/components/ui';
import { CONDITION_LABELS } from '@/components/cards/ProductCard';
import { formatTRY } from '@/lib/format';
import { ME_ID } from '@/store/auth';
import { PRE_BID_STATUS_LABELS } from '@/store/orders';
import { liveColors, radius, SCREEN_PADDING, useTheme } from '@/theme';
import type { Product } from '@/types';

import { useMyPreBid, useRemainingStock } from './hooks';
import { discountPercent } from './utils';

/** Deterministik "N ön teklif" sayısı (mock) */
export function mockPreBidCount(productId: string): number {
  const n = parseInt(productId.replace(/\D/g, ''), 10) || 0;
  return (n * 7) % 9;
}

export function ShowItemRow({ product, ended, onPreBid }: { product: Product; ended?: boolean; onPreBid?: (p: Product) => void }) {
  const { colors } = useTheme();
  const preBid = useMyPreBid(product.id);
  const remaining = useRemainingStock(product);
  const soldOut = remaining <= 0;
  const own = product.sellerId === ME_ID;
  const discount = discountPercent(product);
  const bids = mockPreBidCount(product.id) + (preBid ? 1 : 0);

  const open = () => router.push(`/product/${product.id}`);

  let right: ReactNode = <Icon name="chevron-forward" size={18} color="textTertiary" />;
  if (soldOut || ended) {
    right = (
      <View style={[styles.soldTag, { backgroundColor: colors.surface }]}>
        <Text variant="caption" color="textSecondary">
          {product.format === 'auction' ? 'SATILDI' : 'TÜKENDİ'}
        </Text>
      </View>
    );
  } else if (product.format === 'auction' && !own && onPreBid) {
    right = <Button title={preBid ? 'Yükselt' : 'Ön Teklif'} size="sm" variant={preBid ? 'secondary' : 'primary'} onPress={() => onPreBid(product)} />;
  }

  return (
    <PressableScale scaleTo={0.99} onPress={open} style={styles.row} accessibilityRole="button" accessibilityLabel={product.title}>
      <View style={[styles.thumbWrap, { backgroundColor: colors.skeleton }]}>
        <Image source={{ uri: product.images[0] }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" recyclingKey={product.id} transition={150} />
        {product.suddenDeath && product.format === 'auction' ? (
          <View style={styles.flagBadge} accessibilityLabel="Uzatmasız">
            <Icon name="flag-outline" size={11} color={liveColors.text} />
          </View>
        ) : null}
      </View>
      <View style={styles.texts}>
        <Text variant="subhead" weight="700" numberOfLines={2}>
          {product.title}
        </Text>
        {product.format === 'auction' ? (
          <Text variant="footnote" color="textSecondary" numberOfLines={1}>
            Açılış <Text variant="footnote" weight="800">{formatTRY(product.price)}</Text>
            {bids > 0 && !ended ? ` · ${bids} ön teklif` : ''}
          </Text>
        ) : (
          <View style={styles.priceRow}>
            <Text variant="footnote" weight="800">
              {formatTRY(product.price)}
            </Text>
            {discount > 0 && product.compareAtPrice ? (
              <Text variant="caption" color="textTertiary" weight="500" style={styles.strike}>
                {formatTRY(product.compareAtPrice)}
              </Text>
            ) : null}
            {discount > 0 ? (
              <Text variant="caption" color="live">
                %{discount}
              </Text>
            ) : null}
          </View>
        )}
        {preBid && !ended ? (
          <Meta icon="trending-up" tint={preBid.status === 'outbid' ? colors.danger : colors.success} text={`Ön teklifin ${formatTRY(preBid.maxAmount)} · ${PRE_BID_STATUS_LABELS[preBid.status]}`} />
        ) : product.format === 'buy_now' && !soldOut ? (
          <Meta icon="cube-outline" tint={colors.textSecondary} text={`${remaining === 1 ? 'Son 1 adet' : `Stokta ${remaining} adet`} · ${CONDITION_LABELS[product.condition]}`} />
        ) : product.grade ? (
          <Meta icon="ribbon-outline" tint={colors.textSecondary} text={product.grade} />
        ) : (
          <Meta icon="pricetag-outline" tint={colors.textSecondary} text={CONDITION_LABELS[product.condition]} />
        )}
      </View>
      {right}
    </PressableScale>
  );
}

function Meta({ icon, text, tint }: { icon: IconName; text: string; tint: string }) {
  return (
    <View style={styles.meta}>
      <Icon name={icon} size={13} color={tint} />
      <Text variant="caption" weight="600" color={tint} numberOfLines={1} style={styles.metaText}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: SCREEN_PADDING, paddingVertical: 10 },
  thumbWrap: { width: 68, height: 68, borderRadius: radius.sm, overflow: 'hidden' },
  flagBadge: { position: 'absolute', left: 4, top: 4, width: 20, height: 20, borderRadius: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: liveColors.glassStrong },
  texts: { flex: 1, gap: 3 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  strike: { textDecorationLine: 'line-through' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { flexShrink: 1 },
  soldTag: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
});
