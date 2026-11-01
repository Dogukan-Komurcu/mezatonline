/**
 * Satıcı başvurusu (modal, 8 adım): Hoş geldin & kurallar → Kategori → Deneyim → Satıcı bilgileri (TCKN / vergi)
 * → İade adresi → IBAN → Telefon doğrulama → Özet. Gönderince ~4 sn sonra otomatik onaylanır.
 */
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, useWindowDimensions, View, type ScrollViewInstance } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';

import { Button, Chip, Header, Icon, PressableScale, Screen, Sheet, Text, TextField, toast, type IconName } from '@/components/ui';
import { CATEGORIES, getCategory } from '@/data';
import { RISKY_AREAS } from '@/features/account/content';
import { IP_PROCESS, STRIKE_POLICY } from '@/features/trust/counterfeit';
import { AddressForm, emptyAddress, validateAddress, type AddressDraft } from '@/features/wallet/forms';
import { formatPhone } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { random } from '@/lib/rng';
import { useAuthStore, useMe } from '@/store/auth';
import { useSellerStore } from '@/store/seller';
import { radius, SCREEN_PADDING, useTheme } from '@/theme';

import { useQaOffset, useQaParam } from './qaSeed';
import { scheduleAutoApproval, useNow } from './actions';
import { EXPERIENCE_LABELS, SELLER_TYPE_LABELS } from './ApplicationPending';
import { IbanField } from './IbanSheet';
import { ageFromBirthDate, bankFromIban, isValidIban, isValidTaxNo, isValidTckn, maskBirthDate, maskIban, maskTckn } from './logic';
import { useSellerExtras, type ExperienceLevel, type SellerType } from './store';
import { Card, CheckRow, KeyValue, OptionCard, StatusPill, StepBar, StickyFooter, tint, MODAL_SAFE_TOP } from './ui';

/** Yazarken gruplanan cep numarası: "5321234567" → "532 123 45 67" */
function groupPhone(digits: string): string {
  return [digits.slice(0, 3), digits.slice(3, 6), digits.slice(6, 8), digits.slice(8, 10)].filter(Boolean).join(' ');
}

const STEP_TITLES = ['Hoş geldin', 'Kategori', 'Deneyim', 'Satıcı bilgileri', 'İade adresi', 'IBAN', 'Telefon', 'Özet'];
const PLATFORMS = ['Trendyol', 'Hepsiburada', 'Instagram', 'Dolap', 'Letgo', 'Sahibinden', 'Gardrops', 'n11', 'Etsy / eBay', 'Diğer'];
const VOLUMES = ["₺10.000'den az", '₺10.000 – ₺50.000', '₺50.000 – ₺250.000', '₺250.000 üzeri'];

type Draft = {
  rulesAccepted: boolean;
  termsAccepted: boolean;
  marketing: boolean;
  categoryId?: string;
  subcategoryId?: string;
  experience?: ExperienceLevel;
  platforms: string[];
  storeLink: string;
  monthlyVolume?: string;
  sellerType: SellerType;
  legalName: string;
  tckn: string;
  birthDate: string;
  taxOffice: string;
  taxNo: string;
  companyTitle: string;
  storeName: string;
  address: AddressDraft;
  ibanDigits: string;
  phone: string;
  phoneVerified: boolean;
};

const RULES = [
  ['shield-checkmark-outline', 'Sadece orijinal ürünler sat; sahte, replika veya izinsiz ürün yasaktır.'],
  ['document-attach-outline', `Taklidi yaygın kategorilerdeki (${RISKY_AREAS}) ve taklidi yaygın markaların geçtiği ilanlara orijinallik belgesi (fatura, sertifika ya da tedarik belgesi) ekle.`],
  ['eye-outline', 'Ürünü kamerada olduğu gibi göster, kusurlarını açıkça söyle.'],
  ['cube-outline', 'Siparişleri 2 iş günü içinde kargoya ver.'],
  ['ban-outline', 'Kutu açılımı (break), gizemli kutu ve şansa dayalı satış yapma; alışveriş şartlı çekiliş düzenleme.'],
  ['hammer-outline', 'Kendi açık artırmana kendin ya da bağlantılı hesaplarla teklif verme (gölge teklif).'],
  ['card-outline', 'Ödemeleri yalnızca Mezatonline üzerinden al; alıcıyı platform dışı ödemeye veya iletişime yönlendirme.'],
  ['close-circle-outline', 'Tütün, alkol, ilaç, silah ve ruhsatsız kültür varlığı/antika satma.'],
  ['happy-outline', 'Alıcılara ve topluluğa saygılı ol; nefret söylemi ve tacize sıfır tolerans.'],
] as const;

/** Şirket kurulana kadar kullanılan unvan */
const ENTITY = 'Mezatonline (demo sürüm; şirket unvanı, MERSİS numarası ve adres şirket kuruluşundan sonra eklenecektir)';

