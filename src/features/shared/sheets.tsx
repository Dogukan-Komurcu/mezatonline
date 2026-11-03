/**
 * Birden çok ekranda kullanılan ortak sheet'ler: Bahşiş, Şikayet, Paylaş yardımcıları.
 * Bahşiş giriş noktaları FEATURES.tips ile kapatılır (bkz. '@/config/demo').
 */
import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { Share, StyleSheet, View } from 'react-native';

import { Avatar, Button, Chip, Icon, ListRow, PressableScale, Sheet, Text, TextField, toast } from '@/components/ui';
import { requireTransactSetup, TransactSetupHost } from '@/features/wallet/TransactSetup';
import { TIP_PRESETS } from '@/lib/auction';
import { formatTRY } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { useInboxStore } from '@/store/inbox';
import { useModerationStore } from '@/store/moderation';
import { selectDefaultPayment, useWalletStore } from '@/store/wallet';
import { radius, useTheme } from '@/theme';
import type { User } from '@/types';

/** Bir sheet kapanıp yenisi (ya da yeni ekran) açılmadan önce beklenen süre: iOS'ta RN Modal kapanmadan yeni modal / ekran açılamaz */
export const SHEET_SWAP_MS = 300;

// ─── Paylaş ──────────────────────────────────────────────────────────────────

export const APP_URL = 'https://mezatonline.com';

/** Sistem paylaşım sayfasını açar */
export async function shareLink(opts: { title: string; path: string; message?: string }) {
  const url = `${APP_URL}${opts.path}`;
  try {
    await Share.share({ title: opts.title, message: `${opts.message ?? opts.title}\n${url}`, url });
  } catch {
    toast.error('Paylaşılamadı');
  }
}

// ─── Bahşiş ──────────────────────────────────────────────────────────────────

/** İşlem ücreti: %3 + ₺1 (alıcı öder) */
export function tipFee(amount: number) {
  return Math.round((amount * 0.03 + 1) * 100) / 100;
}

/**
 * Satıcıya bahşiş gönder (yalnız hazır tutarlar). Canlı yayında `dark` kullan.
 * onSent: canlı motorda sohbete düşmesi için engine.tip(amount) çağırın.
 */
export function TipSheet({ visible, onClose, seller, dark, onSent }: { visible: boolean; onClose: () => void; seller: User; dark?: boolean; onSent?: (amount: number, note: string) => void }) {
  const [amount, setAmount] = useState<number>(TIP_PRESETS[1]);
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const payment = useWalletStore(selectDefaultPayment);
  const fee = tipFee(amount);
  const send = () => {
    requireTransactSetup(
      () => {
        setSending(true);
        setTimeout(() => {
          setSending(false);
          haptic.success();
          onSent?.(amount, note);
          useInboxStore.getState().pushNotification({
            type: 'promo',
            title: `❤️ ${seller.username} adlı satıcıya ${formatTRY(amount)} bahşiş gönderdin`,
            body: note || 'Desteğin için teşekkürler!',
            image: seller.avatar,
            href: `/user/${seller.username}`,
          });
          toast.success(`${formatTRY(amount)} bahşiş gönderildi ❤️`);
          setNote('');
          onClose();
        }, 700);
      },
      { dark },
    );
  };
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      dark={dark}
      title="Bahşiş Gönder"
      showClose
      footer={<Button title={`${formatTRY(amount + fee, { cents: true })} Gönder`} size="lg" fullWidth loading={sending} onPress={send} />}>
      <View style={styles.tipHead}>
        <Avatar uri={seller.avatar} name={seller.username} size={56} />
        <Text variant="headline">{seller.username}</Text>
        <Text variant="footnote" color="textSecondary" align="center">
          Bahşişin %100'ü satıcıya gider. Bahşişler iade edilmez.
        </Text>
      </View>
      <View style={styles.chips}>
        {TIP_PRESETS.map((p) => (
          <Chip key={p} label={formatTRY(p)} selected={p === amount} onPress={() => setAmount(p)} style={styles.chip} />
        ))}
      </View>
      <TextField placeholder="Teşekkür notu (isteğe bağlı)" value={note} onChangeText={(t) => setNote(t.slice(0, 140))} maxLength={140} />
      <View style={styles.rows}>
        <ListRow title="Bahşiş" value={formatTRY(amount)} style={styles.row} />
        <ListRow title="İşlem ücreti" value={formatTRY(fee, { cents: true })} style={styles.row} />
        <ListRow
          title="Ödeme"
          value={payment ? `${payment.bank} •••• ${payment.last4}` : 'Kart ekle'}
          icon="card-outline"
          style={styles.row}
        />
      </View>
      <TransactSetupHost scoped />
    </Sheet>
  );
}

