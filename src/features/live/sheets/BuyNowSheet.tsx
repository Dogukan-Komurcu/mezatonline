import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Divider, Icon, PressableScale, Sheet, Text } from '@/components/ui';
import { CONDITION_LABELS } from '@/components/cards/ProductCard';
import { DEMO_COPY } from '@/config/demo';
import { Checkbox } from '@/features/commerce/components';
import { useSellerOf } from '@/features/commerce/hooks';
import { contractSections } from '@/features/commerce/infoSheets';
import { formatTRY } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { buyerServiceFee } from '@/lib/pricing';
import { useMe } from '@/store/auth';
import { selectDefaultAddress, selectDefaultPayment, useWalletStore } from '@/store/wallet';
import { liveColors, useTheme } from '@/theme';
import type { Product } from '@/types';

import { alpha } from '../components/styles';
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
  const seller = useSellerOf(product?.sellerId);
  const me = useMe();
  const [qty, setQty] = useState(1);
  const [more, setMore] = useState(false);
  // Sözleşme onayı her satın alımda yeniden istenir (açık onay kutusu)
  const [agreed, setAgreed] = useState(false);
  const [doc, setDoc] = useState<'pre' | 'distance' | null>(null);
  useEffect(() => {
    if (visible) {
      setQty(1);
      setMore(false);
      setAgreed(false);
      setDoc(null);
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
  const contract = contractSections({
    product,
    seller,
    quantity: qty,
    itemTotal: unitPrice * qty,
    shipping,
    serviceFee: fee,
    discount: Math.round((discount * qty + creditUsed) * 100) / 100,
    total,
    address,
    buyerName: address?.fullName || me.displayName,
  });
  const toggleDoc = (d: 'pre' | 'distance') => setDoc((cur) => (cur === d ? null : d));

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      dark
      maxHeight={0.92}
      footer={
        <View style={styles.footer}>
          <Checkbox checked={agreed} onToggle={() => setAgreed((v) => !v)}>
            <Text variant="caption" color="textSecondary">
              <Text variant="caption" weight="700" color="accent" onPress={() => toggleDoc('pre')} suppressHighlighting>
                Ön Bilgilendirme Formu
              </Text>
              {'’nu ve '}
              <Text variant="caption" weight="700" color="accent" onPress={() => toggleDoc('distance')} suppressHighlighting>
                Mesafeli Satış Sözleşmesi
              </Text>
              {'’ni okudum, onaylıyorum.'}
            </Text>
          </Checkbox>
          <View style={styles.buttons}>
            <Button title="Vazgeç" variant="outline" size="lg" onPress={onClose} style={styles.cancel} />
            <Button
              title={ready ? `${formatTRY(total, { cents: true })} Öde` : 'Ödeme bilgisi ekle'}
              size="lg"
              loading={processing}
              disabled={ready && !agreed}
              onPress={() => onConfirm(qty)}
              style={styles.pay}
              icon={ready ? 'lock-closed' : 'card-outline'}
            />
          </View>
        </View>
      }>
      {doc ? (
        <View style={styles.contract}>
          <View style={styles.contractHead}>
            <Text variant="headline" weight="800" style={styles.flex}>
              {doc === 'pre' ? 'Ön Bilgilendirme Formu' : 'Mesafeli Satış Sözleşmesi'}
            </Text>
            <Text variant="footnote" weight="700" color="accent" onPress={() => setDoc(null)} suppressHighlighting>
              Ödemeye dön
            </Text>
          </View>
          <Text variant="caption" color="textTertiary">
            Düzenlenme tarihi: {contract.today}
          </Text>
          {(doc === 'pre' ? contract.pre : contract.distance).map(([h, body]) => (
            <View key={h} style={styles.clause}>
              <Text variant="subhead" weight="700">
                {h}
              </Text>
              <Text variant="footnote" color="textSecondary">
                {body}
              </Text>
            </View>
          ))}
        </View>
      ) : (
        <>
          <View style={styles.head}>
            <View style={styles.flex}>
              {flash ? (
                <View style={styles.flashTag}>
                  <Icon name="flash-outline" size={11} color={liveColors.copper} />
                  <Text variant="caption" weight="800" color={liveColors.copper}>
                    Flaş indirim
                  </Text>
                </View>
              ) : null}
              <Text variant="title3" weight="800" numberOfLines={3}>
                {product.title}
              </Text>
              <Text variant="footnote" color={stock <= 2 ? liveColors.copper : 'textSecondary'} style={styles.stock}>
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
            <Icon name="shield-checkmark-outline" size={14} color={liveColors.success} />
            <Text variant="caption" color="textSecondary" style={styles.flex}>
              Alıcı Koruması: ürün sana ulaşmazsa ya da açıklamayla önemli ölçüde farklıysa paran iade edilir; sorunu ürün sana ulaştıktan sonra 14 gün içinde bildirmen yeterli.
            </Text>
          </View>
          <Text variant="caption" color="textTertiary" style={styles.demo}>
            {DEMO_COPY.payment}
          </Text>
        </>
      )}
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
      <Icon name={edit ? 'pencil-outline' : 'chevron-forward'} size={16} color="textTertiary" />
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
  flashTag: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: alpha(liveColors.copper, 0.14),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: alpha(liveColors.copper, 0.6),
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginBottom: 6,
  },
  stock: { marginTop: 4, marginBottom: 4 },
  desc: { marginTop: 10 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14 },
  qtyBtn: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  qty: { minWidth: 24 },
  divider: { marginVertical: 10 },
  section: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  strike: { textDecorationLine: 'line-through' },
  totalRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginTop: 8 },
  totalRight: { alignItems: 'flex-end' },
  protect: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, marginBottom: 4 },
  footer: { gap: 10 },
  demo: { marginBottom: 4 },
  contract: { gap: 10, paddingTop: 4, paddingBottom: 8 },
  contractHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  clause: { gap: 3 },
  buttons: { flexDirection: 'row', gap: 10 },
  cancel: { flex: 3 },
  pay: { flex: 7 },
});
