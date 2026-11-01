/**
 * Çekiliş kuralları ve yasal not (izleyici bilgi sayfası ve satıcı "Çekiliş Başlat" sayfası ortak metni).
 * Gerçek ödüllü çekiliş için Milli Piyango İdaresi izni ve hukukçu onaylı tam kurallar metni gerekir.
 */
import { DEMO_COPY, DEMO_MODE } from '@/config/demo';

/** Resmî kurallar özeti */
export const GIVEAWAY_RULES = [
  'Katılmak için para ödemen ya da bir şey satın alman gerekmez; her hesap bir çekilişe tek kez girebilir.',
  'Ödülün gönderilebilmesi için hesapta adres ve kart kayıtlı olmalıdır; bu kart çekiliş nedeniyle hiçbir zaman ücretlendirilmez.',
  '18 yaşını doldurmamış kullanıcılar katılamaz.',
  'Kura, süre dolduğunda katılanlar arasından rastgele çekilir; sonuç aynı yayında açıklanır.',
  'Kura anına kadar yayında kalmalısın; yayından çıkan kullanıcının katılımı silinir.',
  ...(DEMO_MODE ? ['Demo sürümde katılımcılar ve kazanan simülasyondur; ödül gönderilmez.'] : []),
];

/** Yasal not: Apple 5.3 gereği Apple/Google sponsor değildir; MPİ izni olmadan gerçek ödül verilmez */
export const GIVEAWAY_LEGAL_NOTE = `${DEMO_MODE ? `${DEMO_COPY.giveaway} ` : ''}Gerçek ödüllü çekilişler Milli Piyango İdaresi izniyle düzenlenebilir. Apple ve Google bu çekilişin sponsoru değildir.`;
