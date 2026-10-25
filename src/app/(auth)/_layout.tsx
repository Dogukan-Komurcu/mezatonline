import { Stack } from 'expo-router';

import { darkColors } from '@/theme';

export const unstable_settings = { anchor: 'welcome' };

export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: darkColors.bg } }} />;
}
