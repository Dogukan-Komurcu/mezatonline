/**
 * Hak sahibi şikâyeti dosyası işlemleri (satıcı tarafı): ilanı kaldır → belgeyle itiraz → yeniden yayın.
 * 6563 md. 9/3 ve ETAHS Yönetmeliği md. 12–14: usulüne uygun şikâyette ilan en geç 48 saat içinde
 * kaldırılır ve satıcıya itiraz yolu bildirilir; itiraz belgelerden açıkça haklı görünüyorsa ilan
 * en geç 24 saat içinde yeniden yayımlanır. Demo: itiraz birkaç saniye sonra kabul edilmiş sayılır.
 */
import { toast } from '@/components/ui';
import { DEMO_MODE } from '@/config/demo';
import { useSellerExtras } from '@/features/seller/store';
import { useInboxStore } from '@/store/inbox';
import { useSellerStore } from '@/store/seller';
import type { ID, ProofKind } from '@/types';

import { IP_PROCESS } from './counterfeit';
import { RIGHT_TYPE_LABELS, useTrustStore, type RightType } from './store';

/** Demo: itirazın "açıkça haklı" sayılıp ilanın yeniden yayımlanması için beklenen süre */
export const DEMO_OBJECTION_MS = 6000;

/** Hak sahibi şikâyeti üzerine ilanı kaldır: pasife alınır, yayından çıkarılır, satıcıya bildirilir */
export function takeDownListing(listingId: ID, info: { complaintNo: string; rightType: RightType; rightHolder: string }) {
  const listing = useSellerStore.getState().listings.find((p) => p.id === listingId);
  if (!listing) return;
  useSellerExtras.getState().setListingStatus(listingId, 'inactive');
  if (listing.showId) useSellerStore.getState().updateListing(listingId, { showId: undefined });
  useSellerStore.setState((s) => ({ shows: s.shows.map((sh) => (sh.productIds.includes(listingId) ? { ...sh, productIds: sh.productIds.filter((id) => id !== listingId) } : sh)) }));
  useTrustStore.getState().setCase({ listingId, ...info, removedAt: new Date().toISOString(), status: 'removed' });
  useInboxStore.getState().pushNotification({
    type: 'policy',
    title: 'İlanın yayından kaldırıldı',
    body: `“${listing.title}” için ${RIGHT_TYPE_LABELS[info.rightType].toLocaleLowerCase('tr-TR')} hakkı ihlali şikâyeti geldi (${info.complaintNo}). Ürün orijinalse fatura ve tedarik belgeleriyle itiraz edebilirsin.`,
    // Kaldırılan ilan Pasif sekmesinde görünür
    href: '/seller/inventory?tab=inactive',
  });
}

/** Satıcının belgeyle itirazı. Demo: kısa süre sonra kabul edilmiş sayılır ve ilan yeniden yayımlanır. */
export function submitObjection(listingId: ID, objection: { kind: ProofKind; docs: string[]; note: string }) {
  useTrustStore.getState().patchCase(listingId, { status: 'objected', objection: { ...objection, note: objection.note.trim(), at: new Date().toISOString() } });
  if (DEMO_MODE) setTimeout(() => settleDemoObjections(true), DEMO_OBJECTION_MS);
}

/** İtiraz kabul edildi: ilan yeniden yayında, dosya kapanır */
export function reinstateListing(listingId: ID) {
  const c = useTrustStore.getState().cases[listingId];
  if (!c || c.status === 'reinstated') return;
  useTrustStore.getState().patchCase(listingId, { status: 'reinstated', reinstatedAt: new Date().toISOString() });
  if (useSellerStore.getState().listings.some((p) => p.id === listingId)) useSellerExtras.getState().setListingStatus(listingId, 'active');
}

/**
 * Demo: süresi dolan itirazları sonuçlandır (uygulama kapanıp açılırsa zamanlayıcı kaybolur;
 * envanter açılınca da çağrılır). notify: sonuç için bildirim + toast göster.
 */
export function settleDemoObjections(notify = false) {
  if (!DEMO_MODE) return;
  const now = Date.now();
  Object.values(useTrustStore.getState().cases).forEach((c) => {
    if (c.status !== 'objected' || !c.objection || now - new Date(c.objection.at).getTime() < DEMO_OBJECTION_MS - 500) return;
    reinstateListing(c.listingId);
    const title = useSellerStore.getState().listings.find((p) => p.id === c.listingId)?.title ?? 'İlan';
    useInboxStore.getState().pushNotification({
      type: 'policy',
      title: 'İtirazın kabul edildi',
      body: `Demo: “${title}” için sunduğun belgeler yeterli sayıldı, ilan yeniden yayında. Gerçek sürümde haklı itirazlarda ilan en geç ${IP_PROCESS.reinstateHours} saat içinde yeniden yayımlanır.`,
      href: '/seller/inventory',
    });
    if (notify) toast.success('Demo: itirazın kabul edildi, ilan yeniden yayında', 'shield-checkmark');
  });
}
