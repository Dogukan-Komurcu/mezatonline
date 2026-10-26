/**
 * Hesap / ayarlar ekranlarının ortak yapı taşları (Whatnot Account menüsü stili):
 * 40px gri ikon dairesi satırları, gruplar, etiketler, ilerleme çubuğu, onay / işlem sayfaları, PIN klavyesi.
 */
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, Switch, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, CountBadge, Icon, PressableScale, Sheet, Text, type IconName } from '@/components/ui';
import { haptic } from '@/lib/haptics';
import { radius, SCREEN_PADDING, useTheme, type ColorTokens } from '@/theme';
import type { CardBrand } from '@/types';

type Tone = keyof ColorTokens | (string & {});

// ─── İkon dairesi ────────────────────────────────────────────────────────────

export function IconCircle({ name, size = 40, bg, color, emoji }: { name?: IconName; size?: number; bg?: string; color?: string; emoji?: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.circle, { width: size, height: size, borderRadius: size / 2, backgroundColor: bg ?? colors.surface }]}>
      {emoji ? (
        <Text style={{ fontSize: size * 0.48, lineHeight: size * 0.6 }}>{emoji}</Text>
      ) : name ? (
        <Icon name={name} size={Math.round(size * 0.5)} color={color ?? colors.text} />
      ) : null}
    </View>
  );
}

// ─── Menü satırı ─────────────────────────────────────────────────────────────

export type MenuRowProps = {
  icon?: IconName;
  emoji?: string;
  title: string;
  subtitle?: string;
  value?: string;
  valueTone?: Tone;
  onPress?: () => void;
  badge?: number;
  right?: ReactNode;
  destructive?: boolean;
  iconBg?: string;
  iconColor?: string;
  chevron?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** 40px gri ikon dairesi + başlık (+ alt başlık) + değer + › */
export function MenuRow({ icon, emoji, title, subtitle, value, valueTone, onPress, badge, right, destructive, iconBg, iconColor, chevron = true, disabled, style }: MenuRowProps) {
  const { colors } = useTheme();
  return (
    <PressableScale
      scaleTo={0.985}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={title}
      disabled={!onPress || disabled}
      onPress={
        onPress
          ? () => {
              haptic.tap();
              onPress();
            }
          : undefined
      }
      style={[styles.menuRow, { opacity: disabled ? 0.5 : 1 }, style]}>
      {icon || emoji ? <IconCircle name={icon} emoji={emoji} bg={iconBg} color={destructive ? colors.danger : iconColor} /> : null}
      <View style={styles.menuTexts}>
        <Text variant="headline" color={destructive ? 'danger' : 'text'} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="subhead" color="textSecondary" numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {badge ? <CountBadge count={badge} /> : null}
      {value ? (
        <Text variant="subhead" weight="600" color={valueTone ?? 'textSecondary'} numberOfLines={1} style={styles.menuValue}>
          {value}
        </Text>
      ) : null}
      {right}
      {onPress && chevron ? <Icon name="chevron-forward" size={18} color="textTertiary" /> : null}
    </PressableScale>
  );
}

// ─── Anahtarlı satır ─────────────────────────────────────────────────────────

export function SwitchRow({ icon, title, subtitle, value, onChange, disabled, style }: { icon?: IconName; title: string; subtitle?: string; value: boolean; onChange: (v: boolean) => void; disabled?: boolean; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.menuRow, { opacity: disabled ? 0.5 : 1 }, style]}>
      {icon ? <IconCircle name={icon} /> : null}
      <View style={styles.menuTexts}>
        <Text variant="headline" numberOfLines={2}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="subhead" color="textSecondary">
            {subtitle}
          </Text>
        ) : null}
      </View>
      <Switch
        value={value}
        disabled={disabled}
        accessibilityLabel={title}
        onValueChange={(v) => {
          haptic.tap();
          onChange(v);
        }}
        trackColor={{ true: colors.success, false: colors.surfaceAlt }}
        thumbColor="#FFFFFF"
        ios_backgroundColor={colors.surfaceAlt}
      />
    </View>
  );
}

// ─── Grup ────────────────────────────────────────────────────────────────────

