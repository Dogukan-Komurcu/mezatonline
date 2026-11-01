/**
 * Bilgi sayfaları: Alıcı Koruması, sözleşmeler (Ön Bilgilendirme + Mesafeli Satış), taksit tablosu.
 */
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Button, Icon, Segmented, Sheet, Text, type IconName } from '@/components/ui';
import { DEMO_COPY } from '@/config/demo';
import { formatDate, formatTRY } from '@/lib/format';
import { radius, useTheme } from '@/theme';
import type { Address, Product, User } from '@/types';

import { allPrograms, installmentPlan, INSTALLMENT_COUNTS, MIN_INSTALLMENT_TOTAL } from './installments';
import { addressLine, ESCROW_TEXT } from './utils';

// ─── Alıcı Koruması ──────────────────────────────────────────────────────────

const PROTECTION_POINTS: { icon: IconName; title: string; body: string }[] = [
  {
    icon: 'cube-outline',
    title: 'Paket gelmezse',
    body: 'Satıcı paketi 2 iş günü içinde kargoya vermezse ya da paket yolda kaybolursa sipariş detayından talep açabilirsin. Ürün sana hiç ulaşmazsa ödediğin tutarın tamamı iade edilir.',
  },
  {
    icon: 'search-outline',
    title: 'İlandan farklı çıkarsa',
    body: 'Kırık, eksik ya da ilandaki fotoğraf ve açıklamayla belirgin biçimde farklı bir ürün geldiyse teslimattan sonraki 14 gün içinde fotoğraf ekleyerek bildir.',
  },
  {
    icon: 'ribbon-outline',
    title: 'Taklit şüphesi',
    body: 'Ürünün orijinal olmadığını düşünüyorsan yine 14 gün içinde bildir; bu talepleri satıcının yanı sıra Mezatonline destek ekibi de inceler.',
  },
  {
    icon: 'lock-closed-outline',
    title: 'Güvenli ödeme',
    body: `${ESCROW_TEXT} Satıcı IBAN, elden ödeme gibi başka bir yol önerirse kabul etme; bu ödemeler korumaya girmez. ${DEMO_COPY.payment}`,
  },
];

export function BuyerProtectionSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { colors } = useTheme();
  return (
    <Sheet visible={visible} onClose={onClose} showClose footer={<Button title="Anladım" size="lg" fullWidth onPress={onClose} />}>
      <View style={styles.protHead}>
        <View style={[styles.protBadge, { backgroundColor: colors.primary }]}>
          <Icon name="shield-checkmark" size={34} color={colors.onPrimary} />
        </View>
        <Text variant="title2" align="center">
          Alıcı Koruması
        </Text>
        <Text variant="callout" color="textSecondary" align="center">
          Mezatonline üzerinden ödediğin her siparişte geçerlidir. Paket hiç gelmezse ya da ürün ilandakinden belirgin biçimde farklı çıkarsa sorunu teslimattan sonraki 14 gün içinde bildir; inceleyip iadeni başlatalım.
        </Text>
      </View>
      <View style={styles.points}>
        {PROTECTION_POINTS.map((p) => (
          <View key={p.title} style={styles.point}>
            <View style={[styles.pointIcon, { backgroundColor: colors.surface }]}>
              <Icon name={p.icon} size={20} color="text" />
            </View>
            <View style={styles.flexGap}>
              <Text variant="callout" weight="700">
                {p.title}
              </Text>
              <Text variant="footnote" color="textSecondary">
                {p.body}
              </Text>
            </View>
          </View>
        ))}
      </View>
      <Text variant="footnote" color="textTertiary" style={styles.fine}>
        Alıcı Koruması yasal haklarına ek olarak sunulur. Satıcı kurumsal (tacir veya esnaf) ise 6502 sayılı Tüketicinin Korunması Hakkında Kanun kapsamındaki 14 günlük cayma hakkın ayrıca saklıdır. {DEMO_COPY.banner}
      </Text>
    </Sheet>
  );
}

