import { DarkTheme, DefaultTheme, router, Stack, ThemeProvider, usePathname } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { AppState, LogBox } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ToastHost } from '@/components/ui';
import { trackPath } from '@/features/auth/gate';
import { TransactSetupHost } from '@/features/wallet/TransactSetup';
import { useHomeStore } from '@/features/home/store';
import { applyQaTheme, qaSignIn, readQaLaunch } from '@/lib/qa';
import { useAuthStore } from '@/store/auth';
import { useInboxStore } from '@/store/inbox';
import { useOrdersStore } from '@/store/orders';
import { useRewardsStore } from '@/store/rewards';
import { useSellerStore } from '@/store/seller';
import { useSettingsStore } from '@/store/settings';
import { useSocialStore } from '@/store/social';
import { useWalletStore } from '@/store/wallet';
import { darkColors, lightColors, liveColors, useTheme } from '@/theme';

export const unstable_settings = { anchor: '(tabs)' };

SplashScreen.preventAutoHideAsync().catch(() => {});

const PERSISTED = [useAuthStore, useSettingsStore, useSocialStore, useWalletStore, useOrdersStore, useInboxStore, useSellerStore, useRewardsStore];
const SHARE_PREVIEW = process.env.EXPO_PUBLIC_SHARE_PREVIEW === '1';

/** Giriş kapısı için kullanıcının bulunduğu ekranı takip eder (kayıt bitince oraya dönülür) */
function PathTracker() {
  const pathname = usePathname();
  useEffect(() => {
    trackPath(pathname);
  }, [pathname]);
  return null;
}

/** Tüm kalıcı store'lar AsyncStorage'dan yüklendi mi */
function useHydrated() {
  const [hydrated, setHydrated] = useState(() => PERSISTED.every((s) => s.persist.hasHydrated()));
  useEffect(() => {
    if (hydrated) return;
    const check = () => {
      if (PERSISTED.every((s) => s.persist.hasHydrated())) setHydrated(true);
    };
    const unsubs = PERSISTED.map((s) => s.persist.onFinishHydration(check));
    check();
    return () => unsubs.forEach((u) => u());
  }, [hydrated]);
  return hydrated;
}

export default function RootLayout() {
  const hydrated = useHydrated();
  const [previewReady, setPreviewReady] = useState(!SHARE_PREVIEW);
  const { isDark, colors } = useTheme();
  const status = useAuthStore((s) => s.status);
  const onboarded = useAuthStore((s) => s.onboarded);
  const signedIn = status === 'signedIn' && onboarded;

  useEffect(() => {
    if (!SHARE_PREVIEW || !hydrated) return;
    const prepare = () => {
      setPreviewReady(true);
    };
    const unsubscribe = useHomeStore.persist.onFinishHydration(prepare);
    if (useHomeStore.persist.hasHydrated()) prepare();
    const previewWindow = window as typeof window & {
      __mezatPreviewReset?: () => void;
    };
    previewWindow.__mezatPreviewReset = () => {
      try {
        Object.keys(localStorage).filter((key) => key.startsWith('mezat:')).forEach((key) => localStorage.removeItem(key));
      } catch { /* Private browsing may disable persistent storage. */ }
    };
    return () => {
      unsubscribe();
      delete previewWindow.__mezatPreviewReset;
    };
  }, [hydrated]);

  useEffect(() => {
    if (hydrated) SplashScreen.hideAsync().catch(() => {});
  }, [hydrated]);

  // Geliştirme: başlatma argümanlarıyla QA (bkz. src/lib/qa.ts)
  useEffect(() => {
    if (!hydrated) return;
    const qa = readQaLaunch();
    if (!qa) return;
    LogBox.ignoreAllLogs(true);
    applyQaTheme(qa.theme);
    if (qa.guest) useAuthStore.getState().signOut();
    else if (qa.login || qa.seller) qaSignIn({ seller: qa.seller });
    if (qa.route) {
      const t = setTimeout(() => router.navigate(qa.route as never), 600);
      return () => clearTimeout(t);
    }
  }, [hydrated]);

  // Sipariş durumlarını zamanla ilerlet (kargo simülasyonu)
  useEffect(() => {
    if (!hydrated) return;
    const advance = () => {
      useOrdersStore.getState().advanceOrders();
      useSellerStore.getState().advanceShipments();
    };
    advance();
    const t = setInterval(advance, 30_000);
    const sub = AppState.addEventListener('change', (st) => {
      if (st === 'active') advance();
    });
    return () => {
      clearInterval(t);
      sub.remove();
    };
  }, [hydrated]);

  if (!hydrated || !previewReady) return null;

  const navTheme = isDark
    ? { ...DarkTheme, colors: { ...DarkTheme.colors, background: darkColors.bg, card: darkColors.bg, primary: darkColors.primary, text: darkColors.text, border: darkColors.border } }
    : { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: lightColors.bg, card: lightColors.bg, primary: lightColors.text, text: lightColors.text, border: lightColors.border } };

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaProvider>
        <ThemeProvider value={navTheme}>
          <StatusBar style={isDark ? 'light' : 'dark'} />
          <PathTracker />
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
            {/* Herkese açık: misafir de gezinir, canlı yayın izler */}
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="live/[id]" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom', contentStyle: { backgroundColor: liveColors.panel } }} />
            <Stack.Screen name="search" options={{ animation: 'fade' }} />
            {/* Kayıt / giriş: giriş gerektiren bir işlemde tam ekran açılır, bitince kullanıcı kaldığı yere döner */}
            <Stack.Screen name="(auth)" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom', contentStyle: { backgroundColor: darkColors.bg } }} />
            {/* Yalnızca hesabı olanlar */}
            <Stack.Protected guard={signedIn} redirectTo="/">
              <Stack.Screen name="checkout/[id]" options={{ presentation: 'modal' }} />
              <Stack.Screen name="review/[orderId]" options={{ presentation: 'modal' }} />
              <Stack.Screen name="orders/[id]" />
              <Stack.Screen name="inbox/index" />
              <Stack.Screen name="inbox/[id]" />
              <Stack.Screen name="notifications" />
              <Stack.Screen name="rewards" />
              <Stack.Screen name="wallet" />
              <Stack.Screen name="settings/profile" />
              <Stack.Screen name="settings/payments" />
              <Stack.Screen name="settings/addresses" />
              <Stack.Screen name="settings/notifications" />
              <Stack.Screen name="settings/account-controls" />
              <Stack.Screen name="settings/verified" />
              <Stack.Screen name="settings/add-card" options={{ presentation: 'modal' }} />
              <Stack.Screen name="settings/address" options={{ presentation: 'modal' }} />
              <Stack.Screen name="seller/apply" options={{ presentation: 'modal' }} />
              <Stack.Screen name="seller/listing" options={{ presentation: 'modal' }} />
              <Stack.Screen name="seller/schedule" options={{ presentation: 'modal' }} />
              <Stack.Screen name="seller/inventory" />
              <Stack.Screen name="seller/shows" />
              <Stack.Screen name="seller/orders" />
              <Stack.Screen name="seller/order/[id]" />
              <Stack.Screen name="seller/payouts" />
              <Stack.Screen name="seller/analytics" />
              <Stack.Screen name="seller/live/[id]" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom', gestureEnabled: false, contentStyle: { backgroundColor: liveColors.panel } }} />
              <Stack.Screen name="seller/go-live" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom', contentStyle: { backgroundColor: liveColors.panel } }} />
            </Stack.Protected>
          </Stack>
          <TransactSetupHost />
          <ToastHost />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
