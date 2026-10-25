import { GoLiveScreen } from '@/features/seller-live/GoLive';
import { ForceScheme } from '@/theme';

/** S85 — Canlıya Geç (yayın öncesi kamera önizlemesi ve hazırlık) */
export default function GoLiveRoute() {
  return (
    <ForceScheme scheme="dark">
      <GoLiveScreen />
    </ForceScheme>
  );
}
