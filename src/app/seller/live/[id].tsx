import { HostConsoleScreen } from '@/features/seller-live/HostConsole';
import { ForceScheme } from '@/theme';

/** S86 — Satıcı canlı yayın konsolu */
export default function SellerLiveRoute() {
  return (
    <ForceScheme scheme="dark">
      <HostConsoleScreen />
    </ForceScheme>
  );
}