export function MenuGroup({ title, footer, children, style, action, onAction }: { title?: string; footer?: string; children: ReactNode; style?: StyleProp<ViewStyle>; action?: string; onAction?: () => void }) {
  return (
    <View style={[styles.group, style]}>
      {title ? (
        <View style={styles.groupHead}>
          <Text variant="title3" style={{ flex: 1 }} numberOfLines={1}>
            {title}
          </Text>
          {action ? (
            <Text variant="subhead" weight="700" color="accent" onPress={onAction} suppressHighlighting>
              {action}
            </Text>
          ) : null}
        </View>
      ) : null}
      {children}
      {footer ? (
        <Text variant="footnote" color="textSecondary" style={styles.groupFooter}>
          {footer}
        </Text>
      ) : null}
    </View>
  );
}

// ─── Etiket ──────────────────────────────────────────────────────────────────

export type TagTone = 'neutral' | 'primary' | 'success' | 'danger' | 'inverse' | 'warning';

export function Tag({ label, tone = 'neutral', icon, style }: { label: string; tone?: TagTone; icon?: IconName; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  const map: Record<TagTone, [string, string]> = {
    neutral: [colors.surface, colors.text],
    primary: [colors.primary, colors.onPrimary],
    success: [colors.success, '#FFFFFF'],
    danger: [colors.danger, '#FFFFFF'],
    warning: [colors.warning, '#0A0A0A'],
    inverse: [colors.inverse, colors.onInverse],
  };
  const [bg, fg] = map[tone];
  return (
    <View style={[styles.tag, { backgroundColor: bg }, style]}>
      {icon ? <Icon name={icon} size={11} color={fg} /> : null}
      <Text variant="caption" weight="700" color={fg} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

// ─── İlerleme çubuğu (sarı → turuncu) ────────────────────────────────────────

export function ProgressBar({ value, height = 6, tone, style }: { value: number; height?: number; tone?: 'brand' | 'success' | 'danger'; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  const pct = Math.max(0, Math.min(1, value));
  const fill: readonly [string, string] =
    tone === 'success' ? [colors.success, colors.success] : tone === 'danger' ? [colors.danger, colors.danger] : [colors.primary, colors.warning];
  return (
    <View style={[{ height, borderRadius: height / 2, backgroundColor: colors.surfaceAlt, overflow: 'hidden' }, style]}>
      {pct > 0 ? <LinearGradient colors={fill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ width: `${pct * 100}%`, height: '100%', borderRadius: height / 2 }} /> : null}
    </View>
  );
}

/** Whatnot görev kartlarındaki parçalı ilerleme (kapsüller) */
export function SegmentedProgress({ total, done, style }: { total: number; done: number; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.segments, style]}>
      {Array.from({ length: total }, (_, i) => (
        <View key={i} style={[styles.segment, { backgroundColor: colors.surfaceAlt }]}>
          {i < done ? <LinearGradient colors={[colors.primary, colors.warning]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} /> : null}
        </View>
      ))}
    </View>
  );
}

// ─── Bilgi notu ──────────────────────────────────────────────────────────────

export function InfoNote({ icon = 'information-circle-outline', children, style }: { icon?: IconName; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.note, style]}>
      <Icon name={icon} size={16} color="textSecondary" style={{ marginTop: 1 }} />
      <Text variant="footnote" color="textSecondary" style={{ flex: 1 }}>
        {children}
      </Text>
    </View>
  );
}

// ─── Kart çerçevesi ──────────────────────────────────────────────────────────

export function OutlineCard({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  return <View style={[styles.outline, { borderColor: colors.border, backgroundColor: colors.card }, style]}>{children}</View>;
}

// ─── Alt sabit buton alanı ───────────────────────────────────────────────────

export function BottomBar({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 12), backgroundColor: colors.bg, borderTopColor: colors.border }, style]}>
      {children}
    </View>
  );
}

// ─── Kart markası rozeti ─────────────────────────────────────────────────────

export function CardBrandBadge({ brand, size = 'md' }: { brand: CardBrand; size?: 'sm' | 'md' }) {
  const { colors } = useTheme();
  const w = size === 'sm' ? 40 : 48;
  const h = size === 'sm' ? 26 : 32;
  if (brand === 'mastercard') {
    const d = h * 0.62;
    return (
      <View style={[styles.brand, { width: w, height: h, backgroundColor: colors.inverse }]}>
        <View style={{ flexDirection: 'row' }}>
          <View style={{ width: d, height: d, borderRadius: d / 2, backgroundColor: colors.danger }} />
          <View style={{ width: d, height: d, borderRadius: d / 2, backgroundColor: colors.warning, marginLeft: -d * 0.4, opacity: 0.92 }} />
        </View>
      </View>
    );
  }
  const label = brand === 'visa' ? 'VISA' : brand === 'troy' ? 'troy' : 'AMEX';
  const bg = brand === 'amex' ? colors.accent : colors.inverse;
  const fg = brand === 'amex' ? '#FFFFFF' : colors.onInverse;
  return (
    <View style={[styles.brand, { width: w, height: h, backgroundColor: bg }]}>
      <Text
        style={{ fontSize: size === 'sm' ? 11 : 13, lineHeight: size === 'sm' ? 14 : 16, fontWeight: '900', fontStyle: brand === 'visa' ? 'italic' : 'normal', letterSpacing: brand === 'troy' ? 0 : 0.5 }}
        color={fg}>
        {label}
      </Text>
    </View>
  );
}

