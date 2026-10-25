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

### iPhone (Mac + Xcode, kablo veya aynı Wi‑Fi)

1. iPhone'u Mac'e bağla, kilidini aç, "Bu bilgisayara güven" de. iPhone'da **Ayarlar → Gizlilik ve Güvenlik → Geliştirici Modu** açık olmalı.
2. Release (Metro gerektirmeyen) sürümü derleyip yükle:

```bash
npx expo run:ios --device --configuration Release
```

İlk derlemede Xcode imzalama sorarsa `ios/Mezatonline.xcworkspace` dosyasını Xcode'da aç → **Signing & Capabilities** → Team: *dogukan komurcu (4N6B7MPCY3)* seç, sonra komutu tekrar çalıştır.

### Android (APK)

```bash
npx expo run:android --variant release
```

ya da yalnızca APK üretmek için:

```bash
cd android && ./gradlew assembleRelease
```

APK: `android/app/build/outputs/apk/release/app-release.apk` — telefona kopyalayıp yükleyebilirsin.

### EAS (bulutta derleme, isteğe bağlı)

```bash
npx eas-cli@latest build --profile preview --platform all
```

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
