import type { ReactNode } from 'react';
import { StyleSheet, Switch, View, type StyleProp, type ViewStyle } from 'react-native';

import { haptic } from '@/lib/haptics';
import { SCREEN_PADDING, useTheme } from '@/theme';

import { Icon, type IconName } from './Icon';
import { PressableScale } from './Pressable';
import { Text } from './Text';

export type ListRowProps = {
  title: string;
  subtitle?: string;
  icon?: IconName;
  /** İkon arka plan rengi (renkli kare ikon) */
  iconTint?: string;
  left?: ReactNode;
  /** Sağdaki gri değer metni */
  value?: string;
  right?: ReactNode;
  onPress?: () => void;
  chevron?: boolean;
  destructive?: boolean;
  /** Anahtar (switch) satırı */
  switchValue?: boolean;
  onSwitch?: (v: boolean) => void;
  badge?: number;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
};

/** Ayarlar / hesap menüsü satırı */
export function ListRow({ title, subtitle, icon, iconTint, left, value, right, onPress, chevron, destructive, switchValue, onSwitch, badge, style, disabled }: ListRowProps) {
  const { colors } = useTheme();
  const showChevron = chevron ?? (!!onPress && onSwitch === undefined);
  const content = (
    <View style={[styles.row, style]}>
      {left}
      {icon ? (
        iconTint ? (
          <View style={[styles.iconBox, { backgroundColor: iconTint }]}>
            <Icon name={icon} size={18} color="#0A0A0A" />
          </View>
        ) : (
          <Icon name={icon} size={22} color={destructive ? 'danger' : 'text'} />
        )
      ) : null}
      <View style={styles.texts}>
        <Text variant="body" weight="500" color={destructive ? 'danger' : 'text'} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="footnote" color="textSecondary" numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {badge ? (
        <View style={[styles.badge, { backgroundColor: colors.live }]}>
          <Text variant="caption" color="#FFFFFF">
            {badge}
          </Text>
        </View>
      ) : null}
      {value ? (
        <Text variant="subhead" color="textSecondary" numberOfLines={1} style={styles.value}>
          {value}
        </Text>
      ) : null}
      {right}
      {onSwitch !== undefined ? (
        <Switch
          value={!!switchValue}
          onValueChange={(v) => {
            haptic.tap();
            onSwitch(v);
          }}
          trackColor={{ true: colors.primary, false: colors.surfaceAlt }}
          thumbColor="#FFFFFF"
          ios_backgroundColor={colors.surfaceAlt}
        />
      ) : null}
      {showChevron ? <Icon name="chevron-forward" size={18} color="textTertiary" /> : null}
    </View>
  );
  if (!onPress) return content;
  return (
    <PressableScale scaleTo={0.99} onPress={onPress} disabled={disabled} accessibilityRole="button">
      {content}
    </PressableScale>
  );
}

export function Divider({ inset = 0, style }: { inset?: number; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  return <View style={[{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: inset }, style]} />;
}

/** Gri kalın ayraç (bölümler arası) */
export function SectionGap() {
  const { colors } = useTheme();
  return <View style={{ height: 8, backgroundColor: colors.surface }} />;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SCREEN_PADDING,
    paddingVertical: 13,
    gap: 12,
    minHeight: 52,
  },
  iconBox: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  texts: { flex: 1, gap: 2 },
  value: { maxWidth: 160 },
  badge: { minWidth: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
});