// ─── Sözleşmeler ─────────────────────────────────────────────────────────────

export type ContractContext = {
  product: Product;
  seller: User | undefined;
  quantity: number;
  itemTotal: number;
  shipping: number;
  serviceFee: number;
  discount: number;
  total: number;
  address: Address | undefined;
  buyerName: string;
};

type ContractTab = 'pre' | 'distance';

/** Ön Bilgilendirme Formu ve Mesafeli Satış Sözleşmesi maddeleri (ödeme ekranı ve canlı Hemen Al ortak kullanır) */
export function contractSections(ctx: ContractContext): { today: string; pre: [string, string][]; distance: [string, string][] } {
  const today = formatDate(Date.now());
  const sellerName = ctx.seller ? `${ctx.seller.displayName} (@${ctx.seller.username})` : 'Satıcı';
  const sellerCity = ctx.seller?.city ?? 'İstanbul';
  const addr = ctx.address ? `${ctx.address.fullName}, ${addressLine(ctx.address)}` : 'Teslimat adresi seçilmedi';
  const money = (v: number) => formatTRY(v, { cents: true });

  const pre: [string, string][] = [
    [
      '1. Satıcı bilgileri',
      `Satıcı: ${sellerName}\nAdres: ${sellerCity}, Türkiye\nİletişim: Mezatonline uygulama içi mesajlaşma\nSatıcının unvanı veya adı soyadı ve vergi kimlik bilgileri gerçek sürümde burada gösterilir.\nAracı hizmet sağlayıcı: Mezatonline (demo sürüm; şirket unvanı, MERSİS numarası ve adres şirket kuruluşundan sonra eklenecektir) · destek@mezatonline.com`,
    ],
    ['2. Alıcı bilgileri', `Ad Soyad: ${ctx.buyerName}\nTeslimat adresi: ${addr}`],
    [
      '3. Sözleşme konusu ürün',
      `${ctx.product.title}\nAdet: ${ctx.quantity}\nÜrün bedeli (KDV dahil): ${money(ctx.itemTotal)}\nKargo bedeli (KDV dahil): ${ctx.shipping > 0 ? money(ctx.shipping) : 'Ücretsiz / aynı pakette'}\nAlıcı Koruması hizmet bedeli: ${money(ctx.serviceFee)}${ctx.discount > 0 ? `\nİndirim: -${money(ctx.discount)}` : ''}\nToplam ödenecek tutar: ${money(ctx.total)}`,
    ],
    [
      '4. Teslimat',
      'Ürün, ödeme tarihinden itibaren en geç 2 iş günü içinde kargoya verilir ve yasal azami süre olan 30 gün içinde teslim edilir. Satıcı, ürünü uygulamada gösterilen kargo seçenekleriyle gönderir.',
    ],
    [
      '5. Cayma hakkı',
      'Satıcı kurumsal (tacir veya esnaf) ise Alıcı, ürünü teslim aldığı tarihten itibaren 14 gün içinde herhangi bir gerekçe göstermeksizin ve cezai şart ödemeksizin sözleşmeden cayma hakkına sahiptir; bu hak canlı yayında açık artırmayla yapılan alımlarda da geçerlidir. Cayma bildirimi uygulamadaki "Bu siparişle ilgili yardım al" bölümünden yapılır; iade kargo bedeli satıcıya aittir. Mesafeli Sözleşmeler Yönetmeliği m.15\'te sayılan hâllerde (ör. kişiye özel hazırlanan ürünler, çabuk bozulabilen ürünler, ambalajı açılmış ve sağlık/hijyen açısından iadesi uygun olmayan ürünler) cayma hakkı kullanılamaz. Bireysel satıcılardan (tüketiciden tüketiciye) yapılan alımlar Tüketici Kanunu kapsamında değildir; bu alımlarda Alıcı Koruması geçerlidir.',
    ],
    [
      '6. Şikâyet ve itiraz',
      'Alıcı, şikâyet ve itirazlarını Ticaret Bakanlığınca belirlenen parasal sınırlar dahilinde yerleşim yerindeki Tüketici Hakem Heyeti\'ne veya Tüketici Mahkemesi\'ne iletebilir. Dava açmadan önce arabuluculuğa başvuru zorunludur.',
    ],
  ];

  const distance: [string, string][] = [
    [
      'Madde 1 — Taraflar',
      `İşbu Mesafeli Satış Sözleşmesi, bir tarafta ${sellerName} ("Satıcı") ile diğer tarafta ${ctx.buyerName} ("Alıcı") arasında, Mezatonline platformu aracılığıyla ${today} tarihinde elektronik ortamda kurulmuştur.`,
    ],
    [
      'Madde 2 — Konu',
      `Sözleşmenin konusu, Alıcı'nın Satıcı'ya ait "${ctx.product.title}" ürününü ${money(ctx.total)} toplam bedelle satın almasına ilişkin olarak 6502 sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmeler Yönetmeliği hükümleri uyarınca tarafların hak ve yükümlülüklerinin belirlenmesidir.`,
    ],
    [
      'Madde 3 — Ödeme',
      `Ödeme, kredi/banka kartı ile 3D Secure doğrulamasıyla alınır. Gerçek sürümde bedel, lisanslı bir ödeme kuruluşu tarafından Alıcı ürünü teslim alıp onaylayana ya da itiraz süresi dolana kadar bekletilir, ardından Satıcı'ya aktarılır; Mezatonline bedeli kendi hesabında tutmaz. Taksitli alımlarda vade farkı kartı veren bankaca uygulanır. ${DEMO_COPY.payment}`,
    ],
    ['Madde 4 — Teslimat', `Ürün, Alıcı'nın bildirdiği adrese (${addr}) kargo ile teslim edilir. Teslimat anında hasarlı paket tespit edilirse tutanak tutulması önerilir.`],
    [
      'Madde 5 — Cayma hakkı',
      'Satıcı kurumsal (tacir veya esnaf) ise Alıcı, ürünü teslim aldıktan sonra 14 gün içinde cayma hakkını kullanabilir; bu hak açık artırmayla yapılan alımlarda da geçerlidir. Cayma hâlinde toplam bedel, cayma bildiriminden itibaren 14 gün içinde iade edilir. Alıcı Koruması kapsamındaki talepler (ürün Alıcı\'ya ulaştıktan sonra 14 gün içinde) ayrıca değerlendirilir.',
    ],
    [
      'Madde 6 — Açık artırma alımları',
      'Canlı yayında verilen teklifler ve ön teklifler bağlayıcıdır: açık artırmayı kazanan Alıcı için satın alma yükümlülüğü doğar ve Alıcı teklifini geri çekemez. Satıcı kurumsal (tacir veya esnaf) ise Alıcı, ürünü teslim aldıktan sonra 14 gün içinde Madde 5\'teki yasal cayma hakkını kullanabilir. Açık artırmayı kazanan Alıcı, kayıtlı ödeme yönteminden otomatik tahsilata onay vermiş sayılır.',
    ],
    [
      'Madde 7 — Yürürlük',
      'Alıcı, ödeme adımında bu sözleşmeyi ve Ön Bilgilendirme Formu\'nu okuyup onayladığını kabul eder. Gerçek sürümde sözleşmenin bir kopyası sipariş detaylarında saklanır ve e-posta adresine gönderilir; demo sürümde kopya oluşturulmaz.',
    ],
  ];

  return { today, pre, distance };
}

