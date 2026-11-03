# Sabit telefon önizlemesi

Adres: https://mezatonline-onizleme.komurcudogukan46.chatgpt.site

Mevcut Sites proje kimliği `appgprj_6ae9fe797d3481918c42d165dcbc0b03`.
Kaynak depo `https://github.com/Dogukan-Komurcu/mezatonline`, izlenen dal `master`.
Yerel proje `/Users/dogukan/Projeler/Mezatonline`; ayrı Sites kaynak kopyası
`work/sites/mezatonline-onizleme`, yayın arşivi `work/sites/mezatonline-onizleme.tar.gz`.
Bu kimlik ve public erişim korunur; yeni Site oluşturulmaz.

## Otomasyonun her çalışması

1. Proje kökünde `node scripts/sync-preview-site.mjs --check` çalıştır.
   Komut GitHub `origin/master` dalını fetch eder ve canlı `/version.json` ile karşılaştırır.
   `needsPublish` false ise hiçbir derleme veya yayın yapmadan bitir.
   Kontrol/ağ hatasını "güncel" olarak yorumlama.
2. Değişiklik varsa Sites becerisini oku. `get_site` ile aynı Site'ın mevcut erişimini
   kontrol et, `create_source_repository_write_credential` ile taze kaynak erişimi al.
   Credential'ı yalnız oturum belleğinde tut; dosyaya, shell argümanına, loga veya Git'e yazma.
3. Sites `site-workflow.mjs --project-id <yukarıdaki kimlik>` yardımcısını ayrı kaynak
   kopyasında TTY ile başlat. Girdi hazır mesajından sonra credential JSON'unu stdin'den
   gönder; bu ilk açmada `archivePath` kullanma. Dönen açma sonucunun tamamını sakla.
   Kaynak kopyası yoksa önce boş bir dizinde yardımcının mevcut Site kaynağını açmasını sağla.
4. Proje kökünde `node scripts/sync-preview-site.mjs --sync <sourceCommit>` çalıştır.
   `sourceCommit`, kontrolün döndürdüğü tam SHA'dır. Yalnız GitHub'a gönderilmiş kaynaklar
   kopyalanır; ana çalışma klasörüne checkout/reset/pull veya değişiklik uygulanmaz.
   Kaynak kopyasındaki `.git` ve `.openai/hosting.json` korunur.
5. `needsInstall` true ise kaynak kopyasındaki `node_modules` bir symlink olmamalıdır:
   yalnız bu symlink'i kaldır, root bağımlılıklarına dokunma. Sites'in
   `install-dependencies.mjs` yardımcısını kaynak kopyasında çalıştır.
   Yalnız başarılı kurulumdan sonra proje kökünde
   `node scripts/sync-preview-site.mjs --mark-installed` çalıştır.
   Başarısız veya yarım kurulumda başarı işaretçisi yazma; sonraki çalışma yeniden kurmalıdır.
   Bağımlılık girdileri değişmediyse yeniden kurulum yapma.
6. Kaynak kopyasında typecheck çalıştır: `node node_modules/typescript/bin/tsc --noEmit`.
   Root projede `npx --no-install eslint --config work/eslint-config.generated-by-check.cjs src`
   ile mevcut Expo lint yapılandırmasını kullan. Kontrol yapılandırması yoksa aynı varsayılan
   Expo yapılandırmasını yalnız `work/` içine oluştur; ana kaynak dosyalarını değiştirme.
   Mevcut lint hatalarını ilgisiz değişikliklerle düzeltme;
   yeni hata olup olmadığını değerlendir ve sonucu kaydet. İlk kurulumdaki mevcut durum
   48 hata ve 5 uyarıydı; typecheck başarılıydı.
7. Aynı Sites yardımcısını açma sonucunu `source` olarak geçirerek yeniden çalıştır.
   Stdin JSON'u credential, source, commands ve mutlak archivePath içerir.
   Derleme komutu `["node", "<kurulu Sites eklentisi>/scripts/build-site.mjs"]` olur.
   Yardımcı kaynak commit/push ve paketlemeyi yapar. Dönen `project_id`, `commit_sha`
   ve `archive` değerlerini aynen kullan.
8. `save_site_version` ile bu commit ve arşivi kaydet, dönen sürüm kimliğiyle
   `deploy_site_version` çağır. Yalnız pending/building/publishing durumlarında
   `get_deployment_status` ile devam et; başarısız yayını tamamlanmış sayma.
   Aynı commit için zaten kaydedilmiş/devam eden yayın varsa onu devam ettir.
9. Başarıdan sonra herkese açık `/version.json` içindeki `sourceCommit` değerinin
   yayımlanan kaynak SHA'sı olduğunu doğrula. `--check` komutu değişiklik yoksa
   `needsPublish: false` dönmelidir; arada yeni commit geldiyse sonraki çalışmaya bırak.

Canlı `/version.json` yayın kanıtıdır. Yerel `source-provenance.json` tek başına
başarılı yayın anlamına gelmez. Başarısızlıkta mevcut canlı sürüm korunur.
Üretilen HTML, dist, arşivler ve credential'lar GitHub'a commit edilmez.
Sites kaynak deposuna yalnız kaynak kodu ve yayın yapılandırması gönderilir.

## Yerel kontrol ve derleme

`npm run preview:site:check` yalnız değişiklik kontrolü yapar.
`npm run preview:site:build` güncel çalışma kopyasından `dist/` üretir; tek başına yayın yapmaz.
Otomatik yayın, GitHub `master` anlık görüntüsünü kullandığı için devam eden yerel
çalışmalar veya başka dallar arkadaşların gördüğü sürümü değiştirmez.
