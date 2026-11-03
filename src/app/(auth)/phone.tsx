import { Image } from 'expo-image';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, TextInput, View, type TextInputInstance } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Button, Header, Icon, PressableScale, Sheet, showAlert, Text } from '@/components/ui';
import { AuthLayout, StepTitle } from '@/features/auth/components';
import { cleanNationalNumber, COUNTRIES, DEFAULT_COUNTRY, getCountry, isValidNational, maskNational, type Country } from '@/features/auth/countries';
import { cancelSignup } from '@/features/auth/session';
import type { PhoneMode } from '@/features/auth/store';
import { haptic } from '@/lib/haptics';
import { ForceScheme, radius, useTheme } from '@/theme';

const COPY: Record<PhoneMode, { header?: string; title: string; subtitle: string }> = {
  finish: {
    header: 'Kaydı Tamamla',
    title: 'Numaranı onaylayalım',
    subtitle: 'Hesabını açmadan önce numarana 6 haneli bir kod göndereceğiz; böylece her hesabın arkasında gerçek bir telefon olduğundan emin oluruz. Numaran profilinde görünmez.',
  },
  signup: {
    title: 'Telefon numaran nedir?',
    subtitle: 'Numarana 6 haneli bir doğrulama kodu göndereceğiz. Numaran profilinde görünmez.',
  },
  login: {
    header: 'Giriş Yap',
    title: 'Telefonla giriş yap',
    subtitle: 'Hesabına kayıtlı numarayı gir, tek kullanımlık bir giriş kodu gönderelim.',
  },
};

/** Bayrak görseli: emoji bayraklar bazı cihaz/simülatörlerde iki ayrı harf kutusu olarak geniş çiziliyor */
function Flag({ country, width = 24 }: { country: Country; width?: number }) {
  const { colors } = useTheme();
  return (
    <Image
      source={{ uri: `https://flagcdn.com/w80/${country.code.toLowerCase()}.png` }}
      style={[styles.flagImg, { width, height: Math.round(width * 0.7), backgroundColor: colors.surfaceAlt }]}
      contentFit="cover"
      cachePolicy="memory-disk"
      accessibilityLabel={country.name}
    />
  );
}

function CountrySheet({ visible, selected, onSelect, onClose }: { visible: boolean; selected: Country; onSelect: (c: Country) => void; onClose: () => void }) {
  const { colors } = useTheme();
  return (
    <Sheet visible={visible} onClose={onClose} dark title="Ülke kodu seç" showClose>
      <View style={styles.countryList}>
        {COUNTRIES.map((c) => {
          const active = c.code === selected.code;
          return (
            <PressableScale
              key={c.code}
              scaleTo={0.98}
              onPress={() => {
                haptic.tap();
                onSelect(c);
              }}
              style={[styles.countryRow, { backgroundColor: active ? colors.surfaceAlt : 'transparent' }]}>
              <Flag country={c} width={28} />
              <Text variant="body" weight="600" style={styles.countryName} numberOfLines={1}>
                {c.name}
              </Text>
              <Text variant="body" color="textSecondary" tabular>
                {c.dial}
              </Text>
              {active ? <Icon name="checkmark-circle" size={20} color="primary" /> : <View style={styles.checkSpace} />}
            </PressableScale>
          );
        })}
      </View>
    </Sheet>
  );
}

