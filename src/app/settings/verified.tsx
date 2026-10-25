import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Header, Icon, Screen, Sheet, Text, toast, type IconName } from '@/components/ui';
import { useAccountStore } from '@/features/account/store';
import { BottomBar, CardBrandBadge, IconCircle, InfoNote, MenuGroup, MenuRow, OutlineCard } from '@/features/account/ui';
import { formatDate, formatTRY } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { useInboxStore } from '@/store/inbox';
import { selectDefaultPayment, useWalletStore } from '@/store/wallet';
import { SCREEN_PADDING, useTheme } from '@/theme';

const HOLD_AMOUNT = 250;

const BENEFITS: { icon: IconName; title: string; text: string }[] = [
  { icon: 'hammer-outline', title: 'Özel yayınlarda teklif ver', text: 'Bazı satıcılar yalnızca doğrulanmış alıcıların teklif vermesine izin verir.' },
  { icon: 'gift-outline', title: 'Çekilişlere katıl', text: 'Doğrulanmış alıcılara özel çekilişlerde şansını dene.' },
  { icon: 'ribbon-outline', title: 'Güvenilir alıcı rozeti', text: 'Satıcılar teklif verirken doğrulanmış olduğunu görür.' },
  { icon: 'shield-checkmark-outline', title: 'Daha güvenli hesap', text: 'Hesabın sahte işlemlere karşı ek bir katmanla korunur.' },
];

const STEPS = [
  `Varsayılan kartından ${formatTRY(HOLD_AMOUNT)} geçici ön provizyon alınır; çekim yapılmaz.`,
  'İşlemi bankanın 3D Secure ekranında onaylarsın.',
  'Provizyon 24 saat içinde otomatik olarak iptal edilir ve limitine geri yansır.',
];

type Phase = 'confirm' | 'processing' | 'done';

