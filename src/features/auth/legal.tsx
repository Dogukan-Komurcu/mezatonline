import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Sheet, Text } from '@/components/ui';
import { useTheme } from '@/theme';

export type LegalDoc = 'terms' | 'privacy' | 'kvkk' | 'marketing';

type LegalContent = { title: string; updated: string; intro: string; sections: [heading: string, body: string][] };

export const LEGAL_DOCS: Record<LegalDoc, LegalContent> = {
  terms: {
    title: 'Kullanım Koşulları',
    updated: 'Son güncelleme: 1 Ekim 2026',
    intro:
      'Mezatonline’a hoş geldin! Bu koşullar, canlı yayın üzerinden alışveriş yaptığın, mezatlara katıldığın ve satış yaptığın Mezatonline platformunu kullanımını düzenler. Hesap oluşturarak bu koşulları kabul etmiş olursun.',
    sections: [
      ['1. Hesabın', '18 yaşını doldurmuş olman gerekir. Hesap bilgilerini doğru ve güncel tutmaktan, şifreni gizli tutmaktan sen sorumlusun. Her kişi yalnızca kendi adına hesap açabilir.'],
      ['2. Mezatlar ve teklifler', 'Canlı yayında verdiğin her teklif bağlayıcıdır. Süre bittiğinde en yüksek teklifi veren ürünü kazanır ve ödeme kayıtlı ödeme yönteminden otomatik olarak alınır. Teklifler geri alınamaz.'],
      ['3. Hemen Al ve mağaza alışverişleri', 'Hemen Al ile satın aldığın ürünlerde fiyat, kargo ücreti ve KDV dahil toplam tutar ödeme adımında gösterilir.'],
      ['4. Alıcı Koruması', 'Ürün hiç ulaşmazsa, hasarlı gelirse ya da açıklamayla önemli ölçüde farklıysa teslimattan itibaren 48 saat içinde destek talebi oluşturabilirsin.'],
      ['5. Cayma hakkı', 'Kurumsal satıcılardan yapılan alışverişlerde 6502 sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmeler Yönetmeliği kapsamındaki haklarını kullanabilirsin.'],
      ['6. Topluluk kuralları', 'Saygılı ol. Sahte teklif, taciz, yanıltıcı ilan ve platform dışı ödeme yönlendirmesi yasaktır; ihlal hâlinde hesabın kısıtlanabilir veya kapatılabilir.'],
      ['7. Uyuşmazlıklar', 'Bu koşullar Türkiye Cumhuriyeti hukukuna tabidir. Tüketici uyuşmazlıklarında Tüketici Hakem Heyetleri ve Tüketici Mahkemeleri yetkilidir.'],
    ],
  },
  privacy: {
    title: 'Gizlilik Politikası',
    updated: 'Son güncelleme: 1 Ekim 2026',
    intro: 'Gizliliğin bizim için önemli. Bu politika hangi bilgileri topladığımızı, neden topladığımızı ve bunları nasıl koruduğumuzu açıklar.',
    sections: [
      ['Topladığımız bilgiler', 'Ad, kullanıcı adı, e-posta, telefon numarası, teslimat adresleri, sipariş geçmişi, izlediğin yayınlar ve uygulama kullanım verileri.'],
      ['Ödeme bilgileri', 'Kart bilgilerin Mezatonline sunucularında saklanmaz; lisanslı ödeme kuruluşu iş ortağımız tarafından şifrelenerek tutulur.'],
      ['Bilgileri nasıl kullanıyoruz', 'Hesabını yönetmek, siparişlerini teslim etmek, sana uygun yayınları önermek, dolandırıcılığı önlemek ve yasal yükümlülüklerimizi yerine getirmek için.'],
      ['Paylaşım', 'Siparişin için gerekli olan bilgiler (ad, adres, telefon) yalnızca satıcıyla ve kargo firmasıyla paylaşılır. Verilerini asla satmayız.'],
      ['Hakların', 'Verilerine erişme, düzeltme, silme ve işlemeye itiraz etme hakkına sahipsin. Taleplerini Ayarlar > Yardım üzerinden iletebilirsin.'],
    ],
  },
  kvkk: {
    title: 'KVKK Aydınlatma Metni',
    updated: 'Son güncelleme: 1 Ekim 2026',
    intro:
      '6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) uyarınca, veri sorumlusu sıfatıyla Mezatonline Teknoloji A.Ş. olarak kişisel verilerini aşağıda açıklanan kapsamda işliyoruz.',
    sections: [
      ['İşlenen kişisel veriler', 'Kimlik (ad, soyad), iletişim (e-posta, telefon, adres), müşteri işlem (sipariş, teklif, ödeme kayıtları), işlem güvenliği (IP, cihaz bilgisi) ve pazarlama verileri.'],
      ['İşleme amaçları', 'Üyelik sözleşmesinin kurulması ve ifası, canlı mezat hizmetlerinin sunulması, ödeme ve kargo süreçlerinin yürütülmesi, güvenliğin sağlanması ve yasal yükümlülüklerin yerine getirilmesi.'],
      ['Hukuki sebepler', 'KVKK m.5/2 (c) sözleşmenin ifası, (ç) hukuki yükümlülük, (f) meşru menfaat; pazarlama faaliyetleri için ise açık rızan.'],
      ['Aktarım', 'Kişisel verilerin; satıcılara, kargo firmalarına, ödeme kuruluşlarına ve yetkili kamu kurumlarına yalnızca belirtilen amaçlarla sınırlı olarak aktarılabilir.'],
      ['Başvuru hakkın', 'KVKK m.11 kapsamındaki taleplerini kvkk@mezatonline.com adresine iletebilirsin. Başvurun en geç 30 gün içinde ücretsiz olarak sonuçlandırılır.'],
    ],
  },
  marketing: {
    title: 'Ticari Elektronik İleti Onayı',
    updated: 'Son güncelleme: 1 Ekim 2026',
    intro: 'Bu onayı vermen tamamen isteğe bağlıdır; vermesen de Mezatonline’ı kullanmaya devam edebilirsin.',
    sections: [
      ['Ne gönderiyoruz?', 'Kampanyalar, indirim kuponları, öne çıkan canlı yayınlar ve sana özel fırsatlar hakkında SMS, e-posta ve anlık bildirimler.'],
      ['İYS kaydı', 'Onayın 6563 sayılı Kanun kapsamında İleti Yönetim Sistemi’ne (İYS) kaydedilir.'],
      ['Onayını geri alma', 'Dilediğin zaman Ayarlar > Bildirimler bölümünden veya gelen iletilerdeki ret bağlantısıyla onayını ücretsiz geri alabilirsin.'],
    ],
  },
};

