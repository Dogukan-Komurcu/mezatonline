/**
 * 3D Secure doğrulama (mock banka sayfası).
 * 1,5 sn sonra SMS kodu otomatik doldurulur (iOS/Android SMS otomatik doldurma gibi) ya da kullanıcı herhangi bir 6 haneli kod girer.
 * Demo sürümde banka adı, kart programı markası veya şirket unvanı gösterilmez; sayfa simülasyon olarak etiketlenir.
 */
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, TextInput, View, type TextInputInstance } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Icon, Text, toast } from '@/components/ui';
import { DEMO_COPY, DEMO_MODE } from '@/config/demo';
import { formatDateTime, formatTRY } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { ForceScheme, radius, SCREEN_PADDING, useTheme, type ColorTokens } from '@/theme';
import type { PaymentMethod } from '@/types';

import { maskPhone, pad2, SECURE_PROGRAM } from './utils';

/** Kart ağına göre vurgu rengi (banka adı kullanılmaz) */
const BRAND_TINT: Record<PaymentMethod['brand'], keyof ColorTokens> = {
  visa: 'info',
  mastercard: 'warning',
  troy: 'accent',
  amex: 'success',
};
/** Şirket kurulana kadar işyeri adı yer tutucudur */
const MERCHANT_NAME = DEMO_MODE ? 'MEZATONLINE (DEMO)' : 'MEZATONLINE';

const CODE_LEN = 6;
const OTP_SECONDS = 180;

export type ThreeDSecureProps = {
  visible: boolean;
  amount: number;
  card: PaymentMethod | undefined;
  phone?: string;
  installmentLabel?: string;
  onSuccess: () => void;
  onCancel: () => void;
};

