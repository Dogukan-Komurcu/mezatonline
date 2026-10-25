/**
 * Ön teklif durumlarını Aktivite › Ön Tekliflerim ile senkron tutar.
 * (orders store'da durum güncelleme eylemi olmadığı için zustand setState ile yapılır.)
 */
import { useOrdersStore, type PreBidStatus } from '@/store/orders';

export function markPreBid(productId: string, status: PreBidStatus) {
  const { preBids } = useOrdersStore.getState();
  if (!preBids.some((b) => b.productId === productId)) return;
  useOrdersStore.setState({ preBids: preBids.map((b) => (b.productId === productId ? { ...b, status } : b)) });
}
