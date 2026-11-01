/**
 * "Teklife hazırlan": canlı yayında teklif / satın alma öncesi tek sayfalık kurulum.
 * Yalnızca eksik olan gösterilir: kart, kısa adres formu ve teklif kuralları onayı (zorunlu kutu).
 * Üstte sahnedeki ürünün canlı mini kartı durur; kaydedince bekleyen teklif hemen verilir.
 * Yayının bir kısmı üstte görünür kalsın diye sayfa tam ekran açılmaz.
 */
import { Image } from 'expo-image';
import { useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Button, Icon, PressableScale, SelectField, Sheet, Text, TextField, type IconName } from '@/components/ui';
import { DEMO_COPY, DEMO_MODE } from '@/config/demo';
import { districtsOf, neighborhoodsOf, PROVINCES } from '@/data/turkey';
import { LEGAL_DOCS } from '@/features/account/content';
import { contractSections } from '@/features/commerce/infoSheets';
import { BINDING_BID_SHORT, BINDING_BID_TEXT, ESCROW_TEXT, WIN_COST_NOTE } from '@/features/commerce/utils';
import { CardForm, emptyAddress, emptyCard, TestCardHint, validateAddress, validateCard, type AddressDraft, type CardDraft } from '@/features/wallet/forms';
import { nextMinBid } from '@/lib/auction';
import { formatCountdown, formatTRY } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { useAuthStore, useMe } from '@/store/auth';
import { useWalletStore } from '@/store/wallet';
import { liveColors } from '@/theme';
import type { Product, User } from '@/types';

import { alpha } from '../components/styles';
import type { LiveLot } from '../engine';
import { useLivePrefs } from '../liveStore';
import { useRemaining } from '../useLiveShow';

/**
 * Kurulumun nedeni (başlık ve düğme metni buna göre):
 * bid = basılı tutarak teklif, bidFlow = özel tutar / ön teklif, buy = Hemen Al,
 * other = çekiliş vb., setup = "Mezata hazır ol" (bekleyen işlem yok)
 */
export type BidSetupIntent = 'bid' | 'bidFlow' | 'buy' | 'other' | 'setup';

export type BidSetupRequest = {
  /** Her açılışta yeni: sayfa taslakları temiz başlar */
  id: number;
  intent: BidSetupIntent;
  /** Teklif verilmek istenen lot; basılı tutarak verilen teklifte seçilen tutar da gelir */
  bid?: { amount?: number; lot: LiveLot };
  needCard: boolean;
  needAddress: boolean;
  needRules: boolean;
};

export type BidSetupSheetProps = {
  visible: boolean;
  request: BidSetupRequest;
  /** Motordaki güncel lot (her anlık görüntüde güncellenir) */
  lot?: LiveLot;
  seller: User;
  onClose: () => void;
  /** Bilgiler kaydedildi: sayfa kapatılır, bekleyen işlem sürdürülür */
  onSaved: () => void;
};

type Rule = { icon: IconName; tint: string; text: string; note?: string };

const RULES: Rule[] = [
  { icon: 'card-outline', tint: liveColors.primaryBright, text: 'Kazanırsan ödeme kayıtlı kartından otomatik alınır.', note: DEMO_MODE ? DEMO_COPY.payment : undefined },
  { icon: 'hammer-outline', tint: liveColors.copper, text: BINDING_BID_SHORT },
  { icon: 'receipt-outline', tint: liveColors.accent, text: `${WIN_COST_NOTE}.` },
];

const PROTECTION_TEXT = `Paket hiç gelmezse ya da ürün ilanda anlatılandan belirgin biçimde farklı çıkarsa iadeyi biz başlatırız; teslimattan sonraki 14 gün içinde sipariş detayından bize yazman yeterli. ${ESCROW_TEXT}`;

