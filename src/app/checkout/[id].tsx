/**
 * S25 — Ödeme (Hemen Al / kabul edilen fiyat önerisi / açık artırma ödemesi).
 * Parametreler: id = ürün id, price? (kabul edilen öneri fiyatı), source?, showId?, qty?
 * Akış: adres + kart → (taksit) → kredi / kupon → sözleşme onayı → ₺X Öde → 3D Secure → completePurchase → başarı.
 */
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Platform, ScrollView, StyleSheet, View, type ScrollViewInstance } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Divider, EmptyState, Header, Icon, ListRow, PressableScale, Screen, SectionGap, Text, TextField, toast } from '@/components/ui';
import { BlockTitle, CardBrandMark, Checkbox, NoticeBox, QtyStepper } from '@/features/commerce/components';
import { checkCoupon, couponDiscount, useCouponStore, type Coupon } from '@/features/commerce/coupons';
import { useIsBundled, useProductById, useRemainingStock, useSellerOf } from '@/features/commerce/hooks';
import { BuyerProtectionSheet, ContractSheet, InstallmentTableSheet } from '@/features/commerce/infoSheets';
import { installmentPlan, installmentsAllowed, MIN_INSTALLMENT_TOTAL, plansFor, programOf, type InstallmentCount } from '@/features/commerce/installments';
import { OrderSuccess } from '@/features/commerce/OrderSuccess';
import { AddressPickerSheet, PaymentPickerSheet } from '@/features/commerce/pickers';
import { ThreeDSecure } from '@/features/commerce/ThreeDSecure';
import { addressLine, CARRIER_LINE, deliveryWindow } from '@/features/commerce/utils';
import { completePurchase } from '@/features/shared/purchase';
import { requireTransactSetup } from '@/features/wallet/TransactSetup';
import { formatPhone, formatRating, formatTRY } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { checkoutBreakdown } from '@/lib/pricing';
import { ME_ID, useMe } from '@/store/auth';
import { useInboxStore } from '@/store/inbox';
import { ORDER_SOURCE_LABELS, useOrdersStore } from '@/store/orders';
import { useRewardsStore } from '@/store/rewards';
import { selectDefaultAddress, selectDefaultPayment, useWalletStore } from '@/store/wallet';
import { radius, SCREEN_PADDING, useTheme } from '@/theme';
import type { Order, OrderSource, PaymentMethod } from '@/types';

const SOURCES: OrderSource[] = ['auction', 'buy_now', 'giveaway', 'offer', 'flash_sale'];
const round2 = (v: number) => Math.round(v * 100) / 100;

/** Mezat Kredisi düş (store metodunun adı `use…` ile başladığı için bileşen dışında çağrılır — React Compiler hook kuralı) */
function spendCredits(amount: number, description: string): number {
  return useWalletStore.getState().spendCredits(amount, description);
}
const money = (v: number) => formatTRY(v, { cents: !Number.isInteger(round2(v)) });

type Result = { order: Order; points: number; payment?: PaymentMethod; installmentLabel?: string };

