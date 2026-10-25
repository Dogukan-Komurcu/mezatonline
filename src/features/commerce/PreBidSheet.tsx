/**
 * S42 — Ön Teklif sayfası (yayın öncesi maks. teklif).
 * Asgari tutar açılış fiyatıdır (mevcut ön teklif varsa ondan yüksek olmalı), üst sınır yoktur.
 * Ön teklifler bağlayıcıdır, iptal edilemez / düşürülemez; yayının planlanan saatinden 24 saat sonra sona erer.
 */
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Button, Chip, Icon, Sheet, Text, toast } from '@/components/ui';
import { requireTransactSetup } from '@/features/wallet/TransactSetup';
import { bidIncrement } from '@/lib/auction';
import { formatDateTime, formatShowTime, formatTRY } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { ME_ID } from '@/store/auth';
import { useOrdersStore } from '@/store/orders';
import { completeChallenge } from '@/store/rewards';
import { selectDefaultAddress, selectDefaultPayment, useWalletStore } from '@/store/wallet';
import { radius, useTheme } from '@/theme';
import type { Product, Show } from '@/types';

import { AmountInput, CardBrandMark, NoticeBox } from './components';
import { useMyPreBid } from './hooks';
import { DAY_MS } from './utils';

export type PreBidSheetProps = {
  visible: boolean;
  onClose: () => void;
  product: Product | undefined;
  show: Show | undefined;
};

/** Hızlı seçim tutarları: asgari + artan adımlar */
function suggestions(min: number): number[] {
  const out: number[] = [min];
  let v = min;
  [1, 2, 4, 8].forEach((k) => {
    v = v + bidIncrement(v) * k;
    out.push(v);
  });
  return out;
}

export function PreBidSheet({ visible, onClose, product, show }: PreBidSheetProps) {
  const { colors } = useTheme();
  const existing = useMyPreBid(product?.id);
  const payment = useWalletStore(selectDefaultPayment);
  const address = useWalletStore(selectDefaultAddress);
  const base = product ? Math.max(1, product.price) : 1;
  const min = existing ? existing.maxAmount + bidIncrement(existing.maxAmount) : base;
  const [amount, setAmount] = useState<number>(min);
  const [submitting, setSubmitting] = useState(false);

  // Her açılışta asgari tutardan başla
  useEffect(() => {
    if (visible) setAmount(min);
  }, [visible, min]);

  if (!product || !show) return null;

  const chips = suggestions(min);
  const error = amount < min ? `En az ${formatTRY(min)} olmalı` : undefined;
  const expiresAt = new Date(new Date(show.scheduledAt).getTime() + DAY_MS);
  const own = product.sellerId === ME_ID;

  const submit = () => {
    if (own) {
      toast.error('Kendi ürününe teklif veremezsin');
      return;
    }
    if (error) {
      haptic.error();
      return;
    }
    requireTransactSetup(
      () => {
        setSubmitting(true);
        setTimeout(() => {
          useOrdersStore.getState().placePreBid(product.id, show.id, amount);
          const pts = completeChallenge('place_bid');
          setSubmitting(false);
          haptic.success();
          toast.success(
            existing
              ? `Ön teklifin ${formatTRY(amount)} olarak güncellendi`
              : `Ön teklifin verildi${pts ? ` · +${pts} puan` : ''}! Ürün sahneye gelince haber vereceğiz.`,
            'hammer',
          );
          onClose();
        }, 650);
      },
      { reason: 'Ön teklif verebilmek için bir kart ve teslimat adresi gerekli. Kartından yalnızca kazanırsan çekim yapılır.' },
    );
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={existing ? 'Ön Teklifini Yükselt' : 'Ön Teklif Ver'}
      showClose
      maxHeight={0.94}
      contentStyle={styles.content}
      footer={<Button title={`${formatTRY(Math.max(amount, 0) || min)} Ön Teklif Ver`} size="lg" fullWidth loading={submitting} disabled={!!error || own} onPress={submit} />}>
      <View style={styles.productRow}>
        <Image source={{ uri: product.images[0] }} style={[styles.thumb, { backgroundColor: colors.skeleton }]} contentFit="cover" cachePolicy="memory-disk" />
        <View style={styles.flex}>
          <Text variant="callout" weight="700" numberOfLines={2}>
            {product.title}
          </Text>
          <Text variant="footnote" color="textSecondary">
            Açılış fiyatı <Text variant="footnote" weight="700">{formatTRY(product.price)}</Text>
            {product.suddenDeath ? ' · 💀 Ani Bitiş' : ''}
          </Text>
          <Text variant="footnote" color="textSecondary">
            Yayın: {formatShowTime(show.scheduledAt)}
          </Text>
        </View>
      </View>

      {existing ? (
        <NoticeBox icon="checkmark-circle" tone="success" title={`Mevcut ön teklifin: ${formatTRY(existing.maxAmount)}`}>
          Ön teklifler düşürülemez; yalnızca yükseltebilirsin.
        </NoticeBox>
      ) : null}

      <View style={styles.amountBlock}>
        <Text variant="subhead" weight="600" color="textSecondary">
          Maks. teklifin
        </Text>
        <AmountInput value={amount} onChange={setAmount} error={amount > 0 ? error : undefined} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} keyboardShouldPersistTaps="handled">
          {chips.map((c) => (
            <Chip key={c} label={formatTRY(c)} selected={c === amount} onPress={() => setAmount(c)} />
          ))}
        </ScrollView>
      </View>

      <NoticeBox icon="flash-outline" title="Nasıl çalışır?">
        Ön teklifin maks. teklif gibi çalışır. Ürün yayında sahneye geldiğinde, sen izlemiyor olsan bile, bu tutara kadar en düşük artışla senin adına otomatik teklif verilir. Tutarın kimseye gösterilmez.
      </NoticeBox>

      <NoticeBox icon="alert-circle-outline" tone="warning" title="Teklifler bağlayıcıdır">
        Ön teklifler iptal edilemez ve düşürülemez. Kazanırsan kayıtlı kartından otomatik ödeme alınır.
      </NoticeBox>

      <View style={styles.metaRow}>
        <Icon name="time-outline" size={16} color="textSecondary" />
        <Text variant="footnote" color="textSecondary" style={styles.flex}>
          Yayın planlanan saatten 24 saat sonra sona erer. Ürün o zamana kadar satışa çıkmazsa ön teklifin düşer (son geçerlilik: {formatDateTime(expiresAt)}).
        </Text>
      </View>

      <View style={[styles.payRow, { borderColor: colors.border }]}>
        {payment ? <CardBrandMark brand={payment.brand} size="sm" /> : <Icon name="card-outline" size={20} color="textSecondary" />}
        <View style={styles.flex}>
          <Text variant="subhead" weight="600" numberOfLines={1}>
            {payment ? `${payment.bank} •••• ${payment.last4}` : 'Ödeme yöntemi eklenmedi'}
          </Text>
          <Text variant="caption" color="textSecondary" weight="500" numberOfLines={1}>
            {address ? `Teslimat: ${address.district}/${address.city}` : 'Devam edince kart ve adres eklemen istenecek'}
          </Text>
        </View>
        <Text variant="caption" color="textSecondary" weight="500">
          + {formatTRY(product.shippingCost)} kargo
        </Text>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 3 },
  content: { gap: 14, paddingBottom: 12 },
  productRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  thumb: { width: 64, height: 64, borderRadius: radius.sm },
  amountBlock: { gap: 8 },
  chips: { gap: 8, paddingVertical: 2 },
  metaRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  payRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: StyleSheet.hairlineWidth * 2, borderRadius: radius.md, padding: 12 },
});
