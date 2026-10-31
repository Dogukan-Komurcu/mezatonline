import { useEffect, useState, type ReactNode } from 'react';
import { Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, useWindowDimensions, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { darkColors, ForceScheme, liveColors, radius, SCREEN_PADDING, useTheme } from '@/theme';

import { IconButton } from './IconButton';
import { Text } from './Text';

export type SheetProps = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: ReactNode;
  /** İçerik kaydırılabilir mi (varsayılan true) */
  scroll?: boolean;
  /** Ekran yüksekliğine oranla maksimum yükseklik (0-1) */
  maxHeight?: number;
  /** Sabit yükseklik oranı (ör. 0.85 — liste sheet'leri) */
  height?: number;
  /** Canlı yayın üstünde: her zaman koyu tema */
  dark?: boolean;
  /** Altta sabit alan (buton vb.) */
  footer?: ReactNode;
  /** Başlık sağında ek öğe */
  headerRight?: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  /** Kapat (X) butonu göster */
  showClose?: boolean;
};

/**
 * Alttan açılan sayfa (bottom sheet).
 * <Sheet visible={open} onClose={() => setOpen(false)} title="Özel Teklif">...</Sheet>
 */
export function Sheet({ visible, onClose, title, subtitle, children, scroll = true, maxHeight = 0.9, height, dark, footer, headerRight, contentStyle, showClose = false }: SheetProps) {
  const theme = useTheme();
  const colors = dark ? darkColors : theme.colors;
  const insets = useSafeAreaInsets();
  const { height: screenH } = useWindowDimensions();
  const [mounted, setMounted] = useState(visible);
  const [keyboardH, setKeyboardH] = useState(0);
  const progress = useSharedValue(0);

  // Klavye açıkken sayfa çentiğin altına itilmesin: yüksekliği klavyeye göre sınırla
  useEffect(() => {
    if (!mounted) return;
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const a = Keyboard.addListener(showEvt, (e) => setKeyboardH(e.endCoordinates.height));
    const b = Keyboard.addListener(hideEvt, () => setKeyboardH(0));
    return () => {
      a.remove();
      b.remove();
    };
  }, [mounted]);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      progress.set(withTiming(1, { duration: 280, easing: Easing.out(Easing.cubic) }));
    } else if (mounted) {
      progress.set(withTiming(0, { duration: 200, easing: Easing.in(Easing.cubic) }));
      const t = setTimeout(() => setMounted(false), 210);
      return () => clearTimeout(t);
    }
  }, [visible, mounted, progress]);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: progress.get() }));
  const panelStyle = useAnimatedStyle(() => ({ transform: [{ translateY: (1 - progress.get()) * screenH * 0.6 }], opacity: progress.get() < 0.05 ? 0 : 1 }));

  if (!mounted) return null;

  const Body = scroll ? ScrollView : View;
  const scheme = dark ? 'dark' : theme.scheme;
  const available = keyboardH > 0 ? screenH - keyboardH - insets.top - 8 : screenH;
  const maxPanel = Math.min(screenH * maxHeight, available);
  const fixedPanel = height ? Math.min(screenH * height, available) : undefined;
  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      <ForceScheme scheme={scheme}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay }, backdropStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Kapat" />
        </Animated.View>
        <View style={styles.flex} pointerEvents="box-none" />
        <Animated.View
          style={[
            styles.panel,
            {
              backgroundColor: dark ? liveColors.panel : colors.card,
              maxHeight: maxPanel,
              height: fixedPanel,
              paddingBottom: footer ? 0 : keyboardH > 0 ? 12 : Math.max(insets.bottom, 16),
            },
            panelStyle,
          ]}>
          <View style={styles.handleWrap}>
            <View style={[styles.handle, { backgroundColor: dark ? 'rgba(255,255,255,0.25)' : colors.surfaceAlt }]} />
          </View>
          {title || headerRight || showClose ? (
            <View style={styles.header}>
              {showClose && !headerRight ? <View style={styles.closeSpacer} /> : null}
              <View style={{ flex: 1 }}>
                {title ? (
                  <Text variant="headline" weight="700" color={colors.text} numberOfLines={1} align={headerRight ? 'left' : 'center'} style={styles.title}>
                    {title}
                  </Text>
                ) : null}
                {subtitle ? (
                  <Text variant="footnote" color={colors.textSecondary} numberOfLines={3} align={headerRight ? 'left' : 'center'}>
                    {subtitle}
                  </Text>
                ) : null}
              </View>
              {headerRight}
              {showClose ? <IconButton name="close" size={34} variant={dark ? 'glass' : 'surface'} onPress={onClose} accessibilityLabel="Kapat" /> : null}
            </View>
          ) : null}
          <Body
            style={height ? styles.flex : undefined}
            contentContainerStyle={scroll ? [styles.content, contentStyle] : undefined}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            {scroll ? children : <View style={[styles.content, styles.flex, contentStyle]}>{children}</View>}
          </Body>
          {footer ? (
            <View style={[styles.footer, { paddingBottom: keyboardH > 0 ? 12 : Math.max(insets.bottom, 12), borderTopColor: dark ? liveColors.border : colors.border }]}>{footer}</View>
          ) : null}
        </Animated.View>
      </KeyboardAvoidingView>
      </ForceScheme>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  panel: {
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    overflow: 'hidden',
  },
  handleWrap: { alignItems: 'center', paddingTop: 8, paddingBottom: 4 },
  handle: { width: 40, height: 5, borderRadius: 3 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SCREEN_PADDING, paddingTop: 6, paddingBottom: 10, gap: 10 },
  closeSpacer: { width: 34 },
  title: { fontSize: 17, lineHeight: 22 },
  content: { paddingHorizontal: SCREEN_PADDING, paddingBottom: 8 },
  footer: { paddingHorizontal: SCREEN_PADDING, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
});
