import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInRight, FadeOutLeft } from 'react-native-reanimated';

import { Button, Icon, Sheet, Text, type IconName } from '@/components/ui';
import { DEMO_COPY } from '@/config/demo';
import { BINDING_BID_TEXT, WIN_COST_NOTE } from '@/features/commerce/utils';
import { haptic } from '@/lib/haptics';
import { liveColors, useTheme } from '@/theme';

import { alpha } from '../components/styles';

const STEPS: { icon: IconName; tint: string; title: string; body: string; bullets: string[] }[] = [
  {
    icon: 'shield-checkmark',
    tint: liveColors.primary,
    title: 'Mezatonline Alıcı Koruması',
    body: 'Ürün sana ulaşmazsa ya da açıklamayla önemli ölçüde farklıysa paranı iade ederiz; sorunu ürün sana ulaştıktan sonra 14 gün içinde bildirmen yeterli.',
    bullets: [
      'Gerçek sürümde ödemen, lisanslı bir ödeme kuruluşu tarafından ürün sana ulaşana kadar bekletilir',
      'Sorun bildirdiğinde destek ekibimiz en kısa sürede yanıt verir',
      DEMO_COPY.payment,
    ],
  },
  {
    icon: 'hand-right',
    tint: liveColors.accent,
    title: 'Kaydır, teklif ver',
    body: 'Sarı düğmeyi sağa kaydırarak bir sonraki geçerli tutarda teklif verirsin. Tutar her zaman düğmenin üzerinde yazar.',
    bullets: ['"Özel" ile istediğin tutarı ya da maks. teklifini gir', 'Son 10 saniyede gelen teklif süreyi uzatır', '💀 Ani Bitiş açık artırmalarında süre uzamaz'],
  },
  {
    icon: 'hammer',
    tint: liveColors.live,
    title: 'Teklifler bağlayıcıdır',
    body: BINDING_BID_TEXT,
    bullets: [
      'Kazanırsan ödeme kayıtlı kartından otomatik olarak alınır',
      `${WIN_COST_NOTE}; aynı yayından aldıkların tek kargoda gelir`,
      'Lütfen yalnızca almak istediğin ürünlere teklif ver',
    ],
  },
];

/** S21: ilk teklif öncesi tek seferlik tanıtım + bağlayıcı teklif onayı */
export function BidIntroSheet({ visible, onClose, onAccept }: { visible: boolean; onClose: () => void; onAccept: () => void }) {
  const { colors } = useTheme();
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (visible) setStep(0);
  }, [visible]);
  const s = STEPS[step];
  const last = step === STEPS.length - 1;
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      dark
      footer={
        <View style={styles.footer}>
          <View style={styles.dots}>
            {STEPS.map((x, i) => (
              <View key={x.title} style={[styles.dot, { backgroundColor: i === step ? colors.primary : colors.surfaceAlt, width: i === step ? 20 : 7 }]} />
            ))}
          </View>
          <Button
            title={last ? 'Anladım, teklif ver' : 'İleri'}
            size="lg"
            fullWidth
            iconRight={last ? 'hammer' : 'arrow-forward'}
            onPress={() => {
              if (last) {
                haptic.success();
                onAccept();
              } else {
                haptic.tap();
                setStep((v) => v + 1);
              }
            }}
          />
        </View>
      }>
      <Animated.View key={step} entering={FadeInRight.duration(220)} exiting={FadeOutLeft.duration(150)} style={styles.body}>
        <View style={[styles.iconCircle, { backgroundColor: alpha(s.tint, 0.16) }]}>
          <Icon name={s.icon} size={44} color={s.tint} />
        </View>
        <Text variant="title2" weight="800" align="center">
          {s.title}
        </Text>
        <Text variant="callout" color="textSecondary" align="center" style={styles.text}>
          {s.body}
        </Text>
        <View style={styles.bullets}>
          {s.bullets.map((b) => (
            <View key={b} style={styles.bullet}>
              <Icon name="checkmark-circle" size={18} color={s.tint} />
              <Text variant="subhead" color="text" style={styles.flex}>
                {b}
              </Text>
            </View>
          ))}
        </View>
      </Animated.View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  body: { alignItems: 'center', paddingTop: 10, paddingBottom: 6, minHeight: 330 },
  iconCircle: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  text: { marginTop: 6, paddingHorizontal: 8 },
  bullets: { alignSelf: 'stretch', gap: 10, marginTop: 18 },
  bullet: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  footer: { gap: 12 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { height: 7, borderRadius: 4 },
});
