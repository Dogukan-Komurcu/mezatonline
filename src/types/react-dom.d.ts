/** Yalnızca `.web.tsx` dosyaları kullanır; projede @types/react-dom yok */
declare module 'react-dom' {
  import type { ReactNode, ReactPortal } from 'react';

  export function createPortal(children: ReactNode, container: Element | DocumentFragment): ReactPortal;
}
