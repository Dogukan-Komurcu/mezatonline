# Mezatonline

Whatnot'un Türkiye için Türkçe uyarlaması: **canlı yayında açık artırma, Hemen Al, flaş indirim, çekiliş ve pazaryeri**.
Expo SDK 58 + React Native 0.88 + Expo Router. Şu an tüm veriler **mock** (uygulama içinde üretiliyor); veritabanı (Supabase) sonraki aşamada bağlanacak.

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

### iPhone (tek komut)

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
- **Yavaş ağ ve CocoaPods:** `pod install` React Native çekirdek dosyasını indirirken takılırsa, indirilmiş arşivlerle kurulum:

```bash
cd ios && LANG=en_US.UTF-8 RCT_TESTONLY_RNCORE_TARBALL_PATH=$PWD/Pods/ReactNativeCore-artifacts/reactnative-core-0.88.0-debug.tar.gz RCT_USE_LOCAL_RN_DEP=$PWD/Pods/ReactNativeDependencies-artifacts/reactnative-dependencies-0.88.0-debug.tar.gz pod install
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
