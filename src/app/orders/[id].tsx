/**
 * Sipariş detayı (Whatnot S61 + S62 makbuz + S64 yardım/iptal + S65 adres değişikliği)
 */
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type ScrollViewInstance } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, EmptyState, Header, IconButton, PressableScale, Screen, SectionGap, Text } from '@/components/ui';
import { CenterModal, IconCircleRow, InfoRow } from '@/features/activity/components';
import { useHelpFlow } from '@/features/activity/order/HelpFlow';
import { ChangeAddressSheet, InvoiceSheet, ProtectionSheet } from '@/features/activity/order/OrderSheets';
import { buildTimeline, copyText, openTracking, ProtectionCard, Receipt, SellerCard, StatusCard, statusCopy, Timeline } from '@/features/activity/order/sections';
import { VideoReceiptSheet } from '@/features/activity/order/VideoReceiptSheet';
import { useActivityExtras } from '@/features/activity/store';
import { addressLines, canChangeAddress, protectionInfo, protectionLabel, useNow, videoReceiptDaysLeft } from '@/features/activity/utils';
import { getCategory, getProduct, getShow, getUser } from '@/data';
import { formatDateTime, formatTRY } from '@/lib/format';
import { useInboxStore } from '@/store/inbox';
import { ORDER_SOURCE_LABELS, useOrdersStore } from '@/store/orders';
import { selectDefaultAddress, selectDefaultPayment, useWalletStore } from '@/store/wallet';
import { radius, SCREEN_PADDING, useTheme } from '@/theme';

type SheetKind = 'none' | 'address' | 'invoice' | 'video' | 'protection' | 'addressLocked';

