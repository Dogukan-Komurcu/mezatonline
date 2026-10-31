import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Header, Icon, PressableScale, Screen, Segmented, Sheet, Text, TextField, toast } from '@/components/ui';
import { DEMO_MODE } from '@/config/demo';
import { useAccountStore } from '@/features/account/store';
import { ConfirmSheet, InfoNote, MenuGroup, MenuRow, SwitchRow } from '@/features/account/ui';
import { useQaParams } from '@/features/account/qa';
import { useActivityExtras } from '@/features/activity/store';
import { useIsGuest } from '@/features/auth/gate';
import { useBrowseStore } from '@/features/browse/store';
import { useCouponStore } from '@/features/commerce/coupons';
import { useInboxExtras } from '@/features/inbox/store';
import { useProfilePrefs } from '@/features/profile/store';
import { useSellerExtras } from '@/features/seller/store';
import { haptic } from '@/lib/haptics';
import { useAuthStore } from '@/store/auth';
import { useInboxStore } from '@/store/inbox';
import { useModerationStore } from '@/store/moderation';
import { useOrdersStore } from '@/store/orders';
import { useRewardsStore } from '@/store/rewards';
import { useSellerStore } from '@/store/seller';
import { useSettingsStore, type Appearance } from '@/store/settings';
import { useWalletStore } from '@/store/wallet';
import { radius, SCREEN_PADDING, useTheme } from '@/theme';

const DELETE_REASONS = ['Uygulamayı artık kullanmıyorum', 'Aradığım ürünleri bulamıyorum', 'Çok fazla bildirim alıyorum', 'Gizlilik endişelerim var', 'Başka bir hesap kullanıyorum', 'Diğer'];
const OPEN_STATUSES = ['paid', 'preparing', 'shipped', 'out_for_delivery', 'return_requested'];

/**
 * Tamamen hesaba ait kalıcı store'lar: silmede depolama anahtarları da kaldırılır.
 * Cihaz tercihi de taşıyan store'lar (ayarlar, sosyal: son aramalar, canlı yayın tercihleri) yalnızca çıkıştaki sıfırlamayla temizlenir.
 */
const ACCOUNT_STORES = [
  useAuthStore,
  useAccountStore,
  useWalletStore,
  useOrdersStore,
  useSellerStore,
  useSellerExtras,
  useRewardsStore,
  useInboxStore,
  useInboxExtras,
  useActivityExtras,
  useProfilePrefs,
  useCouponStore,
  useBrowseStore,
  useModerationStore,
];

/** Demo: hesap yalnızca bu cihazda yaşar; çıkış + yerel depolamanın silinmesi hesabı tamamen siler */
function deleteDeviceAccount() {
  // Çıkış, gate aboneliği üzerinden resetAccountData'yı tetikler: bellekteki hesap verileri ve
  // kampanya bildirimi izni sıfırlanır; tema vb. cihaz tercihleri korunur
  useAuthStore.getState().signOut();
  ACCOUNT_STORES.forEach((store) => {
    store.persist.clearStorage();
  });
}