// ─── Şikayet ─────────────────────────────────────────────────────────────────

const COUNTERFEIT_REASON = 'Sahte / taklit ürün';

const REPORT_REASONS = [
  COUNTERFEIT_REASON,
  'Yanıltıcı açıklama',
  'Taciz veya nefret söylemi',
  'Spam veya dolandırıcılık',
  'Platform dışı ödeme talebi',
  'Uygunsuz içerik',
  'Yasaklı ürün',
  'Diğer',
];

/**
 * "Sahte / taklit ürün" seçilince: hak sahiplerini, ilanı kaldırtabilecekleri hak sahibi başvurusuna yönlendirir.
 * Sheet içinde render edilir ki canlı yayındaki koyu temayı (ForceScheme) alsın.
 */
function IpComplaintHint({ onPress }: { onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.ipHint, { backgroundColor: colors.surface }]}>
      <Icon name="ribbon-outline" size={18} color={colors.accent} style={{ marginTop: 1 }} />
      <View style={{ flex: 1, gap: 6 }}>
        <Text variant="footnote" color="textSecondary">
          Marka, tasarım, patent ya da telif hakkının sahibi (veya vekili) sensen ilanın kaldırılması için hak sahibi başvurusu yapabilirsin. Alıcı olarak bildiriyorsan bu şikâyeti göndermen yeterli.
        </Text>
        <PressableScale scaleTo={0.97} onPress={onPress} accessibilityRole="link" style={styles.ipHintLink}>
          <Text variant="footnote" weight="700" color="accent">
            Hak sahibi başvurusu yap
          </Text>
          <Icon name="chevron-forward" size={14} color={colors.accent} />
        </PressableScale>
      </View>
    </View>
  );
}

/**
 * Kullanıcı / yayın / ilan şikayet sayfası.
 * productId: ilan şikâyetinde, hak sahibi başvurusuna ilanı önceden seçili geçirmek için.
 */
export function ReportSheet({ visible, onClose, subject, dark, productId }: { visible: boolean; onClose: () => void; subject: string; dark?: boolean; productId?: string }) {
  const [reason, setReason] = useState<string | null>(null);
  const [details, setDetails] = useState('');
  const openIpComplaint = () => {
    haptic.tap();
    setReason(null);
    setDetails('');
    onClose();
    // Sheet (RN Modal) kapanmadan yeni ekran açılırsa iOS'ta modalın altında kalır
    const href = productId ? { pathname: '/settings/ip-complaint', params: { productId } } : '/settings/ip-complaint';
    setTimeout(() => router.push(href as Href), SHEET_SWAP_MS);
  };
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      dark={dark}
      title="Şikayet et"
      subtitle={`${subject} · Şikayetler gizlidir; karşı taraf bilgilendirilmez.`}
      showClose
      footer={
        <Button
          title="Şikayeti gönder"
          variant="danger"
          size="lg"
          fullWidth
          disabled={!reason}
          onPress={() => {
            if (!reason) return;
            // Demo: şikâyet yalnızca bu cihazda saklanır
            useModerationStore.getState().addReport({ subject, reason, details });
            haptic.success();
            toast.success('Demo: şikâyetin bu cihazda kaydedildi. Gerçek sürümde moderasyon ekibine iletilir.', 'shield-checkmark');
            setReason(null);
            setDetails('');
            onClose();
          }}
        />
      }>
      {REPORT_REASONS.map((r) => (
        <View key={r}>
          <ListRow
            title={r}
            onPress={() => setReason(r)}
            chevron={false}
            right={<Icon name={reason === r ? 'radio-button-on' : 'radio-button-off'} size={22} color={reason === r ? 'text' : 'textTertiary'} />}
            style={styles.row}
          />
          {r === COUNTERFEIT_REASON && reason === r ? <IpComplaintHint onPress={openIpComplaint} /> : null}
        </View>
      ))}
      <TextField placeholder="Ayrıntı ekle (isteğe bağlı)" value={details} onChangeText={setDetails} multiline containerStyle={{ marginTop: 8 }} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  tipHead: { alignItems: 'center', gap: 6, marginBottom: 16 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  chip: { minWidth: '30%', alignItems: 'center' },
  rows: { marginTop: 10 },
  row: { paddingHorizontal: 0 },
  ipHint: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 12, borderRadius: radius.md, marginBottom: 6 },
  ipHintLink: { flexDirection: 'row', alignItems: 'center', gap: 2, alignSelf: 'flex-start' },
});
