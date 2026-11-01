import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Chip, Header, Icon, Screen, Segmented, Sheet, Text, TextField, toast } from '@/components/ui';
import {
  formatMinutes,
  periodEnd,
  periodStart,
  SPEND_PRESETS,
  useAccountStore,
  WATCH_PRESETS,
  watchMinutes,
  type ControlKind,
  type ControlPeriod,
  type ControlType,
} from '@/features/account/store';
import { IconCircle, InfoNote, MenuGroup, MenuRow, OutlineCard, PinSheet, ProgressBar, SwitchRow, Tag } from '@/features/account/ui';
import { useQaParams } from '@/features/account/qa';
import { formatDayLong, formatTRY } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { useOrdersStore } from '@/store/orders';
import { radius, SCREEN_PADDING, useTheme } from '@/theme';

const PERIOD_LABEL: Record<ControlPeriod, string> = { weekly: 'Bu hafta', monthly: 'Bu ay' };
const PERIOD_ADJ: Record<ControlPeriod, string> = { weekly: 'Haftalık', monthly: 'Aylık' };
const TYPE_LABEL: Record<ControlType, string> = { reminder: 'hatırlatıcı', limit: 'limit' };
const KIND_LABEL: Record<ControlKind, string> = { watch: 'izleme süresi', spend: 'harcama' };

type Editing = { kind: ControlKind; type: ControlType } | null;
type PinFlow = { mode: 'create' | 'verify'; then?: Editing | 'change' } | null;

function fmt(kind: ControlKind, v: number) {
  return kind === 'watch' ? formatMinutes(v) : formatTRY(v);
}