export function ContractSheet({ visible, onClose, onAccept, ctx }: { visible: boolean; onClose: () => void; onAccept: () => void; ctx: ContractContext }) {
  const [tab, setTab] = useState<ContractTab>('pre');
  const { today, pre, distance } = contractSections(ctx);
  const sections = tab === 'pre' ? pre : distance;

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Sözleşmeler"
      showClose
      height={0.9}
      scroll={false}
      footer={
        <Button
          title="Okudum, onaylıyorum"
          size="lg"
          fullWidth
          onPress={() => {
            onAccept();
            onClose();
          }}
        />
      }>
      <Segmented
        options={[
          { key: 'pre', label: 'Ön Bilgilendirme' },
          { key: 'distance', label: 'Mesafeli Satış' },
        ]}
        value={tab}
        onChange={setTab}
        style={styles.segment}
      />
      <ScrollView style={styles.flex} contentContainerStyle={styles.contract} showsVerticalScrollIndicator={false}>
        <Text variant="headline" weight="800">
          {tab === 'pre' ? 'Ön Bilgilendirme Formu' : 'Mesafeli Satış Sözleşmesi'}
        </Text>
        <Text variant="footnote" color="textTertiary">
          Düzenlenme tarihi: {today}
        </Text>
        {sections.map(([h, body]) => (
          <View key={h} style={styles.clause}>
            <Text variant="subhead" weight="700">
              {h}
            </Text>
            <Text variant="footnote" color="textSecondary" style={styles.clauseBody}>
              {body}
            </Text>
          </View>
        ))}
      </ScrollView>
    </Sheet>
  );
}

