import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Icon, PressableScale, Text } from '@/components/ui';
import { stepDown, stepUp } from '@/lib/auction';
import { formatTRY } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { liveColors } from '@/theme';

import { HoldToBid } from './HoldToBid';

export type ActionRowProps = {
  state: 'bidding' | 'waiting' | 'sold_out';
  /** Bir sonraki geçerli en düşük teklif */
  nextBid: number;
  leading: boolean;
  /** Tutara dokununca: özel tutar penceresi */
  onCustom: () => void;
  /** Basılı tutma tamamlanınca seçilen tutarla çağrılır (adı geriye dönük uyumluluk için korunur) */
  onSwipe: (amount: number) => void;
  /** Düğmeye kısa dokunuş: "basılı tut" ipucu (seçili tutarla) */
  onTapHint: (amount: number) => void;
  /** Sahnedeki lotun kimliği: lot değişince seçilen tutar en düşük teklife döner */
  lotId?: string;
};

/** Tutar seçicide en fazla 7 hane (özel tutar penceresiyle aynı sınır) */
const MAX_AMOUNT = 9_999_999;

/**
 * Teklif paneli: solda cam tutar seçici [−] ₺X [+], sağda basılı tutarak teklif veren turkuaz düğme.
 * Seçilen tutar en düşük geçerli teklifin altına inmez; fiyat seçimi geçerse seçim fiyata yükselir.
 * Teklif yokken "Sıradaki ürün bekleniyor" / "Ürün tükendi" gösterilir.
 */
export function ActionRow({ state, nextBid, leading, onCustom, onSwipe, onTapHint, lotId }: ActionRowProps) {
  // base: seçim anındaki en düşük teklif — fiyat geriye düşerse (yeni lot) seçim geçersizdir
  const [pick, setPick] = useState<{ lot?: string; base: number; value: number } | null>(null);
  const amount = pick && pick.lot === lotId && nextBid >= pick.base ? Math.max(pick.value, nextBid) : nextBid;

  if (state !== 'bidding') {
    return (
      <View style={styles.waiting}>
        {state === 'waiting' ? <ActivityIndicator size="small" color={liveColors.textSecondary} /> : null}
        <Text variant="headline" weight="700" color={liveColors.textSecondary}>
          {state === 'waiting' ? 'Sıradaki ürün hazırlanıyor' : 'Ürün tükendi'}
        </Text>
      </View>
    );
  }

  const set = (value: number) => {
    haptic.tap();
    setPick({ lot: lotId, base: nextBid, value: Math.min(MAX_AMOUNT, value) });
  };
  const canDown = !leading && amount > nextBid;
  const canUp = !leading && stepUp(amount) <= MAX_AMOUNT;
  const down = () => {
    if (canDown) set(stepDown(amount, nextBid));
  };
  const up = () => {
    if (canUp) set(stepUp(amount));
  };
  const custom = () => {
    haptic.tap();
    onCustom();
  };

  return (
    <View style={styles.row}>
      <View style={styles.stepper}>
        <PressableScale
          scaleTo={0.9}
          disabled={!canDown}
          onPress={down}
          hitSlop={6}
          style={[styles.stepBtn, !canDown && styles.stepOff]}
          accessibilityRole="button"
          accessibilityLabel="Tutarı azalt"
          accessibilityState={{ disabled: !canDown }}>
          <Icon name="remove" size={18} color={liveColors.text} />
        </PressableScale>
        <PressableScale
          scaleTo={0.96}
          onPress={custom}
          style={styles.amount}
          accessibilityRole="adjustable"
          accessibilityLabel={`Teklif tutarı ${formatTRY(amount)}`}
          accessibilityHint="Özel tutar girmek için dokun"
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }, { name: 'activate', label: 'Özel tutar gir' }]}
          onAccessibilityAction={(e) => {
            const name = e.nativeEvent.actionName;
            if (name === 'increment') up();
            else if (name === 'decrement') down();
            else if (name === 'activate') custom();
          }}>
          <View style={styles.amountCaption}>
            <Text variant="caption" weight="600" color={liveColors.textTertiary}>
              Tutar
            </Text>
            <Icon name="create-outline" size={10} color={liveColors.textTertiary} />
          </View>
          <Text variant="headline" weight="800" color={liveColors.text} tabular numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
            {formatTRY(amount)}
          </Text>
        </PressableScale>
        <PressableScale
          scaleTo={0.9}
          disabled={!canUp}
          onPress={up}
          hitSlop={6}
          style={[styles.stepBtn, !canUp && styles.stepOff]}
          accessibilityRole="button"
          accessibilityLabel="Tutarı artır"
          accessibilityState={{ disabled: !canUp }}>
          <Icon name="add" size={18} color={liveColors.text} />
        </PressableScale>
      </View>
      <HoldToBid amount={amount} leading={leading} onCommit={onSwipe} onTapHint={() => onTapHint(amount)} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepper: {
    width: '46%',
    height: 52,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: liveColors.border,
    backgroundColor: liveColors.glassStrong,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    gap: 4,
  },
  stepBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: liveColors.glassLight, alignItems: 'center', justifyContent: 'center' },
  stepOff: { opacity: 0.35 },
  amount: { flex: 1, alignItems: 'center', justifyContent: 'center', height: '100%' },
  amountCaption: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  waiting: {
    height: 52,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: liveColors.border,
    backgroundColor: liveColors.glassLight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
});
