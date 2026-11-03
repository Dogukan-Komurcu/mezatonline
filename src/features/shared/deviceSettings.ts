import { Linking, Platform } from 'react-native';

import { toast } from '@/components/ui';

/** Cihazın uygulama ayarlarını açar. Web'de böyle bir sayfa yok (Linking.openSettings tanımsız): izin tarayıcıdan yönetilir. */
export function openDeviceSettings(): Promise<void> {
  if (Platform.OS === 'web') {
    toast('Bu izni tarayıcının site ayarlarından değiştirebilirsin', 'information-circle');
    return Promise.resolve();
  }
  return Linking.openSettings();
}
