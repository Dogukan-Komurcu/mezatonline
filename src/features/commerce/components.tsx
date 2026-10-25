/**
 * Ticaret ekranlarında ortak küçük bileşenler.
 */
import type { ReactNode } from 'react';
import { StyleSheet, TextInput, View, type StyleProp, type ViewStyle } from 'react-native';

import { Icon, PressableScale, Text, type IconName } from '@/components/ui';
import { haptic } from '@/lib/haptics';
import { radius, useTheme } from '@/theme';
import type { CardBrand } from '@/types';

import { formatLiraInput, parseLira } from './utils';

// ─── Kart markası ────────────────────────────────────────────────────────────

/** Kart markası rozeti (Visa / Mastercard / Troy / Amex) */
export function CardBrandMark({ brand, size = 'md' }: { brand: CardBrand; size?: 'sm' | 'md' }) {
  const { colors } = useTheme();
  const h = size === 'sm' ? 22 : 28;
  const w = size === 'sm' ? 34 : 44;
  return (
    <View style={[styles.brand, { width: w, height: h, borderColor: colors.border, backgroundColor: colors.card }]}>
      {brand === 'mastercard' ? (
        <View style={styles.mcRow}>
          <View style={[{ width: h * 0.55, height: h * 0.55, borderRadius: h, backgroundColor: colors.danger }]} />
          <View style={[{ width: h * 0.55, height: h * 0.55, borderRadius: h, backgroundColor: colors.warning, marginLeft: -h * 0.22, opacity: 0.9 }]} />
        </View>
      ) : (
        <Text
          style={{ fontSize: size === 'sm' ? 9 : 11, lineHeight: size === 'sm' ? 11 : 13, fontWeight: '900', fontStyle: brand === 'visa' ? 'italic' : 'normal', letterSpacing: 0.3 }}
          color={brand === 'visa' ? 'info' : brand === 'amex' ? 'accent' : 'success'}>
          {brand === 'visa' ? 'VISA' : brand === 'amex' ? 'AMEX' : 'troy'}
        </Text>
      )}
    </View>
  );
}

// ─── Bölüm başlığı ───────────────────────────────────────────────────────────

export function BlockTitle({ title, action, onAction, style }: { title: string; action?: string; onAction?: () => void; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.blockTitle, style]}>
      <Text variant="headline" weight="700" style={{ flex: 1 }} numberOfLines={1}>
        {title}
      </Text>
      {action ? (
        <Text
          variant="subhead"
          weight="700"
          color="accent"
          suppressHighlighting
          onPress={() => {
            haptic.tap();
            onAction?.();
          }}>
          {action}
        </Text>
      ) : null}
    </View>
  );
}

// ─── İkonlu bilgi satırı ─────────────────────────────────────────────────────