export default function OrderDetailScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { id, qa } = useLocalSearchParams<{ id: string; qa?: string }>();
  const order = useOrdersStore((s) => s.orders.find((o) => o.id === id));
  const addresses = useWalletStore((s) => s.addresses);
  const payments = useWalletStore((s) => s.paymentMethods);
  const defaultAddress = useWalletStore(selectDefaultAddress);
  const defaultPayment = useWalletStore(selectDefaultPayment);
  const override = useActivityExtras((s) => (id ? s.addressOverrides[id] : undefined));
  const cancelRequest = useActivityExtras((s) => (id ? s.cancelRequests[id] : undefined));
  const helpRequest = useActivityExtras((s) => (id ? s.helpRequests[id] : undefined));
  const review = useActivityExtras((s) => (id ? s.reviews[id] : undefined));
  const [sheet, setSheet] = useState<SheetKind>('none');
  const now = useNow(60_000);

  const product = getProduct(order?.productId);
  const seller = getUser(order?.sellerId);
  const show = getShow(order?.showId);
  const categoryId = product?.categoryId ?? show?.categoryId ?? seller?.categoryIds[0];
  const category = getCategory(categoryId);
  const help = useHelpFlow(order, categoryId);
  const scrollRef = useRef<ScrollViewInstance>(null);

  // Yalnızca geliştirme: QA ekran görüntüleri için kaydırma kancası (?qa=scroll<y>)
  useEffect(() => {
    if (!__DEV__ || !qa?.startsWith('scroll')) return;
    const t = setTimeout(() => scrollRef.current?.scrollTo({ y: Number(qa.slice(6)) || 800, animated: false }), 900);
    return () => clearTimeout(t);
  }, [qa]);

  if (!order) {
    return (
      <Screen>
        <Header title="Sipariş" />
        <EmptyState icon="receipt-outline" title="Sipariş bulunamadı" message="Bu sipariş silinmiş ya da hesabına ait değil." actionLabel="Siparişlerime dön" onAction={() => router.navigate('/activity')} />
      </Screen>
    );
  }

  const addressId = override ?? order.addressId;
  const address = addresses.find((a) => a.id === addressId) ?? defaultAddress;
  const payment = payments.find((p) => p.id === order.paymentMethodId) ?? defaultPayment;
  const prot = protectionInfo(order, categoryId, now);
  const copy = statusCopy(order, { seller, address, help: helpRequest, cancelReason: cancelRequest?.reason });
  const canReview = order.status === 'delivered' && !order.reviewed && !cancelRequest;
  const addressEditable = canChangeAddress(order);
  const hasTracking = !!order.carrier && !!order.trackingNumber;
  const videoDays = videoReceiptDaysLeft(order, now);
  const closed = order.status === 'cancelled' || order.status === 'refunded';

  const messageSeller = () => {
    const conv = useInboxStore.getState().ensureConversation(order.sellerId, order.id);
    router.push(`/inbox/${conv.id}`);
  };
  const openHelpLater = () => {
    setSheet('none');
    setTimeout(help.open, 420);
  };
  const addrText = address ? addressLines(address) : undefined;

  const infoRows: { label: string; value: string; onPress?: () => void; right?: ReactNode }[] = [
    {
      label: 'Sipariş No',
      value: order.number,
      right: <IconButton name="copy-outline" size={28} onPress={() => copyText(order.number, 'Sipariş numarası kopyalandı')} accessibilityLabel="Kopyala" />,
    },
    { label: 'Sipariş tarihi', value: formatDateTime(order.createdAt) },
    { label: 'Satış türü', value: `${ORDER_SOURCE_LABELS[order.source]}${order.showId ? ' · Canlı yayın' : ' · Mağaza'}` },
    ...(seller ? [{ label: 'Satıcı', value: `@${seller.username}`, onPress: () => router.push(`/user/${seller.username}`) }] : []),
    { label: 'Adet', value: String(order.quantity) },
    ...(category ? [{ label: 'Kategori', value: category.name, onPress: () => router.push(`/category/${category.id}`) }] : []),
    ...(show ? [{ label: 'Yayın', value: show.title, onPress: () => (show.status === 'live' ? router.push(`/live/${show.id}`) : router.push(`/show/${show.id}`)) }] : []),
  ];

  return (
    <Screen>
      <Header
        title={order.productTitle}
        subtitle={`Sipariş No: ${order.number}`}
        border
        right={<IconButton name="help-circle-outline" onPress={help.open} accessibilityLabel="Yardım" />}
      />
      <ScrollView ref={scrollRef} contentContainerStyle={{ paddingTop: 16, paddingBottom: insets.bottom + 32 }} showsVerticalScrollIndicator={false}>
        <StatusCard
          order={order}
          copy={copy}
          review={review}
          canReview={canReview}
          onReview={() => router.push(`/review/${order.id}`)}
          onViewRequest={helpRequest ? help.open : undefined}
        />

        {/* İkonlu satırlar */}
        <View style={styles.rows}>
          <IconCircleRow
            icon="location-outline"
            title="Teslimat adresi"
            subtitle={addrText ? `${addrText.title}\n${addrText.line1}, ${addrText.line2}` : 'Kayıtlı adres bulunamadı'}
            onPress={() => setSheet(addressEditable ? 'address' : 'addressLocked')}
            trailing="none"
            right={
              addressEditable ? (
                <Text variant="subhead" weight="700" color="accent">
                  Değiştir
                </Text>
              ) : undefined
            }
          />
          <IconCircleRow icon="chatbubble-ellipses-outline" title="Satıcıya mesaj gönder" subtitle={seller ? `@${seller.username}` : undefined} onPress={messageSeller} />
          <IconCircleRow
            icon="help-buoy-outline"
            title="Bu siparişle ilgili yardım al"
            subtitle={helpRequest ? 'Açık talebin var · Satıcı yanıtı bekleniyor' : closed ? 'Bu sipariş kapandı' : protectionLabel(prot)}
            subtitleColor={helpRequest ? colors.warning : prot.active && !closed ? colors.success : undefined}
            onPress={help.open}
          />
          {hasTracking ? (
            <IconCircleRow
              icon="navigate-outline"
              title="Kargoyu takip et"
              subtitle={`${order.carrier} · ${order.trackingNumber}`}
              trailing="external"
              onPress={() => openTracking(order, { bg: colors.bg, fg: colors.text })}
            />
          ) : null}
          <IconCircleRow
            icon="gift"
            title="Arkadaşını davet et, ₺100 kazan!"
            subtitle="Bir sonraki alışverişinde kullanabileceğin kredi kazan"
            circleColor={colors.primary}
            iconColor={colors.onPrimary}
            onPress={() => router.push('/rewards')}
          />
        </View>

        <SectionGap />

        {/* Ürün */}
        <PressableScale
          scaleTo={0.99}
          onPress={() => (product ? router.push(`/product/${product.id}`) : undefined)}
          style={styles.productRow}
          accessibilityRole="button"
          accessibilityLabel="Ürün detaylarını gör">
          <View style={[styles.productImg, { backgroundColor: colors.skeleton }]}>
            <Image source={{ uri: order.productImage }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" transition={150} />
          </View>
          <View style={styles.flex}>
            <Text variant="title3" numberOfLines={3}>
              {order.productTitle}
            </Text>
            <Text variant="callout" weight="700" style={styles.mt4}>
              {order.itemPrice > 0 ? formatTRY(order.itemPrice) : 'Ücretsiz (çekiliş)'}
            </Text>
            {product ? (
              <Text variant="subhead" weight="700" color="accent" style={styles.mt4}>
                Ürün detaylarını gör ›
              </Text>
            ) : null}
          </View>
        </PressableScale>

        {/* Sipariş bilgileri */}
        <View style={styles.section}>
          <Text variant="title3" style={[styles.sectionTitle, styles.padH]}>
            Sipariş bilgileri
          </Text>
          <View style={styles.info}>
            {infoRows.map((r, i) => (
              <InfoRow key={r.label} label={r.label} value={r.value} accent={!!r.onPress} onPress={r.onPress} right={r.right} striped={i % 2 === 0} />
            ))}
          </View>
        </View>

        <SectionGap />

        {/* Kargo hareketleri */}
        <View style={styles.section}>
          <Text variant="title3" style={[styles.sectionTitle, styles.padH]}>
            Sipariş hareketleri
          </Text>
          <Timeline items={buildTimeline(order, address)} />
        </View>

        <SectionGap />

        {/* Makbuz */}
        <View style={styles.section}>
          <Text variant="title3" style={[styles.sectionTitle, styles.padH]}>
            Ödeme özeti
          </Text>
          <Receipt order={order} payment={payment} />
        </View>

        <View style={styles.rows}>
          <IconCircleRow icon="document-text-outline" title="Fatura (e-Arşiv)" subtitle="Faturanı görüntüle ve paylaş" onPress={() => setSheet('invoice')} />
          {order.showId ? (
            <IconCircleRow
              icon="videocam-outline"
              title="Satın alma videosu"
              subtitle={videoDays > 0 ? `${videoDays} gün daha izlenebilir` : 'Süresi doldu'}
              onPress={() => setSheet('video')}
            />
          ) : null}
        </View>

        <SectionGap />

        <View style={styles.block}>
          <ProtectionCard info={prot} onPress={() => setSheet('protection')} />
        </View>

        {seller ? (
          <View style={styles.block}>
            <Text variant="title3" style={[styles.sectionTitle, styles.padH]}>
              Satıcı hakkında
            </Text>
            <SellerCard seller={seller} onMessage={messageSeller} />
          </View>
        ) : null}

        {!closed ? (
          <View style={styles.actions}>
            {help.cancellable ? <Button title="İptal talep et" variant="outline" icon="close-circle-outline" fullWidth onPress={help.openCancel} /> : null}
            <Button title="Bu siparişle ilgili yardım al" variant="secondary" icon="help-buoy-outline" fullWidth onPress={help.open} />
          </View>
        ) : null}
      </ScrollView>

      <ChangeAddressSheet visible={sheet === 'address'} onClose={() => setSheet('none')} order={order} currentAddressId={address?.id} />
      <InvoiceSheet visible={sheet === 'invoice'} onClose={() => setSheet('none')} order={order} address={address} />
      {order.showId ? <VideoReceiptSheet visible={sheet === 'video'} onClose={() => setSheet('none')} order={order} /> : null}
      <ProtectionSheet visible={sheet === 'protection'} onClose={() => setSheet('none')} info={prot} onGetHelp={openHelpLater} />
      <CenterModal
        visible={sheet === 'addressLocked'}
        onClose={() => setSheet('none')}
        icon="lock-closed-outline"
        title="Adres değiştirilemez"
        message={
          closed
            ? 'Bu sipariş kapandığı için teslimat adresi değiştirilemez.'
            : 'Paket kargoya verildiği için teslimat adresi artık değiştirilemez. Gerekirse kargo firmasıyla ya da satıcıyla iletişime geçebilirsin.'
        }
        actions={[
          ...(closed
            ? []
            : [
                {
                  label: 'Satıcıya mesaj gönder',
                  variant: 'secondary' as const,
                  onPress: () => {
                    setSheet('none');
                    setTimeout(messageSeller, 300);
                  },
                },
              ]),
          { label: 'Tamam', variant: 'inverse', onPress: () => setSheet('none') },
        ]}
      />
      {help.element}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  mt4: { marginTop: 4 },
  padH: { paddingHorizontal: SCREEN_PADDING },
  rows: { paddingVertical: 8 },
  productRow: { flexDirection: 'row', gap: 14, paddingHorizontal: SCREEN_PADDING, paddingTop: 18, paddingBottom: 6 },
  productImg: { width: 96, height: 96, borderRadius: radius.md, overflow: 'hidden' },
  section: { paddingVertical: 18 },
  sectionTitle: { marginBottom: 12 },
  info: { paddingHorizontal: SCREEN_PADDING - 4 },
  block: { paddingTop: 18 },
  actions: { paddingHorizontal: SCREEN_PADDING, paddingTop: 24, gap: 10 },
});
