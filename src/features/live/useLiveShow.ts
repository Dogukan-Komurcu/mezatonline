import { useEffect, useRef, useState, useSyncExternalStore } from 'react';

import type { Product, Show, User } from '@/types';

import { LiveEngine, type LiveEvents, type LiveSnapshot } from './engine';

export type UseLiveShowOptions = {
  show: Show;
  seller: User;
  products: Product[];
  me: Pick<User, 'id' | 'username' | 'avatar'>;
  mode?: 'viewer' | 'seller';
  /** false iken simülasyon duraklatılır (ör. dikey kaydırmada görünmeyen sayfa) */
  active?: boolean;
  events?: LiveEvents;
  isFollowing?: () => boolean;
};

/**
 * Bir canlı yayının simülasyonunu başlatır ve anlık durumunu döner.
 *
 * ```tsx
 * const { state, engine } = useLiveShow({ show, seller, products, me, active: isFocused,
 *   events: { onWon: (lot) => createOrder(...), onOutbid: () => haptics() } });
 * engine.placeBid();            // hızlı teklif
 * engine.setMaxBid(500);        // özel / maksimum teklif
 * engine.enterGiveaway();
 * engine.sendMessage('selam');
 * ```
 */
export function useLiveShow(opts: UseLiveShowOptions): { state: LiveSnapshot; engine: LiveEngine } {
  const { show, seller, products, me, mode = 'viewer', active = true, events, isFollowing } = opts;
  // Motor, yayın id'si başına bir kez oluşturulur
  const [engine] = useState(
    () => new LiveEngine({ show, seller, products, me, mode, events, isFollowing }),
  );

  // Son olay callback'lerini motora ilet (stale closure olmasın)
  const eventsRef = useRef(events);
  useEffect(() => {
    eventsRef.current = events;
    engine.updateEvents({
      onOutbid: (l) => eventsRef.current?.onOutbid?.(l),
      onWon: (l) => eventsRef.current?.onWon?.(l),
      onLost: (l) => eventsRef.current?.onLost?.(l),
      onGiveawayWon: (g) => eventsRef.current?.onGiveawayWon?.(g),
      onSold: (i) => eventsRef.current?.onSold?.(i),
      onEnded: (r) => eventsRef.current?.onEnded?.(r),
    });
  }, [engine, events]);

  useEffect(() => {
    if (active) engine.start();
    else engine.stop();
    return () => engine.stop();
  }, [engine, active]);

  const state = useSyncExternalStore(engine.subscribe, engine.getSnapshot, engine.getSnapshot);
  return { state, engine };
}

/** Saniye cinsinden kalan süre; her 250ms'de güncellenir */
export function useRemaining(endsAt: number | undefined): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!endsAt) return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [endsAt]);
  if (!endsAt) return 0;
  return Math.max(0, (endsAt - now) / 1000);
}
