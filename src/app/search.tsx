/**
 * Arama (Whatnot S15): otomatik odaklanan arama kutusu (✕ temizle), giriş durumu (son / kayıtlı / popüler
 * aramalar), yazarken öneriler, gönderince sekmeli sonuçlar. `?q=` parametresiyle doğrudan sonuç açar.
 */
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Keyboard, StyleSheet, TextInput, View, type TextInputInstance } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, IconButton, PressableScale } from '@/components/ui';
import { SearchEntry, SearchSuggestions } from '@/features/browse/SearchEntry';
import { SearchResults } from '@/features/browse/SearchResults';
import { haptic } from '@/lib/haptics';
import { useSocialStore } from '@/store/social';
import { radius, SCREEN_PADDING, useTheme } from '@/theme';

export default function SearchScreen() {
  const params = useLocalSearchParams<{ q?: string; qa?: string }>();
  // Yalnızca geliştirme: ekran görüntüsü QA'sı için başlangıç sekmesi (?q=…&qa=products)
  const qaTab = __DEV__ && (['products', 'shows', 'users', 'categories'] as const).find((t) => t === params.qa);
  const initial = typeof params.q === 'string' ? params.q.trim() : '';
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const addRecentSearch = useSocialStore((s) => s.addRecentSearch);
  const [text, setText] = useState(initial);
  const [query, setQuery] = useState<string | null>(initial || null);
  const [editing, setEditing] = useState(!initial);
  const inputRef = useRef<TextInputInstance>(null);
  const queryRef = useRef<string | null>(initial || null);

  useEffect(() => {
    if (initial) addRecentSearch(initial);
  }, [initial, addRecentSearch]);

  const submit = (raw: string) => {
    const q = raw.trim();
    if (!q) return;
    haptic.tap();
    addRecentSearch(q);
    queryRef.current = q;
    setText(q);
    setQuery(q);
    setEditing(false);
    inputRef.current?.blur();
    Keyboard.dismiss();
  };

  const fill = (q: string) => {
    haptic.tap();
    setText(`${q} `);
    inputRef.current?.focus();
  };

  const clear = () => {
    haptic.tap();
    setText('');
    setEditing(true);
    inputRef.current?.focus();
  };

  const mode: 'entry' | 'suggest' | 'results' = editing ? (text.trim() ? 'suggest' : 'entry') : query ? 'results' : 'entry';

  return (
    <View style={[styles.flex, { backgroundColor: colors.bg, paddingTop: insets.top }]}>
      <View style={styles.bar}>
        <IconButton name="chevron-back" accessibilityLabel="Geri" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
        <View style={[styles.field, { backgroundColor: colors.surface, borderColor: editing ? colors.text : 'transparent' }]}>
          <Icon name="search" size={18} color="textSecondary" />
          <TextInput
            ref={inputRef}
            value={text}
            onChangeText={setText}
            autoFocus={!initial}
            placeholder="Ürün, satıcı, yayın ya da kategori ara"
            placeholderTextColor={colors.textTertiary}
            selectionColor={colors.text}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
            enablesReturnKeyAutomatically
            onFocus={() => setEditing(true)}
            onBlur={() => {
              setEditing(false);
              const current = queryRef.current;
              if (current) setText(current);
            }}
            onSubmitEditing={(e) => submit(e.nativeEvent.text)}
            style={[styles.input, { color: colors.text }]}
            accessibilityLabel="Arama"
          />
          {text ? (
            <PressableScale scaleTo={0.85} hitSlop={10} onPress={clear} accessibilityRole="button" accessibilityLabel="Temizle" style={[styles.clear, { backgroundColor: colors.textTertiary }]}>
              <Icon name="close" size={13} color={colors.bg} />
            </PressableScale>
          ) : null}
        </View>
      </View>

      {mode === 'entry' ? <SearchEntry onSearch={submit} bottomInset={insets.bottom} /> : null}
      {mode === 'suggest' ? <SearchSuggestions text={text} onSearch={submit} onFill={fill} bottomInset={insets.bottom} /> : null}
      {mode === 'results' && query ? <SearchResults key={query} query={query} onSearch={submit} bottomInset={insets.bottom} initialTab={qaTab || undefined} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  bar: { flexDirection: 'row', alignItems: 'center', paddingLeft: 6, paddingRight: SCREEN_PADDING, paddingVertical: 6, gap: 4 },
  field: {
    flex: 1,
    height: 44,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 8,
  },
  input: { flex: 1, fontSize: 16, paddingVertical: 0, height: '100%' },
  clear: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
