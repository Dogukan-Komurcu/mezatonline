/**
 * Alert.alert'in her platformda çalışan karşılığı. react-native-web'de Alert.alert boş bir işlevdir,
 * düğmeler hiçbir şey yapmaz. iOS ve Android yerel uyarıyı kullanır; web'de aynı içerik uygulama içi
 * pencerede açılır. <AlertHost /> kök layout'ta bir kez render edilir.
 */
import { Alert, Modal, Platform, Pressable, StyleSheet, View, type AlertButton } from 'react-native';
import { create } from 'zustand';

import { radius, useTheme } from '@/theme';

import { Button, type ButtonVariant } from './Button';
import { Text } from './Text';

type AlertItem = { title: string; message?: string; buttons: AlertButton[] };

const useAlertStore = create<{ alert?: AlertItem }>(() => ({}));

/** Yan yana sığan en uzun düğme yazısı; daha uzunsa düğmeler alt alta dizilir */
const INLINE_LABEL = 12;

export function showAlert(title: string, message?: string, buttons?: AlertButton[]) {
  if (Platform.OS !== 'web') {
    Alert.alert(title, message, buttons);
    return;
  }
  useAlertStore.setState({ alert: { title, message, buttons: buttons?.length ? buttons : [{ text: 'Tamam' }] } });
}

function variantOf(style: AlertButton['style']): ButtonVariant {
  if (style === 'destructive') return 'danger';
  return style === 'cancel' ? 'secondary' : 'primary';
}

export function AlertHost() {
  const alert = useAlertStore((s) => s.alert);
  const { colors } = useTheme();
  if (Platform.OS !== 'web' || !alert) return null;

  const press = (button?: AlertButton) => {
    useAlertStore.setState({ alert: undefined });
    button?.onPress?.();
  };
  // Esc ve dışarı tıklama vazgeçmektir; yıkıcı düğme asla kendiliğinden çalışmaz
  const dismiss = () => press(alert.buttons.find((b) => b.style === 'cancel'));
  const inline = alert.buttons.length === 2 && alert.buttons.every((b) => (b.text ?? '').length <= INLINE_LABEL);

  return (
    <Modal visible transparent animationType="fade" onRequestClose={dismiss}>
      <View style={[styles.backdrop, { backgroundColor: colors.overlay }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={dismiss} focusable={false} accessibilityLabel="Vazgeç" />
        <View role="alertdialog" aria-label={alert.title} style={[styles.panel, { backgroundColor: colors.card }]}>
          <Text variant="headline" weight="700" align="center" color={colors.text}>
            {alert.title}
          </Text>
          {alert.message ? (
            <Text variant="subhead" align="center" color={colors.textSecondary}>
              {alert.message}
            </Text>
          ) : null}
          <View style={[styles.actions, inline && styles.actionsInline]}>
            {alert.buttons.map((button, i) => (
              <Button key={i} title={button.text ?? 'Tamam'} variant={variantOf(button.style)} onPress={() => press(button)} style={inline ? styles.actionInline : undefined} fullWidth={!inline} />
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  panel: { width: '100%', maxWidth: 340, borderRadius: radius.xl, padding: 20, gap: 8 },
  actions: { marginTop: 12, gap: 8 },
  actionsInline: { flexDirection: 'row' },
  actionInline: { flex: 1 },
});
