import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';

import { Icon, PressableScale, Text } from '@/components/ui';
import { haptic } from '@/lib/haptics';
import { brand, liveColors } from '@/theme';

import { alpha } from './styles';

/** S20: sol üstte sarı "Yayın Notları" yapışkan notu; dokununca açılır */
export function ShowNotes({ text, highlights }: { text: string; highlights: string[] }) {
  const [open, setOpen] = useState(false);
  return (
    <Animated.View layout={LinearTransition.springify().damping(20)} entering={FadeIn.delay(400)} exiting={FadeOut} style={[styles.note, open ? styles.open : styles.closed]}>
      <PressableScale
        scaleTo={0.97}
        onPress={() => {
          haptic.tap();
          setOpen((o) => !o);
        }}
        accessibilityLabel="Yayın notları">
        <View style={styles.head}>
          <Icon name="document-text" size={12} color={liveColors.onPrimary} />
          <Text variant="caption" weight="800" color={liveColors.onPrimary} numberOfLines={1} style={styles.flex}>
            Yayın Notları
          </Text>
          {open ? <Icon name="remove-circle-outline" size={16} color={liveColors.onPrimary} /> : null}
        </View>
        <Text variant="caption" weight="500" color={liveColors.onPrimary} numberOfLines={open ? 8 : 2} style={styles.body}>
          {text}
        </Text>
        {open && highlights.length ? (
          <View style={styles.tags}>
            {highlights.map((h) => (
              <View key={h} style={styles.tag}>
                <Text variant="caption" color={liveColors.onPrimary} style={styles.tagText}>
                  {h}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
      </PressableScale>
      <View style={styles.fold} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  note: {
    backgroundColor: brand.yellowSoft,
    borderRadius: 6,
    borderBottomRightRadius: 14,
    padding: 8,
    shadowColor: brand.black,
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
    transform: [{ rotate: '-1.5deg' }],
  },
  closed: { width: 126 },
  open: { width: 250 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  flex: { flex: 1 },
  body: { marginTop: 3, opacity: 0.85, lineHeight: 15 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 },
  tag: { backgroundColor: alpha(brand.black, 0.08), borderRadius: 5, paddingHorizontal: 5, paddingVertical: 1 },
  tagText: { fontSize: 10, lineHeight: 13 },
  fold: { position: 'absolute', right: 0, bottom: 0, width: 14, height: 14, borderTopLeftRadius: 8, backgroundColor: alpha(brand.black, 0.08) },
});
