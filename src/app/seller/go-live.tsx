import { StatusBar } from 'expo-status-bar';

import { GoLiveScreen } from '@/features/seller-live/GoLive';
import { ForceScheme } from '@/theme';

/** S85 — Canlıya Geç (yayın öncesi kamera önizlemesi ve hazırlık; her zaman koyu) */
export default function GoLiveRoute() {
  return (
    <ForceScheme scheme="dark">
      <StatusBar style="light" />
      <GoLiveScreen />
    </ForceScheme>
  );
}