const LEGAL_TEXT = {
  rules:
    'Mezatonline Topluluk Kuralları, alıcıların ve satıcıların güvenle alışveriş yapabilmesi için hazırlanmıştır. Satıcılar yalnızca sahip oldukları ve orijinal olan ürünleri listeleyebilir; ürün açıklamaları ve yayında gösterilen ürün gerçek durumu yansıtmalıdır. Satılan ürünler 2 iş günü içinde kargoya verilmelidir.\n\n' +
    'Aşağıdakiler yasaktır: kutu açılımı (break), gizemli kutu ve sonucu şansa bağlı her türlü satış; alışveriş şartlı çekiliş, çark ve benzeri rastgele seçim düzenekleri; satıcının kendi açık artırmasına kendisi veya bağlantılı hesaplarla teklif vermesi (gölge teklif); alıcıyı platform dışı ödemeye veya iletişime yönlendirmek; sahte, taklit veya hak sahibinin izni olmadan üretilmiş ürün satmak; tütün, alkol, ilaç ve silah satışı; 2863 sayılı Kültür ve Tabiat Varlıklarını Koruma Kanunu kapsamında ruhsatsız kültür varlığı ve antika satışı; sahte değerlendirme yapmak. İhlaller ilanın kaldırılmasına ve hesabın kapatılmasına neden olabilir.\n\n' +
    `İlan ve yayın metinlerinde “replika”, “muadil”, “A kalite” ya da “… kokusu”, “… model” gibi ürünü bir markanın kopyası olarak sunan ifadeler kullanılamaz. Taklidi yaygın kategorilerde (${RISKY_AREAS}), taklidi yaygın markaların geçtiği ilanlarda ve “ihraç fazlası” gibi iddialarda ilan yayımlanmadan önce orijinallik belgesi istenir. Sahte ürün ihlallerinde kademeli yaptırım uygulanır:\n` +
    STRIKE_POLICY.join('\n') +
    '\n\n' +
    'Demo sürümdeki çekilişlerde gerçek ödül verilmez. Gerçek ödüllü çekilişler Milli Piyango İdaresi izniyle düzenlenebilir.',
  terms:
    `Satıcı Sözleşmesi, ${ENTITY} ile satıcı arasında kurulur; ücretleri (ürün bedeli üzerinden %5 satış komisyonu ile %3 + sipariş başına ₺5 kredi kartı ücreti; toplam %8 + ₺5, KDV dahil; ayrıca ödeme işlem ücreti alınmaz), ödeme takvimini (teslimattan sonra çekilebilir bakiye, 1-2 iş günü içinde IBAN’a aktarım) ve iptal/iade süreçlerini düzenler. Gerçek sürümde alıcı ödemeleri, lisanslı bir ödeme kuruluşu tarafından ürün alıcıya ulaşana kadar bekletilir ve hakedişin bu kuruluş aracılığıyla IBAN’ına aktarılır; Mezatonline alıcı ödemelerini kendi hesabında tutmaz.\n\n` +
    // Fikri mülkiyet hükmü: hak sahipliğinin ispatı ve alınan tedbirler (ETAHS Yönetmeliği md. 15/1-ğ; süreler md. 12–14)
    `Fikri mülkiyet ve orijinallik: Satıcı yalnızca orijinal olan ve satma hakkına sahip olduğu ürünleri listeler; ürünün orijinal olduğunu gerektiğinde fatura veya tedarik zinciri belgeleriyle ispatlamakla yükümlüdür. Hak sahipliği; marka, tasarım ve patentte TÜRKPATENT tescil (ya da başvuru) belgesiyle, telif haklarında eser sahipliğini gösteren belgelerle ispat edilir. Hak sahibi veya vekili bu belgeyle birlikte kimlik bilgilerini, ihlalin gerekçesini ve kanıtlarını, ilanın bağlantısını ve belgelerin yanlış çıkması hâlinde sorumluluğu üstlendiğine dair beyanını uygulama içi form, noter ya da KEP yoluyla iletir (KEP adresi şirket kuruluşundan sonra duyurulacaktır).\n\n` +
    `Alınan tedbirler: İlan ve yayın metinlerinde ürünü bir markanın kopyası olarak sunan ifadeler (“replika”, “muadil”, “A kalite” vb.) filtrelenir ve yayımlanmaz. Taklidi yaygın kategorilerde (${RISKY_AREAS}), taklidi yaygın markaların geçtiği ilanlarda ve “ihraç fazlası” gibi iddialarda ilan yayımlanmadan önce orijinallik belgesi istenir. Hak sahibinin usulüne uygun şikâyetinde ilan en geç ${IP_PROCESS.takedownHours} saat içinde yayından kaldırılır; satıcıya ve şikâyetçiye bildirim yapılır. Satıcı fatura ve tedarik zinciri belgeleriyle itiraz edebilir; itiraz hak sahibine iletilir ve belgelerden açıkça haklı görülürse ilan ${IP_PROCESS.reinstateHours} saat içinde yeniden yayımlanır. Tarafların mahkemeye başvurma hakkı saklıdır.\n\n` +
    `Kademeli yaptırım:\n${STRIKE_POLICY.join('\n')}\n\n` +
    `6698 sayılı KVKK kapsamında kimlik, iletişim ve banka bilgilerin; kimlik doğrulama, ödeme, faturalandırma ve yasal yükümlülükler (ETBİS, e-ticaret stopajı) amacıyla işlenir ve yalnızca lisanslı ödeme kuruluşu ve yetkili kamu kurumlarıyla paylaşılır. Demo sürümde başvuru bilgilerin ve yüklediğin belgeler yalnızca bu cihazda tutulur; gerçek kimlik, IBAN ve belge doğrulaması ya da para aktarımı yapılmaz, şikâyet ve itiraz süreci simüle edilir. Aydınlatma metninin tamamına Ayarlar > Yasal bölümünden ulaşabilirsin.`,
};

function useDraft(): [Draft, (patch: Partial<Draft>) => void] {
  const me = useMe();
  const phone = useAuthStore((s) => s.phone);
  const [draft, setDraft] = useState<Draft>(() => ({
    rulesAccepted: false,
    termsAccepted: false,
    marketing: false,
    platforms: [],
    storeLink: '',
    sellerType: 'individual',
    legalName: me.displayName.trim().split(/\s+/).length >= 2 ? me.displayName : '',
    tckn: '',
    birthDate: '',
    taxOffice: '',
    taxNo: '',
    companyTitle: '',
    storeName: me.username,
    address: emptyAddress(''),
    ibanDigits: '',
    phone: (phone ?? '').replace(/\D/g, '').replace(/^90/, '').replace(/^0/, '').slice(0, 10),
    phoneVerified: false,
  }));
  return [draft, (patch) => setDraft((d) => ({ ...d, ...patch }))];
}

