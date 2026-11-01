/**
 * Ödemeler: çekilebilir / bekleyen / toplam kazanç, IBAN, "Para Çek" sayfası,
 * Ödemeler | Hesap Hareketleri sekmeleri ve vergi notu (stopaj, KDV).
 */
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Button, Chip, EmptyState, Header, Icon, IconButton, PressableScale, Screen, Sheet, Text, TextField, toast, UnderlineTabs, type IconName } from '@/components/ui';
import { formatDateTime, formatDayLong, formatNumber, formatTRY } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { useInboxStore } from '@/store/inbox';
import { useSellerStore } from '@/store/seller';
import { radius, SCREEN_PADDING, useTheme } from '@/theme';

import { useNow } from './actions';
import { IbanSheet } from './IbanSheet';
import { addBusinessDays, bankFromIban, buildLedger, maskIban, orderNet, payoutDisplay, type LedgerEntry, type LedgerKind } from './logic';
import { useQaOffset, useQaParam } from './qaSeed';
import { useSellerExtras } from './store';
import { Card, KeyValue, StatusPill, tint } from './ui';

const MIN_PAYOUT = 10;

type LedgerFilter = 'all' | 'processing' | 'completed' | 'payout';

const LEDGER_ICONS: Record<LedgerKind, IconName> = {
  sale: 'bag-check-outline',
  commission: 'pricetag-outline',
  card_fee: 'card-outline',
  shipping_in: 'cube-outline',
  shipping_out: 'car-outline',
  payout: 'arrow-up-circle-outline',
};

function parseAmount(text: string): number {
  const n = parseFloat(text.replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}

function amountText(v: number): string {
  return formatNumber(v, Number.isInteger(v) ? 0 : 2);
}

function WithdrawSheet({ visible, onClose, onNeedIban }: { visible: boolean; onClose: () => void; onNeedIban: () => void }) {
  const { colors } = useTheme();
  const now = useNow(60_000);
  const balance = useSellerStore((s) => s.balance);
  const iban = useSellerStore((s) => s.iban);
  const requestPayout = useSellerStore((s) => s.requestPayout);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) setText(balance > 0 ? amountText(balance) : '');
  }, [visible, balance]);

  const amount = parseAmount(text);
  const error = amount > balance ? 'Çekilebilir bakiyenden fazla' : amount > 0 && amount < MIN_PAYOUT ? `En az ${formatTRY(MIN_PAYOUT)} çekebilirsin` : undefined;
  const ok = !!iban && amount >= MIN_PAYOUT && amount <= balance;
  const arrival = addBusinessDays(now, 1);

  const submit = () => {
    if (!ok) return;
    setLoading(true);
    setTimeout(() => {
      const payout = requestPayout(amount);
      setLoading(false);
      if (!payout) {
        toast.error('Para çekme talebi oluşturulamadı');
        return;
      }
      haptic.success();
      toast.success("1-2 iş günü içinde IBAN'ına geçer", 'checkmark-circle');
      useInboxStore.getState().pushNotification({
        type: 'payout',
        title: 'Para çekme talebin alındı 💸',
        body: `${formatTRY(amount)} tutarındaki ödemen 1-2 iş günü içinde IBAN'ına geçecek.`,
        href: '/seller/payouts',
      });
      onClose();
    }, 1200);
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Para Çek"
      subtitle={`Çekilebilir: ${formatTRY(balance)}`}
      showClose
      footer={
        iban ? (
          <Button title={amount > 0 ? `${formatTRY(amount)} çek` : 'Tutar gir'} size="lg" fullWidth disabled={!ok} loading={loading} onPress={submit} />
        ) : (
          <Button
            title="Önce IBAN ekle"
            size="lg"
            fullWidth
            icon="add"
            onPress={() => {
              onClose();
              setTimeout(onNeedIban, 350);
            }}
          />
        )
      }>
      <View style={{ gap: 14 }}>
        <TextField
          label="Tutar"
          prefix="₺"
          value={text}
          onChangeText={(t) => {
            const clean = t.replace(/[^\d,]/g, '');
            const [int, dec] = clean.split(',');
            const intDigits = (int ?? '').slice(0, 7);
            const grouped = intDigits ? formatNumber(parseInt(intDigits, 10)) : '';
            setText(dec !== undefined ? `${grouped || '0'},${dec.slice(0, 2)}` : grouped);
          }}
          keyboardType="decimal-pad"
          placeholder="0"
          error={error}
          style={{ fontSize: 24, fontWeight: '800' }}
        />
        <View style={styles.wrap}>
          {[0.25, 0.5, 0.75].map((p) => (
            <Chip key={p} label={`%${p * 100}`} onPress={() => setText(amountText(Math.floor(balance * p)))} />
          ))}
          <Chip label="Tümü" selected={amount === balance && balance > 0} onPress={() => setText(amountText(balance))} />
        </View>
        <Card style={{ backgroundColor: colors.surface, borderColor: colors.surface, gap: 2 }}>
          <KeyValue label="Hesap" value={iban ? `${bankFromIban(iban) ?? 'Banka'} · ${maskIban(iban).slice(-4)}` : 'IBAN eklenmedi'} />
          <KeyValue label="Tahmini varış" value={formatDayLong(arrival)} />
          <KeyValue label="İşlem ücreti" value="Ücretsiz" tone="success" />
        </Card>
        <Text variant="footnote" color="textSecondary">
          Para çekme talepleri FAST/EFT ile gönderilir. Banka tatillerinde süre uzayabilir.
        </Text>
      </View>
    </Sheet>
  );
}

