/**
 * Hak sahibi başvurusu (fikri mülkiyet ihlali bildirimi): marka, tasarım, patent ya da telif hakkı
 * sahibinin veya vekilinin, hakkını ihlal eden ilanı bildirdiği form (6563 md. 9/3,
 * ETAHS Yönetmeliği md. 12/1). Hak sahibinin Mezatonline hesabı olması gerekmez; misafir de başvurur.
 *
 * Demo: başvuru yalnızca bu cihazda tutulur, kimseye gönderilmez ve ilan kaldırılmaz. Kimlik numarası
 * cihaza maskeli (maskId), belgeler yalnızca sayı olarak (docCount) yazılır.
 *
 * Rota parametreleri: ?productId=<id> şikâyet edilen ilanı önceden seçer (ürün sayfasındaki Şikayet et'ten gelir).
 * QA (yalnızca geliştirme): ?qa=filled örnek bilgilerle doldurur, ?qa=errors boş formda hataları gösterir,
 * ?qa=done örnek başvuruyu gönderip sonuç görünümünü açar.
 */
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View, type LayoutChangeEvent, type ScrollViewInstance, type StyleProp, type TextStyle } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Chip, Header, Icon, IconButton, PressableScale, Screen, Segmented, showAlert, Text, TextField, toast } from '@/components/ui';
import { DEMO_MODE } from '@/config/demo';
import { getProduct, getUser } from '@/data';
import { InfoNote, MenuRow } from '@/features/account/ui';
import { useQaParams } from '@/features/account/qa';
import { isValidTckn } from '@/features/seller/logic';
import { pickFromLibrary, takePhoto } from '@/features/seller/media';
import { ActionSheet, Card, CheckRow, FormSection, KeyValue, StatusPill, Thumb, tint } from '@/features/seller/ui';
import { formatDateTime } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { radius, SCREEN_PADDING, useTheme } from '@/theme';
import type { Product } from '@/types';

import { IP_PROCESS, isSampleDoc } from './counterfeit';
import { maskId, RIGHT_TYPE_LABELS, useTrustStore, type IpComplaint, type RightType } from './store';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const REASON_MIN = 30;
const REASON_MAX = 2000;
const MAX_DOCS = 6;
const RIGHT_TYPES = Object.keys(RIGHT_TYPE_LABELS) as RightType[];

const LIABILITY_DECLARATION = 'Belgelerin gerçeğe aykırı çıkması hâlinde doğacak zarardan sorumlu olduğumu kabul ederim.';
const ACCURACY_DECLARATION = 'Bu başvurudaki bilgilerin doğru olduğunu ve hak sahibi ya da onun yetkili vekili olduğumu beyan ederim.';

type Applicant = IpComplaint['applicant'];

type Draft = {
  applicant: Applicant;
  name: string;
  rightHolder: string;
  /** Yalnızca rakamlar (10 hane VKN ya da 11 hane TCKN); cihaza maskeli yazılır */
  idNo: string;
  email: string;
  /** Başında 0 olmadan 10 hane */
  phone: string;
  rightType: RightType | null;
  registrationNo: string;
  /** Ürün seçili değilse: ilan bağlantısı ya da başlığı */
  targetText: string;
  reason: string;
  /** Yerel görsel URI'leri ya da demo örnek belgeleri ("sample:<ad>") — cihaza yazılmaz */
  docs: string[];
  accurate: boolean;
  liability: boolean;
};

const EMPTY: Draft = {
  applicant: 'owner',
  name: '',
  rightHolder: '',
  idNo: '',
  email: '',
  phone: '',
  rightType: null,
  registrationNo: '',
  targetText: '',
  reason: '',
  docs: [],
  accurate: false,
  liability: false,
};

/** Geliştirme / QA: örnek başvuru (gerçek bir kişi ya da marka değildir) */
function sampleDraft(applicant: Applicant): Draft {
  const agent = applicant === 'agent';
  return {
    applicant,
    name: agent ? 'Örnek Hukuk Bürosu (demo)' : 'Örnek Marka A.Ş. (demo)',
    rightHolder: agent ? 'Örnek Marka A.Ş. (demo)' : '',
    idNo: '1234567890',
    email: 'hukuk@ornekmarka.example',
    phone: '5321234567',
    rightType: 'trademark',
    registrationNo: '2023/123456',
    targetText: 'Örnek ilan başlığı (demo)',
    reason: 'İlandaki ürün tescilli markamızı taşıyor ancak yetkili satıcı ağımızdan gelmiyor; logo, etiket ve ambalaj orijinal ürünle uyuşmuyor.',
    docs: agent ? ['sample:Tescil belgesi', 'sample:Vekaletname'] : ['sample:Tescil belgesi', 'sample:İlan ekran görüntüsü'],
    accurate: true,
    liability: true,
  };
}

