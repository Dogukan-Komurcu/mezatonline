/**
 * Misafir modu ve giriş kapısı.
 *
 * Uygulama kayıt istemeden açılır; misafir gezinebilir ve canlı yayın izleyebilir.
 * Hesap gerektiren bir işlemde (teklif, satın alma, takip, sohbet…) `requireAuth` çağrılır:
 *
 *   requireAuth(() => engine.placeBid(), { reason: AUTH_REASONS.bid });
 *
 * Kullanıcı zaten giriş yapmışsa callback hemen çalışır. Değilse kayıt/giriş ekranı
 * modal olarak açılır; akış bitince kullanıcı kaldığı ekrana döner ve callback çalışır.
 */
import { router } from 'expo-router';
import { create } from 'zustand';

import { useAuthStore } from '@/store/auth';

import { resetAccountData } from './reset';

/** Giriş penceresinde gösterilen hazır gerekçeler */
export const AUTH_REASONS = {
  bid: 'Teklif vermek için giriş yap',
  buy: 'Satın almak için giriş yap',
  offer: 'Fiyat önermek için giriş yap',
  follow: 'Takip etmek için giriş yap',
  chat: 'Sohbete katılmak için giriş yap',
  giveaway: 'Çekilişe katılmak için giriş yap',
  tip: 'Bahşiş göndermek için giriş yap',
  save: 'Kaydetmek için giriş yap',
  remind: 'Hatırlatıcı kurmak için giriş yap',
  message: 'Mesaj göndermek için giriş yap',
  react: 'Tepki göndermek için giriş yap',
  sell: 'Satış yapmak için giriş yap',
  activity: 'Siparişlerini görmek için giriş yap',
  account: 'Hesabını yönetmek için giriş yap',
  inbox: 'Mesajlarını görmek için giriş yap',
  notifications: 'Bildirimlerini görmek için giriş yap',
  rewards: 'Ödüllerini görmek için giriş yap',
  report: 'Şikayet etmek için giriş yap',
  block: 'Engellemek için giriş yap',
  boost: 'Satıcıyı desteklemek için giriş yap',
  support: 'Destek ekibine yazmak için giriş yap',
  generic: 'Devam etmek için giriş yap veya kaydol',
} as const;

/** Kayıt/giriş ekranlarının yolları (dönüş adresi olarak saklanmaz) */
const AUTH_PATHS = ['/welcome', '/phone', '/verify', '/email', '/login', '/username', '/gender', '/interests', '/follow-sellers', '/notify-permission'];

/** Bekleyen işlem en fazla bu kadar süre saklanır */
const PENDING_TTL_MS = 15 * 60_000;

type GateState = {
  /** Giriş tamamlanınca çalışacak işlem */
  pending?: () => void;
  pendingAt?: number;
  /** Kayıt penceresinde gösterilecek gerekçe */
  reason?: string;
  /** Kayıt bitince dönülecek ekran */
  returnTo?: string;
  /** Kullanıcının şu an bulunduğu (kayıt ekranı olmayan) yol */
  currentPath: string;
  /** Kayıt/giriş ekranlarından biri açık mı */
  onAuthScreen: boolean;
  /** Kayıt penceresinin en son açıldığı an (çift dokunuşta ikinci pencereyi engeller) */
  openedAt?: number;
};

export const useAuthGate = create<GateState>(() => ({ currentPath: '/', onAuthScreen: false }));

// Çıkışta hesaba bağlı veriler misafire ve sonraki hesaba kalmasın
useAuthStore.subscribe((s, prev) => {
  if (prev.status === 'signedIn' && s.status === 'signedOut') resetAccountData();
});

/** Kayıt akışı tamamlanmış, tam yetkili kullanıcı mı */
export function isSignedIn(): boolean {
  const { status, onboarded } = useAuthStore.getState();
  return status === 'signedIn' && onboarded;
}

/** Misafir mi (giriş yapmamış ya da kaydı yarım) */
export function useIsGuest(): boolean {
  return useAuthStore((s) => !(s.status === 'signedIn' && s.onboarded));
}

/** Kök layout her yol değişiminde çağırır: dönüş adresini takip eder */
export function trackPath(pathname: string) {
  const onAuthScreen = AUTH_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const state = useAuthGate.getState();
  if (onAuthScreen) {
    if (!state.onAuthScreen) useAuthGate.setState({ onAuthScreen: true });
    return;
  }
  if (state.currentPath !== pathname || state.onAuthScreen) useAuthGate.setState({ currentPath: pathname, onAuthScreen: false, ...(state.onAuthScreen ? { openedAt: undefined } : null) });
}

/**
 * Giriş gerektiren işlem. Giriş yapılmışsa `onReady` hemen çalışır ve true döner.
 * Misafirse kayıt/giriş ekranı açılır, false döner.
 */
export function requireAuth(onReady?: () => void, opts: { reason?: string } = {}): boolean {
  if (isSignedIn()) {
    onReady?.();
    return true;
  }
  const { currentPath, onAuthScreen, openedAt, returnTo } = useAuthGate.getState();
  // Kayıt akışının içinden gelen çağrı, kullanıcının asıl bekleyen işlemini ezmesin
  if (onAuthScreen) return false;
  const now = Date.now();
  // Kayıt penceresi az önce açıldı (çift dokunuş): ikinci bir pencere açma, yalnızca bekleyen işlemi güncelle
  if (openedAt && now - openedAt < 1500) {
    useAuthGate.setState({ pending: onReady, pendingAt: now, reason: opts.reason ?? AUTH_REASONS.generic, returnTo: returnTo ?? currentPath });
    return false;
  }
  useAuthGate.setState({ pending: onReady, pendingAt: now, reason: opts.reason ?? AUTH_REASONS.generic, returnTo: currentPath, openedAt: now });
  router.push('/(auth)/welcome');
  return false;
}

/** Kayıt/giriş tamamlandı: kullanıcıyı kaldığı ekrana döndür, bekleyen işlemi sürdür */
export function completeAuthGate() {
  const { pending, pendingAt, returnTo, currentPath } = useAuthGate.getState();
  useAuthGate.setState({ pending: undefined, pendingAt: undefined, reason: undefined, returnTo: undefined, openedAt: undefined });
  // Tekrar çağrılırsa (returnTo temizlenmiş) kullanıcının bulunduğu ekranda kal
  const target = returnTo ?? currentPath;
  setTimeout(() => {
    try {
      router.dismissTo(target as never);
    } catch {
      router.replace('/');
    }
    if (pending && pendingAt && Date.now() - pendingAt < PENDING_TTL_MS) {
      setTimeout(() => pending(), 650);
    }
  }, 120);
}

/** Kayıt ekranı kapatıldı (X): yarım kaydı geri al, kullanıcıyı geldiği yere bırak */
export function cancelAuthGate() {
  const auth = useAuthStore.getState();
  if (auth.status === 'signedIn' && !auth.onboarded) auth.signOut();
  const { returnTo, currentPath } = useAuthGate.getState();
  useAuthGate.setState({ pending: undefined, pendingAt: undefined, reason: undefined, returnTo: undefined, openedAt: undefined });
  try {
    router.dismissTo((returnTo ?? currentPath) as never);
  } catch {
    router.replace('/');
  }
}
