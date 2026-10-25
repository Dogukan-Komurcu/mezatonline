import { router } from 'expo-router';

import { toast } from '@/components/ui';
import { CATEGORIES_BY_POPULARITY, getUserByUsername } from '@/data';
import { useAuthStore, type AuthMethod } from '@/store/auth';
import { useSocialStore } from '@/store/social';
import type { ID } from '@/types';

import { useAuthFlow, type AuthProvider, type Gender } from './store';

// ─── Kullanıcı adı kuralları ─────────────────────────────────────────────────

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 30;

/** Platform tarafından ayrılmış adlar */
const RESERVED = new Set([
  'admin', 'yonetici', 'mezat', 'mezatonline', 'destek', 'yardim', 'support', 'help', 'moderator', 'resmi', 'official', 'satici', 'alici', 'root', 'sistem', 'system',
]);

const TR_MAP: Record<string, string> = { ı: 'i', İ: 'i', ş: 's', Ş: 's', ğ: 'g', Ğ: 'g', ü: 'u', Ü: 'u', ö: 'o', Ö: 'o', ç: 'c', Ç: 'c', â: 'a', î: 'i', û: 'u' };

/** Yazarken: Türkçe harfleri sadeleştir ve küçült (geçersiz karakterler hata göstersin diye korunur) */
export function normalizeUsernameInput(text: string): string {
  return text
    .replace(/[ıİşŞğĞüÜöÖçÇâîû]/g, (ch) => TR_MAP[ch] ?? ch)
    .toLowerCase()
    .slice(0, USERNAME_MAX);
}

/** Serbest metinden geçerli bir kullanıcı adı kökü üret */
export function slugifyUsername(text: string): string {
  return normalizeUsernameInput(text.split('@')[0] ?? '')
    .replace(/[\s.-]+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, USERNAME_MAX - 4);
}

/** Biçim hatası (yoksa undefined) */
export function usernameFormatError(name: string): string | undefined {
  if (!name) return undefined;
  if (/\s/.test(name)) return 'Kullanıcı adında boşluk kullanamazsın.';
  if (/[^a-z0-9_]/.test(name)) return 'Sadece küçük harf, rakam ve alt çizgi (_) kullanabilirsin.';
  if (name.length < USERNAME_MIN) return `En az ${USERNAME_MIN} karakter olmalı.`;
  if (name.length > USERNAME_MAX) return `En fazla ${USERNAME_MAX} karakter olabilir.`;
  if (/^_|_$/.test(name)) return 'Alt çizgi ile başlayamaz veya bitemez.';
  if (/^\d+$/.test(name)) return 'Sadece rakamlardan oluşamaz.';
  return undefined;
}

/** Mock müsaitlik kontrolü: veri setindeki kullanıcılar + ayrılmış adlar */
export function isUsernameAvailable(name: string): boolean {
  if (RESERVED.has(name)) return false;
  return !getUserByUsername(name);
}

/** Alınmamış bir kullanıcı adı bul (kök + sonek) */
export function uniqueUsername(base: string): string {
  const root = slugifyUsername(base) || 'koleksiyoncu';
  const safeRoot = root.length < USERNAME_MIN ? `${root}_tr` : root;
  if (!usernameFormatError(safeRoot) && isUsernameAvailable(safeRoot)) return safeRoot;
  for (let i = 0; i < 50; i++) {
    const candidate = `${safeRoot}_${Math.floor(10 + Math.random() * 990)}`.slice(0, USERNAME_MAX);
    if (!usernameFormatError(candidate) && isUsernameAvailable(candidate)) return candidate;
  }
  return `${safeRoot}_${Date.now() % 100000}`.slice(0, USERNAME_MAX);
}

const SUGGESTION_SUFFIXES = ['_tr', '_koleksiyon', '34', '_mezat', '_06', '_35'];
const SUGGESTION_PREFIXES = ['koleksiyoncu', 'mezatsever', 'kartci', 'antikasever', 'firsatavcisi', 'vintagesever'];

