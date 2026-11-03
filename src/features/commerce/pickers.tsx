/**
 * Ödeme ekranındaki seçim sayfaları: teslimat adresi ve kart (ekleme formları dahil).
 */
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Icon, PressableScale, Sheet, Text, toast } from '@/components/ui';
import { DEMO_COPY } from '@/config/demo';
import { AddressForm, CardForm, emptyAddress, emptyCard, TestCardHint, validateAddress, validateCard, type AddressDraft, type CardDraft } from '@/features/wallet/forms';
import { formatPhone } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { useMe } from '@/store/auth';
import { useWalletStore } from '@/store/wallet';
import { radius, useTheme } from '@/theme';

import { CardBrandMark } from './components';
import { addressLine } from './utils';

function Radio({ on }: { on: boolean }) {
  return <Icon name={on ? 'radio-button-on' : 'radio-button-off'} size={22} color={on ? 'text' : 'textTertiary'} />;
}

// ─── Adres ───────────────────────────────────────────────────────────────────

export function AddressPickerSheet({ visible, onClose, selectedId, onSelect, startWithForm }: { visible: boolean; onClose: () => void; selectedId?: string; onSelect: (id: string) => void; startWithForm?: boolean }) {
  const { colors } = useTheme();
  const me = useMe();
  const addresses = useWalletStore((s) => s.addresses);
  const addAddress = useWalletStore((s) => s.addAddress);
  const [mode, setMode] = useState<'list' | 'add'>('list');
  const [draft, setDraft] = useState<AddressDraft>(() => emptyAddress(me.displayName));
  const [errors, setErrors] = useState<Partial<Record<keyof AddressDraft, string>>>({});

  useEffect(() => {
    if (visible) {
      setMode(startWithForm || addresses.length === 0 ? 'add' : 'list');
      setErrors({});
    }
  }, [visible, startWithForm, addresses.length]);

  const save = () => {
    const e = validateAddress(draft);
    setErrors(e);
    if (Object.keys(e).length) {
      haptic.error();
      return;
    }
    onClose();
    const created = addAddress(draft);
    onSelect(created.id);
    setDraft(emptyAddress(me.displayName));
    haptic.success();
    toast.success('Adres kaydedildi', 'location');
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={mode === 'list' ? 'Teslimat adresi' : 'Yeni adres ekle'}
      showClose
      maxHeight={0.94}
      footer={
        mode === 'list' ? (
          <Button title="Yeni adres ekle" icon="add" variant="secondary" size="lg" fullWidth onPress={() => setMode('add')} />
        ) : (
          <View style={styles.footerRow}>
            {addresses.length ? <Button title="Vazgeç" variant="outline" size="lg" onPress={() => setMode('list')} /> : null}
            <Button title="Adresi kaydet" size="lg" onPress={save} style={styles.flex} />
          </View>
        )
      }>
      {mode === 'list' ? (
        <View style={styles.list}>
          {addresses.map((a) => {
            const on = a.id === selectedId;
            return (
              <PressableScale
                key={a.id}
                scaleTo={0.99}
                onPress={() => {
                  haptic.tap();
                  onSelect(a.id);
                  onClose();
                }}
                style={[styles.option, { borderColor: on ? colors.text : colors.border }]}>
                <Radio on={on} />
                <View style={styles.flexGap}>
                  <View style={styles.titleRow}>
                    <Text variant="callout" weight="700">
                      {a.title}
                    </Text>
                    {a.isDefault ? (
                      <View style={[styles.tag, { backgroundColor: colors.surface }]}>
                        <Text variant="caption" color="textSecondary">
                          Varsayılan
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  <Text variant="subhead">
                    {a.fullName} · {formatPhone(a.phone)}
                  </Text>
                  <Text variant="footnote" color="textSecondary" numberOfLines={2}>
                    {addressLine(a)}
                  </Text>
                </View>
              </PressableScale>
            );
          })}
        </View>
      ) : (
        <AddressForm value={draft} onChange={setDraft} errors={errors} />
      )}
    </Sheet>
  );
}

// ─── Kart ────────────────────────────────────────────────────────────────────

export function PaymentPickerSheet({ visible, onClose, selectedId, onSelect, startWithForm }: { visible: boolean; onClose: () => void; selectedId?: string; onSelect: (id: string) => void; startWithForm?: boolean }) {
  const { colors } = useTheme();
  const cards = useWalletStore((s) => s.paymentMethods);
  const addPaymentMethod = useWalletStore((s) => s.addPaymentMethod);
  const [mode, setMode] = useState<'list' | 'add'>('list');
  const [draft, setDraft] = useState<CardDraft>(emptyCard);
  const [errors, setErrors] = useState<Partial<Record<keyof CardDraft, string>>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setMode(startWithForm || cards.length === 0 ? 'add' : 'list');
      setErrors({});
    }
  }, [visible, startWithForm, cards.length]);

  const save = () => {
    const e = validateCard(draft);
    setErrors(e);
    if (Object.keys(e).length) {
      haptic.error();
      return;
    }
    setSaving(true);
    setTimeout(() => {
      onClose();
      const pm = addPaymentMethod({ number: draft.number, holder: draft.holder, expiry: draft.expiry });
      onSelect(pm.id);
      setSaving(false);
      setDraft(emptyCard());
      haptic.success();
      toast.success('Kart kaydedildi', 'card');
    }, 900);
  };

  return (
    <Sheet
      visible={visible}
      onClose={saving ? () => {} : onClose}
      title={mode === 'list' ? 'Ödeme yöntemi' : 'Yeni kart ekle'}
      showClose
      maxHeight={0.94}
      footer={
        mode === 'list' ? (
          <Button title="Yeni kart ekle" icon="add" variant="secondary" size="lg" fullWidth onPress={() => setMode('add')} />
        ) : (
          <View style={styles.footerRow}>
            {cards.length ? <Button title="Vazgeç" variant="outline" size="lg" disabled={saving} onPress={() => setMode('list')} /> : null}
            <Button title="Kartı kaydet" size="lg" loading={saving} onPress={save} style={styles.flex} />
          </View>
        )
      }>
      {mode === 'list' ? (
        <View style={styles.list}>
          {cards.map((c) => {
            const on = c.id === selectedId;
            return (
              <PressableScale
                key={c.id}
                scaleTo={0.99}
                onPress={() => {
                  haptic.tap();
                  onSelect(c.id);
                  onClose();
                }}
                style={[styles.option, styles.cardOption, { borderColor: on ? colors.text : colors.border }]}>
                <Radio on={on} />
                <CardBrandMark brand={c.brand} />
                <View style={styles.flexGap}>
                  <Text variant="callout" weight="700">
                    {c.bank} •••• {c.last4}
                  </Text>
                  <Text variant="footnote" color="textSecondary">
                    {c.holder} · SKT {c.expiry}
                  </Text>
                </View>
                {c.isDefault ? (
                  <View style={[styles.tag, { backgroundColor: colors.surface }]}>
                    <Text variant="caption" color="textSecondary">
                      Varsayılan
                    </Text>
                  </View>
                ) : null}
              </PressableScale>
            );
          })}
          <View style={styles.secureRow}>
            <Icon name="lock-closed" size={13} color="textTertiary" />
            <Text variant="caption" color="textTertiary" weight="500" style={styles.secureText}>
              Gerçek sürümde kart bilgilerin lisanslı bir ödeme kuruluşu tarafından şifrelenerek saklanır. {DEMO_COPY.payment}
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.formGap}>
          <CardForm value={draft} onChange={setDraft} errors={errors} />
          <TestCardHint onUse={setDraft} />
        </View>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  flexGap: { flex: 1, gap: 3 },
  list: { gap: 10, paddingBottom: 4 },
  option: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderWidth: 1.5, borderRadius: radius.md, padding: 14 },
  cardOption: { alignItems: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tag: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  footerRow: { flexDirection: 'row', gap: 10 },
  secureRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center', gap: 6, marginTop: 4 },
  secureText: { flexShrink: 1 },
  formGap: { gap: 6 },
});
