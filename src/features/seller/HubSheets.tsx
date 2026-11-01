/**
 * Satıcı Paneli sayfaları: ☰ menü, Teklifler, Bahşişler, Hesap Sağlığı, Kargo Ayarları,
 * Prova Modu, Kimlik & IBAN doğrulama, Komisyon seviyeleri.
 */
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Avatar, Button, Chip, EmptyState, Icon, ListRow, Segmented, Sheet, Text, TextField, toast, type IconName } from '@/components/ui';
import { DEMO_MODE, FEATURES } from '@/config/demo';
import { emptyAddress } from '@/features/wallet/forms';
import { formatTRY, timeAgoLong } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { SELLER_FEE_TEXT, SHIPPING_PRICES, SHIPPING_PROFILE_LABELS } from '@/lib/pricing';
import { random } from '@/lib/rng';
import { useMe } from '@/store/auth';
import { useSellerStore } from '@/store/seller';
import { SCREEN_PADDING, useTheme } from '@/theme';

import { acceptOffer, useNow } from './actions';
import { IbanField } from './IbanSheet';
import {
  accountHealth,
  COMMISSION_TIERS,
  deriveOffers,
  deriveTips,
  formatPercent,
  formatRate,
  isValidIban,
  isValidTckn,
  normalizeIban,
  orderBucket,
  SHIP_CARRIERS,
  type IncomingOffer,
} from './logic';
import { useSellerExtras, type ShippingCostMode } from './store';
import { Card, GroupLabel, KeyValue, MoneyField, OptionCard, ProgressBar, StatusPill, Thumb, tint } from './ui';

export type HubSheetKey = 'menu' | 'offers' | 'tips' | 'health' | 'shipping' | 'rehearsal' | 'verify' | 'tier';

// ─── ☰ Menü ──────────────────────────────────────────────────────────────────

type MenuItem = { key: string; icon: IconName; title: string; subtitle?: string; badge?: number; onPress?: () => void };

