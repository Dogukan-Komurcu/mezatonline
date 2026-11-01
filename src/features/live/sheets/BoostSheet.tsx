import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Chip, Icon, Sheet, Text } from '@/components/ui';
import { formatTRY } from '@/lib/format';
import { brand, liveColors, useTheme } from '@/theme';

const PRESETS = [20, 50, 100, 250] as const;

export type BoostSheetProps = {
  visible: boolean;
  onClose: () => void;
  sellerName: string;
  raised: number;
  goal: number;
  boosting: boolean;
  onBoost: (amount: number) => void;
  /** Verilmezse bahşiş bölümü gizlenir (FEATURES.tips) */
  onTip?: () => void;
};

/**
 * S30: Satıcıyı Destekle — Yayını Öne Çıkar (topluluk desteği) + Bahşiş Gönder.
 * Yalnızca FEATURES.paidBoost açıkken açılır (ücretli öne çıkarma IAP gerektirir).
 */
export function BoostSheet({ visible, onClose, sellerName, raised, goal, boosting, onBoost, onTip }: BoostSheetProps) {
  const { colors } = useTheme();
  const [amount, setAmount] = useState<number>(PRESETS[1]);
  const pct = Math.max(0.03, Math.min(1, raised / goal));
  const done = raised >= goal;
  return (
    <Sheet visible={visible} onClose={onClose} dark showClose contentStyle={styles.content}>
      <LinearGradient colors={[liveColors.primary, brand.primaryPressed]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <Text variant="title1" weight="900" color={liveColors.onPrimary}>
          Satıcıyı Destekle
        </Text>
        <Text variant="subhead" weight="600" color={liveColors.onPrimary} style={styles.heroText}>
          Bu yayını beğendiysen {sellerName} için {onTip ? 'iki yoldan destek olabilirsin: yayını daha görünür yap ya da doğrudan bahşiş bırak' : 'yayının daha çok kişiye görünmesine katkı verebilirsin'}.
        </Text>
      </LinearGradient>

      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <View style={styles.head}>
          <Icon name="flash-outline" size={20} color={liveColors.accent} />
          <Text variant="headline" weight="800">
            Yayını Öne Çıkar
          </Text>
        </View>
        <Text variant="footnote" color="textSecondary">
          {done
            ? '🚀 Hedefe ulaşıldı! Yayın 15 dakika boyunca akışlarda öne çıkarılıyor.'
            : 'İzleyicilerin katkıları ortak bir hedefte toplanır. Hedef dolunca yayın 15 dakika boyunca akışlarda üst sıralarda gösterilir; katkın sohbet akışında da görünür.'}
        </Text>
        <View style={[styles.track, { backgroundColor: colors.surfaceAlt }]}>
          <LinearGradient colors={[liveColors.primary, liveColors.copper]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.fill, { width: `${Math.round(pct * 100)}%` }]} />
        </View>
        <View style={styles.trackLabels}>
          <Text variant="caption" weight="700" color={liveColors.accent}>
            {formatTRY(raised)} toplandı
          </Text>
          <Text variant="caption" color="textSecondary">
            Hedef {formatTRY(goal)}
          </Text>
        </View>
        {!done ? (
          <>
            <View style={styles.chips}>
              {PRESETS.map((p) => (
                <Chip key={p} label={formatTRY(p)} selected={amount === p} onPress={() => setAmount(p)} style={styles.chip} />
              ))}
            </View>
            <Button title={`${formatTRY(amount)} ile öne çıkar`} variant="inverse" fullWidth loading={boosting} onPress={() => onBoost(amount)} icon="rocket" />
            <Text variant="caption" color="textTertiary">
              30 günün sonunda hedef hâlâ dolmamışsa katkını iade ederiz.
            </Text>
          </>
        ) : null}
      </View>

      {onTip ? (
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <View style={styles.head}>
            <Icon name="cash-outline" size={20} color={liveColors.success} />
            <Text variant="headline" weight="800">
              Bahşiş Gönder
            </Text>
          </View>
          <Text variant="footnote" color="textSecondary">
            Yayından memnun kaldıysan satıcına küçük bir teşekkür bırak. Bahşişin tamamı satıcıya gider.
          </Text>
          <Button title="Bahşiş Gönder" variant="inverse" fullWidth onPress={onTip} icon="heart-outline" />
        </View>
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 12 },
  hero: { borderRadius: 20, padding: 18, gap: 6, marginTop: 4 },
  heroText: { opacity: 0.85 },
  card: { borderRadius: 18, padding: 14, gap: 10, marginTop: 12 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  track: { height: 12, borderRadius: 6, overflow: 'hidden', marginTop: 4 },
  fill: { height: 12, borderRadius: 6 },
  trackLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  chips: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: { flexGrow: 1, alignItems: 'center' },
});