export default function VerifiedBuyerScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const verified = useAccountStore((s) => s.verified);
  const verifiedAt = useAccountStore((s) => s.verifiedAt);
  const verifiedCard = useAccountStore((s) => s.verifiedCardLast4);
  const markVerified = useAccountStore((s) => s.markVerified);
  const payment = useWalletStore(selectDefaultPayment);
  const [phase, setPhase] = useState<Phase>('confirm');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (phase === 'processing') {
      const t = setTimeout(() => {
        markVerified(payment?.last4);
        useInboxStore.getState().pushNotification({
          type: 'promo',
          title: 'Artık Doğrulanmış Alıcısın ✅',
          body: `${formatTRY(HOLD_AMOUNT)} ön provizyon 24 saat içinde iptal edilecek.`,
          href: '/settings/verified',
        });
        haptic.success();
        setPhase('done');
      }, 1400);
      return () => clearTimeout(t);
    }
  }, [phase, markVerified, payment]);

  const start = () => {
    if (!payment) {
      toast('Doğrulanmak için önce bir kart ekle', 'card-outline');
      router.push('/settings/add-card');
      return;
    }
    setPhase('confirm');
    setOpen(true);
  };

  return (
    <Screen>
      <Header title="Doğrulanmış Alıcı" />
      <ScrollView contentContainerStyle={{ paddingBottom: verified ? insets.bottom + 32 : 24 }}>
        <View style={styles.hero}>
          <View style={[styles.heroIcon, { backgroundColor: verified ? colors.success : colors.primary }]}>
            <Icon name={verified ? 'shield-checkmark' : 'shield-half-outline'} size={44} color={verified ? '#FFFFFF' : colors.onPrimary} />
          </View>
          <Text variant="title2" align="center">
            {verified ? 'Doğrulanmış Alıcısın' : 'Doğrulanmış Alıcı ol'}
          </Text>
          <Text variant="callout" color="textSecondary" align="center" style={{ maxWidth: 320 }}>
            {verified
              ? `${verifiedAt ? formatDate(verifiedAt) : 'Bugün'} tarihinde doğrulandın. Bu durum tüm yayınlarda geçerlidir.`
              : 'Bazı satıcılar yayınlarında yalnızca doğrulanmış alıcıların teklif vermesine izin verir. Bir kez doğrulan, tüm yayınlarda geçerli olsun.'}
          </Text>
        </View>

        {verified ? (
          <View style={styles.pad}>
            <OutlineCard style={styles.statusCard}>
              <IconCircle name="checkmark" bg={colors.success} color="#FFFFFF" />
              <View style={{ flex: 1 }}>
                <Text variant="headline">Kart ön provizyonu ile doğrulandı</Text>
                <Text variant="footnote" color="textSecondary">
                  {verifiedCard ? `•••• ${verifiedCard} · ` : ''}
                  {formatTRY(HOLD_AMOUNT)} provizyon 24 saat içinde iptal edilir
                </Text>
              </View>
            </OutlineCard>
          </View>
        ) : null}

        <MenuGroup title={verified ? 'Ayrıcalıkların' : 'Neler kazanırsın?'}>
          {BENEFITS.map((b) => (
            <View key={b.title} style={styles.benefit}>
              <IconCircle name={b.icon} />
              <View style={{ flex: 1 }}>
                <Text variant="headline">{b.title}</Text>
                <Text variant="subhead" color="textSecondary">
                  {b.text}
                </Text>
              </View>
              {verified ? <Icon name="checkmark-circle" size={20} color="success" /> : null}
            </View>
          ))}
        </MenuGroup>

        {!verified ? (
          <>
            <MenuGroup title="Nasıl çalışır?">
              <View style={[styles.pad, { gap: 12, marginTop: 4 }]}>
                {STEPS.map((s, i) => (
                  <View key={s} style={styles.step}>
                    <View style={[styles.stepNum, { backgroundColor: colors.inverse }]}>
                      <Text variant="subhead" weight="800" color={colors.onInverse}>
                        {i + 1}
                      </Text>
                    </View>
                    <Text variant="subhead" style={{ flex: 1 }}>
                      {s}
                    </Text>
                  </View>
                ))}
              </View>
            </MenuGroup>
            <MenuGroup title="Doğrulama kartı">
              {payment ? (
                <MenuRow
                  title={`${payment.bank} •••• ${payment.last4}`}
                  subtitle={`SKT ${payment.expiry} · Varsayılan kartın`}
                  right={<CardBrandBadge brand={payment.brand} size="sm" />}
                  value="Değiştir"
                  valueTone="accent"
                  onPress={() => router.push('/settings/payments')}
                />
              ) : (
                <MenuRow icon="add" title="Kart ekle" subtitle="Doğrulama için kayıtlı bir kart gerekli" onPress={() => router.push('/settings/add-card')} />
              )}
            </MenuGroup>
            <View style={[styles.pad, { marginTop: 16 }]}>
              <InfoNote>Daha önce Mezatonline'da başarılı bir alışveriş yaptıysan bazı yayınlarda otomatik olarak doğrulanmış sayılırsın.</InfoNote>
            </View>
          </>
        ) : null}
      </ScrollView>

      {!verified ? (
        <BottomBar>
          <Button title="Doğrulan" size="lg" fullWidth icon="shield-checkmark" onPress={start} />
        </BottomBar>
      ) : null}

      <Sheet visible={open} onClose={() => (phase === 'processing' ? undefined : setOpen(false))}>
        {phase === 'confirm' && payment ? (
          <View style={styles.sheet}>
            <IconCircle name="lock-closed" size={64} bg={colors.primary} color={colors.onPrimary} />
            <Text variant="title3" align="center">
              {formatTRY(HOLD_AMOUNT)} ön provizyonu onayla
            </Text>
            <Text variant="callout" color="textSecondary" align="center">
              {payment.bank} •••• {payment.last4} kartından {formatTRY(HOLD_AMOUNT)} tutarında geçici provizyon alınacak. Kartından çekim yapılmaz; provizyon 24 saat içinde iptal edilir.
            </Text>
            <View style={styles.sheetButtons}>
              <Button title="Onayla" size="lg" fullWidth onPress={() => setPhase('processing')} />
              <Button title="Vazgeç" variant="secondary" size="lg" fullWidth onPress={() => setOpen(false)} />
            </View>
          </View>
        ) : phase === 'processing' ? (
          <View style={styles.sheet}>
            <View style={[styles.spinner, { backgroundColor: colors.surface }]}>
              <ActivityIndicator size="large" color={colors.text} />
            </View>
            <Text variant="title3" align="center">
              Bankana bağlanılıyor…
            </Text>
            <Text variant="callout" color="textSecondary" align="center">
              3D Secure doğrulaması yapılıyor. Lütfen bu ekrandan ayrılma.
            </Text>
          </View>
        ) : phase === 'done' ? (
          <View style={styles.sheet}>
            <Animated.View entering={ZoomIn.springify().damping(14)}>
              <IconCircle name="checkmark" size={72} bg={colors.success} color="#FFFFFF" />
            </Animated.View>
            <Text variant="title3" align="center">
              Doğrulama tamamlandı 🎉
            </Text>
            <Text variant="callout" color="textSecondary" align="center">
              Artık doğrulanmış alıcılara özel yayınlarda teklif verebilir ve çekilişlere katılabilirsin.
            </Text>
            <View style={styles.sheetButtons}>
              <Button title="Harika!" size="lg" fullWidth onPress={() => setOpen(false)} />
            </View>
          </View>
        ) : null}
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: SCREEN_PADDING },
  hero: { alignItems: 'center', gap: 10, paddingHorizontal: SCREEN_PADDING, paddingTop: 12, paddingBottom: 8 },
  heroIcon: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  statusCard: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12 },
  benefit: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: SCREEN_PADDING, paddingVertical: 10 },
  step: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepNum: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  sheet: { alignItems: 'center', gap: 10, paddingTop: 8 },
  sheetButtons: { alignSelf: 'stretch', gap: 10, marginTop: 10 },
  spinner: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
});
