import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { StyleSheet, View } from 'react-native';

import { Icon, PressableScale, Text, type IconName } from '@/components/ui';
import { haptic } from '@/lib/haptics';
import { liveColors } from '@/theme';

import { textShadow } from './styles';

export type RailItem = {
  key: string;
  label: string;
  icon?: IconName;
  /** Sadakat Kulübü tacı (sarı kare) */
  crown?: boolean;
  badge?: string;
  active?: boolean;
  onPress: () => void;
};

/** S20-B: sağ dikey eylem sütunu (ikon + küçük etiket) */
export function ActionRail({ items, compact }: { items: RailItem[]; compact?: boolean }) {
  return (
    <View style={[styles.rail, compact && styles.railCompact]} pointerEvents="box-none">
      {items.map((it) => (
        <PressableScale
          key={it.key}
          scaleTo={0.88}
          onPress={() => {
            haptic.tap();
            it.onPress();
          }}
          style={styles.item}
          accessibilityRole="button"
          accessibilityLabel={it.label}
          hitSlop={4}>
          {it.crown ? (
            <View style={[styles.crown, compact && styles.crownCompact]}>
              <MaterialCommunityIcons name="crown" size={compact ? 18 : 20} color={liveColors.onPrimary} />
            </View>
          ) : (
            <View style={[styles.iconWrap, compact && styles.iconWrapCompact]}>
              <Icon name={it.icon ?? 'ellipse'} size={compact ? 24 : 27} color={it.active ? liveColors.primary : liveColors.text} style={textShadow} />
              {it.badge ? (
                <View style={styles.badge}>
                  <Text variant="caption" weight="800" color={liveColors.onPrimary} style={styles.badgeText}>
                    {it.badge}
                  </Text>
                </View>
              ) : null}
            </View>
          )}
          <Text variant="caption" weight="700" color={liveColors.text} style={[styles.label, textShadow]} numberOfLines={1}>
            {it.label}
          </Text>
        </PressableScale>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  rail: { alignItems: 'center', gap: 12, width: 62 },
  railCompact: { gap: 8 },
  item: { alignItems: 'center', width: 62 },
  iconWrap: { width: 36, height: 34, alignItems: 'center', justifyContent: 'center' },
  crown: { width: 34, height: 34, borderRadius: 10, backgroundColor: liveColors.primary, alignItems: 'center', justifyContent: 'center' },
  crownCompact: { width: 30, height: 30, borderRadius: 9 },
  iconWrapCompact: { height: 30 },
  badge: {
    position: 'absolute',
    top: -4,
    right: -10,
    minWidth: 20,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
    backgroundColor: liveColors.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 9, lineHeight: 11 },
  label: { marginTop: 2, fontSize: 11, lineHeight: 13 },
});