// ─── Adım 1: Hoş geldin ──────────────────────────────────────────────────────

function WelcomeStep({ draft, set, onLegal }: { draft: Draft; set: (p: Partial<Draft>) => void; onLegal: (k: 'rules' | 'terms') => void }) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: 18 }}>
      <View style={[styles.welcomeArt, { backgroundColor: colors.primarySoft }]}>
        <Text style={{ fontSize: 46, lineHeight: 54 }}>🛍️</Text>
      </View>
      <View style={{ gap: 6 }}>
        <Text variant="title1">Mağazanı açalım 👋</Text>
        <Text variant="body" color="textSecondary">
          Bilgilerini sekiz kısa adımda gir; göndermeden önce hepsini tek ekranda gözden geçirirsin. Demo sürümde başvurular otomatik onaylanır; gerçek kimlik ve IBAN doğrulaması yapılmaz.
        </Text>
      </View>
      <Card style={{ gap: 10, backgroundColor: colors.surface, borderColor: colors.surface }}>
        <Text variant="subhead" weight="700">
          Hazır bulundur
        </Text>
        {[
          ['id-card-outline', 'T.C. Kimlik Numaran'],
          ['business-outline', 'Kendi adına kayıtlı IBAN'],
          ['home-outline', 'İade adresin'],
          ['phone-portrait-outline', 'Cep telefonun (SMS doğrulaması)'],
        ].map(([icon, t]) => (
          <View key={t} style={styles.inline}>
            <Icon name={icon as IconName} size={18} color="textSecondary" />
            <Text variant="callout">{t}</Text>
          </View>
        ))}
      </Card>
      <View style={{ gap: 10 }}>
        <Text variant="headline" weight="700">
          Topluluk Kuralları
        </Text>
        {RULES.map(([icon, t]) => (
          <View key={t} style={[styles.inline, { alignItems: 'flex-start' }]}>
            <Icon name={icon} size={18} color="success" />
            <Text variant="callout" style={{ flex: 1 }}>
              {t}
            </Text>
          </View>
        ))}
        <Card style={{ gap: 6, backgroundColor: colors.surface, borderColor: colors.surface }}>
          <View style={styles.inline}>
            <Icon name="alert-circle-outline" size={18} color="textSecondary" />
            <Text variant="subhead" weight="700" style={{ flex: 1 }}>
              Sahte ürün ihlallerinde kademeli yaptırım
            </Text>
          </View>
          {STRIKE_POLICY.map((t) => (
            <Text key={t} variant="footnote" color="textSecondary">
              {t}
            </Text>
          ))}
        </Card>
      </View>
      <View style={{ gap: 4 }}>
        <CheckRow checked={draft.rulesAccepted} onPress={() => set({ rulesAccepted: !draft.rulesAccepted })} label="Topluluk Kuralları’nı okudum ve kabul ediyorum." linkLabel="Tamamını oku" onLink={() => onLegal('rules')} />
        <CheckRow
          checked={draft.termsAccepted}
          onPress={() => set({ termsAccepted: !draft.termsAccepted })}
          label="Satıcı Sözleşmesi’ni ve KVKK Aydınlatma Metni’ni okudum, kabul ediyorum."
          linkLabel="Oku"
          onLink={() => onLegal('terms')}
        />
        <CheckRow checked={draft.marketing} onPress={() => set({ marketing: !draft.marketing })} label="Satıcı kampanyaları ve ipuçları hakkında ticari ileti almak istiyorum (isteğe bağlı)." />
      </View>
    </View>
  );
}

// ─── Adım 2: Kategori ────────────────────────────────────────────────────────

function CategoryStep({ draft, set }: { draft: Draft; set: (p: Partial<Draft>) => void }) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const tile = Math.floor((width - SCREEN_PADDING * 2 - 20) / 3);
  const selected = getCategory(draft.categoryId);
  return (
    <View style={{ gap: 16 }}>
      <View style={{ gap: 6 }}>
        <Text variant="title2">Ağırlıklı olarak ne satacaksın?</Text>
        <Text variant="callout" color="textSecondary">
          Seçtiğin kategori mağazanın ana vitrini olur. Bu bir sınır değil; ileride başka kategorilerde de ürün ekleyebilirsin.
        </Text>
      </View>
      {selected ? (
        <Animated.View entering={FadeIn.duration(200)}>
          <Card style={{ gap: 10 }}>
            <Text variant="subhead" weight="700">
              {selected.emoji} {selected.name} içinde hangi alan?
            </Text>
            <View style={styles.wrap}>
              {selected.subcategories.map((s) => (
                <Chip key={s.id} label={s.name} selected={draft.subcategoryId === s.id} onPress={() => set({ subcategoryId: s.id })} />
              ))}
            </View>
          </Card>
        </Animated.View>
      ) : null}
      <View style={styles.grid}>
        {CATEGORIES.map((c) => {
          const on = c.id === draft.categoryId;
          return (
            <PressableScale
              key={c.id}
              scaleTo={0.95}
              onPress={() => {
                haptic.tap();
                set({ categoryId: c.id, subcategoryId: on ? draft.subcategoryId : undefined });
              }}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              style={[styles.catTile, { width: tile, backgroundColor: on ? colors.surfaceAlt : colors.surface, borderColor: on ? colors.text : 'transparent' }]}>
              <Text style={{ fontSize: 28, lineHeight: 34 }}>{c.emoji}</Text>
              <Text variant="footnote" weight="700" align="center" numberOfLines={2}>
                {c.shortName}
              </Text>
              {on ? (
                <View style={[styles.catCheck, { backgroundColor: colors.text }]}>
                  <Icon name="checkmark" size={12} color={colors.bg} />
                </View>
              ) : null}
            </PressableScale>
          );
        })}
      </View>
    </View>
  );
}

