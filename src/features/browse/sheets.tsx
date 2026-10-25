/**
 * Filtrele / Sırala alt sayfaları (Kategori sayfası + Arama sonuçları).
 * Taslak (draft) durumu sheet içinde tutulur; "Sonuçları göster" ile uygulanır.
 * Ebeveyn her açılışta `key` değiştirerek taslağı sıfırlar.
 */
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Divider, Icon, PressableScale, Sheet, Text, TextField } from '@/components/ui';
import { formatNumber } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { SCREEN_PADDING, useTheme } from '@/theme';

import {
  CONDITION_OPTIONS,
  EMPTY_PRODUCT_FILTERS,
  EMPTY_SHOW_FILTERS,
  PRODUCT_FORMAT_OPTIONS,
  SHOW_STATUS_LABELS,
  toggleItem,
  type ProductFilters,
  type ShowFilters,
  type ShowStatusFilter,
} from './filters';
import { ChipScroller, FilterChip } from './ui';

// ─── Ortak satırlar ──────────────────────────────────────────────────────────

function CheckRow({ label, subtitle, checked, onPress, radio }: { label: string; subtitle?: string; checked: boolean; onPress: () => void; radio?: boolean }) {
  const { colors } = useTheme();
  return (
    <PressableScale
      scaleTo={0.99}
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      accessibilityRole={radio ? 'radio' : 'checkbox'}
      accessibilityState={{ checked }}
      style={styles.checkRow}>
      <View style={styles.flex}>
        <Text variant="body" weight={checked ? '600' : '400'}>
          {label}
        </Text>
        {subtitle ? (
          <Text variant="footnote" color="textSecondary">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {radio ? (
        <View style={[styles.radio, { borderColor: checked ? colors.text : colors.border }]}>
          {checked ? <View style={[styles.radioDot, { backgroundColor: colors.text }]} /> : null}
        </View>
      ) : (
        <View style={[styles.box, { borderColor: checked ? colors.inverse : colors.border, backgroundColor: checked ? colors.inverse : 'transparent' }]}>
          {checked ? <Icon name="checkmark" size={15} color={colors.onInverse} /> : null}
        </View>
      )}
    </PressableScale>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <Text variant="headline" style={styles.sectionLabel}>
      {children}
    </Text>
  );
}

function Footer({ onClear, onApply, count, noun, disabled }: { onClear: () => void; onApply: () => void; count: number; noun: string; disabled?: boolean }) {
  return (
    <View style={styles.footer}>
      <Button title="Temizle" variant="outline" onPress={onClear} style={styles.clear} />
      <Button
        title={count > 0 ? `${formatNumber(count)} ${noun} göster` : 'Sonuç yok'}
        onPress={onApply}
        disabled={disabled || count === 0}
        style={styles.flex}
      />
    </View>
  );
}

// ─── Yayın filtresi ──────────────────────────────────────────────────────────

export function ShowFilterSheet({
  visible,
  onClose,
  value,
  onApply,
  countFor,
}: {
  visible: boolean;
  onClose: () => void;
  value: ShowFilters;
  onApply: (f: ShowFilters) => void;
  countFor: (f: ShowFilters) => number;
}) {
  const [draft, setDraft] = useState<ShowFilters>(value);
  const flag = (key: Exclude<keyof ShowFilters, 'status'>) => setDraft((d) => ({ ...d, [key]: !d[key] }));
  const statuses: ShowStatusFilter[] = ['live', 'scheduled'];
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Filtrele"
      showClose
      maxHeight={0.88}
      footer={
        <Footer
          count={countFor(draft)}
          noun="yayını"
          onClear={() => setDraft(EMPTY_SHOW_FILTERS)}
          onApply={() => {
            onApply(draft);
            onClose();
          }}
        />
      }>
      <SectionLabel>Yayın durumu</SectionLabel>
      {statuses.map((s) => (
        <CheckRow key={s} label={SHOW_STATUS_LABELS[s]} checked={draft.status.includes(s)} onPress={() => setDraft((d) => ({ ...d, status: toggleItem(d.status, s) }))} />
      ))}
      <Divider style={styles.divider} />
      <SectionLabel>Yayın özellikleri</SectionLabel>
      <CheckRow label="Ücretsiz kargo" subtitle="Kargo ücretsiz ya da belirli tutar üstü bedava" checked={draft.freeShipping} onPress={() => flag('freeShipping')} />
      <CheckRow label="Çekiliş var" subtitle="Yayında ücretsiz çekilişler yapılıyor" checked={draft.giveaway} onPress={() => flag('giveaway')} />
      <CheckRow label="₺1 Başlangıç" subtitle="Açık artırmalar ₺1'den başlıyor" checked={draft.oneLira} onPress={() => flag('oneLira')} />
      <CheckRow label="Ani Bitiş 💀" subtitle="Son saniye teklifiyle süre uzamaz" checked={draft.suddenDeath} onPress={() => flag('suddenDeath')} />
      <Divider style={styles.divider} />
      <SectionLabel>Satıcı</SectionLabel>
      <CheckRow label="En İyi Satıcılar" subtitle="Satış ve teslimat performansı en yüksekler" checked={draft.topSellers} onPress={() => flag('topSellers')} />
      <CheckRow label="Yeni ve Dikkat Çekenler" subtitle="Yeni katılan ve öne çıkan satıcılar" checked={draft.fresh} onPress={() => flag('fresh')} />
    </Sheet>
  );
}

// ─── Ürün filtresi ───────────────────────────────────────────────────────────

const PRICE_PRESETS: { label: string; min: number | null; max: number | null }[] = [
  { label: '₺100 altı', min: null, max: 100 },
  { label: '₺100 – ₺500', min: 100, max: 500 },
  { label: '₺500 – ₺2.500', min: 500, max: 2500 },
  { label: '₺2.500 üstü', min: 2500, max: null },
];

function parsePrice(s: string): number | null {
  const digits = s.replace(/[^\d]/g, '');
  return digits ? parseInt(digits, 10) : null;
}

export function ProductFilterSheet({
  visible,
  onClose,
  value,
  onApply,
  countFor,
}: {
  visible: boolean;
  onClose: () => void;
  value: ProductFilters;
  onApply: (f: ProductFilters) => void;
  countFor: (f: ProductFilters) => number;
}) {
  const [draft, setDraft] = useState<ProductFilters>(value);
  const [minText, setMinText] = useState(value.minPrice !== null ? String(value.minPrice) : '');
  const [maxText, setMaxText] = useState(value.maxPrice !== null ? String(value.maxPrice) : '');
  const minPrice = parsePrice(minText);
  const maxPrice = parsePrice(maxText);
  const invalid = minPrice !== null && maxPrice !== null && minPrice > maxPrice;
  const effective: ProductFilters = { ...draft, minPrice, maxPrice };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Filtrele"
      showClose
      maxHeight={0.9}
      footer={
        <Footer
          count={invalid ? 0 : countFor(effective)}
          noun="ürünü"
          disabled={invalid}
          onClear={() => {
            setDraft(EMPTY_PRODUCT_FILTERS);
            setMinText('');
            setMaxText('');
          }}
          onApply={() => {
            onApply(effective);
            onClose();
          }}
        />
      }>
      <SectionLabel>Satış şekli</SectionLabel>
      {PRODUCT_FORMAT_OPTIONS.map((o) => (
        <CheckRow key={o.key} label={o.label} checked={draft.formats.includes(o.key)} onPress={() => setDraft((d) => ({ ...d, formats: toggleItem(d.formats, o.key) }))} />
      ))}
      <Divider style={styles.divider} />
      <SectionLabel>Fiyat</SectionLabel>
      <View style={styles.priceRow}>
        <TextField
          containerStyle={styles.flex}
          prefix="₺"
          placeholder="En az"
          keyboardType="number-pad"
          value={minText}
          onChangeText={(t) => setMinText(t.replace(/[^\d]/g, ''))}
          maxLength={7}
        />
        <Text variant="body" color="textSecondary">
          –
        </Text>
        <TextField
          containerStyle={styles.flex}
          prefix="₺"
          placeholder="En çok"
          keyboardType="number-pad"
          value={maxText}
          onChangeText={(t) => setMaxText(t.replace(/[^\d]/g, ''))}
          maxLength={7}
        />
      </View>
      {invalid ? (
        <Text variant="footnote" color="danger" style={styles.error}>
          En düşük fiyat, en yüksek fiyattan büyük olamaz.
        </Text>
      ) : null}
      <ChipScroller style={styles.presets} contentStyle={styles.presetsContent}>
        {PRICE_PRESETS.map((p) => (
          <FilterChip
            key={p.label}
            label={p.label}
            selected={minPrice === p.min && maxPrice === p.max}
            onPress={() => {
              setMinText(p.min !== null ? String(p.min) : '');
              setMaxText(p.max !== null ? String(p.max) : '');
            }}
          />
        ))}
      </ChipScroller>
      <Divider style={styles.divider} />
      <SectionLabel>Durum</SectionLabel>
      {CONDITION_OPTIONS.map((o) => (
        <CheckRow key={o.key} label={o.label} checked={draft.conditions.includes(o.key)} onPress={() => setDraft((d) => ({ ...d, conditions: toggleItem(d.conditions, o.key) }))} />
      ))}
      <Divider style={styles.divider} />
      <SectionLabel>Diğer</SectionLabel>
      <CheckRow label="Yayında satılanlar" subtitle="Canlı ya da yaklaşan bir yayında satışa çıkacak" checked={draft.inShow} onPress={() => setDraft((d) => ({ ...d, inShow: !d.inShow }))} />
      <CheckRow label="Fiyat önerisine açık" subtitle="Satıcıya kendi fiyatını önerebilirsin" checked={draft.acceptsOffers} onPress={() => setDraft((d) => ({ ...d, acceptsOffers: !d.acceptsOffers }))} />
    </Sheet>
  );
}

// ─── Tek seçimli liste (Sırala, Satış Şekli) ─────────────────────────────────

export function ChoiceSheet<K extends string>({
  visible,
  onClose,
  title,
  options,
  value,
  onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  options: { key: K; label: string; subtitle?: string }[];
  value: K;
  onSelect: (key: K) => void;
}) {
  return (
    <Sheet visible={visible} onClose={onClose} title={title} showClose>
      {options.map((o) => (
        <CheckRow
          key={o.key}
          radio
          label={o.label}
          subtitle={o.subtitle}
          checked={o.key === value}
          onPress={() => {
            onSelect(o.key);
            onClose();
          }}
        />
      ))}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  box: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  sectionLabel: { marginTop: 6, marginBottom: 2 },
  divider: { marginVertical: 10 },
  footer: { flexDirection: 'row', gap: 10 },
  clear: { minWidth: 110 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 },
  error: { marginTop: 6 },
  presets: { marginHorizontal: -SCREEN_PADDING, marginTop: 12 },
  presetsContent: { paddingHorizontal: SCREEN_PADDING },
});

