import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Logo } from '@/components/Logo';
import { Header, Text } from '@/components/ui';
import { AuthLayout, AuthOptionButton, OrDivider } from '@/features/auth/components';
import { LegalFooter, useLegalSheet } from '@/features/auth/legal';
import { loginAndFinish } from '@/features/auth/session';
import type { AuthProvider } from '@/features/auth/store';
import { haptic } from '@/lib/haptics';
import { ForceScheme } from '@/theme';

type SocialProvider = Extract<AuthProvider, 'google' | 'apple' | 'facebook'>;

function LoginScreen() {
  const legal = useLegalSheet();
  const [pending, setPending] = useState<SocialProvider | null>(null);

  // Sahte OAuth girişi: mevcut hesap → doğrudan ana sayfa
  useEffect(() => {
    if (!pending) return;
    const t = setTimeout(() => {
      haptic.success();
      loginAndFinish(pending);
    }, 1100);
    return () => clearTimeout(t);
  }, [pending]);

  const busy = pending !== null;

  const goSignup = () => {
    haptic.tap();
    if (router.canGoBack()) router.back();
    else router.replace('/(auth)/welcome');
  };

  return (
    <AuthLayout
      header={<Header back="close" />}
      footer={
        <Text variant="callout" color="textSecondary" align="center">
          Hesabın yok mu?{' '}
          <Text variant="callout" weight="800" style={styles.underline} onPress={goSignup} suppressHighlighting>
            Kaydol
          </Text>
        </Text>
      }>
      <Animated.View entering={FadeInDown.duration(400)} style={styles.hero}>
        <Logo size={30} iconOnly />
        <Text variant="title1" align="center" style={styles.title}>
          Tekrar hoş geldin
        </Text>
        <Text variant="callout" color="textSecondary" align="center">
          Mezatonline hesabına giriş yap; takip ettiğin satıcılar seni bekliyor.
        </Text>
      </Animated.View>

      <View style={styles.options}>
        <AuthOptionButton icon="logo-google" label="Google ile giriş yap" loading={pending === 'google'} disabled={busy} onPress={() => setPending('google')} />
        <AuthOptionButton icon="logo-apple" label="Apple ile giriş yap" loading={pending === 'apple'} disabled={busy} onPress={() => setPending('apple')} />
        <AuthOptionButton icon="logo-facebook" label="Facebook ile giriş yap" loading={pending === 'facebook'} disabled={busy} onPress={() => setPending('facebook')} />
        <OrDivider />
        <AuthOptionButton
          icon="mail-outline"
          label="E-posta veya kullanıcı adı"
          disabled={busy}
          onPress={() => router.push({ pathname: '/(auth)/email', params: { mode: 'login' } })}
        />
        <AuthOptionButton
          icon="phone-portrait-outline"
          label="Telefon numarası"
          disabled={busy}
          onPress={() => router.push({ pathname: '/(auth)/phone', params: { mode: 'login' } })}
        />
      </View>

      <View style={styles.legal}>
        <LegalFooter onOpen={legal.open} prefix="Giriş yaparak" />
      </View>
      {legal.sheet}
    </AuthLayout>
  );
}

export default function Login() {
  return (
    <ForceScheme scheme="dark">
      <LoginScreen />
    </ForceScheme>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: 10, marginTop: 8, marginBottom: 28 },
  title: { marginTop: 8, letterSpacing: -0.4 },
  options: { gap: 10 },
  legal: { marginTop: 24 },
  underline: { textDecorationLine: 'underline' },
});
