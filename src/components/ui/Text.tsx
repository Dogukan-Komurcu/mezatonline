import { Text as RNText, type TextProps as RNTextProps, type TextStyle } from 'react-native';

import { typography, useTheme, type ColorTokens, type TypographyVariant } from '@/theme';

export type TextProps = RNTextProps & {
  variant?: TypographyVariant;
  /** Tema renk token adı ya da doğrudan renk */
  color?: keyof ColorTokens | (string & {});
  weight?: TextStyle['fontWeight'];
  align?: TextStyle['textAlign'];
  tabular?: boolean;
};

/**
 * Uygulama genelinde metin. Varsayılan: body / text rengi.
 * <Text variant="title2">Başlık</Text>
 * <Text variant="footnote" color="textSecondary">Açıklama</Text>
 */
export function Text({ variant = 'body', color = 'text', weight, align, tabular, style, ...rest }: TextProps) {
  const { colors } = useTheme();
  const resolved = (colors as Record<string, string>)[color as string] ?? color;
  return (
    <RNText
      {...rest}
      style={[
        typography[variant],
        { color: resolved },
        weight ? { fontWeight: weight } : null,
        align ? { textAlign: align } : null,
        tabular ? { fontVariant: ['tabular-nums'] } : null,
        style,
      ]}
    />
  );
}
