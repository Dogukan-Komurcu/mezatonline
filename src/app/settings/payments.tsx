import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Header, Icon, IconButton, PressableScale, Screen, Text, toast } from '@/components/ui';
import { useAccountStore, type DeliveryPreference } from '@/features/account/store';
import { ActionSheet, CARD_BRAND_NAMES, CardBrandBadge, ConfirmSheet, InfoNote, isCardExpired, MenuGroup, MenuRow, OutlineCard, SwitchRow, Tag } from '@/features/account/ui';
import { useQaParams } from '@/features/account/qa';
import { haptic } from '@/lib/haptics';
import { selectDefaultAddress, useWalletStore } from '@/store/wallet';
import { radius, SCREEN_PADDING, useTheme } from '@/theme';
import type { PaymentMethod } from '@/types';

const DELIVERY_OPTIONS: { key: DeliveryPreference; title: string; text: string }[] = [
  { key: 'door', title: 'Adrese teslim', text: 'Kargo kapına kadar gelir.' },
  { key: 'branch', title: 'Kargo şubesinden teslim al', text: 'Siparişin en yakın şubede seni bekler; SMS ile bilgilendirilirsin.' },
];

export default function PaymentsScreen() {
  const qa = useQaParams();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const cards = useWalletStore((s) => s.paymentMethods);
  const setDefault = useWalletStore((s) => s.setDefaultPaymentMethod);
  const remove = useWalletStore((s) => s.removePaymentMethod);
  const address = useWalletStore(selectDefaultAddress);
  const addressCount = useWalletStore((s) => s.addresses.length);
  const weeklyBundling = useAccountStore((s) => s.weeklyBundling);
  const delivery = useAccountStore((s) => s.deliveryPreference);
  const setFlag = useAccountStore((s) => s.setFlag);
  const setDelivery = useAccountStore((s) => s.setDeliveryPreference);

  const [menuFor, setMenuFor] = useState<PaymentMethod | null>(null);
  const [confirmDefault, setConfirmDefault] = useState<PaymentMethod | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<PaymentMethod | null>(null);

  const sorted = [...cards].sort((a, b) => Number(b.isDefault) - Number(a.isDefault));

  const askDelete = (pm: PaymentMethod) => {
    if (cards.length <= 1) {
      haptic.warning();
      toast.warning('En az bir ödeme yöntemin kayıtlı olmalı. Önce yeni bir kart ekle.', 'card-outline');
      return;
    }
    setConfirmDelete(pm);
  };

  return (
    <Screen>
      <Header title="Ödeme ve Kargo" right={<IconButton name="add" onPress={() => router.push('/settings/add-card')} accessibilityLabel="Kart ekle" />} />
      <ScrollView contentOffset={qa.offset} contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
        <Text variant="subhead" color="textSecondary" style={styles.intro}>
          Teklif vermek, sipariş vermek ya da yayında ürün satın almak için gereklidir. Kartından yalnızca teklifini kazandığında, satın aldığında ya da fiyat önerin kabul edildiğinde çekim yapılır.
        </Text>

        <MenuGroup title="Ödeme yöntemleri">
          {sorted.length ? (
            sorted.map((pm) => {
              const expired = isCardExpired(pm.expiry);
              return (
                <PressableScale key={pm.id} scaleTo={0.985} onPress={() => setMenuFor(pm)} style={styles.cardRow} accessibilityRole="button" accessibilityLabel={`${CARD_BRAND_NAMES[pm.brand]} ${pm.last4}`}>
                  <CardBrandBadge brand={pm.brand} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text variant="headline" numberOfLines={1}>
                      {pm.bank} •••• {pm.last4}
                    </Text>
                    <Text variant="subhead" color={expired ? 'danger' : 'textSecondary'} numberOfLines={1}>
                      {CARD_BRAND_NAMES[pm.brand]} · SKT {pm.expiry}
                      {expired ? ' · Süresi doldu' : ''}
                    </Text>
                  </View>
                  {pm.isDefault ? <Tag label="Varsayılan" tone="inverse" /> : null}
                  <Icon name="ellipsis-horizontal" size={18} color="textSecondary" />
                </PressableScale>
              );
            })
          ) : (
            <View style={[styles.emptyCard, { backgroundColor: colors.surface }]}>
              <Icon name="card-outline" size={28} color="textSecondary" />
              <Text variant="headline" align="center">
                Henüz kayıtlı kartın yok
              </Text>
              <Text variant="subhead" color="textSecondary" align="center">
                Teklif verebilmek ve satın alabilmek için bir kart ekle. Visa, Mastercard ve Troy kabul edilir.
              </Text>
            </View>
          )}
          <MenuRow icon="add" title="Yeni kart ekle" subtitle="Kredi veya banka kartı · 3D Secure" onPress={() => router.push('/settings/add-card')} />
        </MenuGroup>

        <MenuGroup title="Teslimat">
          <MenuRow
            icon="location-outline"
            title="Teslimat adresi"
            subtitle={address ? `${address.fullName} · ${address.neighborhood}, ${address.district}/${address.city}` : 'Henüz adres eklemedin'}
            value={addressCount > 1 ? `${addressCount} adres` : undefined}
            onPress={() => router.push(address ? '/settings/addresses' : '/settings/address')}
          />
        </MenuGroup>

        <MenuGroup title="Kargo tercihleri">
          <View style={styles.pad}>
            <OutlineCard style={{ padding: 0 }}>
              <SwitchRow
                title="Haftalık birleştirme"
                subtitle="Aynı hafta aynı satıcıdan aldıkların tek pakette gelsin; kargo ücretini bir kez öde."
                value={weeklyBundling}
                onChange={(v) => {
                  setFlag('weeklyBundling', v);
                  toast.success(v ? 'Haftalık birleştirme açıldı' : 'Haftalık birleştirme kapatıldı', 'cube-outline');
                }}
                style={{ paddingHorizontal: 14 }}
              />
            </OutlineCard>
            <Text variant="headline" style={{ marginTop: 18, marginBottom: 8 }}>
              Teslimat şekli
            </Text>
            <View style={{ gap: 10 }}>
              {DELIVERY_OPTIONS.map((o) => {
                const selected = delivery === o.key;
                return (
                  <PressableScale
                    key={o.key}
                    scaleTo={0.985}
                    onPress={() => {
                      haptic.tap();
                      setDelivery(o.key);
                    }}
                    style={[styles.option, { borderColor: selected ? colors.text : colors.border, backgroundColor: colors.card }]}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}>
                    <Icon name={o.key === 'door' ? 'home-outline' : 'business-outline'} size={22} />
                    <View style={{ flex: 1 }}>
                      <Text variant="headline">{o.title}</Text>
                      <Text variant="subhead" color="textSecondary">
                        {o.text}
                      </Text>
                    </View>
                    <Icon name={selected ? 'radio-button-on' : 'radio-button-off'} size={22} color={selected ? 'text' : 'textTertiary'} />
                  </PressableScale>
                );
              })}
            </View>
          </View>
        </MenuGroup>

        <View style={[styles.pad, { marginTop: 24 }]}>
          <InfoNote icon="lock-closed-outline">Kart bilgilerin PCI-DSS uyumlu ödeme altyapısında şifrelenerek saklanır. Mezatonline kart numaranın tamamını görmez.</InfoNote>
        </View>
      </ScrollView>

      <ActionSheet
        visible={!!menuFor}
        onClose={() => setMenuFor(null)}
        title={menuFor ? `${menuFor.bank} •••• ${menuFor.last4}` : undefined}
        subtitle={menuFor?.isDefault ? 'Varsayılan ödeme yöntemin' : undefined}
        actions={
          menuFor
            ? [
                ...(!menuFor.isDefault ? [{ label: 'Varsayılan yap', icon: 'checkmark-circle-outline' as const, onPress: () => setConfirmDefault(menuFor) }] : []),
                { label: 'Kartı sil', icon: 'trash-outline' as const, destructive: true, onPress: () => askDelete(menuFor) },
              ]
            : []
        }
      />
      <ConfirmSheet
        visible={!!confirmDefault}
        onClose={() => setConfirmDefault(null)}
        icon="card-outline"
        title="Varsayılan kart yapılsın mı?"
        message={confirmDefault ? `Açık artırma kazançların ve satın alımların ${confirmDefault.bank} •••• ${confirmDefault.last4} kartından çekilecek.` : ''}
        confirmLabel="Varsayılan yap"
        onConfirm={() => {
          if (confirmDefault) setDefault(confirmDefault.id);
          setConfirmDefault(null);
          haptic.success();
          toast.success('Varsayılan kart güncellendi', 'card');
        }}
      />
      <ConfirmSheet
        visible={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        icon="trash-outline"
        destructive
        title="Kart silinsin mi?"
        message={
          confirmDelete
            ? `${confirmDelete.bank} •••• ${confirmDelete.last4} kartı hesabından kaldırılacak.${confirmDelete.isDefault ? ' Diğer kartın varsayılan olacak.' : ''}`
            : ''
        }
        confirmLabel="Kartı sil"
        onConfirm={() => {
          if (confirmDelete) remove(confirmDelete.id);
          setConfirmDelete(null);
          haptic.success();
          toast('Kart silindi', 'trash-outline');
        }}
      />
      {cards.length === 0 ? (
        <View style={[styles.sticky, { paddingBottom: Math.max(insets.bottom, 12), backgroundColor: colors.bg, borderTopColor: colors.border }]}>
          <Button title="Kart ekle" size="lg" fullWidth icon="add" onPress={() => router.push('/settings/add-card')} />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: SCREEN_PADDING },
  intro: { paddingHorizontal: SCREEN_PADDING, paddingTop: 4 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: SCREEN_PADDING, paddingVertical: 12 },
  emptyCard: { marginHorizontal: SCREEN_PADDING, marginVertical: 8, padding: 20, borderRadius: radius.lg, alignItems: 'center', gap: 6 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius.md, borderWidth: 1.5 },
  sticky: { paddingHorizontal: SCREEN_PADDING, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
});
