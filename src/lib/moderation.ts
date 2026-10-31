/**
 * Basit içerik filtresi (demo): canlı sohbet ve mesajlarda küfür / hakaret engeli.
 * Gerçek sürümde sunucu tarafı filtre, şikâyet kuyruğu ve moderasyon ekibiyle birlikte çalışmalıdır.
 *
 * Kelime bazlı eşleşir (alt dize değil): "sikke", "götürmek", "sıkıntı" gibi masum kelimeler engellenmez.
 * Bu yüzden Türkçe karakterler ASCII'ye çevrilmez; iki yazım da listede ayrıca yer alır.
 */

export const MODERATION_BLOCKED_MESSAGE = 'Mesajın topluluk kurallarına uygun olmadığı için gönderilmedi.';

/** Yalnızca kelimenin tamamı eşleşirse engellenir */
const EXACT = new Set([
  // Türkçe
  'amk', 'amq', 'aq', 'oç', 'sik', 'sktr', 'göt', 'götün', 'götüne', 'götünü', 'yarak',
  // İngilizce
  'shit', 'shitty', 'dick', 'pussy', 'cock', 'fck', 'fuk', 'wtf', 'stfu', 'kys',
]);

/** Kelime bu köklerden biriyle başlıyorsa engellenir (ekli hâller dahil) */
const PREFIX = [
  // Türkçe
  'amına', 'amina', 'amcık', 'amcik', 'orospu', 'siktir', 'sikerim', 'sikeyim', 'sikiyim', 'sikim', 'siktiğ', 'siktig',
  'skerim', 'skeyim', 'sktir', 'yarrak', 'yarağ', 'dalyarak', 'pezevenk', 'kahpe', 'şerefsiz', 'serefsiz', 'gavat', 'kaltak',
  'puşt', 'yavşak', 'yavsak', 'götveren', 'gotveren', 'götoş', 'ibne', 'piç', 'gerizekalı', 'gerizekali',
  // İngilizce
  'fuck', 'motherfuck', 'bitch', 'cunt', 'asshole', 'bastard', 'bullshit', 'dickhead', 'nigger', 'nigga', 'faggot', 'whore',
  'slut', 'retard',
];

const LEET: Record<string, string> = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', $: 's' };

/** Kelime: harf, rakam ve kelime içinde harf yerine kullanılan @ $ * işaretleri */
const WORD_RE = /[0-9A-Za-zÇĞİÖŞÜÂÎÛçğıöşüâîûÄËÉÈÁÀÍÓÚÑäëéèáàíóúñ@$*]+/g;

/** Büyük/küçük harf, l33t yazım ve uzatılmış harfler (siiiik) için olası okunuşlar */
function readings(word: string): string[] {
  // Baştaki @ bir etiket (mention) işaretidir; harf yerine sayılmaz
  const w = word.replace(/^@+/, '').replace(/\*/g, '');
  if (!w) return [];
  const forms = new Set([w.toLocaleLowerCase('tr-TR'), w.toLowerCase().replace(/̇/g, '')]);
  return [...forms].map((f) =>
    f
      .replace(/[0-9@$]/g, (c) => LEET[c] ?? c)
      .replace(/(.)\1{2,}/g, '$1'),
  );
}

function isBlockedWord(word: string): boolean {
  return readings(word).some((r) => EXACT.has(r) || PREFIX.some((p) => r.startsWith(p)));
}

/** Metin engelli bir kelime içeriyor mu? */
export function containsBlocked(text: string): boolean {
  return (text.match(WORD_RE) ?? []).some(isBlockedWord);
}

/** Engelli kelimeleri ilk harfi kalacak şekilde yıldızlar (ör. listelerde gösterim için) */
export function mask(text: string): string {
  return text.replace(WORD_RE, (w) => (isBlockedWord(w) ? w[0] + '*'.repeat(Math.max(1, w.length - 1)) : w));
}
