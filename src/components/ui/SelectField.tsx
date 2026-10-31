import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { radius, SCREEN_PADDING, useTheme } from '@/theme';

import { Icon } from './Icon';
import { Divider } from './ListRow';
import { PressableScale } from './Pressable';
import { Sheet } from './Sheet';
import { Text } from './Text';
import { TextField } from './TextField';

export type SelectOption = { value: string; label: string; subtitle?: string };

export type SelectFieldProps = {
  label?: string;
  placeholder?: string;
  value?: string;
  options: SelectOption[] | string[];
  onChange: (value: string) => void;
  /** Sheet içinde arama kutusu göster (uzun listeler) */
  searchable?: boolean;
  error?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

function normalize(options: SelectOption[] | string[]): SelectOption[] {
  return (options as (SelectOption | string)[]).map((o) => (typeof o === 'string' ? { value: o, label: o } : o));
}

/** Dokununca alttan liste açan seçim alanı (il, ilçe, kategori, süre…) */
export function SelectField({ label, placeholder = 'Seç', value, options, onChange, searchable, error, disabled, style }: SelectFieldProps) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const opts = useMemo(() => normalize(options), [options]);
  const filtered = useMemo(
    () => (q ? opts.filter((o) => o.label.toLocaleLowerCase('tr-TR').includes(q.toLocaleLowerCase('tr-TR'))) : opts),
    [opts, q],
  );
  const selected = opts.find((o) => o.value === value);
  return (
    <View style={[styles.wrap, style]}>
      {label ? (
        <Text variant="subhead" weight="600" color="textSecondary" style={{ marginLeft: 2 }}>
          {label}
        </Text>
      ) : null}
      <PressableScale
        scaleTo={0.99}
        disabled={disabled}
        onPress={() => setOpen(true)}
        style={[styles.field, { backgroundColor: colors.surface, borderColor: error ? colors.danger : 'transparent', opacity: disabled ? 0.5 : 1 }]}>
        <Text variant="body" color={selected ? 'text' : 'textTertiary'} numberOfLines={1} style={{ flex: 1 }}>
          {selected?.label ?? placeholder}
        </Text>
        <Icon name="chevron-down" size={18} color="textSecondary" />
      </PressableScale>
      {error ? (
        <Text variant="footnote" color="danger" style={{ marginLeft: 2 }}>
          {error}
        </Text>
      ) : null}
      <Sheet visible={open} onClose={() => setOpen(false)} title={label ?? placeholder} scroll={false} height={0.75} showClose>
        {searchable ? <TextField icon="search" placeholder="Ara" value={q} onChangeText={setQ} autoCorrect={false} containerStyle={{ marginBottom: 8 }} /> : null}
        <FlatList
          data={filtered}
          keyExtractor={(o) => o.value}
          keyboardShouldPersistTaps="handled"
          ItemSeparatorComponent={() => <Divider />}
          style={{ marginHorizontal: -SCREEN_PADDING }}
          renderItem={({ item }) => (
            <PressableScale
              scaleTo={0.99}
              onPress={() => {
                onChange(item.value);
                setOpen(false);
                setQ('');
              }}
              style={styles.option}>
              <View style={{ flex: 1 }}>
                <Text variant="body" weight={item.value === value ? '700' : '400'}>
                  {item.label}
                </Text>
                {item.subtitle ? (
                  <Text variant="footnote" color="textSecondary">
                    {item.subtitle}
                  </Text>
                ) : null}
              </View>
              {item.value === value ? <Icon name="checkmark" size={20} color="primary" /> : null}
            </PressableScale>
          )}
        />
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  field: { flexDirection: 'row', alignItems: 'center', minHeight: 50, borderRadius: radius.md, paddingHorizontal: 14, borderWidth: 1.5, gap: 8 },
  option: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SCREEN_PADDING, paddingVertical: 14, gap: 8 },
});
