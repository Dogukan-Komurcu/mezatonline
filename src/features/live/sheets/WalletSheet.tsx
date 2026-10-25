import { useState } from 'react';
import { StyleSheet, Switch, TextInput, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Button, Icon, ListRow, PressableScale, Sheet, Text, type IconName } from '@/components/ui';
import { formatDate, formatTRY } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { selectDefaultAddress, selectDefaultPayment, useWalletStore } from '@/store/wallet';
import { liveColors, useTheme } from '@/theme';

import { alpha } from '../components/styles';
import { useLivePrefs } from '../liveStore';

const BRAND_LABEL = { visa: 'Visa', mastercard: 'Mastercard', troy: 'Troy', amex: 'Amex' } as const;

function IconCircle({ name, tint }: { name: IconName; tint?: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.iconCircle, { backgroundColor: tint ?? colors.surfaceAlt }]}>
      <Icon name={name} size={18} color={tint ? liveColors.onPrimary : colors.text} />
    </View>
  );
}

/** S26: Cüzdan — teslimat, ödeme, Mezat kredisi, kupon kodu, akıllı paketleme */
export function WalletSheet({ visible, onClose, onNavigate }: { visible: boolean; onClose: () => void; onNavigate: (href: string) => void }) {
  const { colors } = useTheme();
  const address = useWalletStore(selectDefaultAddress);
  const payment = useWalletStore(selectDefaultPayment);
  const credits = useWalletStore((s) => s.credits);
  const coupon = useLivePrefs((s) => s.coupon);
  const useCredits = useLivePrefs((s) => s.useCredits);
  const setUseCredits = useLivePrefs((s) => s.setUseCredits);
  const applyCoupon = useLivePrefs((s) => s.applyCoupon);
  const clearCoupon = useLivePrefs((s) => s.clearCoupon);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [bundleOpen, setBundleOpen] = useState(false);

  const apply = () => {
    setApplying(true);
    setTimeout(() => {
      setApplying(false);
      const res = applyCoupon(code);
      if (res.ok) {
        haptic.success();
        setError(null);
        setCode('');
      } else {
        haptic.error();
        setError(res.error);
      }
    }, 600);
  };

  return (
    <Sheet visible={visible} onClose={onClose} dark title="Cüzdan" showClose>
      <ListRow
        title="Teslimat"
        subtitle={address ? `${address.title} · ${address.neighborhood}, ${address.district}/${address.city}` : 'Teslimat adresi ekle'}
        left={<IconCircle name="cube-outline" />}
        onPress={() => onNavigate('/settings/addresses')}
        style={styles.row}
      />
      <ListRow
        title="Ödeme"
        subtitle={payment ? `${BRAND_LABEL[payment.brand]} •••• ${payment.last4} · ${payment.bank}` : 'Kredi / banka kartı ekle'}
        left={<IconCircle name="card-outline" />}
        onPress={() => onNavigate('/settings/payments')}
        style={styles.row}
      />
      <View style={[styles.creditRow, { borderColor: colors.border }]}>
        <IconCircle name="wallet-outline" />
        <View style={styles.flex}>
          <Text variant="body" weight="600">
            Mezat kredisi · {formatTRY(credits)}
          </Text>
          <Text variant="footnote" color="textSecondary">
            Satın almalarda ürün tutarından otomatik düşülsün
          </Text>
        </View>
        <Switch
          value={useCredits && credits > 0}
          disabled={credits <= 0}
          onValueChange={(v) => {
            haptic.tap();
            setUseCredits(v);
          }}
          trackColor={{ true: colors.primary, false: colors.surfaceAlt }}
          thumbColor={liveColors.text}
          ios_backgroundColor={colors.surfaceAlt}
        />
      </View>
      <ListRow
        title="Arkadaşını davet et, ₺100 kazan"
        subtitle="Arkadaşın ilk siparişini verince ikiniz de kredi kazanırsınız"
        left={<IconCircle name="gift" tint={liveColors.primary} />}
        onPress={() => onNavigate('/wallet')}
        style={styles.row}
      />

      <Text variant="subhead" weight="800" color="textSecondary" style={styles.section}>
        Kupon kodu
      </Text>
      {coupon ? (
        <Animated.View entering={FadeIn} style={[styles.coupon, { backgroundColor: alpha(liveColors.success, 0.14), borderColor: alpha(liveColors.success, 0.4) }]}>
          <Icon name="pricetag" size={18} color={liveColors.success} />
          <View style={styles.flex}>
            <Text variant="subhead" weight="800" color={liveColors.success}>
              {coupon.code} uygulandı
            </Text>
            <Text variant="caption" color="textSecondary">
              {coupon.title} · Son gün {formatDate(coupon.expiresAt)}
            </Text>
          </View>
          <Text
            variant="footnote"
            weight="700"
            color="danger"
            onPress={() => {
              haptic.tap();
              clearCoupon();
            }}
            suppressHighlighting>
            Kaldır
          </Text>
        </Animated.View>
      ) : (
        <>
          <View style={[styles.codeRow, { backgroundColor: colors.surface, borderColor: error ? colors.danger : 'transparent' }]}>
            <TextInput
              value={code}
              onChangeText={(t) => {
                setCode(t.toLocaleUpperCase('tr-TR'));
                setError(null);
              }}
              placeholder="Kupon kodunu gir"
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="characters"
              autoCorrect={false}
              style={[styles.codeInput, { color: colors.text }]}
              keyboardAppearance="dark"
              returnKeyType="done"
              onSubmitEditing={apply}
            />
            <Button title="Uygula" size="sm" variant="secondary" loading={applying} disabled={!code.trim()} onPress={apply} />
          </View>
          <Text variant="caption" color={error ? 'danger' : 'textTertiary'} style={styles.helper}>
            {error ?? 'Kupon, bu yayındaki bir sonraki alışverişine otomatik uygulanır. Deneme: MEZAT10'}
          </Text>
        </>
      )}

      <PressableScale scaleTo={0.99} onPress={() => setBundleOpen((o) => !o)} style={[styles.bundle, { backgroundColor: colors.surface }]}>
        <View style={styles.bundleHead}>
          <Icon name="layers-outline" size={18} color="text" />
          <Text variant="subhead" weight="700" style={styles.flex}>
            Akıllı paketleme
          </Text>
          <Icon name={bundleOpen ? 'chevron-up' : 'chevron-down'} size={16} color="textSecondary" />
        </View>
        {bundleOpen ? (
          <Text variant="footnote" color="textSecondary" style={styles.bundleText}>
            Aynı yayında aynı satıcıdan aldığın tüm ürünler tek pakette gönderilir; kargo ücretini yalnızca ilk siparişte ödersin. Sonraki ürünlerde "Kargo: +₺0 (aynı pakete eklendi)" yazar.
          </Text>
        ) : null}
      </PressableScale>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { paddingHorizontal: 0 },
  iconCircle: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  creditRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  section: { marginTop: 16, marginBottom: 8 },
  coupon: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, padding: 12, borderWidth: 1 },
  codeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 14, paddingLeft: 14, paddingRight: 6, minHeight: 50, borderWidth: 1.5 },
  codeInput: { flex: 1, fontSize: 16, fontWeight: '600', letterSpacing: 1, paddingVertical: 10 },
  helper: { marginTop: 6 },
  bundle: { borderRadius: 14, padding: 12, marginTop: 16, marginBottom: 6 },
  bundleHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bundleText: { marginTop: 8 },
});