/** Doğrulanmış telefonu (+90…) adres formundaki "5XX XXX XX XX" biçimine çevirir; TR cep numarası değilse boş */
function localPhone(raw?: string): string {
  if (!raw) return '';
  const d = raw.replace(/\D/g, '').replace(/^90/, '').replace(/^0/, '');
  if (d.length !== 10 || d[0] !== '5') return '';
  return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6, 8)} ${d.slice(8)}`;
}

/** Satır içi açılan "Ön Bilgilendirme ve teklif kuralları" metni (ikinci bir modal açılmaz) */
function termsSections(product: Product | undefined, seller: User): { h: string; p: string }[] {
  const base = [
    { h: 'Teklifler bağlayıcıdır', p: BINDING_BID_TEXT },
    { h: 'Alıcı Koruması', p: PROTECTION_TEXT },
  ];
  if (!product) return [...base, ...(LEGAL_DOCS.find((d) => d.id === 'distance')?.sections ?? [])];
  // Alıcı bilgileri ve tutar dökümü (2. ve 3. maddeler) teklif anında belli değil: ödeme adımında gösterilir
  const { pre, distance } = contractSections({ product, seller, quantity: 1, itemTotal: 0, shipping: 0, serviceFee: 0, discount: 0, total: 0, address: undefined, buyerName: '' });
  return [
    ...base,
    ...pre.filter(([h]) => !/^[23]\./.test(h)).map(([h, p]) => ({ h: `Ön Bilgilendirme · ${h}`, p })),
    ...distance.filter(([h]) => /^Madde [36] /.test(h)).map(([h, p]) => ({ h, p })),
  ];
}

/** Sahnedeki ürünün canlı mini kartı: görsel, başlık, kalan süre / sonuç ve güncel fiyat */
function MiniLot({ lot, running }: { lot?: LiveLot; running: boolean }) {
  const remaining = useRemaining(running ? lot?.endsAt : undefined);
  if (!lot) {
    return (
      <View style={[styles.lot, styles.lotWaiting]}>
        <ActivityIndicator size="small" color={liveColors.textSecondary} />
        <View style={styles.flex}>
          <Text variant="subhead" weight="700" color={liveColors.text}>
            Sıradaki ürün bekleniyor
          </Text>
          <Text variant="caption" weight="500" color={liveColors.textTertiary}>
            Şimdi hazırlanırsan ilk teklifi tek dokunuşla verirsin.
          </Text>
        </View>
      </View>
    );
  }
  const result = lot.status === 'sold' ? 'SATILDI' : lot.status === 'unsold' ? 'SATILMADI' : 'SONA ERDİ';
  const priceLabel = running ? (lot.bidCount === 0 ? 'Açılış fiyatı' : 'Güncel teklif') : lot.status === 'sold' ? 'Satış fiyatı' : 'Son fiyat';
  const danger = running && remaining < 5;
  return (
    <View style={styles.lot} accessible accessibilityLabel={`${lot.product.title}, ${priceLabel} ${formatTRY(lot.currentBid)}${running ? `, kalan süre ${formatCountdown(remaining)}` : `, ${result.toLocaleLowerCase('tr-TR')}`}`}>
      <Image source={{ uri: lot.product.images[0] }} style={styles.thumb} contentFit="cover" cachePolicy="memory-disk" recyclingKey={lot.product.id} />
      <View style={styles.flex}>
        <Text variant="footnote" weight="700" color={liveColors.text} numberOfLines={2}>
          {lot.product.title}
        </Text>
        <View style={styles.lotMeta}>
          {running ? (
            <>
              <Icon name="time-outline" size={13} color={danger ? liveColors.live : liveColors.textSecondary} />
              <Text variant="footnote" weight="800" tabular color={danger ? liveColors.live : liveColors.text}>
                {formatCountdown(remaining)}
              </Text>
              <Text variant="caption" weight="500" color={liveColors.textTertiary}>
                kaldı
              </Text>
            </>
          ) : (
            <View style={[styles.result, lot.status === 'sold' ? styles.resultSold : null]}>
              <Text variant="caption" weight="900" color={liveColors.text}>
                {result}
              </Text>
            </View>
          )}
        </View>
      </View>
      <View style={styles.lotPrice}>
        <Text variant="caption" weight="600" color={liveColors.textTertiary} numberOfLines={1}>
          {priceLabel}
        </Text>
        <Text variant="title3" weight="800" tabular color={running ? liveColors.text : liveColors.textSecondary} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
          {formatTRY(lot.currentBid)}
        </Text>
      </View>
    </View>
  );
}

function Section({ icon, title, children }: { icon: IconName; title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Icon name={icon} size={15} color={liveColors.accent} />
        <Text variant="subhead" weight="800" color={liveColors.text}>
          {title}
        </Text>
      </View>
      {children}
    </View>
  );
}

export function BidSetupSheet({ visible, request, lot, seller, onClose, onSaved }: BidSetupSheetProps) {
  const { intent, bid, needCard, needAddress, needRules } = request;
  const me = useMe();
  const authPhone = useAuthStore((s) => s.phone);
  const addPaymentMethod = useWalletStore((s) => s.addPaymentMethod);
  const addAddress = useWalletStore((s) => s.addAddress);

  // Ad soyad profilden (kullanıcı adına benziyorsa boş), telefon doğrulanmış numaradan gelir; geçersizse alanlar açık başlar
  const [initialAddress] = useState<AddressDraft>(() => {
    const name = me.displayName.trim();
    return { ...emptyAddress(/^[\p{L} .'-]+$/u.test(name) ? name : ''), phone: localPhone(authPhone) };
  });
  const [address, setAddress] = useState<AddressDraft>(initialAddress);
  const [contactOpen, setContactOpen] = useState(() => {
    const e = validateAddress(initialAddress);
    return !!(e.fullName || e.phone);
  });
  const [card, setCard] = useState<CardDraft>(emptyCard);
  const [agreed, setAgreed] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const savedRef = useRef(false);

  // Teklif lotunun son görülen hâli: lot bitip sahneden kalkınca sonucu (SATILDI…) göstermek için
  const [seen, setSeen] = useState<LiveLot | undefined>(bid?.lot);
  if (bid && lot && lot.id === bid.lot.id && lot !== seen) setSeen(lot);

  const shownLot = bid ? seen : lot;
  const target = bid ? (lot && lot.id === bid.lot.id ? lot : undefined) : lot;
  const running = target?.status === 'running';
  const missed = !!bid && !running;
  const bidAmount = bid?.amount != null && target && running ? Math.max(bid.amount, nextMinBid(target.currentBid, target.bidCount > 0)) : 0;

  const consentOnly = needRules && !needCard && !needAddress;
  const verb = consentOnly ? 'Onayla' : 'Kaydet';
  // Lot bittiyse yalnızca kaydedilir (teklif verilmez, özel tutar sayfası açılmaz)
  let cta = verb;
  if (!missed) {
    if (intent === 'bid') {
      if (bidAmount > 0) cta = `${verb} ve ${formatTRY(bidAmount)} teklif ver`;
    } else if (intent !== 'setup') cta = `${verb} ve devam et`;
  }

  const title = intent === 'buy' ? 'Satın almaya hazırlan' : intent === 'other' ? 'Bilgilerini tamamla' : 'Teklife hazırlan';
  const then = intent === 'buy' ? 'satın al' : intent === 'other' ? 'devam et' : 'teklif ver';
  const subtitle = consentOnly ? 'İlk teklifinden önce kuralları bir kez onayla.' : `Bir kez kaydet, sonra tek dokunuşla ${then}.`;

  // Doğrulama: düğme, zorunlu alanlar geçerli ve kutu işaretli olana dek kapalı
  const cardErrors = needCard ? validateCard(card) : {};
  const addrErrors = needAddress ? validateAddress(address) : {};
  const cardDigits = card.number.replace(/\D/g, '').length;
  // Yazarken hata gösterilmez; yalnızca tamamlanmış görünen alanlar uyarı alır
  const shownCardErrors = {
    number: cardDigits >= 15 ? cardErrors.number : undefined,
    expiry: card.expiry.length === 5 ? cardErrors.expiry : undefined,
  };
  const phoneDigits = address.phone.replace(/\D/g, '').length;
  const missing: string[] = [];
  if (Object.keys(cardErrors).length) missing.push('kart bilgileri');
  if (addrErrors.fullName || addrErrors.phone) missing.push('ad soyad ve telefon');
  if (addrErrors.city || addrErrors.district || addrErrors.neighborhood) missing.push('il, ilçe, mahalle');
  if (addrErrors.line) missing.push('açık adres');
  if (needRules && !agreed) missing.push('kural onayı');
  const canSubmit = missing.length === 0 && !saved;

  const submit = () => {
    // Çift dokunuş: bekleyen teklif yalnızca bir kez sürdürülür
    if (!canSubmit || savedRef.current) return;
    savedRef.current = true;
    setSaved(true);
    if (needCard) addPaymentMethod({ number: card.number, holder: card.holder.trim(), expiry: card.expiry });
    if (needAddress) addAddress({ ...address, fullName: address.fullName.trim().replace(/\s+/g, ' '), line: address.line.trim() });
    if (needRules) useLivePrefs.getState().acceptBidRules();
    haptic.success();
    onSaved();
  };

  const setAddr = <K extends keyof AddressDraft>(k: K, v: AddressDraft[K]) => setAddress((a) => ({ ...a, [k]: v }));

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      dark
      title={title}
      subtitle={subtitle}
      showClose
      maxHeight={0.8}
      footer={
        <View style={styles.footer}>
          <Button title={cta} size="lg" fullWidth icon={intent === 'bid' && bidAmount > 0 ? 'hammer' : 'checkmark'} disabled={!canSubmit} onPress={submit} />
          <View style={styles.footNote}>
            <Icon name={missing.length ? 'alert-circle-outline' : 'lock-closed'} size={12} color={liveColors.textTertiary} />
            <Text variant="caption" weight="500" color={liveColors.textTertiary} numberOfLines={2} style={styles.shrink}>
              {missing.length ? `Tamamla: ${missing.join(' · ')}` : DEMO_MODE ? `${DEMO_COPY.short}: ödeme alınmaz` : 'Bağlantı şifrelidir'}
            </Text>
          </View>
        </View>
      }>
      <View style={styles.body}>
        <MiniLot lot={shownLot} running={running} />
        {missed ? (
          <Animated.View entering={FadeIn.duration(180)} style={styles.missed}>
            <Icon name="information-circle-outline" size={15} color={liveColors.copper} />
            <Text variant="footnote" weight="600" color={liveColors.textSecondary} style={styles.shrink}>
              {shownLot?.status === 'sold' ? 'Bu ürün satıldı.' : 'Bu ürünün açık artırması sona erdi.'} {consentOnly ? 'Kuralları onayla' : 'Bilgilerini kaydet'}, sıradaki üründe tek dokunuşla teklif ver.
            </Text>
          </Animated.View>
        ) : null}

        {needCard ? (
          <Section icon="card-outline" title="Ödeme yöntemi">
            <CardForm compact value={card} onChange={setCard} errors={shownCardErrors} />
            <View style={styles.cardFoot}>
              <Text variant="caption" weight="500" color={liveColors.textTertiary} style={styles.shrink}>
                {needRules ? 'Kayıt sırasında kartından ücret alınmaz.' : DEMO_MODE ? DEMO_COPY.payment : 'Kartın 3D Secure ile doğrulanır; kayıt sırasında ücret alınmaz.'}
              </Text>
              <TestCardHint onUse={setCard} />
            </View>
          </Section>
        ) : null}

        {needAddress ? (
          <Section icon="location-outline" title="Teslimat adresi">
            {contactOpen ? (
              <>
                <TextField
                  label="Ad Soyad"
                  value={address.fullName}
                  onChangeText={(v) => setAddr('fullName', v)}
                  autoCapitalize="words"
                  textContentType="name"
                  autoComplete="name"
                  error={address.fullName.trim() ? addrErrors.fullName : undefined}
                />
                <TextField
                  label="Cep telefonu"
                  prefix="+90"
                  value={address.phone}
                  onChangeText={(v) => setAddr('phone', v.replace(/[^\d ]/g, '').slice(0, 13))}
                  keyboardType="phone-pad"
                  placeholder="5XX XXX XX XX"
                  textContentType="telephoneNumber"
                  autoComplete="tel"
                  error={phoneDigits >= 10 ? addrErrors.phone : undefined}
                />
              </>
            ) : (
              <PressableScale
                scaleTo={0.98}
                onPress={() => setContactOpen(true)}
                style={styles.contact}
                accessibilityRole="button"
                accessibilityLabel={`Teslim alacak kişi ${address.fullName}, telefon ${address.phone}. Düzenle`}>
                <Icon name="person-circle-outline" size={20} color={liveColors.textSecondary} />
                <View style={styles.flex}>
                  <Text variant="footnote" weight="700" color={liveColors.text} numberOfLines={1}>
                    {address.fullName}
                  </Text>
                  <Text variant="caption" weight="500" color={liveColors.textTertiary} numberOfLines={1}>
                    +90 {address.phone} · doğrulanmış numara
                  </Text>
                </View>
                <Text variant="footnote" weight="700" color={liveColors.accent}>
                  Düzenle
                </Text>
              </PressableScale>
            )}
            <View style={styles.row}>
              <SelectField
                label="İl"
                value={address.city}
                options={[...PROVINCES]}
                searchable
                onChange={(v) => setAddress((a) => ({ ...a, city: v, district: '', neighborhood: '' }))}
                style={styles.flex}
              />
              <SelectField
                label="İlçe"
                value={address.district}
                options={address.city ? districtsOf(address.city) : []}
                searchable
                disabled={!address.city}
                onChange={(v) => setAddress((a) => ({ ...a, district: v, neighborhood: '' }))}
                style={styles.flex}
              />
            </View>
            <SelectField
              label="Mahalle"
              value={address.neighborhood}
              options={address.district ? neighborhoodsOf(address.district).map((n) => `${n} Mah.`) : []}
              searchable
              disabled={!address.district}
              onChange={(v) => setAddr('neighborhood', v)}
            />
            <TextField
              label="Açık adres"
              value={address.line}
              onChangeText={(v) => setAddr('line', v)}
              placeholder="Sokak, bina no, daire"
              textContentType="streetAddressLine1"
              autoComplete="street-address"
            />
          </Section>
        ) : null}

        {needRules ? (
          <Section icon="hammer-outline" title="Teklif kuralları">
            <View style={styles.rules}>
              {RULES.map((r) => (
                <View key={r.icon} style={styles.rule}>
                  <View style={[styles.ruleIcon, { backgroundColor: alpha(r.tint, 0.14), borderColor: alpha(r.tint, 0.35) }]}>
                    <Icon name={r.icon} size={16} color={r.tint} />
                  </View>
                  <View style={styles.flex}>
                    <Text variant="footnote" weight="600" color={liveColors.text}>
                      {r.text}
                    </Text>
                    {r.note ? (
                      <Text variant="caption" weight="500" color={liveColors.textTertiary} style={styles.ruleNote}>
                        {r.note}
                      </Text>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
            <PressableScale
              scaleTo={0.98}
              onPress={() => {
                haptic.tap();
                setAgreed((v) => !v);
              }}
              style={[styles.check, agreed && styles.checkOn]}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: agreed }}>
              <View style={[styles.box, agreed && styles.boxOn]}>{agreed ? <Icon name="checkmark" size={15} color={liveColors.onPrimary} /> : null}</View>
              <Text variant="subhead" weight="700" color={liveColors.text} style={styles.shrink}>
                Teklif kurallarını okudum, onaylıyorum.
              </Text>
            </PressableScale>
            <PressableScale
              scaleTo={0.98}
              onPress={() => setTermsOpen((v) => !v)}
              style={styles.termsLink}
              accessibilityRole="button"
              accessibilityState={{ expanded: termsOpen }}>
              <Icon name="document-text-outline" size={15} color={liveColors.accent} />
              <Text variant="footnote" weight="700" color={liveColors.accent} style={styles.shrink}>
                Ön Bilgilendirme ve teklif kuralları
              </Text>
              <Icon name={termsOpen ? 'chevron-up' : 'chevron-down'} size={14} color={liveColors.accent} />
            </PressableScale>
            {termsOpen ? (
              <Animated.View entering={FadeIn.duration(160)} style={styles.terms}>
                {termsSections(shownLot?.product, seller).map((s) => (
                  <View key={s.h} style={styles.termsItem}>
                    <Text variant="caption" weight="800" color={liveColors.text}>
                      {s.h}
                    </Text>
                    <Text variant="caption" weight="500" color={liveColors.textSecondary}>
                      {s.p}
                    </Text>
                  </View>
                ))}
              </Animated.View>
            ) : null}
          </Section>
        ) : null}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  shrink: { flexShrink: 1 },
  body: { gap: 18, paddingTop: 2, paddingBottom: 6 },
  row: { flexDirection: 'row', gap: 10 },
  lot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: liveColors.border,
    backgroundColor: liveColors.panelAlt,
  },
  lotWaiting: { paddingVertical: 14, paddingHorizontal: 14 },
  thumb: { width: 48, height: 48, borderRadius: 10, backgroundColor: liveColors.panel },
  lotMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3, minHeight: 18 },
  lotPrice: { alignItems: 'flex-end', maxWidth: '36%', minWidth: 72 },
  result: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1, backgroundColor: liveColors.panel },
  resultSold: { backgroundColor: liveColors.live },
  missed: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: -8,
    padding: 10,
    borderRadius: 12,
    backgroundColor: alpha(liveColors.copper, 0.1),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: alpha(liveColors.copper, 0.35),
  },
  section: { gap: 10 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  contact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: liveColors.panelAlt,
  },
  rules: { gap: 10 },
  rule: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  ruleIcon: { width: 32, height: 32, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
  ruleNote: { marginTop: 2 },
  termsLink: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingVertical: 2 },
  terms: { gap: 10, padding: 12, borderRadius: 12, backgroundColor: liveColors.panelAlt },
  termsItem: { gap: 2 },
  check: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: liveColors.border,
    backgroundColor: liveColors.glassLight,
  },
  checkOn: { borderColor: alpha(liveColors.primaryBright, 0.7), backgroundColor: alpha(liveColors.primary, 0.16) },
  box: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: liveColors.textTertiary, alignItems: 'center', justifyContent: 'center' },
  boxOn: { backgroundColor: liveColors.primary, borderColor: liveColors.primary },
  footer: { gap: 8 },
  footNote: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
});
