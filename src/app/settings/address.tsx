import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { Button, EmptyState, Header, Screen, Text, toast } from '@/components/ui';
import { BottomBar, ConfirmSheet, InfoNote, SwitchRow } from '@/features/account/ui';
import { AddressForm, emptyAddress, validateAddress, type AddressDraft } from '@/features/wallet/forms';
import { haptic } from '@/lib/haptics';
import { useMe } from '@/store/auth';
import { useWalletStore } from '@/store/wallet';
import { SCREEN_PADDING } from '@/theme';

export default function AddressFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const me = useMe();
  const existing = useWalletStore((s) => (id ? s.addresses.find((a) => a.id === id) : undefined));
  const count = useWalletStore((s) => s.addresses.length);
  const addAddress = useWalletStore((s) => s.addAddress);
  const updateAddress = useWalletStore((s) => s.updateAddress);
  const removeAddress = useWalletStore((s) => s.removeAddress);

  const [draft, setDraft] = useState<AddressDraft>(() => {
    if (existing) {
      const { id: _omit, ...rest } = existing;
      return rest;
    }
    return { ...emptyAddress(me.displayName.includes(' ') ? me.displayName : ''), isDefault: true };
  });
  const [errors, setErrors] = useState<Partial<Record<keyof AddressDraft, string>>>({});
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const editing = !!id;
  const wasDefault = !!existing?.isDefault;

  if (editing && !existing) {
    return (
      <Screen>
        <Header title="Adresi düzenle" back="close" />
        <EmptyState icon="location-outline" title="Adres bulunamadı" message="Bu adres silinmiş olabilir." actionLabel="Adreslerime dön" onAction={() => router.back()} />
      </Screen>
    );
  }

  const save = () => {
    const e = validateAddress(draft);
    setErrors(e);
    if (Object.keys(e).length) {
      haptic.error();
      toast.error('Lütfen eksik alanları doldur');
      return;
    }
    setSaving(true);
    setTimeout(() => {
      const clean: AddressDraft = { ...draft, fullName: draft.fullName.trim(), line: draft.line.trim(), phone: draft.phone.replace(/\s+/g, ' ').trim() };
      if (existing) updateAddress(existing.id, clean);
      else addAddress(clean);
      setSaving(false);
      haptic.success();
      toast.success(existing ? 'Adres güncellendi' : 'Adres kaydedildi', 'location');
      router.back();
    }, 450);
  };

  return (
    <Screen>
      <Header title={editing ? 'Adresi düzenle' : 'Yeni adres'} back="close" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
          <AddressForm
            value={draft}
            onChange={(v) => {
              setDraft(v);
              if (Object.keys(errors).length) setErrors({});
            }}
            errors={errors}
          />
          {count > 0 ? (
            <SwitchRow
              title="Varsayılan adresim olsun"
              subtitle={wasDefault ? 'Varsayılanı değiştirmek için başka bir adresi varsayılan yap' : 'Siparişlerin otomatik olarak bu adrese gönderilir'}
              value={draft.isDefault}
              disabled={wasDefault}
              onChange={(v) => setDraft({ ...draft, isDefault: v })}
              style={{ paddingHorizontal: 0 }}
            />
          ) : null}
          <InfoNote icon="shield-checkmark-outline">Adresin yalnızca siparişinin satıcısıyla, kargo etiketini oluşturmak için paylaşılır.</InfoNote>
          {editing ? (
            <View style={{ alignItems: 'center', marginTop: 8 }}>
              <Text variant="headline" color="danger" onPress={() => setConfirmDelete(true)} suppressHighlighting style={{ padding: 8 }}>
                Adresi sil
              </Text>
            </View>
          ) : null}
        </ScrollView>
        <BottomBar>
          <Button title={editing ? 'Değişiklikleri kaydet' : 'Adresi kaydet'} size="lg" fullWidth loading={saving} onPress={save} />
        </BottomBar>
      </KeyboardAvoidingView>

      <ConfirmSheet
        visible={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        icon="trash-outline"
        destructive
        title="Adres silinsin mi?"
        message="Bu adres kalıcı olarak silinecek."
        confirmLabel="Adresi sil"
        onConfirm={() => {
          setConfirmDelete(false);
          router.back();
          if (existing) setTimeout(() => removeAddress(existing.id), 300);
          toast('Adres silindi', 'trash-outline');
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: SCREEN_PADDING, paddingTop: 8, paddingBottom: 32, gap: 16 },
});