// ─── Adım 3: Deneyim ─────────────────────────────────────────────────────────

function ExperienceStep({ draft, set }: { draft: Draft; set: (p: Partial<Draft>) => void }) {
  const toggle = (p: string) => set({ platforms: draft.platforms.includes(p) ? draft.platforms.filter((x) => x !== p) : [...draft.platforms, p] });
  return (
    <View style={{ gap: 16 }}>
      <View style={{ gap: 6 }}>
        <Text variant="title2">Daha önce satış yaptın mı?</Text>
        <Text variant="callout" color="textSecondary">
          Sana en uygun ipuçlarını ve satıcı desteğini sunabilmemiz için soruyoruz.
        </Text>
      </View>
      <OptionCard emoji="🌱" title="Hiç satış yapmadım" subtitle="İlk kez satacağım; koleksiyonumdan ya da evdeki eşyalardan başlıyorum" selected={draft.experience === 'new'} onPress={() => set({ experience: 'new' })} />
      <OptionCard
        emoji="📦"
        title="İnternette zaten satıyorum"
        subtitle="Bir pazar yerinde, ikinci el uygulamasında ya da sosyal medyada ilanlarım var"
        selected={draft.experience === 'other_platforms'}
        onPress={() => set({ experience: 'other_platforms' })}>
        <View style={styles.wrap}>
          {PLATFORMS.map((p) => (
            <Chip key={p} label={p} size="sm" selected={draft.platforms.includes(p)} onPress={() => toggle(p)} />
          ))}
        </View>
        <TextField
          label="Mağaza bağlantın (isteğe bağlı)"
          value={draft.storeLink}
          onChangeText={(v) => set({ storeLink: v })}
          placeholder="ör. instagram.com/magazam"
          autoCapitalize="none"
          keyboardType="url"
          autoCorrect={false}
        />
      </OptionCard>
      <OptionCard emoji="🏪" title="Dükkânım var" subtitle="Raflarımdaki ürünleri canlı yayına da taşımak istiyorum" selected={draft.experience === 'physical_store'} onPress={() => set({ experience: 'physical_store' })}>
        <TextField label="Mağaza adı ve şehir (isteğe bağlı)" value={draft.storeLink} onChangeText={(v) => set({ storeLink: v })} placeholder="ör. Kadıköy Koleksiyon, İstanbul" />
      </OptionCard>
      <View style={{ gap: 10 }}>
        <Text variant="headline" weight="700">
          Aylık tahmini satış hacmin
        </Text>
        <View style={styles.wrap}>
          {VOLUMES.map((v) => (
            <Chip key={v} label={v} selected={draft.monthlyVolume === v} onPress={() => set({ monthlyVolume: v })} />
          ))}
        </View>
      </View>
    </View>
  );
}

// ─── Adım 4: Satıcı bilgileri ────────────────────────────────────────────────

function IdentityStep({ draft, set, submitted }: { draft: Draft; set: (p: Partial<Draft>) => void; submitted: boolean }) {
  const { colors } = useTheme();
  const now = useNow(60_000);
  const e = identityErrors(draft, now);
  const show = (k: keyof typeof e) => (submitted || (k === 'tckn' && draft.tckn.length === 11) || (k === 'birthDate' && draft.birthDate.length === 10) ? e[k] : undefined);
  return (
    <View style={{ gap: 16 }}>
      <View style={{ gap: 6 }}>
        <Text variant="title2">Kim olarak satacaksın?</Text>
        <Text variant="callout" color="textSecondary">
          Seçtiğin tipe göre fatura ve vergi bilgisi istiyoruz. Yazdıkların nüfus ve vergi kayıtlarınla birebir eşleşmeli.
        </Text>
      </View>
      <OptionCard icon="person-outline" title="Bireysel" subtitle="Kişisel eşyalarını ya da koleksiyonunu satıyorsan" selected={draft.sellerType === 'individual'} onPress={() => set({ sellerType: 'individual' })} />
      <OptionCard icon="briefcase-outline" title="Şahıs Şirketi" subtitle="Vergi levhan varsa (esnaf, serbest meslek)" selected={draft.sellerType === 'sole_proprietor'} onPress={() => set({ sellerType: 'sole_proprietor' })} />
      <OptionCard icon="business-outline" title="Kurumsal" subtitle="Limited ya da anonim şirket" selected={draft.sellerType === 'company'} onPress={() => set({ sellerType: 'company' })} />
      <TextField label="Ad ve soyad (nüfus kaydındaki yazımla)" value={draft.legalName} onChangeText={(v) => set({ legalName: v })} autoCapitalize="words" textContentType="name" error={show('legalName')} />
      <TextField
        label="T.C. Kimlik No"
        value={draft.tckn}
        onChangeText={(v) => set({ tckn: v.replace(/\D/g, '').slice(0, 11) })}
        keyboardType="number-pad"
        placeholder="11 haneli kimlik numaran"
        error={show('tckn')}
        right={isValidTckn(draft.tckn) ? <Icon name="checkmark-circle" size={20} color={colors.success} /> : undefined}
      />
      <TextField
        label="Doğum tarihi"
        value={draft.birthDate}
        onChangeText={(v) => set({ birthDate: maskBirthDate(v) })}
        keyboardType="number-pad"
        placeholder="GG.AA.YYYY"
        error={show('birthDate')}
        helper="Satıcı olmak için 18 yaşını doldurmuş olmalısın."
      />
      {draft.sellerType === 'company' ? (
        <TextField label="Ticari unvan" value={draft.companyTitle} onChangeText={(v) => set({ companyTitle: v })} placeholder="ör. Mezat Koleksiyon Ltd. Şti." error={show('companyTitle')} />
      ) : null}
      {draft.sellerType !== 'individual' ? (
        <>
          <TextField label="Vergi dairesi" value={draft.taxOffice} onChangeText={(v) => set({ taxOffice: v })} placeholder="ör. Kadıköy Vergi Dairesi" error={show('taxOffice')} />
          <TextField
            label={draft.sellerType === 'company' ? 'Vergi kimlik no (10 hane)' : 'Vergi no (T.C. Kimlik No ya da VKN)'}
            value={draft.taxNo}
            onChangeText={(v) => set({ taxNo: v.replace(/\D/g, '').slice(0, 11) })}
            keyboardType="number-pad"
            error={show('taxNo')}
          />
        </>
      ) : null}
      <TextField label="Mağaza adın" value={draft.storeName} onChangeText={(v) => set({ storeName: v.slice(0, 30) })} helper="Profilinde ve yayınlarında görünür. Daha sonra değiştirebilirsin." autoCapitalize="none" />
      <View style={[styles.inline, { alignItems: 'flex-start' }]}>
        <Icon name="lock-closed" size={16} color="textSecondary" />
        <Text variant="footnote" color="textSecondary" style={{ flex: 1 }}>
          Demo sürümde bilgilerin yalnızca bu cihazda tutulur ve hiçbir sunucuya gönderilmez. Gerçek sürümde yalnızca kimlik doğrulama, ödeme ve fatura için kullanılır.
        </Text>
      </View>
      {__DEV__ ? (
        <Text variant="footnote" weight="700" color="accent" onPress={() => set({ tckn: '10000000146', birthDate: draft.birthDate || '15.06.1994' })} suppressHighlighting>
          Test kimliği kullan (geliştirici)
        </Text>
      ) : null}
    </View>
  );
}

