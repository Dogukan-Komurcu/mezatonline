/**
 * Yardım Merkezi SSS ve yasal metinler (mock içerik).
 * Yayın öncesi metinler hukuk ekibinin onayından geçirilecek; Supabase'e geçişte CMS tablosundan okunacak.
 */
import type { IconName } from '@/components/ui';
import { DEMO_COPY } from '@/config/demo';
import { BINDING_BID_TEXT, ESCROW_TEXT } from '@/features/commerce/utils';
import { HIGH_RISK_SUBCATEGORIES, IP_PROCESS, PROOF_KINDS, STRIKE_POLICY } from '@/features/trust/counterfeit';

/** Şirket kurulana kadar tüm yasal metinlerde kullanılan unvan */
const ENTITY = 'Mezatonline (demo sürüm; şirket unvanı, MERSİS numarası ve adres şirket kuruluşundan sonra eklenecektir)';
const GIVEAWAY_NOTE = `${DEMO_COPY.giveaway} Gerçek ödüllü çekilişler Milli Piyango İdaresi izniyle düzenlenebilir.`;

const lowerFirst = (s: string) => s.charAt(0).toLocaleLowerCase('tr-TR') + s.slice(1);
/** Orijinallik belgesi istenen alanlar ve kabul edilen belgeler: "sneaker, lüks çanta…", "fatura / e-Arşiv, …" */
export const RISKY_AREAS = [...new Set(Object.values(HIGH_RISK_SUBCATEGORIES))].map(lowerFirst).join(', ');
const PROOF_LIST = PROOF_KINDS.map((k) => lowerFirst(k.label)).join(', ');

export type FaqTopic = 'bids' | 'shipping' | 'returns' | 'protection' | 'giveaway' | 'payment' | 'account' | 'authenticity';

export const FAQ_TOPICS: { key: FaqTopic; label: string; icon: IconName }[] = [
  { key: 'bids', label: 'Teklif & Mezat', icon: 'hammer-outline' },
  { key: 'shipping', label: 'Kargo', icon: 'cube-outline' },
  { key: 'returns', label: 'İade & Cayma', icon: 'refresh-outline' },
  { key: 'protection', label: 'Alıcı Koruması', icon: 'shield-checkmark-outline' },
  { key: 'giveaway', label: 'Çekiliş', icon: 'gift-outline' },
  { key: 'payment', label: 'Ödeme', icon: 'card-outline' },
  { key: 'account', label: 'Hesap', icon: 'person-circle-outline' },
  { key: 'authenticity', label: 'Orijinallik', icon: 'ribbon-outline' },
];

export type Faq = { id: string; topic: FaqTopic; q: string; a: string };

