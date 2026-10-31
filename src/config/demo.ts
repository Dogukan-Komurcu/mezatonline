/**
 * Demo sürümü ayarları.
 *
 * Uygulama şu an örnek (mock) verilerle çalışan bir demodur: gerçek ödeme, satış, kargo veya
 * çekiliş yapılmaz; canlı yayınlardaki izleyici, teklif ve sohbetler simülasyondur.
 * Gerçek yayına geçmeden önce DEMO_MODE kapatılmalı ve docs/YAYIN-ONCESI-HUKUKI-KONTROL.md
 * listesindeki adımlar tamamlanmalıdır.
 */
export const DEMO_MODE = true;

/** Hukuki veya mağaza kuralları bakımından risk taşıyan özellikler */
export const FEATURES = {
  /**
   * Canlı yayın çekilişleri. Gerçek ödüllü çekilişler Milli Piyango İdaresi izni (KHK 320 m.41)
   * ve Apple 5.3 kuralları gerektirir; demoda gerçek ödül verilmediği belirtilerek gösterilir.
   */
  giveaways: DEMO_MODE,
  /** Ücretli “Yayını Öne Çıkar”: Apple 3.1.3(g) gereği uygulama içi satın alma (IAP) gerektirir */
  paidBoost: false,
  /** Satıcıya bahşiş: Apple 3.2.1(vii), vergi ve ödeme hizmeti değerlendirmesi tamamlanana kadar kapalı */
  tips: false,
  /** Kutu açılımı (break), gizemli kutu, depo açılışı: şans oyunu riski (KHK 320 m.41, TCK 228) */
  breaks: false,
} as const;

/** Demo bilgilendirme metinleri (tek kaynak) */
export const DEMO_COPY = {
  short: 'Demo sürüm',
  banner: 'Bu bir demo sürümdür: gerçek ödeme, satış veya kargo yapılmaz.',
  simulated: 'Bu yayındaki izleyici sayıları, teklifler, sohbet mesajları ve kazananlar örnek amaçlı simülasyondur.',
  payment: 'Demo: Kartından ödeme alınmaz. Kart numarası saklanmaz; yalnızca son 4 hane bu cihazda tutulur.',
  giveaway: 'Demo çekiliş: gerçek ödül verilmez.',
} as const;
