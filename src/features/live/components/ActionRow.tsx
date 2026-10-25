import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { PressableScale, Text } from '@/components/ui';
import { haptic } from '@/lib/haptics';
import { liveColors } from '@/theme';

import { alpha } from './styles';
import { SwipeToBid } from './SwipeToBid';

export type ActionRowProps = {
  state: 'bidding' | 'waiting' | 'sold_out';
  nextBid: number;
  leading: boolean;
  onCustom: () => void;
  onSwipe: (amount: number) => void;
  onTapHint: () => void;
};

/** S20-G: alt eylem satırı — [Özel] + kaydır-teklif-ver ya da "Sıradaki ürün bekleniyor" */
export function ActionRow({ state, nextBid, leading, onCustom, onSwipe, onTapHint }: ActionRowProps) {
  if (state !== 'bidding') {
    return (
      <View style={styles.waiting}>
        {state === 'waiting' ? <ActivityIndicator size="small" color={liveColors.textSecondary} /> : null}
        <Text variant="headline" weight="700" color={liveColors.textSecondary}>
          {state === 'waiting' ? 'Sıradaki ürün bekleniyor' : 'Ürün tükendi'}
        </Text>
      </View>
    );
  }
  return (
    <View style={styles.row}>
      <PressableScale
        scaleTo={0.95}
        onPress={() => {
          haptic.tap();
          onCustom();
        }}
        style={styles.custom}
        accessibilityRole="button"
        accessibilityLabel="Özel teklif">
        <Text variant="headline" weight="800" color={liveColors.text}>
          Özel
        </Text>
      </PressableScale>
      <SwipeToBid amount={nextBid} leading={leading} onCommit={onSwipe} onTapHint={onTapHint} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  custom: {
    width: '28%',
    height: 52,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: alpha(liveColors.text, 0.4),
    backgroundColor: liveColors.glassStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waiting: {
    height: 52,
    borderRadius: 999,
    backgroundColor: liveColors.glassLight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
});