export function PayoutsScreen() {
  const { colors } = useTheme();
  const now = useNow(60_000);
  const params = useLocalSearchParams<{ withdraw?: string }>();
  const balance = useSellerStore((s) => s.balance);
  const pending = useSellerStore((s) => s.pendingBalance);
  const payouts = useSellerStore((s) => s.payouts);
  const orders = useSellerStore((s) => s.orders);
  const iban = useSellerStore((s) => s.iban);
  const setIban = useSellerStore((s) => s.setIban);
  const labels = useSellerExtras((s) => s.labels);
  const qa = useQaParam();
  const [tab, setTab] = useState<'payouts' | 'ledger'>(qa === 'ledger' ? 'ledger' : 'payouts');
  const [filter, setFilter] = useState<LedgerFilter>('all');
  const [withdraw, setWithdraw] = useState(params.withdraw === '1');
  const [ibanOpen, setIbanOpen] = useState(false);
  const qaOffset = useQaOffset();

  const paidOut = payouts.reduce((s, p) => s + p.amount, 0);
  const earned = orders.filter((o) => o.status !== 'cancelled' && o.status !== 'refunded').reduce((s, o) => s + orderNet(o), 0);
  const total = Math.max(earned, balance + pending + paidOut);
  const ledger = buildLedger(orders, payouts, labels, now);
  const filtered = ledger.filter((e: LedgerEntry) =>
    filter === 'all' ? true : filter === 'payout' ? e.kind === 'payout' : e.status === filter,
  );

  const openWithdraw = () => {
    if (balance <= 0) {
      toast('Çekilebilir bakiyen yok. Siparişlerin kargolanınca bakiyene geçer.', 'information-circle');
      return;
    }
    setWithdraw(true);
  };

  return (
    <Screen>
      <Header title="Ödemeler" right={<IconButton name="help-circle-outline" onPress={() => router.push('/settings/help')} accessibilityLabel="Yardım" />} />
      <ScrollView contentOffset={qaOffset} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.hero, { backgroundColor: colors.inverse }]}>
          <Text variant="subhead" color={colors.onInverse} style={{ opacity: 0.7 }}>
            Çekilebilir bakiye
          </Text>
          <Text variant="display" color={colors.onInverse} numberOfLines={1} adjustsFontSizeToFit>
            {formatTRY(balance, { cents: true })}
          </Text>
          <Button title="Para Çek" icon="arrow-up-circle" size="lg" fullWidth onPress={openWithdraw} style={{ marginTop: 10 }} />
          <View style={[styles.heroCols, { borderTopColor: tint(colors.onInverse, 0.15) }]}>
            <View style={{ flex: 1 }}>
              <Text variant="footnote" color={colors.onInverse} style={{ opacity: 0.7 }}>
                Bekleyen
              </Text>
              <Text variant="headline" weight="800" color={colors.onInverse} numberOfLines={1}>
                {formatTRY(pending, { cents: true })}
              </Text>
              <Text variant="caption" color={colors.onInverse} style={{ opacity: 0.55 }}>
                Kargolanmayı bekleyen
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="footnote" color={colors.onInverse} style={{ opacity: 0.7 }}>
                Toplam kazanç
              </Text>
              <Text variant="headline" weight="800" color={colors.onInverse} numberOfLines={1}>
                {formatTRY(total, { cents: true })}
              </Text>
              <Text variant="caption" color={colors.onInverse} style={{ opacity: 0.55 }}>
                Komisyon ve ücretler sonrası
              </Text>
            </View>
          </View>
        </View>

        <Card onPress={() => setIbanOpen(true)} style={styles.ibanRow}>
          <View style={[styles.iconCircle, { backgroundColor: colors.surface }]}>
            <Icon name="business-outline" size={20} />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="subhead" weight="700">
              {iban ? (bankFromIban(iban) ?? 'Banka hesabı') : 'IBAN ekle'}
            </Text>
            <Text variant="footnote" color={iban ? 'textSecondary' : 'danger'}>
              {iban ? maskIban(iban) : 'Kazancını çekebilmek için banka hesabı ekle'}
            </Text>
          </View>
          <Text variant="subhead" weight="700" color="accent">
            {iban ? 'Düzenle' : 'Ekle'}
          </Text>
        </Card>

        <View style={[styles.note, { backgroundColor: colors.surface }]}>
          <Icon name="time-outline" size={18} color="textSecondary" />
          <Text variant="footnote" color="textSecondary" style={{ flex: 1 }}>
            Kazancın, sipariş kargoya verildiğinde (kargo firması paketi teslim alınca) çekilebilir bakiyene geçer. Para çekme talepleri 1-2 iş günü içinde IBAN’ına geçer.
          </Text>
        </View>

        <UnderlineTabs
          equal
          value={tab}
          onChange={setTab}
          tabs={[
            { key: 'payouts', label: 'Ödemeler', count: payouts.length },
            { key: 'ledger', label: 'Hesap Hareketleri' },
          ]}
          style={{ marginHorizontal: -SCREEN_PADDING }}
        />

        {tab === 'payouts' ? (
          payouts.length ? (
            <Card padded={false}>
              {payouts.map((p, i) => {
                const d = payoutDisplay(p, now);
                return (
                  <View key={p.id} style={[styles.payout, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}>
                    <View style={[styles.iconCircle, { backgroundColor: tint(d.tone === 'success' ? colors.success : colors.warning, 0.14) }]}>
                      <Icon name={d.tone === 'success' ? 'checkmark' : 'hourglass-outline'} size={18} color={d.tone === 'success' ? colors.success : colors.warning} />
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text variant="headline" weight="800">
                        {formatTRY(p.amount, { cents: true })}
                      </Text>
                      <Text variant="footnote" color="textSecondary" numberOfLines={1}>
                        {maskIban(p.iban)} · {formatDateTime(p.createdAt)}
                      </Text>
                      {d.tone === 'warning' ? (
                        <Text variant="footnote" color="textSecondary">
                          Tahmini varış: {formatDayLong(d.arrival)}
                        </Text>
                      ) : null}
                    </View>
                    <StatusPill label={d.label} tone={d.tone} />
                  </View>
                );
              })}
            </Card>
          ) : (
            <EmptyState emoji="💸" title="Henüz para çekmedin" message="Çekilebilir bakiyeni tek dokunuşla IBAN’ına aktarabilirsin." actionLabel={balance > 0 ? 'Para Çek' : undefined} onAction={openWithdraw} style={{ paddingVertical: 28 }} />
          )
        ) : (
          <View style={{ gap: 10 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -SCREEN_PADDING }} contentContainerStyle={styles.chips}>
              {(
                [
                  ['all', 'Tümü'],
                  ['processing', 'İşlemde'],
                  ['completed', 'Tamamlandı'],
                  ['payout', 'Para çekme'],
                ] as [LedgerFilter, string][]
              ).map(([k, l]) => (
                <Chip key={k} label={l} size="sm" selected={filter === k} onPress={() => setFilter(k)} />
              ))}
            </ScrollView>
            {filtered.length ? (
              <Card padded={false}>
                {filtered.map((e, i) => (
                  <PressableScale
                    key={e.id}
                    scaleTo={0.99}
                    disabled={!e.orderId}
                    onPress={() => e.orderId && router.push(`/seller/order/${e.orderId}`)}
                    style={[styles.ledger, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}>
                    <View style={[styles.iconCircleSm, { backgroundColor: colors.surface }]}>
                      <Icon name={LEDGER_ICONS[e.kind]} size={16} color="textSecondary" />
                    </View>
                    <View style={{ flex: 1, gap: 1 }}>
                      <Text variant="subhead" weight="600" numberOfLines={1}>
                        {e.title}
                      </Text>
                      <Text variant="footnote" color="textSecondary" numberOfLines={1}>
                        {e.subtitle}
                      </Text>
                      <Text variant="caption" color="textTertiary">
                        {formatDateTime(e.at)} · {e.status === 'processing' ? 'İşlemde' : 'Tamamlandı'}
                      </Text>
                    </View>
                    <Text variant="subhead" weight="800" color={e.amount > 0 ? 'success' : 'text'} tabular>
                      {e.amount > 0 ? '+' : ''}
                      {formatTRY(e.amount, { cents: !Number.isInteger(e.amount) })}
                    </Text>
                  </PressableScale>
                ))}
              </Card>
            ) : (
              <EmptyState emoji="🧾" title="Hareket yok" message="Satışların, kesintiler ve para çekme işlemlerin burada listelenir." style={{ paddingVertical: 28 }} />
            )}
          </View>
        )}

        <Card style={{ gap: 8, backgroundColor: colors.surface, borderColor: colors.surface }}>
          <View style={styles.inline}>
            <Icon name="document-text-outline" size={18} color="textSecondary" />
            <Text variant="subhead" weight="700">
              Vergi bilgilendirmesi
            </Text>
          </View>
          <Text variant="footnote" color="textSecondary">
            • 1 Ocak 2025’ten itibaren e-ticaret satışlarında %1 gelir vergisi stopajı (tevkifat) uygulanır. Tevkif edilen tutar aylık ekstrende gösterilir ve beyannamende mahsup edilebilir.
          </Text>
          <Text variant="footnote" color="textSecondary">
            • Satış komisyonu ve kredi kartı ücretine %20 KDV dahildir. Gerçek sürümde bu ücretler için aylık e-Arşiv / e-Fatura düzenlenir ve hesabına yüklenir.
          </Text>
          <Text variant="footnote" color="textSecondary">
            • Şahıs şirketi ve kurumsal satıcılar her satış için alıcıya fatura düzenlemekle yükümlüdür.
          </Text>
        </Card>
      </ScrollView>

      <WithdrawSheet visible={withdraw} onClose={() => setWithdraw(false)} onNeedIban={() => setIbanOpen(true)} />
      <IbanSheet
        visible={ibanOpen}
        onClose={() => setIbanOpen(false)}
        initial={iban}
        onSave={(v) => {
          setIban(v);
          haptic.success();
          toast.success('IBAN kaydedildi');
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: SCREEN_PADDING, gap: 14, paddingBottom: 40 },
  hero: { borderRadius: radius.xl, padding: 18, gap: 2 },
  heroCols: { flexDirection: 'row', gap: 16, marginTop: 16, paddingTop: 14, borderTopWidth: StyleSheet.hairlineWidth },
  ibanRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  iconCircleSm: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  note: { flexDirection: 'row', gap: 10, padding: 12, borderRadius: radius.md },
  payout: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  ledger: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
  chips: { paddingHorizontal: SCREEN_PADDING, gap: 8 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
