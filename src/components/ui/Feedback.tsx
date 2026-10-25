import { useEffect } from 'react';
import { StyleSheet, View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { FadeInUp, FadeOutUp, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { create } from 'zustand';

import { radius, useTheme } from '@/theme';

import { Button } from './Button';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

// ─── Boş durum ───────────────────────────────────────────────────────────────

export type EmptyStateProps = {
  icon?: IconName;
  emoji?: string;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
};

export function EmptyState({ icon, emoji, title, message, actionLabel, onAction, style }: EmptyStateProps) {
  const { colors } = useTheme();
  return (
    <View style={[styles.empty, style]}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.surface }]}>
        {emoji ? <Text style={{ fontSize: 34, lineHeight: 40 }}>{emoji}</Text> : <Icon name={icon ?? 'sparkles-outline'} size={32} color="textSecondary" />}
      </View>
      <Text variant="title3" align="center">
        {title}
      </Text>
      {message ? (
        <Text variant="callout" color="textSecondary" align="center" style={{ maxWidth: 300 }}>
          {message}
        </Text>
      ) : null}
      {actionLabel ? <Button title={actionLabel} onPress={onAction} style={{ marginTop: 8 }} /> : null}
    </View>
  );
}

// ─── İskelet yükleyici ───────────────────────────────────────────────────────

export function Skeleton({ width = '100%', height = 16, rounded = radius.sm, style }: { width?: DimensionValue; height?: DimensionValue; rounded?: number; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  const o = useSharedValue(0.5);
  useEffect(() => {
    o.set(withRepeat(withTiming(1, { duration: 800 }), -1, true));
  }, [o]);
  const s = useAnimatedStyle(() => ({ opacity: o.get() }));
  return <Animated.View style={[{ width, height, borderRadius: rounded, backgroundColor: colors.skeleton }, s, style]} />;
}

// ─── Puan yıldızları ─────────────────────────────────────────────────────────

export function Stars({ rating, size = 14, color }: { rating: number; size?: number; color?: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 1 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Icon key={i} name={rating >= i ? 'star' : rating >= i - 0.5 ? 'star-half' : 'star-outline'} size={size} color={color ?? colors.warning} />
      ))}
    </View>
  );
}

// ─── Sayı rozeti ─────────────────────────────────────────────────────────────

export function CountBadge({ count, style }: { count: number; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  if (!count) return null;
  return (
    <View style={[styles.count, { backgroundColor: colors.live }, style]}>
      <Text variant="caption" color="#FFFFFF" style={{ fontSize: 10, lineHeight: 12 }}>
        {count > 99 ? '99+' : count}
      </Text>
    </View>
  );
}

// ─── Toast ───────────────────────────────────────────────────────────────────

type ToastKind = 'info' | 'success' | 'error' | 'warning';
type ToastItem = { id: number; message: string; kind: ToastKind; icon?: IconName };

const useToastStore = create<{ toast?: ToastItem; show: (message: string, kind?: ToastKind, icon?: IconName) => void; hide: () => void }>((set) => ({
  toast: undefined,
  show: (message, kind = 'info', icon) => set({ toast: { id: Date.now(), message, kind, icon } }),
  hide: () => set({ toast: undefined }),
}));

/**
 * Global bildirim baloncuğu.
 * toast('Takip edildi'), toast.success('Teklifin verildi'), toast.error('Bir hata oluştu')
 */
export const toast = Object.assign((message: string, icon?: IconName) => useToastStore.getState().show(message, 'info', icon), {
  success: (message: string, icon?: IconName) => useToastStore.getState().show(message, 'success', icon),
  error: (message: string, icon?: IconName) => useToastStore.getState().show(message, 'error', icon),
  warning: (message: string, icon?: IconName) => useToastStore.getState().show(message, 'warning', icon),
});

/** Kök layout'ta bir kez render edilir */
export function ToastHost() {
  const t = useToastStore((s) => s.toast);
  const hide = useToastStore((s) => s.hide);
  const insets = useSafeAreaInsets();
  useEffect(() => {
    if (!t) return;
    const timer = setTimeout(hide, 2600);
    return () => clearTimeout(timer);
  }, [t, hide]);
  if (!t) return null;
  const icon: IconName = t.icon ?? (t.kind === 'success' ? 'checkmark-circle' : t.kind === 'error' ? 'alert-circle' : t.kind === 'warning' ? 'warning' : 'information-circle');
  const tint = t.kind === 'success' ? '#2BC062' : t.kind === 'error' ? '#FF5A5F' : t.kind === 'warning' ? '#F5B031' : '#FFE414';
  return (
    <View pointerEvents="none" style={[styles.toastWrap, { top: insets.top + 8 }]}>
      <Animated.View key={t.id} entering={FadeInUp.springify().damping(18)} exiting={FadeOutUp} style={styles.toast}>
        <Icon name={icon} size={20} color={tint} />
        <Text variant="callout" weight="600" color="#FFFFFF" style={{ flexShrink: 1 }}>
          {t.message}
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48, paddingHorizontal: 24, gap: 10 },
  emptyIcon: { width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  count: { minWidth: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  toastWrap: { position: 'absolute', left: 16, right: 16, alignItems: 'center', zIndex: 9999, elevation: 9999 },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(20,20,22,0.96)',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 12,
    maxWidth: 420,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
});
