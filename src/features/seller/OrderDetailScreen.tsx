/**
 * Satıcı sipariş detayı: durum, ürün, alıcı, teslimat adresi, kargo kodu (firma seçimi, barkod,
 * paket içerik fişi, "Kargoya verdim"), kazanç dökümü, zaman çizelgesi ve iptal.
 */
import * as Clipboard from 'expo-clipboard';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Platform, ScrollView, Share, StyleSheet, View } from 'react-native';

import { Avatar, Button, Chip, EmptyState, Header, Icon, IconButton, Screen, Sheet, Text, TextField, toast, type IconName } from '@/components/ui';
import { formatDate, formatDateTime, formatShowTime, formatTRY } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { sellerFees, SHIPPING_PROFILE_LABELS } from '@/lib/pricing';
import { useMe } from '@/store/auth';
import { useInboxStore } from '@/store/inbox';
import { ORDER_SOURCE_LABELS } from '@/store/orders';
import { useSellerStore } from '@/store/seller';
import { ForceScheme, radius, SCREEN_PADDING, useTheme } from '@/theme';
import type { Carrier } from '@/types';

import { cancelSellerOrder, createLabel, shipOrder, useNow } from './actions';
import { buyerAddress, deadlineInfo, inLaunchCampaign, orderBucket, resolveBuyer, SELLER_ORDER_STATUS, SHIP_CARRIERS } from './logic';
import { useSellerExtras } from './store';
import { ActionSheet, Barcode, Card, KeyValue, StatusPill, StickyFooter, Thumb, tint } from './ui';

const MONO = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });

const CANCEL_REASONS = ['Ürün stokta kalmadı', 'Ürün hasarlı / kusurlu çıktı', 'Alıcı iptal talep etti', 'Yanlış fiyat ya da listeleme', 'Alıcıyla anlaştık', 'Diğer'];

const EVENT_LABELS: Record<string, string> = {
  paid: 'Ödeme alındı',
  preparing: 'Hazırlanıyor',
  label: 'Kargo kodu oluşturuldu',
  shipped: 'Kargoya verildi',
  out_for_delivery: 'Dağıtıma çıktı',
  delivered: 'Teslim edildi',
  cancelled: 'İptal edildi',
  return_requested: 'İade talebi',
  refunded: 'İade edildi',
};

