/**
 * Yardım Merkezi SSS ve yasal metinler (mock içerik).
 * Yayın öncesi metinler hukuk ekibinin onayından geçirilecek; Supabase'e geçişte CMS tablosundan okunacak.
 */
import type { IconName } from '@/components/ui';

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
    a: 'Ürün sahneye geldiğinde ekranın altındaki “Teklif ver” düğmesini sağa kaydır. Sıradaki geçerli tutar otomatik hesaplanır. Daha yüksek bir tutar için “Özel” düğmesiyle maks. teklif belirleyebilirsin; sistem, belirlediğin tutara kadar senin adına en düşük adımla teklif verir. Maks. teklifini kimse göremez.',
  },
  {
    id: 'f2',
    topic: 'bids',
    q: 'Verdiğim teklifi geri alabilir miyim?',
    a: 'Hayır. Mezatonline’da verilen tüm teklifler ve ön teklifler bağlayıcıdır; iptal edilemez ve düşürülemez. Yanlışlıkla verdiğin bir teklif için 2 saat içinde Bize Ulaş’tan yayın adını ve ürünü yazarsan satıcıyla birlikte inceleriz.',
  },
  {
    id: 'f3',
    topic: 'bids',
    q: 'Son saniyelerde süre neden uzuyor?',
    a: 'Son 10 saniyede gelen her teklif, süreyi satıcının belirlediği karşı teklif süresine (genellikle 10 saniye) sıfırlar; böylece herkes karşılık verme şansı bulur. “Ani Bitiş 💀” işaretli mezatlarda süre uzamaz, süre dolduğunda en yüksek teklif kazanır.',
  },
  {
    id: 'f4',
    topic: 'bids',
    q: 'Ön teklif nedir, nasıl çalışır?',
    a: 'Yayın başlamadan önce ürün sayfasından ön teklif verebilirsin. Ön teklifin, ürün sahneye geldiğinde maks. teklif gibi çalışır. Ön teklifler iptal edilemez ve planlanan yayın saatinden 24 saat sonra geçerliliğini yitirir. Teklifin geçilirse sana bildirim göndeririz.',
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
    a: 'Yurtiçi Kargo, Aras Kargo, MNG Kargo, PTT Kargo, Sürat Kargo, HepsiJet ve Trendyol Express ile anlaşmalıyız. Satıcı, kargo kodunu oluştururken firmayı seçer; takip bağlantısı sipariş detayına otomatik eklenir.',
  },
  {
    id: 'f8',
    topic: 'returns',
    q: 'Cayma hakkımı nasıl kullanırım?',
    a: 'Kurumsal satıcılardan aldığın ürünlerde, 6502 sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmeler Yönetmeliği uyarınca teslimattan itibaren 14 gün içinde gerekçe göstermeden cayma hakkını kullanabilirsin. Sipariş detayından iade talebi oluştur; iade kargo kodu satıcı tarafından sağlanır ve ücreti satıcıya aittir.',
  },
  {
    id: 'f9',
    topic: 'returns',
    q: 'Siparişimi iptal edebilir miyim?',
    a: 'Satın alımdan sonraki 24 saat içinde ve kargo etiketi oluşturulmadan önce iptal talep edebilirsin. Satıcının talebi yanıtlamak için 2 iş günü vardır; yanıt verilmezse sipariş kargolanır. Onaylanan iptallerde ödeme 3-5 iş günü içinde kartına iade edilir.',
  },
  {
    id: 'f10',
    topic: 'returns',
    q: 'Hangi ürünlerde cayma hakkı yoktur?',
    a: 'Ambalajı açılmış kozmetik ve hijyen ürünleri, çabuk bozulan ürünler, kişiye özel üretilenler ve fiyatı piyasaya bağlı olarak değişen ürünler (ör. altın, külçe) cayma hakkı kapsamı dışındadır. Bireysel satıcılardan yapılan alışverişlerde ise Alıcı Koruması geçerlidir.',
  },
  {
    id: 'f11',
    topic: 'protection',
    q: 'Alıcı Koruması neleri kapsar?',
    a: 'Ürün hiç ulaşmazsa, hasarlı gelirse, açıklamadan önemli ölçüde farklıysa ya da sahteyse paranı iade ederiz. Ödemen, sipariş teslim edilip onaylanana kadar Mezatonline güvencesinde tutulur; satıcıya ancak sonra aktarılır.',
  },
  {
    id: 'f12',
    topic: 'protection',
    q: 'Sorun bildirmek için ne kadar sürem var?',
    a: 'Satın alımdan itibaren 30 gün ya da teslimattan itibaren 14 gün (hangisi önce dolarsa). Koleksiyon kartları, sikke, sneaker ve lüks ürünlerde bu süre teslimattan itibaren 7 gün, bitki ve taze gıdada 2 gündür. Sahtecilik bildirimleri teslimattan itibaren 30 gün içinde yapılabilir.',
  },
  {
    id: 'f13',
    topic: 'giveaway',
    q: 'Çekilişlere nasıl katılırım?',
    a: 'Yayında çekiliş kartı göründüğünde “Katıl”a dokun. Katılmak için yayında olman, kayıtlı bir adresinin ve ödeme yönteminin bulunması gerekir. Her çekilişe bir kez katılabilirsin; bazı çekilişler yalnızca takipçilere ya da doğrulanmış alıcılara açıktır.',
  },
  {
    id: 'f14',
    topic: 'giveaway',
    q: 'Çekilişi kazandığımı nasıl anlarım?',
    a: 'Kazanan, yayın ekranında duyurulur ve sana anlık bildirim gönderilir. Ürün otomatik olarak siparişlerine eklenir; ürün için ödeme yapmazsın, yalnızca satıcı belirlediyse kargo ücreti alınır.',
  },
  {
    id: 'f15',
    topic: 'payment',
    q: 'Hangi ödeme yöntemlerini kullanabilirim?',
    a: 'Visa, Mastercard ve Troy logolu kredi ve banka kartları kabul edilir. Kartlar 3D Secure ile doğrulanarak kaydedilir. Hemen Al ürünlerinde anlaşmalı bankalarla taksit seçenekleri sunulur; açık artırma ve bahşişlerde taksit yapılamaz.',
  },
  {
    id: 'f16',
    topic: 'payment',
    q: 'Kartımdan ne zaman çekim yapılır?',
    a: 'Açık artırmayı kazandığında, Hemen Al ile satın aldığında ya da fiyat önerin kabul edildiğinde varsayılan kartından çekim yapılır. Teklif vermek tek başına çekime neden olmaz. Mezatonline’ın abonelik ücreti yoktur.',
  },
  {
    id: 'f17',
    topic: 'payment',
    q: 'Mezat Kredisi nedir?',
    a: 'Davet ve kampanyalardan kazandığın kredilerdir. Bir sonraki alışverişinde ürün tutarından otomatik düşülür; kargo ve hizmet bedeline uygulanmaz. Krediler tanımlandıkları tarihten itibaren 90 gün geçerlidir. Cüzdan ekranından bakiyeni ve geçmişini görebilirsin.',
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
    intro: '6698 sayılı Kişisel Verilerin Korunması Kanunu (“KVKK”) uyarınca, veri sorumlusu sıfatıyla Mezatonline olarak kişisel verilerini hangi amaçlarla ve nasıl işlediğimizi açıklarız.',
    sections: [
      { h: 'İşlenen kişisel veriler', p: 'Kimlik (ad, soyad, kullanıcı adı), iletişim (telefon, e-posta, teslimat adresi), müşteri işlem (siparişler, teklifler, ödeme kayıtları), işlem güvenliği (IP adresi, cihaz bilgisi, oturum kayıtları) ve görsel/işitsel veriler (canlı yayın ve sohbet içerikleri).' },
      { h: 'İşleme amaçları', p: 'Üyelik ve hesabının yönetimi; açık artırma, satış ve ödeme süreçlerinin yürütülmesi; siparişlerin kargoya teslimi; dolandırıcılığın önlenmesi; yasal yükümlülüklerin (e-Arşiv fatura, 6563 sayılı Kanun) yerine getirilmesi ve açık rızan varsa kişiselleştirilmiş kampanyaların sunulması.' },
      { h: 'Hukuki sebepler', p: 'KVKK md. 5/2 uyarınca sözleşmenin kurulması ve ifası, hukuki yükümlülük, meşru menfaat ve bir hakkın tesisi; pazarlama faaliyetleri için md. 5/1 uyarınca açık rıza.' },
      { h: 'Aktarım', p: 'Verilerin; siparişin satıcısı, anlaşmalı kargo şirketleri, ödeme kuruluşu, bulut hizmet sağlayıcıları ve yetkili kamu kurumlarıyla, yalnızca amaçla sınırlı ve ölçülü olarak paylaşılır.' },
      { h: 'Hakların', p: 'KVKK md. 11 kapsamında verilerinin işlenip işlenmediğini öğrenme, düzeltilmesini veya silinmesini isteme, itiraz etme ve zararın giderilmesini talep etme haklarına sahipsin. Taleplerini kvkk@mezatonline.com adresine iletebilirsin; en geç 30 gün içinde yanıtlanır.' },
    ],
  },
  {
    id: 'terms',
    title: 'Kullanım Koşulları',
    icon: 'document-text-outline',
    updated: '1 Ekim 2026',
    intro: 'Mezatonline’ı kullanarak bu koşulları kabul etmiş olursun. Lütfen dikkatlice oku.',
    sections: [
      { h: 'Üyelik', p: 'Platformu kullanmak için 18 yaşını doldurmuş olman ve doğru bilgilerle tek bir hesap oluşturman gerekir. Hesabının güvenliğinden sen sorumlusun.' },
      { h: 'Teklifler bağlayıcıdır', p: 'Canlı mezatlarda ve ön tekliflerde verdiğin teklifler bağlayıcıdır. Kazandığında ödeme, varsayılan ödeme yönteminden otomatik olarak tahsil edilir.' },
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
      { h: 'Taraflar', p: 'Satıcı: siparişin ait olduğu, bilgileri ürün ve sipariş sayfasında yer alan kurumsal satıcı. Alıcı: Mezatonline üyesi tüketici. Mezatonline, 6563 sayılı Kanun kapsamında aracı hizmet sağlayıcıdır.' },
      { h: 'Ürün ve fiyat', p: 'Ürünün temel nitelikleri, KDV dahil satış fiyatı ve kargo ücreti sipariş özetinde yer alır. Açık artırmalarda fiyat, alıcının kazandığı en yüksek tekliftir.' },
      { h: 'Teslimat', p: 'Ürün, siparişten itibaren en geç 30 gün içinde alıcının belirttiği adrese teslim edilir. Satıcı, siparişi genellikle 2 iş günü içinde kargoya verir.' },
      { h: 'Cayma hakkı', p: 'Alıcı, teslimattan itibaren 14 gün içinde gerekçe göstermeden cayma hakkını kullanabilir. Cayma bildiriminden itibaren 14 gün içinde ödeme iade edilir. Yönetmelik md. 15’te sayılan ürünlerde cayma hakkı bulunmaz.' },
      { h: 'Ön bilgilendirme', p: 'Alıcı, sipariş öncesinde Ön Bilgilendirme Formu’nu okuduğunu ve elektronik ortamda onayladığını kabul eder. Sözleşmenin bir örneği sipariş detayında saklanır.' },
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
