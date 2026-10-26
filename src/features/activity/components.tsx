/**
 * Aktivite ve sipariş ekranlarının ortak parçaları: durum çipi, sipariş kartı, ikonlu satır,
 * ortada açılan onay penceresi ve kargo ilerleme çubuğu.
 */
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, type ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, useWindowDimensions, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { Button, Chip, Icon, PressableScale, Text, type IconName } from '@/components/ui';
import { getUser } from '@/data';
import { formatTRY } from '@/lib/format';
import { ORDER_SOURCE_LABELS } from '@/store/orders';
import { radius, SCREEN_PADDING, useTheme } from '@/theme';
import type { Order, OrderStatus } from '@/types';

import { useActivityExtras } from './store';
import { deliveryDayLabel, estimatedDelivery, ORDER_STEPS, orderStatusDisplay, orderStepIndex, shortDate, toneColor, withAlpha, type Tone } from './utils';

// ─── Durum çipi ──────────────────────────────────────────────────────────────

export function StatusChip({ label, tone, style }: { label: string; tone: Tone; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  const c = toneColor(tone, colors);
  return (
    <View style={[styles.chip, { backgroundColor: withAlpha(c, 0.14) }, style]}>
      <View style={[styles.chipDot, { backgroundColor: c }]} />
      <Text variant="caption" weight="700" color={c} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

// ─── Sipariş kartı (Siparişlerim listesi) ───────────────────────────────────

/** "Bugün" / "Yarın" / "28 Eki" */
function etaLabel(ms: number): string {
  const d = deliveryDayLabel(ms);
  return d.relative ? d.label : shortDate(ms);
}

export function OrderCard({ order }: { order: Order }) {
  const { colors } = useTheme();
  const seller = getUser(order.sellerId);
  const cancelRequested = useActivityExtras((s) => !!s.cancelRequests[order.id]);
  const status = orderStatusDisplay(order, { cancelRequested });
  const inTransit = order.status === 'shipped' || order.status === 'out_for_delivery';
  const canReview = order.status === 'delivered' && !order.reviewed;
  return (
    <PressableScale
      scaleTo={0.985}
      onPress={() => router.push(`/orders/${order.id}`)}
      style={styles.card}
      accessibilityRole="button"
      accessibilityLabel={`${order.productTitle}, ${status.label}`}>
      <View style={[styles.thumb, { backgroundColor: colors.skeleton }]}>
        <Image source={{ uri: order.productImage }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} cachePolicy="memory-disk" recyclingKey={order.id} />
        {order.quantity > 1 ? (
          <View style={[styles.qty, { backgroundColor: colors.inverse }]}>
            <Text variant="caption" color={colors.onInverse}>
              ×{order.quantity}
            </Text>
          </View>
        ) : null}
      </View>
      <View style={styles.cardBody}>
        <StatusChip label={status.label} tone={status.tone} />
        <Text variant="headline" numberOfLines={2}>
          {order.productTitle}
        </Text>
        <Text variant="footnote" color="textSecondary" numberOfLines={1}>
          Toplam:{' '}
          <Text variant="footnote" weight="700">
            {formatTRY(order.total)}
          </Text>
          {` · ${ORDER_SOURCE_LABELS[order.source]}`}
        </Text>
        <Text variant="footnote" color="textSecondary" numberOfLines={1}>
          {inTransit ? `Tahmini teslimat: ${etaLabel(estimatedDelivery(order))}` : `Satın alma: ${shortDate(order.createdAt)}`}
        </Text>
        <View style={styles.cardFooter}>
          <Text variant="footnote" color="textSecondary" numberOfLines={1} style={styles.flexShrink}>
            Satıcı:{' '}
            <Text
              variant="footnote"
              weight="700"
              color="accent"
              suppressHighlighting
              onPress={seller ? () => router.push(`/user/${seller.username}`) : undefined}>
              {seller ? `@${seller.username}` : 'Mezat satıcısı'}
            </Text>
          </Text>
          {canReview ? (
            <Button title="Değerlendir" size="sm" variant="inverse" icon="star" onPress={() => router.push(`/review/${order.id}`)} style={styles.reviewBtn} />
          ) : null}
        </View>
      </View>
    </PressableScale>
  );
}

// ─── İkon daireli satır (Sipariş detayı, Whatnot "row with icon circle") ────

export function IconCircleRow({
  icon,
  title,
  subtitle,
  onPress,
  trailing = 'chevron',
  circleColor,
  iconColor,
  right,
  subtitleColor,
}: {
  icon: IconName;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  trailing?: 'chevron' | 'external' | 'none';
  circleColor?: string;
  iconColor?: string;
  right?: ReactNode;
  subtitleColor?: string;
}) {
  const { colors } = useTheme();
  const content = (
    <View style={styles.iconRow}>
      <View style={[styles.iconCircle, { backgroundColor: circleColor ?? colors.surface }]}>
        <Icon name={icon} size={20} color={iconColor ?? colors.text} />
      </View>
      <View style={styles.iconRowTexts}>
        <Text variant="headline" numberOfLines={2}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="footnote" color={subtitleColor ?? 'textSecondary'} numberOfLines={3}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
      {onPress && trailing !== 'none' ? (
        <Icon name={trailing === 'external' ? 'open-outline' : 'chevron-forward'} size={18} color="textTertiary" />
      ) : null}
    </View>
  );
  if (!onPress) return content;
  return (
    <PressableScale scaleTo={0.985} onPress={onPress} accessibilityRole="button" accessibilityLabel={title}>
      {content}
    </PressableScale>
  );
}

// ─── Ortada açılan onay penceresi (Whatnot center modal) ────────────────────

export type ModalAction = { label: string; onPress: () => void; variant?: 'danger' | 'secondary' | 'outline' | 'primary' | 'inverse'; loading?: boolean };

export function CenterModal({
  visible,
  onClose,
  title,
  message,
  icon,
  iconTone = 'neutral',
  actions,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  message?: string;
  icon?: IconName;
  iconTone?: Tone;
  actions: ModalAction[];
  children?: ReactNode;
}) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const tint = toneColor(iconTone, colors);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      <View style={styles.modalRoot}>
        <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay }]} onPress={onClose} accessibilityLabel="Kapat" />
        <View style={[styles.modalCard, { backgroundColor: colors.card, width: Math.min(360, width - 40) }]}>
          {icon ? (
            <View style={[styles.modalIcon, { backgroundColor: withAlpha(tint, 0.14) }]}>
              <Icon name={icon} size={26} color={tint} />
            </View>
          ) : null}
          <Text variant="title3" align="center">
            {title}
          </Text>
          {message ? (
            <Text variant="callout" color="textSecondary" align="center" style={styles.modalMessage}>
              {message}
            </Text>
          ) : null}
          {children}
          <View style={styles.modalActions}>
            {actions.map((a) => (
              <Button key={a.label} title={a.label} variant={a.variant ?? 'secondary'} loading={a.loading} onPress={a.onPress} fullWidth />
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Kargo ilerleme çubuğu ──────────────────────────────────────────────────

const STEP_FRACTION = [0.14, 0.45, 0.75, 1];

export function OrderProgress({ status }: { status: OrderStatus }) {
  const { colors } = useTheme();
  const idx = orderStepIndex(status);
  const delivered = status === 'delivered';
  const target = idx < 0 ? 0 : STEP_FRACTION[idx];
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.set(withTiming(target, { duration: 700, easing: Easing.out(Easing.cubic) }));
  }, [progress, target]);
  const fillStyle = useAnimatedStyle(() => ({ width: `${progress.get() * 100}%` }));
  return (
    <View style={styles.progressWrap}>
      <View style={[styles.track, { backgroundColor: colors.surfaceAlt }]}>
        <Animated.View style={[styles.fill, fillStyle]}>
          {delivered ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.success }]} />
          ) : (
            <LinearGradient colors={[colors.primary, colors.warning]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
          )}
        </Animated.View>
      </View>
      <View style={styles.steps}>
        {ORDER_STEPS.map((label, i) => {
          const done = idx >= i;
          const current = idx === i;
          return (
            <View key={label} style={[styles.step, i === 0 ? styles.stepFirst : i === ORDER_STEPS.length - 1 ? styles.stepLast : null]}>
              <View
                style={[
                  styles.stepDot,
                  {
                    backgroundColor: done ? (delivered ? colors.success : current ? colors.warning : colors.primary) : colors.surfaceAlt,
                    borderColor: colors.card,
                  },
                ]}>
                {done && !current ? <Icon name="checkmark" size={9} color={delivered ? '#FFFFFF' : colors.onPrimary} /> : null}
              </View>
              <Text
                variant="caption"
                weight={current ? '800' : '600'}
                color={done ? 'text' : 'textTertiary'}
                numberOfLines={2}
                align={i === 0 ? 'left' : i === ORDER_STEPS.length - 1 ? 'right' : 'center'}>
                {label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ─── Filtre çipleri (yatay kaydırmalı) ──────────────────────────────────────

export function FilterChips<K extends string>({ options, value, onChange }: { options: { key: K; label: string; count?: number }[]; value: K; onChange: (k: K) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow} style={styles.chipsScroll}>
      {options.map((o) => (
        <Chip key={o.key} label={o.label} count={o.count ? String(o.count) : undefined} selected={o.key === value} onPress={() => onChange(o.key)} />
      ))}
    </ScrollView>
  );
}

/** Liste üstündeki bilgilendirme kutusu */
export function InfoBanner({ icon, text, tone = 'neutral', style }: { icon: IconName; text: string; tone?: Tone; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  const c = toneColor(tone, colors);
  return (
    <View style={[styles.banner, { backgroundColor: tone === 'neutral' ? colors.surface : withAlpha(c, 0.1) }, style]}>
      <Icon name={icon} size={18} color={tone === 'neutral' ? colors.textSecondary : c} />
      <Text variant="footnote" color={tone === 'neutral' ? 'textSecondary' : 'text'} style={styles.flexShrink}>
        {text}
      </Text>
    </View>
  );
}

// ─── Çizgili bilgi satırı ("Sipariş bilgileri") ─────────────────────────────

export function InfoRow({ label, value, striped, onPress, accent, right }: { label: string; value: string; striped?: boolean; onPress?: () => void; accent?: boolean; right?: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.infoRow, { backgroundColor: striped ? colors.surface : 'transparent' }]}>
      <Text variant="subhead" color="textSecondary" style={styles.infoLabel}>
        {label}
      </Text>
      <View style={styles.infoValue}>
        <Text
          variant="subhead"
          weight="600"
          color={accent ? 'accent' : 'text'}
          numberOfLines={2}
          align="right"
          onPress={onPress}
          suppressHighlighting
          style={styles.flexShrink}>
          {value}
        </Text>
        {right}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flexShrink: { flexShrink: 1 },
  chip: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 5, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3, maxWidth: '100%' },
  chipDot: { width: 6, height: 6, borderRadius: 3 },
  card: { flexDirection: 'row', gap: 12, paddingHorizontal: SCREEN_PADDING, paddingVertical: 12 },
  thumb: { width: 84, height: 84, borderRadius: radius.sm, overflow: 'hidden' },
  qty: { position: 'absolute', right: 4, bottom: 4, borderRadius: 6, paddingHorizontal: 5, paddingVertical: 1 },
  cardBody: { flex: 1, gap: 3 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2, minHeight: 34 },
  reviewBtn: { marginLeft: 'auto' },
  iconRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: SCREEN_PADDING, paddingVertical: 12, minHeight: 64 },
  iconCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  iconRowTexts: { flex: 1, gap: 2 },
  modalRoot: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  modalCard: { borderRadius: radius.lg, padding: 20, alignItems: 'stretch', gap: 8 },
  modalIcon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 4 },
  modalMessage: { marginBottom: 4 },
  modalActions: { gap: 8, marginTop: 10 },
  progressWrap: { gap: 10, marginTop: 16, marginBottom: 4 },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3, overflow: 'hidden' },
  steps: { flexDirection: 'row', gap: 4 },
  step: { flex: 1, alignItems: 'center', gap: 5 },
  stepFirst: { alignItems: 'flex-start' },
  stepLast: { alignItems: 'flex-end' },
  stepDot: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  chipsScroll: { flexGrow: 0 },
  chipsRow: { paddingHorizontal: SCREEN_PADDING, paddingVertical: 10, gap: 8 },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 10 },
  infoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingHorizontal: 12, paddingVertical: 11, borderRadius: radius.sm },
  infoLabel: { flexShrink: 0 },
  infoValue: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 6 },
});
