/**
 * Ödeme başarılı ekranı: büyük onay animasyonu + sipariş özeti.
 */
import { Image } from 'expo-image';
import { useEffect } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { Easing, FadeInDown, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withSpring, withTiming, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Icon, Text, type IconName } from '@/components/ui';
import { formatTRY } from '@/lib/format';
import { radius, SCREEN_PADDING, useTheme } from '@/theme';
import type { Order, PaymentMethod } from '@/types';

import { CardBrandMark } from './components';

const CONFETTI = ['🎉', '✨', '🛍️', '❤️', '🎊', '⭐️'];

export function OrderSuccess({
  order,
  payment,
  deliveryLabel,
  points,
  installmentLabel,
  sellerName,
  onViewOrder,
  onContinue,
}: {
  order: Order;
  payment?: PaymentMethod;
  deliveryLabel: string;
  points: number;
  installmentLabel?: string;
  sellerName?: string;
  onViewOrder: () => void;
  onContinue: () => void;
}) {
  const { colors, isDark } = useTheme();
  const onSuccessColor = isDark ? colors.text : colors.onInverse;
  const insets = useSafeAreaInsets();
  const ring = useSharedValue(0);
  const check = useSharedValue(0);

  useEffect(() => {
    check.set(withDelay(120, withSpring(1, { damping: 11, stiffness: 160 })));
    ring.set(withRepeat(withSequence(withTiming(1, { duration: 1400, easing: Easing.out(Easing.quad) }), withTiming(0, { duration: 0 })), 3, false));
  }, [check, ring]);

  const ringStyle = useAnimatedStyle(() => ({ opacity: 0.45 * (1 - ring.get()), transform: [{ scale: 1 + ring.get() * 0.7 }] }));
  const checkStyle = useAnimatedStyle(() => ({ transform: [{ scale: check.get() }] }));

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.confetti} pointerEvents="none">
            {CONFETTI.map((e, i) => (
              <Animated.Text key={e} entering={ZoomIn.delay(250 + i * 70).springify()} style={[styles.confettiItem, { left: `${8 + i * 16}%`, top: i % 2 ? 6 : 34 }]}>
                {e}
              </Animated.Text>
            ))}
          </View>
          <View style={styles.badgeWrap}>
            <Animated.View style={[styles.ring, { backgroundColor: colors.success }, ringStyle]} />
            <Animated.View style={[styles.badge, { backgroundColor: colors.success }, checkStyle]}>
              <Icon name="checkmark" size={58} color={onSuccessColor} />
            </Animated.View>
          </View>
          <Animated.View entering={FadeInDown.delay(250).duration(350)} style={styles.titles}>
            <Text variant="title1" align="center">
              Siparişin alındı!
            </Text>
            <Text variant="callout" color="textSecondary" align="center">
              {sellerName ? `@${sellerName} siparişini hazırlamaya başlıyor. ` : ''}Kargoya verildiğinde sana bildirim göndereceğiz.
            </Text>
          </Animated.View>
        </View>

        <Animated.View entering={FadeInDown.delay(380).duration(350)} style={[styles.card, { backgroundColor: colors.surface }]}>
          <View style={styles.productRow}>
            <Image source={{ uri: order.productImage }} style={[styles.thumb, { backgroundColor: colors.skeleton }]} contentFit="cover" cachePolicy="memory-disk" />
            <View style={styles.flexGap}>
              <Text variant="subhead" weight="700" numberOfLines={2}>
                {order.productTitle}
              </Text>
              <Text variant="footnote" color="textSecondary">
                {order.quantity > 1 ? `${order.quantity} adet · ` : ''}
                {formatTRY(order.total, { cents: !Number.isInteger(order.total) })}
              </Text>
            </View>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <Line icon="receipt-outline" label="Sipariş no" value={order.number} />
          <Line icon="cube-outline" label="Tahmini teslimat" value={deliveryLabel} />
          {payment ? (
            <View style={styles.line}>
              <Icon name="card-outline" size={18} color="textSecondary" />
              <Text variant="subhead" color="textSecondary" style={styles.flex}>
                Ödeme
              </Text>
              <CardBrandMark brand={payment.brand} size="sm" />
              <Text variant="subhead" weight="700">
                •••• {payment.last4}
                {installmentLabel ? ` · ${installmentLabel}` : ''}
              </Text>
            </View>
          ) : null}
          {order.shippingCost === 0 ? <Line icon="layers-outline" label="Kargo" value="Aynı pakette · ₺0" /> : null}
        </Animated.View>

        {points > 0 ? (
          <Animated.View entering={FadeInDown.delay(500).duration(350)} style={[styles.points, { backgroundColor: colors.primary }]}>
            <Icon name="gift" size={20} color={colors.onPrimary} />
            <Text variant="callout" weight="700" color={colors.onPrimary} style={styles.flex}>
              +{points} puan kazandın! Ödüller sayfasında harca.
            </Text>
          </Animated.View>
        ) : null}
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12), borderTopColor: colors.border }]}>
        <Button title="Siparişi Görüntüle" size="lg" fullWidth onPress={onViewOrder} />
        <Button title="Alışverişe Devam" variant="ghost" size="lg" fullWidth onPress={onContinue} />
      </View>
    </View>
  );
}

function Line({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  return (
    <View style={styles.line}>
      <Icon name={icon} size={18} color="textSecondary" />
      <Text variant="subhead" color="textSecondary" style={styles.flex}>
        {label}
      </Text>
      <Text variant="subhead" weight="700" numberOfLines={1} style={styles.lineValue}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  flexGap: { flex: 1, gap: 3 },
  content: { paddingHorizontal: SCREEN_PADDING, paddingBottom: 24, gap: 16 },
  hero: { alignItems: 'center', paddingTop: 28, gap: 18 },
  confetti: { position: 'absolute', left: 0, right: 0, top: 0, height: 90 },
  confettiItem: { position: 'absolute', fontSize: 22 },
  badgeWrap: { width: 132, height: 132, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  ring: { position: 'absolute', width: 112, height: 112, borderRadius: 56 },
  badge: { width: 104, height: 104, borderRadius: 52, alignItems: 'center', justifyContent: 'center' },
  titles: { gap: 6, paddingHorizontal: 12 },
  card: { borderRadius: radius.lg, padding: 14, gap: 10 },
  productRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  thumb: { width: 56, height: 56, borderRadius: radius.sm },
  divider: { height: StyleSheet.hairlineWidth },
  line: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  lineValue: { maxWidth: '60%' },
  points: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: radius.lg },
  footer: { paddingHorizontal: SCREEN_PADDING, paddingTop: 12, gap: 4, borderTopWidth: StyleSheet.hairlineWidth },
});
