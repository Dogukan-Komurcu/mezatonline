/**
 * Aktivite sekmesi (Whatnot S60): Siparişler · Ön Teklifler · Öneriler · Kaydedilenler.
 * Misafir giriş istemi görür.
 */
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Header, IconButton, Screen, UnderlineTabs } from '@/components/ui';
import { AUTH_REASONS, requireAuth, useIsGuest } from '@/features/auth/gate';
import { GuestPrompt } from '@/features/auth/GuestPrompt';
import { OffersTab } from '@/features/activity/tabs/OffersTab';
import { PreBidsTab } from '@/features/activity/tabs/PreBidsTab';
import { PurchasesTab } from '@/features/activity/tabs/PurchasesTab';
import { SavedTab } from '@/features/activity/tabs/SavedTab';
import { useActivitySimulation } from '@/features/activity/useActivitySimulation';
import { useUnreadMessageCount } from '@/store/inbox';
import { useOrdersStore } from '@/store/orders';

type ActivityTab = 'purchases' | 'bids' | 'offers' | 'saved';

const TAB_KEYS: ActivityTab[] = ['purchases', 'bids', 'offers', 'saved'];

function parseTab(v: string | string[] | undefined): ActivityTab | undefined {
  const s = Array.isArray(v) ? v[0] : v;
  return TAB_KEYS.find((k) => k === s);
}

export default function ActivityScreen() {
  const guest = useIsGuest();
  return guest ? <GuestActivity /> : <MemberActivity />;
}

function GuestActivity() {
  return (
    <Screen>
      <Header
        large
        title="Aktivite"
        back={false}
        right={
          <View style={styles.actions}>
            <IconButton name="gift-outline" variant="surface" size={38} onPress={() => requireAuth(() => router.push('/rewards'), { reason: AUTH_REASONS.rewards })} accessibilityLabel="Ödüller" />
            <IconButton name="chatbox-ellipses-outline" variant="surface" size={38} onPress={() => requireAuth(() => router.push('/inbox'), { reason: AUTH_REASONS.inbox })} accessibilityLabel="Gelen Kutusu" />
          </View>
        }
      />
      <GuestPrompt
        icon="receipt-outline"
        title="Siparişlerin burada"
        message="Teklifler, siparişler, kaydedilenler ve mesajlar giriş yaptıktan sonra burada görünür."
        reason={AUTH_REASONS.activity}
      />
    </Screen>
  );
}

function MemberActivity() {
  const params = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState<ActivityTab>(() => parseTab(params.tab) ?? 'purchases');
  const unread = useUnreadMessageCount();
  const counterOffers = useOrdersStore((s) => s.offers.filter((o) => o.status === 'countered').length);
  useActivitySimulation();

  // Bildirimden "?tab=offers" ile gelindiyse sekmeyi değiştir
  const paramTab = parseTab(params.tab);
  useEffect(() => {
    if (paramTab) setTab(paramTab);
  }, [paramTab]);

  return (
    <Screen>
      <Header
        large
        title="Aktivite"
        back={false}
        right={
          <View style={styles.actions}>
            <IconButton name="gift-outline" variant="surface" size={38} onPress={() => router.push('/rewards')} accessibilityLabel="Ödüller" />
            <IconButton name="chatbox-ellipses-outline" variant="surface" size={38} badge={unread} onPress={() => router.push('/inbox')} accessibilityLabel="Gelen Kutusu" />
          </View>
        }
      />
      <UnderlineTabs
        tabs={[
          { key: 'purchases', label: 'Siparişler' },
          { key: 'bids', label: 'Ön Teklifler' },
          { key: 'offers', label: 'Öneriler', count: counterOffers || undefined },
          { key: 'saved', label: 'Kaydedilenler' },
        ]}
        value={tab}
        onChange={setTab}
      />
      <View style={styles.flex}>
        {tab === 'purchases' ? <PurchasesTab /> : tab === 'bids' ? <PreBidsTab /> : tab === 'offers' ? <OffersTab /> : <SavedTab />}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