export function InfoLine({ icon, title, subtitle, right, onPress, tint, style }: { icon: IconName; title: string; subtitle?: string; right?: ReactNode; onPress?: () => void; tint?: string; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  const body = (
    <View style={[styles.infoLine, style]}>
      <View style={[styles.infoIcon, { backgroundColor: colors.surface }]}>
        <Icon name={icon} size={18} color={tint ?? colors.text} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="callout" weight="600">
          {title}
        </Text>
        {subtitle ? (
          <Text variant="footnote" color="textSecondary">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
      {onPress && !right ? <Icon name="chevron-forward" size={18} color="textTertiary" /> : null}
    </View>
  );
  if (!onPress) return body;
  return (
    <PressableScale scaleTo={0.99} onPress={onPress} accessibilityRole="button">
      {body}
    </PressableScale>
  );
}

// ─── Adet seçici ─────────────────────────────────────────────────────────────

export function QtyStepper({ value, min = 1, max, onChange }: { value: number; min?: number; max: number; onChange: (v: number) => void }) {
  const { colors } = useTheme();
  const btn = (icon: IconName, disabled: boolean, next: number, label: string) => (
    <PressableScale
      scaleTo={0.9}
      disabled={disabled}
      accessibilityLabel={label}
      onPress={() => {
        haptic.tap();
        onChange(next);
      }}
      style={[styles.stepBtn, { opacity: disabled ? 0.35 : 1 }]}>
      <Icon name={icon} size={16} color="text" />
    </PressableScale>
  );
  return (
    <View style={[styles.stepper, { borderColor: colors.border }]}>
      {btn('remove', value <= min, value - 1, 'Azalt')}
      <Text variant="callout" weight="700" tabular style={styles.stepValue}>
        {value}
      </Text>
      {btn('add', value >= max, value + 1, 'Arttır')}
    </View>
  );
}

// ─── Onay kutusu ─────────────────────────────────────────────────────────────

export function Checkbox({ checked, onToggle, error, children }: { checked: boolean; onToggle: () => void; error?: boolean; children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={styles.checkRow}>
      <PressableScale
        scaleTo={0.9}
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        hitSlop={8}
        onPress={() => {
          haptic.tap();
          onToggle();
        }}
        style={[
          styles.checkBox,
          {
            backgroundColor: checked ? colors.inverse : 'transparent',
            borderColor: error ? colors.danger : checked ? colors.inverse : colors.textTertiary,
          },
        ]}>
        {checked ? <Icon name="checkmark" size={15} color={colors.onInverse} /> : null}
      </PressableScale>
      <View style={{ flex: 1 }}>{children}</View>
    </View>
  );
}

// ─── Büyük ₺ tutar girişi ────────────────────────────────────────────────────

export function AmountInput({ value, onChange, error, autoFocus, placeholder }: { value: number; onChange: (v: number) => void; error?: string; autoFocus?: boolean; placeholder?: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: 6 }}>
      <View style={[styles.amountBox, { backgroundColor: colors.surface, borderColor: error ? colors.danger : 'transparent' }]}>
        <Text variant="title1" color={value ? 'text' : 'textTertiary'}>
          ₺
        </Text>
        <TextInput
          value={formatLiraInput(value)}
          onChangeText={(t) => onChange(Math.min(9_999_999, parseLira(t)))}
          keyboardType="number-pad"
          placeholder={placeholder ?? '0'}
          placeholderTextColor={colors.textTertiary}
          selectionColor={colors.text}
          autoFocus={autoFocus}
          maxLength={9}
          style={[styles.amountInput, { color: colors.text }]}
          accessibilityLabel="Tutar"
        />
      </View>
      {error ? (
        <Text variant="footnote" color="danger" style={{ marginLeft: 2 }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

// ─── Bilgi kutusu ────────────────────────────────────────────────────────────

export function NoticeBox({ icon, title, children, tone = 'neutral', style }: { icon: IconName; title?: string; children: ReactNode; tone?: 'neutral' | 'warning' | 'success'; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  const tint = tone === 'warning' ? colors.warning : tone === 'success' ? colors.success : colors.textSecondary;
  return (
    <View style={[styles.notice, { backgroundColor: colors.surface }, style]}>
      <Icon name={icon} size={18} color={tint} />
      <View style={{ flex: 1, gap: 2 }}>
        {title ? (
          <Text variant="subhead" weight="700">
            {title}
          </Text>
        ) : null}
        {typeof children === 'string' ? (
          <Text variant="footnote" color="textSecondary">
            {children}
          </Text>
        ) : (
          children
        )}
      </View>
    </View>
  );
}

/** Sıralı anahtar/değer tablosu */
export function KeyValueTable({ rows }: { rows: [string, string][] }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.table, { borderColor: colors.border }]}>
      {rows.map(([k, v], i) => (
        <View key={k} style={[styles.tableRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}>
          <Text variant="subhead" color="textSecondary" style={styles.tableKey}>
            {k}
          </Text>
          <Text variant="subhead" weight="600" style={styles.tableValue}>
            {v}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  brand: { borderRadius: 5, borderWidth: StyleSheet.hairlineWidth * 2, alignItems: 'center', justifyContent: 'center' },
  mcRow: { flexDirection: 'row', alignItems: 'center' },
  blockTitle: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  infoLine: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 9 },
  infoIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  stepper: { flexDirection: 'row', alignItems: 'center', borderWidth: StyleSheet.hairlineWidth * 2, borderRadius: radius.pill, height: 34 },
  stepBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  stepValue: { minWidth: 22, textAlign: 'center' },
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  checkBox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  amountBox: { flexDirection: 'row', alignItems: 'center', borderRadius: radius.lg, borderWidth: 1.5, paddingHorizontal: 18, height: 68, gap: 6 },
  amountInput: { flex: 1, fontSize: 30, fontWeight: '800', paddingVertical: 0 },
  notice: { flexDirection: 'row', gap: 10, padding: 12, borderRadius: radius.md, alignItems: 'flex-start' },
  table: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.md, overflow: 'hidden' },
  tableRow: { flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 11, gap: 12 },
  tableKey: { width: 112 },
  tableValue: { flex: 1, textAlign: 'right' },
});

