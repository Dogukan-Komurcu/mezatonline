import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, ZoomIn, ZoomOut } from 'react-native-reanimated';

import { Button, Text } from '@/components/ui';
import { liveColors } from '@/theme';

/** "Canlı yayına geçiliyor" 3-2-1 geri sayımı */
export function CountdownOverlay({ count, rehearsal, onCancel }: { count: number; rehearsal: boolean; onCancel: () => void }) {
  return (
    <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(180)} style={[StyleSheet.absoluteFill, styles.wrap]}>
      <Text variant="headline" color={liveColors.textSecondary}>
        {rehearsal ? 'Prova başlıyor' : 'Canlı yayına geçiliyor'}
      </Text>
      <View style={styles.numberBox}>
        {count > 0 ? (
          <Animated.View key={count} entering={ZoomIn.springify().damping(12)} exiting={ZoomOut.duration(150)}>
            <Text style={styles.number} color={liveColors.primary}>
              {count}
            </Text>
          </Animated.View>
        ) : (
          <Animated.View entering={ZoomIn.springify()} style={[styles.liveTag, { backgroundColor: rehearsal ? liveColors.panelAlt : liveColors.live }]}>
            <Text variant="title2" color={liveColors.text}>
              {rehearsal ? 'PROVA' : 'CANLI'}
            </Text>
          </Animated.View>
        )}
      </View>
      <Text variant="callout" color={liveColors.textSecondary} align="center" style={{ maxWidth: 280 }}>
        {rehearsal ? 'Prova modunda yayının gizli; satışlar kaydedilmez.' : 'Takipçilerine bildirim gönderiliyor 🔔'}
      </Text>
      {count > 0 ? <Button title="Vazgeç" variant="glass" onPress={onCancel} style={{ marginTop: 24, minWidth: 160 }} /> : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: liveColors.glassStrong, alignItems: 'center', justifyContent: 'center', gap: 12, zIndex: 50, elevation: 50 },
  numberBox: { height: 170, alignItems: 'center', justifyContent: 'center' },
  number: { fontSize: 150, lineHeight: 170, fontWeight: '900', fontVariant: ['tabular-nums'] },
  liveTag: { paddingHorizontal: 22, paddingVertical: 10, borderRadius: 12 },
});
