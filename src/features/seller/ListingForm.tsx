/**
 * S83 — Ürün Oluştur / Düzenle (modal). ?id= düzenleme, ?showId= yayını önceden seç.
 * Fotoğraflar (8'e kadar), başlık, açıklama, kategori, durum, satış formatı ve fiyat, adet,
 * Uzatmasız (suddenDeath) / Fiyat önerisi, kargo profili ve kargoyu kim öder (alıcı öder / kargo dahil),
 * yayına ekle; Taslak / Yayınla / Sil. Yeni ilanda kargo seçimi Kargo Ayarları'ndaki varsayılandan gelir.
 *
 * Sahte ürün önlemleri (features/trust): başlık ve açıklamada yasaklı ifade ("replika", "A kalite"…)
 * yazıldığı anda uyarılır, yayımlama engellenir (taslak serbest). Riskli kategori / marka geçen
 * ilanlarda orijinallik belgesi + beyan istenir. Hak sahibi şikâyetiyle kaldırılan ilan dosya
 * kapanana kadar yeniden yayımlanamaz.
 * QA (yalnızca geliştirme): ?qa=proof belge bölümünü, ?qa=banned yasaklı ifade uyarısını dolu açar.
 */
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { CONDITION_LABELS, FORMAT_LABELS } from '@/components/cards/ProductCard';
import { Button, Chip, EmptyState, Header, Icon, ListRow, PressableScale, Screen, Segmented, SelectField, Text, TextField, toast } from '@/components/ui';
import { DEMO_COPY, DEMO_MODE } from '@/config/demo';
import { CATEGORIES, getCategory } from '@/data';
import { AUTHENTICITY_DECLARATION, authenticityRequirement, bannedMessage, IP_PROCESS, isSampleDoc, PROOF_KINDS, scanText } from '@/features/trust/counterfeit';
import { IpCaseSheet } from '@/features/trust/IpCaseSheet';
import { isIpLocked, RIGHT_TYPE_LABELS, useTrustStore, type IpCase } from '@/features/trust/store';
import { formatShowTime, formatTRY } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { SELLER_FEE_TEXT, sellerFees, SHIPPING_PRICES, SHIPPING_PROFILE_LABELS } from '@/lib/pricing';
import { useSellerStore } from '@/store/seller';
import { radius, SCREEN_PADDING, useTheme } from '@/theme';
import type { AuthenticityProof, Condition, ListingFormat, Product, ProofKind, ShippingProfile } from '@/types';

import { useQaOffset, useQaParam } from './qaSeed';
import { assignListingsToShow, createListingWithStatus, deleteListings } from './actions';
import { pickFromLibrary, SamplePhotoSheet, takePhoto } from './media';
import { useSellerExtras } from './store';
import { ActionSheet, Card, CheckRow, FormSection, KeyValue, MoneyField, OptionCard, StatusPill, Stepper, StickyFooter, Thumb, tint, MODAL_SAFE_TOP } from './ui';

const MAX_PHOTOS = 8;
const MAX_DOCS = 5;
const DOC_SIZE = 84;
const GRADE_PRESETS = ['PSA 10', 'PSA 9', 'BGS 9.5', 'CGC 9.8', 'PSA 8'];
const NO_SHOW = 'none';
const UNLINKED_DRAFT = 'Taslak kaydedildi; yasaklı ifade veya eksik belge nedeniyle yayına eklenmedi';
/** Demo örnek belge adları ("sample:Fatura-1.jpg"); simülatörde kamera / galeri yokken */
const SAMPLE_DOC_NAMES: Record<ProofKind, string> = { invoice: 'Fatura', receipt: 'Siparis-ozeti', certificate: 'Sertifika', dealer: 'Bayi-belgesi' };

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
  /** Kargo dahil: alıcıdan kargo alınmaz, etiket bedelini satıcı öder (çekilişte her zaman) */
  shippingIncluded: boolean;
  showId?: string;
  /** Orijinallik belgesi (alıcıya gösterilmez) */
  proofKind?: ProofKind;
  proofDocs: string[];
  proofDeclared: boolean;
};