export default function PreferencesScreen() {
  const qa = useQaParams();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const appearance = useSettingsStore((s) => s.appearance);
  const setAppearance = useSettingsStore((s) => s.setAppearance);
  const haptics = useSettingsStore((s) => s.haptics);
  const setHaptics = useSettingsStore((s) => s.setHaptics);
  const autoplay = useSettingsStore((s) => s.autoplayPreviews);
  const setAutoplay = useSettingsStore((s) => s.setAutoplayPreviews);
  const liveSound = useSettingsStore((s) => s.liveSoundOn);
  const setLiveSound = useSettingsStore((s) => s.setLiveSoundOn);
  const dataSaver = useSettingsStore((s) => s.dataSaver);
  const setDataSaver = useSettingsStore((s) => s.setDataSaver);
  const showLoyaltyBadge = useAccountStore((s) => s.showLoyaltyBadge);
  const suggestAccount = useAccountStore((s) => s.suggestAccount);
  const personalizedAds = useAccountStore((s) => s.personalizedAds);
  const setFlag = useAccountStore((s) => s.setFlag);
  const guest = useIsGuest();
  const openOrders = useOrdersStore((s) => s.orders.filter((o) => OPEN_STATUSES.includes(o.status)).length);
  const sellerBalance = useSellerStore((s) => s.balance + s.pendingBalance);

  const [languageOpen, setLanguageOpen] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [reason, setReason] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [finalConfirm, setFinalConfirm] = useState(false);

  const clearCache = async () => {
    setClearing(true);
    try {
      await Promise.all([Image.clearDiskCache(), Image.clearMemoryCache()]);
    } catch {
      // önbellek zaten boş olabilir
    }
    setTimeout(() => {
      setClearing(false);
      haptic.success();
      toast.success('Önbellek temizlendi', 'trash-bin-outline');
    }, 500);
  };

  const startDelete = () => {
    setDeleteOpen(false);
    // Demo: siparişler ve bakiyeler simülasyon olduğundan silmeyi engellemez
    if (!DEMO_MODE && openOrders > 0) {
      haptic.warning();
      setTimeout(() => toast.warning(`Açık ${openOrders} siparişin var. Hesabını silmeden önce tamamlanmalarını bekle.`, 'bag-handle-outline'), 260);
      return;
    }
    if (!DEMO_MODE && sellerBalance > 0) {
      haptic.warning();
      setTimeout(() => toast.warning('Satıcı bakiyende para var. Önce bakiyeni hesabına aktar.', 'cash-outline'), 260);
      return;
    }
    setTimeout(() => setFinalConfirm(true), 260);
  };

  return (
    <Screen>
      <Header title="Tercihler" />
      <ScrollView contentOffset={qa.offset} contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
        <MenuGroup title="Görünüm">
          <View style={styles.pad}>
            <Segmented<Appearance>
              value={appearance}
              onChange={(v) => setAppearance(v)}
              options={[
                { key: 'system', label: 'Sistem' },
                { key: 'light', label: 'Açık' },
                { key: 'dark', label: 'Koyu' },
              ]}
            />
            <Text variant="footnote" color="textSecondary" style={{ marginTop: 8 }}>
              "Sistem" seçiliyken uygulama telefonunun açık / koyu tema ayarına uyar. Canlı yayınlar her zaman koyu görünür.
            </Text>
          </View>
        </MenuGroup>

        <MenuGroup title="Oynatma ve titreşim">
          <SwitchRow icon="phone-portrait-outline" title="Titreşim" subtitle="Teklif, kazanma ve dokunuşlarda hafif titreşim" value={haptics} onChange={setHaptics} />
          <SwitchRow icon="play-circle-outline" title="Önizlemeleri otomatik oynat" subtitle="Ana sayfadaki canlı yayın kartları sessizce oynar" value={autoplay} onChange={setAutoplay} />
          <SwitchRow icon="volume-high-outline" title="Yayınlara sesli gir" subtitle="Canlı yayın açıldığında ses açık başlar" value={liveSound} onChange={setLiveSound} />
          <SwitchRow icon="cellular-outline" title="Veri tasarrufu" subtitle="Mobil veride video kalitesini düşürür, önizlemeleri durdurur" value={dataSaver} onChange={setDataSaver} />
        </MenuGroup>

        <MenuGroup title="Dil ve bölge">
          <MenuRow icon="language-outline" title="Uygulama dili" value="Türkçe" onPress={() => setLanguageOpen(true)} />
          <MenuRow icon="globe-outline" title="Ülke ve para birimi" value="Türkiye · ₺ TRY" chevron={false} />
        </MenuGroup>

        <MenuGroup title="Gizlilik">
          {guest ? null : (
            <>
              <SwitchRow icon="id-card-outline" title="Müdavim Kartı seviyemi göster" subtitle="Yayın sohbetinde adının yanında o satıcıdaki seviyen (Çırak, Kalfa, Usta) görünür" value={showLoyaltyBadge} onChange={(v) => setFlag('showLoyaltyBadge', v)} />
              <SwitchRow icon="people-outline" title="Hesabımı başkalarına öner" subtitle="Rehberinde numaran kayıtlı olanlara önerilirsin" value={suggestAccount} onChange={(v) => setFlag('suggestAccount', v)} />
            </>
          )}
          <SwitchRow icon="megaphone-outline" title="Kişiselleştirilmiş reklamlar" subtitle="İlgi alanlarına göre kampanya gösterilmesine izin ver (açık rıza)" value={personalizedAds} onChange={(v) => setFlag('personalizedAds', v)} />
          <MenuRow icon="document-lock-outline" title="KVKK ve çerez tercihleri" onPress={() => router.push('/settings/legal')} />
        </MenuGroup>

        <MenuGroup title="Depolama">
          <MenuRow icon="trash-bin-outline" title="Önbelleği temizle" subtitle="Görsel önbelleğini siler; kayıtlı verilerin etkilenmez" onPress={clearing ? undefined : clearCache} value={clearing ? 'Temizleniyor…' : undefined} />
        </MenuGroup>

        {guest ? null : (
          <MenuGroup title="Hesap yönetimi">
            <MenuRow
              icon="person-remove-outline"
              title="Hesabı sil"
              subtitle={DEMO_MODE ? 'Bu cihazdaki hesap verilerin kalıcı olarak silinir' : 'Hesabın ve verilerin kalıcı olarak silinir'}
              destructive
              onPress={() => setDeleteOpen(true)}
            />
          </MenuGroup>
        )}
      </ScrollView>

      <Sheet visible={languageOpen} onClose={() => setLanguageOpen(false)} title="Uygulama dili" showClose>
        <PressableScale onPress={() => setLanguageOpen(false)} style={[styles.lang, { borderColor: colors.text }]} accessibilityRole="radio" accessibilityState={{ selected: true }}>
          <Text style={{ fontSize: 24, lineHeight: 30 }}>🇹🇷</Text>
          <View style={{ flex: 1 }}>
            <Text variant="headline">Türkçe</Text>
            <Text variant="footnote" color="textSecondary">
              Türkiye
            </Text>
          </View>
          <Icon name="checkmark-circle" size={22} color="success" />
        </PressableScale>
        <InfoNote style={{ marginTop: 14 }}>Mezatonline şu anda yalnızca Türkiye'de ve Türkçe hizmet veriyor. Fiyatlar Türk lirası (KDV dahil) gösterilir.</InfoNote>
      </Sheet>

      <Sheet
        visible={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Hesabını neden silmek istiyorsun?"
        subtitle="Geri bildirimin Mezatonline'ı geliştirmemize yardımcı olur."
        showClose
        footer={<Button title="Devam et" variant="danger" size="lg" fullWidth disabled={!reason} onPress={startDelete} />}>
        {DELETE_REASONS.map((r) => (
          <PressableScale key={r} onPress={() => setReason(r)} style={styles.reason} accessibilityRole="radio" accessibilityState={{ selected: reason === r }}>
            <Text variant="body" style={{ flex: 1 }}>
              {r}
            </Text>
            <Icon name={reason === r ? 'radio-button-on' : 'radio-button-off'} size={22} color={reason === r ? 'text' : 'textTertiary'} />
          </PressableScale>
        ))}
        {reason === 'Diğer' ? <TextField placeholder="Kısaca anlatır mısın? (isteğe bağlı)" value={note} onChangeText={setNote} multiline containerStyle={{ marginTop: 8 }} /> : null}
      </Sheet>

      <ConfirmSheet
        visible={finalConfirm}
        onClose={() => setFinalConfirm(false)}
        icon="warning-outline"
        destructive
        title="Hesabın kalıcı olarak silinsin mi?"
        message={
          DEMO_MODE
            ? 'Demo: Hesabın yalnızca bu cihazda tutulur. Profilin, onay kayıtların, adreslerin, kartların (son 4 hane), siparişlerin, mesajların, kayıtlıların, Mezat Kredin ve puanların bu cihazdan silinir. Bu işlem geri alınamaz. Tema gibi cihaz tercihlerin korunur.'
            : 'Profilin, sipariş geçmişin, kayıtlıların, Mezat Kredin ve puanların silinir. Bu işlem geri alınamaz. Yasal saklama yükümlülüğü olan fatura kayıtları mevzuat süresince saklanır.'
        }
        confirmLabel="Hesabımı kalıcı olarak sil"
        onConfirm={() => {
          setFinalConfirm(false);
          haptic.heavy();
          setTimeout(() => {
            deleteDeviceAccount();
            router.dismissTo('/');
            toast('Demo: bu cihazdaki hesap verilerin silindi.');
          }, 300);
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: SCREEN_PADDING, paddingTop: 6 },
  lang: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius.md, borderWidth: 1.5 },
  reason: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
});