export function HubMenuSheet({ visible, onClose, onOpen }: { visible: boolean; onClose: () => void; onOpen: (key: HubSheetKey) => void }) {
  const now = useNow(60_000);
  const orders = useSellerStore((s) => s.orders);
  const listings = useSellerStore((s) => s.listings);
  const listingStatus = useSellerExtras((s) => s.listingStatus);
  const resolutions = useSellerExtras((s) => s.offerResolutions);
  const vacation = useSellerExtras((s) => s.vacation);
  const setVacation = useSellerExtras((s) => s.setVacation);
  const rehearsal = useSellerExtras((s) => s.rehearsal);
  const toShip = orders.filter((o) => orderBucket(o) === 'toship').length;
  const pendingOffers = deriveOffers(listings, listingStatus, resolutions, now).filter((o) => o.status === 'pending').length;

  const go = (fn: () => void) => {
    onClose();
    setTimeout(fn, 350);
  };
  const nav = (href: Parameters<typeof router.push>[0]) => () => go(() => router.push(href));
  const sheet = (key: HubSheetKey) => () => go(() => onOpen(key));

  const groups: { title: string; items: MenuItem[] }[] = [
    {
      title: 'Mağaza',
      items: [
        { key: 'shows', icon: 'videocam-outline', title: 'Yayınlarım', onPress: nav('/seller/shows') },
        { key: 'inventory', icon: 'cube-outline', title: 'Envanter', onPress: nav('/seller/inventory') },
        { key: 'offers', icon: 'pricetag-outline', title: 'Teklifler', badge: pendingOffers, onPress: sheet('offers') },
        // Bahşiş kapalıyken (FEATURES.tips) menüde gösterilmez
        ...(FEATURES.tips ? [{ key: 'tips', icon: 'heart-outline' as const, title: 'Bahşişler', onPress: sheet('tips') }] : []),
        { key: 'health', icon: 'pulse-outline', title: 'Hesap Sağlığı', onPress: sheet('health') },
      ],
    },
    {
      title: 'Satış ve kazanç',
      items: [
        { key: 'orders', icon: 'receipt-outline', title: 'Siparişler', badge: toShip, onPress: nav('/seller/orders') },
        { key: 'shipments', icon: 'paper-plane-outline', title: 'Gönderiler', subtitle: 'Kargodaki paketler ve takip', onPress: nav({ pathname: '/seller/orders', params: { tab: 'shipped' } }) },
        { key: 'payouts', icon: 'wallet-outline', title: 'Ödemeler', onPress: nav('/seller/payouts') },
        { key: 'analytics', icon: 'bar-chart-outline', title: 'Analizler', onPress: nav('/seller/analytics') },
      ],
    },
  ];

  return (
    <Sheet visible={visible} onClose={onClose} title="Satıcı Paneli" showClose maxHeight={0.92}>
      <View style={{ marginHorizontal: -SCREEN_PADDING }}>
        {groups.map((g) => (
          <View key={g.title}>
            <GroupLabel style={{ paddingTop: 8 }}>{g.title}</GroupLabel>
            {g.items.map((it) => (
              <ListRow key={it.key} icon={it.icon} title={it.title} subtitle={it.subtitle} badge={it.badge || undefined} onPress={it.onPress} />
            ))}
          </View>
        ))}
        <GroupLabel style={{ paddingTop: 8 }}>Ayarlar</GroupLabel>
        <ListRow icon="car-outline" title="Kargo Ayarları" subtitle="Firma, kargo ücreti, hazırlama süresi" onPress={sheet('shipping')} />
        <ListRow
          icon="airplane-outline"
          title="Tatil Modu"
          subtitle={vacation ? 'Açık — Hemen Al ürünlerin gizli' : 'Mağazanı geçici olarak kapat'}
          switchValue={vacation}
          onSwitch={(v) => {
            setVacation(v);
            haptic.success();
            toast(v ? 'Tatil modu açıldı 🌴 Mağazan alıcılara kapalı' : 'Tatil modu kapatıldı, mağazan yeniden açık', v ? 'airplane' : 'storefront');
          }}
        />
        <ListRow icon="school-outline" title="Prova Modu" value={rehearsal ? 'Açık' : undefined} subtitle="Sanal alıcılarla deneme yayını" onPress={sheet('rehearsal')} />
        <GroupLabel style={{ paddingTop: 8 }}>Destek</GroupLabel>
        <ListRow icon="help-buoy-outline" title="Satıcı Destek" onPress={nav('/settings/help')} />
        <ListRow icon="document-text-outline" title="Satıcı Sözleşmesi ve Kurallar" onPress={nav('/settings/legal')} />
      </View>
    </Sheet>
  );
}

// ─── Teklifler ───────────────────────────────────────────────────────────────

