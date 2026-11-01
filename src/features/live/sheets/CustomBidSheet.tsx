import { useEffect, useState } from 'react';
import { Keyboard, Platform, StyleSheet, Switch, TextInput, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Icon, PressableScale, Sheet, Text } from '@/components/ui';
import { BINDING_BID_SHORT, WIN_COST_NOTE } from '@/features/commerce/utils';
import { nextMinBid, quickIncrements } from '@/lib/auction';
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

/** Tutar girişi en fazla 7 hane */
const MAX_AMOUNT = 9_999_999;
/** Hızlı tutar düğmelerinin köşe yarıçapı (tasarım kimliği §3; Button varsayılanıyla aynı) */
const BUTTON_RADIUS = 14;

/**
 * Özel tutar penceresi: tutar girişi, fiyat ölçeğine göre hızlı artış düğmeleri (+₺10 / +₺50 / +₺100 …)
 * ve "Otomatik teklif (en fazla)" seçeneği (varsayılan kapalı; açıkken tutar gizli üst sınır olur).
 * Ön teklif modunda ve öndeyken tutar her zaman otomatik teklif üst sınırı olarak kaydedilir.
 */
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
  const increments = quickIncrements(min);

  const [text, setText] = useState('');
  const [autoOn, setAutoOn] = useState(false);
  const [showHow, setShowHow] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pencere her açılışta temiz başlar (otomatik teklif kapalı)
  const [wasVisible, setWasVisible] = useState(visible);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) {
      setText('');
      setError(null);
      setAutoOn(false);
      setShowHow(false);
    }
  }

  const amount = parseInt(text.replace(/\D/g, ''), 10) || 0;
  // Öndeyken yalnızca otomatik teklif üst sınırı yükseltilebilir (kendi teklifini geçemezsin)
  const isMax = mode === 'prebid' || leading ? true : autoOn;

  const setAmount = (v: number) => {
    haptic.tap();
    setText(String(Math.min(MAX_AMOUNT, v)));
    setError(null);
  };

  const submit = () => {
    if (!running) return;
    if (!amount) {
      haptic.error();
      setError(`Tutar en az ${formatTRY(min)} olmalı`);
      return;
    }
    if (amount < min) {
      haptic.error();
      setError(leading && myMax ? `Şu anki üst sınırın ${formatTRY(myMax)}; değiştirmek için daha yüksek bir tutar yaz.` : `Tutar en az ${formatTRY(min)} olmalı`);
      return;
    }
    setError(null);
    if (onSubmit({ amount, max: isMax })) onClose();
  };

  const status = !live
    ? existingPreBid
      ? `Ön teklifin: en fazla ${formatTRY(existingPreBid)} · Ürün sahneye gelince otomatik teklif verilir`
      : 'Ürün sahneye gelince ön teklifin otomatik olarak devreye girer.'
    : !lot || !running
      ? 'Bu açık artırma sona erdi'
      : lot.bidCount === 0
        ? 'Henüz teklif yok · ilk teklifi sen ver'
        : leading
          ? `Lider sensin · ${formatTRY(lot.currentBid)}${lot.myMaxBid ? ` (otomatik en fazla ${formatTRY(lot.myMaxBid)})` : ''}`
          : `Lider: @${lot.leader?.username} · ${formatTRY(lot.currentBid)}`;

  const amountText = amount ? ` · ${formatTRY(amount)}` : '';
  const cta = !running ? 'Açık artırma sona erdi' : mode === 'prebid' ? `Ön teklif ver${amountText}` : isMax ? `Otomatik teklif ver${amountText}` : `Teklif ver${amountText}`;

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      dark
      maxHeight={maxHeight}
      footer={
        <View style={styles.footer}>
          <Button title={cta} size="lg" fullWidth disabled={!running} onPress={submit} icon="hammer-outline" />
          <Button title="Vazgeç" variant="ghost" size="md" fullWidth onPress={onClose} />
        </View>
      }>
      <Text variant="title2" weight="800" align="center">
        {mode === 'prebid' ? 'Ön teklif ver' : 'Özel tutar'}
      </Text>
      <Text variant="footnote" color="textSecondary" align="center" style={styles.body}>
        {mode === 'prebid' ? (
          <>
            <Text variant="footnote" weight="700" color="text">
              {product?.title}
            </Text>{' '}
            yayında sahneye çıktığında devreye girecek üst sınırını belirliyorsun; tutarı kimse görmez.
          </>
        ) : isMax ? (
          <>
            <Text variant="footnote" weight="700" color="text">
              {product?.title}
            </Text>{' '}
            için bir üst sınır belirle: rakip teklif geldikçe sistem seni birer adım öne taşır, sınıra gelince durur.
          </>
        ) : (
          <>
            Girdiğin tutar{' '}
            <Text variant="footnote" weight="700" color="text">
              {product?.title}
            </Text>{' '}
            için tek bir teklif olarak hemen verilir.
          </>
        )}
      </Text>
      <View style={[styles.status, { backgroundColor: leading ? alpha(liveColors.success, 0.14) : colors.surface }]}>
        <Icon name={leading ? 'checkmark-circle' : 'pulse-outline'} size={14} color={leading ? liveColors.success : 'textSecondary'} />
        <Text variant="footnote" weight="700" color={leading ? liveColors.success : 'text'} align="center" style={styles.shrink}>
          {status}
        </Text>
      </View>

      <View style={[styles.amountBox, { borderColor: error ? colors.danger : amount ? colors.primary : colors.border, backgroundColor: colors.surface }]}>
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
        {error ?? `En az ${formatTRY(min)} · ${shippingLine}`}
      </Text>

      <View style={styles.quick}>
        <QuickButton label={`En az ${formatTRY(min)}`} selected={amount === min} onPress={() => setAmount(min)} accessibilityLabel={`En düşük tutar ${formatTRY(min)}`} />
        {increments.map((inc) => (
          <QuickButton key={inc} label={`+${formatTRY(inc)}`} onPress={() => setAmount(Math.max(amount, min) + inc)} accessibilityLabel={`${formatTRY(inc)} artır`} />
        ))}
      </View>

      {mode === 'live' && !leading ? (
        <View style={[styles.autoRow, { borderColor: colors.border }]}>
          <Icon name="sync-outline" size={20} color={autoOn ? colors.primary : colors.textSecondary} />
          <View style={styles.flex}>
            <Text variant="headline" weight="700">
              Otomatik teklif (en fazla)
            </Text>
            <Text variant="footnote" color="textSecondary">
              {autoOn ? 'Tutar gizli üst sınırın olur; yalnızca biri seni geçtiğinde en küçük artışla teklif veririz.' : 'Kapalıyken girdiğin tutar tek bir teklif olarak hemen verilir.'}
            </Text>
          </View>
          <Switch
            value={autoOn}
            onValueChange={(v) => {
              haptic.tap();
              setAutoOn(v);
            }}
            trackColor={{ true: colors.primary, false: colors.surfaceAlt }}
            thumbColor={liveColors.text}
            ios_backgroundColor={colors.surfaceAlt}
            accessibilityLabel="Otomatik teklif (en fazla)"
          />
        </View>
      ) : leading ? (
        <View style={[styles.autoRow, { borderColor: colors.border }]}>
          <Icon name="information-circle-outline" size={20} color={colors.textSecondary} />
          <Text variant="footnote" color="textSecondary" style={styles.flex}>
            Öndeyken kendi teklifini geçemezsin; girdiğin tutar otomatik teklif üst sınırın olarak kaydedilir.
          </Text>
        </View>
      ) : null}

      <View style={styles.legal}>
        <Icon name="receipt-outline" size={14} color="textSecondary" />
        <Text variant="caption" weight="600" color="textSecondary" style={styles.flex}>
          {WIN_COST_NOTE}.
        </Text>
      </View>
      <View style={styles.legalNext}>
        <Icon name="shield-checkmark-outline" size={14} color="textSecondary" />
        <Text variant="caption" weight="500" color="textSecondary" style={styles.flex}>
          {BINDING_BID_SHORT} Teklifini artırabilirsin ama düşüremezsin; kazanırsan kayıtlı kartından otomatik çekim yapılır.
        </Text>
      </View>
      <Text variant="footnote" weight="700" color="accent" onPress={() => setShowHow((s) => !s)} suppressHighlighting style={styles.howLink}>
        {showHow ? 'Kapat' : 'Otomatik teklif nasıl çalışır?'}
      </Text>
      {showHow ? (
        <Animated.View entering={FadeIn} exiting={FadeOut} style={[styles.how, { backgroundColor: colors.surface }]}>
          <Text variant="footnote" color="textSecondary">
            Otomatik teklifte girdiğin tutar, bu ürün için ödemeye hazır olduğun üst sınırdır ve kimseye gösterilmez. Başka biri seni geçtiğinde sistem, sınırına ulaşana kadar en küçük artışla senin adına karşılık verir.
          </Text>
          <Text variant="footnote" color="textSecondary">
            Örnek: Fiyat ₺300 iken üst sınırını ₺500 yaptın. Biri ₺320 verirse sen otomatik olarak ₺330 ile yeniden lider olursun. Kimse ₺500’e yaklaşmazsa ürünü daha düşük bir fiyata alabilirsin.
          </Text>
          <Text variant="footnote" color="textSecondary">
            İki kişi aynı üst sınırı girerse, sınırı daha önce giren lider kalır.
          </Text>
        </Animated.View>
      ) : null}
    </Sheet>
  );
}

