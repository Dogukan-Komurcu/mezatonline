/**
 * Bilgi sayfaları: Alıcı Koruması, sözleşmeler (Ön Bilgilendirme + Mesafeli Satış), taksit tablosu.
 */
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Button, Icon, Segmented, Sheet, Text, type IconName } from '@/components/ui';
import { formatDate, formatTRY } from '@/lib/format';
import { radius, useTheme } from '@/theme';
import type { Address, Product, User } from '@/types';

import { allPrograms, installmentPlan, INSTALLMENT_COUNTS, MIN_INSTALLMENT_TOTAL } from './installments';
import { addressLine, CARRIER_LINE } from './utils';

// ─── Alıcı Koruması ──────────────────────────────────────────────────────────

const PROTECTION_POINTS: { icon: IconName; title: string; body: string }[] = [
  {
    icon: 'cube-outline',
    title: 'Ürün gelmezse paran iade',
    body: 'Siparişin ulaşmazsa ya da satıcı 7 gün içinde kargoya vermezse ödemenin tamamını iade ederiz.',
  },
  {
    icon: 'search-outline',
    title: 'Açıklandığı gibi değilse iade',
    body: 'Ürün hasarlı, eksik ya da ilandakinden farklı çıkarsa teslimattan sonraki 14 gün içinde talep oluştur.',
  },
  {
    icon: 'ribbon-outline',
    title: 'Orijinallik güvencesi',
    body: 'Sahte ya da taklit ürün şüphesinde teslimattan sonraki 30 gün içinde inceleme talep edebilirsin.',
  },
  {
    icon: 'lock-closed-outline',
    title: 'Güvenli ödeme',
    body: 'Ödemen, sen ürünü teslim alana kadar Mezatonline güvencesinde tutulur. Platform dışı ödeme yapma.',
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
          Siparişin zamanında ve açıklandığı gibi ulaşmazsa sorunu çözeriz. Her alışverişte otomatik olarak geçerlidir.
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
        Kart, koleksiyon, sneaker ve lüks ürünlerde iade talep süresi teslimattan sonra 7 gündür. Bitki ve taze gıdada 2 gündür. Cayma hakkın 6502 sayılı Tüketicinin Korunması Hakkında Kanun kapsamında saklıdır.
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

export function ContractSheet({ visible, onClose, onAccept, ctx }: { visible: boolean; onClose: () => void; onAccept: () => void; ctx: ContractContext }) {
  const [tab, setTab] = useState<ContractTab>('pre');
  const today = formatDate(Date.now());
  const sellerName = ctx.seller ? `${ctx.seller.displayName} (@${ctx.seller.username})` : 'Satıcı';
  const sellerCity = ctx.seller?.city ?? 'İstanbul';
  const addr = ctx.address ? `${ctx.address.fullName}, ${addressLine(ctx.address)}` : 'Teslimat adresi seçilmedi';
  const money = (v: number) => formatTRY(v, { cents: true });

  const pre: [string, string][] = [
    [
      '1. Satıcı bilgileri',
      `Satıcı: ${sellerName}\nAdres: ${sellerCity}, Türkiye\nİletişim: Mezatonline uygulama içi mesajlaşma\nAracı hizmet sağlayıcı: Mezatonline Elektronik Ticaret A.Ş., İstanbul · destek@mezatonline.com`,
    ],
    ['2. Alıcı bilgileri', `Ad Soyad: ${ctx.buyerName}\nTeslimat adresi: ${addr}`],
    [
      '3. Sözleşme konusu ürün',
      `${ctx.product.title}\nAdet: ${ctx.quantity}\nÜrün bedeli (KDV dahil): ${money(ctx.itemTotal)}\nKargo bedeli (KDV dahil): ${ctx.shipping > 0 ? money(ctx.shipping) : 'Ücretsiz / aynı pakette'}\nAlıcı Koruması hizmet bedeli: ${money(ctx.serviceFee)}${ctx.discount > 0 ? `\nİndirim: -${money(ctx.discount)}` : ''}\nToplam ödenecek tutar: ${money(ctx.total)}`,
    ],
    [
      '4. Teslimat',
      `Ürün, ödeme tarihinden itibaren en geç 2 iş günü içinde kargoya verilir ve yasal azami süre olan 30 gün içinde teslim edilir. Kargo firması platform tarafından atanır (${CARRIER_LINE}).`,
    ],
    [
      '5. Cayma hakkı',
      'Alıcı, ürünü teslim aldığı tarihten itibaren 14 gün içinde herhangi bir gerekçe göstermeksizin ve cezai şart ödemeksizin sözleşmeden cayma hakkına sahiptir. Cayma bildirimi uygulamadaki "Bu siparişle ilgili yardım al" bölümünden yapılır; iade kargo bedeli satıcıya aittir. Ambalajı açılmış hijyen ve kozmetik ürünleri, çabuk bozulan gıdalar ve kişiye özel üretilen ürünlerde cayma hakkı kullanılamaz.',
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
      'Ödeme, kredi/banka kartı ile 3D Secure doğrulamasıyla alınır. Bedel, alıcı ürünü teslim alıp onaylayana ya da itiraz süresi dolana kadar Mezatonline güvencesinde tutulur, ardından satıcıya aktarılır. Taksitli alımlarda vade farkı kartı veren bankaca uygulanır.',
    ],
    ['Madde 4 — Teslimat', `Ürün, Alıcı'nın bildirdiği adrese (${addr}) kargo ile teslim edilir. Teslimat anında hasarlı paket tespit edilirse tutanak tutulması önerilir.`],
    [
      'Madde 5 — Cayma hakkı',
      'Alıcı, teslimattan itibaren 14 gün içinde cayma hakkını kullanabilir. Cayma halinde satıcı, bildirimden itibaren 14 gün içinde toplam bedeli iade eder. Alıcı Koruması kapsamındaki talepler ayrıca platform tarafından değerlendirilir.',
    ],
    [
      'Madde 6 — Açık artırma alımları',
      'Canlı yayında verilen teklifler ve ön teklifler bağlayıcıdır. Açık artırmayı kazanan alıcı, kayıtlı ödeme yönteminden otomatik tahsilata onay vermiş sayılır.',
    ],
    ['Madde 7 — Yürürlük', 'Alıcı, ödeme adımında bu sözleşmeyi ve Ön Bilgilendirme Formu\'nu okuyup onayladığını kabul eder. Sözleşmenin bir kopyası sipariş detaylarında saklanır.'],
  ];

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
              KART PROGRAMI
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
          Taksit seçenekleri yalnızca kredi kartlarında ve {formatTRY(MIN_INSTALLMENT_TOTAL)} ve üzeri Hemen Al alışverişlerinde geçerlidir. Açık artırma, çekiliş ve bahşişlerde taksit yapılamaz. Vade farkı bankanız tarafından uygulanır.
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