function OfferRow({ offer }: { offer: IncomingOffer }) {
  const { colors } = useTheme();
  const resolveOffer = useSellerExtras((s) => s.resolveOffer);
  const [countering, setCountering] = useState(false);
  const [counter, setCounter] = useState(Math.round((offer.amount + offer.listing.price) / 2));
  const discount = Math.round((1 - offer.amount / offer.listing.price) * 100);

  const accept = () => {
    acceptOffer(offer);
    haptic.success();
    toast.success(`Teklif kabul edildi — @${offer.buyer.username} için sipariş oluşturuldu`);
  };
  const decline = () => {
    resolveOffer(offer.id, { status: 'declined' });
    haptic.light();
    toast('Teklif reddedildi');
  };
  const sendCounter = () => {
    if (counter <= offer.amount || counter > offer.listing.price) {
      toast.warning(`Karşı teklif ${formatTRY(offer.amount)} ile ${formatTRY(offer.listing.price)} arasında olmalı`);
      return;
    }
    resolveOffer(offer.id, { status: 'countered', counter });
    setCountering(false);
    haptic.success();
    toast.success('Karşı teklifin gönderildi');
    // Alıcı yanıtı (simülasyon)
    const snapshot = { ...offer, amount: counter };
    setTimeout(() => {
      const still = useSellerExtras.getState().offerResolutions[offer.id];
      if (still?.status !== 'countered') return;
      if (random.chance(0.65)) {
        acceptOffer(snapshot);
        toast.success(`@${offer.buyer.username} karşı teklifini kabul etti 🎉 Sipariş oluşturuldu`);
      } else {
        useSellerExtras.getState().resolveOffer(offer.id, { status: 'declined', counter });
        toast(`@${offer.buyer.username} karşı teklifini reddetti`);
      }
    }, random.int(3500, 6500));
  };

  return (
    <View style={[styles.offer, { borderBottomColor: colors.border }]}>
      <View style={styles.offerTop}>
        <Thumb uri={offer.listing.images[0]} size={52} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="subhead" weight="600" numberOfLines={1}>
            {offer.listing.title}
          </Text>
          <View style={styles.inline}>
            <Avatar uri={offer.buyer.avatar} name={offer.buyer.username} size={16} />
            <Text variant="footnote" color="textSecondary" numberOfLines={1} style={{ flex: 1 }}>
              @{offer.buyer.username} · {timeAgoLong(offer.createdAt)}
            </Text>
          </View>
          <Text variant="footnote" color="textSecondary">
            Liste fiyatı {formatTRY(offer.listing.price)} · %{discount} indirim
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <Text variant="headline" weight="800">
            {formatTRY(offer.amount)}
          </Text>
          {offer.status !== 'pending' ? (
            <StatusPill
              label={offer.status === 'accepted' ? 'Kabul edildi' : offer.status === 'declined' ? 'Reddedildi' : `Karşı: ${formatTRY(offer.counter ?? 0)}`}
              tone={offer.status === 'accepted' ? 'success' : offer.status === 'declined' ? 'neutral' : 'info'}
            />
          ) : null}
        </View>
      </View>
      {offer.status === 'pending' && !countering ? (
        <View style={styles.offerActions}>
          <Button title="Reddet" size="sm" variant="outline" onPress={decline} style={{ flex: 0.9 }} />
          <Button title="Karşı teklif" size="sm" variant="secondary" onPress={() => setCountering(true)} style={{ flex: 1.25 }} />
          <Button title="Kabul et" size="sm" onPress={accept} style={{ flex: 1 }} />
        </View>
      ) : null}
      {countering ? (
        <View style={{ gap: 10, marginTop: 10 }}>
          <MoneyField label="Karşı teklifin" value={counter} onChange={setCounter} helper={`${formatTRY(offer.amount)} ile ${formatTRY(offer.listing.price)} arasında`} />
          <View style={styles.offerActions}>
            <Button title="Vazgeç" size="sm" variant="ghost" onPress={() => setCountering(false)} style={{ flex: 1 }} />
            <Button title="Gönder" size="sm" variant="inverse" onPress={sendCounter} style={{ flex: 2 }} />
          </View>
        </View>
      ) : null}
    </View>
  );
}

export function OffersSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const now = useNow(30_000);
  const listings = useSellerStore((s) => s.listings);
  const listingStatus = useSellerExtras((s) => s.listingStatus);
  const resolutions = useSellerExtras((s) => s.offerResolutions);
  const [tab, setTab] = useState<'pending' | 'all'>('pending');
  const offers = deriveOffers(listings, listingStatus, resolutions, now);
  const pending = offers.filter((o) => o.status === 'pending');
  const list = tab === 'pending' ? pending : offers;
  const hasOfferListings = listings.some((p) => p.format === 'buy_now' && p.acceptsOffers);

  return (
    <Sheet visible={visible} onClose={onClose} title="Teklifler" subtitle="Hemen Al ürünlerine gelen fiyat önerileri" height={0.85} showClose>
      <Segmented
        options={[
          { key: 'pending', label: `Bekleyen (${pending.length})` },
          { key: 'all', label: `Tümü (${offers.length})` },
        ]}
        value={tab}
        onChange={setTab}
        style={{ marginBottom: 6 }}
      />
      {list.length ? (
        list.map((o) => <OfferRow key={o.id} offer={o} />)
      ) : (
        <EmptyState
          icon="pricetag-outline"
          title={tab === 'pending' ? 'Bekleyen teklif yok' : 'Henüz teklif almadın'}
          message={
            hasOfferListings
              ? 'Alıcılar Hemen Al ürünlerine fiyat önerdiğinde burada görünür.'
              : 'Hemen Al ürünlerinde “Fiyat önerilerini kabul et” seçeneğini açarak teklif almaya başla.'
          }
          actionLabel={hasOfferListings ? undefined : 'Ürün Oluştur'}
          onAction={() => {
            onClose();
            setTimeout(() => router.push('/seller/listing'), 350);
          }}
        />
      )}
    </Sheet>
  );
}