type Field = 'name' | 'rightHolder' | 'idNo' | 'email' | 'phone' | 'rightType' | 'registrationNo' | 'target' | 'reason' | 'docs' | 'accurate' | 'liability';
type Errors = Partial<Record<Field, string>>;
type Section = 'applicant' | 'contact' | 'right' | 'target' | 'evidence' | 'declaration';

const SECTION_ORDER: Section[] = ['applicant', 'contact', 'right', 'target', 'evidence', 'declaration'];
const SECTION_OF: Record<Field, Section> = {
  name: 'applicant',
  rightHolder: 'applicant',
  idNo: 'applicant',
  email: 'contact',
  phone: 'contact',
  rightType: 'right',
  registrationNo: 'right',
  target: 'target',
  reason: 'evidence',
  docs: 'evidence',
  accurate: 'declaration',
  liability: 'declaration',
};

/** Telif hakkı tescil gerektirmez (FSEK); marka, tasarım ve patentte TÜRKPATENT numarası istenir */
const needsRegistration = (t: RightType | null) => t !== 'copyright';

function validate(d: Draft, hasProduct: boolean): Errors {
  const agent = d.applicant === 'agent';
  const e: Errors = {};
  if (d.name.trim().length < 3) e.name = agent ? 'Adını soyadını ya da büro unvanını yaz' : 'Adını soyadını ya da şirket unvanını yaz';
  if (agent && d.rightHolder.trim().length < 3) e.rightHolder = 'Temsil ettiğin hak sahibini yaz';
  if (d.idNo.length === 11) {
    if (!isValidTckn(d.idNo)) e.idNo = 'Geçersiz T.C. kimlik no';
  } else if (d.idNo.length !== 10) e.idNo = 'T.C. kimlik no 11, vergi no 10 haneli olmalı';
  if (!EMAIL_RE.test(d.email.trim())) e.email = 'Geçerli bir e-posta adresi yaz';
  if (!/^[2-5]\d{9}$/.test(d.phone)) e.phone = 'Telefonu başında 0 olmadan 10 hane yaz';
  if (!d.rightType) e.rightType = 'Hak türünü seç';
  else if (needsRegistration(d.rightType) && d.registrationNo.trim().length < 3) e.registrationNo = 'Tescil ya da başvuru numarasını yaz';
  if (!hasProduct && d.targetText.trim().length < 5) e.target = 'İlanın bağlantısını ya da başlığını yaz';
  const reasonLen = d.reason.trim().length;
  if (reasonLen < REASON_MIN) e.reason = `Gerekçeni biraz daha ayrıntılı yaz (en az ${REASON_MIN} karakter, şu an ${reasonLen})`;
  // Demo kapalıyken örnek belgeler gerçek belge yerine sayılmaz
  const docCount = d.docs.filter((u) => DEMO_MODE || !isSampleDoc(u)).length;
  if (agent && docCount < 2) e.docs = `Vekil başvurusunda ${d.rightType === 'copyright' ? 'eser sahipliğini gösteren belgeyle' : 'tescil belgesiyle'} birlikte vekaletnameyi de ekle (en az 2 belge)`;
  else if (docCount < 1) e.docs = 'Hak sahipliğini gösteren en az bir belge ekle';
  if (!d.accurate) e.accurate = 'Başvurmak için bu beyanı onaylaman gerekiyor';
  if (!d.liability) e.liability = 'Başvurmak için bu beyanı onaylaman gerekiyor';
  return e;
}

/** Cihaza yazılacak kayıt: kimlik no maskeli, belgelerin yalnızca sayısı */
function toComplaint(d: Draft, product: Product | undefined): Omit<IpComplaint, 'id' | 'number' | 'createdAt' | 'status'> {
  return {
    applicant: d.applicant,
    name: d.name.trim(),
    rightHolder: d.applicant === 'agent' ? d.rightHolder.trim() : undefined,
    idMasked: maskId(d.idNo),
    email: d.email.trim(),
    phone: d.phone,
    rightType: d.rightType ?? 'trademark',
    registrationNo: d.registrationNo.trim(),
    target: product ? { productId: product.id, text: product.title } : { text: d.targetText.trim() },
    reason: d.reason.trim(),
    docCount: d.docs.length,
  };
}

