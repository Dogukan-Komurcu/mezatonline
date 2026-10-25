/**
 * Satıcı ekranlarının ortak görsel parçaları: kart, ilerleme çubuğu, durum hapı, form bölümü,
 * fiyat alanı, adet seçici, seçenek kartı, onay kutusu, barkod, aksiyon sayfası, konfeti.
 */
import { Image } from 'expo-image';
import { useEffect, useState, type ReactNode } from 'react';
import { Platform, StyleSheet, useWindowDimensions, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, PressableScale, Sheet, Text, TextField, type IconName } from '@/components/ui';
import { formatNumber } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { radius, SCREEN_PADDING, useTheme } from '@/theme';

/**
 * iOS'ta modal (pageSheet) ekranlar tam ekran değildir; üst güvenli alan uygulanmamalı
 * (native-stack de iOS modallarında topInset = 0 kullanır). Modal ekranlarda <Header safeTop={MODAL_SAFE_TOP} />.
 */
export const MODAL_SAFE_TOP = Platform.OS !== 'ios';

/** Tema token rengine saydamlık ekle ("#009E52" + 0.12 → "#009E521F") */
export function tint(hex: string, alpha: number): string {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return hex;
  const a = Math.round(Math.min(1, Math.max(0, alpha)) * 255)
    .toString(16)
    .padStart(2, '0');
  return hex + a;
}

export type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'primary';

export function useToneColor(tone: Tone): string {
  const { colors } = useTheme();
  switch (tone) {
    case 'success':
      return colors.success;
    case 'warning':
      return colors.warning;
    case 'danger':
      return colors.danger;
    case 'info':
      return colors.info;
    case 'primary':
      return colors.primary;
    default:
      return colors.textSecondary;
  }
}

// ─── Kart ────────────────────────────────────────────────────────────────────

export function Card({ children, style, onPress, padded = true }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void; padded?: boolean }) {
  const { colors } = useTheme();
  const base = [styles.card, padded && styles.cardPad, { backgroundColor: colors.card, borderColor: colors.border }, style];
  if (!onPress) return <View style={base}>{children}</View>;
  return (
    <PressableScale scaleTo={0.985} onPress={onPress} style={base} accessibilityRole="button">
      {children}
    </PressableScale>
  );
}

// ─── İlerleme çubuğu ─────────────────────────────────────────────────────────

