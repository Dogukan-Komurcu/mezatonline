/**
 * Satış başlatma sheet'leri:
 * - S87 Açık Artırmayı Başlat (açılış fiyatı, süre, karşı teklif süresi, Ani Bitiş 💀)
 * - Flaş İndirim (% indirim, süre)
 * - Çekiliş Başlat (ödül, süre ≤ 5 dk, Herkes / Takipçilere özel, kurallar ve yasal not)
 */
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Icon, Segmented, Sheet, Text, TextField } from '@/components/ui';
import { GIVEAWAY_LEGAL_NOTE, GIVEAWAY_RULES } from '@/features/live/giveawayRules';
import { AUCTION_DURATIONS, bidIncrement, COUNTER_BID_OPTIONS, durationLabel, EXTEND_THRESHOLD_SEC, FLASH_SALE_DURATIONS, GIVEAWAY_DURATIONS } from '@/lib/auction';
import { formatTRY } from '@/lib/format';
import { radius, useTheme } from '@/theme';
import type { Product } from '@/types';

import { FieldLabel, InfoBox, OptionChips, ProductHeader, RadioRow, SwitchRow } from './controls';

// ─── Açık artırma ────────────────────────────────────────────────────────────

export type AuctionSettings = { duration: number; counterBidTime: number; suddenDeath: boolean };

export function StartAuctionSheet({
  visible,
  onClose,
  product,
  defaults,
  onStart,
}: {
  visible: boolean;
  onClose: () => void;
  product?: Product;
  defaults: AuctionSettings;
  onStart: (opts: AuctionSettings & { startPrice: number }) => void;
}) {
  const [price, setPrice] = useState('');
  const [duration, setDuration] = useState(defaults.duration);
  const [counter, setCounter] = useState(defaults.counterBidTime);
  const [sudden, setSudden] = useState(defaults.suddenDeath);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    if (!visible || !product) return;
    setPrice(String(Math.max(1, Math.round(product.price))));
    setDuration(defaults.duration);
    setCounter(defaults.counterBidTime);
    setSudden(defaults.suddenDeath || product.suddenDeath);
    setError(undefined);
  }, [visible, product, defaults]);

  const amount = parseInt(price.replace(/\D/g, ''), 10);
  const valid = Number.isFinite(amount) && amount >= 1;

  const submit = () => {
    if (!valid) {
      setError('Açılış fiyatı en az ₺1 olmalı');
      return;
    }
    if (amount > 1_000_000) {
      setError('Açılış fiyatı en fazla ₺1.000.000 olabilir');
      return;
    }
    onStart({ startPrice: amount, duration, counterBidTime: counter, suddenDeath: sudden });
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      dark
      title="Açık Artırmayı Başlat"
      showClose
      footer={
        <View style={{ gap: 8 }}>
          <Text variant="caption" color="textSecondary" align="center">
            Başladıktan sonra iptal edilemez. Teklifler bağlayıcıdır.
          </Text>
          <Button title={valid ? `${formatTRY(amount)} ile başlat` : 'Başlat'} icon="hammer" size="lg" fullWidth onPress={submit} disabled={!valid} />
        </View>
      }>
      {product ? <ProductHeader product={product} /> : null}

      <FieldLabel title="Açılış fiyatı" hint="İlk teklif bu tutardan başlar. Ön teklifler bu tutarın altındaysa silinir." />
      <TextField
        prefix="₺"
        keyboardType="number-pad"
        value={price}
        onChangeText={(t) => {
          setPrice(t.replace(/\D/g, '').slice(0, 7));
          setError(undefined);
        }}
        error={error}
        helper={valid ? `Teklif artışı: ${formatTRY(bidIncrement(amount))}` : undefined}
        returnKeyType="done"
        maxLength={8}
      />
      <View style={styles.quickRow}>
        {[1, 10, 50, 100].map((v) => (
          <Button
            key={v}
            title={formatTRY(v)}
            size="sm"
            variant={amount === v ? 'primary' : 'glass'}
            onPress={() => {
              setPrice(String(v));
              setError(undefined);
            }}
          />
        ))}
      </View>

      <FieldLabel title="Açık artırma süresi" hint="Minimum süre. Çoğu açık artırma 30 saniye ya da daha kısa sürer." />
      <OptionChips options={AUCTION_DURATIONS.map((d) => ({ value: d as number, label: durationLabel(d) }))} value={duration} onChange={setDuration} />

      <FieldLabel
        title="Karşı teklif süresi"
        hint={sudden ? 'Ani Bitiş açıkken süre uzamaz.' : `Son ${EXTEND_THRESHOLD_SEC} saniyede gelen her teklif süreyi bu değere sıfırlar.`}
      />
      <OptionChips options={COUNTER_BID_OPTIONS.map((d) => ({ value: d as number, label: durationLabel(d) }))} value={counter} onChange={setCounter} disabled={sudden} />

      <View style={{ marginTop: 10 }}>
        <SwitchRow title="Ani Bitiş 💀" subtitle="Süre hiç uzamaz; 00:01'de son teklifi veren kazanır. İzleyiciler sayacın yanında 💀 görür." value={sudden} onChange={setSudden} />
      </View>
    </Sheet>
  );
}