function PhoneScreen() {
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ mode?: string; country?: string; qa?: string }>();
  const mode: PhoneMode = params.mode === 'finish' || params.mode === 'login' ? params.mode : 'signup';
  const copy = COPY[mode];
  const [country, setCountry] = useState<Country>(getCountry(params.country ?? DEFAULT_COUNTRY.code));
  // Yalnızca geliştirme: ekran görüntüsü QA'sı (?qa=filled | country)
  const [digits, setDigits] = useState(() => (__DEV__ && params.qa === 'filled' ? '5321234567' : ''));
  const [focused, setFocused] = useState(false);
  const [touched, setTouched] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(() => __DEV__ && params.qa === 'country');
  const [sending, setSending] = useState(false);
  const inputRef = useRef<TextInputInstance>(null);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 380);
    return () => clearTimeout(t);
  }, []);

  const valid = isValidNational(digits, country);
  const complete = digits.length === country.length;
  const error =
    complete && !valid
      ? country.code === 'TR'
        ? 'Cep telefonu numaran 5 ile başlamalı (5XX XXX XX XX).'
        : 'Bu numara seçtiğin ülke için geçerli görünmüyor.'
      : touched && !focused && digits.length > 0 && !complete
        ? `Numara ${country.length} haneli olmalı.`
        : undefined;

  // Klavyedeki "Done" ile "Kod Gönder" art arda gelirse doğrulama ekranı iki kez açılmasın
  const submitted = useRef(false);
  useFocusEffect(
    useCallback(() => {
      submitted.current = false;
    }, []),
  );

  const send = () => {
    if (submitted.current) return;
    if (!valid) {
      setTouched(true);
      haptic.warning();
      return;
    }
    submitted.current = true;
    Keyboard.dismiss();
    setSending(true);
    setTimeout(() => {
      setSending(false);
      haptic.success();
      router.push({ pathname: '/(auth)/verify', params: { phone: digits, country: country.code, mode } });
    }, 900);
  };

  const onBack = () => {
    if (mode !== 'finish') {
      if (router.canGoBack()) router.back();
      else router.replace('/(auth)/welcome');
      return;
    }
    showAlert('Kayıttan çıkılsın mı?', 'Telefonunu doğrulamadan hesabını kullanamazsın. Çıkarsan kaydın iptal edilir.', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Kayıttan çık', style: 'destructive', onPress: cancelSignup },
    ]);
  };

  const borderColor = error ? colors.danger : focused ? colors.primary : colors.border;

  return (
    <AuthLayout
      header={<Header title={copy.header} back={mode === 'finish' ? 'close' : true} onBack={onBack} />}
      footer={
        <>
          <Button title="Kod Gönder" size="lg" fullWidth disabled={!valid} loading={sending} onPress={send} />
          <Text variant="footnote" color="textTertiary" align="center">
            Kod Gönder’e dokunarak SMS ile doğrulama kodu almayı kabul edersin. Operatörünün standart mesaj ücretleri uygulanabilir.
          </Text>
        </>
      }>
      <StepTitle title={copy.title} subtitle={copy.subtitle} />

      <Animated.View entering={FadeInDown.duration(350)}>
        <View style={[styles.field, { borderColor, backgroundColor: colors.surface }]}>
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={`Ülke kodu ${country.dial}`}
            onPress={() => {
              haptic.tap();
              Keyboard.dismiss();
              setSheetOpen(true);
            }}
            style={styles.countryBtn}>
            <Flag country={country} />
            <Text variant="body" weight="700" tabular numberOfLines={1}>
              {country.dial}
            </Text>
            <Icon name="chevron-down" size={13} color="textSecondary" />
          </PressableScale>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <Pressable style={styles.inputWrap} onPress={() => inputRef.current?.focus()}>
            <View style={styles.labelRow}>
              <Text variant="caption" color={error ? 'danger' : 'textSecondary'} numberOfLines={1} style={styles.floatLabel}>
                Telefon numarası<Text variant="caption" color="danger">*</Text>
              </Text>
              {valid ? <Icon name="checkmark-circle" size={16} color="success" /> : null}
            </View>
            <TextInput
              ref={inputRef}
              value={maskNational(digits, country)}
              onChangeText={(t) => setDigits(cleanNationalNumber(t, country))}
              onFocus={() => setFocused(true)}
              onBlur={() => {
                setFocused(false);
                setTouched(true);
              }}
              placeholder={country.placeholder}
              placeholderTextColor={colors.textTertiary}
              selectionColor={colors.primary}
              keyboardType="phone-pad"
              textContentType="telephoneNumber"
              autoComplete="tel-national"
              returnKeyType="done"
              onSubmitEditing={send}
              editable={!sending}
              style={[styles.input, { color: colors.text }]}
              accessibilityLabel="Telefon numarası"
            />
          </Pressable>
        </View>
        {error ? (
          <View style={styles.hintRow}>
            <Icon name="alert-circle" size={15} color="danger" />
            <Text variant="footnote" color="danger" style={styles.hintText}>
              {error}
            </Text>
          </View>
        ) : (
          <View style={styles.hintRow}>
            <Icon name="shield-checkmark-outline" size={15} color="textTertiary" />
            <Text variant="footnote" color="textTertiary" style={styles.hintText}>
              Numaranı yalnızca hesap güvenliği ve sipariş bildirimleri için kullanırız.
            </Text>
          </View>
        )}
      </Animated.View>

      <CountrySheet
        visible={sheetOpen}
        selected={country}
        onClose={() => setSheetOpen(false)}
        onSelect={(c) => {
          setCountry(c);
          setDigits((d) => cleanNationalNumber(d, c));
          setSheetOpen(false);
          setTimeout(() => inputRef.current?.focus(), 300);
        }}
      />
    </AuthLayout>
  );
}

export default function Phone() {
  return (
    <ForceScheme scheme="dark">
      <PhoneScreen />
    </ForceScheme>
  );
}

const styles = StyleSheet.create({
  field: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: radius.md, minHeight: 62 },
  countryBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 12, paddingRight: 8, alignSelf: 'stretch', flexGrow: 0, flexShrink: 0 },
  flagImg: { borderRadius: 3, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.18)' },
  divider: { width: StyleSheet.hairlineWidth * 2, alignSelf: 'stretch', marginVertical: 12 },
  inputWrap: { flex: 1, minWidth: 0, paddingLeft: 12, paddingRight: 12, paddingTop: 8, paddingBottom: 6 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  floatLabel: { flex: 1, fontWeight: '600' },
  input: { fontSize: 19, fontWeight: '600', paddingVertical: 4, paddingHorizontal: 0, letterSpacing: 0.3, fontVariant: ['tabular-nums'] },
  hintRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 10, paddingHorizontal: 2 },
  hintText: { flex: 1 },
  countryList: { gap: 4 },
  countryRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 12, borderRadius: radius.md },
  countryName: { flex: 1 },
  checkSpace: { width: 20 },
});