export function OrderDetailScreen() {
  const { colors } = useTheme();
  const me = useMe();
  const now = useNow(30_000);
  const { id } = useLocalSearchParams<{ id: string }>();
  const order = useSellerStore((s) => s.orders.find((o) => o.id === id));
  const listings = useSellerStore((s) => s.listings);
  const shows = useSellerStore((s) => s.shows);
  const label = useSellerExtras((s) => (id ? s.labels[id] : undefined));
  const defaultCarrier = useSellerExtras((s) => s.shipping.carrier);
  const kyc = useSellerExtras((s) => s.kyc);
  const approvedAt = useSellerExtras((s) => s.approvedAt);
  const cancelReason = useSellerExtras((s) => (id ? s.cancelReasons[id] : undefined));
  const [carrier, setCarrier] = useState<Carrier>(label?.carrier ?? defaultCarrier);
  const [changing, setChanging] = useState(false);
  const [busy, setBusy] = useState<'label' | 'ship' | null>(null);
  const [menu, setMenu] = useState(false);
  const [slip, setSlip] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState(CANCEL_REASONS[0]);
  const [note, setNote] = useState('');

  if (!order) {
    return (
      <Screen>
        <Header title="Sipariş" />
        <EmptyState icon="receipt-outline" title="Sipariş bulunamadı" message="Bu sipariş kaldırılmış olabilir." actionLabel="Siparişlere dön" onAction={() => router.back()} />
      </Screen>
    );
  }

  const buyer = resolveBuyer(order.buyerId);
  const address = buyerAddress(buyer);
  const bucket = orderBucket(order);
  const gross = order.itemPrice * order.quantity;
  const fees = sellerFees(gross, order.shippingCost);
  const listing = listings.find((p) => p.id === order.productId);
  const show = order.showId ? shows.find((s) => s.id === order.showId) : undefined;
  const due = bucket === 'toship' ? deadlineInfo(order.createdAt, now) : undefined;
  const campaign = inLaunchCampaign(approvedAt, order.createdAt);
  const sender = kyc?.companyTitle || kyc?.legalName || me.displayName;
  const senderCity = kyc?.returnAddress?.city ? `${kyc.returnAddress.district}/${kyc.returnAddress.city}` : me.city;

  const events = [
    ...order.timeline.map((e) => ({ key: e.status, at: new Date(e.at).getTime(), note: e.note })),
    ...(label ? [{ key: 'label', at: new Date(label.createdAt).getTime(), note: `${label.carrier} · ${label.code}` }] : []),
  ].sort((a, b) => b.at - a.at);

  const banner: { icon: IconName; tone: string; title: string; body: string } =
    bucket === 'toship'
      ? due?.tone === 'late'
        ? { icon: 'alert-circle', tone: colors.danger, title: 'Gönderim süresi geçti', body: 'Bu siparişi hemen kargola. Gecikmeler hesap sağlığını etkiler, alıcı iptal talep edebilir.' }
        : { icon: 'cube', tone: colors.warning, title: label ? 'Paketini şubeye bırak' : 'Kargolanmayı bekliyor', body: `Son gönderim: ${due ? formatShowTime(due.deadline, now) : ''} · ${due?.left ?? ''}` }
      : bucket === 'shipped'
        ? { icon: 'car', tone: colors.info, title: 'Kargoda', body: `${order.carrier ?? 'Kargo'} · Takip no ${order.trackingNumber ?? '—'}. Teslim edilince alıcıya bildirim gider.` }
        : bucket === 'delivered'
          ? { icon: 'checkmark-circle', tone: colors.success, title: 'Teslim edildi', body: 'Kazancın çekilebilir bakiyende. Alıcı 30 gün içinde değerlendirme yapabilir.' }
          : { icon: 'close-circle', tone: colors.textSecondary, title: SELLER_ORDER_STATUS[order.status], body: cancelReason ? `Neden: ${cancelReason}` : 'Bu sipariş için kazanç oluşmadı.' };

  const makeLabel = () => {
    setBusy('label');
    setTimeout(() => {
      createLabel(order.id, carrier);
      setBusy(null);
      setChanging(false);
      haptic.success();
      toast.success(`${carrier} kargo kodun hazır`, 'barcode');
    }, 900);
  };

  const markShipped = () => {
    if (!label) return;
    setBusy('ship');
    setTimeout(() => {
      shipOrder(order.id, label.carrier);
      setBusy(null);
      haptic.success();
      toast.success('Kargoya verildi! Alıcıya bildirim gönderildi 📦');
    }, 700);
  };

  const copy = async (text: string, msg: string) => {
    await Clipboard.setStringAsync(text);
    haptic.light();
    toast.success(msg, 'copy');
  };

  const message = () => {
    const conv = useInboxStore.getState().ensureConversation(buyer.userId ?? buyer.username, order.id);
    router.push(`/inbox/${conv.id}`);
  };

  const slipText = [
    'PAKET İÇERİK FİŞİ — Mezatonline',
    `Sipariş: #${order.number} · ${formatDate(order.createdAt)}`,
    `Gönderen: ${sender} (${senderCity})`,
    `Alıcı: ${address.fullName}, ${address.neighborhood} ${address.line}, ${address.district}/${address.city} ${address.postalCode}`,
    `Ürün: ${order.productTitle} × ${order.quantity}`,
    'Bu siparişi tercih ettiğin için teşekkürler! 💛',
  ].join('\n');

  return (
    <Screen>
      <Header title={`#${order.number}`} subtitle={SELLER_ORDER_STATUS[order.status]} right={<IconButton name="ellipsis-horizontal" onPress={() => setMenu(true)} accessibilityLabel="Diğer seçenekler" />} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.banner, { backgroundColor: tint(banner.tone, 0.12) }]}>
          <Icon name={banner.icon} size={24} color={banner.tone} />
          <View style={{ flex: 1 }}>
            <Text variant="headline" weight="700">
              {banner.title}
            </Text>
            <Text variant="footnote" color="textSecondary">
              {banner.body}
            </Text>
          </View>
        </View>

        <Card style={styles.item}>
          <Thumb uri={order.productImage} size={72} />
          <View style={{ flex: 1, gap: 3 }}>
            <Text variant="headline" weight="700" numberOfLines={2}>
              {order.productTitle}
            </Text>
            <Text variant="footnote" color="textSecondary">
              {ORDER_SOURCE_LABELS[order.source]} · {order.quantity} adet · {formatDateTime(order.createdAt)}
            </Text>
            {show ? (
              <Text variant="footnote" color="textSecondary" numberOfLines={1}>
                📺 {show.title}
              </Text>
            ) : null}
          </View>
          <Text variant="headline" weight="800">
            {formatTRY(gross)}
          </Text>
        </Card>

        <Card style={{ gap: 12 }}>
          <View style={styles.inline}>
            <Avatar uri={buyer.avatar} name={buyer.username} size={44} />
            <View style={{ flex: 1 }}>
              <Text variant="headline" weight="700" numberOfLines={1}>
                @{buyer.username}
              </Text>
              <Text variant="footnote" color="textSecondary" numberOfLines={1}>
                {buyer.displayName} · {buyer.city}
              </Text>
            </View>
            <Button title="Mesaj" size="sm" variant="secondary" icon="chatbubble-outline" onPress={message} />
          </View>
          <View style={[styles.hr, { backgroundColor: colors.border }]} />
          <View style={[styles.inline, { alignItems: 'flex-start' }]}>
            <Icon name="location-outline" size={20} color="textSecondary" />
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="subhead" weight="700">
                Teslimat adresi
              </Text>
              <Text variant="callout">{address.fullName}</Text>
              <Text variant="footnote" color="textSecondary">
                {address.neighborhood} {address.line}
              </Text>
              <Text variant="footnote" color="textSecondary">
                {address.postalCode} {address.district}/{address.city} · {address.phone}
              </Text>
            </View>
            <IconButton
              name="copy-outline"
              size={34}
              onPress={() => copy(`${address.fullName}\n${address.neighborhood} ${address.line}\n${address.postalCode} ${address.district}/${address.city}`, 'Adres kopyalandı')}
              accessibilityLabel="Adresi kopyala"
            />
          </View>
        </Card>

        {bucket === 'toship' ? (
          !label || changing ? (
            <Card style={{ gap: 12 }}>
              <Text variant="headline" weight="700">
                Kargo firması seç
              </Text>
              <View style={styles.wrap}>
                {SHIP_CARRIERS.map((c) => (
                  <Chip key={c} label={c} selected={carrier === c} onPress={() => setCarrier(c)} />
                ))}
              </View>
              <Text variant="footnote" color="textSecondary">
                {listing ? `Paket: ${SHIPPING_PROFILE_LABELS[listing.shippingProfile]}. ` : ''}Kargo ücreti ({formatTRY(order.shippingCost)}) alıcıdan tahsil edildi.
              </Text>
              <Button title={changing ? 'Yeni kod oluştur' : 'Kargo kodu oluştur'} icon="barcode-outline" size="lg" fullWidth loading={busy === 'label'} onPress={makeLabel} />
              {changing ? <Button title="Vazgeç" variant="ghost" onPress={() => setChanging(false)} /> : null}
            </Card>
          ) : (
            <View style={{ gap: 12 }}>
              <ForceScheme scheme="light">
                <LabelCard code={label.code} carrier={label.carrier} to={`${address.fullName} · ${address.district}/${address.city}`} from={`${sender} · ${senderCity}`} onCopy={() => copy(label.code, 'Gönderi kodu kopyalandı')} />
              </ForceScheme>
              <Card style={{ gap: 10 }}>
                {[
                  ['1', 'Ürünü sağlam şekilde paketle, paket içerik fişini kutuya koy.'],
                  ['2', `Paketi en yakın ${label.carrier} şubesine götür.`],
                  ['3', 'Gönderi kodunu göster; etiket şubede basılıp paketine yapıştırılır.'],
                ].map(([n, t]) => (
                  <View key={n} style={[styles.inline, { alignItems: 'flex-start' }]}>
                    <View style={[styles.num, { backgroundColor: colors.inverse }]}>
                      <Text variant="caption" color={colors.onInverse}>
                        {n}
                      </Text>
                    </View>
                    <Text variant="callout" style={{ flex: 1 }}>
                      {t}
                    </Text>
                  </View>
                ))}
                <View style={styles.inline}>
                  <Button title="Paket içerik fişi" size="sm" variant="secondary" onPress={() => setSlip(true)} style={{ flex: 1 }} />
                  <Button title="Firmayı değiştir" size="sm" variant="ghost" onPress={() => setChanging(true)} style={{ flex: 1 }} />
                </View>
              </Card>
            </View>
          )
        ) : null}

        {bucket === 'shipped' || bucket === 'delivered' ? (
          <Card style={{ gap: 6 }}>
            <Text variant="headline" weight="700">
              Kargo takibi
            </Text>
            <KeyValue label="Kargo firması" value={order.carrier ?? '—'} />
            <View style={styles.kvRow}>
              <Text variant="callout" color="textSecondary" style={{ flex: 1 }}>
                Takip no
              </Text>
              <Text variant="callout" weight="700" style={{ fontFamily: MONO }}>
                {order.trackingNumber ?? '—'}
              </Text>
              {order.trackingNumber ? <IconButton name="copy-outline" size={30} onPress={() => copy(order.trackingNumber!, 'Takip numarası kopyalandı')} accessibilityLabel="Takip numarasını kopyala" /> : null}
            </View>
            {label ? <KeyValue label="Gönderi kodu" value={label.code} /> : null}
          </Card>
        ) : null}

        <Card style={{ gap: 2 }}>
          <Text variant="headline" weight="700" style={{ marginBottom: 6 }}>
            Kazanç dökümü
          </Text>
          <KeyValue label="Ürün bedeli" value={formatTRY(gross)} />
          <KeyValue label="Alıcının ödediği kargo" value={formatTRY(order.shippingCost)} hint="Kargo firmasına aktarılır" />
          <KeyValue label="Komisyon (%8)" value={`-${formatTRY(fees.commission)}`} />
          <KeyValue label="İşlem ücreti (%2,9 + ₺3)" value={`-${formatTRY(fees.processing)}`} />
          <View style={[styles.hr, { backgroundColor: colors.border, marginVertical: 6 }]} />
          <KeyValue label="Net kazanç" value={bucket === 'cancelled' ? formatTRY(0) : formatTRY(fees.net)} strong tone={bucket === 'cancelled' ? undefined : 'success'} />
          <StatusPill
            label={bucket === 'cancelled' ? 'Kazanç iptal edildi' : bucket === 'toship' ? 'Bekleyen bakiye — kargolanınca çekilebilir' : 'Çekilebilir bakiyende'}
            tone={bucket === 'cancelled' ? 'neutral' : bucket === 'toship' ? 'warning' : 'success'}
            style={{ marginTop: 6 }}
          />
          {campaign && bucket !== 'cancelled' && fees.commission > 0 ? (
            <View style={[styles.campaign, { backgroundColor: tint(colors.primary, 0.25) }]}>
              <Text variant="footnote" weight="600">
                🎉 Yeni satıcı kampanyası: bu siparişin {formatTRY(fees.commission)} komisyonu 30. günün sonunda bakiyene iade edilir.
              </Text>
            </View>
          ) : null}
          <Text variant="footnote" color="textTertiary" style={{ marginTop: 6 }}>
            Komisyon ve işlem ücretine %20 KDV dahildir. %1 e-ticaret stopajı aylık ekstrende gösterilir.
          </Text>
        </Card>

        <Card style={{ gap: 0 }}>
          <Text variant="headline" weight="700" style={{ marginBottom: 10 }}>
            Sipariş geçmişi
          </Text>
          {events.map((e, i) => (
            <View key={`${e.key}_${e.at}`} style={styles.event}>
              <View style={styles.rail}>
                <View style={[styles.dot, { backgroundColor: i === 0 ? colors.text : colors.textTertiary }]} />
                {i < events.length - 1 ? <View style={[styles.line, { backgroundColor: colors.border }]} /> : null}
              </View>
              <View style={{ flex: 1, paddingBottom: i < events.length - 1 ? 14 : 0 }}>
                <Text variant="subhead" weight={i === 0 ? '700' : '500'}>
                  {EVENT_LABELS[e.key] ?? e.key}
                </Text>
                <Text variant="footnote" color="textSecondary">
                  {formatDateTime(e.at)}
                  {e.note ? ` · ${e.note}` : ''}
                </Text>
              </View>
            </View>
          ))}
        </Card>

        {bucket === 'toship' ? <Button title="Siparişi iptal et" variant="ghost" icon="close-circle-outline" onPress={() => setCancelOpen(true)} style={{ alignSelf: 'center' }} /> : null}
      </ScrollView>

      {bucket === 'toship' && label && !changing ? (
        <StickyFooter>
          <Button title="Kargoya verdim" icon="checkmark-done" size="lg" fullWidth loading={busy === 'ship'} onPress={markShipped} />
        </StickyFooter>
      ) : null}

      <ActionSheet
        visible={menu}
        onClose={() => setMenu(false)}
        title={`Sipariş #${order.number}`}
        actions={[
          { label: 'Alıcıya mesaj gönder', icon: 'chatbubble-outline', onPress: message },
          { label: 'Paket içerik fişi', icon: 'document-text-outline', onPress: () => setSlip(true) },
          { label: 'Satıcı destek', icon: 'help-buoy-outline', onPress: () => router.push('/settings/help') },
          ...(bucket === 'toship' ? [{ label: 'Siparişi iptal et', icon: 'close-circle-outline' as IconName, destructive: true, onPress: () => setCancelOpen(true) }] : []),
        ]}
      />

      <Sheet
        visible={slip}
        onClose={() => setSlip(false)}
        title="Paket içerik fişi"
        subtitle="Paketin içine koy"
        showClose
        footer={<Button title="Paylaş / Yazdır" icon="print-outline" size="lg" fullWidth onPress={() => Share.share({ message: slipText }).catch(() => toast.error('Paylaşılamadı'))} />}>
        <ForceScheme scheme="light">
          <PackingSlip
            number={order.number}
            date={formatDate(order.createdAt)}
            sender={sender}
            senderCity={senderCity}
            to={[address.fullName, `${address.neighborhood} ${address.line}`, `${address.postalCode} ${address.district}/${address.city}`]}
            item={order.productTitle}
            qty={order.quantity}
            code={label?.code}
          />
        </ForceScheme>
      </Sheet>

      <Sheet
        visible={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title="Siparişi iptal et"
        subtitle="Alıcıya tam iade yapılır"
        showClose
        footer={
          <Button
            title="Siparişi iptal et"
            variant="danger"
            size="lg"
            fullWidth
            onPress={() => {
              cancelSellerOrder(order.id, note.trim() ? `${reason} — ${note.trim()}` : reason);
              setCancelOpen(false);
              haptic.warning();
              toast('Sipariş iptal edildi, alıcıya iade yapıldı', 'close-circle');
            }}
          />
        }>
        <View style={{ gap: 4 }}>
          {CANCEL_REASONS.map((r) => (
            <Chip key={r} label={r} selected={reason === r} onPress={() => setReason(r)} style={{ alignSelf: 'flex-start' }} />
          ))}
        </View>
        <TextField label="Alıcıya not (isteğe bağlı)" value={note} onChangeText={(v) => setNote(v.slice(0, 200))} placeholder="Kısa bir açıklama yaz" multiline containerStyle={{ marginTop: 14 }} />
        <View style={[styles.warn, { backgroundColor: tint(colors.warning, 0.12) }]}>
          <Icon name="warning-outline" size={18} color={colors.warning} />
          <Text variant="footnote" color="textSecondary" style={{ flex: 1 }}>
            İlk iptalin ücretsizdir. Sonraki satıcı kaynaklı iptallerde ₺100 ya da sipariş tutarının %3’ü (hangisi yüksekse) kesilir ve iptal oranın hesap sağlığını etkiler.
          </Text>
        </View>
      </Sheet>
    </Screen>
  );
}