function QuickButton({ label, selected, onPress, accessibilityLabel }: { label: string; selected?: boolean; onPress: () => void; accessibilityLabel: string }) {
  const { colors } = useTheme();
  return (
    <PressableScale
      scaleTo={0.94}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={[styles.quickBtn, { backgroundColor: selected ? colors.primarySoft : colors.surface, borderColor: selected ? colors.primary : colors.border }]}>
      <Text variant="subhead" weight="800" color={selected ? colors.accent : colors.text} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
        {label}
      </Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  shrink: { flexShrink: 1 },
  body: { marginTop: 6, marginBottom: 12, paddingHorizontal: 6 },
  status: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 12, marginBottom: 14 },
  amountBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderRadius: 16, minHeight: 72, paddingHorizontal: 16 },
  currency: { fontSize: 34, lineHeight: 42, fontWeight: '800', marginRight: 2 },
  amountInput: { fontSize: 40, fontWeight: '800', minWidth: 110, paddingVertical: 8, textAlign: 'center', fontVariant: ['tabular-nums'] },
  helper: { marginTop: 8 },
  quick: { flexDirection: 'row', gap: 8, marginTop: 14 },
  quickBtn: { flex: 1, height: 42, borderRadius: BUTTON_RADIUS, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  autoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16, paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth },
  legal: { flexDirection: 'row', gap: 6, marginTop: 14, alignItems: 'flex-start' },
  legalNext: { flexDirection: 'row', gap: 6, marginTop: 6, alignItems: 'flex-start' },
  howLink: { marginTop: 10, alignSelf: 'flex-start' },
  how: { borderRadius: 12, padding: 12, gap: 8, marginTop: 8, marginBottom: 6 },
  footer: { gap: 2 },
});
