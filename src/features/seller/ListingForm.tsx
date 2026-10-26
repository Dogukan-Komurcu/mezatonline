/**
 * S83 — Ürün Oluştur / Düzenle (modal). ?id= düzenleme, ?showId= yayını önceden seç.
 * Fotoğraflar (8'e kadar), başlık, açıklama, kategori, durum, satış formatı ve fiyat, adet,
 * Ani Bitiş / Fiyat önerisi, kargo profili, yayına ekle; Taslak / Yayınla / Sil.
 */
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { CONDITION_LABELS, FORMAT_LABELS } from '@/components/cards/ProductCard';
import { Button, Chip, EmptyState, Header, Icon, ListRow, PressableScale, Screen, Segmented, SelectField, Text, TextField, toast } from '@/components/ui';
import { CATEGORIES, getCategory } from '@/data';
import { formatShowTime, formatTRY } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { sellerFees, SHIPPING_PRICES, SHIPPING_PROFILE_LABELS } from '@/lib/pricing';
import { useSellerStore } from '@/store/seller';
import { radius, SCREEN_PADDING, useTheme } from '@/theme';
import type { Condition, ListingFormat, Product, ShippingProfile } from '@/types';

import { useQaOffset } from './qaSeed';
import { assignListingsToShow, createListingWithStatus, deleteListings } from './actions';
import { pickFromLibrary, SamplePhotoSheet, takePhoto } from './media';
import { useSellerExtras } from './store';
import { ActionSheet, Card, FormSection, KeyValue, MoneyField, Stepper, StickyFooter, Thumb, tint, MODAL_SAFE_TOP } from './ui';

const MAX_PHOTOS = 8;
const GRADE_PRESETS = ['PSA 10', 'PSA 9', 'BGS 9.5', 'CGC 9.8', 'PSA 8'];
const NO_SHOW = 'none';

type FormState = {
  images: string[];
  title: string;
  description: string;
  categoryId?: string;
  subcategoryId?: string;
  condition: Condition;
  grade: string;
  format: ListingFormat;
  price: number;
  compareAt: number;
  quantity: number;
  suddenDeath: boolean;
  acceptsOffers: boolean;
  shippingProfile: ShippingProfile;
  showId?: string;
};

function initialState(p: Product | undefined, presetShow: string | undefined): FormState {
  if (p) {
    return {
      images: p.images.filter(Boolean),
      title: p.title,
      description: p.description,
      categoryId: p.categoryId || undefined,
      subcategoryId: p.subcategoryId,
      condition: p.condition,
      grade: p.grade ?? '',
      format: p.format,
      price: p.price,
      compareAt: p.compareAtPrice ?? 0,
      quantity: Math.max(1, p.quantity),
      suddenDeath: p.suddenDeath,
      acceptsOffers: p.acceptsOffers,
      shippingProfile: p.shippingProfile,
      showId: p.showId,
    };
  }
  return {
    images: [],
    title: '',
    description: '',
    condition: 'new',
    grade: '',
    format: presetShow ? 'auction' : 'buy_now',
    price: 0,
    compareAt: 0,
    quantity: 1,
    suddenDeath: false,
    acceptsOffers: true,
    shippingProfile: 'small',
    showId: presetShow,
  };
}