export function ProgressBar({ value, color, height = 6, style }: { value: number; color?: string; height?: number; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  const pct = Math.max(0, Math.min(1, value));
  return (
    <View style={[{ height, borderRadius: height / 2, backgroundColor: colors.surfaceAlt, overflow: 'hidden' }, style]}>
      <View style={{ width: `${pct * 100}%`, height, borderRadius: height / 2, backgroundColor: color ?? colors.text }} />
    </View>
  );
}

/** Çok adımlı form ilerlemesi (segmentli) */
export function StepBar({ step, total }: { step: number; total: number }) {
  const { colors } = useTheme();
  return (
    <View style={styles.stepBar}>
      {Array.from({ length: total }, (_, i) => (
        <View key={i} style={[styles.stepSeg, { backgroundColor: i <= step ? colors.text : colors.surfaceAlt }]} />
      ))}
    </View>
  );
}

// ─── Durum hapı ──────────────────────────────────────────────────────────────

export function StatusPill({ label, tone = 'neutral', icon, style }: { label: string; tone?: Tone; icon?: IconName; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  const c = useToneColor(tone);
  const bg = tone === 'neutral' ? colors.surface : tone === 'primary' ? colors.primary : tint(c, 0.14);
  const fg = tone === 'neutral' ? colors.textSecondary : tone === 'primary' ? colors.onPrimary : c;
  return (
    <View style={[styles.pill, { backgroundColor: bg }, style]}>
      {icon ? <Icon name={icon} size={12} color={fg} /> : null}
      <Text variant="caption" weight="700" color={fg} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

// ─── Form bölümü ─────────────────────────────────────────────────────────────

export function FormSection({ title, subtitle, right, children, style }: { title: string; subtitle?: string; right?: ReactNode; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.section, style]}>
      <View style={styles.sectionHead}>
        <View style={{ flex: 1 }}>
          <Text variant="headline" weight="700">
            {title}
          </Text>
          {subtitle ? (
            <Text variant="footnote" color="textSecondary" style={{ marginTop: 2 }}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {right}
      </View>
      {children}
    </View>
  );
}

/** Gri küçük grup başlığı (menü bölümleri) */
export function GroupLabel({ children, style }: { children: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.groupLabel, style]}>
      <Text variant="footnote" weight="700" color="textSecondary">
        {children.toLocaleUpperCase('tr-TR')}
      </Text>
    </View>
  );
}

// ─── Anahtar / değer satırı ──────────────────────────────────────────────────

export function KeyValue({ label, value, strong, tone, hint, style }: { label: string; value: string; strong?: boolean; tone?: Tone; hint?: string; style?: StyleProp<ViewStyle> }) {
  const c = useToneColor(tone ?? 'neutral');
  return (
    <View style={[styles.kv, style]}>
      <View style={{ flex: 1 }}>
        <Text variant={strong ? 'bodyBold' : 'callout'} color={strong ? 'text' : 'textSecondary'}>
          {label}
        </Text>
        {hint ? (
          <Text variant="footnote" color="textTertiary">
            {hint}
          </Text>
        ) : null}
      </View>
      <Text variant={strong ? 'headline' : 'callout'} weight={strong ? '800' : '600'} color={tone ? c : 'text'} tabular style={styles.kvValue}>
        {value}
      </Text>
    </View>
  );
}

// ─── Alt sabit buton alanı ───────────────────────────────────────────────────

export function StickyFooter({ children, safeBottom = true, style }: { children: ReactNode; safeBottom?: boolean; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.footer, { backgroundColor: colors.bg, borderTopColor: colors.border, paddingBottom: safeBottom ? Math.max(insets.bottom, 12) : 12 }, style]}>
      {children}
    </View>
  );
}

// ─── Adet seçici ─────────────────────────────────────────────────────────────

export function Stepper({ value, onChange, min = 1, max = 999 }: { value: number; onChange: (v: number) => void; min?: number; max?: number }) {
  const { colors } = useTheme();
  const btn = (icon: IconName, next: number, disabled: boolean, label: string) => (
    <PressableScale
      scaleTo={0.9}
      disabled={disabled}
      accessibilityLabel={label}
      onPress={() => {
        haptic.tap();
        onChange(next);
      }}
      style={[styles.stepBtn, { backgroundColor: colors.surface, opacity: disabled ? 0.4 : 1 }]}>
      <Icon name={icon} size={20} />
    </PressableScale>
  );
  return (
    <View style={styles.stepper}>
      {btn('remove', Math.max(min, value - 1), value <= min, 'Azalt')}
      <Text variant="title3" tabular style={styles.stepValue} align="center">
        {value}
      </Text>
      {btn('add', Math.min(max, value + 1), value >= max, 'Artır')}
    </View>
  );
}

// ─── ₺ tutar alanı ───────────────────────────────────────────────────────────

export function MoneyField({
  label,
  value,
  onChange,
  helper,
  error,
  placeholder = '0',
  max = 9_999_999,
}: {
  label?: string;
  value: number;
  onChange: (v: number) => void;
  helper?: string;
  error?: string;
  placeholder?: string;
  max?: number;
}) {
  return (
    <TextField
      label={label}
      prefix="₺"
      value={value > 0 ? formatNumber(value) : ''}
      onChangeText={(t) => {
        const digits = t.replace(/\D/g, '').slice(0, 7);
        onChange(digits ? Math.min(max, parseInt(digits, 10)) : 0);
      }}
      keyboardType="number-pad"
      placeholder={placeholder}
      helper={helper}
      error={error}
      returnKeyType="done"
    />
  );
}

// ─── Seçenek kartı (radyo) ───────────────────────────────────────────────────

