import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';

import { Button, Header, Screen, Sheet, Text, toast } from '@/components/ui';
import { BottomBar, IconCircle, InfoNote, SwitchRow } from '@/features/account/ui';
import { CardForm, emptyCard, TestCardHint, validateCard, type CardDraft } from '@/features/wallet/forms';
import { haptic } from '@/lib/haptics';
import { detectCardBrand, useWalletStore } from '@/store/wallet';
import { radius, SCREEN_PADDING, useTheme } from '@/theme';

type Phase = 'idle' | 'connecting' | 'verified' | 'saved';

const BRAND_NAME = { visa: 'Visa', mastercard: 'Mastercard', troy: 'Troy', amex: 'American Express' } as const;

export default function AddCardScreen() {
  const { colors } = useTheme();
  const cards = useWalletStore((s) => s.paymentMethods);
  const addPaymentMethod = useWalletStore((s) => s.addPaymentMethod);
  const [card, setCard] = useState<CardDraft>(emptyCard);
  const [errors, setErrors] = useState<Partial<Record<keyof CardDraft, string>>>({});
  const [makeDefault, setMakeDefault] = useState(true);
  const [phase, setPhase] = useState<Phase>('idle');

  const digits = card.number.replace(/\D/g, '');
  const brand = digits.length >= 2 ? detectCardBrand(digits) : undefined;

  // Sahte 3D Secure: bankaya bağlan (1 sn) → doğrulandı → kaydet
  useEffect(() => {
    if (phase === 'connecting') {
      const t = setTimeout(() => {
        setPhase('verified');
        haptic.success();
      }, 1000);
      return () => clearTimeout(t);
    }
    if (phase === 'verified') {
      const t = setTimeout(() => {
        addPaymentMethod({ number: card.number, holder: card.holder, expiry: card.expiry, isDefault: makeDefault });
        toast.success('Kartın kaydedildi', 'card');
        setPhase('saved');
      }, 800);
      return () => clearTimeout(t);
    }
    if (phase === 'saved') {
      // Önce doğrulama sayfası kapanır, ardından modal ekran
      const t = setTimeout(() => router.back(), 260);
      return () => clearTimeout(t);
    }
  }, [phase, addPaymentMethod, card, makeDefault]);

  const submit = () => {
    const e = validateCard(card);
    if (!Object.keys(e).length && cards.some((c) => c.last4 === digits.slice(-4) && c.expiry === card.expiry)) {
      e.number = 'Bu kart zaten kayıtlı';
    }
    setErrors(e);
    if (Object.keys(e).length) {
      haptic.error();
      return;
    }
    setPhase('connecting');
  };

  return (
    <Screen>
      <Header title="Kart ekle" back="close" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
          <CardForm
            value={card}
            onChange={(v) => {
              setCard(v);
              if (Object.keys(errors).length) setErrors({});
            }}
            errors={errors}
          />
          <View style={{ alignItems: 'flex-start' }}>
            <TestCardHint onUse={setCard} />
          </View>
          {cards.length > 0 ? (
            <SwitchRow
              title="Varsayılan kartım olsun"
              subtitle="Açık artırma kazançların bu karttan çekilir"
              value={makeDefault}
              onChange={setMakeDefault}
              style={{ paddingHorizontal: 0 }}
            />
          ) : null}
          <InfoNote icon="information-circle-outline">Visa, Mastercard ve Troy logolu kredi ve banka kartları kabul edilir. Taksit seçenekleri Hemen Al ürünlerinde ödeme adımında gösterilir.</InfoNote>
        </ScrollView>
        <BottomBar>
          <Button title="Kartı kaydet" size="lg" fullWidth icon="lock-closed" onPress={submit} />
        </BottomBar>
      </KeyboardAvoidingView>

      <Sheet visible={phase === 'connecting' || phase === 'verified'} onClose={() => {}}>
        <View style={styles.secure}>
          {phase === 'verified' || phase === 'saved' ? (
            <Animated.View entering={ZoomIn.springify().damping(14)}>
              <IconCircle name="checkmark" size={72} bg={colors.success} color="#FFFFFF" />
            </Animated.View>
          ) : (
            <View style={[styles.spinnerWrap, { backgroundColor: colors.surface }]}>
              <ActivityIndicator size="large" color={colors.text} />
            </View>
          )}
          <Text variant="title3" align="center">
            {phase === 'verified' || phase === 'saved' ? 'Kart doğrulandı' : '3D Secure doğrulaması'}
          </Text>
          <Text variant="callout" color="textSecondary" align="center">
            {phase === 'verified' || phase === 'saved'
              ? 'Doğrulama için alınan ₺1 provizyon iptal edildi.'
              : `${brand ? BRAND_NAME[brand] : 'Kart'} •••• ${digits.slice(-4)} için bankana bağlanılıyor. Kartını doğrulamak için ₺1 provizyon alınıp hemen iade edilecek.`}
          </Text>
          <View style={[styles.secureBadge, { backgroundColor: colors.surface }]}>
            <IconCircle name="shield-checkmark" size={24} bg="transparent" color={colors.success} />
            <Text variant="footnote" weight="600" color="textSecondary">
              256-bit SSL · 3D Secure
            </Text>
          </View>
        </View>
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: SCREEN_PADDING, paddingTop: 8, paddingBottom: 32, gap: 14 },
  secure: { alignItems: 'center', gap: 10, paddingVertical: 12 },
  spinnerWrap: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  secureBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill, marginTop: 6 },
});
