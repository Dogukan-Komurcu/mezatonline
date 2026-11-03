import type { ReactNode } from 'react';
import { Platform } from 'react-native';
import { FullWindowOverlay } from 'react-native-screens';

/** iOS: tam ekran modal ve sheet'lerin (RN Modal) üstünde görünsün diye ayrı pencerede çiz */
export function ToastLayer({ children }: { children: ReactNode }) {
  return Platform.OS === 'ios' ? <FullWindowOverlay>{children}</FullWindowOverlay> : children;
}