export const CARD_BRAND_NAMES: Record<CardBrand, string> = { visa: 'Visa', mastercard: 'Mastercard', troy: 'Troy', amex: 'American Express' };

/** "12/29" → kartın süresi dolmuş mu */
export function isCardExpired(expiry: string, now = new Date()): boolean {
  const m = expiry.match(/^(\d{2})\/(\d{2})$/);
  if (!m) return false;
  return new Date(2000 + +m[2], +m[1], 1).getTime() <= now.getTime();
}

// ─── Onay sayfası ────────────────────────────────────────────────────────────

export function ConfirmSheet({
  visible,
  onClose,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Vazgeç',
  destructive,
  onConfirm,
  icon,
  emoji,
  loading,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  icon?: IconName;
  emoji?: string;
  loading?: boolean;
  children?: ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <Sheet visible={visible} onClose={loading ? () => {} : onClose}>
      <View style={styles.confirm}>
        {icon || emoji ? <IconCircle name={icon} emoji={emoji} size={64} bg={destructive ? colors.surface : colors.primary} color={destructive ? colors.danger : colors.onPrimary} /> : null}
        <Text variant="title3" align="center">
          {title}
        </Text>
        {message ? (
          <Text variant="callout" color="textSecondary" align="center">
            {message}
          </Text>
        ) : null}
        {children}
        <View style={styles.confirmButtons}>
          <Button title={confirmLabel} variant={destructive ? 'danger' : 'primary'} size="lg" fullWidth loading={loading} onPress={onConfirm} />
          <Button title={cancelLabel} variant="secondary" size="lg" fullWidth disabled={loading} onPress={onClose} />
        </View>
      </View>
    </Sheet>
  );
}

// ─── İşlem listesi (⋯ menüsü) ────────────────────────────────────────────────

export type SheetAction = { label: string; icon: IconName; onPress: () => void; destructive?: boolean; subtitle?: string };

/** Seçimden sonra sayfa kapanır, işlem kapanma animasyonu bitince çalışır (üst üste modal açılabilsin diye). */
export function ActionSheet({ visible, onClose, title, subtitle, actions }: { visible: boolean; onClose: () => void; title?: string; subtitle?: string; actions: SheetAction[] }) {
  return (
    <Sheet visible={visible} onClose={onClose} title={title} subtitle={subtitle} contentStyle={{ paddingHorizontal: 0 }}>
      {actions.map((a) => (
        <MenuRow
          key={a.label}
          icon={a.icon}
          title={a.label}
          subtitle={a.subtitle}
          destructive={a.destructive}
          chevron={false}
          onPress={() => {
            onClose();
            setTimeout(a.onPress, 280);
          }}
        />
      ))}
    </Sheet>
  );
}

// ─── PIN klavyesi ────────────────────────────────────────────────────────────

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'] as const;

/**
 * 4 haneli PIN.
 * mode="create": iki kez girilir, eşleşirse onSuccess(pin).
 * mode="verify": expected ile karşılaştırılır.
 */
