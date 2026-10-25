import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Divider, Icon, PressableScale, Sheet, Text } from '@/components/ui';
import { CONDITION_LABELS } from '@/components/cards/ProductCard';
import { formatTRY } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { buyerServiceFee } from '@/lib/pricing';
import { selectDefaultAddress, selectDefaultPayment, useWalletStore } from '@/store/wallet';
import { liveColors, useTheme } from '@/theme';
import type { Product } from '@/types';

import { couponDiscount, useLivePrefs } from '../liveStore';

const BRAND_LABEL = { visa: 'Visa', mastercard: 'Mastercard', troy: 'Troy', amex: 'Amex' } as const;

export type BuyNowSheetProps = {
  visible: boolean;
  onClose: () => void;
  product?: Product;
  unitPrice: number;
  originalPrice?: number;
  flash: boolean;
  stock: number;
  bundled: boolean;
  processing: boolean;
  onNavigate: (href: string) => void;
  onConfirm: (quantity: number) => void;
};

/** S25: Hemen Al ödeme sayfası (canlı yayın üstünde, koyu) */
export function BuyNowSheet({ visible, onClose, product, unitPrice, originalPrice, flash, stock, bundled, processing, onNavigate, onConfirm }: BuyNowSheetProps) {
  const { colors } = useTheme();
  const address = useWalletStore(selectDefaultAddress);
  const payment = useWalletStore(selectDefaultPayment);
  const credits = useWalletStore((s) => s.credits);
  const coupon = useLivePrefs((s) => s.coupon);
  const useCredits = useLivePrefs((s) => s.useCredits);
  const [qty, setQty] = useState(1);
  const [more, setMore] = useState(false);
  useEffect(() => {
    if (visible) {
      setQty(1);
      setMore(false);
    }
  }, [visible]);

  if (!product) return null;
  const maxQty = Math.max(1, Math.min(stock, flash ? 2 : 5));
  const discount = qty === 1 ? couponDiscount(coupon, unitPrice) : 0;
  const itemTotal = Math.max(0, unitPrice - discount) * qty;
  const shipping = bundled ? 0 : product.shippingCost;
  const fee = buyerServiceFee(itemTotal);
  const creditUsed = useCredits ? Math.min(credits, itemTotal) : 0;
  const total = Math.max(0, Math.round((itemTotal + shipping + fee - creditUsed) * 100) / 100);
  const ready = !!address && !!payment;

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      dark
      maxHeight={0.92}
      footer={
        <View style={styles.footer}>
          <View style={styles.buttons}>
            <Button title="Vazgeç" variant="outline" size="lg" onPress={onClose} style={styles.cancel} />
            <Button title={ready ? `${formatTRY(total, { cents: true })} Öde` : 'Ödeme bilgisi ekle'} size="lg" loading={processing} onPress={() => onConfirm(qty)} style={styles.pay} icon={ready ? 'lock-closed' : 'card-outline'} />
          </View>
          <Text variant="caption" color="textTertiary" align="center">
            Ödemeyi tamamlayarak Ön Bilgilendirme Formu ve Mesafeli Satış Sözleşmesi’ni kabul etmiş olursun.
          </Text>
        </View>
      }>
      <View style={styles.head}>
        <View style={styles.flex}>
          {flash ? (
            <View style={styles.flashTag}>
              <Text variant="caption" weight="900" color={liveColors.onPrimary}>
                ⚡ FLAŞ İNDİRİM
              </Text>
            </View>
          ) : null}
          <Text variant="title3" weight="800" numberOfLines={3}>
            {product.title}
          </Text>
          <Text variant="footnote" color={stock <= 2 ? liveColors.primary : 'textSecondary'} style={styles.stock}>
            • {stock <= 1 ? 'Son 1 adet' : `Stokta ${stock} adet`} · {product.grade ?? CONDITION_LABELS[product.condition]}
          </Text>
          <Text variant="footnote" weight="700" color="accent" onPress={() => setMore((m) => !m)} suppressHighlighting>
            {more ? 'Daha az göster ⌃' : 'Ayrıntıları gör ⌄'}
          </Text>
        </View>
        <Image source={{ uri: product.images[0] }} style={styles.thumb} contentFit="cover" cachePolicy="memory-disk" />
      </View>
      {more ? (
        <Text variant="subhead" color="textSecondary" style={styles.desc}>
          {product.description}
        </Text>
      ) : null}

      {maxQty > 1 ? (
        <View style={styles.qtyRow}>
          <Text variant="body" weight="600" style={styles.flex}>
            Adet
          </Text>
          <PressableScale
            onPress={() => {
              haptic.tap();
              setQty((q) => Math.max(1, q - 1));
            }}
            disabled={qty <= 1}
            style={[styles.qtyBtn, { backgroundColor: colors.surfaceAlt, opacity: qty <= 1 ? 0.4 : 1 }]}
            accessibilityLabel="Azalt">
            <Icon name="remove" size={18} color="text" />
          </PressableScale>
          <Text variant="headline" weight="800" style={styles.qty} align="center">
            {qty}
          </Text>
          <PressableScale
            onPress={() => {
              haptic.tap();
              setQty((q) => Math.min(maxQty, q + 1));
            }}
            disabled={qty >= maxQty}
            style={[styles.qtyBtn, { backgroundColor: colors.surfaceAlt, opacity: qty >= maxQty ? 0.4 : 1 }]}
            accessibilityLabel="Artır">
            <Icon name="add" size={18} color="text" />
          </PressableScale>
        </View>
      ) : null}

      <Divider style={styles.divider} />
      <Section icon="pricetag-outline" title="Promosyon" value={coupon ? (discount > 0 ? `${coupon.code} · -${formatTRY(discount)}` : `${coupon.code} bu alışverişe uygulanamıyor`) : 'Kupon yok · Cüzdan’dan ekleyebilirsin'} onPress={() => onNavigate('wallet')} />
      <Section
        icon="card-outline"
        title="Ödeme"
        value={payment ? `${BRAND_LABEL[payment.brand]} •••• ${payment.last4} · Tek çekim` : 'Kart ekle'}
        onPress={() => onNavigate('/settings/payments')}
        edit
      />
      <Section
        icon="location-outline"
        title="Adres"
        value={address ? `${address.fullName} · ${address.neighborhood}, ${address.district}/${address.city}` : 'Teslimat adresi ekle'}
        onPress={() => onNavigate('/settings/addresses')}
        edit
      />
      <Divider style={styles.divider} />

      <Line label={`Ara toplam${qty > 1 ? ` (${qty} adet)` : ''}`} value={formatTRY(unitPrice * qty, { cents: true })} strike={originalPrice && originalPrice > unitPrice ? formatTRY(originalPrice * qty) : undefined} />
      {discount > 0 ? <Line label="Kupon indirimi" value={`-${formatTRY(discount, { cents: true })}`} positive /> : null}
      <Line label="Kargo" value={bundled ? '+₺0 · aynı pakete eklendi' : formatTRY(shipping, { cents: true })} positive={bundled} />
      <Line label="Alıcı Koruması hizmet bedeli" value={formatTRY(fee, { cents: true })} />
      {creditUsed > 0 ? <Line label="Mezat kredisi" value={`-${formatTRY(creditUsed, { cents: true })}`} positive /> : null}
      <View style={styles.totalRow}>
        <Text variant="title3" weight="800">
          Toplam
        </Text>
        <View style={styles.totalRight}>
          <Text variant="title3" weight="900">
            {formatTRY(total, { cents: true })}
          </Text>
          <Text variant="caption" color="textSecondary">
            KDV dahil
          </Text>
        </View>
      </View>
      <View style={styles.protect}>
        <Icon name="shield-checkmark" size={14} color={liveColors.success} />
        <Text variant="caption" color="textSecondary" style={styles.flex}>
          Alıcı Koruması: ürün gelmezse veya açıklamaya uymazsa paran iade edilir.
        </Text>
      </View>
    </Sheet>
  );
}

