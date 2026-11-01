# Yayın Öncesi Hukuki Kontrol Listesi

Mezatonline şu an **demo** olarak çalışıyor: örnek (mock) veriler kullanılıyor, gerçek ödeme, satış, kargo veya çekiliş yapılmıyor. Demo ayarları `src/config/demo.ts` dosyasında (`DEMO_MODE`, `FEATURES`).

Bu liste, 1 Kasım 2026 tarihli hukuki ve mağaza kuralları araştırmasından derlenmiştir. **Hukuki mütalaa değildir**; maddeler avukat ve mali müşavir ile teyit edilmelidir. "Teyit edilmeli" yazan maddeler araştırmada kesinleşmemiştir.

Demoda uygulanan düzeltmeler (metinler, onaylar, demo bildirimleri, özellik kapatmaları) kodda yapılmıştır. Aşağıdakiler **demo olduğu için bilerek yapılmamıştır** ve gerçek yayından önce tamamlanmalıdır.

---

## 1. Şirket ve resmi kayıtlar
- [ ] Şirket kuruluşu (önerilen: Ltd. Şti.), vergi numarası, MERSİS.
- [ ] KEP adresi.
- [ ] ETBİS kaydı (aracı hizmet sağlayıcı), yayından önce; 30 gün içinde bildirimler (KEP, kategoriler, ödeme/kargo sağlayıcıları, veritabanı ülkesi); aylık istatistik bildirimi. (6563 s. Kanun m.11; ETBİS Tebliği)
- [ ] e-Fatura / e-Arşiv / e-Defter: işe başlamadan itibaren 3 ay içinde (aracı hizmet sağlayıcılar için ciro sınırı yok). (VUK 509 Sıra No.lu Tebliğ)
- [ ] Künye ekranındaki (Ayarlar → Künye ve İletişim) yer tutucuların gerçek bilgilerle doldurulması; yasal metinlerdeki "şirket kuruluşundan sonra eklenecektir" ibarelerinin değiştirilmesi.
- [ ] "Mezatonline" marka tescili (TÜRKPATENT) ve mezatonline.com alan adının sahipliğinin doğrulanması; destek@ ve kvkk@ e-posta adreslerinin çalışır hâle getirilmesi (araştırma tarihinde alan adında e-posta kaydı yoktu).
- [ ] Apple ve Google'da kurumsal (şirket adına) geliştirici hesabı.

## 2. Ödeme ve vergi
- [ ] Alıcı parasının platform tarafından tutulmaması: TCMB lisanslı bir ödeme/e-para kuruluşunun pazaryeri (alt üye işyeri) ürünü ile entegrasyon. Lisanssız ödeme hizmeti suçtur. (6493 s. Kanun m.12-13, m.28)
- [ ] Satıcıya ödeme: ürün alıcıya ulaştıktan sonra en geç 5 iş günü içinde tam ödeme. (6563 Ek m.1)
- [ ] Satıcı sözleşmesinde iade/ters ibraz mahsubu, blokaj ve tüm kesintilerin yazılı olması.
- [ ] Kart bilgilerinin ödeme kuruluşunun SDK'sı ile alınması (kart numarası uygulama sunucusuna hiç gelmemeli); sahte 3D Secure ekranının gerçek akışla değiştirilmesi; kayıtlı karttan otomatik çekim için açık onay.
- [ ] Mezat Kredisi: parayla satılmaması, nakde çevrilmemesi, kullanıcılar arası aktarılmaması (aksi hâlde elektronik para riski); kampanya ve kod koşullarının yazılı olması, kodların sunucuda doğrulanması.
- [ ] %1 e-ticaret stopajı ve aylık BTRANS bildirimi (GVK 94/1-19; CK 9284; GVK Genel Tebliği Seri No. 330). Ödeme kuruluşu satıcıya doğrudan öderse stopajı kimin keseceği: mali müşavir / GİB özelgesi.
- [ ] Komisyon, Alıcı Koruması bedeli ve diğer platform ücretlerinin KDV'li faturalanması; yurt dışı hizmetler (Supabase, Expo, Apple, Google vb.) için sorumlu sıfatıyla KDV.
- [ ] Satıcıların gerçek faturasının (veya ödeme kuruluşunun belgesinin) siparişe bağlanması; uygulamadaki "Örnek Fatura (Demo)" ekranının kaldırılması.

