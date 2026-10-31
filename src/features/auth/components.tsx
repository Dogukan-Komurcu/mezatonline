import { StatusBar } from 'expo-status-bar';
import { useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, Keyboard, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, PressableScale, Text, type IconName } from '@/components/ui';
import { haptic } from '@/lib/haptics';
import { radius, SCREEN_PADDING, spacing, useTheme } from '@/theme';

// ─── Klavye ──────────────────────────────────────────────────────────────────

/** Klavye açık mı (alt CTA güvenli alan boşluğunu ayarlamak için) */
export function useKeyboardVisible(): boolean {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const a = Keyboard.addListener(showEvt, () => setVisible(true));
    const b = Keyboard.addListener(hideEvt, () => setVisible(false));
    return () => {
      a.remove();
      b.remove();
    };
  }, []);
  return visible;
}

// ─── Ekran iskeleti ──────────────────────────────────────────────────────────

/**
 * Kayıt / giriş ekranı iskeleti (ForceScheme dark altında kullanılmalı):
 * koyu zemin + açık status bar + üst başlık + klavyeye duyarlı içerik + altta sabit CTA.
 */
export function AuthLayout({
  header,
  children,
  footer,
  scroll = true,
  contentStyle,
}: {
  header?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const keyboard = useKeyboardVisible();
  return (
    <View style={[styles.flex, { backgroundColor: colors.bg }]}>
      <StatusBar style="light" />
      {header}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        {scroll ? (
          <ScrollView
            style={styles.flex}
            contentContainerStyle={[styles.scrollContent, contentStyle]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.flex, contentStyle]}>{children}</View>
        )}
        {footer ? (
          <View style={[styles.footer, { paddingBottom: keyboard ? spacing.md : Math.max(insets.bottom, spacing.lg) }]}>{footer}</View>
        ) : null}
      </KeyboardAvoidingView>
    </View>
  );
}

