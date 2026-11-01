import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { Icon, PressableScale, Text } from '@/components/ui';
import { liveColors } from '@/theme';

import { alpha, liveStyles } from './styles';

export type ReadyBannerProps = {
  guest: boolean;
  needCard: boolean;
  needAddress: boolean;
  onPrepare: () => void;
  onDismiss: () => void;
};

/**
 * "Mezata hazır ol" şeridi: hemen teklif veremeyen izleyiciye (misafir ya da kartı / adresi /
 * kural onayı eksik) eksikleri sıradaki ürün gelmeden tamamlatır. Üst bilginin altında durur,
 * teklif panelini kapatmaz; kapatılınca bu yayın için oturum boyunca gösterilmez.
 */
export function ReadyBanner({ guest, needCard, needAddress, onPrepare, onDismiss }: ReadyBannerProps) {
  const text = guest
    ? 'Teklif vermek için hesap aç ve hazırlan'
    : needCard
      ? 'Kartını şimdi ekle, sıradaki üründe tek dokunuşla teklif ver'
      : needAddress
        ? 'Adresini şimdi ekle, sıradaki üründe tek dokunuşla teklif ver'
        : 'Kuralları şimdi onayla, sıradaki üründe tek dokunuşla teklif ver';
  return (
    <Animated.View entering={FadeIn.delay(500).duration(240)} exiting={FadeOut.duration(180)} style={[liveStyles.glass, styles.banner]}>
      <View style={styles.icon}>
        <Icon name="flash" size={15} color={liveColors.copper} />
      </View>
      <View style={styles.texts}>
        <Text variant="footnote" weight="800" color={liveColors.text} numberOfLines={1}>
          Mezata hazır ol
        </Text>
        <Text variant="caption" weight="500" color={liveColors.textSecondary} numberOfLines={2}>
          {text}
        </Text>
      </View>
      <PressableScale scaleTo={0.94} onPress={onPrepare} style={styles.cta} accessibilityRole="button" accessibilityLabel={`Hazırlan: ${text}`}>
        <Text variant="footnote" weight="800" color={liveColors.onPrimary}>
          Hazırlan
        </Text>
      </PressableScale>
      <PressableScale scaleTo={0.9} onPress={onDismiss} hitSlop={10} style={styles.close} accessibilityRole="button" accessibilityLabel="Şeridi kapat">
        <Icon name="close" size={15} color={liveColors.textSecondary} />
      </PressableScale>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 16, paddingLeft: 8, paddingRight: 6, paddingVertical: 7 },
  icon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: alpha(liveColors.copper, 0.16),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: alpha(liveColors.copper, 0.4),
  },
  texts: { flex: 1, gap: 1 },
  cta: { height: 32, borderRadius: 12, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: liveColors.primary },
  close: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
});