/** Hukuki metin sayfası (koyu sheet) */
export function LegalSheet({ doc, visible, onClose }: { doc: LegalDoc; visible: boolean; onClose: () => void }) {
  const { colors } = useTheme();
  const content = LEGAL_DOCS[doc];
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      dark
      title={content.title}
      subtitle={content.updated}
      showClose
      height={0.86}
      footer={<Button title="Anladım" variant="inverse" size="lg" fullWidth onPress={onClose} />}>
      <View style={styles.body}>
        <Text variant="callout" color={colors.textSecondary} style={styles.para}>
          {content.intro}
        </Text>
        {content.sections.map(([heading, body]) => (
          <View key={heading} style={styles.section}>
            <Text variant="headline" color={colors.text}>
              {heading}
            </Text>
            <Text variant="callout" color={colors.textSecondary} style={styles.para}>
              {body}
            </Text>
          </View>
        ))}
      </View>
    </Sheet>
  );
}

/** Hukuki metin sheet'ini yöneten kısa yol: const legal = useLegalSheet(); legal.open('kvkk'); {legal.sheet} */
export function useLegalSheet() {
  const [state, setState] = useState<{ doc: LegalDoc; visible: boolean }>({ doc: 'terms', visible: false });
  const open = (doc: LegalDoc) => setState({ doc, visible: true });
  const close = () => setState((s) => ({ ...s, visible: false }));
  const sheet = <LegalSheet doc={state.doc} visible={state.visible} onClose={close} />;
  return { open, sheet };
}

/**
 * "Devam ederek Kullanım Koşulları'nı ..." satırı — bağlantılar dokunulabilir.
 * Text içinde iç içe Text kullanır; onOpen ile hangi metnin açılacağını bildirir.
 */
export function LegalFooter({ onOpen, prefix = 'Devam ederek' }: { onOpen: (doc: LegalDoc) => void; prefix?: string }) {
  const { colors } = useTheme();
  const link = (doc: LegalDoc, label: string) => (
    <Text variant="footnote" weight="700" color={colors.textSecondary} style={styles.link} onPress={() => onOpen(doc)} suppressHighlighting>
      {label}
    </Text>
  );
  return (
    <Text variant="footnote" color={colors.textTertiary} align="center" style={styles.footer}>
      {prefix} {link('terms', 'Kullanım Koşulları')}’nı ve {link('privacy', 'Gizlilik Politikası')}’nı kabul etmiş, {link('kvkk', 'KVKK Aydınlatma Metni')}’ni okumuş olursun.
    </Text>
  );
}

const styles = StyleSheet.create({
  body: { gap: 18, paddingBottom: 12 },
  section: { gap: 6 },
  para: { lineHeight: 21 },
  link: { textDecorationLine: 'underline' },
  footer: { lineHeight: 18 },
});
