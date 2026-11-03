/**
 * Planlanmış yayın ⋯ menüsü: Başlat / Düzenle / Ürün ekle / Paylaş / İptal et
 */
import { router } from 'expo-router';

import { showAlert, toast } from '@/components/ui';
import { shareLink } from '@/features/shared/sheets';
import { formatShowTime } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import type { Show } from '@/types';

import { cancelShow } from './actions';
import type { SheetAction } from './ui';

export function startShow(show: Show) {
  if (show.status === 'live') router.push(`/seller/live/${show.id}`);
  else router.push({ pathname: '/seller/go-live', params: { showId: show.id } });
}

export function shareShow(show: Show) {
  shareLink({
    title: show.title,
    path: `/show/${show.id}`,
    message: `${formatShowTime(show.scheduledAt)} canlı yayındayım! 🔴 "${show.title}" — hatırlatıcı kur, kaçırma:`,
  });
}

export function confirmCancelShow(show: Show, onDone?: () => void) {
  showAlert('Yayını iptal et', `"${show.title}" iptal edilsin mi? Hatırlatıcı kuran takipçilerine bildirim gider. Yayına eklenen ürünler envanterinde kalır.`, [
    { text: 'Vazgeç', style: 'cancel' },
    {
      text: 'İptal et',
      style: 'destructive',
      onPress: () => {
        cancelShow(show.id);
        haptic.warning();
        toast('Yayın iptal edildi', 'close-circle');
        onDone?.();
      },
    },
  ]);
}

export function showActions(show: Show): SheetAction[] {
  return [
    { label: show.status === 'live' ? 'Yayına dön' : 'Yayını başlat', icon: 'videocam', onPress: () => startShow(show), subtitle: show.status === 'live' ? 'Şu an canlıdasın' : 'Kamera önizlemesi ve son kontroller' },
    { label: 'Düzenle', icon: 'create-outline', onPress: () => router.push({ pathname: '/seller/schedule', params: { id: show.id } }), disabled: show.status !== 'scheduled' },
    { label: 'Ürün ekle', icon: 'add-circle-outline', onPress: () => router.push({ pathname: '/seller/listing', params: { showId: show.id } }) },
    { label: 'Paylaş', icon: 'share-outline', onPress: () => shareShow(show), subtitle: 'Bağlantıyı takipçilerine gönder' },
    { label: 'Yayını iptal et', icon: 'trash-outline', destructive: true, onPress: () => confirmCancelShow(show), disabled: show.status !== 'scheduled' },
  ];
}
