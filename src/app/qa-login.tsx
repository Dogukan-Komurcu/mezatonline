import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { qaSignIn } from '@/lib/qa';
import { darkColors } from '@/theme';

/**
 * Yalnızca geliştirme: demo kullanıcıyla anında giriş (QA ekran görüntüleri için).
 * mezatonline:///qa-login?next=/product/p12&seller=1
 */
export default function QaLogin() {
  const { next, seller } = useLocalSearchParams<{ next?: string; seller?: string }>();
  useEffect(() => {
    if (!__DEV__) {
      router.replace('/');
      return;
    }
    qaSignIn({ seller: seller === '1' });
    const t = setTimeout(() => router.replace((next as never) ?? '/'), 300);
    return () => clearTimeout(t);
  }, [next, seller]);
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: darkColors.bg }}>
      <ActivityIndicator color={darkColors.primary} />
    </View>
  );
}