export default function CheckoutScreen() {
  const params = useLocalSearchParams<{ id: string; price?: string; source?: string; showId?: string; qty?: string; qa?: string }>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const me = useMe();
  const product = useProductById(params.id);
  const seller = useSellerOf(product?.sellerId);
  const remaining = useRemainingStock(product);
  const addresses = useWalletStore((s) => s.addresses);
  const cards = useWalletStore((s) => s.paymentMethods);
  const defaultAddress = useWalletStore(selectDefaultAddress);
  const defaultCard = useWalletStore(selectDefaultPayment);
  const credits = useWalletStore((s) => s.credits);
  const usedCoupons = useCouponStore((s) => s.used);
  const scrollRef = useRef<ScrollViewInstance>(null);

  const source: OrderSource = SOURCES.includes(params.source as OrderSource)
    ? (params.source as OrderSource)
    : product?.format === 'auction'
      ? 'auction'
      : product?.format === 'giveaway'
        ? 'giveaway'
        : 'buy_now';
  const showId = params.showId || product?.showId;
  const bundled = useIsBundled(product?.sellerId, showId);

  const [addressId, setAddressId] = useState<string | undefined>();
  const [cardId, setCardId] = useState<string | undefined>();
  const [qty, setQty] = useState(() => Math.max(1, Math.floor(Number(params.qty) || 1)));
  const [useCredit, setUseCredit] = useState(true);
  const [couponInput, setCouponInput] = useState('');
  const [coupon, setCoupon] = useState<Coupon | undefined>();
  const [couponError, setCouponError] = useState<string | undefined>();
  const [installment, setInstallment] = useState<InstallmentCount>(1);
  const [agreed, setAgreed] = useState(false);
  const [agreeError, setAgreeError] = useState(false);
  const [addressOpen, setAddressOpen] = useState(false);
  const [cardOpen, setCardOpen] = useState(false);
  const [contractOpen, setContractOpen] = useState(false);
  const [tableOpen, setTableOpen] = useState(false);
  const [protectionOpen, setProtectionOpen] = useState(false);
  const [threeDS, setThreeDS] = useState(false);
  const [paying, setPaying] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  // Yalnızca geliştirme: QA ekran görüntüleri için 3D Secure adımını doğrudan aç (?qa=3ds; otomatik SMS kodu ile başarı ekranına geçer) ya da sona kaydır (?qa=end)
  useEffect(() => {
    if (!__DEV__ || !params.qa) return;
    const t = setTimeout(() => {
      if (params.qa === 'end') {
        scrollRef.current?.scrollToEnd({ animated: false });
        return;
      }
      if (params.qa !== '3ds') return;
      setAgreed(true);
      setThreeDS(true);
    }, 900);
    return () => clearTimeout(t);
  }, [params.qa]);

  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const iosSheet = Platform.OS === 'ios';

  // ─── Başarı ────────────────────────────────────────────────────────────────
  if (result) {
    return (
      <Screen>
        <Header back="close" onBack={close} safeTop={!iosSheet} />
        <OrderSuccess
          order={result.order}
          payment={result.payment}
          points={result.points}
          installmentLabel={result.installmentLabel}
          sellerName={seller?.username}
          deliveryLabel={deliveryWindow().label}
          onViewOrder={() => router.replace(`/orders/${result.order.id}`)}
          onContinue={close}
        />
      </Screen>
    );
  }

  // ─── Geçersiz durumlar ─────────────────────────────────────────────────────
  const unitPrice = params.price !== undefined && Number(params.price) > 0 ? Math.round(Number(params.price)) : (product?.price ?? 0);
  const unavailable = !product ? 'missing' : product.sellerId === ME_ID ? 'own' : remaining <= 0 ? 'sold' : source === 'giveaway' || unitPrice <= 0 ? 'free' : null;
  if (!product || unavailable) {
    const copy =
      unavailable === 'own'
        ? { title: 'Bu senin ilanın', message: 'Kendi ürününü satın alamazsın.' }
        : unavailable === 'sold'
          ? { title: 'Bu ürün artık satışta değil', message: 'Ürün tükendi ya da başka bir alıcıya satıldı. Benzer ürünlere göz at.' }
          : unavailable === 'free'
            ? { title: 'Ödeme gerekmiyor', message: 'Çekiliş ödülleri ücretsizdir; kazandığında sipariş otomatik oluşturulur.' }
            : { title: 'Ürün bulunamadı', message: 'Bu ilan kaldırılmış olabilir.' };
    return (
      <Screen>
        <Header back="close" title="Ödeme" onBack={close} safeTop={!iosSheet} />
        <EmptyState icon="bag-remove-outline" title={copy.title} message={copy.message} actionLabel="Kapat" onAction={close} />
      </Screen>
    );
  }

  // ─── Hesaplar ──────────────────────────────────────────────────────────────
  const address = addresses.find((a) => a.id === addressId) ?? defaultAddress;
  const card = cards.find((c) => c.id === cardId) ?? defaultCard;
  const canChangeQty = source === 'buy_now' && remaining > 1;
  const maxQty = canChangeQty ? Math.min(remaining, 10) : 1;
  const quantity = Math.min(qty, maxQty);
  const itemSubtotal = unitPrice * quantity;
  const shipping = bundled ? 0 : product.shippingCost;
  const base = checkoutBreakdown(itemSubtotal, shipping);
  const couponValid = !!coupon && (!coupon.minSubtotal || itemSubtotal >= coupon.minSubtotal);
  const couponOff = coupon && couponValid ? couponDiscount(coupon, itemSubtotal) : 0;
  const afterCoupon = round2(itemSubtotal - couponOff);
  const creditUsed = useCredit && credits > 0 ? round2(Math.min(credits, afterCoupon)) : 0;
  const baseTotal = round2(base.total - couponOff - creditUsed);
  const installmentsOk = installmentsAllowed(source);
  const installmentsEligible = installmentsOk && baseTotal >= MIN_INSTALLMENT_TOTAL && !!card;
  const program = programOf(card?.bank);
  const plans = installmentsEligible ? plansFor(card?.bank, baseTotal) : [];
  const activeCount: InstallmentCount = installmentsEligible ? installment : 1;
  const plan = activeCount > 1 ? installmentPlan(program, baseTotal, activeCount) : undefined;
  const interest = plan?.interest ?? 0;
  const total = round2(baseTotal + interest);
  const installmentLabel = plan ? `${plan.count} taksit` : undefined;
  const delivery = deliveryWindow();

  const applyCoupon = () => {
    const res = checkCoupon(couponInput, { subtotal: itemSubtotal, source, used: usedCoupons });
    if (!res.ok) {
      haptic.error();
      setCouponError(res.error);
      return;
    }
    haptic.success();
    setCoupon(res.coupon);
    setCouponError(undefined);
    setCouponInput('');
    toast.success(`${res.coupon.code} uygulandı · -${money(couponDiscount(res.coupon, itemSubtotal))}`, 'pricetag');
  };

  const startPayment = () => {
    const w = useWalletStore.getState();
    const pm = w.paymentMethods.find((c) => c.id === cardId) ?? selectDefaultPayment(w);
    const adr = w.addresses.find((a) => a.id === addressId) ?? selectDefaultAddress(w);
    if (!pm) {
      setCardOpen(true);
      return;
    }
    if (!adr) {
      setAddressOpen(true);
      return;
    }
    setPaying(true);
    setTimeout(() => {
      setPaying(false);
      setThreeDS(true);
    }, 600);
  };

  const pay = () => {
    if (!agreed) {
      setAgreeError(true);
      haptic.error();
      toast.error('Devam etmek için sözleşmeleri onaylaman gerekiyor');
      scrollRef.current?.scrollToEnd({ animated: true });
      return;
    }
    requireTransactSetup(startPayment, { reason: 'Ödemeyi tamamlamak için bir kart ve teslimat adresi ekle.' });
  };

  const complete = () => {
    setThreeDS(false);
    const w = useWalletStore.getState();
    const pm = w.paymentMethods.find((c) => c.id === cardId) ?? selectDefaultPayment(w);
    const adr = w.addresses.find((a) => a.id === addressId) ?? selectDefaultAddress(w);
    const pointsBefore = useRewardsStore.getState().points;
    const order = completePurchase({
      product,
      price: unitPrice,
      source,
      showId,
      quantity,
      applyCredits: false,
      addressId: adr?.id,
      paymentMethodId: pm?.id,
    });
    // Kredi + kupon: ürün tutarına uygulanır (Kupon → Kredi → Kart)
    const creditTaken = creditUsed > 0 ? spendCredits(creditUsed, `Sipariş ${order.number}`) : 0;
    if (coupon && couponOff > 0) useCouponStore.getState().markUsed(coupon.code);
    const discountTotal = round2(couponOff + creditTaken);
    const finalTotal = Math.max(0, round2(order.itemPrice + order.shippingCost + order.serviceFee - discountTotal + interest));
    const notes = [
      coupon && couponOff > 0 ? `Kupon ${coupon.code}: -${money(couponOff)}` : null,
      creditTaken > 0 ? `Mezat Kredisi: -${money(creditTaken)}` : null,
      plan ? `${pm?.bank ?? ''} ${plan.count} taksit × ${money(plan.monthly)}`.trim() : null,
    ].filter(Boolean) as string[];
    const patched: Order = {
      ...order,
      creditUsed: discountTotal,
      total: finalTotal,
      timeline: order.timeline.map((ev, i) => (i === 0 && notes.length ? { ...ev, note: [ev.note, ...notes].filter(Boolean).join(' · ') } : ev)),
    };
    useOrdersStore.setState((s) => ({ orders: s.orders.map((o) => (o.id === order.id ? patched : o)) }));
    // Bildirimdeki tutarı güncelle
    useInboxStore.setState((s) => ({
      notifications: s.notifications.map((n) =>
        n.href === `/orders/${order.id}` ? { ...n, body: `${product.title} · ${money(finalTotal)}${seller ? ` · @${seller.username}` : ''}` } : n,
      ),
    }));
    // Karşı teklif kabul edildiyse öneriyi kapat
    if (source === 'offer') {
      const offer = useOrdersStore.getState().offers.find((o) => o.productId === product.id && (o.status === 'countered' || o.status === 'pending'));
      if (offer) useOrdersStore.getState().resolveOffer(offer.id, 'accepted', offer.counterAmount);
    }
    const points = Math.max(0, useRewardsStore.getState().points - pointsBefore);
    haptic.success();
    setResult({ order: patched, points, payment: pm, installmentLabel });
  };

  const sourceTag = source === 'offer' ? 'Kabul edilen teklif' : source === 'auction' ? 'Kazandığın açık artırma' : source === 'flash_sale' ? 'Flaş indirim' : null;

  return (
    <Screen>
      <Header back="close" title="Ödeme" subtitle="🔒 Güvenli ödeme" onBack={close} safeTop={!iosSheet} border />
      <ScrollView ref={scrollRef} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets showsVerticalScrollIndicator={false}>
        {/* ─── Ürün ─── */}
        <View style={styles.block}>
          <View style={styles.productRow}>
            <Image source={{ uri: product.images[0] }} style={[styles.thumb, { backgroundColor: colors.skeleton }]} contentFit="cover" cachePolicy="memory-disk" />
            <View style={styles.flexGap}>
              <Text variant="callout" weight="700" numberOfLines={2}>
                {product.title}
              </Text>
              {seller ? (
                <Text variant="footnote" color="textSecondary" numberOfLines={1}>
                  @{seller.username} · ★ {formatRating(seller.rating || 5)}
                </Text>
              ) : null}
              <View style={styles.priceLine}>
                <Text variant="headline" weight="800">
                  {formatTRY(unitPrice)}
                </Text>
                {source === 'offer' && unitPrice < product.price ? (
                  <Text variant="footnote" color="textTertiary" style={styles.strike}>
                    {formatTRY(product.price)}
                  </Text>
                ) : null}
                <View style={styles.flex} />
                {canChangeQty ? <QtyStepper value={quantity} max={maxQty} onChange={setQty} /> : null}
              </View>
            </View>
          </View>
          <View style={styles.tagsRow}>
            {sourceTag ? (
              <View style={[styles.tag, { backgroundColor: colors.surface }]}>
                <Icon name={source === 'offer' ? 'pricetags' : source === 'auction' ? 'hammer' : 'flash'} size={12} color="success" />
                <Text variant="caption" color="success">
                  {sourceTag}
                </Text>
              </View>
            ) : null}
            <Text variant="footnote" color={remaining <= 2 ? 'live' : 'textSecondary'} weight="600">
              {remaining === 1 ? 'Son 1 adet' : `Stokta ${remaining} adet`}
              {quantity > 1 ? ` · ${quantity} adet seçildi` : ''}
            </Text>
          </View>
        </View>

        <SectionGap />

        {/* ─── Teslimat adresi ─── */}
        <View style={styles.block}>
          <BlockTitle title="Teslimat adresi" action={address ? 'Değiştir' : undefined} onAction={() => setAddressOpen(true)} />
          {address ? (
            <PressableScale scaleTo={0.99} onPress={() => setAddressOpen(true)} style={[styles.selectCard, { borderColor: colors.border }]}>
              <Icon name="location" size={20} color="text" />
              <View style={styles.flexGap}>
                <View style={styles.titleRow}>
                  <Text variant="callout" weight="700">
                    {address.title}
                  </Text>
                  <Text variant="footnote" color="textSecondary" numberOfLines={1} style={styles.shrink}>
                    {address.fullName} · {formatPhone(address.phone)}
                  </Text>
                </View>
                <Text variant="footnote" color="textSecondary" numberOfLines={2}>
                  {addressLine(address)}
                </Text>
              </View>
            </PressableScale>
          ) : (
            <AddRow icon="location-outline" title="Teslimat adresi ekle" subtitle="Siparişin nereye gelsin?" onPress={() => setAddressOpen(true)} />
          )}
          <View style={styles.deliveryRow}>
            <Icon name="cube-outline" size={16} color="textSecondary" />
            <Text variant="footnote" color="textSecondary" style={styles.flex}>
              Tahmini teslimat <Text variant="footnote" weight="700">{delivery.label}</Text> · {CARRIER_LINE}
            </Text>
          </View>
        </View>

        <SectionGap />

        {/* ─── Ödeme yöntemi ─── */}
        <View style={styles.block}>
          <BlockTitle title="Ödeme yöntemi" action={card ? 'Değiştir' : undefined} onAction={() => setCardOpen(true)} />
          {card ? (
            <PressableScale scaleTo={0.99} onPress={() => setCardOpen(true)} style={[styles.selectCard, styles.centerRow, { borderColor: colors.border }]}>
              <CardBrandMark brand={card.brand} />
              <View style={styles.flexGap}>
                <Text variant="callout" weight="700">
                  {card.bank} •••• {card.last4}
                </Text>
                <Text variant="footnote" color="textSecondary">
                  {program} · SKT {card.expiry}
                </Text>
              </View>
              <Icon name="chevron-forward" size={18} color="textTertiary" />
            </PressableScale>
          ) : (
            <AddRow icon="card-outline" title="Kart ekle" subtitle="Kredi veya banka kartı · 3D Secure" onPress={() => setCardOpen(true)} />
          )}
        </View>

        {/* ─── Taksit ─── */}
        {installmentsOk ? (
          <>
            <SectionGap />
            <View style={styles.block}>
              <BlockTitle title="Taksit seçenekleri" action="Taksit tablosu" onAction={() => setTableOpen(true)} />
              {!card ? (
                <Text variant="footnote" color="textSecondary">
                  Taksit seçeneklerini görmek için bir kredi kartı ekle.
                </Text>
              ) : !installmentsEligible ? (
                <NoticeBox icon="information-circle-outline">{`Taksit seçenekleri ${formatTRY(MIN_INSTALLMENT_TOTAL)} ve üzeri alışverişlerde sunulur. Bu sipariş tek çekim olarak ödenecek.`}</NoticeBox>
              ) : (
                <View style={[styles.plans, { borderColor: colors.border }]}>
                  <View style={[styles.programRow, { backgroundColor: colors.surface }]}>
                    <Icon name="card" size={14} color="textSecondary" />
                    <Text variant="caption" color="textSecondary">
                      {program.toLocaleUpperCase('tr-TR')} KARTINA ÖZEL
                    </Text>
                  </View>
                  {plans.map((p, i) => {
                    const on = p.count === activeCount;
                    return (
                      <PressableScale
                        key={p.count}
                        scaleTo={0.99}
                        onPress={() => {
                          haptic.tap();
                          setInstallment(p.count);
                        }}
                        style={[styles.planRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}>
                        <Icon name={on ? 'radio-button-on' : 'radio-button-off'} size={20} color={on ? 'text' : 'textTertiary'} />
                        <View style={styles.flexGap}>
                          <Text variant="subhead" weight="700">
                            {p.count === 1 ? 'Tek çekim' : `${p.count} taksit`}
                          </Text>
                          {p.count > 1 ? (
                            <Text variant="caption" weight="600" color={p.interestFree ? 'success' : 'textSecondary'}>
                              {p.interestFree ? 'Vade farksız' : `Vade farkı ${money(p.interest)}`}
                            </Text>
                          ) : null}
                        </View>
                        <View style={styles.planRight}>
                          <Text variant="subhead" weight="800" tabular>
                            {p.count === 1 ? money(p.total) : `${p.count} x ${money(p.monthly)}`}
                          </Text>
                          {p.count > 1 ? (
                            <Text variant="caption" weight="500" color="textSecondary" tabular>
                              Toplam {money(p.total)}
                            </Text>
                          ) : null}
                        </View>
                      </PressableScale>
                    );
                  })}
                </View>
              )}
            </View>
          </>
        ) : source === 'auction' ? (
          <View style={styles.inlineNote}>
            <NoticeBox icon="information-circle-outline">Açık artırma alımlarında taksit yapılamaz; ödeme tek çekim olarak alınır.</NoticeBox>
          </View>
        ) : null}

        <SectionGap />

        {/* ─── İndirimler ─── */}
        <View style={styles.block}>
          <BlockTitle title="İndirimler" style={styles.noMargin} />
          {credits > 0 ? (
            <ListRow
              icon="wallet-outline"
              title="Mezat Kredisi kullan"
              subtitle={useCredit ? `Bakiyen ${money(credits)} · Bu siparişte ${money(creditUsed)} kullanılacak` : `Bakiyen ${money(credits)} · Yalnızca ürün tutarına uygulanır`}
              switchValue={useCredit}
              onSwitch={setUseCredit}
              style={styles.flushRow}
            />
          ) : (
            <ListRow icon="wallet-outline" title="Mezat Kredisi" subtitle="Kullanılabilir kredin yok. Arkadaşını davet et, kredi kazan." style={styles.flushRow} />
          )}
          {coupon ? (
            <View style={[styles.couponApplied, { backgroundColor: colors.surface }]}>
              <Icon name="pricetag" size={18} color={couponValid ? 'success' : 'danger'} />
              <View style={styles.flexGap}>
                <Text variant="subhead" weight="800">
                  {coupon.code}
                </Text>
                {couponValid ? (
                  <Text variant="caption" weight="500" color="textSecondary">
                    {coupon.label} · -{money(couponOff)}
                  </Text>
                ) : (
                  <Text variant="caption" weight="600" color="danger">
                    Ürün tutarı {formatTRY(coupon.minSubtotal ?? 0)} altına düştüğü için kupon uygulanmıyor
                  </Text>
                )}
              </View>
              <Button
                title="Kaldır"
                variant="ghost"
                size="sm"
                onPress={() => {
                  setCoupon(undefined);
                  toast('Kupon kaldırıldı', 'pricetag-outline');
                }}
              />
            </View>
          ) : (
            <View style={styles.couponRow}>
              <TextField
                placeholder="Kupon kodu"
                value={couponInput}
                onChangeText={(t) => {
                  setCouponInput(t);
                  if (couponError) setCouponError(undefined);
                }}
                autoCapitalize="characters"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={applyCoupon}
                error={couponError}
                icon="pricetag-outline"
                containerStyle={styles.flex}
              />
              <Button title="Uygula" variant="inverse" size="md" disabled={!couponInput.trim()} onPress={applyCoupon} style={styles.applyBtn} />
            </View>
          )}
        </View>

        <SectionGap />

        {/* ─── Özet ─── */}
        <View style={styles.block}>
          <BlockTitle title="Sipariş özeti" style={styles.noMargin} />
          <SummaryRow label={`Ürün tutarı (KDV dahil)${quantity > 1 ? ` · ${quantity} adet` : ''}`} value={money(itemSubtotal)} />
          <SummaryRow label="Kargo" value={bundled ? '₺0 · aynı pakette' : shipping > 0 ? money(shipping) : 'Ücretsiz'} tone={bundled || shipping === 0 ? 'success' : undefined} />
          <SummaryRow label="Alıcı Koruması hizmet bedeli" value={money(base.serviceFee)} info={() => setProtectionOpen(true)} />
          {couponOff > 0 ? <SummaryRow label={`İndirim (${coupon?.code})`} value={`-${money(couponOff)}`} tone="success" /> : null}
          {creditUsed > 0 ? <SummaryRow label="Mezat Kredisi" value={`-${money(creditUsed)}`} tone="success" /> : null}
          {interest > 0 ? <SummaryRow label={`Vade farkı (${plan?.count} taksit)`} value={`+${money(interest)}`} /> : null}
          <Divider style={styles.summaryDivider} />
          <View style={styles.totalRow}>
            <View style={styles.flex}>
              <Text variant="headline" weight="800">
                Toplam
              </Text>
              <Text variant="caption" weight="500" color="textSecondary">
                KDV dahil · {ORDER_SOURCE_LABELS[source]}
              </Text>
            </View>
            <View style={styles.planRight}>
              <Text variant="title2" tabular>
                {money(total)}
              </Text>
              {plan ? (
                <Text variant="footnote" weight="600" color="textSecondary" tabular>
                  {plan.count} x {money(plan.monthly)}
                </Text>
              ) : null}
            </View>
          </View>
        </View>

        {/* ─── Sözleşme ─── */}
        <View style={[styles.block, styles.agreement]}>
          <Checkbox
            checked={agreed}
            error={agreeError && !agreed}
            onToggle={() => {
              setAgreed((v) => !v);
              setAgreeError(false);
            }}>
            <Text variant="footnote" color={agreeError && !agreed ? 'danger' : 'textSecondary'}>
              <Text variant="footnote" weight="700" color="accent" onPress={() => setContractOpen(true)} suppressHighlighting>
                Ön Bilgilendirme Formu
              </Text>
              {' ve '}
              <Text variant="footnote" weight="700" color="accent" onPress={() => setContractOpen(true)} suppressHighlighting>
                Mesafeli Satış Sözleşmesi
              </Text>
              {"'ni okudum, onaylıyorum."}
            </Text>
          </Checkbox>
          <View style={styles.secureRow}>
            <Icon name="lock-closed" size={13} color="textTertiary" />
            <Text variant="caption" color="textTertiary" weight="500">
              256-bit SSL · 3D Secure · iyzico güvencesiyle
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12), borderTopColor: colors.border, backgroundColor: colors.bg }]}>
        <Button title={`${money(total)} Öde`} subtitle={plan ? `${plan.count} x ${money(plan.monthly)} · ${program}` : undefined} size="lg" fullWidth loading={paying} onPress={pay} />
      </View>

      <AddressPickerSheet visible={addressOpen} onClose={() => setAddressOpen(false)} selectedId={address?.id} onSelect={setAddressId} />
      <PaymentPickerSheet
        visible={cardOpen}
        onClose={() => setCardOpen(false)}
        selectedId={card?.id}
        onSelect={(cid) => {
          setCardId(cid);
          setInstallment(1);
        }}
      />
      <InstallmentTableSheet visible={tableOpen} onClose={() => setTableOpen(false)} amount={baseTotal} />
      <BuyerProtectionSheet visible={protectionOpen} onClose={() => setProtectionOpen(false)} />
      <ContractSheet
        visible={contractOpen}
        onClose={() => setContractOpen(false)}
        onAccept={() => {
          setAgreed(true);
          setAgreeError(false);
          haptic.success();
        }}
        ctx={{
          product,
          seller,
          quantity,
          itemTotal: itemSubtotal,
          shipping,
          serviceFee: base.serviceFee,
          discount: round2(couponOff + creditUsed),
          total,
          address,
          buyerName: address?.fullName || me.displayName,
        }}
      />
      <ThreeDSecure
        visible={threeDS}
        amount={total}
        card={card}
        phone={address?.phone}
        installmentLabel={plan ? `${plan.count} x ${money(plan.monthly)}` : undefined}
        onSuccess={complete}
        onCancel={() => {
          setThreeDS(false);
          toast.error('Ödeme iptal edildi. Kartından çekim yapılmadı.');
        }}
      />
    </Screen>
  );
}