function LabelCard({ code, carrier, to, from, onCopy }: { code: string; carrier: Carrier; to: string; from: string; onCopy: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.label, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.labelHead, { borderBottomColor: colors.border }]}>
        <Icon name="cube" size={20} color={colors.text} />
        <Text variant="headline" weight="800" style={{ flex: 1 }}>
          {carrier}
        </Text>
        <Text variant="caption" color="textSecondary">
          ŞUBEYE TESLİM
        </Text>
      </View>
      <Text variant="caption" color="textSecondary" align="center" style={{ marginTop: 14 }}>
        GÖNDERİ KODU
      </Text>
      <Text style={{ fontFamily: MONO, fontSize: 28, lineHeight: 36, fontWeight: '800', letterSpacing: 2 }} color={colors.text} align="center" selectable>
        {code}
      </Text>
      <View style={{ paddingHorizontal: 16, marginTop: 8 }}>
        <Barcode value={code} height={58} />
      </View>
      <Text variant="caption" color="textSecondary" align="center" style={{ fontFamily: MONO, marginTop: 4 }}>
        {code.replace(/-/g, ' ')}
      </Text>
      <View style={[styles.labelFoot, { borderTopColor: colors.border }]}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="caption" color="textSecondary">
            ALICI
          </Text>
          <Text variant="footnote" weight="700" numberOfLines={2}>
            {to}
          </Text>
          <Text variant="caption" color="textSecondary" style={{ marginTop: 4 }}>
            GÖNDEREN
          </Text>
          <Text variant="footnote" numberOfLines={1}>
            {from}
          </Text>
        </View>
        <Button title="Kopyala" size="sm" variant="secondary" icon="copy-outline" onPress={onCopy} />
      </View>
    </View>
  );
}