export const FAQS: Faq[] = [
  {
    id: 'f1',
    topic: 'bids',
    q: 'Canlı mezatta nasıl teklif veririm?',
    a: 'Ürün sahneye geldiğinde tutarı ekranın altındaki − ve + düğmeleriyle ayarla; tutar, sıradaki geçerli teklifin altına inmez. Ardından turkuaz “Teklif ver” düğmesini düğme dolana kadar (yaklaşık yarım saniye) basılı tut. Farklı bir tutar yazmak için tutarın üzerine dokun; açılan pencerede istersen “Otomatik teklif (en fazla)” seçeneğini açarak bir üst sınır belirleyebilirsin. Sonra biri seni geçtiğinde teklifin, sınırın dolana kadar kendiliğinden birer adım yükseltilir. Belirlediğin sınır yalnızca sana görünür.',
  },
  {
    id: 'f2',
    topic: 'bids',
    q: 'Verdiğim teklifi geri alabilir miyim?',
    a: `Hayır. ${BINDING_BID_TEXT} Ön teklifler de bu kurala tabidir; yalnızca yükseltilebilir. Teknik bir hata nedeniyle istemediğin bir teklifin kaydedildiğini düşünüyorsan, yayın adını ve ürünü yazarak destek ekibimize bildir; durumu satıcıyla birlikte değerlendiririz.`,
  },
  {
    id: 'f3',
    topic: 'bids',
    q: 'Son saniyelerde süre neden uzuyor?',
    a: 'Son 10 saniyede gelen her teklif, süreyi satıcının belirlediği karşı teklif süresine (genellikle 10 saniye) sıfırlar; böylece herkes karşılık verme şansı bulur. “Uzatmasız” (bayrak simgeli) mezatlarda süre uzamaz, süre dolduğunda en yüksek teklif kazanır.',
  },
  {
    id: 'f4',
    topic: 'bids',
    q: 'Ön teklif nedir, nasıl çalışır?',
    a: 'Yayın saatinden önce ürün sayfasındaki “Ön Teklif Ver” düğmesiyle bir üst sınır belirleyebilirsin. Ürün sahneye geldiğinde bu sınır otomatik teklif olarak devreye girer; o an yayında olman gerekmez. Ön teklifler de bağlayıcı olduğu için sınırını sonradan yalnızca yükseltebilirsin; kurumsal satıcılardan alımlarda 14 günlük yasal cayma hakkın saklıdır. Planlanan yayın saatinin üzerinden 24 saat geçtiği hâlde ürün satışa çıkmazsa ön teklifin kendiliğinden düşer. Biri seni geçtiğinde de bildirim gönderiyoruz.',
  },
  {
    id: 'f5',
    topic: 'shipping',
    q: 'Siparişim ne zaman kargoya verilir?',
    a: 'Kullanım Koşulları gereği satıcı, paketi satıştan sonraki 2 iş günü içinde kargoya teslim etmelidir. Paket yola çıktığında takip numarası Aktivite → Siparişlerim’de ilgili siparişin detayına eklenir; teslimatın ne zaman yapılacağı kargo firmasına ve adresine göre değişir. Kurumsal satıcılardan alımlarda ürünün siparişten itibaren en geç 30 gün içinde teslim edilmesi yasal zorunluluktur. Paket gecikirse sipariş detayındaki “Bu siparişle ilgili yardım al” adımından bize yaz. Demo sürümde gerçek kargo gönderimi yapılmaz.',
  },
  {
    id: 'f6',
    topic: 'shipping',
    q: 'Kargo ücreti nasıl hesaplanır?',
    a: 'Kargo ücretini paketin boyutu (desi) belirler; satıcı her ürün için küçük paketten büyük koliye kadar bir boyut seçer ve tutar ödeme özetinde ayrı satır olarak görünür. Bazı ilanlarda satıcı kargoyu üstlenir; bu ilanlarda “Kargo dahil” yazar ve kargo ücreti alınmaz. Bir yayında aynı satıcıdan birden fazla ürün alırsan ürünler aynı pakette gönderilir; sonraki alımlarda paket büyürse yalnızca aradaki farkı ödersin, büyümezse kargo satırı “₺0 · aynı pakette” görünür. Satıcı yayına ücretsiz kargo eşiği koyduysa (ör. ₺500 ve üzeri), tutarı eşiğe ulaşan her alımda kargo ücretsizdir; küçük alımlar toplanmaz.',
  },
  {
    id: 'f7',
    topic: 'shipping',
    q: 'Hangi kargo firmalarıyla çalışıyorsunuz?',
    a: 'Çalışılacak kargo firmaları uygulama yayına çıktığında duyurulacaktır. Satıcı, ürünü uygulamada gösterilen kargo seçenekleriyle gönderir; takip numarası sipariş detayına eklenir. Demo sürümde gerçek kargo gönderimi yapılmaz.',
  },
  {
    id: 'f8',
    topic: 'returns',
    q: 'Cayma hakkımı nasıl kullanırım?',
    a: 'Satıcı kurumsal (tacir veya esnaf) ise, canlı yayında açık artırmayla aldıkların dahil, ürünü teslim aldıktan sonra 14 gün içinde gerekçe göstermeden cayma hakkını kullanabilirsin (6502 sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmeler Yönetmeliği). Sipariş detayındaki “Bu siparişle ilgili yardım al” adımından cayma talebi oluştur; iade kargo ücreti satıcıya aittir. Ödemen, cayma bildiriminden itibaren 14 gün içinde iade edilir.',
  },
  {
    id: 'f9',
    topic: 'returns',
    q: 'Siparişimi iptal edebilir miyim?',
    a: 'Paket henüz kargoya teslim edilmediyse, satın aldıktan sonraki 24 saat boyunca sipariş detayındaki “Bu siparişle ilgili yardım al” adımından satıcıdan iptal isteyebilirsin. Teklifler bağlayıcı olduğu için son karar satıcınındır. Satıcı kabul ederse ödediğin tutarın tamamı kartına geri gönderilir; hesabına yansıma süresi bankaya göre değişir. Satıcı kurumsal ise, ürünü teslim aldıktan sonra 14 gün içinde yasal cayma hakkını ayrıca kullanabilirsin.',
  },
  {
    id: 'f10',
    topic: 'returns',
    q: 'Hangi ürünlerde cayma hakkı yoktur?',
    a: 'Cayma hakkı kurumsal (tacir veya esnaf) satıcılardan yapılan alımlarda geçerlidir; canlı yayında açık artırmayla yapılan alımlar da buna dahildir. Mesafeli Sözleşmeler Yönetmeliği m.15’te sayılan hâllerde cayma hakkı kullanılamaz; örneğin kişiye özel hazırlanan ürünler, çabuk bozulabilen ürünler ve ambalajı açılmış, sağlık ve hijyen açısından iadesi uygun olmayan ürünler. Bireysel satıcılardan (tüketiciden tüketiciye) yapılan alımlar Tüketici Kanunu kapsamında değildir; bu alımlarda Alıcı Koruması geçerlidir.',
  },
  {
    id: 'f11',
    topic: 'protection',
    q: 'Alıcı Koruması neleri kapsar?',
    a: `Mezatonline üzerinden ödediğin her sipariş kapsamdadır. Paket hiç gelmezse ödediğin tutar iade edilir. Kırık, eksik, taklit ya da ilandakinden belirgin biçimde farklı bir ürün geldiyse teslimattan sonraki 14 gün içinde fotoğraf ekleyerek bildirmen yeterli. ${ESCROW_TEXT} Mezatonline bu parayı kendi hesabında tutmaz. ${DEMO_COPY.payment}`,
  },
  {
    id: 'f12',
    topic: 'protection',
    q: 'Sorun bildirmek için ne kadar sürem var?',
    a: 'Ürün sana ulaştıktan sonra 14 gün içinde sorun bildirebilirsin; bu süre tüm kategorilerde aynıdır. Ürün hiç ulaşmadıysa, sipariş detayındaki “Bu siparişle ilgili yardım al” adımından talep oluşturabilirsin. Destek ekibimiz en kısa sürede yanıt verir.',
  },
  {
    id: 'f13',
    topic: 'giveaway',
    q: 'Çekilişlere nasıl katılırım?',
    a: `Yayında çekiliş kartı belirdiğinde karttaki “Katıl” düğmesine dokun. Bazı çekilişler yalnızca satıcıyı takip edenlere açıktır ve aynı çekilişe ikinci kez girilemez. Süre dolunca kura otomatik çekilir; kazanan, katılanlar arasından rastgele seçilir. ${GIVEAWAY_NOTE}`,
  },
  {
    id: 'f14',
    topic: 'giveaway',
    q: 'Çekilişi kazandığımı nasıl anlarım?',
    a: `Kazananın kullanıcı adı yayında herkesin ekranında gösterilir; kura sana çıktıysa ayrıca bildirim alırsın. Ödülün takibi için Aktivite → Siparişlerim’e ₺0’lık bir sipariş eklenir. ${GIVEAWAY_NOTE}`,
  },
  {
    id: 'f15',
    topic: 'payment',
    q: 'Hangi ödeme yöntemlerini kullanabilirim?',
    a: `Kredi ve banka kartıyla ödeme yapılır; kartlar 3D Secure ile doğrulanarak kaydedilir. Hemen Al ürünlerinde kredi kartına taksit seçenekleri sunulabilir; açık artırma alımlarında taksit yapılamaz. ${DEMO_COPY.payment}`,
  },
  {
    id: 'f16',
    topic: 'payment',
    q: 'Kartımdan ne zaman çekim yapılır?',
    a: 'Açık artırmayı kazandığında, Hemen Al ile satın aldığında ya da fiyat önerin kabul edildiğinde varsayılan kartından çekim yapılır. Teklif vermek tek başına çekime neden olmaz. Mezatonline’ın abonelik ücreti yoktur. Demo sürümde kartından hiçbir çekim yapılmaz.',
  },
  {
    id: 'f17',
    topic: 'payment',
    q: 'Mezat Kredisi nedir?',
    a: 'Arkadaş davetleri ve kampanyalarla hesabına tanımlanan indirim bakiyesidir; satın alınamaz ve nakde çevrilemez. Ödeme adımında yalnızca ürün tutarından düşülür, kargo ve Alıcı Koruması bedeline uygulanmaz. Bakiyeni ve geçmişini Cüzdan ekranında görebilirsin. Demo sürümdeki krediler örnek amaçlıdır ve gerçek bir değer taşımaz.',
  },
  {
    id: 'f18',
    topic: 'account',
    q: 'Kullanıcı adımı nasıl değiştiririm?',
    a: 'Hesap → Profili düzenle ekranında kullanıcı adı alanına yeni adını yaz; adın boşta olup olmadığını yazarken kontrol ederiz. Ad 3 ile 30 karakter arasında olmalı ve yalnızca küçük harf, rakam, nokta (.) ve alt çizgi (_) içerebilir. Takipçilerinin seni karıştırmaması için bir değişiklikten sonra yenisini yapabilmek üzere 24 saat beklemen gerekir.',
  },
  {
    id: 'f19',
    topic: 'account',
    q: 'Doğrulanmış Alıcı nasıl olurum?',
    a: 'Satıcılar canlı yayında teklifleri yalnızca doğrulanmış hesaplara açabilir; bu yayınlara katılmak için kartını bir kez onaylaman yeterli. Hesap → Doğrulanmış Alıcı ekranında “Doğrulan”a dokun ve bankanın 3D Secure adımında ₺250 tutarındaki ön provizyonu (geçici bloke) onayla. Bu tutar tahsil edilmez; bloke en geç 24 saat içinde kalkar. Demo sürümde kartında gerçek bir provizyon oluşturulmaz.',
  },
  {
    id: 'f20',
    topic: 'account',
    q: 'Harcama veya izleme limiti koyabilir miyim?',
    a: 'Evet. Hesap → Hesap Kontrolleri ekranında canlı yayın izleme süren ve harcaman için ayrı ayrı sınır koyabilirsin. Hatırlatıcı yalnızca uyarı gösterir. Limit ise kesin bir sınırdır: izleme limitine ulaşınca dönem sonuna kadar canlı yayın izleyemezsin, harcama limitine ulaşınca teklif veremez ve satın alamazsın. Haftalık dönem her Pazartesi 00:00’da, aylık dönem her ayın 1’inde (Türkiye saati) yenilenir. Ayarlarını kendi belirlediğin 4 haneli PIN ile kilitlersin; ani bir kararla gevşetilmesin diye ulaşılan limit dönem sonuna kadar kaldırılamaz.',
  },
  {
    id: 'f21',
    topic: 'authenticity',
    q: 'Marka sahibiyim, taklit ürünü nasıl bildiririm?',
    a: `Hesap → Yasal & KVKK → Fikri mülkiyet ihlali bildir formunu doldur. Formda hak sahibi mi yoksa vekili mi olduğunu, ad soyad ya da unvanını, T.C. kimlik veya vergi numaranı, e-posta ve telefonunu, hakkın türünü (marka, tasarım, patent ya da telif), marka, tasarım ve patentte TÜRKPATENT tescil veya başvuru numarasını, şikâyet ettiğin ilanı ve gerekçeni yazarsın; tescil belgesini (telifte eser sahipliğini gösteren belgeyi) ve ihlali gösteren görselleri ekler, bilgilerin doğru olduğunu ve belgelerin yanlış çıkması hâlinde sorumluluğun sana ait olduğunu onaylarsın. Başvurun usulüne uygunsa ilan en geç ${IP_PROCESS.takedownHours} saat içinde yayından kaldırılır; sana ve satıcıya bildirim gönderilir. Satıcı fatura veya tedarik zinciri belgeleriyle itiraz edebilir; itiraz sana iletilir ve belgelerden açıkça haklı görülürse ilan ${IP_PROCESS.reinstateHours} saat içinde yeniden yayımlanır. İki taraf için de mahkeme yolu açıktır. Gerçek sürümde noter ya da KEP yoluyla da başvurabileceksin. Demo: başvurun yalnızca bu cihazda tutulur, hiçbir yere gönderilmez ve gerçek bir inceleme yapılmaz.`,
  },
  {
    id: 'f22',
    topic: 'authenticity',
    q: 'Neden orijinallik belgesi istiyorsunuz?',
    a: `Taklit markalı ürünü satışa sunmak hak sahibinin haklarını ihlal eder ve suçtur (6769 sayılı Sınai Mülkiyet Kanunu); alıcıyı da zor durumda bırakır. Bu yüzden taklidi yaygın alanlarda (${RISKY_AREAS}), başlığında ya da açıklamasında taklidi yaygın bir marka geçen ilanlarda ve “ihraç fazlası” gibi iddialarda ilan yayımlanmadan önce belge istiyoruz: ${PROOF_LIST}. Bu belge, bir hak sahibi ilanını şikâyet ederse itirazını hızlıca yapabilmeni de sağlar. “Replika”, “muadil”, “A kalite” ya da “… kokusu” gibi ifadeler içeren ilanlar ise hiç yayımlanmaz. Demo: yüklediğin belgeler yalnızca bu cihazda tutulur ve gerçek bir inceleme yapılmaz.`,
  },
];