export default function AccountControlsScreen() {
  const qa = useQaParams();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const pin = useAccountStore((s) => s.pin);
  const watch = useAccountStore((s) => s.watch);
  const spend = useAccountStore((s) => s.spend);
  const dmEnabled = useAccountStore((s) => s.dmEnabled);
  const privateEntry = useAccountStore((s) => s.privateEntry);
  const activityStatus = useAccountStore((s) => s.activityStatus);
  const setPin = useAccountStore((s) => s.setPin);
  const setControl = useAccountStore((s) => s.setControl);
  const setFlag = useAccountStore((s) => s.setFlag);
  const orders = useOrdersStore((s) => s.orders);

  const [now] = useState(() => new Date());
  const [period, setPeriod] = useState<ControlPeriod>('weekly');
  const [unlocked, setUnlocked] = useState(false);
  const [pinFlow, setPinFlow] = useState<PinFlow>(null);
  const [editing, setEditing] = useState<Editing>(null);
  const [draft, setDraft] = useState('');

  const start = periodStart(period, now).getTime();
  const resetAt = periodEnd(period, now);
  const spent = orders.filter((o) => o.status !== 'cancelled' && o.status !== 'refunded' && new Date(o.createdAt).getTime() >= start).reduce((s, o) => s + o.total, 0);
  const watched = watchMinutes(period, now);
  const usage: Record<ControlKind, number> = { watch: watched, spend: Math.round(spent) };
  const values = { watch: watch[period], spend: spend[period] };

  const openEditor = (target: NonNullable<Editing>) => {
    const current = values[target.kind][target.type];
    setDraft(current ? String(target.kind === 'watch' ? Math.round(current / 60) : current) : '');
    setEditing(target);
  };

  const requestEdit = (target: NonNullable<Editing>) => {
    haptic.tap();
    if (!pin) setPinFlow({ mode: 'create', then: target });
    else if (!unlocked) setPinFlow({ mode: 'verify', then: target });
    else openEditor(target);
  };

  const onPinSuccess = (value: string) => {
    const flow = pinFlow;
    setPinFlow(null);
    if (flow?.mode === 'create') {
      setPin(value);
      toast.success('PIN oluşturuldu', 'lock-closed');
    }
    setUnlocked(true);
    if (flow?.then === 'change') setTimeout(() => setPinFlow({ mode: 'create' }), 320);
    else if (flow?.then) {
      const target = flow.then;
      setTimeout(() => openEditor(target), 320);
    }
  };

  const save = (value: number | undefined) => {
    if (!editing) return;
    const { kind, type } = editing;
    const used = usage[kind];
    if (type === 'limit' && value === undefined && values[kind].limit !== undefined && used >= values[kind].limit!) {
      haptic.warning();
      toast.warning('Limitine ulaştın; dönem sonuna kadar kaldırılamaz.', 'lock-closed');
      return;
    }
    if (type === 'limit' && value !== undefined && values[kind].limit !== undefined && used >= values[kind].limit! && value > values[kind].limit!) {
      haptic.warning();
      toast.warning('Ulaşılan bir limit dönem bitmeden yükseltilemez.', 'lock-closed');
      return;
    }
    setControl(kind, period, type, value);
    setEditing(null);
    haptic.success();
    toast.success(value === undefined ? `${PERIOD_ADJ[period]} ${KIND_LABEL[kind]} ${TYPE_LABEL[type]} kapatıldı` : `${PERIOD_ADJ[period]} ${TYPE_LABEL[type]}: ${fmt(kind, value)}`);
  };

  const draftValue = (() => {
    const n = parseInt(draft.replace(/\D/g, ''), 10);
    if (!n || !editing) return undefined;
    return editing.kind === 'watch' ? n * 60 : n;
  })();

  return (
    <Screen>
      <Header title="Hesap Kontrolleri" />
      <ScrollView contentOffset={qa.offset} contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
        <View style={styles.pad}>
          <Text variant="subhead" color="textSecondary">
            İzleme süreni ve harcamalarını kontrol altında tut. Hatırlatıcılar seni bilgilendirir; limitler ise dönem sonuna kadar izlemeyi ya da harcamayı durdurur.
          </Text>

          {!pin ? (
            <View style={[styles.pinCard, { backgroundColor: colors.primary }]}>
              <IconCircle name="lock-closed" size={44} bg={colors.onPrimary} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text variant="headline" color={colors.onPrimary}>
                  Hesap Kontrolleri PIN'i oluştur
                </Text>
                <Text variant="footnote" color={colors.onPrimary} style={{ opacity: 0.75 }}>
                  Hatırlatıcı ve limitlerini 4 haneli bir PIN ile koru.
                </Text>
              </View>
              <Button title="Oluştur" variant="inverse" size="sm" onPress={() => setPinFlow({ mode: 'create' })} />
            </View>
          ) : null}

          <Segmented<ControlPeriod>
            value={period}
            onChange={setPeriod}
            options={[
              { key: 'weekly', label: 'Haftalık' },
              { key: 'monthly', label: 'Aylık' },
            ]}
            style={{ marginTop: 16 }}
          />
        </View>

        {(['watch', 'spend'] as ControlKind[]).map((kind) => {
          const v = values[kind];
          const used = usage[kind];
          const cap = v.limit ?? v.reminder;
          const reached = v.limit !== undefined && used >= v.limit;
          const reminded = v.reminder !== undefined && used >= v.reminder;
          return (
            <View key={kind} style={[styles.pad, { marginTop: 16 }]}>
              <OutlineCard style={{ gap: 12 }}>
                <View style={styles.cardHead}>
                  <IconCircle name={kind === 'watch' ? 'time-outline' : 'card-outline'} />
                  <View style={{ flex: 1 }}>
                    <Text variant="headline">{kind === 'watch' ? 'İzleme süresi' : 'Harcama'}</Text>
                    <Text variant="footnote" color="textSecondary">
                      {PERIOD_LABEL[period]}
                      {kind === 'spend' ? ' · kargo ve hizmet bedeli dahil' : ' · canlı yayınlarda'}
                    </Text>
                  </View>
                  {reached ? <Tag label="Limite ulaşıldı" tone="danger" /> : reminded ? <Tag label="Hatırlatıcı aşıldı" tone="warning" /> : null}
                </View>
                <Text variant="title1" tabular>
                  {fmt(kind, used)}
                </Text>
                {cap ? (
                  <View style={{ gap: 6 }}>
                    <ProgressBar value={used / cap} tone={reached ? 'danger' : undefined} />
                    <Text variant="footnote" color="textSecondary">
                      {v.limit ? `Limit ${fmt(kind, v.limit)}` : `Hatırlatıcı ${fmt(kind, v.reminder!)}`} · {used >= cap ? 'aşıldı' : `${fmt(kind, cap - used)} kaldı`}
                    </Text>
                  </View>
                ) : null}
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <MenuRow
                  icon="alarm-outline"
                  title="Hatırlatıcı"
                  value={v.reminder ? fmt(kind, v.reminder) : 'Ayarla'}
                  valueTone={v.reminder ? 'text' : 'accent'}
                  onPress={() => requestEdit({ kind, type: 'reminder' })}
                  style={styles.innerRow}
                />
                <MenuRow
                  icon="hand-left-outline"
                  title="Limit"
                  value={v.limit ? fmt(kind, v.limit) : 'Ayarla'}
                  valueTone={v.limit ? 'text' : 'accent'}
                  onPress={() => requestEdit({ kind, type: 'limit' })}
                  style={styles.innerRow}
                />
              </OutlineCard>
            </View>
          );
        })}

        <View style={[styles.pad, { marginTop: 12 }]}>
          <InfoNote icon="refresh-outline">
            {period === 'weekly' ? 'Hafta her Pazartesi 00:00’da' : 'Ay her ayın 1’inde'} sıfırlanır (Türkiye saati). Sonraki sıfırlama: {formatDayLong(resetAt)}. Ulaşılan bir limit dönem sonuna kadar kaldırılamaz.
          </InfoNote>
        </View>

        <MenuGroup title="Sosyal ayarlar">
          <SwitchRow
            icon="chatbubbles-outline"
            title="Doğrudan mesajlar"
            subtitle="Kapalıyken kimse sana mesaj gönderemez"
            value={dmEnabled}
            onChange={(v) => {
              setFlag('dmEnabled', v);
              toast(v ? 'Doğrudan mesajlar açıldı' : 'Doğrudan mesajlar kapatıldı', 'chatbubbles-outline');
            }}
          />
          <SwitchRow icon="eye-off-outline" title="Gizli giriş" subtitle="Bir yayını açtığında sohbette adınla bir giriş satırı çıkmaz" value={privateEntry} onChange={(v) => setFlag('privateEntry', v)} />
          <SwitchRow icon="pulse-outline" title="Etkinlik durumu" subtitle="Arkadaşların hangi yayını izlediğini görebilir" value={activityStatus} onChange={(v) => setFlag('activityStatus', v)} />
        </MenuGroup>

        {pin ? (
          <MenuGroup title="Güvenlik">
            <MenuRow
              icon="key-outline"
              title="PIN'i değiştir"
              subtitle="Önce mevcut PIN'ini girmen gerekir"
              onPress={() => setPinFlow({ mode: 'verify', then: 'change' })}
            />
          </MenuGroup>
        ) : null}
      </ScrollView>

      <PinSheet
        visible={!!pinFlow}
        mode={pinFlow?.mode ?? 'verify'}
        expected={pin}
        onClose={() => setPinFlow(null)}
        onSuccess={onPinSuccess}
        onForgot={() => {
          setPinFlow(null);
          toast("PIN'ini sıfırlamak için destek ekibimize yaz", 'chatbubbles-outline');
          setTimeout(() => router.push('/inbox/support'), 300);
        }}
      />

      <Sheet
        visible={!!editing}
        onClose={() => setEditing(null)}
        title={editing ? `${PERIOD_ADJ[period]} ${KIND_LABEL[editing.kind]} ${TYPE_LABEL[editing.type]}` : ''}
        subtitle={
          editing?.type === 'limit'
            ? editing.kind === 'watch'
              ? 'Dönem bitene kadar canlı yayınlar senin için kapanır. Bu süre içinde mağazalardan alışveriş açık kalır.'
              : 'Dönem bitene kadar teklif ve satın alma düğmeleri kilitlenir. Yayınları izlemeye ise devam edebilirsin.'
            : 'Bu değere geldiğinde ekranı kaplayan bir uyarı çıkar; kapatıp kaldığın yerden devam edebilirsin.'
        }
        showClose
        footer={
          <View style={{ gap: 8 }}>
            <Button title="Kaydet" size="lg" fullWidth disabled={!draftValue} onPress={() => save(draftValue)} />
            {editing && values[editing.kind][editing.type] !== undefined ? (
              <Button title={`${TYPE_LABEL[editing.type][0].toLocaleUpperCase('tr-TR')}${TYPE_LABEL[editing.type].slice(1)} kapat`} variant="ghost" fullWidth onPress={() => save(undefined)} />
            ) : null}
          </View>
        }>
        {editing ? (
          <View style={{ gap: 14 }}>
            <View style={styles.presets}>
              {(editing.kind === 'watch' ? WATCH_PRESETS : SPEND_PRESETS).map((p) => {
                const label = editing.kind === 'watch' ? `${p / 60} sa` : formatTRY(p);
                const raw = String(editing.kind === 'watch' ? p / 60 : p);
                return <Chip key={p} label={label} selected={draft === raw} onPress={() => setDraft(raw)} />;
              })}
            </View>
            <TextField
              label={editing.kind === 'watch' ? 'Özel süre (saat)' : 'Özel tutar'}
              prefix={editing.kind === 'spend' ? '₺' : undefined}
              value={draft}
              onChangeText={(v) => setDraft(v.replace(/\D/g, '').slice(0, editing.kind === 'watch' ? 3 : 7))}
              keyboardType="number-pad"
              placeholder={editing.kind === 'watch' ? 'Örn. 8' : 'Örn. 2000'}
              right={editing.kind === 'watch' ? <Text color="textSecondary">saat</Text> : null}
            />
            <View style={[styles.usageBox, { backgroundColor: colors.surface }]}>
              <Icon name="stats-chart-outline" size={18} color="textSecondary" />
              <Text variant="footnote" color="textSecondary" style={{ flex: 1 }}>
                {PERIOD_LABEL[period]} şu ana kadar: <Text variant="footnote" weight="700">{fmt(editing.kind, usage[editing.kind])}</Text>
              </Text>
            </View>
          </View>
        ) : null}
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: SCREEN_PADDING },
  pinCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius.lg, marginTop: 16 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: -16 },
  innerRow: { paddingHorizontal: 0, minHeight: 48, paddingVertical: 4 },
  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  usageBox: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: radius.md },
});
