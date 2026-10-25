import { useEffect, type Ref } from 'react';
import { Platform, Pressable, StyleSheet, TextInput, View, type TextInputInstance } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

import { Text } from '@/components/ui';
import { radius, useTheme } from '@/theme';

export const OTP_LENGTH = 6;

function Caret() {
  const { colors } = useTheme();
  const o = useSharedValue(1);
  useEffect(() => {
    o.set(withRepeat(withSequence(withTiming(0, { duration: 450 }), withTiming(1, { duration: 450 })), -1));
  }, [o]);
  const style = useAnimatedStyle(() => ({ opacity: o.get() }));
  return <Animated.View style={[styles.caret, { backgroundColor: colors.primary }, style]} />;
}

/**
 * 6 kutulu doğrulama kodu girişi.
 * Tek bir görünmez TextInput tüm kutuları besler: otomatik ilerleme, geri silme,
 * yapıştırma ve iOS/Android SMS kodu otomatik doldurma doğal olarak çalışır.
 */
export function OtpInput({
  value,
  onChange,
  error,
  disabled,
  inputRef,
  onFocusRequest,
}: {
  value: string;
  onChange: (code: string) => void;
  error?: boolean;
  disabled?: boolean;
  inputRef: Ref<TextInputInstance>;
  onFocusRequest: () => void;
}) {
  const { colors } = useTheme();
  const activeIndex = Math.min(value.length, OTP_LENGTH - 1);
  return (
    <Pressable onPress={onFocusRequest} accessibilityLabel="Doğrulama kodu" style={styles.row} disabled={disabled}>
      {Array.from({ length: OTP_LENGTH }, (_, i) => {
        const char = value[i] ?? '';
        const isActive = !disabled && i === activeIndex && value.length < OTP_LENGTH;
        const borderColor = error ? colors.danger : isActive ? colors.primary : char ? colors.textSecondary : colors.border;
        return (
          <View key={i} style={[styles.box, { borderColor, backgroundColor: colors.surface }]}>
            {char ? (
              <Text variant="title2" weight="800" tabular>
                {char}
              </Text>
            ) : isActive ? (
              <Caret />
            ) : null}
          </View>
        );
      })}
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={(t) => onChange(t.replace(/\D/g, '').slice(0, OTP_LENGTH))}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete={Platform.OS === 'android' ? 'sms-otp' : 'one-time-code'}
        maxLength={OTP_LENGTH}
        editable={!disabled}
        caretHidden
        contextMenuHidden={false}
        selectionColor="transparent"
        style={styles.hiddenInput}
        accessibilityLabel="Doğrulama kodu alanı"
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  box: {
    flex: 1,
    maxWidth: 56,
    aspectRatio: 0.82,
    borderRadius: radius.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  caret: { width: 2, height: 26, borderRadius: 1 },
  // Kutuların üstünde ama görünmez: dokunma/yapıştırma menüsü kutular üzerinde çalışır
  hiddenInput: { ...StyleSheet.absoluteFill, opacity: 0.015, color: 'transparent', fontSize: 1 },
});
