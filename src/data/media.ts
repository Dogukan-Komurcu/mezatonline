/**
 * Mock medya havuzu (doğrulanmış, ücretsiz lisanslı uzak görseller/videolar).
 * Kaynak: docs/research/assets.json → src/data/media.json
 */
import raw from './media.json';

export type MediaVideo = { url: string; topic: string; category: string; portrait: boolean; poster?: string; durationSec?: number };

type MediaJson = {
  categories: Record<string, string[]>;
  avatars: string[];
  videos: MediaVideo[];
  banners: string[];
};

const MEDIA = raw as MediaJson;

function fallback(key: string, i: number): string {
  return `https://picsum.photos/seed/${encodeURIComponent(key)}-${i}/600/800`;
}

/** Kategori anahtarına göre görsel listesi (boşsa picsum yedeği) */
export function mediaFor(key: string): string[] {
  const list = MEDIA.categories[key];
  if (list && list.length) return list;
  return Array.from({ length: 12 }, (_, i) => fallback(key, i));
}

export function categoryImage(key: string, index: number): string {
  const list = mediaFor(key);
  return list[index % list.length];
}

export const AVATARS: string[] = MEDIA.avatars.length ? MEDIA.avatars : Array.from({ length: 60 }, (_, i) => `https://i.pravatar.cc/200?img=${(i % 70) + 1}`);

export const VIDEOS = MEDIA.videos;

export const BANNERS: string[] = MEDIA.banners.length ? MEDIA.banners : Array.from({ length: 10 }, (_, i) => fallback('banner', i));

/** Medya kategori anahtarına uyan videolar (yoksa genel canlı satış / kutu açılış videoları) */
export function videosFor(mediaKey: string): MediaVideo[] {
  const exact = VIDEOS.filter((v) => v.category === mediaKey);
  if (exact.length) return exact;
  return VIDEOS.filter((v) => ['live_selling', 'unboxing', 'shopping_app'].includes(v.category));
}
