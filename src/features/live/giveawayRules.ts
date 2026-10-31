/**
 * Çekiliş kuralları ve yasal not (izleyici bilgi sayfası ve satıcı "Çekiliş Başlat" sayfası ortak metni).
 * Gerçek ödüllü çekiliş için Milli Piyango İdaresi izni ve hukukçu onaylı tam kurallar metni gerekir.
 */
import { DEMO_COPY, DEMO_MODE } from '@/config/demo';

/** Resmî kurallar özeti */
export const GIVEAWAY_RULES = [
  'Katılım ücretsizdir; satın alma şartı yoktur. Her kullanıcı bir kez katılabilir.',
  'Katılmak için kayıtlı bir teslimat adresi ve kart gerekir; karttan ücret alınmaz.',
  'Yalnızca 18 yaşından büyükler katılabilir.',
  'Kazanan, çekiliş bittiğinde katılımcılar arasından rastgele seçilir ve yayında duyurulur.',
  'Kazanmak için çekiliş bitene kadar yayında kalmalısın; ayrılırsan katılımın iptal olur.',
  ...(DEMO_MODE ? ['Demo sürümde katılımcılar ve kazanan simülasyondur; ödül gönderilmez.'] : []),
];

/** Yasal not: Apple 5.3 gereği Apple/Google sponsor değildir; MPİ izni olmadan gerçek ödül verilmez */
export const GIVEAWAY_LEGAL_NOTE = `${DEMO_MODE ? `${DEMO_COPY.giveaway} ` : ''}Gerçek ödüllü çekilişler Milli Piyango İdaresi izniyle düzenlenebilir. Apple ve Google bu çekilişin sponsoru değildir.`;