/** Büyük başlık + açıklama (Whatnot onboarding tipografisi) */
export function StepTitle({ title, subtitle, style }: { title: string; subtitle?: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.titleWrap, style]}>
      <Text variant="title1" style={styles.title}>
        {title}
      </Text>
      {subtitle ? (
        <Text variant="callout" color="textSecondary" style={styles.subtitle}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

/** Başlık sağındaki "Şimdilik geç" bağlantısı */
export function SkipLink({ label = 'Şimdilik geç', onPress }: { label?: string; onPress: () => void }) {
  return (
    <PressableScale
      accessibilityRole="button"
      hitSlop={10}
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      style={styles.skip}>
      <Text variant="callout" weight="700" color="textSecondary">
        {label}
      </Text>
    </PressableScale>
  );
}

// ─── İlerleme çubuğu ─────────────────────────────────────────────────────────

export const ONBOARDING_STEPS = ['username', 'notifications'] as const;
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

function Segment({ state }: { state: 'done' | 'active' | 'todo' }) {
  const { colors } = useTheme();
  const fill = useSharedValue(state === 'done' ? 1 : 0);
  useEffect(() => {
    fill.set(withTiming(state === 'todo' ? 0 : 1, { duration: state === 'active' ? 520 : 0 }));
  }, [fill, state]);
  const style = useAnimatedStyle(() => ({ width: `${fill.get() * 100}%` }));
  return (
    <View style={[styles.segment, { backgroundColor: colors.surfaceAlt }]}>
      <Animated.View style={[styles.segmentFill, { backgroundColor: colors.primary }, style]} />
    </View>
  );
}

/** Üstte ince segmentli ilerleme çubuğu */
export function OnboardingProgress({ step }: { step: OnboardingStep }) {
  const index = ONBOARDING_STEPS.indexOf(step);
  return (
    <View style={styles.progress} accessibilityRole="progressbar" accessibilityLabel={`Adım ${index + 1} / ${ONBOARDING_STEPS.length}`}>
      {ONBOARDING_STEPS.map((s, i) => (
        <Segment key={s} state={i < index ? 'done' : i === index ? 'active' : 'todo'} />
      ))}
    </View>
  );
}

// ─── Onay kutusu ─────────────────────────────────────────────────────────────

/** Onay kutusu satırı. label bir ReactNode olabilir (içinde bağlantılı Text) */
export function Checkbox({ checked, onChange, label, error }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode; error?: boolean }) {
  const { colors } = useTheme();
  return (
    <PressableScale
      scaleTo={0.99}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      onPress={() => {
        haptic.tap();
        onChange(!checked);
      }}
      style={styles.checkRow}>
      <View
        style={[
          styles.box,
          {
            backgroundColor: checked ? colors.primary : 'transparent',
            borderColor: checked ? colors.primary : error ? colors.danger : colors.textTertiary,
          },
        ]}>
        {checked ? <Icon name="checkmark" size={16} color={colors.onPrimary} /> : null}
      </View>
      <View style={styles.flex}>{typeof label === 'string' ? <Text variant="callout">{label}</Text> : label}</View>
    </PressableScale>
  );
}

// ─── Sosyal giriş butonu ─────────────────────────────────────────────────────

/** Whatnot karşılama ekranındaki çerçeveli tam genişlik buton (sol ikon + ortalı etiket) */
export function AuthOptionButton({
  icon,
  label,
  onPress,
  loading,
  disabled,
  iconColor,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  iconColor?: string;
}) {
  const { colors } = useTheme();
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled || loading}
      onPress={() => {
        haptic.light();
        onPress();
      }}
      style={[styles.option, { borderColor: colors.border, backgroundColor: colors.bg, opacity: disabled && !loading ? 0.5 : 1 }]}>
      <View style={styles.optionIcon}>{loading ? <ActivityIndicator color={colors.text} /> : <Icon name={icon} size={22} color={iconColor ?? colors.text} />}</View>
      <Text variant="headline" weight="700" numberOfLines={1} style={styles.optionLabel}>
        {label}
      </Text>
      <View style={styles.optionIcon} />
    </PressableScale>
  );
}

/** Ayraç: ——— veya ——— */
export function OrDivider({ label = 'veya' }: { label?: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.or}>
      <View style={[styles.orLine, { backgroundColor: colors.border }]} />
      <Text variant="footnote" color="textTertiary">
        {label}
      </Text>
      <View style={[styles.orLine, { backgroundColor: colors.border }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: SCREEN_PADDING, paddingBottom: spacing.xxl },
  footer: { paddingHorizontal: SCREEN_PADDING, paddingTop: spacing.md, gap: spacing.md },
  titleWrap: { gap: 8, marginTop: 8, marginBottom: 24 },
  title: { letterSpacing: -0.4 },
  subtitle: { lineHeight: 20 },
  skip: { paddingHorizontal: 10, paddingVertical: 6 },
  progress: { flexDirection: 'row', gap: 6, paddingHorizontal: SCREEN_PADDING, paddingTop: 2, paddingBottom: 10 },
  segment: { flex: 1, height: 4, borderRadius: 2, overflow: 'hidden' },
  segmentFill: { height: '100%', borderRadius: 2 },
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 8 },
  box: { width: 24, height: 24, borderRadius: 7, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  option: {
    height: 54,
    borderRadius: radius.md,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  optionIcon: { width: 28, alignItems: 'center', justifyContent: 'center' },
  optionLabel: { flex: 1, textAlign: 'center' },
  or: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 4 },
  orLine: { flex: 1, height: StyleSheet.hairlineWidth },
});

/** Tema renk tokenına saydamlık ekle: withAlpha('#121212', 0.5) → '#12121280' */
export function withAlpha(hex: string, alpha: number): string {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return hex;
  const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255)
    .toString(16)
    .padStart(2, '0');
  return `${hex}${a}`;
}
