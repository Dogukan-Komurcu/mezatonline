import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Button, Header, Icon, PressableScale, Text, type IconName } from '@/components/ui';
import { AuthLayout, OnboardingProgress, SkipLink, StepTitle } from '@/features/auth/components';
import { useAuthFlow, type Gender } from '@/features/auth/store';
import { haptic } from '@/lib/haptics';
import { ForceScheme, radius, useTheme } from '@/theme';

const OPTIONS: { id: Gender; label: string; icon: IconName; note: string }[] = [
  { id: 'female', label: 'Kadın', icon: 'woman-outline', note: 'Moda, güzellik, takı ve daha fazlası' },
  { id: 'male', label: 'Erkek', icon: 'man-outline', note: 'Sneaker, kart, saat ve daha fazlası' },
  { id: 'unspecified', label: 'Belirtmek istemiyorum', icon: 'happy-outline', note: 'Herkese uygun popüler kategoriler' },
];

function GenderScreen() {
  const { colors } = useTheme();
  const stored = useAuthFlow((s) => s.gender);
  const setGender = useAuthFlow((s) => s.setGender);
  const [selected, setSelected] = useState<Gender | undefined>(stored);

  const next = (value: Gender | undefined) => {
    setGender(value);
    router.push('/(auth)/interests');
  };

  return (
    <AuthLayout
      header={
        <>
          <Header
            right={
              <SkipLink
                onPress={() => {
                  setSelected(undefined);
                  next(undefined);
                }}
              />
            }
          />
          <OnboardingProgress step="gender" />
        </>
      }
      footer={
        <Button
          title="Devam"
          size="lg"
          fullWidth
          disabled={!selected}
          onPress={() => {
            haptic.success();
            next(selected);
          }}
        />
      }>
      <StepTitle title="Cinsiyetin?" subtitle="Sana daha uygun kategorileri ve canlı yayınları önermemize yardımcı olur. Profilinde görünmez." />
      <View style={styles.options}>
        {OPTIONS.map((o, i) => {
          const active = selected === o.id;
          return (
            <Animated.View key={o.id} entering={FadeInDown.duration(320).delay(60 * i)}>
              <PressableScale
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                onPress={() => {
                  haptic.tap();
                  setSelected(o.id);
                }}
                style={[
                  styles.option,
                  {
                    backgroundColor: active ? colors.primary : colors.surface,
                    borderColor: active ? colors.onPrimary : colors.border,
                  },
                ]}>
                <View style={[styles.iconCircle, { backgroundColor: active ? colors.onPrimary : colors.surfaceAlt }]}>
                  <Icon name={o.icon} size={22} color={active ? colors.primary : colors.text} />
                </View>
                <View style={styles.texts}>
                  <Text variant="headline" weight="700" color={active ? colors.onPrimary : colors.text}>
                    {o.label}
                  </Text>
                  <Text variant="footnote" color={active ? colors.onPrimary : colors.textSecondary} numberOfLines={2} style={active ? styles.dim : undefined}>
                    {o.note}
                  </Text>
                </View>
                <View style={[styles.radio, { borderColor: active ? colors.onPrimary : colors.textTertiary }]}>
                  {active ? <View style={[styles.radioDot, { backgroundColor: colors.onPrimary }]} /> : null}
                </View>
              </PressableScale>
            </Animated.View>
          );
        })}
      </View>
    </AuthLayout>
  );
}

export default function GenderRoute() {
  return (
    <ForceScheme scheme="dark">
      <GenderScreen />
    </ForceScheme>
  );
}

const styles = StyleSheet.create({
  options: { gap: 12 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 14, paddingVertical: 14, borderRadius: radius.lg, borderWidth: 2 },
  iconCircle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  texts: { flex: 1, gap: 2 },
  dim: { opacity: 0.75 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
});
