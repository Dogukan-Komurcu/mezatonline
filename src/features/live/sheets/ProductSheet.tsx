import { Image } from 'expo-image';
import { useState } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { Button, Icon, Sheet, Text, toast } from '@/components/ui';
import { CONDITION_LABELS, FORMAT_LABELS } from '@/components/cards/ProductCard';
import { AUTH_REASONS } from '@/features/auth/gate';
import { formatTRY } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { SHIPPING_PROFILE_LABELS } from '@/lib/pricing';
import { useSocialStore } from '@/store/social';
import { liveColors, SCREEN_PADDING, useTheme } from '@/theme';
import type { Product } from '@/types';

export type ProductSheetProps = {
  visible: boolean;
  onClose: () => void;
  product?: Product;
  /** Sahnedeki lotun güncel teklifi (varsa) */
  currentBid?: number;
  shippingLine: string;
  onOpenPage: (p: Product) => void;
  /** Giriş kapısı: misafirse sayfa kapatılıp giriş istenir, giriş sonrası işlem çalışır */
  withAuth: (action: () => void, reason: string) => void;
};

/** Sabit ürün kartına dokununca: fotoğraflar, durum, açıklama, kargo */
export function ProductSheet({ visible, onClose, product, currentBid, shippingLine, onOpenPage, withAuth }: ProductSheetProps) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const [page, setPage] = useState(0);
  const saved = useSocialStore((s) => (product ? s.savedProductIds.includes(product.id) : false));
  const toggleSave = useSocialStore((s) => s.toggleSaveProduct);
  if (!product) return null;
  const imgW = width - SCREEN_PADDING * 2;
  const giveaway = product.format === 'giveaway';
  return (
    <Sheet visible={visible} onClose={onClose} dark maxHeight={0.9}>
      <View style={styles.gallery}>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / imgW))}>
          {product.images.map((uri) => (
            <Image key={uri} source={{ uri }} style={[styles.image, { width: imgW, height: imgW * 0.8 }]} contentFit="cover" cachePolicy="memory-disk" />
          ))}
        </ScrollView>
        {product.images.length > 1 ? (
          <View style={styles.dots}>
            {product.images.map((uri, i) => (
              <View key={uri} style={[styles.dot, { backgroundColor: i === page ? liveColors.text : liveColors.glassLight }]} />
            ))}
          </View>
        ) : null}
      </View>
      <View style={styles.tags}>
        <View style={[styles.tag, { backgroundColor: colors.surfaceAlt }]}>
          <Text variant="caption" weight="800">
            {FORMAT_LABELS[product.format]}
          </Text>
        </View>
        <View style={[styles.tag, { backgroundColor: colors.surfaceAlt }]}>
          <Text variant="caption" weight="800">
            {product.grade ?? CONDITION_LABELS[product.condition]}
          </Text>
        </View>
        {product.suddenDeath && product.format === 'auction' ? (
          <View style={[styles.tag, { backgroundColor: colors.surfaceAlt }]}>
            <Text variant="caption" weight="800">
              💀 Ani Bitiş
            </Text>
          </View>
        ) : null}
      </View>
      <Text variant="title3" weight="800" style={styles.title}>
        {product.title.replace(/^🎁\s*/, '')}
      </Text>
      <Text variant="title2" weight="900" color={liveColors.primary}>
        {giveaway ? 'Ücretsiz çekiliş' : currentBid !== undefined ? `Güncel teklif ${formatTRY(currentBid)}` : formatTRY(product.price)}
      </Text>
      {product.compareAtPrice && product.compareAtPrice > product.price && !giveaway ? (
        <Text variant="footnote" color="textSecondary">
          Tahmini piyasa değeri {formatTRY(product.compareAtPrice)}
        </Text>
      ) : null}
      <Text variant="subhead" color="textSecondary" style={styles.desc}>
        {product.description}
      </Text>
      <View style={[styles.info, { backgroundColor: colors.surface }]}>
        <InfoRow icon="cube-outline" label={shippingLine} />
        <InfoRow icon="resize-outline" label={SHIPPING_PROFILE_LABELS[product.shippingProfile]} />
        <InfoRow icon="shield-checkmark-outline" label="Alıcı Koruması kapsamında" />
      </View>
      <View style={styles.actions}>
        <Button
          title={saved ? 'Kaydedildi' : 'Kaydet'}
          icon={saved ? 'heart' : 'heart-outline'}
          variant="secondary"
          onPress={() =>
            withAuth(() => {
              const on = toggleSave(product.id);
              haptic.success();
              toast.success(on ? 'Ürün kaydedildi' : 'Kayıtlardan çıkarıldı', on ? 'heart' : 'heart-dislike');
            }, AUTH_REASONS.save)
          }
          style={styles.flex}
        />
        {!giveaway ? <Button title="Ürün sayfası" iconRight="open-outline" variant="secondary" onPress={() => onOpenPage(product)} style={styles.flex} /> : null}
      </View>
    </Sheet>
  );
}

function InfoRow({ icon, label }: { icon: 'cube-outline' | 'resize-outline' | 'shield-checkmark-outline'; label: string }) {
  return (
    <View style={styles.infoRow}>
      <Icon name={icon} size={16} color="textSecondary" />
      <Text variant="footnote" color="textSecondary" style={styles.flex}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gallery: { borderRadius: 16, overflow: 'hidden', marginTop: 4 },
  image: { backgroundColor: liveColors.panelAlt },
  dots: { position: 'absolute', bottom: 10, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 5 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  tag: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  title: { marginTop: 8, marginBottom: 2 },
  desc: { marginTop: 8 },
  info: { borderRadius: 14, padding: 12, gap: 8, marginTop: 14 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 16, marginBottom: 4 },
});
