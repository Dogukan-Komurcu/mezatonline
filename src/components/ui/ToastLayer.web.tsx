import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

/** Web'de RN Modal'ları body'ye z-index 9999 ile eklenir; bildirim uygulama kökünde kalırsa arkalarında görünür */
export function ToastLayer({ children }: { children: ReactNode }) {
  return createPortal(<div style={{ position: 'fixed', inset: 0, zIndex: 10000, pointerEvents: 'none' }}>{children}</div>, document.body);
}
