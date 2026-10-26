import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, EmptyState, Header, Icon, PressableScale, Screen, Sheet, Text, TextField, toast } from '@/components/ui';
import { useAccountStore } from '@/features/account/store';
import { IconCircle, InfoNote, MenuRow } from '@/features/account/ui';
import { shareLink } from '@/features/shared/sheets';
import { useQaParams } from '@/features/account/qa';
import { formatDateTime, formatTRY } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { useInboxStore } from '@/store/inbox';
import { selectDefaultPayment, useWalletStore } from '@/store/wallet';
import { radius, SCREEN_PADDING, useTheme } from '@/theme';

const REFERRAL_REWARD = 250;

/** Mock promosyon kodları (sunucuda doğrulanacak) */
const PROMO_CODES: Record<string, { amount: number; label: string }> = {
  HOSGELDIN: { amount: 100, label: 'Hoş geldin kodu: HOSGELDIN' },
  MEZAT250: { amount: 250, label: 'Kampanya kodu: MEZAT250' },
};

const STEPS = [
  { icon: 'share-social-outline' as const, title: 'Davet kodunu paylaş', text: 'Arkadaşlarına kodunu ya da bağlantını gönder.' },
  { icon: 'person-add-outline' as const, title: 'Arkadaşın kaydolsun', text: 'Kodunla kaydolup telefon numarasını doğrulasın.' },
  { icon: 'gift-outline' as const, title: 'İkiniz de kazanın', text: `İlk siparişi teslim edildiğinde ikinize de ${formatTRY(REFERRAL_REWARD)} kredi.` },
];