/** Sıradaki demo örnek belgesinin adı (eksik olan ilk belge) */
function nextSampleName(d: Draft): string {
  const ownership = d.rightType === 'copyright' ? 'Eser sahipliği belgesi' : 'Tescil belgesi';
  const names = d.applicant === 'agent' ? [ownership, 'Vekaletname', 'İlan ekran görüntüsü', 'Test alımı faturası'] : [ownership, 'İlan ekran görüntüsü', 'Test alımı faturası'];
  return names.find((n) => !d.docs.includes(`sample:${n}`)) ?? `Ek belge ${d.docs.length + 1}`;
}

/** "5321234567" → "532 123 45 67" */
function groupPhone(digits: string): string {
  return [digits.slice(0, 3), digits.slice(3, 6), digits.slice(6, 8), digits.slice(8, 10)].filter(Boolean).join(' ');
}

function FieldError({ text, style }: { text?: string; style?: StyleProp<TextStyle> }) {
  if (!text) return null;
  return (
    <Text variant="footnote" color="danger" style={style}>
      {text}
    </Text>
  );
}

// ─── Süreç adımları ──────────────────────────────────────────────────────────

const PROCESS_STEPS = [
  `Usulüne uygun başvuruda ilan en geç ${IP_PROCESS.takedownHours} saat içinde yayından kaldırılır; satıcıya ve sana bildirilir.`,
  'Satıcı, ürünün hak sahibinden ya da yetkili satıcısından geldiğini fatura ve tedarik zinciri belgeleriyle göstererek itiraz edebilir.',
  `İtiraz belgelerden açıkça haklı görünüyorsa ilan en geç ${IP_PROCESS.reinstateHours} saat içinde yeniden yayımlanır.`,
  'Her iki tarafın da mahkemeye ve diğer yasal yollara başvurma hakkı saklıdır.',
];

function ProcessSteps() {
  const { colors } = useTheme();
  return (
    <View style={{ gap: 10 }}>
      {PROCESS_STEPS.map((s, i) => (
        <View key={s} style={styles.step}>
          <View style={[styles.stepNo, { backgroundColor: colors.primarySoft }]}>
            <Text variant="caption" weight="800" color="accent">
              {i + 1}
            </Text>
          </View>
          <Text variant="footnote" color="textSecondary" style={{ flex: 1 }}>
            {s}
          </Text>
        </View>
      ))}
    </View>
  );
}

// ─── Belge kutucuğu ──────────────────────────────────────────────────────────

function DocTile({ uri, onRemove }: { uri: string; onRemove: () => void }) {
  const { colors } = useTheme();
  const sample = isSampleDoc(uri);
  return (
    <View style={[styles.doc, { backgroundColor: sample ? colors.surface : colors.skeleton, borderColor: colors.border }]}>
      {sample ? (
        <View style={styles.docSample}>
          <Icon name="document-text-outline" size={22} color="textSecondary" />
          <Text variant="caption" color="textSecondary" align="center" numberOfLines={2}>
            {uri.slice('sample:'.length)}
          </Text>
        </View>
      ) : (
        <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" />
      )}
      <PressableScale scaleTo={0.85} hitSlop={8} onPress={onRemove} accessibilityLabel="Belgeyi kaldır" style={[styles.docRemove, { backgroundColor: colors.inverse }]}>
        <Icon name="close" size={12} color={colors.onInverse} />
      </PressableScale>
    </View>
  );
}

// ─── Başvuru alındı ──────────────────────────────────────────────────────────