// ─── Taksit tablosu ──────────────────────────────────────────────────────────

export function InstallmentTableSheet({ visible, onClose, amount }: { visible: boolean; onClose: () => void; amount: number }) {
  const { colors } = useTheme();
  const counts = INSTALLMENT_COUNTS.filter((c) => c > 1);
  return (
    <Sheet visible={visible} onClose={onClose} title="Taksit tablosu" subtitle={`${formatTRY(amount, { cents: !Number.isInteger(amount) })} için aylık ödemeler`} showClose height={0.82}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          <View style={[styles.tRow, { borderBottomColor: colors.border }]}>
            <Text variant="caption" color="textSecondary" style={styles.tBank}>
              KART
            </Text>
            {counts.map((c) => (
              <Text key={c} variant="caption" color="textSecondary" style={styles.tCell} align="right">
                {c} TAKSİT
              </Text>
            ))}
          </View>
          {allPrograms().map((program) => (
            <View key={program} style={[styles.tRow, { borderBottomColor: colors.border }]}>
              <Text variant="subhead" weight="700" style={styles.tBank} numberOfLines={1}>
                {program}
              </Text>
              {counts.map((c) => {
                const plan = installmentPlan(program, amount, c);
                return (
                  <View key={c} style={styles.tCell}>
                    <Text variant="footnote" weight="700" align="right" tabular>
                      {formatTRY(plan.monthly, { cents: true })}
                    </Text>
                    <Text variant="caption" weight="500" color={plan.interestFree ? 'success' : 'textTertiary'} align="right">
                      {plan.interestFree ? 'Vade farksız' : `Top. ${formatTRY(plan.total)}`}
                    </Text>
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>
      <View style={[styles.tNote, { backgroundColor: colors.surface }]}>
        <Icon name="information-circle-outline" size={18} color="textSecondary" />
        <Text variant="footnote" color="textSecondary" style={styles.flex}>
          Taksit seçenekleri yalnızca kredi kartlarında ve {formatTRY(MIN_INSTALLMENT_TOTAL)} ve üzeri Hemen Al alışverişlerinde geçerlidir. Açık artırma alımlarında ve çekilişlerde taksit yapılamaz. Vade farkı kartını veren banka tarafından uygulanır. Demo: tablodaki oranlar örnektir.
        </Text>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  flexGap: { flex: 1, gap: 2 },
  protHead: { alignItems: 'center', gap: 8, marginBottom: 18 },
  protBadge: { width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  points: { gap: 16 },
  point: { flexDirection: 'row', gap: 12 },
  pointIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  fine: { marginTop: 18 },
  segment: { marginBottom: 12 },
  contract: { gap: 12, paddingBottom: 16 },
  clause: { gap: 4 },
  clauseBody: { lineHeight: 18 },
  tRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, gap: 8 },
  tBank: { width: 132 },
  tCell: { width: 96 },
  tNote: { flexDirection: 'row', gap: 8, padding: 12, borderRadius: radius.md, marginTop: 14 },
});
