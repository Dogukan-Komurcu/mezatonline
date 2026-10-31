import { forwardRef, useState, type ComponentRef, type ReactNode } from 'react';
import { StyleSheet, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native';

import { radius, useTheme } from '@/theme';

import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export type TextFieldProps = TextInputProps & {
  label?: string;
  helper?: string;
  error?: string;
  icon?: IconName;
  /** Sol tarafta sabit önek (ör. "+90", "₺") */
  prefix?: string;
  right?: ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
  /** Şifre alanı: göster/gizle düğmesi ekler */
  password?: boolean;
};

/** Etiketli metin alanı */
export const TextField = forwardRef<ComponentRef<typeof TextInput>, TextFieldProps>(function TextField(
  { label, helper, error, icon, prefix, right, containerStyle, password, style, onFocus, onBlur, multiline, ...rest },
  ref,
) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);
  return (
    <View style={[styles.wrap, containerStyle]}>
      {label ? (
        <Text variant="subhead" weight="600" color="textSecondary" style={styles.label}>
          {label}
        </Text>
      ) : null}
      <View
        style={[
          styles.field,
          multiline && styles.multiline,
          {
            backgroundColor: colors.surface,
            borderColor: error ? colors.danger : focused ? colors.primary : 'transparent',
          },
        ]}>
        {icon ? <Icon name={icon} size={18} color="textSecondary" /> : null}
        {prefix ? (
          <Text variant="body" weight="600" color="textSecondary">
            {prefix}
          </Text>
        ) : null}
        <TextInput
          ref={ref}
          placeholderTextColor={colors.textTertiary}
          selectionColor={colors.primary}
          secureTextEntry={password ? hidden : rest.secureTextEntry}
          multiline={multiline}
          {...rest}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[styles.input, { color: colors.text }, multiline && styles.inputMultiline, style]}
        />
        {password ? <Icon name={hidden ? 'eye-outline' : 'eye-off-outline'} size={20} color="textSecondary" /> : null}
        {password ? <View style={styles.eyeHit} onTouchEnd={() => setHidden((h) => !h)} /> : null}
        {right}
      </View>
      {error ? (
        <Text variant="footnote" color="danger" style={styles.helper}>
          {error}
        </Text>
      ) : helper ? (
        <Text variant="footnote" color="textTertiary" style={styles.helper}>
          {helper}
        </Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  label: { marginLeft: 2 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: radius.md,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    minHeight: 50,
  },
  multiline: { alignItems: 'flex-start', paddingVertical: 12, minHeight: 100 },
  input: { flex: 1, fontSize: 16, paddingVertical: 12 },
  inputMultiline: { paddingVertical: 0, textAlignVertical: 'top', minHeight: 76 },
  helper: { marginLeft: 2 },
  eyeHit: { position: 'absolute', right: 0, top: 0, bottom: 0, width: 48 },
});
