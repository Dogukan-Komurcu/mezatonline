# Mezatonline

Whatnot'un Türkiye için Türkçe uyarlaması: **canlı yayında açık artırma, Hemen Al, flaş indirim, çekiliş ve pazaryeri**.
Expo SDK 58 + React Native 0.88 + Expo Router. Şu an tüm veriler **mock** (uygulama içinde üretiliyor); veritabanı (Supabase) sonraki aşamada bağlanacak.

## Arkadaşların için indirme paketi

[**DogukanMezatonline klasörünü indir**](https://github.com/Dogukan-Komurcu/mezatonline/releases/latest/download/DogukanMezatonline.zip)

ZIP dosyasını çıkarın; aşağıdaki klasör açılır:

```text
DogukanMezatonline/
├── Mezatonline-Ac.html
└── Kodlar/
```

**`Mezatonline-Ac.html` dosyasını çift tıklayın.** Güncel Chrome, Edge veya Safari ile açılır; kurulum gerekmez. `Kodlar` klasörü uygulamanın kaynak dosyalarını içerir ve başka bilgisayarlarda da kullanılabilir. Görseller ve videolar için internet bağlantısı gerekir; demo veriler kullanılır.

## Telefon tarayıcısından önizleme

[Mezatonline önizlemesini aç](https://mezatonline-onizleme.komurcudogukan46.chatgpt.site)

iPhone'da Safari, Android'de Chrome ile açılır; kurulum veya Expo Go gerekmez. Mac'in açık kalmasına bağlı değildir. Demo veriler kullanılır; gerçek ödeme yapılmaz.

Adres sabittir. Codex otomasyonu beş dakikada bir GitHub `master` dalını kontrol eder; yeni commit varsa güncel önizlemeyi derleyip aynı adreste yayımlar. Yeni sürümü görmek için telefondaki sayfayı yenileyin. Commit edilip GitHub'a gönderilmemiş çalışmalar yayına girmez.

Otomatik güncelleme için geliştirici Mac'inin ve Codex'in çalışması gerekir. Mac kapalıyken yayımlanmış sürüm erişilebilir kalır; yeni değişiklikler sonraki otomasyon çalışmasında yayımlanır. Derleme veya yayın başarısız olursa mevcut sürüm korunur.

Geliştirici için kontrol komutu: `npm run preview:site:check`. Aynı Site'a yayınlama adımları ve kimliği [scripts/preview-site.md](scripts/preview-site.md) dosyasındadır.

## Mac ve Windows'ta tek tıkla önizleme

**`Mezatonline-Ac.html` dosyasını çift tıklayın.** Güncel Chrome, Edge veya Safari'de telefon boyutunda açılır; demo hesap hazırdır. Terminal, Node.js, Expo Go veya kurulum gerekmez. Arkadaşlarınıza yalnızca bu HTML dosyasını göndermeniz yeterlidir; kaynak klasörünü göndermek gerekmez.

Görseller ve videolar internetten yüklenir. İşlemler demo verilerle simüle edilir; gerçek ödeme yapılmaz. Üstteki **Ana sayfa** düğmesi başlangıca döner; **Baştan başlat** demo verilerini sıfırlar. Tarayıcı depolamaya izin veriyorsa deneme verileri aynı dosya tekrar açıldığında korunur.

Kaynak kod değişikliklerinden sonra paylaşım dosyasını yenilemek için geliştirici bilgisayarında:

```bash
npm run preview:build
```

Bu komut Expo web sürümünü derler ve kodu, ikonları, yazı tiplerini tek HTML dosyasına gömer. Paylaşım ayarları yalnızca bu derlemede etkindir; normal iOS/Android açılışını değiştirmez.

Klasör paketini yeniden hazırlamak için kaynak değişikliklerini önce commit edin, sonra çalıştırın:

```bash
npm run preview:build
npm run share:package
```

`work/share-package/DogukanMezatonline.zip` oluşur. HTML önizlemesi ve `Kodlar` içindeki kaynaklar aynı commit'e aittir. Paket, kurulu bağımlılıkları ve Git geçmişini içermez. Üretilen HTML ve ZIP dosyaları Git'e eklenmez; ZIP, GitHub Releases üzerinden paylaşılır.

Geliştirici bilgisayarında dosya kendiliğinden de yenilenebilir: `scripts/refresh-preview.sh --install` bir kez çalıştırılınca her commit ve pull sonrası `master`'ın son hâli arka planda derlenir, proje klasöründeki ve `~/Desktop/DogukanMezatonline/` içindeki dosya güncellenir (birkaç dakika sürer, kaydedilmemiş değişiklikler girmez). Dosyanın üst kısmında derlendiği tarih ve saat yazar; hata olursa bildirim çıkar ve ayrıntı `~/Library/Logs/mezatonline-preview.log` dosyasına yazılır.

## Özellikler

- **Canlı yayın oynatıcı** — dikey kaydırmayla yayınlar arası geçiş, gerçek video, canlı sohbet, kaydırarak teklif verme, özel / maksimum teklif, ani bitiş 💀, son 10 sn'de süre uzatma, çekiliş, flaş indirim, bahşiş, kazanma kutlaması, mağaza sayfası.
- **Ana sayfa** — Sana Özel / Takip Ettiklerin / kategori akışları, en iyi satıcılar, yaklaşan yayınlar, ürünler.
- **Kategoriler, kategori sayfası, arama** (yayın / ürün / kullanıcı / kategori sonuçları, filtre ve sıralama).
- **Ürün sayfası, Hemen Al, Fiyat Öner, ön teklif, ödeme (3D Secure taklidi, taksit, kupon, Mezat Kredisi)**.
- **Aktivite** — siparişler, kargo takibi (Yurtiçi, Aras, MNG, PTT, Sürat, HepsiJet…), değerlendirme, iptal / iade / cayma hakkı.
- **Profil, takipçiler, mesajlar, bildirimler, ödüller (görevler + puan mağazası), cüzdan / davet**.
- **Satıcı tarafı** — başvuru, Satıcı Paneli, ürün oluşturma, envanter, yayın planlama, sipariş kargolama, ödemeler (IBAN), analizler.
- **Satıcı canlı yayın konsolu** — kamera, açık artırma başlatma (süre / karşı teklif süresi / ani bitiş), flaş indirim, çekiliş, mesaj sabitleme, yayın sonu özeti.
- Açık / koyu tema, Türkçe biçimlendirme (₺1.250, 1,2B, "Yarın 21:00"), haptik geri bildirim.

## Geliştirme

```bash
npm install
```

```bash
npx expo run:ios
```

```bash
npx expo run:android
```

Tip kontrolü:

```bash
npx tsc --noEmit
```

## Telefona kurulum

### iPhone'da Expo Go ile önizleme

SDK 58 ile uyumlu iOS önizlemesi EAS Update üzerindeki `expo-go-preview` dalına yayımlandı. Güncel Expo Go ile şu bağlantı açılır:

```text
exp://u.expo.dev/a1c3e9f3-f7b6-4d69-8aad-90ec33fdcd00/group/12bd02c0-18c7-4c12-ad93-be459a25b5b3
```

Bağlantı iPhone'da Safari'ye yapıştırılabilir veya bağlantının QR kodu Kamera ile taranabilir. Yayımlanmış bu sürüm için Metro sunucusunun ya da Mac'in açık kalması gerekmez; cihaz kayıt profili de gerekmez. Uygulama Expo Go içinde çalışır. Expo'nun HTTPS önizleme sayfasında Expo Go seçimi hesap girişi isteyebilir; doğrudan `exp://` bağlantısı simülatörde hesap girişi olmadan test edildi.

Bu önizleme Expo Go SDK 58 simülatöründe açılış testini geçti. Uygulamada **Giriş Yap → Apple ile giriş yap** demo oturumunu açar; gerçek Apple hesabı parolası gerekmez.

Yeni iOS önizlemesi yayımlamak için:

```bash
npx eas-cli@latest update --branch expo-go-preview --platform ios --message "iPhone onizleme" --environment preview
```

### Uzaktaki iPhone (Expo/EAS → cihaza özel preview)

Bu yol, arkadaşının iPhone'unu kaydedip o cihaza özel imzalanan bir **ad-hoc preview** paketi oluşturur. **Expo Go ve TestFlight gerekmez**; telefon Mac'e bağlı olmak zorunda değildir. Ücretli Apple Developer üyeliği gerekir.

**Kurulum henüz hazır değil:** arkadaşının cihaz kaydı tamamlanmalı, ekip tarafından onaylanmalı ve cihazı içeren imzalı preview sürümü hazırlanmalı.

Proje klasöründe cihaz kayıt iş akışını başlat:

```bash
npx eas-cli@latest workflow:run .eas/workflows/iphone-device-registration.yml --wait
```

Bu iş akışı yalnızca cihaz kaydı ve onayını yürütür. Akış `action-required` durumunda bekler; Expo workflow sayfasında bir kayıt bağlantısı ve QR kodu görünür.

1. Kayıt bağlantısını arkadaşına ilet. Arkadaşın bağlantıyı **kendi iPhone'unda Safari ile** açmalı.
2. Ekrandaki cihaz kayıt profilini indirmeli; ardından iPhone'da **Ayarlar → İndirilen Profil** veya **Genel → VPN ve Aygıt Yönetimi** bölümünden yüklemeli. Bu profil, kurulacak uygulama değildir; iPhone'un UDID'sini ve cihaz bilgilerini kayıt için toplar. İndirilen profil sekiz dakika içinde yüklenmezse yeniden indirmesi gerekebilir.
3. Expo workflow sayfasında gelen cihaz kaydını kontrol edip onayla. Arkadaşının cihazı henüz kaydolmadığı için bu onay adımı beklemektedir.
4. Onaydan sonra Apple imzalama ayarlarını tamamla ve arkadaşının UDID'sini ad-hoc provisioning profiline dahil et. **Ana iPhone paketi önceden derlendi ve Expo'ya yüklendi:** [Expo ana paket kaydı](https://expo.dev/accounts/dogukan.komurcu/projects/mezatonline/builds/e3dd6fde-30bc-45f8-a053-8fa3d15ca7cc). Bu kayıt mevcut App Store imzalı IPA'nın yüklenmesidir; arkadaşın cihazını kapsayan imzalama henüz yapılmadı. Expo'nun “Succeeded” durumu burada dosya yüklemesinin tamamlandığını gösterir.

   Önce mevcut paketi `preview` profiliyle yeniden imzala:

   ```bash
   npx eas-cli@latest build:resign --platform ios --id e3dd6fde-30bc-45f8-a053-8fa3d15ca7cc --target-profile preview --wait
   ```

   Yerel yüklenmiş paket için bu yeniden imzalama akışının sunucu kabulü henüz denenmedi. Kabul edilmezse mevcut Xcode arşivi cihazı kapsayan ad-hoc profille yeniden dışa aktarılabilir; tam derleme gerekmez. Son imzalı IPA `npx eas-cli@latest upload --platform ios --build-path <imzalı-ipa-yolu>` ile Expo'ya yüklenebilir.

   Kaynak kod değiştiyse yeni `preview` sürümü oluştur:

   ```bash
   npx eas-cli@latest build --platform ios --profile preview
   ```

5. Başarılı derlemenin **kurulum bağlantısını** arkadaşına gönder. Arkadaşın bu yeni bağlantıyı iPhone'unda Safari ile açıp kurulumu tamamlar. Yalnızca imzalama profilinde kayıtlı cihazlar bu paketi yükleyebilir.

Cihaz kaydı tek başına uygulama kurulumunu tamamlamaz. Kayıt, onay, imzalama ve preview derlemesi bitmeden kurulum bağlantısını hazır kabul etme.

Resmî rehberler: [EAS cihaz kayıt iş akışı](https://docs.expo.dev/eas/workflows/pre-packaged-jobs/#apple-device-registration-request), [iOS ad-hoc dağıtımı](https://docs.expo.dev/build/internal-distribution/).

### Uzaktaki iPhone (Expo/EAS → TestFlight)

Expo projesi: [dogukan.komurcu / mezatonline](https://expo.dev/accounts/dogukan.komurcu/projects/mezatonline).

**26 Ekim 2026 durumu:** iPhone sürümü Apple'a yüklendi ve beta bilgileri kaydedildi. Beta incelemesine gönderim, Expo/EAS üzerinden denendiğinde de Apple'ın genel `ENTITY_UNPROCESSABLE` / HTTP `422` yanıtıyla durdu. Bu nedenle dış test kurulumu henüz açık değildir. Bu gönderimin tamamlanması ve Apple'ın Beta App Review onayı gerekir.

Bu akış, App Store Connect'e önceden yüklenmiş **1.0.0 (1)** iPhone sürümünü kullanır. EAS Workflows üzerinden sürümü **Mezatonline Dış Test** grubuna ekler ve Apple'ın **Beta App Review** incelemesine gönderir. Telefonunda yalnızca **TestFlight** bulunması yeterlidir; **Expo Go gerekmez**.

Ön koşullar:

1. Expo CLI oturumunu projenin hesabıyla aç:

   ```bash
   npx eas-cli@latest login --browser
   ```

2. Expo projesinde **Project settings → General → Connections → App Store Connect** bağlantısını kur. Bağlı Apple hesabının Mezatonline uygulamasına erişimi olmalı.
3. App Store Connect → **Mezatonline → TestFlight → Test Information** bölümündeki beta açıklaması, geri bildirim e-postası ve inceleme iletişim bilgileri tamamlanmış olmalı.

Proje klasöründe iş akışını çalıştır:

```bash
npx eas-cli@latest workflow:run .eas/workflows/testflight-review.yml --wait
```

Bu iş akışı mevcut Apple sürümünü kullanır; yeni EAS derlemesi veya yeniden IPA yüklemesi yapmaz. Gönderimden sonra Apple'ın Beta App Review sonucunu bekle. Apple onayladığında dış test grubunun davet bağlantısını arkadaşına iletebilirsin; arkadaşın bağlantıyı iPhone'unda açıp TestFlight'ta **Kabul Et → Yükle** adımlarını izler.

İleride başka bir sürümü dağıtmak için `.eas/workflows/testflight-review.yml` içindeki `asc_build_id` değerini, App Store Connect'teki yeni derlemenin kimliğiyle güncelle.

Resmî rehber: [EAS Workflows ile Apple'a yüklenmiş bir sürümü TestFlight'a gönderme](https://docs.expo.dev/eas/workflows/pre-packaged-jobs/#submit-an-already-uploaded-build).

### Uzaktaki iPhone (alternatif: Xcode → TestFlight)

Bu yol **Xcode → App Store Connect → TestFlight** üzerinden çalışır. Expo/EAS hesabı ve **Expo Go gerekmez**. Karşı tarafın telefonu Mac'e bağlı olmak zorunda değildir; telefonda yalnızca Apple'ın TestFlight uygulaması gerekir.

Mac'te Xcode ve projenin iOS bağımlılıkları kurulu olmalı. Ücretli **Apple Developer Program** üyeliği gerekir; Xcode → Settings → Accounts bölümünde uygulamanın takımına erişebilen Apple hesabınla oturum aç. **Şifreni ve iki aşamalı doğrulama kodunu yalnızca kendi Apple giriş ekranında gir; sohbet üzerinden paylaşma.**

Önce yerel Release arşivi ve App Store Connect için imzalı IPA dosyası oluştur:

```bash
./scripts/ios-testflight.sh
```

Varsayılan komut **Apple'a yükleme yapmaz**. Arşiv ve export dosyaları `~/Library/Developer/Xcode/Archives/<tarih>/` altında oluşur; betik tam konumlarını yazar. `.xcarchive` dosyasını Xcode Organizer'da açıp **Distribute App → App Store Connect** yoluyla veya dışa aktarılan `.ipa` dosyasını Apple Transporter ile yükleyebilirsin. Uzaktaki kişiye dağıtım için **TestFlight Internal Only** seçme.

Komut satırından yüklemeden önce [App Store Connect](https://appstoreconnect.apple.com/) içinde `com.mezatonline.app` bundle kimliğiyle uygulama kaydı bulunmalı. İlk kaydı App Store Connect'te oluşturabilir veya Xcode Organizer'ın **Distribute App → App Store Connect** akışında gerektiğinde açılan kayıt oluşturma adımını kullanabilirsin. Kayıt olmadan komut satırı yüklemesi `missingApp` hatası verir.

Kayıt hazır olduğunda arşivi oluşturup doğrudan App Store Connect'e yüklemek için açıkça `--upload` kullan:

```bash
./scripts/ios-testflight.sh --upload
```

Betik `app.json` içindeki iOS takımını, bundle kimliğini, sürümü ve build numarasını okur; arşivin kimlik/sürüm bilgilerini kontrol eder. Xcode otomatik imzalamayı ve gerekli dağıtım profilini yönetir. Aynı sürüm/build numarası daha önce yüklenmişse yeni build numarası gerekir; Xcode yükleme sırasında numarayı yönetebilir.

Bu gönderim uygulamayı App Store'da herkese açık yayımlamaz. Uzaktaki kişiye davet bağlantısı vermek için:

1. [App Store Connect](https://appstoreconnect.apple.com/) → **Mezatonline → TestFlight** bölümünde derlemenin işlenmesini bekle.
2. İlk kurulumda önce bir iç test grubu, ardından bir dış test grubu oluştur; derlemeyi dış test grubuna ekle.
3. Beta açıklamasını, geri bildirim e-postasını ve inceleme bilgilerini doldur. Bu sürümün **mock verilerle çalışan bir demo** olduğunu ve gerçek ödeme/sipariş işlemi yapmadığını belirt.
4. İlk dış test sürümünü **Beta App Review** incelemesine gönder. Onay geldikten sonra grubun herkese açık davet bağlantısını etkinleştirip kişiye gönder veya e-posta ile davet et.
5. Karşı taraf App Store'dan **TestFlight** uygulamasını indirip daveti açarak Mezatonline'ı kurar.

TestFlight derlemeleri yüklemeden itibaren **90 gün** kullanılabilir; süre dolmadan yeni derleme paylaşılabilir. Bu Release sürümü kendi JavaScript paketini içerir; kullanıcının bilgisayara, Metro sunucusuna veya Expo Go'ya ihtiyacı yoktur.

Resmî rehber: [Apple ile beta ve sürüm dağıtımı](https://developer.apple.com/documentation/xcode/distributing-your-app-for-beta-testing-and-releases).

### Yanındaki iPhone (kablo / yerel bağlantı)

iPhone'u Mac'e kabloyla bağla (ya da aynı Wi‑Fi'da olsun), kilidini aç. İlk seferde iPhone'da **Ayarlar → Gizlilik ve Güvenlik → Geliştirici Modu** açık olmalı.

```bash
./scripts/ios-device.sh
```

Betik Release sürümünü (Metro gerektirmez, bilgisayardan bağımsız çalışır) ekibin `4N6B7MPCY3` imzasıyla derleyip bağlı iPhone'a yükler.
Uygulama açılmazsa iPhone'da **Ayarlar → Genel → VPN ve Cihaz Yönetimi** altından geliştirici sertifikasına güven.

### Android (APK)

```bash
./scripts/android-apk.sh
```

Proje klasöründe `Mezatonline.apk` oluşur; telefona kopyalayıp yükleyebilirsin ("Bilinmeyen kaynaklar"a izin vermen gerekebilir).
APK yalnızca 64‑bit (arm64) telefonlar içindir — 2017 sonrası neredeyse tüm Android telefonlar.

### Geliştirme modunda telefonda canlı değişiklik görmek

```bash
npx expo start
```

Ardından telefondaki uygulama yerine `npx expo run:ios --device` ile Debug derlemesi yüklenirse kod değişiklikleri anında yansır.

### Bu makinede karşılaşılan durumlar

- **Disk:** iOS + Android derlemeleri ~10 GB yer ister. Disk dolarsa derleme ve Metro çöker.
- **Masaüstü / iCloud:** Proje Masaüstünde olduğu için Xcode çıktıları `~/Library/Developer/Xcode/DerivedData/Mezatonline-*` altına yazılır (aksi halde kod imzalama "resource fork / detritus" hatası verir).
- **CocoaPods ve React Native çekirdeği:** `pod install` her zaman normal şekilde (ağdan indirerek) çalıştırılmalı. `RCT_TESTONLY_RNCORE_TARBALL_PATH` / `RCT_USE_LOCAL_RN_DEP` ile yerel arşivden kurulum yapılırsa Debug/Release geçiş adımı atlanır ve Release sürümü telefonda **açılışta kapanır** (Hermes "Symbol not found" hatası). İndirme takılırsa komutu tekrar çalıştır:

```bash
cd ios && LANG=en_US.UTF-8 pod install
```

- **Simülatörde emojiler "?" görünüyor:** Bu Mac'teki iOS simülatörünün emoji fontu bozuk (Safari'de de aynı). Gerçek telefonda düzgün görünür.

### Geliştirici QA kancaları (yalnızca Debug)

Simülatörde bir ekranı doğrudan açmak için:

```bash
xcrun simctl launch booted com.mezatonline.app -qaLogin 1 -qaRoute /live/s1
```

`-qaSeller 1` satıcı hesabıyla, `-qaTheme dark` koyu temayla açar. Release sürümünde bu kancalar devre dışıdır.

## Proje yapısı

```
src/
  app/              Expo Router ekranları ((auth), (tabs), live, product, checkout, seller, settings…)
  components/ui     Tasarım sistemi bileşenleri (Button, Sheet, Avatar, LiveBadge…)
  components/cards  ShowCard, ProductCard, UserRow, CategoryTile
  data/             Mock veri + veri erişim katmanı (Supabase'e geçişte değişecek tek yer)
  features/         Özellik modülleri (live, commerce, seller, seller-live, account…)
  lib/              Biçimlendirme, açık artırma kuralları, ücretler, haptik
  store/            Zustand store'ları (AsyncStorage ile kalıcı)
  theme/            Renkler, tipografi, açık/koyu tema
docs/               Whatnot araştırma notları ve Expo SDK 58 notları
```

## Sonraki adım: Supabase

`src/data/index.ts` içindeki fonksiyonlar ve `src/store/*` aksiyonları veritabanı çağrılarıyla değiştirilecek. Taslak şema: `supabase/schema.sql`.