export function PinSheet({
  visible,
  onClose,
  mode,
  expected,
  onSuccess,
  onForgot,
}: {
  visible: boolean;
  onClose: () => void;
  mode: 'create' | 'verify';
  expected?: string;
  onSuccess: (pin: string) => void;
  onForgot?: () => void;
}) {
  const { colors } = useTheme();
  const [entered, setEntered] = useState('');
  const [first, setFirst] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const shake = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.get() }] }));

  useEffect(() => {
    if (visible) {
      setEntered('');
      setFirst(null);
      setError(null);
    }
  }, [visible]);

  const fail = (message: string) => {
    haptic.error();
    setError(message);
    shake.set(withSequence(withTiming(-12, { duration: 50 }), withTiming(12, { duration: 50 }), withTiming(-8, { duration: 50 }), withTiming(8, { duration: 50 }), withTiming(0, { duration: 50 })));
    setTimeout(() => setEntered(''), 180);
  };

  const complete = (pin: string) => {
    if (mode === 'verify') {
      if (pin === expected) {
        haptic.success();
        onSuccess(pin);
      } else fail('PIN hatalı. Tekrar dene.');
      return;
    }
    if (first === null) {
      setFirst(pin);
      setEntered('');
      setError(null);
      return;
    }
    if (pin === first) {
      haptic.success();
      onSuccess(pin);
    } else {
      setFirst(null);
      fail("PIN'ler eşleşmedi. Baştan başlayalım.");
    }
  };

  const press = (k: (typeof KEYS)[number]) => {
    if (!k) return;
    haptic.tap();
    if (k === 'del') {
      setEntered((e) => e.slice(0, -1));
      return;
    }
    if (entered.length >= 4) return;
    const next = entered + k;
    setEntered(next);
    setError(null);
    if (next.length === 4) setTimeout(() => complete(next), 140);
  };

  const title = mode === 'verify' ? "PIN'ini gir" : first === null ? '4 haneli PIN oluştur' : "PIN'i tekrar gir";
  const subtitle =
    mode === 'verify' ? 'Hesap Kontrolleri ayarlarını değiştirmek için PIN gerekli.' : first === null ? 'Hatırlatıcı ve limitlerin bu PIN ile korunur.' : 'Onaylamak için aynı PIN’i bir kez daha gir.';

  return (
    <Sheet visible={visible} onClose={onClose} showClose>
      <View style={styles.pinHead}>
        <IconCircle name="lock-closed" size={56} bg={colors.primary} color={colors.onPrimary} />
        <Text variant="title3" align="center">
          {title}
        </Text>
        <Text variant="subhead" color="textSecondary" align="center">
          {subtitle}
        </Text>
        <Animated.View style={[styles.dots, shakeStyle]}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={[styles.dot, { borderColor: error ? colors.danger : colors.text, backgroundColor: i < entered.length ? (error ? colors.danger : colors.text) : 'transparent' }]} />
          ))}
        </Animated.View>
        <Text variant="footnote" color="danger" style={{ minHeight: 16 }}>
          {error ?? ''}
        </Text>
      </View>
      <View style={styles.keypad}>
        {KEYS.map((k, i) => (
          <PressableScale
            key={i}
            scaleTo={0.9}
            disabled={!k}
            onPress={() => press(k)}
            accessibilityLabel={k === 'del' ? 'Sil' : k}
            style={[styles.key, { backgroundColor: k && k !== 'del' ? colors.surface : 'transparent' }]}>
            {k === 'del' ? <Icon name="backspace-outline" size={24} /> : <Text variant="title2">{k}</Text>}
          </PressableScale>
        ))}
      </View>
      {mode === 'verify' && onForgot ? (
        <Text variant="subhead" weight="700" color="accent" align="center" onPress={onForgot} style={{ paddingVertical: 8 }} suppressHighlighting>
          PIN'imi unuttum
        </Text>
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  circle: { alignItems: 'center', justifyContent: 'center' },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: SCREEN_PADDING, paddingVertical: 10, minHeight: 60 },
  menuTexts: { flex: 1, gap: 1 },
  menuValue: { maxWidth: 150 },
  group: { paddingTop: 20 },
  groupHead: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SCREEN_PADDING, marginBottom: 4, gap: 12 },
  groupFooter: { paddingHorizontal: SCREEN_PADDING, marginTop: 4 },
  // Etiketler hep satır içinde (menü satırı sağı, başlık yanı) kullanılıyor: dikeyde ortala
  tag: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill, alignSelf: 'center' },
  segments: { flexDirection: 'row', gap: 4 },
  segment: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  note: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  outline: { borderWidth: StyleSheet.hairlineWidth * 2, borderRadius: radius.lg, padding: 16 },
  bottomBar: { paddingHorizontal: SCREEN_PADDING, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, gap: 8 },
  brand: { borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  confirm: { alignItems: 'center', gap: 10, paddingTop: 8 },
  confirmButtons: { alignSelf: 'stretch', gap: 10, marginTop: 10 },
  pinHead: { alignItems: 'center', gap: 8, paddingTop: 4 },
  dots: { flexDirection: 'row', gap: 18, marginTop: 12 },
  dot: { width: 16, height: 16, borderRadius: 8, borderWidth: 2 },
  keypad: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12, paddingHorizontal: 18, marginTop: 4, marginBottom: 8 },
  key: { width: '30%', height: 58, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
});
