import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInUp, FadeOut, FadeOutUp, LinearTransition } from 'react-native-reanimated';

import { Icon, PressableScale, Text } from '@/components/ui';
import { haptic } from '@/lib/haptics';
import { liveColors } from '@/theme';

import { liveStyles, textShadow } from './styles';

/** Açık kartta metnin görünen yüksekliği (~4 satır); uzunsa kart içinde kaydırılır */
const BODY_MAX_H = 4 * 17;

/**
 * S20: başlığın altında cam "ⓘ Yayın bilgisi" çipi. Dokununca altında cam kartta açıklama ve
 * öne çıkanlar açılır, tekrar dokununca kapanır.
 */
export function ShowNotes({ text, highlights }: { text: string; highlights: string[] }) {
  const [open, setOpen] = useState(false);
  return (
    <Animated.View layout={LinearTransition.springify().damping(20)} entering={FadeIn.delay(400)} exiting={FadeOut} style={styles.root}>
      <PressableScale
        scaleTo={0.95}
        onPress={() => {
          haptic.tap();
          setOpen((o) => !o);
        }}
        style={[liveStyles.glass, styles.chip, open && styles.chipOpen]}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel="Yayın bilgisi">
        <Icon name="information-circle-outline" size={15} color={liveColors.text} />
        <Text variant="footnote" weight="700" color={liveColors.text} style={textShadow}>
          Yayın bilgisi
        </Text>
        <Icon name={open ? 'chevron-up' : 'chevron-down'} size={13} color={liveColors.textSecondary} />
      </PressableScale>
      {open ? (
        <Animated.View entering={FadeInUp.duration(180)} exiting={FadeOutUp.duration(140)} style={[liveStyles.glass, styles.card]}>
          <ScrollView style={styles.body} showsVerticalScrollIndicator={false} nestedScrollEnabled bounces={false}>
            <Text variant="footnote" weight="500" color={liveColors.text} style={styles.bodyText}>
              {text}
            </Text>
          </ScrollView>
          {highlights.length ? (
            <View style={styles.tags}>
              {highlights.map((h) => (
                <View key={h} style={styles.tag}>
                  <Text variant="caption" weight="600" color={liveColors.text} style={styles.tagText}>
                    {h}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: 'flex-start', gap: 6, flexShrink: 1 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 30, borderRadius: 999, paddingHorizontal: 10 },
  chipOpen: { backgroundColor: liveColors.glassStrong },
  card: { width: 270, maxWidth: '100%', borderRadius: 14, padding: 10, backgroundColor: liveColors.glassStrong, gap: 8 },
  body: { maxHeight: BODY_MAX_H },
  bodyText: { lineHeight: 17 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  tag: { backgroundColor: liveColors.glassLight, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2 },
  tagText: { fontSize: 10, lineHeight: 13 },
});
