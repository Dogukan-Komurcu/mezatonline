import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { useAuthStore } from '@/store/auth';
import { useWalletStore } from '@/store/wallet';

/**
 * Yalnızca geliştirme: demo kullanıcıyla anında giriş (QA ekran görüntüleri için).
 * mezatonline:///qa-login?next=/product/p12
 */
export default function QaLogin() {
  const { next, seller } = useLocalSearchParams<{ next?: string; seller?: string }>();
  useEffect(() => {
    if (!__DEV__) {
      router.replace('/');
      return;
    }
    const auth = useAuthStore.getState();
    if (auth.status !== 'signedIn' || !auth.onboarded) {
      auth.signIn('phone', '5321234567');
      auth.completeOnboarding({ username: 'demo_kullanici', displayName: 'Demo Kullanıcı', interests: ['tcg', 'sneakers', 'coins', 'antiques'] });
      auth.updateProfile({ avatar: 'https://randomuser.me/api/portraits/men/32.jpg', bio: 'Koleksiyoncu, mezat sever 🔨' });
    }
    if (seller === '1') useAuthStore.getState().becomeSeller();
    const wallet = useWalletStore.getState();
    if (!wallet.paymentMethods.length) wallet.addPaymentMethod({ number: '4242424242424242', holder: 'Demo Kullanıcı', expiry: '12/29' });
    if (!wallet.addresses.length) {
      wallet.addAddress({
        title: 'Ev',
        fullName: 'Demo Kullanıcı',
        phone: '5321234567',
        city: 'İstanbul',
        district: 'Kadıköy',
        neighborhood: 'Caferağa Mah.',
        line: 'Moda Cad. No:12 D:4',
        postalCode: '34710',
      });
    }
    const t = setTimeout(() => router.replace((next as never) ?? '/'), 300);
    return () => clearTimeout(t);
  }, [next, seller]);
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#121212' }}>
      <ActivityIndicator color="#FFE414" />
    </View>
  );
}
