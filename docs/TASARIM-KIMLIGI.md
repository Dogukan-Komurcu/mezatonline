# Mezatonline Tasarım Kimliği

Karar tarihi: 1 Kasım 2026 · Sürüm: 1.0

Bu belge, Mezatonline'ın görsel kimliğini ve canlı yayın (mezat) ekranının etkileşim tasarımını tanımlar. Amaç, uygulamanın işleyişini (canlı açık artırma, Hemen Al, sohbet, çekiliş) korurken görünümünü ve etkileşimlerini kendi markamıza özgü hâle getirmektir. Tasarım kararları ve gerekçeleri burada tarihli olarak kayıt altına alınır.

## 1. Marka kavramı: "Çini turkuazı ve bakır"

Mezat, Türk çarşı ve bedesten kültürünün parçasıdır. Kimlik bu kültürden beslenir:
- **Turkuaz (çini):** Türk el sanatlarının simge rengi; güven ve canlılık.
- **Bakır:** Kapalıçarşı'nın bakırcıları; vurgu ve sadakat (müdavimlik) unsurları.
- **Gece laciverti nötrler:** Saf griler yerine hafif mavi tonlu koyu yüzeyler; video üzerinde sakin, okunaklı katmanlar.

## 2. Renk paleti

| Token | Açık tema | Koyu tema | Canlı yayın |
|---|---|---|---|
| Birincil (turkuaz) | `#0D9488` | `#14A396` | `#14A396` |
| Birincil basılı | `#0B7C72` | `#0F8C81` | — |
| Birincil üstü metin | `#FFFFFF` | `#FFFFFF` | `#FFFFFF` |
| Birincil yumuşak | `#CCF0EC` | `#123A38` | — |
| Vurgu / bağlantı | `#0B7A73` | `#5EEAD4` | `#5EEAD4` |
| Bakır (ikincil vurgu) | `#C2703D` | `#E08A4F` | `#E08A4F` |
| Bakır yumuşak | `#F6E3D6` | `#3A2A20` | — |
| Canlı (nar kırmızısı) | `#E0244F` | `#F0325C` | `#F0325C` |
| Başarı | `#15955A` | `#34C77B` | `#34C77B` |
| Uyarı | `#C9790A` | `#F2A93B` | — |
| Hata | `#D93848` | `#F2555A` | `#F2555A` |
| Bilgi | `#2563EB` | `#60A5FA` | — |
| Arka plan | `#FFFFFF` | `#0E1116` | — |
| Kart | `#FFFFFF` | `#161B22` | panel `#11161C` |
| Yüzey | `#F1F4F6` | `#1E252E` | panel alt `#1B222B` |
| Yüzey alt | `#E2E8EC` | `#2A323D` | — |
| Kenarlık | `#DCE3E8` | `#28303A` | `rgba(255,255,255,0.16)` |
| Metin | `#11161C` | `#F5F7FA` | `#FFFFFF` |
| İkincil metin | `#5B6670` | `#A3ADB8` | `rgba(255,255,255,0.78)` |
| Üçüncül metin | `#9AA4AD` | `#6B7682` | `rgba(255,255,255,0.56)` |
| Ters (inverse) | `#11161C` | `#F5F7FA` | — |
| İskelet | `#E9EEF1` | `#1C232B` | — |
| Cam (video üstü) | — | — | `rgba(8,12,18,0.42)` / güçlü `rgba(8,12,18,0.62)` / açık `rgba(255,255,255,0.14)` |

Kural: Ekranlarda sabit renk kodu kullanılmaz; her zaman tema tokenları kullanılır.

## 3. Biçim dili

- **Birincil ve ikincil düğmeler:** Yumuşak köşeli dikdörtgen (köşe yarıçapı 14). Tam yuvarlak "hap" biçimi yalnızca çip ve etiketlerde kullanılır.
- **Video üstü kontroller:** Cam yüzeyler (yarı saydam lacivert), ince açık kenarlık, köşe yarıçapı 14–20.
- **İkonografi:** Çizgi (outline) ikonlar; dolu ikon yalnızca seçili durumda.
- **Simge ve logo:** Turkuaz zemin üzerinde beyaz tokmak; köşe yarıçapı simge boyutunun %28'i. Logo yazısı küçük harf "mezatonline".

