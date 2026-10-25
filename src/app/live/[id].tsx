import { Redirect, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { getShow } from '@/data';
import { LivePager } from '@/features/live/LivePager';

/** S20: Canlı yayın oynatıcısı (alıcı) — dikey kaydırmalı, her zaman koyu */
export default function LiveScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const show = getShow(id);
  if (show && show.status === 'scheduled') return <Redirect href={`/show/${show.id}`} />;
  return (
    <>
      <StatusBar style="light" />
      <LivePager key={id} initialId={id ?? ''} />
    </>
  );
}
