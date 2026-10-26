import { StatusBar } from 'expo-status-bar';

import { HostConsoleScreen } from '@/features/seller-live/HostConsole';
import { ForceScheme } from '@/theme';

/** S86 — Satıcı canlı yayın konsolu (her zaman koyu; durum çubuğu açık renk) */
export default function SellerLiveRoute() {
  return (
    <ForceScheme scheme="dark">
      <StatusBar style="light" />
      <HostConsoleScreen />
    </ForceScheme>
  );
}
