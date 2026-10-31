import { StyleSheet, View } from 'react-native';

import { Icon, PressableScale, Text, type IconName } from '@/components/ui';
import { haptic } from '@/lib/haptics';
import { liveColors } from '@/theme';

import { LIVE_RADIUS, liveStyles, textShadow } from './styles';

export type RailItem = {
  key: string;
  label: string;
  icon?: IconName;
  /**
   * Eski adı korunmuştur: satıcının Müdavim Kartı öğesi. Verilirse kimlik kartı ikonu
   * bakır vurguyla çizilir (icon / tint verilmese de).
   */
  crown?: boolean;
  /** İkon rengi (ör. Müdavim Kartı için liveColors.copper) */
  tint?: string;
  /** Etiket yerine ikonun altında gösterilen küçük sayı (ör. paylaşım sayısı) */
  badge?: string;
  /** Seçili durum: parlak turkuaz ikon (ör. ses açık) */
  active?: boolean;
  /** Ekran okuyucu etiketi (verilmezse label) */
  accessibilityLabel?: string;
  onPress: () => void;
};

/** Ölçüler: yerleşimde kaç öğenin sığacağını hesaplamak için (railCapacity) */
const SIZES = {
  normal: { icon: 23, item: 40, gap: 10, pad: 10 },
  compact: { icon: 20, item: 35, gap: 6, pad: 7 },
} as const;

/** Verilen yüksekliğe sığan öğe sayısı (en az 2) */
export function railCapacity(height: number, compact: boolean): number {
  const s = compact ? SIZES.compact : SIZES.normal;
  return Math.max(2, Math.floor((height - s.pad * 2 + s.gap) / (s.item + s.gap)));
}

/** S20-B: sağda tek dikey cam kapsül; içinde çizgi ikonlu düğmeler ve küçük etiket / sayı */
export function ActionRail({ items, compact }: { items: RailItem[]; compact?: boolean }) {
  const s = compact ? SIZES.compact : SIZES.normal;
  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <View style={[liveStyles.glass, styles.capsule, { paddingVertical: s.pad, gap: s.gap }]}>
        {items.map((it) => {
          const club = !!it.crown;
          const accent = it.tint ?? (club ? liveColors.copper : undefined);
          const tint = accent ?? (it.active ? liveColors.accent : liveColors.text);
          const icon: IconName = it.icon ?? (club ? 'id-card-outline' : 'ellipse-outline');
          return (
            <PressableScale
              key={it.key}
              scaleTo={0.86}
              onPress={() => {
                haptic.tap();
                it.onPress();
              }}
              style={[styles.item, { height: s.item }]}
              accessibilityRole="button"
              accessibilityLabel={(it.accessibilityLabel ?? it.label) + (it.badge ? `, ${it.badge}` : '')}
              hitSlop={4}>
              <Icon name={icon} size={s.icon} color={tint} style={textShadow} />
              <Text variant="caption" weight="700" color={accent ?? liveColors.textSecondary} style={styles.label} numberOfLines={1}>
                {it.badge ?? it.label}
              </Text>
            </PressableScale>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: 58, alignItems: 'center' },
  capsule: { width: 54, alignItems: 'center', borderRadius: LIVE_RADIUS.capsule },
  item: { width: 54, alignItems: 'center', justifyContent: 'center' },
  label: { marginTop: 2, fontSize: 10, lineHeight: 12 },
});
