/**
 * Ortak adres ve kart formları.
 * Kullanım: settings/address, settings/add-card, checkout ve canlı yayındaki hızlı kurulum sayfası.
 */
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Icon, ListRow, SelectField, Text, TextField } from '@/components/ui';
import { DEMO_COPY, DEMO_MODE } from '@/config/demo';
import { districtsOf, neighborhoodsOf, PROVINCES } from '@/data/turkey';
import { useMe } from '@/store/auth';
import { detectCardBrand } from '@/store/wallet';
import { radius, useTheme } from '@/theme';
import type { Address } from '@/types';

export type AddressDraft = Omit<Address, 'id' | 'isDefault'> & { isDefault: boolean };

export function emptyAddress(fullName = ''): AddressDraft {
  return { title: 'Ev', fullName, phone: '', city: '', district: '', neighborhood: '', line: '', postalCode: '', isDefault: true };
}

export function validateAddress(a: AddressDraft): Partial<Record<keyof AddressDraft, string>> {
  const e: Partial<Record<keyof AddressDraft, string>> = {};
  if (a.fullName.trim().split(/\s+/).length < 2) e.fullName = 'Ad ve soyad gir';
  if (a.phone.replace(/\D/g, '').replace(/^90/, '').replace(/^0/, '').length !== 10) e.phone = 'Geçerli bir cep telefonu gir';
  if (!a.city) e.city = 'İl seç';
  if (!a.district) e.district = 'İlçe seç';
  if (!a.neighborhood.trim()) e.neighborhood = 'Mahalle gir';
  if (a.line.trim().length < 5) e.line = 'Açık adresi gir (cadde, sokak, bina, daire)';
  return e;
}

/** Adres formu (kontrollü) */
export function AddressForm({ value, onChange, errors = {} }: { value: AddressDraft; onChange: (v: AddressDraft) => void; errors?: Partial<Record<keyof AddressDraft, string>> }) {
  const set = <K extends keyof AddressDraft>(k: K, v: AddressDraft[K]) => onChange({ ...value, [k]: v });
  return (
    <View style={styles.form}>
      <View style={styles.row}>
        {['Ev', 'İş', 'Diğer'].map((t) => (
          <Button key={t} title={t} size="sm" variant={value.title === t ? 'inverse' : 'secondary'} onPress={() => set('title', t)} />
        ))}
      </View>
      <TextField label="Ad Soyad" value={value.fullName} onChangeText={(v) => set('fullName', v)} autoCapitalize="words" textContentType="name" error={errors.fullName} />
      <TextField
        label="Cep telefonu"
        prefix="+90"
        value={value.phone}
        onChangeText={(v) => set('phone', v.replace(/[^\d ]/g, '').slice(0, 13))}
        keyboardType="phone-pad"
        placeholder="5XX XXX XX XX"
        textContentType="telephoneNumber"
        error={errors.phone}
      />
      <View style={styles.row}>
        <SelectField
          label="İl"
          value={value.city}
          options={[...PROVINCES]}
          searchable
          onChange={(v) => onChange({ ...value, city: v, district: '', neighborhood: '' })}
          error={errors.city}
          style={styles.flex}
        />
        <SelectField
          label="İlçe"
          value={value.district}
          options={value.city ? districtsOf(value.city) : []}
          searchable
          disabled={!value.city}
          onChange={(v) => onChange({ ...value, district: v, neighborhood: '' })}
          error={errors.district}
          style={styles.flex}
        />
      </View>
      <SelectField
        label="Mahalle"
        value={value.neighborhood}
        options={value.district ? neighborhoodsOf(value.district).map((n) => `${n} Mah.`) : []}
        disabled={!value.district}
        onChange={(v) => set('neighborhood', v)}
        error={errors.neighborhood}
      />
      <TextField
        label="Açık adres"
        value={value.line}
        onChangeText={(v) => set('line', v)}
        placeholder="Cadde/Sokak, Bina No, Kat, Daire No"
        multiline
        error={errors.line}
      />
      <TextField label="Posta kodu (isteğe bağlı)" value={value.postalCode} onChangeText={(v) => set('postalCode', v.replace(/\D/g, '').slice(0, 5))} keyboardType="number-pad" />
    </View>
  );
}

// ─── Kart ────────────────────────────────────────────────────────────────────

const SHARE_PREVIEW = process.env.EXPO_PUBLIC_SHARE_PREVIEW === '1';

export type CardDraft = { number: string; holder: string; expiry: string; cvc: string };

export const emptyCard = (): CardDraft => ({ number: '', holder: '', expiry: '', cvc: '' });