// ─── Bahşişler ───────────────────────────────────────────────────────────────

export function TipsSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { colors } = useTheme();
  const sessions = useSellerStore((s) => s.sessions);
  const shows = useSellerStore((s) => s.shows);
  const tips = deriveTips(sessions, shows);
  const total = tips.reduce((s, t) => s + t.amount, 0);
  return (
    <Sheet visible={visible} onClose={onClose} title="Bahşişler" subtitle="Bahşişlerden komisyon kesilmez" height={tips.length ? 0.8 : undefined} showClose>
      {tips.length ? (
        <>
          <Card style={{ backgroundColor: colors.surface, borderColor: colors.surface, marginBottom: 6 }}>
            <Text variant="footnote" color="textSecondary">
              Toplam bahşiş
            </Text>
            <Text variant="title1">{formatTRY(total)}</Text>
            <Text variant="footnote" color="textSecondary">
              {tips.length} bahşiş · {sessions.length} yayın
            </Text>
          </Card>
          {tips.map((t) => (
            <View key={t.id} style={[styles.tipRow, { borderBottomColor: colors.border }]}>
              <Avatar uri={t.buyer.avatar} name={t.buyer.username} size={36} />
              <View style={{ flex: 1 }}>
                <Text variant="subhead" weight="700" numberOfLines={1}>
                  @{t.buyer.username}
                </Text>
                <Text variant="footnote" color="textSecondary" numberOfLines={1}>
                  “{t.message}” · {t.showTitle}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text variant="headline" weight="800" color="success">
                  +{formatTRY(t.amount)}
                </Text>
                <Text variant="caption" color="textTertiary">
                  {timeAgoLong(t.at)}
                </Text>
              </View>
            </View>
          ))}
        </>
      ) : (
        <EmptyState emoji="❤️" title="Henüz bahşiş almadın" message="İzleyiciler yayın sırasında sana bahşiş bırakabilir. Gelen bahşiş 3 gün sonra çekilebilir bakiyene eklenir." />
      )}
    </Sheet>
  );
}

// ─── Hesap sağlığı ───────────────────────────────────────────────────────────

