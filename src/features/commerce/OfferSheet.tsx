/**
 * S43 — Fiyat Öner (Make Offer) sayfası.
 * Yüzde çipleri (%10 · %15 · %20) ya da özel tutar → Devam → özet → Öneriyi Gönder.
 * Satıcı kabul etmedikçe ücret alınmaz. Asgari öneri satış fiyatının %50'si.
 */
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Chip, Divider, Icon, Sheet, Text, toast } from '@/components/ui';
import { shippingQuoteFor } from '@/features/shared/shipping';
import { requireTransactSetup, TransactSetupHost } from '@/features/wallet/TransactSetup';
import { formatTRY } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { buyerServiceFee } from '@/lib/pricing';
import { ME_ID } from '@/store/auth';
import { useOrdersStore } from '@/store/orders';
import { selectDefaultAddress, selectDefaultPayment, useWalletStore } from '@/store/wallet';
import { radius, useTheme } from '@/theme';
import type { Product } from '@/types';

import { AmountInput, CardBrandMark, NoticeBox } from './components';
import { minOfferFor, submitOffer } from './offers';
import { roundNice } from './utils';

type Preset = 10 | 15 | 20 | 'custom';
const PRESETS: Preset[] = [10, 15, 20, 'custom'];

export function OfferSheet({ visible, onClose, product }: { visible: boolean; onClose: () => void; product: Product | undefined }) {
  const { colors } = useTheme();
  const payment = useWalletStore(selectDefaultPayment);
  const address = useWalletStore(selectDefaultAddress);
  const orders = useOrdersStore((s) => s.orders);
  const [preset, setPreset] = useState<Preset>(10);
  const [custom, setCustom] = useState(0);
  const [step, setStep] = useState<'amount' | 'review'>('amount');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (visible) {
      setStep('amount');
      setPreset(10);
      setCustom(0);
    }
  }, [visible]);

  if (!product) return null;

  const price = product.price;
  const presetAmount = (p: Exclude<Preset, 'custom'>) => roundNice(price * (1 - p / 100));
  const amount = preset === 'custom' ? custom : presetAmount(preset);
  const min = minOfferFor(price);
  const error = !amount
    ? preset === 'custom'
      ? 'Bir tutar gir'
      : undefined
    : amount < min
      ? `En az ${formatTRY(min)} önerebilirsin`
      : amount >= price
        ? 'Önerin satış fiyatından düşük olmalı. Bu fiyata hemen alabilirsin.'
        : undefined;
  const discount = amount > 0 && amount < price ? Math.round((1 - amount / price) * 100) : 0;
  const fee = buyerServiceFee(amount);
  // Kabul edilirse ödemede uygulanacak kargo (kargo dahil ilan, aynı yayın paketi, ücretsiz kargo eşiği)
  const ship = shippingQuoteFor(product, product.showId, amount, orders);
  const totalIfAccepted = amount + ship.buyer + fee;

  const next = () => {
    if (product.sellerId === ME_ID) {
      toast.error('Kendi ürününe fiyat öneremezsin');
      return;
    }
    if (error || !amount) {
      haptic.error();
      return;
    }
    if (step === 'amount') {
      haptic.tap();
      setStep('review');
      return;
    }
    requireTransactSetup(
      () => {
        setSending(true);
        setTimeout(() => {
          submitOffer(product, amount);
          setSending(false);
          haptic.success();
          toast.success('Önerin satıcıya ulaştı. Yanıtı Aktivite → Öneriler’de göreceksin.', 'paper-plane');
          onClose();
        }, 700);
      },
      { reason: 'Öneri göndermeden önce kartını ve teslimat adresini kaydet. Kabul edilmeyen önerilerde kartından para çekilmez.' },
    );
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={step === 'amount' ? 'Fiyat Öner' : 'Önerini gözden geçir'}
      showClose
      maxHeight={0.94}
      contentStyle={styles.content}
      footer={
        <View style={styles.footer}>
          {step === 'review' ? <Button title="Geri" variant="outline" size="lg" onPress={() => setStep('amount')} style={styles.backBtn} /> : null}
          <Button
            title={step === 'amount' ? (amount && !error ? `${formatTRY(amount)} · Devam` : 'Devam') : `${formatTRY(amount)} Öneriyi Gönder`}
            size="lg"
            loading={sending}
            disabled={!!error || !amount}
            onPress={next}
            style={styles.flex}
          />
        </View>
      }>
      <View style={styles.productRow}>
        <Image source={{ uri: product.images[0] }} style={[styles.thumb, { backgroundColor: colors.skeleton }]} contentFit="cover" cachePolicy="memory-disk" />
        <View style={styles.flexGap}>
          <Text variant="callout" weight="700" numberOfLines={2}>
            {product.title}
          </Text>
          <Text variant="footnote" color="textSecondary">
            Satış fiyatı <Text variant="footnote" weight="700">{formatTRY(price)}</Text>
          </Text>
        </View>
      </View>

      {step === 'amount' ? (
        <>
          <View style={styles.presets}>
            {PRESETS.map((p) => {
              const selected = p === preset;
              return (
                <View key={String(p)} style={styles.presetCol}>
                  <Chip label={p === 'custom' ? 'Özel' : `%${p}`} selected={selected} onPress={() => setPreset(p)} style={styles.presetChip} />
                  <Text variant="caption" color={selected ? 'text' : 'textSecondary'} align="center" numberOfLines={1}>
                    {p === 'custom' ? 'Tutar gir' : formatTRY(presetAmount(p))}
                  </Text>
                </View>
              );
            })}
          </View>
          {preset === 'custom' ? (
            <AmountInput value={custom} onChange={setCustom} error={custom > 0 ? error : undefined} autoFocus placeholder={String(roundNice(price * 0.85))} />
          ) : (
            <View style={[styles.bigAmount, { backgroundColor: colors.surface }]}>
              <Text variant="caption" color="textSecondary" weight="600">
                Önerin
              </Text>
              <Text variant="display" tabular>
                {formatTRY(amount)}
              </Text>
              <Text variant="footnote" color="success" weight="700">
                %{discount} indirim · {formatTRY(price - amount)} tasarruf
              </Text>
            </View>
          )}
          <Text variant="footnote" color="textSecondary">
            En az {formatTRY(min)} önerebilirsin. Kuponlar fiyat önerilerinde geçerli değildir.
          </Text>
        </>
      ) : (
        <>
          <View style={[styles.bigAmount, { backgroundColor: colors.surface }]}>
            <Text variant="caption" color="textSecondary" weight="600">
              Önerin
            </Text>
            <Text variant="display" tabular>
              {formatTRY(amount)}
            </Text>
            <Text variant="footnote" color="textSecondary">
              <Text variant="footnote" color="textTertiary" style={styles.strike}>
                {formatTRY(price)}
              </Text>
              {`  ·  %${discount} indirim`}
            </Text>
          </View>
          <View style={[styles.summary, { borderColor: colors.border }]}>
            <SummaryRow label="Önerin" value={formatTRY(amount)} />
            <SummaryRow label="Kargo" value={ship.buyer > 0 ? formatTRY(ship.buyer, { cents: !Number.isInteger(ship.buyer) }) : ship.note === 'included' ? 'Kargo dahil' : ship.note === 'threshold' ? 'Ücretsiz · yayın kampanyası' : ship.note === 'bundled' ? '₺0 · aynı pakette' : 'Ücretsiz'} />
            <SummaryRow label="Alıcı Koruması hizmet bedeli" value={formatTRY(fee, { cents: true })} />
            <Divider />
            <SummaryRow label="Kabul edilirse ödenecek" value={formatTRY(totalIfAccepted, { cents: !Number.isInteger(totalIfAccepted) })} bold />
          </View>
          <View style={[styles.payRow, { borderColor: colors.border }]}>
            {payment ? <CardBrandMark brand={payment.brand} size="sm" /> : <Icon name="card-outline" size={20} color="textSecondary" />}
            <View style={styles.flex}>
              <Text variant="subhead" weight="600" numberOfLines={1}>
                {payment ? `${payment.bank} •••• ${payment.last4}` : 'Ödeme yöntemi eklenmedi'}
              </Text>
              <Text variant="caption" weight="500" color="textSecondary" numberOfLines={1}>
                {address ? `${address.title} · ${address.district}/${address.city}` : 'Gönderince kart ve adres eklemen istenecek'}
              </Text>
            </View>
          </View>
          <NoticeBox icon="shield-checkmark-outline" title="Ödeme yalnızca kabulde">
            Önerin bağlayıcıdır: satıcı kabul ettiği anda tutar kayıtlı kartından çekilir ve sipariş açılır. Kurumsal satıcılardan alımlarda 14 günlük yasal cayma hakkın saklıdır. Karşı teklif gelirse 24 saat içinde kabul edebilir ya da reddedebilirsin; 30 gün boyunca yanıtlanmayan öneri kendiliğinden kapanır.
          </NoticeBox>
        </>
      )}
      <TransactSetupHost scoped />
    </Sheet>
  );
}

function SummaryRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={styles.summaryRow}>
      <Text variant={bold ? 'callout' : 'subhead'} weight={bold ? '800' : '500'} color={bold ? 'text' : 'textSecondary'} style={styles.flex}>
        {label}
      </Text>
      <Text variant={bold ? 'callout' : 'subhead'} weight={bold ? '800' : '600'} tabular>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  flexGap: { flex: 1, gap: 3 },
  content: { gap: 14, paddingBottom: 12 },
  productRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  thumb: { width: 56, height: 56, borderRadius: radius.sm },
  presets: { flexDirection: 'row', gap: 8 },
  presetCol: { flex: 1, gap: 6 },
  presetChip: { alignItems: 'center' },
  bigAmount: { borderRadius: radius.lg, paddingVertical: 16, alignItems: 'center', gap: 2 },
  strike: { textDecorationLine: 'line-through' },
  summary: { borderWidth: StyleSheet.hairlineWidth * 2, borderRadius: radius.md, padding: 12, gap: 8 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  payRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: StyleSheet.hairlineWidth * 2, borderRadius: radius.md, padding: 12 },
  footer: { flexDirection: 'row', gap: 10 },
  backBtn: { minWidth: 96 },
});