function identityErrors(d: Draft, now: number) {
  const age = ageFromBirthDate(d.birthDate, now);
  return {
    legalName: d.legalName.trim().split(/\s+/).length < 2 ? 'Ad ve soyadını kimliğindeki gibi gir' : undefined,
    tckn: !isValidTckn(d.tckn) ? (d.tckn.length < 11 ? 'T.C. Kimlik No 11 haneli olmalı' : 'Geçersiz T.C. Kimlik No') : undefined,
    birthDate: age === null ? 'Geçerli bir tarih gir (GG.AA.YYYY)' : age < 18 ? '18 yaşından küçükler satıcı olamaz' : age > 110 ? 'Geçerli bir tarih gir' : undefined,
    companyTitle: d.sellerType === 'company' && d.companyTitle.trim().length < 3 ? 'Ticari unvanı gir' : undefined,
    taxOffice: d.sellerType !== 'individual' && d.taxOffice.trim().length < 3 ? 'Vergi dairesini gir' : undefined,
    taxNo:
      d.sellerType === 'company'
        ? !/^\d{10}$/.test(d.taxNo)
          ? 'VKN 10 haneli olmalı'
          : undefined
        : d.sellerType === 'sole_proprietor' && !isValidTaxNo(d.taxNo)
          ? 'Geçerli bir vergi no gir'
          : undefined,
  };
}

// ─── Adım 7: Telefon ─────────────────────────────────────────────────────────

