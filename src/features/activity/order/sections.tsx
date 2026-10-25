/**
 * Sipariş detayı bölümleri (Whatnot S61/S62): durum kartı, kargo hareketleri, ödeme özeti,
 * Alıcı Koruması kartı ve satıcı kartı.
 */
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { StyleSheet, View } from 'react-native';

import { FollowButton } from '@/components/cards/UserRow';
import { Avatar, Button, Divider, Icon, IconButton, PressableScale, Stars, Text, toast } from '@/components/ui';
import { formatCompact, formatDateTime, formatRating, formatTRY } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { radius, SCREEN_PADDING, useTheme } from '@/theme';
import type { Address, Order, OrderEvent, OrderStatus, PaymentMethod, User } from '@/types';

import { OrderProgress } from '../components';
import type { HelpRequest, SubmittedReview } from '../store';
import { carrierTrackingUrl, eventAt, estimatedDelivery, longDay, paymentLabel, protectionLabel, withAlpha, type ProtectionInfo } from '../utils';

export async function copyText(text: string, message = 'Kopyalandı') {
  try {
    await Clipboard.setStringAsync(text);
    haptic.success();
    toast.success(message, 'copy');
  } catch {
    toast.error('Kopyalanamadı');
  }
}

export async function openTracking(order: Order, tint: { bg: string; fg: string }) {
  try {
    haptic.light();
    await WebBrowser.openBrowserAsync(carrierTrackingUrl(order.carrier, order.trackingNumber), { controlsColor: tint.fg, toolbarColor: tint.bg, dismissButtonStyle: 'close' });
  } catch {
    toast.error('Kargo sayfası açılamadı');
  }
}

function shipText(seller: User | undefined): string {
  const d = seller?.avgShipDays ?? 1;
  if (d < 1) return 'aynı gün';
  return `${Math.max(1, Math.round(d))} iş günü içinde`;
}

function place(address: Address | undefined): string {
  return address ? `${address.district}/${address.city}` : 'teslimat';
}

// ─── Durum kartı ─────────────────────────────────────────────────────────────

export function statusCopy(order: Order, ctx: { seller?: User; address?: Address; help?: HelpRequest; cancelReason?: string }): { title: string; subtitle: string; body: string } {
  const sellerName = ctx.seller ? `@${ctx.seller.username}` : 'Satıcı';
  switch (order.status) {
    case 'paid':
    case 'preparing':
      return {
        title: order.status === 'paid' ? 'Sipariş alındı' : 'Paket hazırlanıyor',
        subtitle: `Genelde ${shipText(ctx.seller)} kargolanır`,
        body: `${sellerName} paketini hazırlıyor ve genelde ${shipText(ctx.seller)} kargoya verir. Paket kargoya verildiğinde takip bilgileri burada görünecek.`,
      };
    case 'shipped':
      return {
        title: 'Kargoda',
        subtitle: `Tahmini teslimat: ${longDay(estimatedDelivery(order))}`,
        body: `Paketin ${order.carrier ?? 'kargo'} ile yolda. ${place(ctx.address)} adresine ${longDay(estimatedDelivery(order))} tarihinde teslim edilmesi bekleniyor.`,
      };
    case 'out_for_delivery':
      return {
        title: 'Dağıtıma çıktı',
        subtitle: 'Bugün teslim edilecek',
        body: `Kurye paketini bugün ${place(ctx.address)} adresine getirecek. Evde olamayacaksan ${order.carrier ?? 'kargo'} şubesinden teslim alabilirsin.`,
      };
    case 'delivered': {
      const at = eventAt(order, 'delivered');
      return {
        title: order.reviewed ? 'Teslim edildi' : 'Değerlendirme bekliyor',
        subtitle: 'Siparişin ulaştı 🎉',
        body: `Ürünün ${at ? formatDateTime(at) : 'yakın zamanda'} tarihinde ${place(ctx.address)} adresine teslim edildi.`,
      };
    }
    case 'cancelled':
      return {
        title: 'Sipariş iptal edildi',
        subtitle: 'İaden başlatıldı',
        body: `${ctx.cancelReason ? `İptal nedeni: ${ctx.cancelReason}. ` : ''}Ödemenin tamamı kartına iade edildi; bankana bağlı olarak 2–10 iş günü içinde hesabına yansır.`,
      };
    case 'return_requested':
      return {
        title: ctx.help?.issue === 'withdrawal' ? 'Cayma talebi alındı' : 'Destek talebi açık',
        subtitle: 'Satıcı yanıtı bekleniyor',
        body:
          ctx.help?.issue === 'withdrawal'
            ? 'İade kargo kodun hazırlanıyor. Ürünü 10 gün içinde kargoya verdiğinde, satıcı teslim aldıktan sonra ödemen iade edilir.'
            : 'Talebin satıcıya iletildi. Satıcı 48 saat içinde yanıt verecek; gelişmeleri Gelen Kutusu’nda görebilirsin.',
      };
    case 'refunded':
      return { title: 'İade edildi', subtitle: 'Ödemen iade edildi', body: 'İade tamamlandı. Tutar ödeme yaptığın karta aktarıldı.' };
  }
}