function SuccessView({ complaint, onNew }: { complaint: IpComplaint; onNew: () => void }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const close = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };
  return (
    <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
      <View style={styles.successHead}>
        <Animated.View entering={ZoomIn.springify().damping(14)} style={[styles.successIcon, { backgroundColor: tint(colors.success, 0.15) }]}>
          <Icon name="shield-checkmark" size={44} color={colors.success} />
        </Animated.View>
        <Text variant="title2" align="center">
          Başvurun alındı
        </Text>
        <Text variant="callout" color="textSecondary" align="center">
          Başvuru numaran
        </Text>
        <Text variant="title1" align="center" tabular selectable>
          {complaint.number}
        </Text>
        <StatusPill label="Alındı" tone="info" icon="checkmark-circle" style={{ alignSelf: 'center' }} />
      </View>

      <Card style={{ gap: 2 }}>
        <KeyValue label="Tarih" value={formatDateTime(complaint.createdAt)} />
        <KeyValue label="Hak türü" value={RIGHT_TYPE_LABELS[complaint.rightType]} />
        <KeyValue label="İlan" value={complaint.target.text} />
        <KeyValue label="Belgeler" value={`${complaint.docCount} belge`} />
      </Card>

      <FormSection title="Bundan sonra ne olacak?">
        <ProcessSteps />
      </FormSection>

      <InfoNote icon="flask-outline">
        Demo: Başvurun yalnızca bu cihazda tutulur, kimseye gönderilmez ve ilan kaldırılmaz. Gerçek sürümde başvurular hukuk ve moderasyon ekibince incelenir, sonuç e-posta adresine bildirilir.
      </InfoNote>

      <View style={{ gap: 10, marginTop: 4 }}>
        <Button title="Tamam" size="lg" fullWidth onPress={close} />
        <Button title="Yeni başvuru yap" variant="secondary" size="lg" fullWidth onPress={onNew} />
      </View>
    </ScrollView>
  );
}

// ─── Form ────────────────────────────────────────────────────────────────────

