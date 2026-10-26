import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, EmptyState, Header, Icon, IconButton, PressableScale, Screen, Text, toast } from '@/components/ui';
import { ActionSheet, BottomBar, ConfirmSheet, IconCircle, Tag } from '@/features/account/ui';
import { formatPhone } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { useWalletStore } from '@/store/wallet';
import { SCREEN_PADDING, useTheme } from '@/theme';
import type { Address } from '@/types';

const TITLE_ICON = { Ev: 'home-outline', İş: 'business-outline' } as const;

export default function AddressesScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const addresses = useWalletStore((s) => s.addresses);
  const setDefault = useWalletStore((s) => s.setDefaultAddress);
  const remove = useWalletStore((s) => s.removeAddress);
  const [menuFor, setMenuFor] = useState<Address | null>(null);
  const [toDelete, setToDelete] = useState<Address | null>(null);

  const sorted = [...addresses].sort((a, b) => Number(b.isDefault) - Number(a.isDefault));
  const add = () => router.push('/settings/address');
  const edit = (a: Address) => router.push({ pathname: '/settings/address', params: { id: a.id } });

  return (
    <Screen>
      {/* safeTop açıkça: "/settings/addresses" yolu useIsSheetModal'daki "/settings/address" önekine takılıyor */}
      <Header title="Adreslerim" safeTop right={<IconButton name="add" onPress={add} accessibilityLabel="Adres ekle" />} />
      <FlatList
        data={sorted}
        keyExtractor={(a) => a.id}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 24 }}
        ItemSeparatorComponent={() => <View style={[styles.sep, { backgroundColor: colors.border }]} />}
        ListEmptyComponent={
          <EmptyState
            icon="location-outline"
            title="Kayıtlı adresin yok"
            message="Siparişlerinin sorunsuz ulaşması için bir teslimat adresi ekle."
            actionLabel="Adres ekle"
            onAction={add}
          />
        }
        renderItem={({ item: a }) => (
          <PressableScale scaleTo={0.985} onPress={() => edit(a)} style={styles.row} accessibilityRole="button" accessibilityLabel={`${a.title} adresi`}>
            <IconCircle name={TITLE_ICON[a.title as keyof typeof TITLE_ICON] ?? 'location-outline'} />
            <View style={{ flex: 1, gap: 2 }}>
              <View style={styles.titleRow}>
                <Text variant="headline" numberOfLines={1} style={{ flexShrink: 1 }}>
                  {a.title}
                </Text>
                {a.isDefault ? <Tag label="Varsayılan" tone="inverse" /> : null}
              </View>
              <Text variant="subhead" numberOfLines={1}>
                {a.fullName} · {formatPhone(a.phone)}
              </Text>
              <Text variant="subhead" color="textSecondary" numberOfLines={2}>
                {a.neighborhood}, {a.line}
              </Text>
              <Text variant="subhead" color="textSecondary" numberOfLines={1}>
                {a.district}/{a.city}
                {a.postalCode ? ` ${a.postalCode}` : ''}
              </Text>
            </View>
            <PressableScale
              scaleTo={0.9}
              hitSlop={10}
              onPress={() => {
                haptic.tap();
                setMenuFor(a);
              }}
              accessibilityRole="button"
              accessibilityLabel="Adres seçenekleri">
              <Icon name="ellipsis-horizontal" size={20} color="textSecondary" />
            </PressableScale>
          </PressableScale>
        )}
      />
      {addresses.length ? (
        <BottomBar>
          <Button title="Yeni adres ekle" variant="secondary" size="lg" fullWidth icon="add" onPress={add} />
        </BottomBar>
      ) : (
        <View style={{ height: insets.bottom }} />
      )}

      <ActionSheet
        visible={!!menuFor}
        onClose={() => setMenuFor(null)}
        title={menuFor?.title}
        subtitle={menuFor ? `${menuFor.district}/${menuFor.city}` : undefined}
        actions={
          menuFor
            ? [
                { label: 'Düzenle', icon: 'create-outline' as const, onPress: () => edit(menuFor) },
                ...(!menuFor.isDefault
                  ? [
                      {
                        label: 'Varsayılan adres yap',
                        icon: 'checkmark-circle-outline' as const,
                        onPress: () => {
                          setDefault(menuFor.id);
                          haptic.success();
                          toast.success('Varsayılan adres güncellendi', 'location');
                        },
                      },
                    ]
                  : []),
                { label: 'Sil', icon: 'trash-outline' as const, destructive: true, onPress: () => setToDelete(menuFor) },
              ]
            : []
        }
      />
      <ConfirmSheet
        visible={!!toDelete}
        onClose={() => setToDelete(null)}
        icon="trash-outline"
        destructive
        title="Adres silinsin mi?"
        message={toDelete ? `"${toDelete.title}" adresi kalıcı olarak silinecek. Hazırlanan siparişlerin bu işlemden etkilenmez.` : ''}
        confirmLabel="Adresi sil"
        onConfirm={() => {
          if (toDelete) remove(toDelete.id);
          setToDelete(null);
          haptic.success();
          toast('Adres silindi', 'trash-outline');
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingHorizontal: SCREEN_PADDING, paddingVertical: 14 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sep: { height: StyleSheet.hairlineWidth, marginLeft: SCREEN_PADDING + 52 },
});