function AddRow({ icon, title, subtitle, onPress }: { icon: 'location-outline' | 'card-outline'; title: string; subtitle: string; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <PressableScale scaleTo={0.99} onPress={onPress} style={[styles.addRow, { borderColor: colors.textTertiary }]}>
      <View style={[styles.addIcon, { backgroundColor: colors.surface }]}>
        <Icon name={icon} size={20} color="text" />
      </View>
      <View style={styles.flexGap}>
        <Text variant="callout" weight="700">
          {title}
        </Text>
        <Text variant="footnote" color="textSecondary">
          {subtitle}
        </Text>
      </View>
      <Icon name="add-circle" size={22} color="text" />
    </PressableScale>
  );
}

function SummaryRow({ label, value, tone, info }: { label: string; value: string; tone?: 'success'; info?: () => void }) {
  return (
    <View style={styles.summaryRow}>
      <Text variant="subhead" color="textSecondary" style={styles.flex} onPress={info} suppressHighlighting>
        {label}
        {info ? '  ⓘ' : ''}
      </Text>
      <Text variant="subhead" weight="700" color={tone ?? 'text'} tabular>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  flexGap: { flex: 1, gap: 3 },
  shrink: { flexShrink: 1 },
  noMargin: { marginBottom: 0 },
  scroll: { paddingBottom: 24 },
  block: { paddingHorizontal: SCREEN_PADDING, paddingVertical: 14, gap: 10 },
  productRow: { flexDirection: 'row', gap: 12 },
  thumb: { width: 72, height: 72, borderRadius: radius.sm },
  priceLine: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  strike: { textDecorationLine: 'line-through' },
  tagsRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  selectCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderWidth: StyleSheet.hairlineWidth * 2, borderRadius: radius.md, padding: 14 },
  centerRow: { alignItems: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  deliveryRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1.5, borderStyle: 'dashed', borderRadius: radius.md, padding: 12 },
  addIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  plans: { borderWidth: StyleSheet.hairlineWidth * 2, borderRadius: radius.md, overflow: 'hidden' },
  programRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7 },
  planRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 11 },
  planRight: { alignItems: 'flex-end', gap: 1 },
  inlineNote: { paddingHorizontal: SCREEN_PADDING, paddingBottom: 14 },
  flushRow: { paddingHorizontal: 0 },
  couponRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  applyBtn: { height: 50, minHeight: 50 },
  couponApplied: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: radius.md, paddingLeft: 12, paddingVertical: 8 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  summaryDivider: { marginVertical: 2 },
  totalRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  agreement: { paddingTop: 4 },
  secureRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 6 },
  footer: { paddingHorizontal: SCREEN_PADDING, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
});