// ─── Flaş indirim ────────────────────────────────────────────────────────────

const DISCOUNTS = [10, 20, 30, 50];

export function FlashSaleSheet({
  visible,
  onClose,
  product,
  remaining,
  onStart,
}: {
  visible: boolean;
  onClose: () => void;
  product?: Product;
  remaining: number;
  onStart: (discount: number, durationSec: number) => void;
}) {
  const { colors } = useTheme();
  const [discount, setDiscount] = useState(20);
  const [duration, setDuration] = useState(60);
  const price = product ? Math.max(1, Math.round(product.price * (1 - discount / 100))) : 0;
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      dark
      title="Flaş İndirim"
      showClose
      footer={<Button title="Flaş İndirimi Başlat" icon="flash" size="lg" fullWidth onPress={() => onStart(discount / 100, duration)} disabled={!product || remaining <= 0} />}>
      {product ? (
        <ProductHeader
          product={product}
          subtitle={`${remaining} adet · normal fiyat ${formatTRY(product.price)}`}
          right={
            <View style={{ alignItems: 'flex-end' }}>
              <Text variant="footnote" color="textTertiary" style={{ textDecorationLine: 'line-through' }}>
                {formatTRY(product.price)}
              </Text>
              <Text variant="title3" color={colors.primary} tabular>
                {formatTRY(price)}
              </Text>
            </View>
          }
        />
      ) : null}
      <FieldLabel title="İndirim oranı" hint={product ? `İzleyiciler ${formatTRY(product.price - price)} indirimle ${formatTRY(price)} öder.` : undefined} />
      <OptionChips options={DISCOUNTS.map((d) => ({ value: d, label: `%${d}` }))} value={discount} onChange={setDiscount} wrap />
      <FieldLabel title="Süre" hint="En az 30 saniye öneriyoruz." />
      <OptionChips options={FLASH_SALE_DURATIONS.map((d) => ({ value: d as number, label: durationLabel(d) }))} value={duration} onChange={setDuration} />
      <InfoBox icon="pin-outline" style={{ marginTop: 16 }}>
        Flaş indirim ürünü otomatik olarak sabitler. Süre bitince ya da stok tükenince ürün normal fiyatına döner. Flaş indirimde fiyat önerisi alınmaz.
      </InfoBox>
    </Sheet>
  );
}

// ─── Çekiliş ─────────────────────────────────────────────────────────────────

const SURPRISE = '__surprise__';

