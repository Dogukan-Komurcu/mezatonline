/**
 * Tohumlu (deterministik) rastgele sayı üreteci — mock veriler her açılışta aynı kalsın diye.
 * Canlı simülasyon gibi gerçek rastlantısallık gereken yerlerde `Math.random` kullanılır.
 */

export type Rng = {
  next: () => number;
  int: (min: number, max: number) => number;
  float: (min: number, max: number) => number;
  pick: <T>(arr: readonly T[]) => T;
  pickMany: <T>(arr: readonly T[], n: number) => T[];
  chance: (p: number) => boolean;
  shuffle: <T>(arr: readonly T[]) => T[];
};

export function createRng(seed: number): Rng {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (min: number, max: number) => Math.floor(next() * (max - min + 1)) + min;
  const float = (min: number, max: number) => next() * (max - min) + min;
  const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(next() * arr.length)];
  const shuffle = <T,>(arr: readonly T[]): T[] => {
    const out = arr.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(next() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  };
  const pickMany = <T,>(arr: readonly T[], n: number): T[] => shuffle(arr).slice(0, Math.min(n, arr.length));
  const chance = (p: number) => next() < p;
  return { next, int, float, pick, pickMany, chance, shuffle };
}

/** Gerçek rastgele (Math.random) ile aynı API */
export const random: Rng = {
  next: Math.random,
  int: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min,
  float: (min, max) => Math.random() * (max - min) + min,
  pick: (arr) => arr[Math.floor(Math.random() * arr.length)],
  pickMany: (arr, n) => {
    const out = arr.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out.slice(0, Math.min(n, out.length));
  },
  chance: (p) => Math.random() < p,
  shuffle: (arr) => {
    const out = arr.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  },
};

let idCounter = 0;
/** Basit benzersiz id */
export function uid(prefix = 'id'): string {
  idCounter = (idCounter + 1) % 1_000_000;
  return `${prefix}_${Date.now().toString(36)}${idCounter.toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
}
