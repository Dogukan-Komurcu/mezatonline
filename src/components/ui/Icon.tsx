import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';

import { useTheme, type ColorTokens } from '@/theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];

export type IconProps = {
  name: IconName;
  size?: number;
  /** Tema token adı ya da doğrudan renk */
  color?: keyof ColorTokens | (string & {});
  style?: ComponentProps<typeof Ionicons>['style'];
};

/** Ionicons sarmalayıcı. Tüm ikonlar bunun üzerinden kullanılır. */
export function Icon({ name, size = 22, color = 'text', style }: IconProps) {
  const { colors } = useTheme();
  const resolved = (colors as Record<string, string>)[color as string] ?? color;
  return <Ionicons name={name} size={size} color={resolved} style={style} />;
}
