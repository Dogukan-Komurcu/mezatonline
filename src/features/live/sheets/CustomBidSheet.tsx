import { useEffect, useState } from 'react';
import { Keyboard, Platform, StyleSheet, Switch, TextInput, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Icon, PressableScale, Sheet, Text } from '@/components/ui';
import { nextMinBid, quickBidOptions } from '@/lib/auction';
import { formatTRY } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { liveColors, useTheme } from '@/theme';
import type { Product } from '@/types';

import type { LiveLot } from '../engine';
import { alpha } from '../components/styles';

export type CustomBidSubmit = { amount: number; max: boolean };

/** Açık klavyenin yüksekliği (kapalıyken 0) */
function useKeyboardHeight(): number {
  const [h, setH] = useState(0);
  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const a = Keyboard.addListener(showEvt, (e) => setH(e.endCoordinates.height));
    const b = Keyboard.addListener(hideEvt, () => setH(0));
    return () => {
      a.remove();
      b.remove();
    };
  }, []);
  return h;
}

export type CustomBidSheetProps = {
  visible: boolean;
  onClose: () => void;
  /** live: sahnedeki lot için; prebid: sıradaki ürün için ön teklif */
  mode: 'live' | 'prebid';
  product?: Product;
  lot?: LiveLot;
  /** Ön teklif: açılış fiyatı ve varsa mevcut ön teklif */
  startPrice?: number;
  existingPreBid?: number;
  shippingLine: string;
  onSubmit: (v: CustomBidSubmit) => boolean;
};

