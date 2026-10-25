/**
 * IBAN ekle / düzenle sayfası (TR + 24 hane, mod-97 kontrolü, banka tespiti, ad eşleşmesi notu)
 */
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Icon, Sheet, Text, TextField } from '@/components/ui';
import { useMe } from '@/store/auth';
import { useTheme } from '@/theme';

import { bankFromIban, groupIbanDigits, isValidIban, normalizeIban } from './logic';
import { useSellerExtras } from './store';
import { tint } from './ui';

/** IBAN rakam girişi alanı (TR öneki sabit) */
export function IbanField({ digits, onChange, error }: { digits: string; onChange: (d: string) => void; error?: string }) {
  const { colors } = useTheme();
  const full = `TR${digits}`;
  const complete = digits.length === 24;
  const valid = complete && isValidIban(full);
  const bank = digits.length >= 7 ? bankFromIban(full) : undefined;
  return (
    <View style={{ gap: 8 }}>
      <TextField
        label="IBAN"
        prefix="TR"
        value={groupIbanDigits(digits)}
        onChangeText={(t) => onChange(t.replace(/\D/g, '').slice(0, 24))}
        keyboardType="number-pad"
        placeholder="00 0000 0000 0000 0000 0000 00"
        error={error ?? (complete && !valid ? 'IBAN doğrulanamadı, rakamları kontrol et' : undefined)}
        right={valid ? <Icon name="checkmark-circle" size={20} color={colors.success} /> : undefined}
        autoCorrect={false}
      />
      {bank ? (
        <View style={[styles.bank, { backgroundColor: tint(colors.info, 0.1) }]}>
          <Icon name="business" size={16} color={colors.info} />
          <Text variant="footnote" weight="700" color={colors.info}>
            {bank}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

export function IbanSheet({ visible, onClose, initial, onSave }: { visible: boolean; onClose: () => void; initial?: string; onSave: (iban: string) => void }) {
  const { colors } = useTheme();
  const me = useMe();
  const legalName = useSellerExtras((s) => s.kyc?.legalName) || me.displayName;
  const [digits, setDigits] = useState(initial ? normalizeIban(initial).slice(2) : '');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (visible) {
      setDigits(initial ? normalizeIban(initial).slice(2) : '');
      setSubmitted(false);
    }
  }, [visible, initial]);

  const iban = `TR${digits}`;
  const valid = digits.length === 24 && isValidIban(iban);

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={initial ? "IBAN'ı düzenle" : 'IBAN ekle'}
      subtitle="Kazançların bu hesaba aktarılır"
      showClose
      footer={
        <Button
          title="Kaydet"
          size="lg"
          fullWidth
          onPress={() => {
            setSubmitted(true);
            if (!valid) return;
            onSave(iban);
            onClose();
          }}
        />
      }>
      <View style={{ gap: 14 }}>
        <IbanField digits={digits} onChange={setDigits} error={submitted && !valid ? (digits.length < 24 ? 'IBAN 24 haneden oluşmalı' : 'Geçersiz IBAN') : undefined} />
        <View style={[styles.note, { backgroundColor: colors.surface }]}>
          <Icon name="person-circle-outline" size={20} color="textSecondary" />
          <View style={{ flex: 1 }}>
            <Text variant="footnote" color="textSecondary">
              Hesap sahibi
            </Text>
            <Text variant="callout" weight="700">
              {legalName}
            </Text>
            <Text variant="footnote" color="textSecondary" style={{ marginTop: 4 }}>
              IBAN’daki hesap sahibi adı, kimlik bilgilerindeki adınla (ya da şirket unvanınla) aynı olmalı. Aksi halde ödeme bankadan iade edilir.
            </Text>
          </View>
        </View>
        {__DEV__ ? (
          <Text variant="footnote" weight="700" color="accent" onPress={() => setDigits('330006100519786457841326')} suppressHighlighting>
            Test IBAN’ı kullan (geliştirici)
          </Text>
        ) : null}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  bank: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  note: { flexDirection: 'row', gap: 10, padding: 12, borderRadius: 12 },
});