export function StatusCard({
  order,
  copy,
  review,
  canReview,
  onReview,
  onViewRequest,
}: {
  order: Order;
  copy: { title: string; subtitle: string; body: string };
  review?: SubmittedReview;
  canReview: boolean;
  onReview: () => void;
  onViewRequest?: () => void;
}) {
  const { colors } = useTheme();
  const closed = order.status === 'cancelled' || order.status === 'refunded' || order.status === 'return_requested';
  const hasTracking = !!order.carrier && !!order.trackingNumber;
  return (
    <View style={[styles.statusCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
      {closed ? (
        <View style={[styles.closedIcon, { backgroundColor: withAlpha(order.status === 'return_requested' ? colors.warning : colors.danger, 0.14) }]}>
          <Icon
            name={order.status === 'return_requested' ? 'hourglass-outline' : 'close-circle-outline'}
            size={22}
            color={order.status === 'return_requested' ? colors.warning : colors.danger}
          />
        </View>
      ) : null}
      <Text variant="title2">{copy.title}</Text>
      <Text variant="headline" color="textSecondary" style={styles.statusSub}>
        {copy.subtitle}
      </Text>
      {!closed ? <OrderProgress status={order.status} /> : null}
      <Text variant="callout" color="textSecondary" style={styles.statusBody}>
        {copy.body}
      </Text>

      {hasTracking && !closed ? (
        <View style={[styles.trackBox, { backgroundColor: colors.surface }]}>
          <View style={[styles.truck, { backgroundColor: colors.card }]}>
            <Icon name="cube-outline" size={20} />
          </View>
          <View style={styles.flex}>
            <Text variant="subhead" weight="700">
              {order.carrier}
            </Text>
            <Text variant="footnote" color="textSecondary" tabular numberOfLines={1}>
              Takip no: {order.trackingNumber}
            </Text>
          </View>
          <IconButton name="copy-outline" size={36} onPress={() => copyText(order.trackingNumber ?? '')} accessibilityLabel="Takip numarasını kopyala" />
        </View>
      ) : null}
      {hasTracking && !closed && order.status !== 'delivered' ? (
        <Button
          title="Kargoyu takip et"
          iconRight="open-outline"
          variant="secondary"
          fullWidth
          style={styles.mt12}
          onPress={() => openTracking(order, { bg: colors.bg, fg: colors.text })}
        />
      ) : null}

      {canReview ? (
        <View style={styles.reviewBlock}>
          <Button title="Değerlendir" variant="inverse" icon="star" fullWidth onPress={onReview} />
          <Text variant="footnote" color="textSecondary" align="center">
            Geri bildirimin tüm alıcılar için güvenli ve kaliteli bir deneyim sağlamamıza yardımcı olur.
          </Text>
        </View>
      ) : null}
      {review ? (
        <View style={[styles.myReview, { backgroundColor: colors.surface }]}>
          <View style={styles.rowCenter}>
            <Text variant="subhead" weight="700">
              Değerlendirmen
            </Text>
            <Stars rating={review.rating} size={14} color={colors.accent} />
          </View>
          {review.comment ? (
            <Text variant="footnote" color="textSecondary" numberOfLines={3}>
              “{review.comment}”
            </Text>
          ) : null}
        </View>
      ) : null}
      {order.status === 'return_requested' && onViewRequest ? <Button title="Talebi görüntüle" variant="secondary" fullWidth style={styles.mt12} onPress={onViewRequest} /> : null}

      <Text variant="footnote" color="textTertiary" style={styles.placed}>
        Sipariş tarihi: {formatDateTime(order.createdAt)}
      </Text>
    </View>
  );
}

// ─── Kargo hareketleri ───────────────────────────────────────────────────────

function eventTitle(e: OrderEvent, order: Order): string {
  const labels: Record<OrderStatus, string> = {
    paid: 'Ödeme alındı, sipariş satıcıya iletildi',
    preparing: 'Satıcı paketi hazırlıyor',
    shipped: `${order.carrier ?? 'Kargo'} şubesine teslim edildi`,
    out_for_delivery: 'Kurye dağıtıma çıktı',
    delivered: 'Teslim edildi',
    cancelled: 'Sipariş iptal edildi',
    return_requested: 'Destek / iade talebi oluşturuldu',
    refunded: 'İade tamamlandı',
  };
  return labels[e.status];
}

type TimelineItem = { key: string; title: string; note?: string; at: string };

export function buildTimeline(order: Order, address?: Address): TimelineItem[] {
  const items: TimelineItem[] = order.timeline.map((e, i) => ({ key: `${e.status}_${i}`, title: eventTitle(e, order), note: e.note, at: e.at }));
  // Kargoya verildi ile dağıtım arasına transfer merkezi adımı ekle (Türkiye kargo akışı)
  const shipped = eventAt(order, 'shipped');
  const next = eventAt(order, 'out_for_delivery') ?? eventAt(order, 'delivered');
  if (shipped && next) {
    const mid = new Date((Date.parse(shipped) + Date.parse(next)) / 2).toISOString();
    items.push({ key: 'transfer', title: `${address?.city ?? 'Bölge'} transfer merkezinde`, note: 'Paket dağıtım şubesine yönlendirildi', at: mid });
  }
  return items.sort((a, b) => b.at.localeCompare(a.at));
}

export function Timeline({ items }: { items: TimelineItem[] }) {
  const { colors } = useTheme();
  return (
    <View style={styles.timeline}>
      {items.map((it, i) => {
        const first = i === 0;
        const last = i === items.length - 1;
        return (
          <View key={it.key} style={styles.tlRow}>
            <View style={styles.tlRail}>
              <View style={[styles.tlDot, { backgroundColor: first ? colors.text : colors.surfaceAlt, borderColor: first ? withAlpha(colors.text, 0.15) : 'transparent' }]} />
              {!last ? <View style={[styles.tlLine, { backgroundColor: colors.border }]} /> : null}
            </View>
            <View style={styles.tlBody}>
              <Text variant="subhead" weight={first ? '700' : '600'} color={first ? 'text' : 'textSecondary'}>
                {it.title}
              </Text>
              {it.note ? (
                <Text variant="footnote" color="textSecondary">
                  {it.note}
                </Text>
              ) : null}
              <Text variant="caption" color="textTertiary">
                {formatDateTime(it.at)}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

// ─── Ödeme özeti (makbuz) ────────────────────────────────────────────────────

export function Receipt({ order, payment }: { order: Order; payment?: PaymentMethod }) {
  const { colors } = useTheme();
  const unit = order.quantity > 1 ? order.itemPrice / order.quantity : 0;
  const shipping = order.shippingCost > 0 ? formatTRY(order.shippingCost, { cents: true }) : order.showId ? 'Aynı pakete eklendi' : 'Ücretsiz';
  const refunded = order.status === 'cancelled' || order.status === 'refunded';
  return (
    <View style={styles.receipt}>
      <ReceiptLine label={order.quantity > 1 ? `Ürün tutarı (${order.quantity} × ${formatTRY(unit)})` : 'Ürün tutarı'} value={order.itemPrice > 0 ? formatTRY(order.itemPrice, { cents: true }) : 'Ücretsiz'} />
      <ReceiptLine label="Kargo" value={shipping} valueColor={order.shippingCost > 0 ? undefined : colors.success} />
      <ReceiptLine label="Alıcı Koruması" value={formatTRY(order.serviceFee, { cents: true })} />
      {order.creditUsed > 0 ? <ReceiptLine label="Mezat Kredisi" value={`-${formatTRY(order.creditUsed, { cents: true })}`} valueColor={colors.success} /> : null}
      <Divider style={styles.receiptDivider} />
      <View style={styles.receiptLine}>
        <Text variant="headline">Toplam</Text>
        <Text variant="headline" weight="800" tabular>
          {formatTRY(order.total, { cents: true })}
        </Text>
      </View>
      {refunded ? <ReceiptLine label="İade edilen tutar" value={formatTRY(order.total, { cents: true })} valueColor={colors.success} /> : null}
      <Text variant="caption" color="textTertiary">
        Tüm fiyatlara KDV dahildir.
      </Text>
      <View style={[styles.payRow, { backgroundColor: colors.surface }]}>
        <Icon name="card-outline" size={20} />
        <View style={styles.flex}>
          <Text variant="subhead" weight="600">
            {order.total <= 0 && order.creditUsed > 0 ? 'Mezat Kredisi ile ödendi' : paymentLabel(payment)}
          </Text>
          {payment ? (
            <Text variant="caption" color="textSecondary">
              {payment.bank} · Tek çekim
            </Text>
          ) : null}
        </View>
        <Icon name="lock-closed" size={14} color="textTertiary" />
      </View>
    </View>
  );
}

function ReceiptLine({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <View style={styles.receiptLine}>
      <Text variant="callout" color="textSecondary" style={styles.flexShrink}>
        {label}
      </Text>
      <Text variant="callout" weight="600" color={valueColor ?? 'text'} tabular>
        {value}
      </Text>
    </View>
  );
}

// ─── Alıcı Koruması kartı ────────────────────────────────────────────────────

export function ProtectionCard({ info, onPress }: { info: ProtectionInfo; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <PressableScale scaleTo={0.985} onPress={onPress} style={[styles.protect, { backgroundColor: colors.surface }]} accessibilityRole="button" accessibilityLabel="Mezat Alıcı Garantisi">
      <View style={[styles.shield, { backgroundColor: colors.primary }]}>
        <Icon name="shield-checkmark" size={22} color={colors.onPrimary} />
      </View>
      <View style={styles.flex}>
        <Text variant="headline">Mezat Alıcı Garantisi</Text>
        <Text variant="footnote" color="textSecondary">
          Ürünün zamanında ve açıklandığı gibi gelmezse paranı iade ediyoruz.
        </Text>
        <Text variant="footnote" weight="700" color={info.active ? 'success' : 'textTertiary'} style={styles.protectLabel}>
          {protectionLabel(info)}
        </Text>
      </View>
      <Icon name="chevron-forward" size={18} color="textTertiary" />
    </PressableScale>
  );
}

// ─── Satıcı kartı ───────────────────────────────────────────────────────────

export function SellerCard({ seller, onMessage }: { seller: User; onMessage: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.sellerCard, { borderColor: colors.border }]}>
      <PressableScale scaleTo={0.99} onPress={() => router.push(`/user/${seller.username}`)} style={styles.sellerHead}>
        <Avatar uri={seller.avatar} name={seller.username} size={48} verified={seller.badges.includes('verified')} />
        <View style={styles.flex}>
          <Text variant="headline" numberOfLines={1}>
            {seller.username}
          </Text>
          <Text variant="footnote" color="textSecondary" numberOfLines={1}>
            ★ {formatRating(seller.rating)} · {formatCompact(seller.itemsSold)} satış · {seller.city}
          </Text>
        </View>
        <FollowButton user={seller} />
      </PressableScale>
      <View style={styles.sellerActions}>
        <Button title="Profili gör" size="sm" variant="secondary" style={styles.flex} onPress={() => router.push(`/user/${seller.username}`)} />
        <Button title="Mesaj gönder" size="sm" variant="secondary" icon="chatbubble-outline" style={styles.flex} onPress={onMessage} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  flexShrink: { flexShrink: 1 },
  rowCenter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  mt12: { marginTop: 12 },
  statusCard: { marginHorizontal: SCREEN_PADDING, borderWidth: StyleSheet.hairlineWidth * 2, borderRadius: radius.lg, padding: 20 },
  closedIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  statusSub: { marginTop: 2 },
  statusBody: { marginTop: 12 },
  trackBox: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: radius.md, padding: 10, marginTop: 14 },
  truck: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  reviewBlock: { gap: 8, marginTop: 16 },
  myReview: { borderRadius: radius.md, padding: 12, gap: 4, marginTop: 14 },
  placed: { marginTop: 14 },
  timeline: { paddingHorizontal: SCREEN_PADDING },
  tlRow: { flexDirection: 'row', gap: 12 },
  tlRail: { width: 16, alignItems: 'center' },
  tlDot: { width: 14, height: 14, borderRadius: 7, borderWidth: 3, marginTop: 3 },
  tlLine: { width: 2, flex: 1, marginVertical: 2 },
  tlBody: { flex: 1, gap: 2, paddingBottom: 16 },
  receipt: { paddingHorizontal: SCREEN_PADDING, gap: 10 },
  receiptLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  receiptDivider: { marginVertical: 2 },
  payRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: radius.md, padding: 12, marginTop: 4 },
  protect: { marginHorizontal: SCREEN_PADDING, flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: radius.lg, padding: 14 },
  shield: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  protectLabel: { marginTop: 4 },
  sellerCard: { marginHorizontal: SCREEN_PADDING, borderWidth: StyleSheet.hairlineWidth * 2, borderRadius: radius.lg, padding: 14, gap: 12 },
  sellerHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sellerActions: { flexDirection: 'row', gap: 8 },
});
