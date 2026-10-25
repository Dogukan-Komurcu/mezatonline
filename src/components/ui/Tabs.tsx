import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { haptic } from '@/lib/haptics';
import { SCREEN_PADDING, useTheme } from '@/theme';

import { PressableScale } from './Pressable';
import { Text } from './Text';

export type TabItem<K extends string = string> = { key: K; label: string; count?: number };

export type UnderlineTabsProps<K extends string> = {
  tabs: TabItem<K>[];
  value: K;
  onChange: (key: K) => void;
  /** Sekmeler ekranı eşit paylaşsın (kaydırmasız) */
  equal?: boolean;
  style?: StyleProp<ViewStyle>;
  dark?: boolean;
};

/** Alt çizgili sekmeler (profil: Yayınlar / Mağaza / Değerlendirmeler) */
export function UnderlineTabs<K extends string>({ tabs, value, onChange, equal, style, dark }: UnderlineTabsProps<K>) {
  const { colors } = useTheme();
  const active = dark ? '#FFFFFF' : colors.text;
  const inactive = dark ? 'rgba(255,255,255,0.55)' : colors.textSecondary;
  const items = tabs.map((t) => {
    const selected = t.key === value;
    return (
      <PressableScale
        key={t.key}
        scaleTo={0.96}
        onPress={() => {
          haptic.tap();
          onChange(t.key);
        }}
        accessibilityRole="tab"
        accessibilityState={{ selected }}
        style={[styles.tab, equal && styles.equal]}>
        <Text variant="callout" weight={selected ? '700' : '600'} color={selected ? active : inactive} numberOfLines={1}>
          {t.label}
          {t.count !== undefined ? ` ${t.count}` : ''}
        </Text>
        <View style={[styles.indicator, { backgroundColor: selected ? active : 'transparent' }]} />
      </PressableScale>
    );
  });
  return (
    <View style={[styles.wrap, { borderBottomColor: dark ? 'rgba(255,255,255,0.12)' : colors.border }, style]}>
      {equal ? (
        <View style={styles.row}>{items}</View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {items}
        </ScrollView>
      )}
    </View>
  );
}

export type SegmentedProps<K extends string> = {
  options: TabItem<K>[];
  value: K;
  onChange: (key: K) => void;
  style?: StyleProp<ViewStyle>;
};

/** Hap şeklinde segment kontrol (Açık Artırma | Hemen Al) */
export function Segmented<K extends string>({ options, value, onChange, style }: SegmentedProps<K>) {
  const { colors } = useTheme();
  return (
    <View style={[styles.segment, { backgroundColor: colors.surface }, style]}>
      {options.map((o) => {
        const selected = o.key === value;
        return (
          <PressableScale
            key={o.key}
            scaleTo={0.97}
            onPress={() => {
              haptic.tap();
              onChange(o.key);
            }}
            style={[styles.segmentItem, selected && { backgroundColor: colors.card, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1 }]}>
            <Text variant="subhead" weight={selected ? '700' : '600'} color={selected ? 'text' : 'textSecondary'} numberOfLines={1}>
              {o.label}
            </Text>
          </PressableScale>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderBottomWidth: StyleSheet.hairlineWidth },
  row: { flexDirection: 'row', paddingHorizontal: SCREEN_PADDING / 2 },
  scroll: { paddingHorizontal: SCREEN_PADDING - 8 },
  tab: { paddingHorizontal: 10, paddingTop: 12, alignItems: 'center' },
  equal: { flex: 1 },
  indicator: { height: 3, borderRadius: 2, alignSelf: 'stretch', marginTop: 10 },
  segment: { flexDirection: 'row', borderRadius: 12, padding: 3 },
  segmentItem: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRadius: 10 },
});