## 3. Tüketici hukuku ve e-ticaret
- [ ] Cayma hakkı: kurumsal satıcılardan canlı açık artırma dâhil 14 gün (Danıştay 10. D., 6.5.2026, E.2022/5534 K.2026/2753 ile "canlı müzayede" istisnası iptal edildi — kararın kesinleşip kesinleşmediği teyit edilmeli). Gerçek iade akışı ve iadelerin süresinde yapılması (Mesafeli Sözleşmeler Yönetmeliği m.12/A teyit edilmeli).
- [ ] Bireysel / kurumsal satıcı ayrımının gerçek kriterlere dayanması (düzenli satış yapan birey tacir/esnaf sayılabilir).
- [ ] Her lot ve her sipariş için, karttan çekimden önce ön bilgilendirme ve mesafeli satış sözleşmesi onayı; satıcının kimlik/vergi bilgileri; onayın kaydı ve sözleşme kopyasının alıcıya iletilmesi. (6502 s. Kanun; Mesafeli Sözleşmeler Yönetmeliği m.5)
- [ ] İade kargosu: 1.1.2026'dan itibaren satıcının belirlediği kargoyla iade ücretsiz; gerçek kargo anlaşmaları.
- [ ] Platform sorumluluğu: Anayasa Mahkemesi 12.2.2026 (E.2024/187, K.2026/42) kararıyla platformun tüketici sözleşmelerindeki muafiyeti 2.3.2027'de kalkıyor; satıcı sözleşmesine rücu ve teminat hükümleri.
- [ ] Satıcı sözleşmesi (tam metin), satıcıların yılda en az bir kez doğrulanması, sözleşme değişikliklerinde 15/30 gün bildirim. (ETAHS Yönetmeliği m.6/3, m.16)
- [ ] Fikri mülkiyet şikâyet süreci: şikâyette 48 saat içinde kaldırma, haklı itirazda 24 saat içinde geri yayın; hukuka aykırı içerikte 48 saat. (6563 m.9/3; ETAHS Yönetmeliği m.10, m.12, m.14)
- [ ] Açık artırma kuralları: gölge teklif yasağı ve tespiti, ödemeyen kazanan politikası, platform dışı yönlendirme yasağı.
- [ ] Reklam kuralları (1.8.2026'dan itibaren): indirim öncesi fiyat = son 10 günün en düşük fiyatı; gerçek dışı aciliyet ("son X dakika") yasak; yasal hakları ayrıcalık gibi sunmak yasak; ücretli tanıtımlarda "Reklam/Tanıtım" etiketi; yorumları yalnızca alıcılar yazabilir. (Ticari Reklam ve Haksız Ticari Uygulamalar Yönetmeliği, RG 1.7.2026)
- [ ] Taksit ve fiyat gösterimi: yalnızca ödeme kuruluşunun döndürdüğü taksit seçenekleri; Fiyat Etiketi Yönetmeliği ve kart taksit sınırları (teyit edilmeli).
- [ ] Alıcı Koruması program koşullarının yazılı olması ve fonlanması; "otomatik iade" vaatlerinin gerçek süreçle karşılanması.
- [ ] Sözleşmeler Türkçe; tüketicinin hakem heyeti / tüketici mahkemesi hakkı sözleşmeyle kaldırılamaz.
- [ ] Tüm yasal metinlerin avukat tarafından tek bir sürümlü set olarak yazılması ve herkese açık web adreslerinde yayınlanması.

## 4. Kişisel veriler (KVKK) ve internet hukuku
- [ ] Aydınlatma metninin gerçek veri sorumlusu bilgileriyle yeniden yazılması; açık rızaların ayrı ayrı alınması; saklama ve imha politikası.
- [ ] Yurt dışına aktarım: Supabase, push, SMS, analitik vb. yurt dışındaysa Kurul'un standart sözleşmesi ve 5 iş günü içinde KVKK'ya bildirim (KVKK m.9/5). Alternatif: veritabanını Türkiye'de barındırmak.
- [ ] Gerçek sunucu tarafı hesap silme (anonimleştirme dâhil) ve hesap silme web sayfası (Google Play şartı); KVKK m.11 başvurularının 30 gün içinde yanıtlanması.
- [ ] 72 saat içinde veri ihlali bildirim planı; VERBİS kayıt yükümlülüğünün kontrolü (50 çalışan / 100 milyon TL bilanço eşiği).
- [ ] İYS (İleti Yönetim Sistemi) kaydı ve onayların İYS'ye aktarılması; pazarlama bildirimleri için uygulama içi açık onay/ret (Apple 4.5.4).
- [ ] 5651 s. Kanun: yer sağlayıcı yükümlülükleri (resmi kararla içerik kaldırma, trafik verisinin 1-2 yıl saklanması, künye), yer sağlayıcı bildirimi (yetkili kurum 2026'dan itibaren Siber Güvenlik Başkanlığı).
- [ ] Yaş: tüm işlemler 18+; sunucu tarafında kontrol. Sosyal ağ sağlayıcı yaş doğrulama yönetmeliğinin (RG 10.10.2026, yürürlük 1.11.2026) uygulamaya uygulanıp uygulanmadığı avukatla değerlendirilmeli.
- [ ] Canlı yayın kayıtlarının saklama süresinin belirlenmesi ve aydınlatma metninde yazılması; yayında görünen üçüncü kişilerin onayı.
- [ ] Siber Güvenlik Kanunu (7545) kapsamının değerlendirilmesi (teyit edilmeli).
- [ ] RTÜK internet yayın lisansı: satıcıların kendi yayınları için büyük ihtimalle gerekmiyor; platform kendi TV benzeri program yaparsa yeniden değerlendirilmeli.

## 5. Çekiliş, kutu açılımı ve yasaklı ürünler
- [ ] Çekiliş: ücretli veya ücretsiz her eşya çekilişi Milli Piyango İdaresi izni gerektirir; izinsiz düzenlemek veya imkân sağlamak 3-5 yıl hapis (KHK 320 m.41/2, m.52). Gerçek yayında `FEATURES.giveaways` kapatılmalı ya da her çekiliş için izin alınmalı / kura olmadan herkese hediye modeli kurulmalı. Apple 5.3.1-5.3.2: geliştirici sponsor, resmi kurallar uygulamada.
- [ ] Kutu açılımı (break), gizemli kutu, repack: şans oyunu / kumar riski (KHK 320; TCK 228). `FEATURES.breaks` kapalı; yazılı hukuki görüş olmadan açılmamalı.
- [ ] Yasaklı ürünler listesi ve denetimi: ilaç, tütün, alkol (internetten satış yasağı), ateşli silah ve mermi, sahte ürün, ziynet altını/sahte para; antika ve kültür varlıkları (2863 s. Kanun: ruhsat, müzayede öncesi müzeye bildirim); hayvan ödül olamaz.
- [ ] Ürün güvenliği (7223), gıda (5996), kozmetik, telefon (IMEI), yenilenmiş ürün kategorileri: avukat görüşü olmadan açılmamalı.

## 6. Uygulama mağazaları
- [ ] Ücretli "Yayını Öne Çıkar": Apple 3.1.3(g) gereği IAP / Google Play Billing. Şu an `FEATURES.paidBoost = false`.
- [ ] Bahşiş: Apple 3.2.1(vii) (isteğe bağlı, %100 satıcıya, dijital ayrıcalık yok) veya IAP; vergi ve ödeme hizmeti değerlendirmesi. Şu an `FEATURES.tips = false`.
- [ ] Botlar, simüle izleyici/teklif/sohbet, sahte yorum ve rozetler, örnek satıcılar ve örnek kazananlar üretim sürümünden tamamen çıkarılmalı (Apple 2.1, 2.3.1, 5.6; Google Deceptive Behavior). Gerçek parayla bot teklifi gölge teklif ve dolandırıcılık riski taşır.
- [ ] Örnek medya (Unsplash, randomuser, Pexels/Mixkit videoları, marka ve lig görselleri) üretimde olmamalı; yalnızca satıcıların yüklediği içerik.
- [ ] Gerçek moderasyon: sunucuda şikâyet kuyruğu, filtre, yayını kesme, satıcı yasaklama, yanıt süresi taahhüdü (Apple 1.2; Google UGC).
- [ ] Gerçek Google/Apple/Facebook girişi (şu an demo) veya butonların kaldırılması (Apple 4.8).
- [ ] Gizlilik politikası web adresi, Apple gizlilik etiketleri, Google Data Safety formu, yaş derecelendirmesi 18+.
- [ ] Kişisel Google hesabıyla başvurulursa 12 test kullanıcısıyla 14 günlük kapalı test.

## 7. Whatnot benzerliği
- [ ] Görsel kimliğin özgünleştirilmesi: yeni renk paleti ve simge; teklif kontrolünün farklı bir etkileşimle yeniden tasarımı; açık artırma kartı, Yayın Notları, Destekle ve Sadakat Kulübü ekranlarının yeniden tasarımı. (Ayrıntı: masaüstündeki "Mezatonline_Whatnot_Hukuki_Risk_Notu.docx")
- [ ] Whatnot kaynaklı tüm metinlerin özgün olarak yeniden yazıldığının son kontrolü.
- [ ] README, kod açıklamaları ve araştırma notlarındaki Whatnot atıflarının **avukata danışılmadan silinmemesi** (uyuşmazlık öngörülebilir hâle geldikten sonra silme delil karartma sayılabilir).

## 8. Sahte ürün ve fikri mülkiyet
Demoda uygulananlar (yalnızca cihaz içi, sunucu yok; çekirdek `src/features/trust/`):
- Yasaklı ifade filtresi: ilan, yayın başlığı/açıklaması ve özel etiketlerde "replika", "muadil", "çakma", "A kalite", "1:1", "marka + kokusu/model/tarzı" gibi kalıplar engellenir; aramada bu ifadeler geçerse taklit ürün uyarısı gösterilir. (SMK m.29-30; Ticari Reklam ve Haksız Ticari Uygulamalar Yönetmeliği m.12/2)
- Belge şartı: riskli alt kategorilerde (sneaker, lüks çanta/saat/giyim, parfüm, makyaj, forma, imzalı ürün), marka geçen ilanlarda ve "ihraç fazlası" iddiasında yayından önce orijinallik belgesi ve satıcı beyanı istenir. Demoda örnek belgeler (`sample:`) kullanılabilir; belge incelenmez.
- Hak sahibi formu (Yasal & KVKK → Fikri mülkiyet ihlali bildir): hak sahibi/vekil, kimlik (maskeli saklanır), iletişim, hak türü, TÜRKPATENT tescil/başvuru no, ilan, gerekçe, belgeler ve sorumluluk beyanı. (6563 m.9/3; ETAHS Yönetmeliği m.12)
- İtiraz akışı: ilan kaldırılır, satıcıya bildirim gider; satıcı fatura/tedarik belgesiyle itiraz eder; demoda itiraz birkaç saniye sonra kabul edilmiş sayılıp ilan yeniden yayımlanır (48 / 24 saatlik süreler simüle edilmez). (ETAHS Yönetmeliği m.13-14)
- Kademeli yaptırım metni ve fikri mülkiyet hükmü: Satıcı Sözleşmesi özeti, Topluluk Kuralları, Kullanım Koşulları ve SSS'te. (ETAHS Yönetmeliği m.15/1-ğ)

Gerçek yayından önce:
- [ ] Sunucu tarafı şikâyet kuyruğu: başvuru numarası, 48 saat (kaldırma) ve 24 saat (açıkça haklı itirazda yeniden yayın) sürelerinin izlenmesi, süre aşımı uyarısı; satıcıya ve şikâyetçiye bildirimlerin kayıtlı olarak gönderilmesi; itirazın hak sahibine iletilmesi. (6563 m.9/3; ETAHS Yönetmeliği m.12-14)
- [ ] Gerçek belge incelemesi: TÜRKPATENT tescil belgesi ve vekâletnamenin doğrulanması, satıcı faturalarının ve tedarik zinciri belgelerinin insan tarafından incelenmesi; demodaki örnek belgeler ve otomatik itiraz kabulü kaldırılmalı.
- [ ] KEP adresinin yayımlanması; noter ve KEP ile gelen şikâyetlerin aynı kuyruğa alınması. (ETAHS Yönetmeliği m.12)
- [ ] Hukuka aykırı içerikten haberdar olunca kaldırma ve yetkili kamu kurumlarına bildirim; bildirim usulü ve muhatap kurumlar avukatla belirlenmeli. (6563 m.9/2)
- [ ] Şikâyet, itiraz, kaldırma ve yeniden yayın kayıtlarının 10 yıl saklanması. (6563 m.11/3)
- [ ] Satıcı kimliğinin resmi sistemlerden (nüfus, vergi, MERSİS kayıtları) doğrulanması ve yılda en az bir kez yeniden kontrol edilmesi. (ETAHS Yönetmeliği m.6/3)
- [ ] Yasaklı ifade ve marka listelerinin sunucudan yönetilmesi ve güncellenmesi; şu an koda gömülü ve yalnızca istemcide çalışıyor (atlatılabilir), aynı kontrol sunucuda da yapılmalı.
- [ ] Canlı yayın içi moderasyon: yayında gösterilen ürün ve söylenenler metin filtresinden geçmez; moderatör / otomatik izleme, yayını kesme ve ihlalde yaptırım süreci kurulmalı.
- [ ] iyzico'dan yazılı teyit: hizmet verilmeyen iş kolları listesinde açık artırma siteleri yer alıyor; Mezatonline modeli için yazılı onay alınmalı ya da başka bir lisanslı ödeme kuruluşu seçilmeli.
- [ ] Kart şemalarının pazaryeri yükümlülükleri (Mastercard Rules ile Visa Core Rules / Visa Product and Service Rules; ilgili madde numaraları güncel kural kitaplarından ve ödeme kuruluşundan teyit edilmeli): satıcı denetimi ve taklit ürün satışının önlenmesine ilişkin yükümlülükler ödeme kuruluşuyla birlikte teyit edilmeli.
- [ ] Anayasa Mahkemesi kararının takibi: aracı hizmet sağlayıcının tüketici sözleşmelerindeki muafiyeti 2.3.2027'de kalkıyor; taklit ürün nedeniyle tüketiciye karşı sorumluluk ve satıcıya rücu hükümleri (bkz. 3. bölüm).

## Önerilen sıra
Şirket → vergi numarası ve KEP → e-Fatura/e-Arşiv → ETBİS → ödeme kuruluşu sözleşmesi → İYS → KVKK sözleşmeleri ve yurt dışı aktarım bildirimi → 5651 bildirimi → Apple/Google kurumsal hesaplar → `DEMO_MODE = false` ve örnek verilerin kaldırılması → mağaza başvurusu.

## Takvim
- 2.3.2027: Anayasa Mahkemesi'nin platform sorumluluğu iptalinin yürürlüğe girmesi.
- 31.3.2027: Mevcut hesapların yaş doğrulaması (yönetmelik uygulanıyorsa).
- Her yıl: idari para cezaları, harçlar ve eşiklerin yeniden değerlenmesi.