export function OptionCard({
  title,
  subtitle,
  emoji,
  icon,
  selected,
  onPress,
  children,
  style,
}: {
  title: string;
  subtitle?: string;
  emoji?: string;
  icon?: IconName;
  selected: boolean;
  onPress: () => void;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  return (
    <PressableScale
      scaleTo={0.985}
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      style={[styles.option, { borderColor: selected ? colors.text : colors.border, backgroundColor: selected ? colors.surface : colors.card }, style]}>
      <View style={styles.optionRow}>
        {emoji ? (
          <View style={[styles.optionIcon, { backgroundColor: colors.surface }]}>
            <Text style={{ fontSize: 22, lineHeight: 28 }}>{emoji}</Text>
          </View>
        ) : icon ? (
          <View style={[styles.optionIcon, { backgroundColor: colors.surface }]}>
            <Icon name={icon} size={22} />
          </View>
        ) : null}
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="headline" weight="700">
            {title}
          </Text>
          {subtitle ? (
            <Text variant="footnote" color="textSecondary">
              {subtitle}
            </Text>
          ) : null}
        </View>
        <View style={[styles.radio, { borderColor: selected ? colors.text : colors.textTertiary }]}>
          {selected ? <View style={[styles.radioDot, { backgroundColor: colors.text }]} /> : null}
        </View>
      </View>
      {selected && children ? <View style={{ marginTop: 12, gap: 12 }}>{children}</View> : null}
    </PressableScale>
  );
}

// ─── Onay kutusu ─────────────────────────────────────────────────────────────

export function CheckRow({ checked, onPress, label, linkLabel, onLink, style }: { checked: boolean; onPress: () => void; label: string; linkLabel?: string; onLink?: () => void; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  return (
    <PressableScale
      scaleTo={0.99}
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      style={[styles.check, style]}>
      <View style={[styles.box, { borderColor: checked ? colors.text : colors.textTertiary, backgroundColor: checked ? colors.text : 'transparent' }]}>
        {checked ? <Icon name="checkmark" size={15} color={colors.bg} /> : null}
      </View>
      <Text variant="callout" style={{ flex: 1 }}>
        {label}
        {linkLabel ? (
          <Text variant="callout" weight="700" color="accent" onPress={onLink} suppressHighlighting>
            {' '}
            {linkLabel}
          </Text>
        ) : null}
      </Text>
    </PressableScale>
  );
}

// ─── Küçük görsel ────────────────────────────────────────────────────────────

export function Thumb({ uri, size = 56, height, rounded = radius.sm, style }: { uri?: string; size?: number; height?: number; rounded?: number; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  return (
    <View style={[{ width: size, height: height ?? size, borderRadius: rounded, backgroundColor: colors.skeleton, overflow: 'hidden' }, style]}>
      {uri ? <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" transition={150} recyclingKey={uri} /> : null}
    </View>
  );
}

// ─── Barkod ──────────────────────────────────────────────────────────────────

/** Gönderi kodundan deterministik barkod görünümü (sadece görsel) */
export function Barcode({ value, height = 64 }: { value: string; height?: number }) {
  const { colors } = useTheme();
  const bars: { w: number; on: boolean }[] = [];
  const seq = `*${value}*`;
  for (let i = 0; i < seq.length; i++) {
    const bits = seq.charCodeAt(i).toString(2).padStart(8, '0');
    for (let b = 0; b < bits.length; b++) bars.push({ w: bits[b] === '1' ? 2.5 : 1.2, on: b % 2 === 0 });
    bars.push({ w: 1.5, on: false });
  }
  return (
    <View style={[styles.barcode, { height }]} accessibilityLabel={`Barkod ${value}`}>
      {bars.map((bar, i) => (
        <View key={i} style={{ width: bar.w, height, backgroundColor: bar.on ? colors.text : 'transparent' }} />
      ))}
    </View>
  );
}

// ─── Aksiyon sayfası ─────────────────────────────────────────────────────────

export type SheetAction = { label: string; icon: IconName; onPress: () => void; destructive?: boolean; disabled?: boolean; subtitle?: string };

/** ⋯ menüsü: seçimden sonra sayfa kapanır, eylem kapanış animasyonundan sonra çalışır */
export function ActionSheet({ visible, onClose, title, subtitle, actions }: { visible: boolean; onClose: () => void; title?: string; subtitle?: string; actions: SheetAction[] }) {
  const { colors } = useTheme();
  return (
    <Sheet visible={visible} onClose={onClose} title={title} subtitle={subtitle}>
      <View style={{ marginHorizontal: -SCREEN_PADDING }}>
        {actions.map((a) => (
          <PressableScale
            key={a.label}
            scaleTo={0.99}
            disabled={a.disabled}
            onPress={() => {
              haptic.tap();
              onClose();
              setTimeout(a.onPress, 350);
            }}
            style={[styles.action, { opacity: a.disabled ? 0.4 : 1 }]}>
            <View style={[styles.actionIcon, { backgroundColor: a.destructive ? tint(colors.danger, 0.12) : colors.surface }]}>
              <Icon name={a.icon} size={19} color={a.destructive ? colors.danger : colors.text} />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="body" weight="600" color={a.destructive ? 'danger' : 'text'}>
                {a.label}
              </Text>
              {a.subtitle ? (
                <Text variant="footnote" color="textSecondary">
                  {a.subtitle}
                </Text>
              ) : null}
            </View>
          </PressableScale>
        ))}
      </View>
    </Sheet>
  );
}

// ─── Konfeti ─────────────────────────────────────────────────────────────────

type Piece = { id: number; x: number; delay: number; duration: number; size: number; drift: number; rotate: number; color: number };

function ConfettiPiece({ piece, color, fall }: { piece: Piece; color: string; fall: number }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.set(withDelay(piece.delay, withTiming(1, { duration: piece.duration, easing: Easing.in(Easing.quad) })));
  }, [p, piece.delay, piece.duration]);
  const style = useAnimatedStyle(() => {
    const v = p.get();
    return {
      opacity: v > 0.85 ? (1 - v) / 0.15 : 1,
      transform: [{ translateY: -30 + v * fall }, { translateX: Math.sin(v * Math.PI * 3) * piece.drift }, { rotate: `${v * piece.rotate}deg` }],
    };
  });
  return <Animated.View style={[styles.piece, { left: piece.x, width: piece.size, height: piece.size * 0.5, backgroundColor: color }, style]} />;
}

/** Başvuru onayı kutlaması: ekranın üstünden düşen renkli parçalar */
export function Confetti({ onDone, count = 46 }: { onDone?: () => void; count?: number }) {
  const { colors } = useTheme();
  const { width, height } = useWindowDimensions();
  const [pieces] = useState<Piece[]>(() =>
    Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * width,
      delay: Math.random() * 600,
      duration: 2200 + Math.random() * 1500,
      size: 8 + Math.random() * 8,
      drift: 8 + Math.random() * 28,
      rotate: 360 + Math.random() * 900,
      color: i % 6,
    })),
  );
  useEffect(() => {
    const t = setTimeout(() => onDone?.(), 4300);
    return () => clearTimeout(t);
  }, [onDone]);
  const palette = [colors.primary, colors.live, colors.success, colors.info, colors.accent, colors.warning];
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {pieces.map((piece) => (
        <ConfettiPiece key={piece.id} piece={piece} color={palette[piece.color]} fall={height + 60} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth },
  cardPad: { padding: 16 },
  stepBar: { flexDirection: 'row', gap: 4, paddingHorizontal: SCREEN_PADDING, paddingBottom: 10 },
  stepSeg: { flex: 1, height: 4, borderRadius: 2 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill, alignSelf: 'flex-start' },
  section: { gap: 12 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  groupLabel: { paddingHorizontal: SCREEN_PADDING, paddingTop: 18, paddingBottom: 6 },
  kv: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 },
  kvValue: { flexShrink: 1, maxWidth: '64%', textAlign: 'right' },
  footer: { paddingHorizontal: SCREEN_PADDING, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, gap: 10 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  stepBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  stepValue: { minWidth: 48 },
  option: { borderWidth: 1.5, borderRadius: radius.lg, padding: 14 },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  optionIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  check: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 6 },
  box: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  barcode: { flexDirection: 'row', alignItems: 'stretch', justifyContent: 'center', overflow: 'hidden' },
  action: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: SCREEN_PADDING, paddingVertical: 12 },
  actionIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  piece: { position: 'absolute', top: 0, borderRadius: 2 },
});
