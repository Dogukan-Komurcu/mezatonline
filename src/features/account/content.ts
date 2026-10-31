/**
 * Yardım Merkezi SSS ve yasal metinler (mock içerik).
 * Yayın öncesi metinler hukuk ekibinin onayından geçirilecek; Supabase'e geçişte CMS tablosundan okunacak.
 */
import type { IconName } from '@/components/ui';
import { DEMO_COPY } from '@/config/demo';
import { BINDING_BID_TEXT, ESCROW_TEXT } from '@/features/commerce/utils';

/** Şirket kurulana kadar tüm yasal metinlerde kullanılan unvan */
const ENTITY = 'Mezatonline (demo sürüm; şirket unvanı, MERSİS numarası ve adres şirket kuruluşundan sonra eklenecektir)';
const GIVEAWAY_NOTE = `${DEMO_COPY.giveaway} Gerçek ödüllü çekilişler Milli Piyango İdaresi izniyle düzenlenebilir.`;

export type FaqTopic = 'bids' | 'shipping' | 'returns' | 'protection' | 'giveaway' | 'payment' | 'account';

export const FAQ_TOPICS: { key: FaqTopic; label: string; icon: IconName }[] = [
  { key: 'bids', label: 'Teklif & Mezat', icon: 'hammer-outline' },
  { key: 'shipping', label: 'Kargo', icon: 'cube-outline' },
  { key: 'returns', label: 'İade & Cayma', icon: 'refresh-outline' },
  { key: 'protection', label: 'Alıcı Koruması', icon: 'shield-checkmark-outline' },
  { key: 'giveaway', label: 'Çekiliş', icon: 'gift-outline' },
  { key: 'payment', label: 'Ödeme', icon: 'card-outline' },
  { key: 'account', label: 'Hesap', icon: 'person-circle-outline' },
];

export type Faq = { id: string; topic: FaqTopic; q: string; a: string };