export function IpComplaintScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const qa = useQaParams();
  const params = useLocalSearchParams<{ productId?: string }>();
  const complaints = useTrustStore((s) => s.complaints);
  const [draft, setDraft] = useState<Draft>(() => (__DEV__ && (qa.qa === 'filled' || qa.qa === 'done') ? sampleDraft('owner') : EMPTY));
  const [submitted, setSubmitted] = useState(() => __DEV__ && qa.qa === 'errors');
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<IpComplaint | null>(null);
  const [docMenu, setDocMenu] = useState(false);
  const [linkedOn, setLinkedOn] = useState(true);
  const scrollRef = useRef<ScrollViewInstance>(null);
  const sectionY = useRef<Partial<Record<Section, number>>>({});

  const product = linkedOn ? getProduct(params.productId) : undefined;
  const seller = product ? getUser(product.sellerId) : undefined;
  const agent = draft.applicant === 'agent';
  const errors = submitted ? validate(draft, !!product) : {};
  const remaining = MAX_DOCS - draft.docs.length;
  const dirty = JSON.stringify(draft) !== JSON.stringify(EMPTY);
  const exit = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const leave = () => {
    if (!dirty || sending) {
      exit();
      return;
    }
    showAlert('Değişiklikler kaydedilmedi', 'Çıkarsan yaptığın değişiklikler kaybolacak.', [
      { text: 'Düzenlemeye devam et', style: 'cancel' },
      { text: 'Çık', style: 'destructive', onPress: exit },
    ]);
  };

  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));
  const addDocs = (uris: string[]) => {
    if (!uris.length) return;
    haptic.light();
    setDraft((d) => ({ ...d, docs: [...d.docs, ...uris].slice(0, MAX_DOCS) }));
  };
  // Hatalı ilk bölüme kaydırmak için bölüm konumları (yalnızca onLayout içinde yazılır)
  const anchor = (s: Section, e: LayoutChangeEvent) => {
    sectionY.current[s] = e.nativeEvent.layout.y;
  };

  const send = (d: Draft, target: Product | undefined) => {
    setSending(true);
    setTimeout(() => {
      const complaint = useTrustStore.getState().addComplaint(toComplaint(d, target));
      setSending(false);
      haptic.success();
      setDone(complaint);
    }, 600);
  };

  const submit = () => {
    Keyboard.dismiss();
    setSubmitted(true);
    const e = validate(draft, !!product);
    const fields = Object.keys(e) as Field[];
    if (fields.length) {
      haptic.error();
      toast.error('Eksik ya da hatalı alanları düzelt');
      const first = SECTION_ORDER.find((s) => fields.some((f) => SECTION_OF[f] === s));
      const y = first ? sectionY.current[first] : undefined;
      if (y !== undefined) scrollRef.current?.scrollTo({ y: Math.max(0, y - 12), animated: true });
      return;
    }
    send(draft, product);
  };

  const reset = () => {
    setDraft(EMPTY);
    setSubmitted(false);
    setDone(null);
  };

  // QA: örnek başvuruyu gönderip sonuç görünümünü aç
  useEffect(() => {
    if (!__DEV__ || qa.qa !== 'done') return;
    const t = setTimeout(() => setDone(useTrustStore.getState().addComplaint(toComplaint(sampleDraft('owner'), undefined))), 300);
    return () => clearTimeout(t);
  }, [qa.qa]);

  if (done) {
    return (
      <Screen>
        <Header title="Hak sahibi başvurusu" />
        <SuccessView complaint={done} onNew={reset} />
      </Screen>
    );
  }

  const copyright = draft.rightType === 'copyright';
  const docsHint = agent
    ? `${copyright ? 'Eser sahipliğini gösteren belge' : 'TÜRKPATENT tescil belgesi'} ve vekaletname birlikte gerekli. Varsa ihlali gösteren ekran görüntüsü ya da test alımı faturasını da ekle.`
    : copyright
      ? 'Eser sahipliğini gösteren en az bir belge ekle (sözleşme, kayıt-tescil belgesi gibi). Varsa ihlali gösteren ekran görüntüsünü de ekle.'
      : 'TÜRKPATENT tescil belgesini ekle. Varsa ihlali gösteren ekran görüntüsü ya da test alımı faturasını da ekle.';

  return (
    <Screen>
      <Header title="Hak sahibi başvurusu" onBack={leave} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView ref={scrollRef} contentOffset={qa.offset} keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
          <View style={{ gap: 6 }}>
            <Text variant="title2">Fikri mülkiyet ihlali bildir</Text>
            <Text variant="callout" color="textSecondary">
              Marka, tasarım, patent ya da telif hakkını ihlal eden bir ilan gördüysen hak sahibi ya da vekili olarak buradan bildirebilirsin. Mezatonline hesabın olması gerekmez.
            </Text>
            {__DEV__ ? (
              <Text variant="footnote" weight="700" color="accent" onPress={() => setDraft(sampleDraft(draft.applicant))} suppressHighlighting>
                Örnek bilgilerle doldur (geliştirici)
              </Text>
            ) : null}
          </View>

          <Card style={{ gap: 12 }}>
            <Text variant="headline" weight="700">
              Nasıl işler?
            </Text>
            <ProcessSteps />
          </Card>

          {/* Başvuran */}
          <View onLayout={(e) => anchor('applicant', e)}>
            <FormSection title="Başvuran" subtitle="Başvurunun değerlendirilmesi için başvuranın kimlik bilgileri yasal olarak istenir.">
              <Segmented
                options={[
                  { key: 'owner', label: 'Hak sahibiyim' },
                  { key: 'agent', label: 'Vekiliyim' },
                ]}
                value={draft.applicant}
                onChange={(applicant: Applicant) => set({ applicant })}
              />
              <TextField
                label={agent ? 'Vekilin adı soyadı / unvanı' : 'Ad soyad / unvan'}
                value={draft.name}
                onChangeText={(name) => set({ name: name.slice(0, 120) })}
                placeholder={agent ? 'ör. Av. Ad Soyad ya da büro unvanı' : 'Kişi adı ya da şirket unvanı'}
                autoCapitalize="words"
                textContentType="name"
                error={errors.name}
              />
              {agent ? (
                <TextField
                  label="Temsil edilen hak sahibi"
                  value={draft.rightHolder}
                  onChangeText={(rightHolder) => set({ rightHolder: rightHolder.slice(0, 120) })}
                  placeholder="Hak sahibi kişi ya da şirket unvanı"
                  autoCapitalize="words"
                  error={errors.rightHolder}
                />
              ) : null}
              <TextField
                label={agent ? 'Vekilin T.C. kimlik no ya da vergi no' : 'T.C. kimlik no ya da vergi no'}
                value={draft.idNo}
                onChangeText={(v) => set({ idNo: v.replace(/\D/g, '').slice(0, 11) })}
                keyboardType="number-pad"
                placeholder="11 haneli TCKN ya da 10 haneli VKN"
                error={errors.idNo}
                helper="Demo: cihaza yalnızca son iki hanesi kaydedilir."
                right={draft.idNo.length === 10 || isValidTckn(draft.idNo) ? <Icon name="checkmark-circle" size={20} color={colors.success} /> : undefined}
              />
            </FormSection>
          </View>

          {/* İletişim */}
          <View onLayout={(e) => anchor('contact', e)}>
            <FormSection title="İletişim" subtitle="Başvurunun sonucu bu bilgilerle sana bildirilir.">
              <TextField
                label="E-posta"
                value={draft.email}
                onChangeText={(email) => set({ email: email.slice(0, 120) })}
                placeholder="ornek@alanadi.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="emailAddress"
                error={errors.email}
              />
              <TextField
                label="Telefon"
                prefix="+90"
                value={groupPhone(draft.phone)}
                onChangeText={(v) => set({ phone: v.replace(/\D/g, '').replace(/^0/, '').slice(0, 10) })}
                placeholder="5XX XXX XX XX"
                keyboardType="phone-pad"
                textContentType="telephoneNumber"
                error={errors.phone}
              />
            </FormSection>
          </View>

          {/* Hak bilgisi */}
          <View onLayout={(e) => anchor('right', e)}>
            <FormSection title="İhlal edilen hak">
              <View style={styles.chips}>
                {RIGHT_TYPES.map((t) => (
                  <Chip key={t} label={RIGHT_TYPE_LABELS[t]} selected={draft.rightType === t} onPress={() => set({ rightType: t })} />
                ))}
              </View>
              <FieldError text={errors.rightType} />
              <TextField
                label={copyright ? 'Bandrol ya da meslek birliği belge no (varsa)' : 'TÜRKPATENT tescil ya da başvuru no'}
                value={draft.registrationNo}
                onChangeText={(registrationNo) => set({ registrationNo: registrationNo.slice(0, 40) })}
                placeholder={copyright ? 'ör. meslek birliği belge no' : 'ör. 2023/123456'}
                autoCapitalize="characters"
                autoCorrect={false}
                error={errors.registrationNo}
                helper={copyright ? 'Telif hakkı için tescil zorunlu değildir; numara yoksa boş bırakıp eser sahipliğini gösteren belgeyi ekle.' : 'Tescil belgesinin kopyasını Belgeler bölümüne de ekle.'}
              />
            </FormSection>
          </View>

          {/* Şikâyet edilen ilan */}
          <View onLayout={(e) => anchor('target', e)}>
            <FormSection title="Şikâyet edilen ilan">
              {product ? (
                <Card style={styles.product} padded={false}>
                  <Thumb uri={product.images[0]} size={52} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text variant="subhead" weight="700" numberOfLines={2}>
                      {product.title}
                    </Text>
                    <Text variant="footnote" color="textSecondary" numberOfLines={1}>
                      İlan no {product.id.toUpperCase()}
                      {seller ? ` · @${seller.username}` : ''}
                    </Text>
                  </View>
                  <IconButton name="close" size={30} variant="surface" onPress={() => setLinkedOn(false)} accessibilityLabel="Başka bir ilan yaz" />
                </Card>
              ) : (
                <TextField
                  label="İlan bağlantısı ya da başlığı"
                  value={draft.targetText}
                  onChangeText={(targetText) => set({ targetText: targetText.slice(0, 300) })}
                  placeholder="https://mezatonline.com/product/… ya da ilan başlığı"
                  autoCapitalize="none"
                  autoCorrect={false}
                  error={errors.target}
                  helper="Birden fazla ilan varsa her biri için ayrı başvuru yap."
                />
              )}
            </FormSection>
          </View>

          {/* Gerekçe ve deliller */}
          <View onLayout={(e) => anchor('evidence', e)}>
            <FormSection title="Gerekçe ve deliller">
              <TextField
                label="Gerekçe"
                value={draft.reason}
                onChangeText={(reason) => set({ reason: reason.slice(0, REASON_MAX) })}
                placeholder="Ürünün hakkını nasıl ihlal ettiğini anlat: taklit logo, etiket, ambalaj, izinsiz kopya gibi."
                multiline
                maxLength={REASON_MAX}
                error={errors.reason}
                helper={`En az ${REASON_MIN} karakter · ${draft.reason.trim().length}/${REASON_MAX}`}
              />
              <View style={{ gap: 8 }}>
                <Text variant="subhead" weight="600" color="textSecondary">
                  Belgeler · {draft.docs.length}/{MAX_DOCS}
                </Text>
                <Text variant="footnote" color="textTertiary">
                  {docsHint}
                </Text>
                <View style={styles.docs}>
                  {draft.docs.map((uri, i) => (
                    <DocTile key={`${uri}_${i}`} uri={uri} onRemove={() => setDraft((d) => ({ ...d, docs: d.docs.filter((_, k) => k !== i) }))} />
                  ))}
                  {remaining > 0 ? (
                    <PressableScale
                      onPress={() => {
                        haptic.tap();
                        setDocMenu(true);
                      }}
                      style={[styles.doc, styles.docAdd, { borderColor: errors.docs ? colors.danger : colors.border, backgroundColor: colors.surface }]}
                      accessibilityLabel="Belge ekle">
                      <Icon name="add" size={22} color="textSecondary" />
                      <Text variant="caption" color="textSecondary">
                        Ekle
                      </Text>
                    </PressableScale>
                  ) : null}
                </View>
                <FieldError text={errors.docs} />
                <Text variant="caption" color="textTertiary">
                  Demo: belgeler cihaza kaydedilmez, yalnızca sayısı tutulur.
                </Text>
              </View>
            </FormSection>
          </View>

          {/* Beyanlar */}
          <View onLayout={(e) => anchor('declaration', e)}>
            <FormSection title="Beyan">
              <View style={{ gap: 4 }}>
                <CheckRow checked={draft.accurate} onPress={() => set({ accurate: !draft.accurate })} label={ACCURACY_DECLARATION} />
                <FieldError text={errors.accurate} style={{ marginLeft: 34 }} />
                <CheckRow checked={draft.liability} onPress={() => set({ liability: !draft.liability })} label={LIABILITY_DECLARATION} />
                <FieldError text={errors.liability} style={{ marginLeft: 34 }} />
              </View>
            </FormSection>
          </View>

          <View style={{ gap: 12 }}>
            <Button title="Başvuruyu gönder" size="lg" fullWidth loading={sending} onPress={submit} />
            <InfoNote icon="flask-outline">Demo: Başvurun yalnızca bu cihazda tutulur, kimseye gönderilmez ve ilan kaldırılmaz.</InfoNote>
            <InfoNote icon="mail-outline">
              Gerçek sürümde başvurunu noter aracılığıyla ya da KEP (kayıtlı elektronik posta) ile de gönderebileceksin; bu yollarda da aynı bilgi ve belgeler istenir. KEP ve tebligat adresimiz şirket kuruluşundan sonra burada yayımlanacak.
            </InfoNote>
          </View>

          {complaints.length ? (
            <FormSection title="Başvurularım" subtitle="Demo: yalnızca bu cihazda tutulur" style={{ marginTop: 8 }}>
              <View>
                {complaints.map((c) => (
                  <MenuRow
                    key={c.id}
                    icon="document-text-outline"
                    title={c.number}
                    subtitle={`${formatDateTime(c.createdAt)} · ${RIGHT_TYPE_LABELS[c.rightType]}\n${c.target.text}`}
                    right={<StatusPill label="Alındı" tone="info" style={{ alignSelf: 'center' }} />}
                    style={styles.flush}
                  />
                ))}
              </View>
            </FormSection>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>

      <ActionSheet
        visible={docMenu}
        onClose={() => setDocMenu(false)}
        title="Belge ekle"
        subtitle={`${remaining} belge daha ekleyebilirsin`}
        actions={[
          { label: 'Fotoğraf çek', icon: 'camera-outline', onPress: () => takePhoto([3, 4]).then((u) => addDocs(u ? [u] : [])) },
          { label: 'Galeriden seç', icon: 'images-outline', onPress: () => pickFromLibrary({ limit: remaining }).then(addDocs) },
          ...(DEMO_MODE
            ? [
                {
                  label: 'Örnek belge ekle (demo)',
                  icon: 'sparkles-outline' as const,
                  subtitle: `“${nextSampleName(draft)}” · simülatörde denemek için, gerçek belge yerine geçmez`,
                  onPress: () => addDocs([`sample:${nextSampleName(draft)}`]),
                },
              ]
            : []),
        ]}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: SCREEN_PADDING, paddingTop: 8, gap: 24 },
  step: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  stepNo: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  product: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  docs: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  doc: { width: 76, height: 76, borderRadius: radius.sm, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth },
  docSample: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2, paddingHorizontal: 4 },
  docAdd: { alignItems: 'center', justifyContent: 'center', gap: 2, borderStyle: 'dashed', borderWidth: 1.5 },
  docRemove: { position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  successHead: { alignItems: 'center', gap: 8, paddingTop: 12 },
  successIcon: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  flush: { paddingHorizontal: 0 },
});