export function ThreeDSecure(props: ThreeDSecureProps) {
  return (
    <Modal visible={props.visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={props.onCancel} statusBarTranslucent>
      <ForceScheme scheme="light">{props.visible && props.card ? <BankPage {...props} card={props.card} /> : null}</ForceScheme>
    </Modal>
  );
}

function BankPage({ amount, card, phone, installmentLabel, onSuccess, onCancel }: ThreeDSecureProps & { card: PaymentMethod }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInputInstance>(null);
  const [code, setCode] = useState('');
  const [userTyped, setUserTyped] = useState(false);
  const [phase, setPhase] = useState<'otp' | 'processing'>('otp');
  const [left, setLeft] = useState(OTP_SECONDS);
  const [startedAt] = useState(() => Date.now());
  const [resendKey, setResendKey] = useState(0);
  const tint = colors[BRAND_TINT[card.brand] ?? 'info'];
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const finish = () => {
    setTimeout(() => {
      if (alive.current) onSuccess();
    }, 1100);
  };

  // Geri sayım
  useEffect(() => {
    const t = setInterval(() => setLeft((l) => Math.max(0, l - 1)), 1000);
    return () => clearInterval(t);
  }, [resendKey]);

  // SMS otomatik doldurma simülasyonu
  useEffect(() => {
    if (userTyped) return;
    const generated = String(Math.floor(100000 + Math.random() * 900000));
    let i = 0;
    let typer: ReturnType<typeof setInterval> | undefined;
    const start = setTimeout(() => {
      typer = setInterval(() => {
        i += 1;
        setCode(generated.slice(0, i));
        if (i >= CODE_LEN && typer) clearInterval(typer);
      }, 90);
    }, 1500);
    return () => {
      clearTimeout(start);
      if (typer) clearInterval(typer);
    };
  }, [userTyped, resendKey]);

  const confirm = () => {
    if (code.length < CODE_LEN) {
      haptic.error();
      toast.error('6 haneli doğrulama kodunu gir');
      return;
    }
    if (left === 0) {
      haptic.error();
      toast.error('Kodun süresi doldu. Yeni kod iste.');
      return;
    }
    haptic.light();
    setPhase('processing');
    finish();
  };

  // Otomatik doldurulan kod tamamlanınca onayla
  useEffect(() => {
    if (!userTyped && code.length === CODE_LEN && phase === 'otp') {
      const t = setTimeout(() => {
        haptic.light();
        setPhase('processing');
        finish();
      }, 450);
      return () => clearTimeout(t);
    }
  }, [code, userTyped, phase]);

  const resend = () => {
    haptic.tap();
    setCode('');
    setLeft(OTP_SECONDS);
    setUserTyped(false);
    setResendKey((k) => k + 1);
    toast('Yeni doğrulama kodu gönderildi', 'chatbox-ellipses');
  };

  const rows: [string, string][] = [
    ['İşyeri adı', MERCHANT_NAME],
    ['Tutar', formatTRY(amount, { cents: true })],
    ...(installmentLabel ? ([['Taksit', installmentLabel]] as [string, string][]) : []),
    ['İşlem tarihi', formatDateTime(startedAt)],
    ['Kart numarası', `**** **** **** ${card.last4}`],
  ];

  return (
    <View style={[styles.root, { backgroundColor: colors.bg, paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 12) }]}>
      <StatusBar style="dark" />
      <View style={[styles.bankBar, { borderBottomColor: colors.border }]}>
        <View style={styles.bankBrand}>
          <View style={[styles.bankLogo, { backgroundColor: tint }]}>
            <Text variant="footnote" weight="900" color={colors.onInverse}>
              {DEMO_MODE ? '3D' : card.bank.charAt(0)}
            </Text>
          </View>
          <Text variant="headline" weight="800" numberOfLines={1}>
            {DEMO_MODE ? 'Kartını veren banka' : card.bank}
          </Text>
        </View>
        <View style={styles.secureBadge}>
          <Icon name="shield-checkmark" size={14} color={tint} />
          <Text variant="caption" weight="700" color="textSecondary">
            {DEMO_MODE ? 'Demo · simülasyon' : SECURE_PROGRAM[card.brand]}
          </Text>
        </View>
      </View>

      {phase === 'processing' ? (
        <Animated.View entering={FadeIn} style={styles.processing}>
          <ActivityIndicator size="large" color={tint} />
          <Text variant="headline" align="center">
            İşleminiz gerçekleştiriliyor
          </Text>
          <Text variant="subhead" color="textSecondary" align="center">
            Lütfen bekleyiniz, sayfayı kapatmayınız…
          </Text>
        </Animated.View>
      ) : (
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <Text variant="title3">3D Secure Doğrulama</Text>
          <View style={[styles.table, { borderColor: colors.border }]}>
            {rows.map(([k, v], i) => (
              <View key={k} style={[styles.tableRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}>
                <Text variant="footnote" color="textSecondary">
                  {k}
                </Text>
                <Text variant="footnote" weight="700" style={styles.tableValue} numberOfLines={1}>
                  {v}
                </Text>
              </View>
            ))}
          </View>

          <Text variant="subhead" color="textSecondary">
            <Text variant="subhead" weight="700">
              {maskPhone(phone)}
            </Text>{' '}
            numaralı telefonunuza gönderilen 6 haneli doğrulama kodunu giriniz.
          </Text>

          <Pressable onPress={() => inputRef.current?.focus()} style={styles.codeRow} accessibilityLabel="Doğrulama kodu">
            {Array.from({ length: CODE_LEN }, (_, i) => {
              const filled = i < code.length;
              const active = i === code.length;
              return (
                <View key={i} style={[styles.codeBox, { borderColor: active ? tint : filled ? colors.text : colors.border, backgroundColor: colors.surface }]}>
                  <Text variant="title2" tabular>
                    {code[i] ?? ''}
                  </Text>
                </View>
              );
            })}
          </Pressable>
          <TextInput
            ref={inputRef}
            value={code}
            onChangeText={(t) => {
              setUserTyped(true);
              setCode(t.replace(/\D/g, '').slice(0, CODE_LEN));
            }}
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            autoComplete="sms-otp"
            maxLength={CODE_LEN}
            style={styles.hiddenInput}
            caretHidden
          />

          <View style={styles.timerRow}>
            <Icon name="time-outline" size={15} color={left < 30 ? 'danger' : 'textSecondary'} />
            <Text variant="footnote" color={left < 30 ? 'danger' : 'textSecondary'} tabular>
              Kalan süre {pad2(Math.floor(left / 60))}:{pad2(left % 60)}
            </Text>
            <View style={styles.flex} />
            <Text variant="footnote" weight="700" color={tint} onPress={resend} suppressHighlighting>
              Kodu tekrar gönder
            </Text>
          </View>

          <View style={styles.actions}>
            <Button title="Onayla" variant="inverse" size="lg" fullWidth disabled={code.length < CODE_LEN} onPress={confirm} />
            <Button
              title="İptal"
              variant="ghost"
              size="md"
              fullWidth
              onPress={() => {
                haptic.warning();
                onCancel();
              }}
            />
          </View>

          <View style={[styles.note, { backgroundColor: colors.surface }]}>
            <Icon name="information-circle-outline" size={16} color="textSecondary" />
            <Text variant="caption" color="textSecondary" weight="500" style={styles.flex}>
              {DEMO_MODE
                ? `Demo: Bu sayfa banka doğrulamasının simülasyonudur; SMS gönderilmez, kod otomatik doldurulur. Gerçek sürümde bu adım kartınızı veren bankanın sayfasında yapılır. ${DEMO_COPY.payment}`
                : 'Bu sayfa kartınızı veren banka tarafından görüntülenmektedir. Doğrulama kodunu kimseyle paylaşmayınız. Mezatonline sizden asla şifre veya doğrulama kodu istemez.'}
            </Text>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  bankBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SCREEN_PADDING, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, gap: 10 },
  bankBrand: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  bankLogo: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  secureBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  body: { padding: SCREEN_PADDING, gap: 16 },
  table: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.md },
  tableRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, gap: 12 },
  tableValue: { flexShrink: 1, textAlign: 'right' },
  codeRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  codeBox: { flex: 1, aspectRatio: 0.85, maxHeight: 60, borderRadius: radius.sm, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  hiddenInput: { position: 'absolute', width: 1, height: 1, opacity: 0 },
  timerRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actions: { gap: 4 },
  note: { flexDirection: 'row', gap: 8, padding: 12, borderRadius: radius.md },
  processing: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
});