export function HealthSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { colors } = useTheme();
  const orders = useSellerStore((s) => s.orders);
  const h = accountHealth(orders);
  const rows: { title: string; value: number | null; target: number; hint: string }[] = [
    { title: 'Süresinde kargolananlar', value: h.onTime, target: 0.8, hint: '2 iş günlük süre dolmadan kargoya verdiğin siparişlerin payı · en az %80 olmalı' },
    { title: 'İptal edilmeyenler', value: h.cancelFree, target: 0.99, hint: 'İptale dönmeden tamamlanan siparişlerin payı · en az %99 olmalı' },
    { title: 'İadeye dönmeyenler', value: h.refundFree, target: 0.97, hint: 'İade ya da iade talebiyle sonuçlanmayan siparişlerin payı · en az %97 olmalı' },
  ];
  const bad = rows.some((r) => r.value !== null && r.value < r.target - 0.05);
  const warn = rows.some((r) => r.value !== null && r.value < r.target);
  return (
    <Sheet visible={visible} onClose={onClose} title="Hesap Sağlığı" subtitle="Kargo, iptal ve iade karnen" showClose>
      <View style={[styles.healthHead, { backgroundColor: tint(bad ? colors.danger : warn ? colors.warning : colors.success, 0.12) }]}>
        <Icon name={bad ? 'alert-circle' : warn ? 'warning' : 'shield-checkmark'} size={28} color={bad ? colors.danger : warn ? colors.warning : colors.success} />
        <View style={{ flex: 1 }}>
          <Text variant="headline" weight="800">
            {bad ? 'Bir oranın hedefin epey altında' : warn ? 'Bir oranın hedefin biraz altında' : 'Tüm oranların hedefte'}
          </Text>
          <Text variant="footnote" color="textSecondary">
            {h.sample ? `${h.sample} sipariş üzerinden hesaplandı` : 'İlk siparişlerinden sonra hesaplanır'}
          </Text>
        </View>
      </View>
      <View style={{ gap: 18, marginTop: 16 }}>
        {rows.map((r) => {
          const color = r.value === null ? colors.textTertiary : r.value >= r.target ? colors.success : r.value >= r.target - 0.05 ? colors.warning : colors.danger;
          return (
            <View key={r.title} style={{ gap: 6 }}>
              <View style={styles.inline}>
                <Text variant="callout" weight="700" style={{ flex: 1 }}>
                  {r.title}
                </Text>
                <Text variant="headline" weight="800" color={color}>
                  {r.value === null ? '—' : formatPercent(r.value)}
                </Text>
              </View>
              <ProgressBar value={r.value ?? 0} color={color} />
              <Text variant="footnote" color="textSecondary">
                {r.hint}
              </Text>
            </View>
          );
        })}
        <Card style={{ backgroundColor: colors.surface, borderColor: colors.surface }}>
          <KeyValue label="Satıştan kargoya ortalama" value={h.avgShipDays === null ? '—' : `${String(h.avgShipDays).replace('.', ',')} gün`} />
          <KeyValue label="Yanıtlanan alıcı talepleri" value="%100" hint="Alıcı taleplerine 2 iş günü içinde dönüş yaptığın oran" />
          <KeyValue label="Son 6 ayda aldığın uyarı" value="Yok" tone="success" />
        </Card>
      </View>
    </Sheet>
  );
}

// ─── Kargo ayarları ──────────────────────────────────────────────────────────