export function ListingForm() {
  const { colors } = useTheme();
  const qaOffset = useQaOffset();
  const params = useLocalSearchParams<{ id?: string; showId?: string }>();
  const listings = useSellerStore((s) => s.listings);
  const shows = useSellerStore((s) => s.shows);
  const updateListing = useSellerStore((s) => s.updateListing);
  const listingStatus = useSellerExtras((s) => s.listingStatus);
  const setListingStatus = useSellerExtras((s) => s.setListingStatus);
  const existing = params.id ? listings.find((p) => p.id === params.id) : undefined;
  const [initial] = useState(() => initialState(existing, params.showId));
  const [f, setF] = useState<FormState>(initial);
  const [submitted, setSubmitted] = useState<'draft' | 'publish' | null>(null);
  const [saving, setSaving] = useState(false);
  const [photoMenu, setPhotoMenu] = useState(false);
  const [samples, setSamples] = useState(false);
  const [photoIndex, setPhotoIndex] = useState<number | null>(null);

  if (params.id && !existing) {
    return (
      <Screen>
        <Header safeTop={MODAL_SAFE_TOP} back="close" title="Ürünü Düzenle" />
        <EmptyState icon="cube-outline" title="Ürün bulunamadı" message="Bu ürün silinmiş olabilir." actionLabel="Envantere dön" onAction={() => router.back()} />
      </Screen>
    );
  }

  const set = (patch: Partial<FormState>) => setF((cur) => ({ ...cur, ...patch }));
  const editing = !!existing;
  const status = existing ? (listingStatus[existing.id] ?? 'active') : undefined;
  const isDraft = !editing || status === 'draft';
  const category = getCategory(f.categoryId);
  const upcomingShows = shows.filter((s) => s.status !== 'ended');
  const shipping = SHIPPING_PRICES[f.shippingProfile];
  const fees = sellerFees(f.format === 'giveaway' ? 0 : f.price, shipping);
  const dirty = JSON.stringify(f) !== JSON.stringify(initial);

  const errors = {
    images: f.images.length === 0 ? 'En az 1 fotoğraf ekle — ürünün tamamı net görünmeli' : undefined,
    title: f.title.trim().length < 3 ? 'Başlık en az 3 karakter olmalı' : undefined,
    category: !f.categoryId ? 'Kategori seç' : undefined,
    subcategory: f.categoryId && !f.subcategoryId ? 'Alt kategori seç' : undefined,
    price: f.format !== 'giveaway' && f.price <= 0 ? (f.format === 'auction' ? 'Başlangıç fiyatı gir' : 'Fiyat gir') : undefined,
    compareAt: f.format === 'buy_now' && f.compareAt > 0 && f.compareAt <= f.price ? 'İndirim öncesi fiyat, satış fiyatından yüksek olmalı' : undefined,
    grade: f.condition === 'graded' && !f.grade.trim() ? 'Dereceyi gir (ör. PSA 10)' : undefined,
  };
  const publishOk = Object.values(errors).every((e) => !e);
  const showErr = (k: keyof typeof errors) => (submitted === 'publish' || (submitted === 'draft' && k === 'title') ? errors[k] : undefined);

  const close = () => {
    if (!dirty) {
      router.back();
      return;
    }
    Alert.alert('Değişiklikler kaydedilmedi', 'Çıkarsan yaptığın değişiklikler kaybolacak.', [
      { text: 'Düzenlemeye devam et', style: 'cancel' },
      { text: 'Çık', style: 'destructive', onPress: () => router.back() },
    ]);
  };

  const buildProduct = () => ({
    title: f.title.trim(),
    description: f.description.trim(),
    images: f.images,
    categoryId: f.categoryId ?? '',
    subcategoryId: f.subcategoryId,
    condition: f.condition,
    grade: f.condition === 'graded' ? f.grade.trim() : undefined,
    format: f.format,
    price: f.format === 'giveaway' ? 0 : f.price,
    compareAtPrice: f.format === 'buy_now' && f.compareAt > f.price ? f.compareAt : undefined,
    quantity: f.quantity,
    shippingProfile: f.shippingProfile,
    shippingCost: SHIPPING_PRICES[f.shippingProfile],
    suddenDeath: f.format === 'auction' && f.suddenDeath,
    acceptsOffers: f.format === 'buy_now' && f.acceptsOffers,
    showId: f.showId,
    tags: f.subcategoryId ? [f.subcategoryId] : [],
  });

  const save = (mode: 'draft' | 'publish' | 'update') => {
    const asDraft = mode === 'draft';
    setSubmitted(asDraft ? 'draft' : 'publish');
    if (asDraft ? !!errors.title : !publishOk) {
      haptic.warning();
      toast.warning(asDraft ? 'Taslak için en az bir başlık gir' : 'Eksik alanları tamamla');
      return;
    }
    setSaving(true);
    setTimeout(() => {
      const data = buildProduct();
      if (existing) {
        updateListing(existing.id, { ...data, quantity: Math.max(data.quantity, existing.sold) });
        if (mode === 'publish') setListingStatus(existing.id, 'active');
        if (data.showId !== existing.showId) assignListingsToShow([existing.id], data.showId);
        toast.success(mode === 'publish' ? 'Ürün yayınlandı 🎉' : 'Değişiklikler kaydedildi');
      } else {
        const product = createListingWithStatus(data, asDraft ? 'draft' : 'active');
        if (data.showId) assignListingsToShow([product.id], data.showId);
        const show = data.showId ? shows.find((s) => s.id === data.showId) : undefined;
        toast.success(asDraft ? 'Taslak kaydedildi' : show ? 'Ürün yayına eklendi 🎉' : 'Ürün yayınlandı 🎉');
      }
      haptic.success();
      setSaving(false);
      router.back();
    }, 450);
  };

  const remove = () => {
    if (!existing) return;
    if (existing.sold > 0) {
      Alert.alert('Satılmış ürün silinemez', 'Bu üründen satış yapıldığı için silinemez. Pasife alarak mağazandan kaldırabilirsin.', [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Pasife al',
          onPress: () => {
            setListingStatus(existing.id, 'inactive');
            toast('Ürün pasife alındı');
            router.back();
          },
        },
      ]);
      return;
    }
    Alert.alert('Ürünü sil', `"${existing.title}" kalıcı olarak silinsin mi?`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: () => {
          const id = existing.id;
          router.back();
          haptic.warning();
          toast('Ürün silindi', 'trash');
          setTimeout(() => deleteListings([id]), 350);
        },
      },
    ]);
  };

  const addPhotos = (uris: string[]) => {
    if (!uris.length) return;
    setF((cur) => ({ ...cur, images: [...cur.images, ...uris.filter((u) => !cur.images.includes(u))].slice(0, MAX_PHOTOS) }));
    haptic.light();
  };
  const remaining = MAX_PHOTOS - f.images.length;

  return (
    <Screen>
      <Header safeTop={MODAL_SAFE_TOP} back="close" onBack={close} title={editing ? 'Ürünü Düzenle' : 'Ürün Oluştur'} subtitle={editing && status === 'draft' ? 'Taslak' : undefined} border />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentOffset={qaOffset} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <FormSection title="Fotoğraflar" subtitle={`${f.images.length}/${MAX_PHOTOS} · İlk fotoğraf kapak olur`}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -SCREEN_PADDING }} contentContainerStyle={styles.photos}>
              {remaining > 0 ? (
                <PressableScale scaleTo={0.95} onPress={() => setPhotoMenu(true)} style={[styles.addPhoto, { borderColor: showErr('images') ? colors.danger : colors.border, backgroundColor: colors.surface }]} accessibilityLabel="Fotoğraf ekle">
                  <Icon name="camera" size={26} />
                  <Text variant="caption" color="textSecondary">
                    Fotoğraf ekle
                  </Text>
                </PressableScale>
              ) : null}
              {f.images.map((uri, i) => (
                <PressableScale key={uri} scaleTo={0.95} onPress={() => setPhotoIndex(i)} style={styles.photoWrap}>
                  <Thumb uri={uri} size={96} rounded={radius.md} />
                  {i === 0 ? (
                    <View style={[styles.cover, { backgroundColor: colors.inverse }]}>
                      <Text variant="caption" color={colors.onInverse}>
                        Kapak
                      </Text>
                    </View>
                  ) : null}
                  <PressableScale
                    scaleTo={0.85}
                    hitSlop={8}
                    onPress={() => set({ images: f.images.filter((u) => u !== uri) })}
                    style={[styles.remove, { backgroundColor: colors.inverse }]}
                    accessibilityLabel="Fotoğrafı kaldır">
                    <Icon name="close" size={14} color={colors.onInverse} />
                  </PressableScale>
                </PressableScale>
              ))}
            </ScrollView>
            {showErr('images') ? (
              <Text variant="footnote" color="danger">
                {showErr('images')}
              </Text>
            ) : (
              <Text variant="footnote" color="textSecondary">
                Ürünün gerçek fotoğraflarını kullan. Kusurlar varsa yakından çek.
              </Text>
            )}
          </FormSection>

          <FormSection title="Ürün bilgileri">
            <TextField
              label="Başlık"
              value={f.title}
              onChangeText={(v) => set({ title: v.slice(0, 80) })}
              placeholder="ör. Charizard VMAX 020/189 — PSA 10"
              maxLength={80}
              helper={`${f.title.length}/80 · Marka, model, beden gibi anahtar kelimeleri ekle`}
              error={showErr('title')}
            />
            <TextField
              label="Açıklama"
              value={f.description}
              onChangeText={(v) => set({ description: v.slice(0, 1000) })}
              placeholder="Ürünün durumu, ölçüleri, orijinalliği, kutusu/etiketi var mı…"
              multiline
              maxLength={1000}
              helper={`${f.description.length}/1000`}
            />
            <SelectField
              label="Kategori"
              placeholder="Kategori seç"
              value={f.categoryId}
              options={CATEGORIES.map((c) => ({ value: c.id, label: `${c.emoji}  ${c.name}` }))}
              searchable
              onChange={(v) => set({ categoryId: v, subcategoryId: undefined })}
              error={showErr('category')}
            />
            <SelectField
              label="Alt kategori"
              placeholder={category ? 'Alt kategori seç' : 'Önce kategori seç'}
              value={f.subcategoryId}
              options={category ? category.subcategories.map((s) => ({ value: s.id, label: s.name })) : []}
              disabled={!category}
              onChange={(v) => set({ subcategoryId: v })}
              error={showErr('subcategory')}
            />
          </FormSection>

          <FormSection title="Durum">
            <View style={styles.wrap}>
              {(Object.keys(CONDITION_LABELS) as Condition[]).map((c) => (
                <Chip key={c} label={CONDITION_LABELS[c]} selected={f.condition === c} onPress={() => set({ condition: c })} />
              ))}
            </View>
            {f.condition === 'graded' ? (
              <View style={{ gap: 10 }}>
                <TextField label="Derece" value={f.grade} onChangeText={(v) => set({ grade: v.slice(0, 20) })} placeholder="ör. PSA 10" autoCapitalize="characters" error={showErr('grade')} />
                <View style={styles.wrap}>
                  {GRADE_PRESETS.map((g) => (
                    <Chip key={g} label={g} size="sm" selected={f.grade === g} onPress={() => set({ grade: g })} />
                  ))}
                </View>
              </View>
            ) : null}
          </FormSection>

          <FormSection title="Satış formatı" subtitle="Açık artırma ve çekilişler canlı yayında yapılır; Hemen Al ürünleri mağazanda da satılır.">
            <Segmented
              options={(['auction', 'buy_now', 'giveaway'] as ListingFormat[]).map((k) => ({ key: k, label: FORMAT_LABELS[k] }))}
              value={f.format}
              onChange={(format) => set({ format })}
            />
            {f.format === 'auction' ? (
              <View style={{ gap: 10 }}>
                <MoneyField label="Başlangıç fiyatı" value={f.price} onChange={(price) => set({ price })} helper="Kabul edebileceğin en düşük tutar. ₺1 başlangıç izleyici çeker 🔥" error={showErr('price')} />
                <View style={styles.wrap}>
                  {[1, 10, 50, 100, 250].map((v) => (
                    <Chip key={v} label={formatTRY(v)} size="sm" selected={f.price === v} onPress={() => set({ price: v })} />
                  ))}
                </View>
                <ListRow
                  title="Ani Bitiş 💀"
                  subtitle="Süre uzamaz; sayaç sıfırlandığında son teklif kazanır"
                  switchValue={f.suddenDeath}
                  onSwitch={(suddenDeath) => set({ suddenDeath })}
                  style={styles.flushRow}
                />
                <Text variant="footnote" color="textSecondary">
                  Açık artırma süresini yayında başlatırken seçersin (5 sn – 5 dk).
                </Text>
              </View>
            ) : null}
            {f.format === 'buy_now' ? (
              <View style={{ gap: 10 }}>
                <MoneyField label="Fiyat" value={f.price} onChange={(price) => set({ price })} error={showErr('price')} />
                <MoneyField label="İndirim öncesi fiyat (isteğe bağlı)" value={f.compareAt} onChange={(compareAt) => set({ compareAt })} helper="Girersen ürün kartında üstü çizili gösterilir" error={showErr('compareAt')} />
                <ListRow
                  title="Fiyat önerilerini kabul et"
                  subtitle="Alıcılar sana fiyat önerebilir; kabul, karşı teklif ya da ret senin elinde"
                  switchValue={f.acceptsOffers}
                  onSwitch={(acceptsOffers) => set({ acceptsOffers })}
                  style={styles.flushRow}
                />
              </View>
            ) : null}
            {f.format === 'giveaway' ? (
              <Card style={{ backgroundColor: tint(colors.info, 0.08), borderColor: tint(colors.info, 0.25), gap: 6 }}>
                <View style={styles.inline}>
                  <Icon name="gift" size={18} color={colors.info} />
                  <Text variant="subhead" weight="700">
                    Çekiliş ürünü
                  </Text>
                </View>
                <Text variant="footnote" color="textSecondary">
                  Çekilişler yalnızca canlı yayında, en fazla 5 dakika sürer. Kazananın kargo ücreti ({formatTRY(shipping)}) bakiyenden düşülür. Katılım için alışveriş şartı yoktur.
                </Text>
              </Card>
            ) : null}
          </FormSection>

          <FormSection title="Adet" right={<Stepper value={f.quantity} onChange={(quantity) => set({ quantity })} min={Math.max(1, existing?.sold ?? 1)} max={999} />}>
            <Text variant="footnote" color="textSecondary">
              {existing && existing.sold > 0
                ? `${existing.sold} adet satıldı · stokta ${Math.max(0, f.quantity - existing.sold)} kaldı`
                : 'Aynı üründen birden fazla varsa ayrı ilan açma, adedi artır.'}
            </Text>
          </FormSection>

          <FormSection title="Kargo">
            <SelectField
              label="Kargo profili (paketli boyut)"
              value={f.shippingProfile}
              options={(Object.keys(SHIPPING_PROFILE_LABELS) as ShippingProfile[]).map((k) => ({ value: k, label: SHIPPING_PROFILE_LABELS[k], subtitle: `Alıcı öder: ${formatTRY(SHIPPING_PRICES[k])}` }))}
              onChange={(v) => set({ shippingProfile: v as ShippingProfile })}
            />
            <Text variant="footnote" color="textSecondary">
              Alıcının ödeyeceği kargo: <Text variant="footnote" weight="700">{formatTRY(shipping)}</Text> (KDV dahil). Aynı yayından alınan ürünler tek pakette birleşir.
            </Text>
          </FormSection>

          <FormSection title="Yayına ekle" subtitle="Ürünü planladığın bir canlı yayının mağazasına ekle">
            {upcomingShows.length ? (
              <SelectField
                value={f.showId ?? NO_SHOW}
                options={[
                  { value: NO_SHOW, label: 'Yayına ekleme', subtitle: f.format === 'buy_now' ? 'Mağazanda satışta kalır' : 'Envanterinde bekler' },
                  ...upcomingShows.map((s) => ({ value: s.id, label: s.title, subtitle: s.status === 'live' ? 'Şu an canlı' : formatShowTime(s.scheduledAt) })),
                ]}
                onChange={(v) => set({ showId: v === NO_SHOW ? undefined : v })}
              />
            ) : (
              <PressableScale scaleTo={0.98} onPress={() => router.push('/seller/schedule')} style={[styles.noShow, { backgroundColor: colors.surface }]}>
                <Icon name="calendar-outline" size={20} color="textSecondary" />
                <Text variant="callout" color="textSecondary" style={{ flex: 1 }}>
                  Planlanmış yayının yok.{' '}
                  <Text variant="callout" weight="700" color="accent">
                    Yayın planla
                  </Text>
                </Text>
              </PressableScale>
            )}
          </FormSection>

          {f.format !== 'giveaway' && f.price > 0 ? (
            <Card style={{ backgroundColor: colors.surface, borderColor: colors.surface }}>
              <Text variant="subhead" weight="700" style={{ marginBottom: 4 }}>
                Tahmini kazancın {f.format === 'auction' ? '(başlangıç fiyatından satılırsa)' : ''}
              </Text>
              <KeyValue label="Satış fiyatı" value={formatTRY(f.price)} />
              <KeyValue label="Komisyon (%8)" value={`-${formatTRY(fees.commission)}`} />
              <KeyValue label="Ödeme işlem ücreti" value={`-${formatTRY(fees.processing)}`} />
              <View style={[styles.hr, { backgroundColor: colors.border }]} />
              <KeyValue label="Net kazanç" value={formatTRY(fees.net)} strong tone="success" />
            </Card>
          ) : null}

          {editing ? (
            <Button title="Ürünü sil" variant="ghost" icon="trash-outline" onPress={remove} style={{ alignSelf: 'center' }} />
          ) : null}
        </ScrollView>
        <StickyFooter style={styles.footerRow}>
          {isDraft ? (
            <>
              <Button title={editing ? 'Taslağı kaydet' : 'Taslağa kaydet'} variant="secondary" size="lg" style={{ flex: 1 }} disabled={saving} onPress={() => save('draft')} />
              <Button title="Yayınla" size="lg" style={{ flex: 1 }} loading={saving} onPress={() => save('publish')} />
            </>
          ) : (
            <Button title="Değişiklikleri kaydet" size="lg" style={{ flex: 1 }} loading={saving} onPress={() => save('update')} />
          )}
        </StickyFooter>
      </KeyboardAvoidingView>

      <ActionSheet
        visible={photoMenu}
        onClose={() => setPhotoMenu(false)}
        title="Fotoğraf ekle"
        subtitle={`${remaining} fotoğraf daha ekleyebilirsin`}
        actions={[
          { label: 'Fotoğraf çek', icon: 'camera-outline', onPress: () => takePhoto([1, 1]).then((u) => addPhotos(u ? [u] : [])) },
          { label: 'Galeriden seç', icon: 'images-outline', onPress: () => pickFromLibrary({ limit: remaining }).then(addPhotos) },
          { label: 'Örnek fotoğraf seç', icon: 'sparkles-outline', subtitle: 'Kategori görsellerinden (simülatör için)', onPress: () => setSamples(true) },
        ]}
      />
      <SamplePhotoSheet key={f.categoryId ?? 'all'} visible={samples} onClose={() => setSamples(false)} initialCategoryId={f.categoryId} max={remaining} onPick={addPhotos} />
      <ActionSheet
        visible={photoIndex !== null}
        onClose={() => setPhotoIndex(null)}
        title="Fotoğraf"
        actions={
          photoIndex === null
            ? []
            : [
                {
                  label: 'Kapak fotoğrafı yap',
                  icon: 'star-outline',
                  disabled: photoIndex === 0,
                  onPress: () => {
                    const uri = f.images[photoIndex];
                    set({ images: [uri, ...f.images.filter((u) => u !== uri)] });
                  },
                },
                {
                  label: 'Sola taşı',
                  icon: 'arrow-back-outline',
                  disabled: photoIndex === 0,
                  onPress: () => {
                    const next = [...f.images];
                    [next[photoIndex - 1], next[photoIndex]] = [next[photoIndex], next[photoIndex - 1]];
                    set({ images: next });
                  },
                },
                { label: 'Kaldır', icon: 'trash-outline', destructive: true, onPress: () => set({ images: f.images.filter((_, i) => i !== photoIndex) }) },
              ]
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: SCREEN_PADDING, gap: 26, paddingBottom: 32 },
  photos: { paddingHorizontal: SCREEN_PADDING, gap: 10 },
  addPhoto: { width: 96, height: 96, borderRadius: radius.md, borderWidth: 1.5, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 4 },
  photoWrap: { width: 96, height: 96 },
  cover: { position: 'absolute', left: 6, bottom: 6, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  remove: { position: 'absolute', top: 5, right: 5, width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flushRow: { paddingHorizontal: 0 },
  noShow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: radius.md },
  hr: { height: StyleSheet.hairlineWidth, marginVertical: 6 },
  footerRow: { flexDirection: 'row' },
});