## 4. Canlı yayın ekranı

| Bölüm | Tasarım |
|---|---|
| Üst bilgi | Satıcı avatarı; takip edilmiyorsa avatarın sağ altında turkuaz "+" rozeti (dokununca takip). Kullanıcı adı ve doğrulama rozeti; altında takipçi sayısı. Sağda göz ikonlu cam izleyici sayacı ve "×" kapat düğmesi. |
| Yayın bilgisi | Sarı yapışkan not yerine başlığın altında cam "ⓘ Yayın bilgisi" çipi; dokununca cam kartta açılır, tekrar dokununca kapanır. |
| Yan eylemler | Tek bir dikey cam kapsül içinde ikonlar: Paylaş, Müdavim Kartı (bakır vurgulu), Diğer, Ses. Cüzdan, "Diğer" menüsüne taşındı. |
| Açık artırma kartı | Kartın üst kenarında kalan süreyi gösteren ince ilerleme çizgisi (son 5 saniyede nar kırmızısı). Üst satır: biçim çipi (Açık artırma / Uzatmasız) ve saat ikonuyla kalan süre. Ürün görseli ve başlık; altında "Güncel teklif" ile büyük fiyat ve lider bilgisi kartın içinde. Ayrı "… önde!" etiketi kullanılmaz. |
| Teklif paneli | Solda tutar seçici: [−] tutar [+] (en düşük geçerli teklifin altına inmez; tutara dokununca özel tutar penceresi açılır). Sağda turkuaz "Teklif ver" düğmesi: **basılı tutarak** (yaklaşık 0,5 sn) teklif verilir, basılı tutarken düğme içi dolum ilerlemesi gösterilir. Kaydırma (slider) ve ayrı "Özel" düğmesi kullanılmaz. |
| Uzatmasız mezat | "Ani Bitiş" adı ve kurukafa simgesi yerine "Uzatmasız" adı ve bayrak simgesi. |
| Alt çubuk | Cam sohbet kutusu; dış hatlı kalp ikonlu cam tepki düğmesi (uzun basınca tepki seçici); ürün görseli kutucuğu yerine çanta ikonlu "Mağaza · N" etiketi. |
| Çekiliş | Başlık altındaki kart yerine sohbet alanının üstünde ince cam şerit: bakır daire içinde hediye ikonu, ödül adı, geri sayım, turkuaz "Katıl" düğmesi; demo notu. |
| Sabit mesaj | Turkuaz sol kenarlıklı cam kutu. |
| Müdavim Kartı | Satıcıya özel sadakat programı. Seviyeler Ahilik geleneğinden: **Çırak** (1+ alışveriş), **Kalfa** (5+), **Usta** (15+). Kimlik kartı simgesi, bakır renk. İndirim kodu `MUDAVIM5`. |
| İlk teklif bilgilendirmesi | Çok adımlı kaydırmalı tanıtım yerine tek ekranlık kısa kontrol listesi ve "Anladım" düğmesi. |
| Özel tutar penceresi | Tutar girişi ve hızlı artış düğmeleri (+₺10 / +₺50 / +₺100). "Otomatik teklif (en fazla)" seçeneği varsayılan olarak kapalı. |
| Mağaza penceresi | Sekmeler yerine çipler: Sırada · Satın al · Satıldı. |

## 5. Adlandırma

- "Sadakat Kulübü" → **Müdavim Kartı**
- "Ani Bitiş" → **Uzatmasız**
- "Jumbotron" → **Dev tepki**
- Kullanıcıya gösterilen metinler kendi cümlelerimizle yazılır; başka platformların metinleri çevrilerek kullanılmaz.

## 6. Kayıt

- 1 Kasım 2026: Tasarım kimliği 1.0 kararlaştırıldı ve uygulamaya geçirildi. Önceki tasarım sürüm kontrol geçmişinde (git) korunmaktadır.