function Section({ icon, title, value, onPress, edit }: { icon: 'pricetag-outline' | 'card-outline' | 'location-outline'; title: string; value: string; onPress: () => void; edit?: boolean }) {
  return (
    <PressableScale scaleTo={0.99} onPress={onPress} style={styles.section}>
      <Icon name={icon} size={20} color="text" />
      <View style={styles.flex}>
        <Text variant="subhead" weight="700">
          {title}
        </Text>
        <Text variant="footnote" color="textSecondary" numberOfLines={1}>
          {value}
        </Text>
      </View>
      <Icon name={edit ? 'pencil' : 'chevron-forward'} size={16} color="textTertiary" />
    </PressableScale>
  );
}

function Line({ label, value, positive, strike }: { label: string; value: string; positive?: boolean; strike?: string }) {
  return (
    <View style={styles.line}>
      <Text variant="subhead" color="textSecondary" style={styles.flex}>
        {label}
      </Text>
      {strike ? (
        <Text variant="footnote" color="textTertiary" style={styles.strike}>
          {strike}
        </Text>
      ) : null}
      <Text variant="subhead" weight="700" color={positive ? liveColors.success : 'text'}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  head: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', paddingTop: 4 },
  thumb: { width: 84, height: 84, borderRadius: 12, backgroundColor: liveColors.panelAlt },
  flashTag: { alignSelf: 'flex-start', backgroundColor: liveColors.primary, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1, marginBottom: 4 },
  stock: { marginTop: 4, marginBottom: 4 },
  desc: { marginTop: 10 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14 },
  qtyBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  qty: { minWidth: 24 },
  divider: { marginVertical: 10 },
  section: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  strike: { textDecorationLine: 'line-through' },
  totalRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginTop: 8 },
  totalRight: { alignItems: 'flex-end' },
  protect: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, marginBottom: 4 },
  footer: { gap: 8 },
  buttons: { flexDirection: 'row', gap: 10 },
  cancel: { flex: 3 },
  pay: { flex: 7 },
});