/** S22: Özel teklif / Maks. teklif sayfası */
export function CustomBidSheet({ visible, onClose, mode, product, lot, startPrice = 1, existingPreBid, shippingLine, onSubmit }: CustomBidSheetProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { height: screenH } = useWindowDimensions();
  const keyboardH = useKeyboardHeight();
  // Sayısal klavye açıkken sayfa (klavyenin üstüne itildiğinde) çentiğin altına taşmasın
  const maxHeight = keyboardH > 0 ? Math.min(0.92, Math.max(0.4, (screenH - keyboardH - insets.top - 8) / screenH)) : 0.92;
  const live = mode === 'live';
  const running = !live || lot?.status === 'running';
  const leading = live && !!lot?.leader?.isMe;
  const baseMin = live && lot ? nextMinBid(lot.currentBid, lot.bidCount > 0) : Math.max(startPrice, existingPreBid ? existingPreBid + 1 : startPrice);
  const myMax = live ? lot?.myMaxBid : existingPreBid;
  const min = leading && myMax ? Math.max(baseMin, myMax + 1) : baseMin;
  const chips = live && lot ? quickBidOptions(lot.currentBid, lot.bidCount > 0).filter((v) => v >= min).slice(0, 4) : quickBidOptions(min, false).slice(0, 4);

  const [text, setText] = useState('');
  const [maxOn, setMaxOn] = useState(true);
  const [showHow, setShowHow] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setText('');
      setError(null);
      setMaxOn(true);
      setShowHow(false);
    }
  }, [visible]);

  const amount = parseInt(text.replace(/\D/g, ''), 10) || 0;
  // Öndeyken yalnızca maks. teklif artırılabilir (kendi teklifini geçemezsin)
  const isMax = mode === 'prebid' || leading ? true : maxOn;

  const submit = () => {
    if (!running) return;
    if (!amount) {
      haptic.error();
      setError(`En az ${formatTRY(min)} gir`);
      return;
    }
    if (amount < min) {
      haptic.error();
      setError(leading && myMax ? `Mevcut maks. teklifin ${formatTRY(myMax)}. Daha yüksek bir tutar gir.` : `Teklif ${formatTRY(min)} altında olamaz`);
      return;
    }
    setError(null);
    if (onSubmit({ amount, max: isMax })) onClose();
  };

  const status = !live
    ? existingPreBid
      ? `Ön teklifin: maks. ${formatTRY(existingPreBid)} · Ürün sahneye gelince otomatik teklif verilir`
      : 'Ürün sahneye gelince ön teklifin otomatik olarak devreye girer.'
    : !lot || !running
      ? 'Bu açık artırma sona erdi'
      : lot.bidCount === 0
        ? 'İlk teklifi sen ver!'
        : leading
          ? `Şu an öndesin · ${formatTRY(lot.currentBid)}${lot.myMaxBid ? ` (maks. ${formatTRY(lot.myMaxBid)})` : ''}`
          : `Şu an @${lot.leader?.username} önde · ${formatTRY(lot.currentBid)}`;

  const cta = !running
    ? 'Açık artırma sona erdi'
    : mode === 'prebid'
      ? `Ön teklif ver${amount ? ` · ${formatTRY(amount)}` : ''}`
      : isMax
        ? `Maks. teklif ver${amount ? ` · ${formatTRY(amount)}` : ''}`
        : `${amount ? formatTRY(amount) + ' ' : ''}Teklif Ver`;

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      dark
      maxHeight={maxHeight}
      footer={
        <View style={styles.footer}>
          <Button title={cta} size="lg" fullWidth disabled={!running} onPress={submit} />
          <Button title="Vazgeç" variant="ghost" size="md" fullWidth onPress={onClose} />
        </View>
      }>
      <Text variant="title2" weight="800" align="center">
        {mode === 'prebid' ? 'Ön teklif ver' : 'Teklifini ver'}
      </Text>
      <Text variant="footnote" color="textSecondary" align="center" style={styles.body}>
        {isMax ? (
          <>
            <Text variant="footnote" weight="700" color="text">
              {product?.title}
            </Text>{' '}
            için maksimum teklifini giriyorsun. Biri sana karşı teklif verdiğinde, tavanına kadar otomatik teklif veririz.
          </>
        ) : (
          <>
            Girdiğin tutar{' '}
            <Text variant="footnote" weight="700" color="text">
              {product?.title}
            </Text>{' '}
            için tek seferde teklif olarak verilir.
          </>
        )}
      </Text>
      <View style={[styles.status, { backgroundColor: leading ? alpha(liveColors.success, 0.14) : colors.surface }]}>
        <Text variant="footnote" weight="700" color={leading ? liveColors.success : 'text'} align="center">
          {status}
        </Text>
      </View>

      <View style={[styles.amountBox, { borderColor: error ? colors.danger : colors.border }]}>
        <Text style={styles.currency} color="textSecondary">
          ₺
        </Text>
        <TextInput
          value={text}
          onChangeText={(t) => {
            setText(t.replace(/\D/g, '').slice(0, 7));
            setError(null);
          }}
          placeholder={String(min)}
          placeholderTextColor={colors.textTertiary}
          keyboardType="number-pad"
          style={[styles.amountInput, { color: colors.text }]}
          selectionColor={colors.primary}
          autoFocus
          maxLength={7}
          keyboardAppearance="dark"
          accessibilityLabel="Teklif tutarı"
        />
      </View>
      <Text variant="footnote" color={error ? 'danger' : 'textSecondary'} align="center" style={styles.helper}>
        {error ?? `En az ${formatTRY(min)} gir · ${shippingLine}`}
      </Text>

      <View style={styles.chips}>
        {chips.map((c) => {
          const selected = amount === c;
          return (
            <PressableScale
              key={c}
              scaleTo={0.94}
              onPress={() => {
                haptic.tap();
                setText(String(c));
                setError(null);
              }}
              style={[styles.chip, { backgroundColor: selected ? colors.inverse : colors.surfaceAlt }]}>
              <Text variant="subhead" weight="800" color={selected ? colors.onInverse : colors.text}>
                {formatTRY(c)}
              </Text>
            </PressableScale>
          );
        })}
      </View>

      {mode === 'live' && !leading ? (
        <View style={[styles.maxRow, { borderColor: colors.border }]}>
          <View style={styles.flex}>
            <Text variant="headline" weight="700">
              Maks. teklif
            </Text>
            <Text variant="footnote" color="textSecondary">
              {maxOn ? 'Biri sana karşı teklif verdiğinde, tavanına kadar otomatik teklif veririz.' : 'Kapalıyken girdiğin tutar tek bir teklif olarak hemen verilir.'}
            </Text>
          </View>
          <Switch
            value={maxOn}
            onValueChange={(v) => {
              haptic.tap();
              setMaxOn(v);
            }}
            trackColor={{ true: colors.primary, false: colors.surfaceAlt }}
            thumbColor={liveColors.text}
            ios_backgroundColor={colors.surfaceAlt}
          />
        </View>
      ) : null}

      <View style={styles.legal}>
        <Icon name="shield-checkmark" size={14} color="textSecondary" />
        <Text variant="caption" weight="500" color="textSecondary" style={styles.flex}>
          Teklifler bağlayıcıdır. Teklifini istediğin zaman artırabilirsin ama düşüremez veya iptal edemezsin. Kazanırsan kayıtlı kartından otomatik çekim yapılır.
        </Text>
      </View>
      <Text variant="footnote" weight="700" color="accent" onPress={() => setShowHow((s) => !s)} suppressHighlighting style={styles.howLink}>
        {showHow ? 'Kapat' : 'Maks. teklif nasıl çalışır?'}
      </Text>
      {showHow ? (
        <Animated.View entering={FadeIn} exiting={FadeOut} style={[styles.how, { backgroundColor: colors.surface }]}>
          <Text variant="footnote" color="textSecondary">
            Maks. teklif, ödemeye razı olduğun en yüksek tutardır ve gizli kalır. Sistem yalnızca biri sana karşı teklif verdiğinde, en küçük artışla senin adına teklif verir.
          </Text>
          <Text variant="footnote" color="textSecondary">
            Örnek: Güncel teklif ₺300 ve sen ₺500 maks. teklif verdin. Başka biri ₺320 verirse sistem otomatik olarak ₺330 verir. Kimse karşı çıkmazsa ₺500'ün altında kazanabilirsin.
          </Text>
          <Text variant="footnote" color="textSecondary">
            Aynı tutarda iki maks. teklif varsa önce veren önde kalır.
          </Text>
        </Animated.View>
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  body: { marginTop: 6, marginBottom: 12, paddingHorizontal: 6 },
  status: { borderRadius: 12, paddingVertical: 8, paddingHorizontal: 12, marginBottom: 14 },
  amountBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderRadius: 16, minHeight: 72, paddingHorizontal: 16 },
  currency: { fontSize: 34, lineHeight: 42, fontWeight: '800', marginRight: 2 },
  amountInput: { fontSize: 40, fontWeight: '800', minWidth: 110, paddingVertical: 8, textAlign: 'center', fontVariant: ['tabular-nums'] },
  helper: { marginTop: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14, justifyContent: 'center' },
  chip: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9, minWidth: 72, alignItems: 'center' },
  maxRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16, paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth },
  legal: { flexDirection: 'row', gap: 6, marginTop: 14, alignItems: 'flex-start' },
  howLink: { marginTop: 10, alignSelf: 'flex-start' },
  how: { borderRadius: 12, padding: 12, gap: 8, marginTop: 8, marginBottom: 6 },
  footer: { gap: 2 },
});
