import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Logo } from '@/components/Logo';
import { Button, Icon, Text, type IconName } from '@/components/ui';
import { SCREEN_PADDING, useTheme } from '@/theme';

import { AUTH_REASONS, requireAuth } from './gate';

export type GuestPromptProps = {
  /** Büyük ikon (varsayılan: logo) */
  icon?: IconName;
  title: string;
  message: string;
  /** Giriş penceresindeki gerekçe */
  reason?: string;
  /** Giriş sonrası çalışacak işlem */
  onSignedIn?: () => void;
  style?: StyleProp<ViewStyle>;
};

/**
 * Misafirin hesap gerektiren bir ekrana geldiğinde gördüğü giriş istemi
 * (Aktivite, Hesap, Sat sekmeleri gibi).
 */
export function GuestPrompt({ icon, title, message, reason = AUTH_REASONS.generic, onSignedIn, style }: GuestPromptProps) {
  const { colors } = useTheme();
  return (
    <View style={[styles.wrap, style]}>
      <View style={[styles.badge, { backgroundColor: colors.surface }]}>
        {icon ? <Icon name={icon} size={34} color="text" /> : <Logo size={40} iconOnly />}
      </View>
      <Text variant="title2" align="center">
        {title}
      </Text>
      <Text variant="callout" color="textSecondary" align="center" style={styles.message}>
        {message}
      </Text>
      <Button title="Giriş yap veya kaydol" size="lg" fullWidth onPress={() => requireAuth(onSignedIn, { reason })} style={styles.cta} />
      <Text variant="footnote" color="textTertiary" align="center">
        Kaydolmak ücretsiz ve bir dakikadan kısa sürer.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: SCREEN_PADDING * 2, gap: 12 },
  badge: { width: 84, height: 84, borderRadius: 42, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  message: { maxWidth: 320 },
  cta: { marginTop: 12, alignSelf: 'stretch' },
});