export function ShippingSettingsSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { colors } = useTheme();
  const shipping = useSellerExtras((s) => s.shipping);
  const setShipping = useSellerExtras((s) => s.setShipping);
  const [draft, setDraft] = useState(shipping);

  useEffect(() => {
    if (visible) setDraft(shipping);
  }, [visible, shipping]);

  const mode = (m: ShippingCostMode) => setDraft((d) => ({ ...d, costMode: m }));

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Kargo Ayarları"
      subtitle="Yeni yayınlarına ve mağaza ürünlerine uygulanır"
      height={0.9}
      showClose
      footer={
        <Button
          title="Kaydet"
          size="lg"
          fullWidth
          onPress={() => {
            setShipping({ ...draft, configured: true });
            haptic.success();
            toast.success('Kargo ayarların kaydedildi');
            onClose();
          }}
        />
      }>
      <View style={{ gap: 20 }}>
        <View style={{ gap: 10 }}>
          <Text variant="headline" weight="700">
            Varsayılan kargo firması
          </Text>
          <View style={styles.wrap}>
            {SHIP_CARRIERS.map((c) => (
              <Chip key={c} label={c} selected={draft.carrier === c} onPress={() => setDraft((d) => ({ ...d, carrier: c }))} />
            ))}
          </View>
          <Text variant="footnote" color="textSecondary">
            Kargo kodu bu firma için oluşturulur; sipariş bazında değiştirebilirsin.
          </Text>
        </View>
        <View style={{ gap: 10 }}>
          <Text variant="headline" weight="700">
            Kargo ücretini kim öder?
          </Text>
          <OptionCard title="Alıcı öder" subtitle="Paket boyutuna göre çıkan ücretin tamamı siparişe eklenir" icon="person-outline" selected={draft.costMode === 'buyer'} onPress={() => mode('buyer')} />
          <OptionCard title="Kargoya sen de katkı ver" subtitle="Alıcıdan en çok belirlediğin tutar alınır, aradaki fark senin kazancından düşülür" icon="trending-down-outline" selected={draft.costMode === 'capped'} onPress={() => mode('capped')}>
            <MoneyField label="Alıcıdan alınacak üst tutar" value={draft.cap} onChange={(v) => setDraft((d) => ({ ...d, cap: v }))} />
          </OptionCard>
          <OptionCard title="Kargo benden" subtitle="Gönderim bedelini tamamen sen üstlenirsin; alıcı kargo için ödeme yapmaz" icon="gift-outline" selected={draft.costMode === 'seller'} onPress={() => mode('seller')} />
        </View>
        <View style={{ gap: 10 }}>
          <Text variant="headline" weight="700">
            Hazırlama süresi
          </Text>
          <Segmented
            options={[
              { key: '1', label: '1 iş günü' },
              { key: '2', label: '2 iş günü' },
            ]}
            value={String(draft.handlingDays) as '1' | '2'}
            onChange={(k) => setDraft((d) => ({ ...d, handlingDays: k === '1' ? 1 : 2 }))}
          />
          <Text variant="footnote" color="textSecondary">
            Kullanım Koşulları’na göre üst sınır 2 iş günüdür; paketlerini genelde ertesi gün hazırlıyorsan 1 iş günü seç.
          </Text>
        </View>
        <View style={{ marginHorizontal: -SCREEN_PADDING }}>
          <ListRow
            icon="hand-left-outline"
            title="Elden teslime izin ver"
            subtitle="Alıcıyla anlaşırsan ürünü kargo yerine elden verebilirsin"
            switchValue={draft.freePickup}
            onSwitch={(v) => setDraft((d) => ({ ...d, freePickup: v }))}
          />
        </View>
        <View style={{ gap: 8 }}>
          <Text variant="headline" weight="700">
            Kargo profilleri
          </Text>
          <Card padded={false}>
            {(Object.keys(SHIPPING_PROFILE_LABELS) as (keyof typeof SHIPPING_PROFILE_LABELS)[]).map((k, i) => (
              <View key={k} style={[styles.profileRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}>
                <Text variant="footnote" style={{ flex: 1 }}>
                  {SHIPPING_PROFILE_LABELS[k]}
                </Text>
                <Text variant="subhead" weight="700">
                  {formatTRY(SHIPPING_PRICES[k])}
                </Text>
              </View>
            ))}
          </Card>
          <Text variant="footnote" color="textSecondary">
            Bir alıcı aynı yayından birden fazla ürün alırsa hepsini tek pakette gönderirsin; ilk siparişten sonrakiler için alıcıdan ayrıca kargo ücreti alınmaz.
          </Text>
        </View>
      </View>
    </Sheet>
  );
}

// ─── Prova modu ──────────────────────────────────────────────────────────────

