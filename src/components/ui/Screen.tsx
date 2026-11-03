import { router } from 'expo-router';
import { ScreenPresentationContext } from 'expo-router/build/react-navigation/native-stack/utils/ScreenPresentationContext';
import { useContext, type ReactNode } from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SCREEN_PADDING, useTheme } from '@/theme';

import { IconButton } from './IconButton';
import { Text } from './Text';

export type ScreenProps = {
  children: ReactNode;
  /** Üst güvenli alanı uygula (header yoksa true) */
  safeTop?: boolean;
  /** Alt güvenli alanı uygula (tab bar olmayan ekranlarda true) */
  safeBottom?: boolean;
  style?: StyleProp<ViewStyle>;
  /** Arka plan rengi (varsayılan bg) */
  background?: string;
};

/** Ekran kabı: tema arka planı + güvenli alan */
export function Screen({ children, safeTop = false, safeBottom = false, style, background }: ScreenProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.flex,
        { backgroundColor: background ?? colors.bg, paddingTop: safeTop ? insets.top : 0, paddingBottom: safeBottom ? insets.bottom : 0 },
        style,
      ]}>
      {children}
    </View>
  );
}

/** iOS'ta tam ekranı kaplamayan sunumlar: üst güvenli alan boşluğu gerekmez (native-stack de bunlarda topInset = 0 kullanır) */
const IOS_SHEET_PRESENTATIONS: (string | undefined)[] = ['modal', 'pageSheet', 'formSheet'];

/**
 * Bu ekran iOS'ta sayfa-modal olarak mı gösteriliyor.
 * Odaktaki yola (usePathname) veya rota adına değil ekranın kendi native-stack sahnesine bakar: `presentation` belirtilmemiş rota da
 * canlı yayının üstünde açılınca pencere olur; modal açıkken arkadaki ekran da kendini modal sanıp üst boşluğunu bırakmaz.
 * SDK 58'de bu bilgi için herkese açık API yok, bağlam bu yüzden iç yoldan alınıyor.
 */
export function useIsSheetModal(): boolean {
  const presentation = useContext(ScreenPresentationContext);
  return Platform.OS === 'ios' && IOS_SHEET_PRESENTATIONS.includes(presentation);
}

/** Ekranın sayfa düzeyindeki üst güvenli alanı: pencerede 0. Ekranın içinden tam ekran açılan katmanlar (RN Modal) gerçek değeri kullanmalı. */
export function useTopInset(): number {
  const { top } = useSafeAreaInsets();
  return useIsSheetModal() ? 0 : top;
}

export type HeaderProps = {
  title?: string;
  subtitle?: string;
  /** Geri butonu (varsayılan true). 'close' = X ikonu */
  back?: boolean | 'close';
  onBack?: () => void;
  right?: ReactNode;
  left?: ReactNode;
  /** Büyük sola yaslı başlık (tab ekranları) */
  large?: boolean;
  /** Üst güvenli alan boşluğu ekle (varsayılan: modal değilse true) */
  safeTop?: boolean;
  border?: boolean;
  transparent?: boolean;
  children?: ReactNode;
};

/** Özel ekran başlığı. Stack header kapalıyken kullanılır. */
export function Header({ title, subtitle, back = true, onBack, right, left, large, safeTop: safeTopProp, border, transparent, children }: HeaderProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const isSheetModal = useIsSheetModal();
  const safeTop = safeTopProp ?? !isSheetModal;
  const goBack = () => {
    if (onBack) onBack();
    else if (router.canGoBack()) router.back();
    else router.replace('/');
  };
  return (
    <View
      style={[
        {
          paddingTop: safeTop ? insets.top : 0,
          backgroundColor: transparent ? 'transparent' : colors.bg,
          borderBottomColor: colors.border,
          borderBottomWidth: border ? StyleSheet.hairlineWidth : 0,
        },
      ]}>
      {large ? (
        <View style={styles.largeRow}>
          <View style={{ flex: 1 }}>
            {title ? (
              <Text variant="title1" numberOfLines={1}>
                {title}
              </Text>
            ) : null}
            {subtitle ? (
              <Text variant="subhead" color="textSecondary">
                {subtitle}
              </Text>
            ) : null}
          </View>
          <View style={styles.actions}>{right}</View>
        </View>
      ) : (
        <View style={styles.row}>
          <View style={styles.side}>
            {left ?? (back ? <IconButton name={back === 'close' ? 'close' : 'chevron-back'} onPress={goBack} accessibilityLabel="Geri" /> : null)}
          </View>
          <View style={styles.center}>
            {title ? (
              <Text variant="headline" weight="700" numberOfLines={1} align="center">
                {title}
              </Text>
            ) : null}
            {subtitle ? (
              <Text variant="footnote" color="textSecondary" numberOfLines={1} align="center">
                {subtitle}
              </Text>
            ) : null}
          </View>
          <View style={[styles.side, styles.sideRight]}>{right}</View>
        </View>
      )}
      {children}
    </View>
  );
}

/** Bölüm başlığı: "Canlı Yayınlar" + sağda "Tümünü gör" */
export function SectionHeader({ title, subtitle, actionLabel, onAction, style }: { title: string; subtitle?: string; actionLabel?: string; onAction?: () => void; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.section, style]}>
      <View style={{ flex: 1 }}>
        <Text variant="title3" numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="footnote" color="textSecondary" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {actionLabel ? (
        <Text variant="subhead" weight="700" color="accent" onPress={onAction} suppressHighlighting>
          {actionLabel}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { height: 52, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6 },
  side: { minWidth: 48, flexDirection: 'row', alignItems: 'center' },
  sideRight: { justifyContent: 'flex-end', gap: 2 },
  center: { flex: 1, alignItems: 'center', paddingHorizontal: 4 },
  largeRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SCREEN_PADDING, paddingTop: 6, paddingBottom: 10, gap: 8 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  section: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: SCREEN_PADDING, marginBottom: 10, gap: 12 },
});
