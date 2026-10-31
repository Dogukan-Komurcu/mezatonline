import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { BackHandler, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Logo } from '@/components/Logo';
import { Button, Icon, PressableScale, Text, toast } from '@/components/ui';
import { AuthOptionButton, withAlpha } from '@/features/auth/components';
import { LegalFooter, useLegalSheet } from '@/features/auth/legal';
import { cancelAuthGate, useAuthGate } from '@/features/auth/gate';
import { startSignup } from '@/features/auth/session';
import type { AuthProvider } from '@/features/auth/store';
import { WelcomeCollage } from '@/features/auth/WelcomeCollage';
import { haptic } from '@/lib/haptics';
import { useAuthStore } from '@/store/auth';
import { ForceScheme, SCREEN_PADDING, useTheme } from '@/theme';

type SocialProvider = Extract<AuthProvider, 'google' | 'apple' | 'facebook'>;

const PROVIDER_LABEL: Record<SocialProvider, string> = { google: 'Google', apple: 'Apple', facebook: 'Facebook' };

function WelcomeScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const legal = useLegalSheet();
  const [panelTop, setPanelTop] = useState(() => height * 0.4);
  const status = useAuthStore((s) => s.status);
  const phone = useAuthStore((s) => s.phone);
  const [pending, setPending] = useState<SocialProvider | null>(null);
  const reason = useAuthGate((s) => s.reason);

  // Android geri tuşu X ile aynı: yarım kaydı geri al, kullanıcıyı geldiği ekrana bırak
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        cancelAuthGate();
        return true;
      });
      return () => sub.remove();
    }, []),
  );

  // Sahte OAuth: kısa bir bekleme sonrası hesap açılır ve "Kaydı Tamamla" (telefon) adımına geçilir
  useEffect(() => {
    if (!pending) return;
    const t = setTimeout(() => {
      startSignup(pending);
      haptic.success();
      toast.success(`${PROVIDER_LABEL[pending]} hesabınla bağlandın`, pending === 'apple' ? 'logo-apple' : pending === 'google' ? 'logo-google' : 'logo-facebook');
      setPending(null);
      router.push({ pathname: '/(auth)/phone', params: { mode: 'finish' } });
    }, 1100);
    return () => clearTimeout(t);
  }, [pending]);

  const resume = () => {
    haptic.tap();
    if (phone) router.push('/(auth)/username');
    else router.push({ pathname: '/(auth)/phone', params: { mode: 'finish' } });
  };

  const busy = pending !== null;

  // Kolaj üstte görünür kalsın, butonların arkası tamamen koyulaşsın
  const fadeStart = Math.max(0.16, Math.min(0.9, (panelTop - 170) / height));
  const solidAt = Math.max(fadeStart + 0.02, Math.min(0.97, (panelTop - 12) / height));

  return (
    <View style={[styles.flex, { backgroundColor: colors.bg }]}>
      <StatusBar style="light" />
      <WelcomeCollage />
      <LinearGradient
        pointerEvents="none"
        colors={[withAlpha(colors.bg, 0.85), withAlpha(colors.bg, 0.1), withAlpha(colors.bg, 0.3), colors.bg, colors.bg]}
        locations={[0, 0.14, fadeStart, solidAt, 1]}
        style={StyleSheet.absoluteFill}
      />
      <ScrollView
        bounces={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 14, paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
        <Animated.View entering={FadeIn.duration(500)} style={styles.top}>
          <PressableScale
            onPress={() => {
              haptic.tap();
              cancelAuthGate();
            }}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Kapat"
            style={[styles.close, { top: 0, backgroundColor: withAlpha(colors.bg, 0.7) }]}>
            <Icon name="close" size={22} color="text" />
          </PressableScale>
          <Logo size={34} />
          {status === 'signedIn' ? (
            <PressableScale onPress={resume} style={[styles.resume, { backgroundColor: withAlpha(colors.bg, 0.8), borderColor: colors.border }]}>
              <Icon name="time-outline" size={16} color="primary" />
              <Text variant="subhead" weight="700">
                Kaydın yarım kaldı · Devam et
              </Text>
              <Icon name="chevron-forward" size={14} color="textSecondary" />
            </PressableScale>
          ) : null}
        </Animated.View>

        <View style={styles.spacer} />

        <Animated.View entering={FadeInDown.duration(500).delay(120)} style={styles.panel} onLayout={(e) => setPanelTop(e.nativeEvent.layout.y)}>
          <View style={styles.headings}>
            <Text variant="subhead" weight="800" color="primary" align="center" style={styles.kicker}>
              CANLI ALIŞVERİŞİN EN EĞLENCELİ HALİ
            </Text>
            <Text variant="title1" align="center" style={styles.title}>
              Mezatonline’a Kaydol
            </Text>
            {reason ? (
              <Text variant="callout" color="textSecondary" align="center">
                {reason}. Kaydolmak ücretsiz.
              </Text>
            ) : null}
          </View>

          <View style={styles.options}>
            <AuthOptionButton icon="logo-google" label="Google ile devam et" loading={pending === 'google'} disabled={busy} onPress={() => setPending('google')} />
            <AuthOptionButton icon="logo-apple" label="Apple ile devam et" loading={pending === 'apple'} disabled={busy} onPress={() => setPending('apple')} />
            <AuthOptionButton icon="logo-facebook" label="Facebook ile devam et" loading={pending === 'facebook'} disabled={busy} onPress={() => setPending('facebook')} />
            <AuthOptionButton icon="mail-outline" label="E-posta ile devam et" disabled={busy} onPress={() => router.push({ pathname: '/(auth)/email', params: { mode: 'signup' } })} />
          </View>

          <PressableScale
            disabled={busy}
            accessibilityRole="button"
            onPress={() => {
              haptic.tap();
              router.push({ pathname: '/(auth)/phone', params: { mode: 'signup' } });
            }}
            style={styles.phoneLink}>
            <Icon name="phone-portrait-outline" size={18} color="text" />
            <Text variant="headline" weight="700" style={styles.underline}>
              Telefon numarasıyla devam et
            </Text>
          </PressableScale>

          <View style={styles.loginBlock}>
            <Text variant="callout" color="textSecondary" align="center">
              Zaten hesabın var mı?
            </Text>
            <Button
              title="Giriş Yap"
              size="lg"
              variant="secondary"
              fullWidth
              disabled={busy}
              style={{ backgroundColor: colors.surfaceAlt }}
              onPress={() => router.push('/(auth)/login')}
            />
          </View>

          <LegalFooter onOpen={legal.open} />
        </Animated.View>
      </ScrollView>
      {legal.sheet}
    </View>
  );
}

export default function Welcome() {
  return (
    <ForceScheme scheme="dark">
      <WelcomeScreen />
    </ForceScheme>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: SCREEN_PADDING + 4 },
  top: { alignItems: 'center', gap: 14 },
  close: { position: 'absolute', left: 0, width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  resume: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, borderWidth: 1 },
  spacer: { flex: 1, minHeight: 140 },
  panel: { gap: 18 },
  headings: { gap: 6 },
  kicker: { letterSpacing: 0.6, fontSize: 12 },
  title: { letterSpacing: -0.5 },
  options: { gap: 10 },
  phoneLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 6 },
  underline: { textDecorationLine: 'underline' },
  loginBlock: { gap: 10 },
});