export function RehearsalSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { colors } = useTheme();
  const rehearsal = useSellerExtras((s) => s.rehearsal);
  const setRehearsal = useSellerExtras((s) => s.setRehearsal);
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      showClose
      footer={
        <Button
          title="Prova yayınını başlat"
          icon="videocam"
          size="lg"
          fullWidth
          onPress={() => {
            setRehearsal(true);
            onClose();
            setTimeout(() => router.push('/seller/go-live'), 350);
          }}
        />
      }>
      <View style={{ alignItems: 'center', gap: 10, paddingVertical: 8 }}>
        <View style={[styles.bigIcon, { backgroundColor: colors.primarySoft }]}>
          <Text style={{ fontSize: 38, lineHeight: 46 }}>🎬</Text>
        </View>
        <Text variant="title2" align="center">
          Prova Modu
        </Text>
        <Text variant="callout" color="textSecondary" align="center">
          Gerçek izleyici olmadan bir deneme yayını aç. Ekrana sanal alıcılar gelir, teklif verir ve sohbete yazar; bu sırada yapılan satışlar siparişe dönüşmez.
        </Text>
      </View>
      <View style={{ gap: 10, marginVertical: 12 }}>
        {[
          ['pin-outline', 'Bir ürünü ekranın altına sabitle'],
          ['hammer-outline', 'Farklı sürelerle mezat aç, Uzatmasız ayarını dene'],
          ['chatbubbles-outline', '/duyuru, /yavaş gibi sohbet komutlarını kullan'],
        ].map(([icon, text]) => (
          <View key={text} style={styles.inline}>
            <Icon name={icon as IconName} size={20} color="textSecondary" />
            <Text variant="callout" style={{ flex: 1 }}>
              {text}
            </Text>
          </View>
        ))}
      </View>
      <View style={{ marginHorizontal: -SCREEN_PADDING }}>
        <ListRow
          icon="school-outline"
          title="Prova modu"
          subtitle="Açıkken yayın ekranına sanal alıcılar bağlanır"
          switchValue={rehearsal}
          onSwitch={(v) => {
            setRehearsal(v);
            toast(v ? 'Prova modu açıldı' : 'Prova modu kapatıldı', 'school');
          }}
        />
      </View>
    </Sheet>
  );
}

// ─── Kimlik & IBAN doğrulama ─────────────────────────────────────────────────

export function VerifySheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { colors } = useTheme();
  const me = useMe();
  const kyc = useSellerExtras((s) => s.kyc);
  const setKyc = useSellerExtras((s) => s.setKyc);
  const iban = useSellerStore((s) => s.iban);
  const setIban = useSellerStore((s) => s.setIban);
  const [name, setName] = useState(kyc?.legalName ?? me.displayName);
  const [tckn, setTckn] = useState(kyc?.tckn ?? '');
  const [digits, setDigits] = useState(iban ? normalizeIban(iban).slice(2) : '');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setName(kyc?.legalName ?? me.displayName);
    setTckn(kyc?.tckn ?? '');
    setDigits(iban ? normalizeIban(iban).slice(2) : '');
    setSubmitted(false);
  }, [visible, kyc, iban, me.displayName]);

  const nameOk = name.trim().split(/\s+/).length >= 2;
  // TCKN cihaza yazılmaz (yalnızca maskeli hâli): boş bırakılırsa kayıtlı kimlik korunur
  const keepSavedTckn = !tckn && !!kyc?.tcknMasked;
  const tcknOk = keepSavedTckn || isValidTckn(tckn);
  const ibanOk = isValidIban(`TR${digits}`);

  const save = () => {
    setSubmitted(true);
    if (!nameOk || !tcknOk || !ibanOk) return;
    setKyc({
      ...(kyc ?? {
        sellerType: 'individual',
        birthDate: '',
        returnAddress: emptyAddress(name.trim()),
        phone: '',
        phoneVerified: false,
        experience: 'new',
        platforms: [],
        monthlyVolume: '',
        marketingConsent: false,
      }),
      legalName: name.trim(),
      tckn,
    });
    setIban(`TR${digits}`);
    haptic.success();
    toast.success(DEMO_MODE ? 'Demo: bilgilerin kaydedildi; gerçek kimlik ve IBAN doğrulaması yapılmaz' : 'Kimlik ve IBAN bilgilerin doğrulandı ✅');
    onClose();
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="Kimlik & IBAN doğrula" subtitle="Kazancının sana ulaşabilmesi için bir kez yapman yeterli" showClose footer={<Button title="Doğrula" size="lg" fullWidth onPress={save} />}>
      <View style={{ gap: 14 }}>
        <TextField label="Ad ve soyad (nüfus kaydındaki yazımla)" value={name} onChangeText={setName} autoCapitalize="words" error={submitted && !nameOk ? 'Ad ve soyadını gir' : undefined} />
        <TextField
          label="T.C. Kimlik No"
          value={tckn}
          onChangeText={(t) => setTckn(t.replace(/\D/g, '').slice(0, 11))}
          keyboardType="number-pad"
          placeholder={kyc?.tcknMasked ? `Kayıtlı: ${kyc.tcknMasked}` : '11 haneli kimlik numaran'}
          error={(submitted || tckn.length === 11) && !tcknOk ? 'Geçersiz T.C. Kimlik No' : undefined}
          right={tcknOk ? <Icon name="checkmark-circle" size={20} color={colors.success} /> : undefined}
        />
        <IbanField digits={digits} onChange={setDigits} error={submitted && !ibanOk ? 'Geçerli bir IBAN gir' : undefined} />
        <View style={[styles.inline, { alignItems: 'flex-start' }]}>
          <Icon name="lock-closed" size={16} color="textSecondary" />
          <Text variant="footnote" color="textSecondary" style={{ flex: 1 }}>
            {DEMO_MODE
              ? 'Demo sürümde bilgilerin yalnızca bu cihazda tutulur; T.C. Kimlik No cihaza kaydedilmez (yalnızca son 2 hane). Gerçek sürümde yalnızca kimlik doğrulama ve ödemeler için kullanılır.'
              : 'Bilgilerin yalnızca kimlik doğrulama ve ödemeler için kullanılır.'}
          </Text>
        </View>
      </View>
    </Sheet>
  );
}