/** Yalnızca geliştirme: ekran görüntüsü QA'sı için dolu başlangıç */
function qaPreset(qa: string | undefined): Partial<FormState> {
  if (qa === 'proof') return { title: 'Chanel Classic Flap omuz çantası', categoryId: 'bags', subcategoryId: 'luxury_bags', format: 'buy_now', price: 185000, proofKind: 'invoice', proofDocs: ['sample:Fatura-1.jpg'] };
  if (qa === 'banned') return { title: 'Çelik kordon saat replika', description: 'A kalite, orijinal kalitesinde.', categoryId: 'watches', subcategoryId: 'luxury_watches' };
  return {};
}

function initialState(p: Product | undefined, presetShow: string | undefined, defaultIncluded: boolean, qa?: string): FormState {
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
      shippingIncluded: !!p.shippingIncluded,
      showId: p.showId,
      proofKind: p.authenticity?.kind,
      proofDocs: p.authenticity?.docs ?? [],
      proofDeclared: !!p.authenticity,
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
    shippingIncluded: defaultIncluded,
    showId: presetShow,
    proofDocs: [],
    proofDeclared: false,
    ...qaPreset(qa),
  };
}

/** "a, b ve c" */
function joinTr(items: string[]): string {
  return items.length > 1 ? `${items.slice(0, -1).join(', ')} ve ${items[items.length - 1]}` : (items[0] ?? '');
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
  // Yeni ilanda kargo seçimi Kargo Ayarları'ndaki varsayılandan gelir
  const defaultIncluded = useSellerExtras((s) => s.shipping.costMode === 'seller');
  const ipCase = useTrustStore((s) => (params.id ? s.cases[params.id] : undefined));
  const qa = useQaParam();
  const existing = params.id ? listings.find((p) => p.id === params.id) : undefined;
  const [initial] = useState(() => initialState(existing, params.showId, defaultIncluded, qa));
  const [f, setF] = useState<FormState>(initial);
  const [submitted, setSubmitted] = useState<'draft' | 'publish' | null>(null);
  const [saving, setSaving] = useState(false);
  const [photoMenu, setPhotoMenu] = useState(false);
  const [samples, setSamples] = useState(false);
  const [photoIndex, setPhotoIndex] = useState<number | null>(null);
  const [docMenu, setDocMenu] = useState(false);
  const [caseOpen, setCaseOpen] = useState(false);

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
  // Çekiliş ödülünün kargosunu her zaman satıcı öder
  const giveaway = f.format === 'giveaway';
  const included = giveaway || f.shippingIncluded;
  const fees = sellerFees(giveaway ? 0 : f.price);
  const net = included ? Math.round((fees.net - shipping) * 100) / 100 : fees.net;
  const dirty = JSON.stringify(f) !== JSON.stringify(initial);
  // Hak sahibi şikâyeti dosyası açıkken ilan aktif olamaz (düzenleme serbest)
  const ipLocked = isIpLocked(ipCase);

  // Yasaklı ifadeler yazıldığı anda gösterilir (gönderimi beklemeden); taslak kaydı serbest
  const titleBanned = bannedMessage(scanText([f.title], f.categoryId).banned);
  const descriptionBanned = bannedMessage(scanText([f.description], f.categoryId).banned);
  const hasBanned = !!(titleBanned || descriptionBanned);

  // Orijinallik belgesi: riskli kategori / marka / "ihraç fazlası" iddiasında zorunlu
  const req = authenticityRequirement({ categoryId: f.categoryId, subcategoryId: f.subcategoryId, title: f.title, description: f.description });
  // Örnek (sample:) belgeler yalnızca demoda belge sayılır
  const realDocs = f.proofDocs.filter((u) => DEMO_MODE || !isSampleDoc(u));
  const proofComplete = !!f.proofKind && realDocs.length > 0 && f.proofDeclared;
  const showProof = req.required || !!existing?.authenticity || !!f.proofKind || f.proofDocs.length > 0;
  const proofMissing = [!f.proofKind && 'belge türünü seç', !realDocs.length && 'en az bir belge ekle', !f.proofDeclared && 'orijinallik beyanını onayla'].filter((s): s is string => !!s);
  const proofKindInfo = PROOF_KINDS.find((k) => k.key === f.proofKind);
  const docsRemaining = MAX_DOCS - f.proofDocs.length;

  const errors = {
    images: f.images.length === 0 ? 'Yayınlamak için en az bir fotoğraf gerekli' : undefined,
    title: f.title.trim().length < 3 ? 'Başlık en az 3 karakter olmalı' : undefined,
    category: !f.categoryId ? 'Kategori seç' : undefined,
    subcategory: f.categoryId && !f.subcategoryId ? 'Alt kategori seç' : undefined,
    price: f.format !== 'giveaway' && f.price <= 0 ? (f.format === 'auction' ? 'Başlangıç fiyatı gir' : 'Fiyat gir') : undefined,
    compareAt: f.format === 'buy_now' && f.compareAt > 0 && f.compareAt <= f.price ? 'İndirim öncesi fiyat, satış fiyatından yüksek olmalı' : undefined,
    grade: f.condition === 'graded' && !f.grade.trim() ? 'Dereceyi gir (ör. PSA 10)' : undefined,
    authenticity: req.required && !proofComplete ? `Yayınlamak için ${joinTr(proofMissing)}` : undefined,
  };
  const publishOk = Object.values(errors).every((e) => !e);
  // Yasaklı ifade / eksik belge varken taslak bile yayına bağlanmaz (canlı yayında satışa çıkmasın)
  const showBlocked = hasBanned || !!errors.authenticity;
  const showErr = (k: keyof typeof errors) => (submitted === 'publish' || (submitted === 'draft' && k === 'title') ? errors[k] : undefined);

  const leave = (go: () => void) => {
    if (!dirty) {
      go();
      return;
    }
    Alert.alert('Değişiklikler kaydedilmedi', 'Çıkarsan yaptığın değişiklikler kaybolacak.', [
      { text: 'Düzenlemeye devam et', style: 'cancel' },
      { text: 'Çık', style: 'destructive', onPress: go },
    ]);
  };
  const close = () => leave(() => router.back());

  /** Belge tamamsa yazılır; tür ve belgeler değişmediyse ilk beyan zamanı korunur */
  const buildProof = (): AuthenticityProof | undefined => {
    if (!proofComplete || !f.proofKind) return undefined;
    const prev = existing?.authenticity;
    const unchanged = prev && prev.kind === f.proofKind && prev.docs.join('\n') === f.proofDocs.join('\n');
    return { kind: f.proofKind, docs: f.proofDocs, declaredAt: prev && unchanged ? prev.declaredAt : new Date().toISOString() };
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
    // Kargo dahil ilanda alıcıya kargo ücreti yansımaz; etiket bedeli satıcının kazancından düşer
    shippingIncluded: included,
    shippingCost: included ? 0 : SHIPPING_PRICES[f.shippingProfile],
    suddenDeath: f.format === 'auction' && f.suddenDeath,
    acceptsOffers: f.format === 'buy_now' && f.acceptsOffers,
    // Şikâyet dosyası açıkken ya da yasaklı ifade / eksik belge varken yayına eklenemez
    showId: ipLocked || showBlocked ? undefined : f.showId,
    tags: f.subcategoryId ? [f.subcategoryId] : [],
    authenticity: buildProof(),
  });

  const save = (mode: 'draft' | 'publish' | 'update') => {
    const asDraft = mode === 'draft';
    setSubmitted(asDraft ? 'draft' : 'publish');
    if (mode === 'publish' && ipLocked) {
      haptic.warning();
      toast.warning('Şikâyet dosyası kapanana kadar yayımlanamaz');
      return;
    }
    if (!asDraft && hasBanned) {
      haptic.warning();
      toast.warning('Yasaklı ifadeleri kaldır');
      return;
    }
    if (asDraft ? !!errors.title : !publishOk) {
      haptic.warning();
      toast.warning(asDraft ? 'Taslak için en az bir başlık gir' : 'Eksik alanları tamamla');
      return;
    }
    setSaving(true);
    setTimeout(() => {
      const data = buildProduct();
      // Seçili yayın kontrol yüzünden düştüyse satıcıya söylenir
      const unlinked = asDraft && !ipLocked && !!f.showId && !data.showId;
      if (existing) {
        updateListing(existing.id, { ...data, quantity: Math.max(data.quantity, existing.sold) });
        if (mode === 'publish' && !ipLocked) setListingStatus(existing.id, 'active');
        if (data.showId !== existing.showId) assignListingsToShow([existing.id], data.showId);
        if (unlinked) toast.warning(UNLINKED_DRAFT);
        else toast.success(mode === 'publish' ? 'Ürün yayınlandı 🎉' : 'Değişiklikler kaydedildi');
      } else {
        const product = createListingWithStatus(data, asDraft ? 'draft' : 'active');
        if (data.showId) assignListingsToShow([product.id], data.showId);
        const show = data.showId ? shows.find((s) => s.id === data.showId) : undefined;
        if (unlinked) toast.warning(UNLINKED_DRAFT);
        else toast.success(asDraft ? 'Taslak kaydedildi' : show ? 'Ürün yayına eklendi 🎉' : 'Ürün yayınlandı 🎉');
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

  const addDocs = (uris: string[]) => {
    if (!uris.length) return;
    setF((cur) => ({ ...cur, proofDocs: [...cur.proofDocs, ...uris.filter((u) => !cur.proofDocs.includes(u))].slice(0, MAX_DOCS) }));
    haptic.light();
  };
  const addSampleDoc = () => {
    const base = f.proofKind ? SAMPLE_DOC_NAMES[f.proofKind] : 'Belge';
    let n = 1;
    while (f.proofDocs.includes(`sample:${base}-${n}.jpg`)) n++;
    addDocs([`sample:${base}-${n}.jpg`]);
  };

  return (
    <Screen>
      <Header safeTop={MODAL_SAFE_TOP} back="close" onBack={close} title={editing ? 'Ürünü Düzenle' : 'Ürün Oluştur'} subtitle={editing && status === 'draft' ? 'Taslak' : undefined} border />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentOffset={qaOffset} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {ipCase && ipLocked ? <IpLockBanner ipCase={ipCase} onObject={() => setCaseOpen(true)} /> : null}

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
                Katalog görseli yerine kendi çektiğin fotoğrafları kullan; çizik, leke gibi kusurları ayrı bir karede göster.
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
              error={titleBanned ?? showErr('title')}
            />
            <TextField
              label="Açıklama"
              value={f.description}
              onChangeText={(v) => set({ description: v.slice(0, 1000) })}
              placeholder="Ürünün durumu, ölçüleri, orijinalliği, kutusu/etiketi var mı…"
              multiline
              maxLength={1000}
              helper={`${f.description.length}/1000`}
              error={descriptionBanned}
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

          {showProof ? (
            <FormSection title="Orijinallik belgesi" subtitle={req.required ? 'Bu ilanı yayımlamak için gerekli' : 'Bu ilan için zorunlu değil; eklediğin belge saklanır'}>
              <Card style={{ backgroundColor: tint(colors.info, 0.08), borderColor: tint(colors.info, 0.25), gap: 8 }}>
                <View style={styles.inline}>
                  <Icon name="shield-checkmark" size={18} color={colors.info} />
                  <Text variant="subhead" weight="700" style={{ flex: 1 }}>
                    {req.required ? 'Bu ilan neden belge istiyor?' : 'Belge neden saklanıyor?'}
                  </Text>
                </View>
                {req.reasons.length ? (
                  <View style={styles.wrap}>
                    {req.reasons.map((r) => (
                      <StatusPill key={r} label={r} tone="info" />
                    ))}
                  </View>
                ) : null}
                <Text variant="footnote" color="textSecondary">
                  {req.required ? 'Taklidi sık görülen kategori ve markalarda ürünün orijinal olduğunu gösteren bir belge istiyoruz. ' : ''}
                  Belge alıcılara gösterilmez. Bir hak sahibi bu ilan için şikâyette bulunursa itirazını bu belgeyle yaparsın.
                  {DEMO_MODE ? ' Demo: Belgeler yalnızca bu cihazda tutulur ve incelenmez.' : ''}
                </Text>
              </Card>

              <View style={{ gap: 8 }}>
                <Text variant="subhead" weight="600" color="textSecondary">
                  Belge türü
                </Text>
                <View style={styles.wrap}>
                  {PROOF_KINDS.map((k) => (
                    <Chip key={k.key} label={k.label} selected={f.proofKind === k.key} onPress={() => set({ proofKind: k.key })} />
                  ))}
                </View>
                <Text variant="footnote" color="textSecondary">
                  {proofKindInfo ? proofKindInfo.hint : 'Elindeki belgeye en uygun türü seç.'}
                </Text>
              </View>

              <View style={{ gap: 8 }}>
                <Text variant="subhead" weight="600" color="textSecondary">
                  Belgeler · {f.proofDocs.length}/{MAX_DOCS}
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -SCREEN_PADDING }} contentContainerStyle={styles.photos}>
                  {docsRemaining > 0 ? (
                    <PressableScale
                      scaleTo={0.95}
                      onPress={() => setDocMenu(true)}
                      style={[styles.addDoc, { borderColor: showErr('authenticity') && !realDocs.length ? colors.danger : colors.border, backgroundColor: colors.surface }]}
                      accessibilityLabel="Belge ekle">
                      <Icon name="document-attach-outline" size={24} />
                      <Text variant="caption" color="textSecondary">
                        Belge ekle
                      </Text>
                    </PressableScale>
                  ) : null}
                  {f.proofDocs.map((uri) => (
                    <View key={uri} style={styles.docWrap}>
                      {isSampleDoc(uri) ? (
                        <View style={[styles.sampleDoc, { backgroundColor: colors.surface, borderColor: colors.border }]} accessibilityLabel={`Örnek belge ${sampleDocName(uri)}`}>
                          <Icon name="document-text-outline" size={26} color="textSecondary" />
                          <Text variant="caption" color="textSecondary" align="center" numberOfLines={2}>
                            {sampleDocName(uri)}
                          </Text>
                        </View>
                      ) : (
                        <Thumb uri={uri} size={DOC_SIZE} rounded={radius.md} />
                      )}
                      <PressableScale
                        scaleTo={0.85}
                        hitSlop={8}
                        onPress={() => set({ proofDocs: f.proofDocs.filter((u) => u !== uri) })}
                        style={[styles.remove, { backgroundColor: colors.inverse }]}
                        accessibilityLabel="Belgeyi kaldır">
                        <Icon name="close" size={14} color={colors.onInverse} />
                      </PressableScale>
                    </View>
                  ))}
                </ScrollView>
                <Text variant="footnote" color="textSecondary">
                  Ürün adı, satıcı ve tarih okunabilir olsun; belgedeki ilgisiz kişisel bilgileri kapatabilirsin.
                </Text>
              </View>

              <CheckRow checked={f.proofDeclared} onPress={() => set({ proofDeclared: !f.proofDeclared })} label={AUTHENTICITY_DECLARATION} />
              {showErr('authenticity') ? (
                <Text variant="footnote" color="danger">
                  {showErr('authenticity')}
                </Text>
              ) : null}
            </FormSection>
          ) : null}

          <FormSection title="Satış formatı" subtitle="Açık artırma ve çekilişler canlı yayında yapılır; Hemen Al ürünleri mağazanda da satılır.">
            <Segmented
              options={(['auction', 'buy_now', 'giveaway'] as ListingFormat[]).map((k) => ({ key: k, label: FORMAT_LABELS[k] }))}
              value={f.format}
              onChange={(format) => set({ format })}
            />
            {f.format === 'auction' ? (
              <View style={{ gap: 10 }}>
                <MoneyField label="Başlangıç fiyatı" value={f.price} onChange={(price) => set({ price })} helper="Mezat bu tutardan açılır, daha aşağıya satılmaz. Düşük bir açılış teklif yarışını hızlandırabilir." error={showErr('price')} />
                <View style={styles.wrap}>
                  {[1, 10, 50, 100, 250].map((v) => (
                    <Chip key={v} label={formatTRY(v)} size="sm" selected={f.price === v} onPress={() => set({ price: v })} />
                  ))}
                </View>
                <ListRow
                  icon="flag-outline"
                  title="Uzatmasız"
                  subtitle="Açıkken son anda gelen teklifler sayaca ek süre kazandırmaz; sayaç sıfırlandığında önde olan kazanır"
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
                  Çekilişi yayın sırasında başlatırsın, 5 dakikaya kadar açık kalır. Ödülü kazanana gönderme bedelini ({formatTRY(shipping)}) sen karşılarsın; tutar satış kazancından mahsup edilir. Katılım için alışveriş şartı yoktur.{DEMO_MODE ? ` ${DEMO_COPY.giveaway}` : ''}
                </Text>
              </Card>
            ) : null}
          </FormSection>

          <FormSection title="Adet" right={<Stepper value={f.quantity} onChange={(quantity) => set({ quantity })} min={Math.max(1, existing?.sold ?? 1)} max={999} />}>
            <Text variant="footnote" color="textSecondary">
              {existing && existing.sold > 0
                ? `${existing.sold} adet satıldı · stokta ${Math.max(0, f.quantity - existing.sold)} kaldı`
                : 'Elinde aynı üründen birkaç tane varsa hepsini bu ilanda topla; her satışta stok bir azalır.'}
            </Text>
          </FormSection>

          <FormSection title="Kargo">
            <SelectField
              label="Paket boyutu"
              value={f.shippingProfile}
              options={(Object.keys(SHIPPING_PROFILE_LABELS) as ShippingProfile[]).map((k) => ({ value: k, label: SHIPPING_PROFILE_LABELS[k], subtitle: `Kargo bedeli: ${formatTRY(SHIPPING_PRICES[k])}` }))}
              onChange={(v) => set({ shippingProfile: v as ShippingProfile })}
            />
            {giveaway ? null : (
              <View style={{ gap: 8 }}>
                <Text variant="subhead" weight="600" color="textSecondary">
                  Kargoyu kim öder?
                </Text>
                <OptionCard
                  icon="person-outline"
                  title="Alıcı öder"
                  subtitle={`+${formatTRY(shipping)} alıcının siparişine eklenir`}
                  selected={!f.shippingIncluded}
                  onPress={() => set({ shippingIncluded: false })}
                />
                <OptionCard
                  icon="gift-outline"
                  title="Kargo dahil (ben öderim)"
                  subtitle={`Alıcıdan kargo alınmaz; ${formatTRY(shipping)} etiket bedeli kazancından düşer`}
                  selected={f.shippingIncluded}
                  onPress={() => set({ shippingIncluded: true })}
                />
              </View>
            )}
            <Text variant="footnote" color="textSecondary">
              {giveaway
                ? `Çekiliş ödülünün kargosunu sen ödersin (${formatTRY(shipping)}, KDV dahil); kazanandan kargo ücreti alınmaz.`
                : f.shippingIncluded
                  ? `Ürün sayfasında “Kargo dahil” yazar; ${formatTRY(shipping)} KDV dahildir.`
                  : `Kargo ücreti ${formatTRY(shipping)}, KDV dahildir. Yayına ücretsiz kargo eşiği koyduysan eşik ve üzerindeki alımlarda kargoyu sen ödersin.`}{' '}
              Alıcı aynı yayından başka ürün de alırsa hepsi tek pakete girer; paketin kargosunu en büyük ürün belirler.
            </Text>
          </FormSection>

          <FormSection title="Yayına ekle" subtitle="Ürünü planladığın bir canlı yayının mağazasına ekle">
            {ipLocked ? (
              <Text variant="footnote" color="textSecondary">
                Şikâyet dosyası kapanana kadar bu ürün bir yayına eklenemez.
              </Text>
            ) : upcomingShows.length ? (
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
              <KeyValue label={SELLER_FEE_TEXT.commissionLabel} value={`-${formatTRY(fees.commission)}`} />
              <KeyValue label={SELLER_FEE_TEXT.cardFeeLabel} value={`-${formatTRY(fees.cardFee)}`} />
              {included ? <KeyValue label="Kargo (sen ödersin)" value={`-${formatTRY(shipping)}`} /> : null}
              <View style={[styles.hr, { backgroundColor: colors.border }]} />
              <KeyValue label="Net kazanç" value={formatTRY(net)} strong tone={net >= 0 ? 'success' : 'danger'} />
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
              <Button title="Yayınla" size="lg" style={{ flex: 1 }} loading={saving} disabled={ipLocked} onPress={() => save('publish')} />
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
      <ActionSheet
        visible={docMenu}
        onClose={() => setDocMenu(false)}
        title="Belge ekle"
        subtitle={`${docsRemaining} belge daha ekleyebilirsin`}
        actions={[
          { label: 'Fotoğraf çek', icon: 'camera-outline', onPress: () => takePhoto([3, 4]).then((u) => addDocs(u ? [u] : [])) },
          { label: 'Galeriden seç', icon: 'images-outline', onPress: () => pickFromLibrary({ limit: docsRemaining }).then(addDocs) },
          ...(DEMO_MODE ? [{ label: 'Örnek belge ekle', icon: 'document-text-outline' as const, subtitle: 'Simülatör için (demo)', onPress: addSampleDoc }] : []),
        ]}
      />
      <IpCaseSheet listingId={caseOpen && existing ? existing.id : null} onClose={() => setCaseOpen(false)} />
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

/** Hak sahibi şikâyetiyle kaldırılan ilan: dosya kapanana kadar yeniden yayımlanamaz */
function IpLockBanner({ ipCase, onObject }: { ipCase: IpCase; onObject: () => void }) {
  const { colors } = useTheme();
  const removed = ipCase.status === 'removed';
  const tone = removed ? colors.danger : colors.info;
  return (
    <Card style={{ backgroundColor: tint(tone, 0.08), borderColor: tint(tone, 0.3), gap: 8 }}>
      <View style={styles.inline}>
        <Icon name={removed ? 'shield-outline' : 'hourglass-outline'} size={18} color={tone} />
        <Text variant="subhead" weight="700" style={{ flex: 1 }}>
          {removed ? 'İlan yayından kaldırıldı' : 'İtirazın inceleniyor…'}
        </Text>
      </View>
      <Text variant="footnote" color="textSecondary">
        {removed
          ? `Bu ilan hak sahibi şikâyetiyle (${ipCase.complaintNo}) yayından kaldırıldı. Belgeyle itiraz edip sonuç alana kadar yeniden yayımlanamaz.`
          : `Belgeler itirazının açıkça haklı olduğunu gösterirse ilan en geç ${IP_PROCESS.reinstateHours} saat içinde yeniden yayına alınır; o zamana kadar yayımlanamaz.${DEMO_MODE ? ' Demo: sonuç birkaç saniye içinde gelir.' : ''}`}
      </Text>
      <Text variant="footnote" color="textTertiary">
        {RIGHT_TYPE_LABELS[ipCase.rightType]} · {ipCase.rightHolder} · {ipCase.complaintNo}
      </Text>
      <Text variant="footnote" color="textSecondary">
        Düzenlemelerini kaydedebilirsin; ilan bu süre boyunca pasif kalır.
      </Text>
      {removed ? <Button title="Belgeyle itiraz et" icon="document-attach-outline" variant="secondary" size="sm" onPress={onObject} style={{ alignSelf: 'flex-start', marginTop: 2 }} /> : null}
    </Card>
  );
}

/** "sample:Fatura-1.jpg" → "Fatura-1.jpg" */
function sampleDocName(uri: string): string {
  return uri.slice('sample:'.length);
}

const styles = StyleSheet.create({
  content: { padding: SCREEN_PADDING, gap: 26, paddingBottom: 32 },
  photos: { paddingHorizontal: SCREEN_PADDING, gap: 10 },
  addPhoto: { width: 96, height: 96, borderRadius: radius.md, borderWidth: 1.5, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 4 },
  photoWrap: { width: 96, height: 96 },
  cover: { position: 'absolute', left: 6, bottom: 6, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  remove: { position: 'absolute', top: 5, right: 5, width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  addDoc: { width: DOC_SIZE, height: DOC_SIZE, borderRadius: radius.md, borderWidth: 1.5, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 4 },
  docWrap: { width: DOC_SIZE, height: DOC_SIZE },
  sampleDoc: { flex: 1, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center', gap: 4, paddingHorizontal: 6 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flushRow: { paddingHorizontal: 0 },
  noShow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: radius.md },
  hr: { height: StyleSheet.hairlineWidth, marginVertical: 6 },
  footerRow: { flexDirection: 'row' },
});