export default function WalletScreen() {
  const qa = useQaParams();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const credits = useWalletStore((s) => s.credits);
  const history = useWalletStore((s) => s.creditHistory);
  const referralCode = useWalletStore((s) => s.referralCode);
  const referralCount = useWalletStore((s) => s.referralCount);
  const addCredits = useWalletStore((s) => s.addCredits);
  const payment = useWalletStore(selectDefaultPayment);
  const redeemed = useAccountStore((s) => s.redeemedCodes);
  const redeemCode = useAccountStore((s) => s.redeemCode);

  const [codeOpen, setCodeOpen] = useState(false);
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState<string | undefined>();
  const [applying, setApplying] = useState(false);

  const share = () => {
    haptic.light();
    shareLink({
      title: "Mezatonline'a katıl",
      path: `/davet/${referralCode}`,
      message: `Mezatonline'da canlı mezatlara katıl! ${referralCode} davet koduyla kaydol, ikimiz de ${formatTRY(REFERRAL_REWARD)} kazanalım 🎉`,
    });
  };

  const copy = async () => {
    await Clipboard.setStringAsync(referralCode);
    haptic.success();
    toast.success('Davet kodu kopyalandı', 'copy-outline');
  };

  const closeCode = () => {
    setCodeOpen(false);
    setCode('');
    setCodeError(undefined);
  };

  const apply = () => {
    const c = code.trim().toLocaleUpperCase('tr-TR').replace(/İ/g, 'I');
    if (!c) {
      setCodeError('Bir kod gir');
      return;
    }
    setApplying(true);
    setTimeout(() => {
      setApplying(false);
      const promo = PROMO_CODES[c];
      if (c === referralCode) setCodeError('Kendi davet kodunu kullanamazsın');
      else if (redeemed.includes(c)) setCodeError('Bu kodu daha önce kullandın');
      else if (!promo) setCodeError('Kod geçersiz ya da süresi dolmuş');
      else {
        addCredits(promo.amount, promo.label);
        redeemCode(c);
        useInboxStore.getState().pushNotification({
          type: 'promo',
          title: `${formatTRY(promo.amount)} Mezat Kredisi hesabında 🎉`,
          body: 'Bir sonraki alışverişinde ürün tutarından otomatik düşülecek.',
          href: '/wallet',
        });
        haptic.success();
        toast.success(`${formatTRY(promo.amount)} kredi hesabına eklendi`, 'gift');
        closeCode();
        return;
      }
      haptic.error();
    }, 700);
  };

  return (
    <Screen>
      <Header title="Cüzdan" />
      <FlatList
        contentOffset={qa.offset}
        data={history}
        keyExtractor={(t) => t.id}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        ListHeaderComponent={
          <View>
            <View style={styles.pad}>
              <View style={[styles.balanceCard, { backgroundColor: colors.primary }]}>
                <Icon name="gift" size={140} color={colors.onPrimary} style={styles.balanceDeco} />
                <Text variant="subhead" weight="700" color={colors.onPrimary} style={{ opacity: 0.75 }}>
                  Mezat Kredisi
                </Text>
                <Text variant="display" color={colors.onPrimary} tabular style={{ fontSize: 40, lineHeight: 46 }}>
                  {formatTRY(credits)}
                </Text>
                <Text variant="footnote" color={colors.onPrimary} style={{ opacity: 0.75 }}>
                  Bir sonraki alışverişinde ürün tutarından otomatik düşülür
                </Text>
                <View style={styles.balanceActions}>
                  <Button title="Kod kullan" variant="inverse" size="sm" icon="ticket-outline" onPress={() => setCodeOpen(true)} />
                  <PressableScale onPress={share} style={[styles.onYellowBtn, { borderColor: colors.onPrimary }]} accessibilityRole="button" accessibilityLabel="Davet et">
                    <Icon name="share-social-outline" size={16} color={colors.onPrimary} />
                    <Text variant="subhead" weight="700" color={colors.onPrimary}>
                      Davet et
                    </Text>
                  </PressableScale>
                </View>
              </View>
              <InfoNote style={{ marginTop: 10 }}>Krediler yalnızca ürün tutarına uygulanır (kargo ve hizmet bedeline değil) ve 90 gün geçerlidir.</InfoNote>
            </View>

            <View style={[styles.pad, { marginTop: 24 }]}>
              <View style={[styles.refCard, { backgroundColor: colors.surface }]}>
                <View style={styles.refHead}>
                  <IconCircle name="people" size={44} bg={colors.primary} color={colors.onPrimary} />
                  <Text variant="title3" style={{ flex: 1 }}>
                    Arkadaşını davet et, ikiniz de {formatTRY(REFERRAL_REWARD)} kazanın
                  </Text>
                </View>
                <Text variant="subhead" color="textSecondary">
                  Arkadaşın davet kodunla kaydolup ilk siparişini teslim aldığında ikinize de {formatTRY(REFERRAL_REWARD)} Mezat Kredisi tanımlanır.
                </Text>
                <PressableScale scaleTo={0.98} onPress={copy} style={[styles.codeBox, { borderColor: colors.textTertiary, backgroundColor: colors.card }]} accessibilityRole="button" accessibilityLabel="Davet kodunu kopyala">
                  <View style={{ flex: 1 }}>
                    <Text variant="caption" color="textSecondary">
                      DAVET KODUN
                    </Text>
                    <Text variant="title3" style={{ letterSpacing: 2 }} selectable>
                      {referralCode}
                    </Text>
                  </View>
                  <Icon name="copy-outline" size={20} color="textSecondary" />
                </PressableScale>
                <View style={styles.refButtons}>
                  <Button title="Paylaş" icon="share-outline" style={{ flex: 1 }} onPress={share} />
                  <Button title="Kopyala" icon="copy-outline" variant="inverse" style={{ flex: 1 }} onPress={copy} />
                </View>
                <View style={[styles.refStats, { borderTopColor: colors.border }]}>
                  <View style={styles.refStat}>
                    <Text variant="title3">{referralCount}</Text>
                    <Text variant="footnote" color="textSecondary">
                      Davet ettiğin
                    </Text>
                  </View>
                  <View style={[styles.refDivider, { backgroundColor: colors.border }]} />
                  <View style={styles.refStat}>
                    <Text variant="title3" color="success">
                      {formatTRY(referralCount * REFERRAL_REWARD)}
                    </Text>
                    <Text variant="footnote" color="textSecondary">
                      Kazandığın
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={[styles.pad, { marginTop: 24, gap: 14 }]}>
              <Text variant="title3">Nasıl çalışır?</Text>
              {STEPS.map((s, i) => (
                <View key={s.title} style={styles.step}>
                  <View style={[styles.stepNum, { backgroundColor: colors.inverse }]}>
                    <Text variant="subhead" weight="800" color={colors.onInverse}>
                      {i + 1}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text variant="headline">{s.title}</Text>
                    <Text variant="subhead" color="textSecondary">
                      {s.text}
                    </Text>
                  </View>
                  <Icon name={s.icon} size={22} color="textSecondary" />
                </View>
              ))}
            </View>

            <View style={{ marginTop: 16 }}>
              <MenuRow
                icon="card-outline"
                title="Ödeme yöntemleri"
                subtitle={payment ? `${payment.bank} •••• ${payment.last4}` : 'Teklif vermek için bir kart ekle'}
                onPress={() => router.push('/settings/payments')}
              />
            </View>

            <Text variant="title3" style={[styles.pad, { marginTop: 16, marginBottom: 4 }]}>
              Kredi geçmişi
            </Text>
          </View>
        }
        ListEmptyComponent={<EmptyState icon="receipt-outline" title="Henüz kredi hareketin yok" message="Kazandığın ve kullandığın krediler burada listelenir." />}
        renderItem={({ item }) => {
          const plus = item.amount >= 0;
          return (
            <View style={styles.txRow}>
              <IconCircle name={plus ? 'arrow-down' : 'arrow-up'} bg={plus ? colors.success : colors.surface} color={plus ? '#FFFFFF' : colors.text} />
              <View style={{ flex: 1 }}>
                <Text variant="headline" numberOfLines={2}>
                  {item.description}
                </Text>
                <Text variant="footnote" color="textSecondary">
                  {formatDateTime(item.createdAt)}
                </Text>
              </View>
              <Text variant="headline" color={plus ? 'success' : 'text'} tabular>
                {plus ? '+' : '−'}
                {formatTRY(Math.abs(item.amount))}
              </Text>
            </View>
          );
        }}
      />

      <Sheet
        visible={codeOpen}
        onClose={closeCode}
        title="Kod kullan"
        subtitle="Kampanya ya da hediye kodunu gir; kredi anında hesabına eklenir."
        showClose
        footer={<Button title="Uygula" size="lg" fullWidth loading={applying} disabled={!code.trim()} onPress={apply} />}>
        <TextField
          placeholder="Örn. HOSGELDIN"
          value={code}
          onChangeText={(v) => {
            setCode(v.replace(/\s/g, '').slice(0, 20));
            setCodeError(undefined);
          }}
          autoCapitalize="characters"
          autoCorrect={false}
          autoFocus
          icon="ticket-outline"
          error={codeError}
          onSubmitEditing={apply}
          returnKeyType="done"
        />
        <InfoNote style={{ marginTop: 12 }}>Her kod hesap başına bir kez kullanılabilir. Davet kodları yalnızca kayıt sırasında geçerlidir.</InfoNote>
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: SCREEN_PADDING },
  balanceCard: { borderRadius: radius.xl, padding: 20, gap: 4, overflow: 'hidden' },
  balanceDeco: { position: 'absolute', right: -24, top: -18, opacity: 0.08, transform: [{ rotate: '-14deg' }] },
  balanceActions: { flexDirection: 'row', gap: 8, marginTop: 14 },
  onYellowBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 34, paddingHorizontal: 14, borderRadius: radius.pill, borderWidth: 1.5 },
  refCard: { borderRadius: radius.xl, padding: 16, gap: 12 },
  refHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  codeBox: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderStyle: 'dashed', borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 10 },
  refButtons: { flexDirection: 'row', gap: 10 },
  refStats: { flexDirection: 'row', alignItems: 'center', borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 12 },
  refStat: { flex: 1, alignItems: 'center', gap: 2 },
  refDivider: { width: StyleSheet.hairlineWidth, height: 32 },
  step: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepNum: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  txRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: SCREEN_PADDING, paddingVertical: 10 },
});