function PackingSlip({ number, date, sender, senderCity, to, item, qty, code }: { number: string; date: string; sender: string; senderCity: string; to: string[]; item: string; qty: number; code?: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.slip, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.slipHead}>
        <Text variant="headline" weight="800">
          PAKET İÇERİK FİŞİ
        </Text>
        <Text variant="footnote" weight="800">
          mezatonline
        </Text>
      </View>
      <View style={[styles.hr, { backgroundColor: colors.text, marginVertical: 8 }]} />
      <KeyValue label="Sipariş no" value={`#${number}`} />
      <KeyValue label="Sipariş tarihi" value={date} />
      {code ? <KeyValue label="Gönderi kodu" value={code} /> : null}
      <View style={{ flexDirection: 'row', gap: 12, marginTop: 10 }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="caption" color="textSecondary">
            GÖNDEREN
          </Text>
          <Text variant="footnote" weight="700">
            {sender}
          </Text>
          <Text variant="footnote" color="textSecondary">
            {senderCity}
          </Text>
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="caption" color="textSecondary">
            ALICI
          </Text>
          {to.map((l, i) => (
            <Text key={l} variant="footnote" weight={i === 0 ? '700' : '400'} color={i === 0 ? 'text' : 'textSecondary'}>
              {l}
            </Text>
          ))}
        </View>
      </View>
      <View style={[styles.slipTable, { borderColor: colors.border }]}>
        <View style={[styles.slipRow, { backgroundColor: colors.surface }]}>
          <Text variant="caption" style={{ flex: 1 }}>
            ÜRÜN
          </Text>
          <Text variant="caption">ADET</Text>
        </View>
        <View style={styles.slipRow}>
          <Text variant="footnote" style={{ flex: 1 }}>
            {item}
          </Text>
          <Text variant="footnote" weight="700">
            {qty}
          </Text>
        </View>
      </View>
      <Text variant="footnote" color="textSecondary" align="center" style={{ marginTop: 12 }}>
        Bu siparişi tercih ettiğin için teşekkürler! 💛{'\n'}Sorun olursa uygulamadan bize ulaş.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: SCREEN_PADDING, gap: 12, paddingBottom: 32 },
  banner: { flexDirection: 'row', gap: 12, padding: 14, borderRadius: radius.lg, alignItems: 'flex-start' },
  item: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  hr: { height: StyleSheet.hairlineWidth },
  kvRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 2 },
  num: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  campaign: { padding: 10, borderRadius: radius.md, marginTop: 8 },
  event: { flexDirection: 'row', gap: 12 },
  rail: { width: 12, alignItems: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  line: { width: 2, flex: 1, marginTop: 2 },
  warn: { flexDirection: 'row', gap: 8, padding: 12, borderRadius: radius.md, marginTop: 14 },
  label: { borderRadius: radius.lg, borderWidth: 1.5, borderStyle: 'dashed', overflow: 'hidden' },
  labelHead: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  labelFoot: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, marginTop: 14, borderTopWidth: StyleSheet.hairlineWidth },
  slip: { borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, padding: 16 },
  slipHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  slipTable: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.sm, marginTop: 14, overflow: 'hidden' },
  slipRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 10, paddingVertical: 8 },
});
