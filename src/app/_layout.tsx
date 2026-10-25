import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ToastHost } from '@/components/ui';
import { TransactSetupHost } from '@/features/wallet/TransactSetup';
import { useAuthStore } from '@/store/auth';
import { useInboxStore } from '@/store/inbox';
import { useOrdersStore } from '@/store/orders';
import { useRewardsStore } from '@/store/rewards';
import { useSellerStore } from '@/store/seller';
import { useSettingsStore } from '@/store/settings';
import { useSocialStore } from '@/store/social';
import { useWalletStore } from '@/store/wallet';
import { darkColors, lightColors, useTheme } from '@/theme';

export const unstable_settings = { anchor: '(tabs)' };

SplashScreen.preventAutoHideAsync().catch(() => {});

const PERSISTED = [useAuthStore, useSettingsStore, useSocialStore, useWalletStore, useOrdersStore, useInboxStore, useSellerStore, useRewardsStore];

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
  const { isDark, colors } = useTheme();
  const status = useAuthStore((s) => s.status);
  const onboarded = useAuthStore((s) => s.onboarded);
  const signedIn = status === 'signedIn' && onboarded;

  useEffect(() => {
    if (hydrated) SplashScreen.hideAsync().catch(() => {});
  }, [hydrated]);

  // Sipariş durumlarını zamanla ilerlet (kargo simülasyonu)
  useEffect(() => {
    if (!hydrated) return;
    useOrdersStore.getState().advanceOrders();
    const t = setInterval(() => useOrdersStore.getState().advanceOrders(), 30_000);
    const sub = AppState.addEventListener('change', (st) => {
      if (st === 'active') useOrdersStore.getState().advanceOrders();
    });
    return () => {
      clearInterval(t);
      sub.remove();
    };
  }, [hydrated]);

  if (!hydrated) return null;

  const navTheme = isDark
    ? { ...DarkTheme, colors: { ...DarkTheme.colors, background: darkColors.bg, card: darkColors.bg, primary: darkColors.primary, text: darkColors.text, border: darkColors.border } }
    : { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: lightColors.bg, card: lightColors.bg, primary: lightColors.text, text: lightColors.text, border: lightColors.border } };

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaProvider>
        <ThemeProvider value={navTheme}>
          <StatusBar style={isDark ? 'light' : 'dark'} />
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
            <Stack.Protected guard={signedIn} redirectTo="/welcome">
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="live/[id]" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom', contentStyle: { backgroundColor: '#000' } }} />
              <Stack.Screen name="seller/live/[id]" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom', gestureEnabled: false, contentStyle: { backgroundColor: '#000' } }} />
              <Stack.Screen name="seller/go-live" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom', contentStyle: { backgroundColor: '#000' } }} />
              <Stack.Screen name="search" options={{ animation: 'fade' }} />
              <Stack.Screen name="checkout/[id]" options={{ presentation: 'modal' }} />
              <Stack.Screen name="review/[orderId]" options={{ presentation: 'modal' }} />
              <Stack.Screen name="settings/add-card" options={{ presentation: 'modal' }} />
              <Stack.Screen name="settings/address" options={{ presentation: 'modal' }} />
              <Stack.Screen name="seller/listing" options={{ presentation: 'modal' }} />
              <Stack.Screen name="seller/schedule" options={{ presentation: 'modal' }} />
              <Stack.Screen name="seller/apply" options={{ presentation: 'modal' }} />
            </Stack.Protected>
            <Stack.Protected guard={!signedIn} redirectTo="/">
              <Stack.Screen name="(auth)" />
            </Stack.Protected>
          </Stack>
          <TransactSetupHost />
          <ToastHost />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
