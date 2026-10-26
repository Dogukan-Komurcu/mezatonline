import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, View, type TextInputInstance } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar, Icon, PressableScale, Text } from '@/components/ui';
import { haptic } from '@/lib/haptics';
import { ForceScheme, liveColors, SCREEN_PADDING } from '@/theme';

import { alpha } from './styles';

const QUICK = ['🔥', '💛', 'W', '👏', '😍', '🙌', 'Hayırlı olsun!', 'Selamlar 👋'];

export type Mentionable = { username: string; avatar?: string };

export type ChatComposerProps = {
  visible: boolean;
  initialText?: string;
  mentionables: Mentionable[];
  onClose: () => void;
  /** true dönerse gönderildi sayılır ve alan temizlenir */
  onSend: (text: string) => boolean;
};

/** "Bir şey yaz…" dokununca açılan, klavyenin üstünde duran sohbet giriş alanı (@ ile etiketleme) */
export function ChatComposer({ visible, initialText = '', mentionables, onClose, onSend }: ChatComposerProps) {
  const insets = useSafeAreaInsets();
  const [text, setText] = useState(initialText);
  const [hint, setHint] = useState(false);
  const inputRef = useRef<TextInputInstance>(null);

  useEffect(() => {
    if (!hint) return;
    const t = setTimeout(() => setHint(false), 2600);
    return () => clearTimeout(t);
  }, [hint]);

  useEffect(() => {
    if (visible) setText(initialText);
  }, [visible, initialText]);

  const mentionMatch = /(^|\s)@([\wçğıöşüÇĞİÖŞÜ.]*)$/.exec(text);
  const query = mentionMatch ? mentionMatch[2].toLocaleLowerCase('tr-TR') : null;
  const suggestions =
    query !== null
      ? mentionables.filter((m, i, arr) => arr.findIndex((x) => x.username === m.username) === i && m.username.toLocaleLowerCase('tr-TR').includes(query)).slice(0, 6)
      : [];

  const send = (value: string) => {
    const v = value.trim();
    if (!v) return;
    if (onSend(v)) {
      haptic.light();
      setText('');
    } else {
      setHint(true);
    }
  };

  const pickMention = (username: string) => {
    setText((t) => t.replace(/@([\wçğıöşüÇĞİÖŞÜ.]*)$/, `@${username} `));
    inputRef.current?.focus();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      <ForceScheme scheme="dark">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
          <Pressable style={styles.flex} onPress={onClose} accessibilityLabel="Kapat" />
          <View style={[styles.panel, { paddingBottom: Math.max(insets.bottom, 10) }]}>
            {hint ? (
              <View style={styles.hint}>
                <Icon name="hourglass-outline" size={14} color={liveColors.primary} />
                <Text variant="footnote" weight="600" color={liveColors.text} style={styles.flex}>
                  Heyecanını seviyoruz! Bir sonraki mesajın için birkaç saniye bekle.
                </Text>
              </View>
            ) : null}
            {suggestions.length ? (
              <View style={styles.suggestions}>
                {suggestions.map((m) => (
                  <PressableScale key={m.username} scaleTo={0.98} onPress={() => pickMention(m.username)} style={styles.suggestion}>
                    <Avatar uri={m.avatar} name={m.username} size={26} />
                    <Text variant="callout" weight="600" color={liveColors.text}>
                      @{m.username}
                    </Text>
                  </PressableScale>
                ))}
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="always" contentContainerStyle={styles.quick}>
                {QUICK.map((q) => (
                  <PressableScale key={q} scaleTo={0.92} onPress={() => send(q)} style={styles.quickChip}>
                    <Text variant="callout" weight="700" color={liveColors.text}>
                      {q}
                    </Text>
                  </PressableScale>
                ))}
              </ScrollView>
            )}
            <View style={styles.row}>
              <View style={styles.inputWrap}>
                <TextInput
                  autoCorrect={false}
                  spellCheck={false}
                  ref={inputRef}
                  value={text}
                  onChangeText={(t) => setText(t.slice(0, 200))}
                  placeholder="Bir şey yaz…"
                  placeholderTextColor={liveColors.textTertiary}
                  selectionColor={liveColors.primary}
                  style={styles.input}
                  autoFocus
                  returnKeyType="send"
                  submitBehavior="submit"
                  onSubmitEditing={() => send(text)}
                  maxLength={200}
                  keyboardAppearance="dark"
                />
                <PressableScale scaleTo={0.9} onPress={() => setText((t) => (t.endsWith(' ') || !t ? t + '@' : t + ' @'))} hitSlop={8} accessibilityLabel="Birini etiketle">
                  <Icon name="at" size={20} color={liveColors.textSecondary} />
                </PressableScale>
              </View>
              <PressableScale
                scaleTo={0.88}
                onPress={() => send(text)}
                disabled={!text.trim()}
                style={[styles.send, !text.trim() && styles.sendDisabled]}
                accessibilityRole="button"
                accessibilityLabel="Gönder">
                <Icon name="arrow-up" size={20} color={text.trim() ? liveColors.onPrimary : liveColors.textTertiary} />
              </PressableScale>
            </View>
          </View>
        </KeyboardAvoidingView>
      </ForceScheme>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  panel: { backgroundColor: liveColors.panel, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 10, gap: 10 },
  quick: { paddingHorizontal: SCREEN_PADDING, gap: 8 },
  hint: { flexDirection: 'row', alignItems: 'center', gap: 6, marginHorizontal: SCREEN_PADDING, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: alpha(liveColors.primary, 0.14) },
  quickChip: { backgroundColor: liveColors.panelAlt, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  suggestions: { paddingHorizontal: SCREEN_PADDING - 4, gap: 2 },
  suggestion: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6, paddingHorizontal: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: SCREEN_PADDING },
  inputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 44,
    borderRadius: 22,
    paddingHorizontal: 14,
    backgroundColor: alpha(liveColors.text, 0.1),
    borderWidth: 1,
    borderColor: alpha(liveColors.text, 0.2),
  },
  input: { flex: 1, color: liveColors.text, fontSize: 16, paddingVertical: 10 },
  send: { width: 44, height: 44, borderRadius: 22, backgroundColor: liveColors.primary, alignItems: 'center', justifyContent: 'center' },
  sendDisabled: { backgroundColor: liveColors.panelAlt },
});