function PhoneStep({ draft, set }: { draft: Draft; set: (p: Partial<Draft>) => void }) {
  const { colors } = useTheme();
  const now = useNow(1000);
  const [code, setCode] = useState<string | null>(null);
  const [resendAt, setResendAt] = useState(0);
  const [otp, setOtp] = useState('');
  const [sending, setSending] = useState(false);
  const phoneOk = draft.phone.length === 10 && draft.phone.startsWith('5');
  const wait = Math.max(0, Math.ceil((resendAt - now) / 1000));

  const send = () => {
    if (!phoneOk) {
      toast.warning('Geçerli bir cep telefonu gir (5XX XXX XX XX)');
      return;
    }
    setSending(true);
    setTimeout(() => {
      const c = String(random.int(100000, 999999));
      setCode(c);
      setOtp('');
      setResendAt(Date.now() + 60_000);
      setSending(false);
      toast.success('Doğrulama kodu gönderildi', 'chatbubble-ellipses');
    }, 800);
  };

  const onOtp = (v: string) => {
    const digits = v.replace(/\D/g, '').slice(0, 6);
    setOtp(digits);
    if (digits.length === 6 && code) {
      if (digits === code) {
        haptic.success();
        set({ phoneVerified: true });
      } else {
        haptic.error();
      }
    }
  };

  if (draft.phoneVerified) {
    return (
      <View style={{ gap: 16, alignItems: 'center', paddingTop: 24 }}>
        <Animated.View entering={ZoomIn.springify()} style={[styles.verified, { backgroundColor: tint(colors.success, 0.15) }]}>
          <Icon name="checkmark-circle" size={56} color={colors.success} />
        </Animated.View>
        <Text variant="title2" align="center">
          Telefonun doğrulandı
        </Text>
        <Text variant="callout" color="textSecondary" align="center">
          +90 {formatPhone(draft.phone).slice(1)}
        </Text>
        <Button
          title="Numarayı değiştir"
          variant="ghost"
          size="sm"
          onPress={() => {
            set({ phoneVerified: false });
            setCode(null);
          }}
        />
      </View>
    );
  }

  return (
    <View style={{ gap: 16 }}>
      <View style={{ gap: 6 }}>
        <Text variant="title2">Cep telefonunu doğrula</Text>
        <Text variant="callout" color="textSecondary">
          Siparişler ve güvenlik bildirimleri için bu numarayı kullanacağız.
        </Text>
      </View>
      <TextField
        label="Cep telefonu"
        prefix="+90"
        value={groupPhone(draft.phone)}
        onChangeText={(v) => {
          set({ phone: v.replace(/\D/g, '').replace(/^0/, '').slice(0, 10) });
          setCode(null);
        }}
        keyboardType="phone-pad"
        placeholder="5XX XXX XX XX"
        textContentType="telephoneNumber"
        editable={!code}
      />
      {!code ? (
        <Button title="Kod gönder" size="lg" variant="inverse" fullWidth loading={sending} disabled={!phoneOk} onPress={send} />
      ) : (
        <Animated.View entering={FadeIn.duration(200)} style={{ gap: 12 }}>
          <TextField
            label="6 haneli kod"
            value={otp}
            onChangeText={onOtp}
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            autoFocus
            maxLength={6}
            placeholder="••••••"
            style={{ letterSpacing: 8, fontSize: 22, fontWeight: '700' }}
            error={otp.length === 6 && otp !== code ? 'Kod hatalı, tekrar dene' : undefined}
          />
          <View style={[styles.demoCode, { backgroundColor: colors.surface }]}>
            <Icon name="chatbubble-ellipses-outline" size={18} color="textSecondary" />
            <Text variant="footnote" color="textSecondary" style={{ flex: 1 }}>
              Demo SMS — doğrulama kodun:{' '}
              <Text variant="footnote" weight="800" tabular>
                {code}
              </Text>
            </Text>
            <Text variant="footnote" weight="700" color="accent" onPress={() => onOtp(code)} suppressHighlighting>
              Doldur
            </Text>
          </View>
          <View style={[styles.inline, { justifyContent: 'space-between' }]}>
            <Text
              variant="subhead"
              weight="700"
              color={wait > 0 ? 'textTertiary' : 'accent'}
              onPress={wait > 0 ? undefined : send}
              suppressHighlighting>
              {wait > 0 ? `Kodu tekrar gönder (0:${wait < 10 ? '0' + wait : wait})` : 'Kodu tekrar gönder'}
            </Text>
            <Text variant="subhead" weight="700" color="accent" onPress={() => setCode(null)} suppressHighlighting>
              Numarayı düzenle
            </Text>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

// ─── Adım 8: Özet ────────────────────────────────────────────────────────────

function SummaryStep({ draft, goTo }: { draft: Draft; goTo: (step: number) => void }) {
  const category = getCategory(draft.categoryId);
  const sub = category?.subcategories.find((s) => s.id === draft.subcategoryId);
  const iban = `TR${draft.ibanDigits}`;
  const sections: { step: number; title: string; rows: [string, string][] }[] = [
    { step: 1, title: 'Kategori', rows: [['Ana kategori', category ? `${category.emoji} ${category.name}` : '—'], ['Alt kategori', sub?.name ?? '—']] },
    {
      step: 2,
      title: 'Deneyim',
      rows: [
        ['Deneyim', draft.experience ? EXPERIENCE_LABELS[draft.experience] : '—'],
        ...(draft.platforms.length ? ([['Platformlar', draft.platforms.join(', ')]] as [string, string][]) : []),
        ['Aylık hacim', draft.monthlyVolume ?? '—'],
      ],
    },
    {
      step: 3,
      title: 'Satıcı bilgileri',
      rows: [
        ['Satıcı tipi', SELLER_TYPE_LABELS[draft.sellerType]],
        ['Ad Soyad', draft.legalName],
        ['T.C. Kimlik No', maskTckn(draft.tckn)],
        ...(draft.sellerType === 'company' ? ([['Unvan', draft.companyTitle]] as [string, string][]) : []),
        ...(draft.sellerType !== 'individual' ? ([['Vergi', `${draft.taxOffice} · ${draft.taxNo}`]] as [string, string][]) : []),
        ['Mağaza adı', draft.storeName || '—'],
      ],
    },
    { step: 4, title: 'İade adresi', rows: [['Adres', `${draft.address.neighborhood} ${draft.address.line}, ${draft.address.district}/${draft.address.city}`]] },
    { step: 5, title: 'Ödeme hesabı', rows: [['IBAN', `${bankFromIban(iban) ?? 'Banka'} · ${maskIban(iban)}`]] },
    { step: 6, title: 'Telefon', rows: [['Cep telefonu', `+90 ${formatPhone(draft.phone).slice(1)}`]] },
  ];
  return (
    <View style={{ gap: 14 }}>
      <View style={{ gap: 6 }}>
        <Text variant="title2">Her şey doğru mu?</Text>
        <Text variant="callout" color="textSecondary">
          Başvurunu göndermeden önce bilgilerini kontrol et.
        </Text>
      </View>
      {sections.map((s) => (
        <Card key={s.title} style={{ gap: 4 }}>
          <View style={[styles.inline, { justifyContent: 'space-between', marginBottom: 2 }]}>
            <Text variant="headline" weight="700">
              {s.title}
            </Text>
            <Text variant="subhead" weight="700" color="accent" onPress={() => goTo(s.step)} suppressHighlighting>
              Düzenle
            </Text>
          </View>
          {s.rows.map(([k, v]) => (
            <KeyValue key={k} label={k} value={v} />
          ))}
        </Card>
      ))}
      <Text variant="footnote" color="textSecondary">
        Başvurunu göndererek verdiğin bilgilerin doğru olduğunu ve Satıcı Sözleşmesi’ni kabul ettiğini onaylarsın.
      </Text>
    </View>
  );
}

// ─── Gönderildi ──────────────────────────────────────────────────────────────

function SuccessView() {
  const { colors } = useTheme();
  const status = useSellerStore((s) => s.application.status);
  const approved = status === 'approved';
  const goHub = () => {
    if (router.canGoBack()) router.back();
    router.navigate('/sell');
  };
  return (
    <View style={styles.success}>
      <Animated.View key={approved ? 'a' : 'p'} entering={ZoomIn.springify().damping(14)} style={[styles.successIcon, { backgroundColor: approved ? colors.primarySoft : tint(colors.success, 0.15) }]}>
        <Text style={{ fontSize: 52, lineHeight: 60 }}>{approved ? '🎉' : '📨'}</Text>
      </Animated.View>
      <Text variant="title1" align="center">
        {approved ? 'Onaylandı! Hoş geldin' : 'Başvurun alındı!'}
      </Text>
      <Text variant="body" color="textSecondary" align="center" style={{ maxWidth: 320 }}>
        {approved
          ? 'Artık ürün ekleyip yayın takvimini oluşturabilirsin. Panelde seni ilk yayınına hazırlayacak birkaç adım var.'
          : 'Demo sürümde başvurular birkaç saniye içinde otomatik onaylanır; sonucu bildirimlerinde de göreceksin.'}
      </Text>
      <StatusPill label={approved ? 'Satıcı hesabı aktif' : 'İnceleniyor…'} tone={approved ? 'success' : 'warning'} icon={approved ? 'checkmark-circle' : 'time'} style={{ alignSelf: 'center' }} />
      <View style={{ alignSelf: 'stretch', gap: 10, marginTop: 18 }}>
        <Button title={approved ? 'Satıcı Paneline Git' : 'Tamam'} size="lg" fullWidth onPress={goHub} />
      </View>
    </View>
  );
}

// ─── Ana akış ────────────────────────────────────────────────────────────────

export function ApplyFlow() {
  const { colors } = useTheme();
  const qaOffset = useQaOffset();
  const me = useMe();
  const status = useSellerStore((s) => s.application.status);
  const submitApplication = useSellerStore((s) => s.submitApplication);
  const setIban = useSellerStore((s) => s.setIban);
  const setKyc = useSellerExtras((s) => s.setKyc);
  const now = useNow(60_000);
  const [draft, set] = useDraft();
  // Yalnızca geliştirme: ?qa=step3 → doğrudan 4. adım, ?qa=done → başarı ekranı (ekran görüntüsü QA'sı)
  const qa = useQaParam();
  const qaStep = qa?.startsWith('step') ? Math.min(STEP_TITLES.length - 1, Number(qa.slice(4)) || 0) : undefined;
  const [step, setStep] = useState(qaStep ?? 0);
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(qa === 'done');
  const [legal, setLegal] = useState<'rules' | 'terms' | null>(null);
  const [fromSummary, setFromSummary] = useState(false);
  const scrollRef = useRef<ScrollViewInstance>(null);

  // İade adresi adımına gelince ad soyadı otomatik doldur
  useEffect(() => {
    if (step === 4 && !draft.address.fullName && draft.legalName) set({ address: { ...draft.address, fullName: draft.legalName } });
  }, [step, draft.address, draft.legalName, set]);

  if (done) {
    return (
      <Screen>
        <Header safeTop={MODAL_SAFE_TOP} back="close" onBack={() => (router.canGoBack() ? router.back() : router.replace('/sell'))} title="Satıcı Başvurusu" />
        <SuccessView />
      </Screen>
    );
  }

  if ((me.isSeller || status !== 'none') && qaStep === undefined) {
    const pending = status === 'pending' && !me.isSeller;
    return (
      <Screen>
        <Header safeTop={MODAL_SAFE_TOP} back="close" title="Satıcı Başvurusu" />
        <View style={styles.success}>
          <Text style={{ fontSize: 52, lineHeight: 60 }}>{pending ? '⏳' : '✅'}</Text>
          <Text variant="title2" align="center">
            {pending ? 'Başvurun inceleniyor' : 'Zaten satıcısın'}
          </Text>
          <Text variant="callout" color="textSecondary" align="center">
            {pending ? 'Sonuçlandığında sana bildirim göndereceğiz.' : "Satıcı Paneli'nden yayın planlayabilir ve ürün ekleyebilirsin."}
          </Text>
          <Button
            title="Satıcı Paneline Git"
            size="lg"
            fullWidth
            style={{ marginTop: 16 }}
            onPress={() => {
              if (router.canGoBack()) router.back();
              router.navigate('/sell');
            }}
          />
        </View>
      </Screen>
    );
  }

  const ibanValid = draft.ibanDigits.length === 24 && isValidIban(`TR${draft.ibanDigits}`);
  const addressErrors = validateAddress(draft.address);
  const idErrors = identityErrors(draft, now);

  const stepValid = [
    draft.rulesAccepted && draft.termsAccepted,
    !!draft.categoryId && !!draft.subcategoryId,
    !!draft.experience && !!draft.monthlyVolume,
    Object.values(idErrors).every((e) => !e),
    Object.keys(addressErrors).length === 0,
    ibanValid,
    draft.phoneVerified,
    true,
  ];
  // Butonu yalnızca seçim adımlarında pasif tut; form adımlarında hataları göster
  const softSteps = [3, 4, 5];

  const goTo = (s: number) => {
    setStep(s);
    setSubmitted(false);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  };

  const next = () => {
    if (!stepValid[step]) {
      setSubmitted(true);
      haptic.warning();
      return;
    }
    haptic.light();
    if (step < STEP_TITLES.length - 1) {
      // Özetten düzenlemeye gelindiyse doğrudan özete dön
      goTo(fromSummary ? STEP_TITLES.length - 1 : step + 1);
      setFromSummary(false);
      return;
    }
    // Gönder
    setSending(true);
    setTimeout(() => {
      const iban = `TR${draft.ibanDigits}`;
      submitApplication({
        categoryId: draft.categoryId,
        experience: draft.experience ? EXPERIENCE_LABELS[draft.experience] : undefined,
        monthlyVolume: draft.monthlyVolume,
        storeName: draft.storeName,
        iban,
        taxType: draft.sellerType,
      });
      setIban(iban);
      setKyc({
        sellerType: draft.sellerType,
        legalName: draft.legalName.trim(),
        tckn: draft.tckn,
        birthDate: draft.birthDate,
        taxOffice: draft.taxOffice || undefined,
        taxNo: draft.taxNo || undefined,
        companyTitle: draft.companyTitle || undefined,
        returnAddress: draft.address,
        phone: draft.phone,
        phoneVerified: draft.phoneVerified,
        experience: draft.experience ?? 'new',
        platforms: draft.platforms,
        monthlyVolume: draft.monthlyVolume ?? '',
        subcategoryId: draft.subcategoryId,
        marketingConsent: draft.marketing,
      });
      setSending(false);
      setDone(true);
      haptic.success();
      scheduleAutoApproval(4000);
    }, 1200);
  };

  const back = () => {
    if (step === 0) {
      if (router.canGoBack()) router.back();
      else router.replace('/sell');
      return;
    }
    setFromSummary(false);
    goTo(step - 1);
  };

  const last = step === STEP_TITLES.length - 1;
  const disabled = !softSteps.includes(step) && !stepValid[step];

  return (
    <Screen>
      <Header safeTop={MODAL_SAFE_TOP} back={step === 0 ? 'close' : true} onBack={back} title="Satıcı Başvurusu" subtitle={`Adım ${step + 1}/${STEP_TITLES.length} · ${STEP_TITLES[step]}`} />
      <StepBar step={step} total={STEP_TITLES.length} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentOffset={qaOffset} ref={scrollRef} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {step === 0 ? <WelcomeStep draft={draft} set={set} onLegal={setLegal} /> : null}
          {step === 1 ? <CategoryStep draft={draft} set={set} /> : null}
          {step === 2 ? <ExperienceStep draft={draft} set={set} /> : null}
          {step === 3 ? <IdentityStep draft={draft} set={set} submitted={submitted} /> : null}
          {step === 4 ? (
            <View style={{ gap: 16 }}>
              <View style={{ gap: 6 }}>
                <Text variant="title2">Paketlerin nereye dönsün?</Text>
                <Text variant="callout" color="textSecondary">
                  Alıcının geri gönderdiği ya da teslim edilemeyen paketler bu adrese ulaştırılır. Adresin alıcılara gösterilmez.
                </Text>
              </View>
              <AddressForm value={draft.address} onChange={(address) => set({ address })} errors={submitted ? addressErrors : {}} />
            </View>
          ) : null}
          {step === 5 ? (
            <View style={{ gap: 16 }}>
              <View style={{ gap: 6 }}>
                <Text variant="title2">Kazancını nereye gönderelim?</Text>
                <Text variant="callout" color="textSecondary">
                  Gerçek sürümde kazancın, lisanslı bir ödeme kuruluşu aracılığıyla bu IBAN’a 1-2 iş günü içinde aktarılır. Demo sürümde para aktarımı yapılmaz.
                </Text>
              </View>
              <IbanField digits={draft.ibanDigits} onChange={(ibanDigits) => set({ ibanDigits })} error={submitted && !ibanValid ? (draft.ibanDigits.length < 24 ? 'IBAN 24 haneden oluşmalı' : 'Geçersiz IBAN') : undefined} />
              <Card style={{ flexDirection: 'row', gap: 10, backgroundColor: colors.surface, borderColor: colors.surface }}>
                <Icon name="person-circle-outline" size={22} color="textSecondary" />
                <View style={{ flex: 1 }}>
                  <Text variant="footnote" color="textSecondary">
                    Hesap sahibi
                  </Text>
                  <Text variant="callout" weight="700">
                    {draft.sellerType === 'company' && draft.companyTitle ? draft.companyTitle : draft.legalName || '—'}
                  </Text>
                  <Text variant="footnote" color="textSecondary" style={{ marginTop: 4 }}>
                    IBAN {draft.sellerType === 'company' ? 'şirket unvanına' : 'kendi adına'} kayıtlı olmalı. Ad eşleşmezse ödeme bankadan iade edilir.
                  </Text>
                </View>
              </Card>
              {__DEV__ ? (
                <Text variant="footnote" weight="700" color="accent" onPress={() => set({ ibanDigits: '330006100519786457841326' })} suppressHighlighting>
                  Test IBAN’ı kullan (geliştirici)
                </Text>
              ) : null}
            </View>
          ) : null}
          {step === 6 ? <PhoneStep draft={draft} set={set} /> : null}
          {step === 7 ? (
            <SummaryStep
              draft={draft}
              goTo={(target) => {
                setFromSummary(true);
                goTo(target);
              }}
            />
          ) : null}
        </ScrollView>
        <StickyFooter>
          <Button
            title={last ? 'Başvuruyu Gönder' : fromSummary ? 'Özete dön' : 'Devam'}
            size="lg"
            fullWidth
            loading={sending}
            disabled={disabled}
            iconRight={last ? undefined : 'arrow-forward'}
            onPress={next}
          />
        </StickyFooter>
      </KeyboardAvoidingView>
      <Sheet
        visible={!!legal}
        onClose={() => setLegal(null)}
        title={legal === 'rules' ? 'Topluluk Kuralları' : 'Satıcı Sözleşmesi ve KVKK'}
        showClose
        footer={
          <Button
            title="Okudum, kabul ediyorum"
            size="lg"
            fullWidth
            onPress={() => {
              set(legal === 'rules' ? { rulesAccepted: true } : { termsAccepted: true });
              setLegal(null);
            }}
          />
        }>
        <Text variant="callout" color="textSecondary" style={{ lineHeight: 22 }}>
          {legal ? LEGAL_TEXT[legal] : ''}
        </Text>
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: SCREEN_PADDING, paddingBottom: 32 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  welcomeArt: { width: 88, height: 88, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  catTile: { aspectRatio: 1, borderRadius: radius.md, borderWidth: 2, alignItems: 'center', justifyContent: 'center', gap: 6, padding: 6 },
  catCheck: { position: 'absolute', top: 6, right: 6, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  verified: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center' },
  demoCode: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: radius.md },
  success: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 10 },
  successIcon: { width: 112, height: 112, borderRadius: 56, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
});