/** Kullanıcı adı önerileri (müsait olanlar) */
export function usernameSuggestions(seed: string, salt: number, count = 4): string[] {
  const out: string[] = [];
  const push = (n: string) => {
    const name = n.slice(0, USERNAME_MAX);
    if (!out.includes(name) && !usernameFormatError(name) && isUsernameAvailable(name)) out.push(name);
  };
  const root = slugifyUsername(seed);
  if (root.length >= USERNAME_MIN) {
    push(root);
    SUGGESTION_SUFFIXES.forEach((s, i) => {
      if ((i + salt) % 2 === 0 || out.length < 2) push(`${root}${s}`);
    });
    push(`${root}_${(salt % 900) + 100}`);
  }
  let i = 0;
  while (out.length < count && i < 20) {
    push(`${SUGGESTION_PREFIXES[(salt + i) % SUGGESTION_PREFIXES.length]}_${((salt * 7 + i * 31) % 900) + 100}`);
    i++;
  }
  return out.slice(0, count);
}

// ─── Oturum ──────────────────────────────────────────────────────────────────

/** Mezatonline'ın AuthMethod tipi Facebook'u içermiyor; kalıcı store'a yine de gerçek sağlayıcıyı yazıyoruz. */
function toAuthMethod(provider: AuthProvider): AuthMethod {
  return provider as unknown as AuthMethod;
}

/** Kayıt akışını başlat: sahte doğrulama sonrası hesap açılır (onboarding henüz bitmedi) */
export function startSignup(provider: AuthProvider, identifier?: string) {
  useAuthFlow.getState().reset();
  useAuthFlow.getState().setProvider(provider, provider === 'email' ? identifier : undefined);
  if (provider === 'phone' && identifier) useAuthFlow.getState().setPhone(identifier);
  useAuthStore.getState().signIn(toAuthMethod(provider), identifier);
}

/** Sosyal / e-posta kaydında doğrulanan telefonu hesaba ekle */
export function attachPhone(phone: string) {
  useAuthFlow.getState().setPhone(phone);
  useAuthStore.setState({ phone });
}

/** Kayıttan vazgeç: oturumu kapat ve karşılama ekranına dön */
export function cancelSignup() {
  useAuthStore.getState().signOut();
  useAuthFlow.getState().reset();
  router.dismissTo('/(auth)/welcome');
}

/** Cinsiyete göre önerilen ilgi alanları ("Benim için seç") */
export function suggestedInterests(gender: Gender | undefined): ID[] {
  if (gender === 'female') return ['womens_fashion', 'beauty', 'jewelry', 'bags'];
  if (gender === 'male') return ['sneakers', 'sports_cards', 'watches', 'video_games'];
  return ['tcg', 'toys', 'sneakers', 'coins'];
}

const DEFAULT_INTERESTS: ID[] = CATEGORIES_BY_POPULARITY.slice(0, 4).map((c) => c.id);

function goHomeSoon() {
  // Kök layout'taki Stack.Protected koruması sekmelere kendiliğinden geçer; yine de ana sayfaya sabitle.
  setTimeout(() => {
    try {
      router.replace('/');
    } catch {
      // Koruma zaten yönlendirdi
    }
  }, 80);
}

/** Kayıt akışını tamamla → ana sayfa */
export function finishOnboarding() {
  const flow = useAuthFlow.getState();
  const auth = useAuthStore.getState();
  const username = flow.username || uniqueUsername(flow.email ?? 'koleksiyoncu');
  const interests = flow.interests.length ? flow.interests : auth.interests.length ? auth.interests : DEFAULT_INTERESTS;
  const social = useSocialStore.getState();
  flow.interests.forEach((id) => {
    if (!social.followedCategoryIds.includes(id)) social.toggleFollowCategory(id);
  });
  auth.completeOnboarding({ username, displayName: flow.displayName.trim() || undefined, interests });
  flow.reset();
  toast.success(`Hoş geldin @${username}! 🎉`, 'sparkles');
  goHomeSoon();
}

/** Mevcut hesapla giriş: onboarding atlanır */
export function loginAndFinish(provider: AuthProvider, identifier?: string, usernameHint?: string) {
  const auth = useAuthStore.getState();
  auth.signIn(toAuthMethod(provider), identifier);
  const base = usernameHint ?? (provider === 'email' && identifier ? identifier : `koleksiyoncu_${Math.floor(100 + Math.random() * 900)}`);
  const hinted = slugifyUsername(base);
  const username = hinted.length >= USERNAME_MIN && !usernameFormatError(hinted) && isUsernameAvailable(hinted) ? hinted : uniqueUsername(base);
  const interests = auth.interests.length ? auth.interests : DEFAULT_INTERESTS;
  auth.completeOnboarding({ username, interests });
  useAuthFlow.getState().reset();
  toast.success(`Tekrar hoş geldin @${username}!`, 'hand-right');
  goHomeSoon();
}