function luhn(num: string): boolean {
  let sum = 0;
  let alt = false;
  for (let i = num.length - 1; i >= 0; i--) {
    let n = parseInt(num[i], 10);
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

export function validateCard(c: CardDraft): Partial<Record<keyof CardDraft, string>> {
  const e: Partial<Record<keyof CardDraft, string>> = {};
  const digits = c.number.replace(/\D/g, '');
  if (digits.length < 15 || (!SHARE_PREVIEW && !luhn(digits))) e.number = 'Geçerli bir kart numarası gir';
  if (c.holder.trim().length < 3) e.holder = 'Kart üzerindeki ismi gir';
  const m = c.expiry.match(/^(\d{2})\/(\d{2})$/);
  if (!m || +m[1] < 1 || +m[1] > 12) e.expiry = 'AA/YY';
  else if (!SHARE_PREVIEW) {
    const exp = new Date(2000 + +m[2], +m[1], 1);
    if (exp.getTime() < Date.now()) e.expiry = 'Kartın süresi dolmuş';
  }
  if (!/^\d{3,4}$/.test(c.cvc)) e.cvc = 'CVC';
  return e;
}

const BRAND_LABEL = { visa: 'VISA', mastercard: 'Mastercard', troy: 'TROY', amex: 'AMEX' } as const;

/** Kart formu: numara 4'lü gruplanır, SKT "AA/YY" biçimlenir */
export function CardForm({ value, onChange, errors = {} }: { value: CardDraft; onChange: (v: CardDraft) => void; errors?: Partial<Record<keyof CardDraft, string>> }) {
  const { colors } = useTheme();
  const digits = value.number.replace(/\D/g, '');
  const brand = digits.length >= 2 ? detectCardBrand(digits) : undefined;
  return (
    <View style={styles.form}>
      <View style={[styles.cardPreview, { backgroundColor: colors.inverse }]}>
        <View style={styles.cardTop}>
          <Icon name="card" size={26} color={colors.primary} />
          <Text variant="headline" weight="800" color={colors.onInverse}>
            {brand ? BRAND_LABEL[brand] : ''}
          </Text>
        </View>
        <Text variant="title3" color={colors.onInverse} style={{ letterSpacing: 2 }} tabular>
          {(digits + '•'.repeat(Math.max(0, 16 - digits.length))).replace(/(.{4})/g, '$1 ').trim()}
        </Text>
        <View style={styles.cardTop}>
          <Text variant="footnote" color={colors.onInverse} numberOfLines={1} style={{ flex: 1 }}>
            {value.holder.toLocaleUpperCase('tr-TR') || 'AD SOYAD'}
          </Text>
          <Text variant="footnote" color={colors.onInverse}>
            {value.expiry || 'AA/YY'}
          </Text>
        </View>
      </View>
      <TextField
        label="Kart numarası"
        value={digits.replace(/(.{4})/g, '$1 ').trim()}
        onChangeText={(v) => onChange({ ...value, number: v.replace(/\D/g, '').slice(0, 16) })}
        keyboardType="number-pad"
        placeholder="0000 0000 0000 0000"
        textContentType="creditCardNumber"
        autoComplete="cc-number"
        error={errors.number}
      />
      <TextField label="Kart üzerindeki isim" value={value.holder} onChangeText={(v) => onChange({ ...value, holder: v })} autoCapitalize="characters" autoComplete="cc-name" error={errors.holder} />
      <View style={styles.row}>
        <TextField
          label="Son kullanma"
          value={value.expiry}
          onChangeText={(v) => {
            const d = v.replace(/\D/g, '').slice(0, 4);
            onChange({ ...value, expiry: d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d });
          }}
          keyboardType="number-pad"
          placeholder="AA/YY"
          autoComplete="cc-exp"
          error={errors.expiry}
          containerStyle={styles.flex}
        />
        <TextField
          label="CVC"
          value={value.cvc}
          onChangeText={(v) => onChange({ ...value, cvc: v.replace(/\D/g, '').slice(0, 4) })}
          keyboardType="number-pad"
          placeholder="123"
          secureTextEntry
          autoComplete="cc-csc"
          error={errors.cvc}
          containerStyle={styles.flex}
        />
      </View>
      <ListRow icon="shield-checkmark" title="3D Secure ile kayıt" subtitle={DEMO_MODE ? DEMO_COPY.payment : 'Kartın şifrelenerek saklanır; doğrulama için alınan ₺1 provizyon hemen iade edilir.'} subtitleLines={3} style={{ paddingHorizontal: 0 }} />
    </View>
  );
}

/** Test kartı ipucu (mock) */
export function TestCardHint({ onUse }: { onUse: (c: CardDraft) => void }) {
  const me = useMe();
  return (
    <Button
      title="Test kartı kullan"
      variant="ghost"
      size="sm"
      icon="flask-outline"
      onPress={() => onUse({ number: '4242424242424242', holder: me.displayName || 'TEST KULLANICI', expiry: '12/29', cvc: '123' })}
    />
  );
}

const styles = StyleSheet.create({
  form: { gap: 14 },
  row: { flexDirection: 'row', gap: 10 },
  flex: { flex: 1 },
  cardPreview: { borderRadius: radius.lg, padding: 18, gap: 16, aspectRatio: 1.7 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
});