export const FAQS: Faq[] = [
  {
    id: 'f1',
    topic: 'bids',
    q: 'Canlı mezatta nasıl teklif veririm?',
    a: 'Ürün sahneye geldiğinde tutarı ekranın altındaki − ve + düğmeleriyle ayarla; tutar, sıradaki geçerli teklifin altına inmez. Ardından turkuaz “Teklif ver” düğmesini düğme dolana kadar (yaklaşık yarım saniye) basılı tut. Farklı bir tutar yazmak için tutarın üzerine dokun; açılan pencerede istersen “Otomatik teklif (en fazla)” seçeneğini açarak bir üst sınır belirleyebilirsin. Bu durumda sistem, belirlediğin sınıra kadar senin adına en düşük adımla teklif verir. Üst sınırını kimse göremez.',
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
    a: 'Yayın başlamadan önce ürün sayfasından ön teklif verebilirsin. Ön teklifin, ürün sahneye geldiğinde maks. teklif gibi çalışır. Ön teklifler bağlayıcıdır: geri çekilemez ve düşürülemez, yalnızca yükseltilebilir. Kurumsal satıcılardan alımlarda 14 günlük yasal cayma hakkın saklıdır. Ürün, planlanan yayın saatinden sonraki 24 saat içinde satışa çıkmazsa ön teklifin düşer. Teklifin geçilirse sana bildirim göndeririz.',
  },
  {
    id: 'f5',
    topic: 'shipping',
    q: 'Siparişim ne zaman kargoya verilir?',
    a: 'Satıcılar siparişleri 2 iş günü içinde kargoya vermekle yükümlüdür. Kargo takip numarası, Aktivite → Siparişlerim’deki sipariş detayında görünür. Türkiye içinde teslimat genellikle 1-3 iş günü sürer. 7 gün içinde kargoya verilmeyen siparişlerde destek ekibimiz devreye girer.',
  },
  {
    id: 'f6',
    topic: 'shipping',
    q: 'Kargo ücreti nasıl hesaplanır?',
    a: 'Aynı yayında aynı satıcıdan aldığın ürünler için kargo ücretini yalnızca bir kez ödersin; sonraki ürünlerde “Kargo birleştirildi” yazar. Ücret, paketin desisine göre belirlenir. Bazı satıcılar belirli bir tutarın üzerindeki alışverişlerde ücretsiz kargo sunar.',
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
    a: 'Sipariş kargoya verilmeden önce, satın alımdan sonraki ilk 24 saat içinde sipariş detayındaki “Bu siparişle ilgili yardım al” adımından iptal talebinde bulunabilirsin. Kargo öncesi iptal satıcının onayına bağlıdır; onaylanırsa ödemenin tamamı kartına iade edilir ve iadenin kartına yansıma süresi bankana göre değişir. Satıcı kurumsal ise, ürünü teslim aldıktan sonra 14 gün içinde yasal cayma hakkını ayrıca kullanabilirsin.',
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
    a: `Ürün sana hiç ulaşmazsa paranı iade ederiz. Ürün hasarlı, eksik, sahte ya da açıklamayla önemli ölçüde farklı çıkarsa, ürün sana ulaştıktan sonra 14 gün içinde bildirmen yeterli. ${ESCROW_TEXT} Mezatonline bu parayı kendi hesabında tutmaz. ${DEMO_COPY.payment}`,
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
    a: `Çekiliş kartı yayında göründüğünde “Katıl”a dokunman yeterli. Her çekilişe bir kez katılabilirsin; bazı çekilişler yalnızca satıcının takipçilerine açıktır. Kazanan, çekiliş süresi dolduğunda katılımcılar arasından rastgele belirlenir. ${GIVEAWAY_NOTE}`,
  },
  {
    id: 'f14',
    topic: 'giveaway',
    q: 'Çekilişi kazandığımı nasıl anlarım?',
    a: `Kazandıysan yayın ekranında adın görünür ve sana bildirim gelir; ödül, Aktivite → Siparişlerim’e ₺0 tutarlı bir sipariş olarak eklenir. ${GIVEAWAY_NOTE}`,
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
    a: 'Hesap → Profili düzenle’den kullanıcı adını 24 saatte bir değiştirebilirsin. Kullanıcı adı küçük harf, rakam, nokta ve alt çizgiden oluşabilir; en fazla 30 karakterdir.',
  },
  {
    id: 'f19',
    topic: 'account',
    q: 'Doğrulanmış Alıcı nasıl olurum?',
    a: 'Hesap → Doğrulanmış Alıcı’dan “Doğrulan”a dokun. Varsayılan kartından ₺250 geçici ön provizyon alınır ve bankanın 3D Secure ekranında onaylarsın. Provizyon 24 saat içinde iptal edilir; kartından çekim yapılmaz.',
  },
  {
    id: 'f20',
    topic: 'account',
    q: 'Harcama veya izleme limiti koyabilir miyim?',
    a: 'Evet. Hesap → Hesap Kontrolleri’nden haftalık ya da aylık izleme süresi ve harcama için hatırlatıcı veya limit belirleyebilirsin. Ayarlar 4 haneli bir PIN ile korunur; ulaşılan bir limit dönem sonuna kadar kaldırılamaz.',
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
      { h: 'Yasaklı davranışlar', p: 'Sahte teklif (şişirme), bot kullanımı, platform dışı ödeme talebi, taciz, nefret söylemi, başkalarının kişisel bilgilerini paylaşma ve yasaklı ürün satışı kesinlikle yasaktır. İhlallerde uyarıdan hesabın kapatılmasına kadar yaptırım uygulanır.' },
      { h: 'Satıcı yükümlülükleri', p: 'Satıcılar ürünleri doğru ve eksiksiz tanıtmak, siparişleri 2 iş günü içinde kargoya vermek ve ilgili mevzuata (vergi, tüketici, e-ticaret) uymakla yükümlüdür.' },
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
