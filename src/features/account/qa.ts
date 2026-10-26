/**
 * Yalnızca geliştirme (QA ekran görüntüleri): rota parametreleriyle başlangıç durumu.
 *   ?qaScroll=600 → kaydırma görünümünün başlangıç ofseti
 *   ?qa=<durum>   → ekranın kendi tanımladığı bir sayfa/durumu açar
 * Üretimde (__DEV__ = false) her zaman boş döner.
 */
import { useLocalSearchParams } from 'expo-router';

export function useQaParams(): { offset?: { x: number; y: number }; qa?: string } {
  const p = useLocalSearchParams<{ qaScroll?: string; qa?: string }>();
  if (!__DEV__) return {};
  const y = Number(p.qaScroll);
  return { offset: y > 0 ? { x: 0, y } : undefined, qa: p.qa };
}