export type LegalDoc = { id: string; title: string; icon: IconName; updated: string; intro: string; sections: { h: string; p: string }[] };

export const LEGAL_DOCS: LegalDoc[] = [
  {
    id: 'kvkk',
    title: 'KVKK Aydınlatma Metni',
    icon: 'shield-checkmark-outline',
    updated: '1 Ekim 2026',
    intro: `6698 sayılı Kişisel Verilerin Korunması Kanunu (“KVKK”) uyarınca, veri sorumlusu sıfatıyla kişisel verilerini hangi amaçlarla ve nasıl işlediğimizi açıklarız. Veri sorumlusu: ${ENTITY}.`,
    sections: [
      { h: 'İşlenen kişisel veriler', p: 'Kimlik (ad, soyad, kullanıcı adı), iletişim (telefon, e-posta, teslimat adresi), müşteri işlem (siparişler, teklifler, ödeme kayıtları), işlem güvenliği (IP adresi, cihaz bilgisi, oturum kayıtları) ve görsel/işitsel veriler (canlı yayın ve sohbet içerikleri).' },
      { h: 'İşleme amaçları', p: 'Üyelik ve hesabının yönetimi; açık artırma, satış ve ödeme süreçlerinin yürütülmesi; siparişlerin kargoya teslimi; dolandırıcılığın önlenmesi; yasal yükümlülüklerin (e-Arşiv fatura, 6563 sayılı Kanun) yerine getirilmesi ve açık rızan varsa kişiselleştirilmiş kampanyaların sunulması.' },
      { h: 'Hukuki sebepler', p: 'KVKK md. 5/2 uyarınca sözleşmenin kurulması ve ifası, hukuki yükümlülük, meşru menfaat ve bir hakkın tesisi; pazarlama faaliyetleri için md. 5/1 uyarınca açık rıza.' },
      { h: 'Aktarım', p: 'Verilerin; siparişin satıcısı, kargo şirketleri, lisanslı ödeme kuruluşu, bulut hizmet sağlayıcıları ve yetkili kamu kurumlarıyla, yalnızca amaçla sınırlı ve ölçülü olarak paylaşılır. Demo sürümde verilerin yalnızca bu cihazda tutulur ve bu taraflarla paylaşılmaz.' },
      { h: 'Hakların', p: 'KVKK md. 11 kapsamında verilerinin işlenip işlenmediğini öğrenme, düzeltilmesini veya silinmesini isteme, itiraz etme ve zararın giderilmesini talep etme haklarına sahipsin. Taleplerini kvkk@mezatonline.com adresine iletebilirsin; en geç 30 gün içinde yanıtlanır. Demo sürümde bu adres henüz aktif değildir; taleplerini uygulama içi destek sohbetinden iletebilirsin.' },
    ],
  },
  {
    id: 'terms',
    title: 'Kullanım Koşulları',
    icon: 'document-text-outline',
    updated: '1 Ekim 2026',
    intro: `Bu koşullar, ${ENTITY} ile kullanıcılar arasındaki ilişkiyi düzenler. Mezatonline’ı kullanarak bu koşulları kabul etmiş olursun. Lütfen dikkatlice oku. ${DEMO_COPY.banner}`,
    sections: [
      { h: 'Üyelik', p: 'Platformu kullanmak için 18 yaşını doldurmuş olman ve doğru bilgilerle tek bir hesap oluşturman gerekir. Hesabının güvenliğinden sen sorumlusun.' },
      { h: 'Teklifler bağlayıcıdır', p: `${BINDING_BID_TEXT} Bu kural canlı mezatlarda ve ön tekliflerde geçerlidir. Kazandığında ödeme, varsayılan ödeme yönteminden otomatik olarak tahsil edilir (demo sürümde ödeme alınmaz).` },
      { h: 'Yasaklı davranışlar', p: 'Mevzuatın yasakladığı ürünleri listelemek, fiyatı tanıdıklar ya da ikinci hesaplar üzerinden yapay olarak yükseltmek, otomatik yazılımla teklif vermek, ödemeyi uygulama dışına taşımaya çalışmak, kullanıcılara hakaret, tehdit ya da nefret söylemi ve başkasının adres veya telefonunu paylaşmak yasaktır. İhlalin ağırlığına göre uyarı verilebilir, hesap kısıtlanabilir ya da kapatılabilir.' },
      { h: 'Satıcı yükümlülükleri', p: 'Satıcılar ürünleri doğru ve eksiksiz tanıtmak, siparişleri 2 iş günü içinde kargoya vermek ve ilgili mevzuata (vergi, tüketici, e-ticaret) uymakla yükümlüdür.' },
      {
        h: 'Fikri mülkiyet ve taklit ürünler',
        p: `Sahte, taklit ya da hak sahibinin izni olmadan üretilmiş ürünleri satmak ve ilanlarda “replika”, “muadil”, “A kalite” gibi ürünü bir markanın kopyası olarak sunan ifadeler kullanmak yasaktır. Taklidi yaygın kategorilerde (${RISKY_AREAS}), taklidi yaygın markaların geçtiği ilanlarda ve “ihraç fazlası” gibi iddialarda satıcıdan orijinallik belgesi istenir. Marka, tasarım, patent veya telif hakkı sahipleri ihlal ettiğini düşündükleri ilanı Yasal & KVKK sayfasındaki “Fikri mülkiyet ihlali bildir” formuyla bildirebilir; usulüne uygun başvurularda ilan en geç ${IP_PROCESS.takedownHours} saat içinde kaldırılır ve iki taraf da bilgilendirilir. Satıcı fatura ve tedarik zinciri belgeleriyle itiraz edebilir; itiraz açıkça haklıysa ilan ${IP_PROCESS.reinstateHours} saat içinde yeniden yayımlanır. Mahkemeye başvurma hakkı saklıdır. İhlallerde kademeli yaptırım uygulanır: ${STRIKE_POLICY.join(' ')}`,
      },
      { h: 'Uyuşmazlıklar', p: 'Bu koşullar Türkiye Cumhuriyeti hukukuna tabidir. Tüketici uyuşmazlıklarında, parasal sınırlar dahilinde Tüketici Hakem Heyetleri; aşan durumlarda arabuluculuk ve Tüketici Mahkemeleri yetkilidir.' },
    ],
  },
  {
    id: 'distance',
    title: 'Mesafeli Satış Sözleşmesi',
    icon: 'reader-outline',
    updated: '1 Ekim 2026',
    intro: 'Bu sözleşme, 6502 sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmeler Yönetmeliği uyarınca, Mezatonline üzerinden kurumsal satıcılardan yapılan alışverişlerde tarafların hak ve yükümlülüklerini düzenler.',
    sections: [
      { h: 'Taraflar', p: `Satıcı: siparişin ait olduğu, bilgileri ürün ve sipariş sayfasında yer alan kurumsal satıcı. Alıcı: Mezatonline üyesi tüketici. Aracı hizmet sağlayıcı (6563 sayılı Kanun): ${ENTITY}.` },
      { h: 'Ürün ve fiyat', p: 'Ürünün temel nitelikleri, KDV dahil satış fiyatı ve kargo ücreti sipariş özetinde yer alır. Açık artırmalarda fiyat, alıcının kazandığı en yüksek tekliftir.' },
      { h: 'Teslimat', p: 'Ürün, siparişten itibaren en geç 30 gün içinde alıcının belirttiği adrese teslim edilir. Satıcı, siparişi genellikle 2 iş günü içinde kargoya verir.' },
      { h: 'Cayma hakkı', p: 'Alıcı, canlı yayında açık artırmayla yapılanlar dahil, ürünü teslim aldıktan sonra 14 gün içinde gerekçe göstermeden cayma hakkını kullanabilir. Cayma bildiriminden itibaren 14 gün içinde ödeme iade edilir. Yönetmelik m.15’te sayılan hâllerde (ör. kişiye özel hazırlanan ürünler, çabuk bozulabilen ürünler, ambalajı açılmış ve sağlık/hijyen açısından iadesi uygun olmayan ürünler) cayma hakkı kullanılamaz.' },
      { h: 'Ön bilgilendirme', p: 'Alıcı, sipariş öncesinde Ön Bilgilendirme Formu’nu okuduğunu ve elektronik ortamda onayladığını kabul eder. Gerçek sürümde sözleşmenin bir örneği sipariş detayında saklanır; demo sürümde kopya oluşturulmaz.' },
    ],
  },
  {
    id: 'cookies',
    title: 'Çerez Politikası',
    icon: 'albums-outline',
    updated: '1 Ekim 2026',
    intro: 'Uygulamada ve web sitemizde deneyimini iyileştirmek için çerezler ve benzeri teknolojiler kullanırız.',
    sections: [
      { h: 'Zorunlu çerezler', p: 'Oturumunun açık kalması, güvenlik ve ödeme işlemleri için gereklidir; kapatılamaz.' },
      { h: 'Performans çerezleri', p: 'Hangi özelliklerin ne sıklıkla kullanıldığını anonim olarak ölçerek uygulamayı geliştirmemize yardımcı olur.' },
      { h: 'Pazarlama çerezleri', p: 'Yalnızca açık rızan varsa, ilgi alanlarına uygun kampanyalar göstermek için kullanılır. Tercihler → Kişiselleştirilmiş reklamlar ayarından istediğin zaman kapatabilirsin.' },
      { h: 'Saklama süresi', p: 'Oturum çerezleri uygulamadan çıktığında, kalıcı çerezler en fazla 12 ay içinde silinir.' },
    ],
  },
];
