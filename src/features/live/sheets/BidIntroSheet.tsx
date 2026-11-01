import { StyleSheet, View } from 'react-native';

import { Button, Icon, Sheet, Text, type IconName } from '@/components/ui';
import { DEMO_COPY } from '@/config/demo';
import { BINDING_BID_TEXT, ESCROW_TEXT, WIN_COST_NOTE } from '@/features/commerce/utils';
import { EXTEND_THRESHOLD_SEC, SUDDEN_DEATH_LABEL } from '@/lib/auction';
import { haptic } from '@/lib/haptics';
import { liveColors } from '@/theme';

import { alpha } from '../components/styles';

type Row = { icon: IconName; tint: string; title: string; body: string; note?: string };

const ROWS: Row[] = [
  {
    icon: 'shield-checkmark-outline',
    tint: liveColors.primaryBright,
    title: 'Siparişin Alıcı Koruması altında',
    body: 'Paket hiç gelmezse ya da ürün ilanda anlatılandan belirgin biçimde farklı çıkarsa iadeyi biz başlatırız. Bunun için teslimattan sonraki 14 gün içinde sipariş detayından bize yazman yeterli.',
    note: ESCROW_TEXT,
  },
  {
    icon: 'hammer-outline',
    tint: liveColors.copper,
    title: 'Teklifin bağlayıcıdır',
    body: BINDING_BID_TEXT,
  },
  {
    icon: 'receipt-outline',
    tint: liveColors.accent,
    title: 'Kazanırsan ödeyeceğin',
    body: `${WIN_COST_NOTE}. Ödeme kayıtlı kartından otomatik alınır; aynı yayından aldıkların tek kargoda gelir.`,
    note: DEMO_COPY.payment,
  },
];

/**
 * İlk teklif öncesi tek seferlik bilgilendirme: tek ekranlık kısa kontrol listesi
 * (Alıcı Koruması, bağlayıcı teklif ve cayma hakkı, ücretler + demo notu) ve "Anladım" onayı.
 */
export function BidIntroSheet({ visible, onClose, onAccept }: { visible: boolean; onClose: () => void; onAccept: () => void }) {
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      dark
      footer={
        <Button
          title="Okudum, devam et"
          size="lg"
          fullWidth
          icon="checkmark"
          onPress={() => {
            haptic.success();
            onAccept();
          }}
        />
      }>
      <View style={styles.body}>
        <Text variant="title2" weight="800">
          Teklif vermeden önce
        </Text>
        <Text variant="subhead" color="textSecondary" style={styles.lead}>
          Teklif vermek için tutarı seç ve «Teklif ver» düğmesini basılı tut. Son {EXTEND_THRESHOLD_SEC} saniyede gelen teklif süreyi uzatır; {SUDDEN_DEATH_LABEL} mezatlarda süre uzamaz.
        </Text>
        <View style={styles.rows}>
          {ROWS.map((r) => (
            <View key={r.title} style={styles.row}>
              <View style={[styles.iconBox, { backgroundColor: alpha(r.tint, 0.14), borderColor: alpha(r.tint, 0.35) }]}>
                <Icon name={r.icon} size={22} color={r.tint} />
              </View>
              <View style={styles.flex}>
                <Text variant="headline" weight="700">
                  {r.title}
                </Text>
                <Text variant="footnote" color="textSecondary" style={styles.rowBody}>
                  {r.body}
                </Text>
                {r.note ? (
                  <Text variant="caption" weight="500" color="textTertiary" style={styles.rowNote}>
                    {r.note}
                  </Text>
                ) : null}
              </View>
            </View>
          ))}
        </View>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  body: { paddingTop: 6, paddingBottom: 6 },
  lead: { marginTop: 6 },
  rows: { gap: 16, marginTop: 18 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  iconBox: { width: 42, height: 42, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
  rowBody: { marginTop: 2 },
  rowNote: { marginTop: 4 },
});
