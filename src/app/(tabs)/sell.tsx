import { useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';

import { ApplicationPending } from '@/features/seller/ApplicationPending';
import { SellerHub } from '@/features/seller/SellerHub';
import { SellLanding } from '@/features/seller/SellLanding';
import { seedSellerQa } from '@/features/seller/qaSeed';
import { useSellerExtrasHydrated } from '@/features/seller/store';
import { useAuthStore, useMe } from '@/store/auth';
import { useSellerStore } from '@/store/seller';

/**
 * "Sat" sekmesi: satıcı değilse tanıtım (S80), başvuru inceleniyorsa durum kartı,
 * satıcıysa Satıcı Paneli (S81).
 */
export default function SellTab() {
  const me = useMe();
  const status = useSellerStore((s) => s.application.status);
  const isSeller = me.isSeller || status === 'approved';
  const hydrated = useSellerExtrasHydrated();
  const { qa } = useLocalSearchParams<{ qa?: string }>();

  // Yalnızca geliştirme: /sell?qa=seed → örnek ilan + planlı yayın
  useEffect(() => {
    if (__DEV__ && qa === 'seed' && hydrated && isSeller) seedSellerQa();
  }, [qa, hydrated, isSeller]);

  // Başvuru onaylı ama kullanıcı rolü güncellenmemişse eşitle
  useEffect(() => {
    if (status === 'approved' && !me.isSeller) useAuthStore.getState().becomeSeller();
  }, [status, me.isSeller]);

  if (!hydrated) return null;
  if (isSeller) return <SellerHub />;
  if (status === 'pending') return <ApplicationPending />;
  return <SellLanding />;
}
