import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Header, Screen, Text, toast } from '@/components/ui';
import { useAccountStore, type AccountFlag } from '@/features/account/store';
import { IconCircle, InfoNote, MenuGroup, MenuRow, SwitchRow } from '@/features/account/ui';
import { useSettingsStore, type NotificationPrefs } from '@/store/settings';
import { radius, SCREEN_PADDING, useTheme } from '@/theme';

type PrefRow = { key: keyof NotificationPrefs; title: string; subtitle: string };

const GROUPS: { title: string; rows: PrefRow[] }[] = [
  {
    title: 'Canlı yayınlar',
    rows: [
      { key: 'followedLive', title: 'Takip ettiklerin canlıda', subtitle: 'Takip ettiğin satıcılar yayına başladığında' },
      { key: 'showReminders', title: 'Yayın hatırlatıcıları', subtitle: 'Hatırlatıcı kurduğun yayınlar başlamak üzereyken' },
    ],
  },
  {
    title: 'Teklifler ve alışveriş',
    rows: [
      { key: 'outbid', title: 'Teklifin geçildiğinde', subtitle: 'Ön teklifin ya da maks. teklifin geçildiğinde hemen haber al' },
      { key: 'orderUpdates', title: 'Sipariş ve kargo', subtitle: 'Kargoya verildi, dağıtımda, teslim edildi ve değerlendirme hatırlatmaları' },
      { key: 'priceDrops', title: 'Fiyat düşüşleri', subtitle: 'Kaydettiğin ürünlerin fiyatı düştüğünde' },
    ],
  },
  {
    title: 'Sosyal',
    rows: [{ key: 'messages', title: 'Mesajlar', subtitle: 'Yeni doğrudan mesajlar ve mesaj istekleri' }],
  },
  {
    title: 'Kampanyalar',
    rows: [{ key: 'promotions', title: 'Fırsatlar ve kuponlar', subtitle: 'Kampanyalar, kupon dağıtımları ve kişisel öneriler' }],
  },
];

const IYS: { key: AccountFlag; title: string }[] = [
  { key: 'iysEmail', title: 'E-posta' },
  { key: 'iysSms', title: 'SMS' },
  { key: 'iysCall', title: 'Telefon araması' },
];

export default function NotificationSettingsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const prefs = useSettingsStore((s) => s.notifications);
  const setPref = useSettingsStore((s) => s.setNotificationPref);
  const quietHours = useAccountStore((s) => s.quietHours);
  const iysEmail = useAccountStore((s) => s.iysEmail);
  const iysSms = useAccountStore((s) => s.iysSms);
  const iysCall = useAccountStore((s) => s.iysCall);
  const setFlag = useAccountStore((s) => s.setFlag);
  const iysValues: Record<string, boolean> = { iysEmail, iysSms, iysCall };

  const allOn = Object.values(prefs).every(Boolean);

  return (
    <Screen>
      <Header title="Bildirimler" />
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
        <View style={styles.pad}>
          <View style={[styles.push, { backgroundColor: colors.surface }]}>
            <IconCircle name="notifications" size={44} bg={colors.primary} color={colors.onPrimary} />
            <View style={{ flex: 1 }}>
              <Text variant="headline">Anlık bildirimler</Text>
              <Text variant="footnote" color="textSecondary">
                Mezatları kaçırmamak için telefon ayarlarından Mezatonline bildirimlerine izin ver.
              </Text>
            </View>
          </View>
          <MenuRow
            icon="phone-portrait-outline"
            title="Telefon bildirim ayarları"
            subtitle="İzinleri ve bildirim seslerini yönet"
            onPress={() => Linking.openSettings().catch(() => toast.error('Ayarlar açılamadı'))}
            style={{ paddingHorizontal: 0 }}
          />
          <SwitchRow
            icon="moon-outline"
            title="Sessiz saatler"
            subtitle="23:00 – 08:00 arası yalnızca sipariş ve güvenlik bildirimleri"
            value={quietHours}
            onChange={(v) => setFlag('quietHours', v)}
            style={{ paddingHorizontal: 0 }}
          />
        </View>

        <View style={[styles.pad, styles.allRow]}>
          <Text variant="subhead" color="textSecondary" style={{ flex: 1 }}>
            Hangi durumlarda bildirim almak istediğini seç.
          </Text>
          <Text
            variant="subhead"
            weight="700"
            color="accent"
            suppressHighlighting
            onPress={() => {
              (Object.keys(prefs) as (keyof NotificationPrefs)[]).forEach((k) => setPref(k, !allOn));
              toast.success(allOn ? 'Tüm bildirimler kapatıldı' : 'Tüm bildirimler açıldı', 'notifications');
            }}>
            {allOn ? 'Tümünü kapat' : 'Tümünü aç'}
          </Text>
        </View>

        {GROUPS.map((g) => (
          <MenuGroup key={g.title} title={g.title}>
            {g.rows.map((r) => (
              <SwitchRow key={r.key} title={r.title} subtitle={r.subtitle} value={prefs[r.key]} onChange={(v) => setPref(r.key, v)} />
            ))}
          </MenuGroup>
        ))}

        <MenuGroup title="Ticari ileti izinleri" footer="6563 sayılı Kanun ve İYS kapsamında; onayını istediğin zaman geri alabilirsin. Sipariş ve güvenlik bildirimleri bu izinlerden bağımsız olarak gönderilir.">
          {IYS.map((r) => (
            <SwitchRow
              key={r.key}
              title={r.title}
              value={iysValues[r.key]}
              onChange={(v) => {
                setFlag(r.key, v);
                toast.success(`${r.title} izni ${v ? 'verildi' : 'geri alındı'}`, 'shield-checkmark-outline');
              }}
            />
          ))}
        </MenuGroup>

        <View style={[styles.pad, { marginTop: 20 }]}>
          <InfoNote>Bildirimleri kapatsan bile sipariş, ödeme ve hesap güvenliğiyle ilgili önemli bilgilendirmeleri almaya devam edersin.</InfoNote>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: SCREEN_PADDING },
  push: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius.lg, marginTop: 4, marginBottom: 4 },
  allRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16 },
});
