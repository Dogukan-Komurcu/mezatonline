/**
 * Yalnızca geliştirme: otomatik QA / ekran görüntüsü için yardımcılar.
 *
 * iOS simülatörde uygulamayı başlatma argümanlarıyla açmak:
 *   xcrun simctl launch <udid> com.mezatonline.app -qaLogin 1 -qaRoute /product/p12 [-qaSeller 1] [-qaTheme dark]
 *   xcrun simctl launch <udid> com.mezatonline.app -qaGuest 1   (oturumu kapatıp misafir olarak açar)
 * Argümanlar NSUserDefaults'a düşer; RN `Settings` modülüyle okunur.
 */
import { Platform, Settings } from 'react-native';

import { useAuthStore } from '@/store/auth';
import { useSellerStore } from '@/store/seller';
import { useSettingsStore } from '@/store/settings';
import { useWalletStore } from '@/store/wallet';

export type QaLaunch = { route?: string; login: boolean; seller: boolean; guest: boolean; theme?: 'light' | 'dark' };

export function readQaLaunch(): QaLaunch | null {
  if (!__DEV__ || Platform.OS !== 'ios') return null;
  try {
    const route = Settings.get('qaRoute') as string | undefined;
    const login = String(Settings.get('qaLogin') ?? '') === '1';
    const seller = String(Settings.get('qaSeller') ?? '') === '1';
    const guest = String(Settings.get('qaGuest') ?? '') === '1';
    const theme = Settings.get('qaTheme') as 'light' | 'dark' | undefined;
    if (!route && !login && !seller && !guest && !theme) return null;
    return { route, login, seller, guest, theme: theme === 'dark' || theme === 'light' ? theme : undefined };
  } catch {
    return null;
  }
}

/** Demo kullanıcıyla giriş + kayıtlı kart ve adres (teklif/satın alma akışları kilitli olmasın) */
export function qaSignIn(opts: { seller?: boolean } = {}) {
  const auth = useAuthStore.getState();
  if (auth.status !== 'signedIn' || !auth.onboarded) {
    auth.signIn('phone', '5321234567');
    auth.completeOnboarding({ username: 'demo_kullanici', displayName: 'Demo Kullanıcı', interests: ['tcg', 'sneakers', 'coins', 'antiques'] });
    auth.updateProfile({ avatar: 'https://randomuser.me/api/portraits/men/32.jpg', bio: 'Koleksiyoncu, mezat sever 🔨' });
  }
  if (opts.seller) {
    useAuthStore.getState().becomeSeller();
    const seller = useSellerStore.getState();
    if (seller.application.status !== 'approved') {
      seller.submitApplication({ categoryId: 'tcg', storeName: 'Demo Koleksiyon', taxType: 'individual', iban: 'TR120006400000112345678901' });
      seller.approveApplication();
    }
  }
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
}

export function applyQaTheme(theme?: 'light' | 'dark') {
  if (theme) useSettingsStore.getState().setAppearance(theme);
}
