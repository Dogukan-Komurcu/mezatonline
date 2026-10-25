import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Keyboard, StyleSheet, View, type TextInputInstance } from 'react-native';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';

import { Avatar, Button, Chip, Header, Icon, Text, TextField, type IconName } from '@/components/ui';
import { AuthLayout, OnboardingProgress, StepTitle } from '@/features/auth/components';
import { cancelSignup, isUsernameAvailable, normalizeUsernameInput, USERNAME_MAX, usernameFormatError, usernameSuggestions } from '@/features/auth/session';
import { useAuthFlow } from '@/features/auth/store';
import { haptic } from '@/lib/haptics';
import { useAuthStore } from '@/store/auth';
import { ForceScheme, radius, useTheme } from '@/theme';

type Check = { name: string; available: boolean };

function UsernameScreen() {
  const { colors } = useTheme();
  const flow = useAuthFlow();
  const avatar = useAuthStore((s) => s.me.avatar);
  const [value, setValue] = useState(flow.username);
  const [displayName, setDisplayName] = useState(flow.displayName);
  const [checked, setChecked] = useState<Check | null>(flow.username ? { name: flow.username, available: isUsernameAvailable(flow.username) } : null);
  const [salt] = useState(() => Math.floor(Math.random() * 1000));
  const inputRef = useRef<TextInputInstance>(null);
  const nameRef = useRef<TextInputInstance>(null);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 380);
    return () => clearTimeout(t);
  }, []);

  const formatError = usernameFormatError(value);

  // Canlı müsaitlik kontrolü (sahte ağ gecikmesi)
  useEffect(() => {
    if (!value || formatError) return;
    const t = setTimeout(() => setChecked({ name: value, available: isUsernameAvailable(value) }), 450);
    return () => clearTimeout(t);
  }, [value, formatError]);

  const status: 'idle' | 'invalid' | 'checking' | 'available' | 'taken' = !value
    ? 'idle'
    : formatError
      ? 'invalid'
      : checked?.name === value
        ? checked.available
          ? 'available'
          : 'taken'
        : 'checking';

  const seed = status === 'taken' || status === 'invalid' ? value : displayName || flow.email || value;
  const suggestions = usernameSuggestions(seed, salt).filter((s) => s !== value);

  const pick = (name: string) => {
    haptic.tap();
    setValue(name);
    setChecked({ name, available: isUsernameAvailable(name) });
  };

  const submit = () => {
    if (status !== 'available') {
      haptic.warning();
      return;
    }
    Keyboard.dismiss();
    haptic.success();
    flow.setUsername(value, displayName.trim());
    router.push('/(auth)/gender');
  };

  const onBack = () => {
    Alert.alert('Kayıttan çıkılsın mı?', 'Hesabını oluşturmayı henüz bitirmedin. Çıkarsan tekrar kaydolman gerekecek.', [
      { text: 'Devam et', style: 'cancel' },
      { text: 'Kayıttan çık', style: 'destructive', onPress: cancelSignup },
    ]);
  };

  const statusIcon =
    status === 'checking' ? (
      <ActivityIndicator size="small" color={colors.textSecondary} />
    ) : status === 'available' ? (
      <Icon name="checkmark-circle" size={22} color="success" />
    ) : status === 'taken' || status === 'invalid' ? (
      <Icon name="close-circle" size={22} color="danger" />
    ) : undefined;

  const hint =
    status === 'invalid' ? (
      <Hint icon="alert-circle" color="danger" text={formatError ?? ''} />
    ) : status === 'taken' ? (
      <Hint icon="close-circle" color="danger" text={`@${value} alınmış. Aşağıdaki önerilerden birini dene.`} />
    ) : status === 'available' ? (
      <Hint icon="checkmark-circle" color="success" text={`@${value} kullanılabilir!`} />
    ) : status === 'checking' ? (
      <Hint icon="time-outline" color="textSecondary" text="Kontrol ediliyor…" />
    ) : (
      <Hint icon="information-circle-outline" color="textTertiary" text="Küçük harf, rakam ve alt çizgi (_) kullanabilirsin. Boşluk ve özel karakter yok." />
    );

  return (
    <AuthLayout
      header={
        <>
          <Header back="close" onBack={onBack} title="Profilini oluştur" />
          <OnboardingProgress step="username" />
        </>
      }
      footer={<Button title="Devam" size="lg" fullWidth disabled={status !== 'available'} onPress={submit} />}>
      <StepTitle title="Kullanıcı adını oluştur" subtitle="Alıcılar ve satıcılar seni bu adla görecek. Akılda kalıcı, kolay yazılan bir ad seç." />

      <View style={[styles.preview, { backgroundColor: colors.surface }]}>
        <Avatar uri={avatar} name={value || 'mezat'} size={44} />
        <View style={styles.previewText}>
          <Text variant="headline" numberOfLines={1}>
            {displayName.trim() || 'Görünen adın'}
          </Text>
          <Text variant="subhead" color={status === 'available' ? 'success' : 'textSecondary'} numberOfLines={1}>
            @{value || 'kullanici_adin'}
          </Text>
        </View>
      </View>

      <View style={styles.form}>
        <View style={styles.fieldBlock}>
          <TextField
            ref={inputRef}
            label="Kullanıcı adı"
            prefix="@"
            value={value}
            onChangeText={(t) => setValue(normalizeUsernameInput(t))}
            placeholder="kullanici_adin"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="username-new"
            textContentType="username"
            spellCheck={false}
            maxLength={USERNAME_MAX}
            returnKeyType="next"
            onSubmitEditing={() => nameRef.current?.focus()}
            right={statusIcon}
          />
          <View style={styles.hintRow}>
            <View style={styles.hintFlex}>{hint}</View>
            <Text variant="footnote" color="textTertiary" tabular>
              {value.length}/{USERNAME_MAX}
            </Text>
          </View>
        </View>

        {suggestions.length ? (
          <Animated.View layout={LinearTransition} entering={FadeIn} style={styles.suggestions}>
            <Text variant="subhead" weight="700" color="textSecondary">
              Öneriler
            </Text>
            <View style={styles.chips}>
              {suggestions.map((s) => (
                <Chip key={s} label={`@${s}`} size="md" onPress={() => pick(s)} />
              ))}
            </View>
          </Animated.View>
        ) : null}

        <TextField
          ref={nameRef}
          label="Görünen ad (isteğe bağlı)"
          value={displayName}
          onChangeText={(t) => setDisplayName(t.slice(0, 40))}
          placeholder="Örn. Ayşe K. ya da mağaza adın"
          autoCapitalize="words"
          autoComplete="name"
          textContentType="name"
          returnKeyType="done"
          onSubmitEditing={submit}
          icon="person-outline"
          helper="Profilinde kullanıcı adının üstünde görünür. İstediğin zaman değiştirebilirsin."
        />
      </View>
    </AuthLayout>
  );
}

function Hint({ icon, color, text }: { icon: IconName; color: 'danger' | 'success' | 'textSecondary' | 'textTertiary'; text: string }) {
  return (
    <View style={styles.hint}>
      <Icon name={icon} size={15} color={color} />
      <Text variant="footnote" color={color} style={styles.hintFlex}>
        {text}
      </Text>
    </View>
  );
}

export default function Username() {
  return (
    <ForceScheme scheme="dark">
      <UsernameScreen />
    </ForceScheme>
  );
}

const styles = StyleSheet.create({
  preview: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: radius.lg, marginBottom: 20 },
  previewText: { flex: 1, gap: 1 },
  form: { gap: 20 },
  fieldBlock: { gap: 0 },
  hintRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 8, paddingHorizontal: 2 },
  hint: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  hintFlex: { flex: 1 },
  suggestions: { gap: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
