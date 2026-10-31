import { useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';

import { useIsGuest } from '@/features/auth/gate';
import { ApplicationPending } from '@/features/seller/ApplicationPending';
import { SellerHub } from '@/features/seller/SellerHub';
import { SellLanding } from '@/features/seller/SellLanding';
import { seedSellerQa } from '@/features/seller/qaSeed';
import { useSellerExtrasHydrated } from '@/features/seller/store';
import { useAuthStore, useMe } from '@/store/auth';
import { useSellerStore } from '@/store/seller';

/**
 * "Sat" sekmesi: satıcı değilse tanıtım (S80), başvuru inceleniyorsa durum kartı,
 * satıcıysa Satıcı Paneli (S81). Misafir her zaman tanıtımı görür.
 */
export default function SellTab() {
  const me = useMe();
  const guest = useIsGuest();
  const status = useSellerStore((s) => s.application.status);
  const isSeller = !guest && (me.isSeller || status === 'approved');
  const hydrated = useSellerExtrasHydrated();
  const { qa } = useLocalSearchParams<{ qa?: string }>();

  // Yalnızca geliştirme: /sell?qa=seed → örnek ilan + planlı yayın
  useEffect(() => {
    if (__DEV__ && qa === 'seed' && hydrated && isSeller) seedSellerQa();
  }, [qa, hydrated, isSeller]);

  // Başvuru onaylı ama kullanıcı rolü güncellenmemişse eşitle
  useEffect(() => {
    if (!guest && status === 'approved' && !me.isSeller) useAuthStore.getState().becomeSeller();
  }, [guest, status, me.isSeller]);

  if (!hydrated) return null;
  if (guest) return <SellLanding />;
  // Yalnızca geliştirme: /sell?qa=landing | pending → satıcı olsa da tanıtım / inceleme ekranını göster
  if (__DEV__ && qa === 'landing') return <SellLanding />;
  if (__DEV__ && qa === 'pending') return <ApplicationPending />;
  if (isSeller) return <SellerHub />;
  if (status === 'pending') return <ApplicationPending />;
  return <SellLanding />;
}