// ─── Komisyon seviyeleri ─────────────────────────────────────────────────────

export function TierSheet({ visible, onClose, currentLevel, earnedLevel }: { visible: boolean; onClose: () => void; currentLevel: number; earnedLevel: number }) {
  const { colors } = useTheme();
  return (
    <Sheet visible={visible} onClose={onClose} title="Satış komisyonu seviyeleri" subtitle="Her 28 günlük dönemin sonunda toplam satışına bakılır; ulaştığın basamak bir sonraki dönemde uygulanır" showClose>
      <Card padded={false}>
        {COMMISSION_TIERS.map((t, i) => {
          const active = t.level === currentLevel;
          return (
            <View key={t.level} style={[styles.tierRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }, active && { backgroundColor: colors.surface }]}>
              <View style={{ flex: 1 }}>
                <View style={styles.inline}>
                  <Text variant="callout" weight="700">
                    {t.name}
                  </Text>
                  {active ? <StatusPill label="Mevcut" tone="primary" /> : t.level === earnedLevel && earnedLevel > currentLevel ? <StatusPill label="Sonraki dönem" tone="success" /> : null}
                </View>
                <Text variant="footnote" color="textSecondary">
                  {t.min === 0 ? 'Başlangıç' : `28 günde ${formatTRY(t.min)}+ satış`}
                </Text>
              </View>
              <Text variant="title3" weight="800">
                {formatRate(t.rate)}
              </Text>
            </View>
          );
        })}
      </Card>
      <View style={{ gap: 8, marginTop: 14 }}>
        {[
          'Hesaplama ürün fiyatı üzerinden yapılır; alıcının ödediği kargo bedeli komisyona girmez.',
          `Seviyeler yalnızca satış komisyonunu düşürür; kredi kartı ücreti (${SELLER_FEE_TEXT.cardFee}) her seviyede aynıdır.`,
          'İptal ya da iade edilen siparişler 28 günlük toplama eklenmez.',
          'Yeni satıcı kampanyası süresince ilk 30 günün satış komisyonu bakiyene iade edilir.',
        ].map((t) => (
          <View key={t} style={[styles.inline, { alignItems: 'flex-start' }]}>
            <Icon name="information-circle-outline" size={16} color="textSecondary" />
            <Text variant="footnote" color="textSecondary" style={{ flex: 1 }}>
              {t}
            </Text>
          </View>
        ))}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  inline: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  offer: { paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  offerTop: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  offerActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  tipRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  healthHead: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14 },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12 },
  bigIcon: { width: 84, height: 84, borderRadius: 42, alignItems: 'center', justifyContent: 'center' },
  tierRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 14 },
});