export function GiveawaySheet({
  visible,
  onClose,
  candidates,
  initialPrizeId,
  coverImage,
  onStart,
}: {
  visible: boolean;
  onClose: () => void;
  candidates: Product[];
  initialPrizeId?: string;
  coverImage: string;
  onStart: (prize: Product | undefined, durationSec: number, requiresFollow: boolean) => void;
}) {
  const { colors } = useTheme();
  const [prizeId, setPrizeId] = useState<string>(SURPRISE);
  const [duration, setDuration] = useState<number>(60);
  const [audience, setAudience] = useState<'everyone' | 'followers'>('followers');

  useEffect(() => {
    if (visible) setPrizeId(initialPrizeId ?? SURPRISE);
  }, [visible, initialPrizeId]);

  const sorted = [...candidates].sort((a, b) => (a.format === 'giveaway' ? 0 : 1) - (b.format === 'giveaway' ? 0 : 1)).slice(0, 12);
  const prize = candidates.find((p) => p.id === prizeId);

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      dark
      title="Çekiliş Başlat"
      showClose
      footer={
        <Button title="Çekilişi Başlat" icon="gift" size="lg" fullWidth onPress={() => onStart(prizeId === SURPRISE ? undefined : prize, duration, audience === 'followers')} />
      }>
      <FieldLabel title="Ödül" hint="Kazanana sipariş olarak oluşturulur; 2 iş günü içinde kargolanmalı." />
      <View style={{ gap: 8 }}>
        <RadioRow
          selected={prizeId === SURPRISE}
          onPress={() => setPrizeId(SURPRISE)}
          title="🎁 Sürpriz hediye"
          subtitle="Yayının sonunda paketlediğin sürpriz bir ürün"
          left={<Image source={{ uri: coverImage }} style={[styles.prizeThumb, { backgroundColor: colors.skeleton }]} contentFit="cover" cachePolicy="memory-disk" />}
        />
        {sorted.map((p) => (
          <RadioRow
            key={p.id}
            selected={prizeId === p.id}
            onPress={() => setPrizeId(p.id)}
            title={p.title}
            subtitle={p.format === 'giveaway' ? 'Çekiliş ilanı' : `Mağazadan · ${formatTRY(p.price)} değerinde`}
            left={
              <Image
                source={{ uri: p.images[0] }}
                style={[styles.prizeThumb, { backgroundColor: colors.skeleton }]}
                contentFit="cover"
                cachePolicy="memory-disk"
                recyclingKey={p.id}
              />
            }
          />
        ))}
      </View>

      <FieldLabel title="Süre" hint="Çekilişler en fazla 5 dakika sürer; duraklatılamaz ve iptal edilemez. Geri sayımı yalnızca sen görürsün." />
      <OptionChips options={GIVEAWAY_DURATIONS.map((d) => ({ value: d as number, label: durationLabel(d) }))} value={duration} onChange={setDuration} />

      <FieldLabel title="Kimler katılabilir?" />
      <Segmented
        options={[
          { key: 'followers', label: 'Takipçilere özel' },
          { key: 'everyone', label: 'Herkes' },
        ]}
        value={audience}
        onChange={setAudience}
      />

      <View style={[styles.legal, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Icon name="shield-checkmark-outline" size={18} color={colors.textSecondary} />
        <View style={{ flex: 1, gap: 4 }}>
          <Text variant="footnote" weight="800">
            KATILIM İÇİN ALIŞVERİŞ ŞARTI YOKTUR
          </Text>
          <Text variant="caption" weight="500" color="textSecondary">
            {GIVEAWAY_LEGAL_NOTE}
          </Text>
          {GIVEAWAY_RULES.map((r) => (
            <Text key={r} variant="caption" weight="500" color="textSecondary">
              • {r}
            </Text>
          ))}
          <Text variant="caption" weight="500" color="textSecondary">
            • Kazananı reddetmek ya da ödülü değiştirmek yasaktır. Ödülün kargo ücreti bakiyenden düşülür.
          </Text>
        </View>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  quickRow: { flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' },
  prizeThumb: { width: 44, height: 44, borderRadius: radius.sm },
  legal: { flexDirection: 'row', gap: 10, padding: 12, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, marginTop: 18 },
});
