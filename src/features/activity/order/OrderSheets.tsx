/**
 * Sipariş detayı sheet'leri: teslimat adresini değiştir (S65), e-Arşiv fatura, Alıcı Koruması bilgisi.
 */
import { router } from 'expo-router';
import { useState } from 'react';
import { Share, StyleSheet, View } from 'react-native';

import { Button, Divider, EmptyState, Icon, PressableScale, Sheet, Text, toast } from '@/components/ui';
import { getUser } from '@/data';
import { formatDateTime, formatTRY } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { useMe } from '@/store/auth';
import { ORDER_SOURCE_LABELS } from '@/store/orders';
import { useWalletStore } from '@/store/wallet';
import { radius, useTheme } from '@/theme';
import type { Address, Order } from '@/types';

import { InfoBanner } from '../components';
import { useActivityExtras } from '../store';
import { addressLines, hashString, protectionLabel, type ProtectionInfo } from '../utils';

// ─── Teslimat adresini değiştir ─────────────────────────────────────────────

export function ChangeAddressSheet({ visible, onClose, order, currentAddressId }: { visible: boolean; onClose: () => void; order: Order; currentAddressId?: string }) {
  const addresses = useWalletStore((s) => s.addresses);
  const [picked, setPicked] = useState<string | undefined>();
  const selected = picked ?? currentAddressId;
  const close = () => {
    setPicked(undefined);
    onClose();
  };
  const update = () => {
    if (!selected || selected === currentAddressId) return;
    useActivityExtras.getState().setAddressOverride(order.id, selected);
    haptic.success();
    toast.success('Teslimat adresin güncellendi', 'location');
    close();
  };
  return (
    <Sheet
      visible={visible}
      onClose={close}
      title="Teslimat adresi"
      subtitle="Satıcı henüz kargolamadığı için adresini değiştirebilirsin. Bu gönderideki tüm ürünler yeni adrese gönderilir."
      showClose
      footer={<Button title="Güncelle" size="lg" fullWidth disabled={!selected || selected === currentAddressId} onPress={update} />}>
      {addresses.length === 0 ? (
        <EmptyState icon="location-outline" title="Kayıtlı adresin yok" message="Yeni bir teslimat adresi ekleyerek devam edebilirsin." style={styles.empty} />
      ) : (
        addresses.map((a) => <AddressOption key={a.id} address={a} selected={a.id === selected} onPress={() => setPicked(a.id)} />)
      )}
      <Button
        title="Yeni adres ekle"
        icon="add"
        variant="secondary"
        style={styles.addBtn}
        onPress={() => {
          close();
          setTimeout(() => router.push('/settings/address'), 250);
        }}
      />
      <Text variant="caption" color="textTertiary" style={styles.note}>
        Kargo kodu oluşturulduktan sonra adres değiştirilemez. Satıcılar alıcı adresini değiştiremez.
      </Text>
    </Sheet>
  );
}

function AddressOption({ address, selected, onPress }: { address: Address; selected: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  const l = addressLines(address);
  return (
    <PressableScale scaleTo={0.99} onPress={onPress} style={styles.addrRow} accessibilityRole="radio" accessibilityState={{ selected }}>
      <View style={[styles.pin, { backgroundColor: colors.surface }]}>
        <Icon name="location-outline" size={20} />
      </View>
      <View style={styles.flex}>
        <Text variant="headline" numberOfLines={1}>
          {l.title}
          {address.isDefault ? (
            <Text variant="caption" color="textSecondary">
              {'  '}Varsayılan
            </Text>
          ) : null}
        </Text>
        <Text variant="footnote" color="textSecondary" numberOfLines={2}>
          {l.line1}
        </Text>
        <Text variant="footnote" color="textSecondary">
          {l.line2}
        </Text>
      </View>
      <Icon name={selected ? 'radio-button-on' : 'radio-button-off'} size={22} color={selected ? 'text' : 'textTertiary'} />
    </PressableScale>
  );
}

// ─── e-Arşiv fatura ─────────────────────────────────────────────────────────

const KDV_RATE = 0.2;

export function InvoiceSheet({ visible, onClose, order, address }: { visible: boolean; onClose: () => void; order: Order; address?: Address }) {
  const { colors } = useTheme();
  const me = useMe();
  const seller = getUser(order.sellerId);
  const h = hashString(order.id);
  const year = new Date(order.createdAt).getFullYear();
  const invoiceNo = `MZA${year}${String(h % 1_000_000_000).padStart(9, '0')}`;
  const hex = h.toString(16).padStart(8, '0');
  const ettn = `${hex}-${hex.slice(0, 4)}-4${hex.slice(1, 4)}-a${hex.slice(5, 8)}-${(h * 7).toString(16).padStart(12, '0').slice(0, 12)}`;
  const vkn = String(1_000_000_000 + (h % 8_999_999_999)).slice(0, 10);
  const gross = Math.max(0, order.itemPrice + order.shippingCost + order.serviceFee - order.creditUsed);
  const base = Math.round((gross / (1 + KDV_RATE)) * 100) / 100;
  const kdv = Math.round((gross - base) * 100) / 100;
  const buyerName = address?.fullName ?? me.displayName;
  const cancelled = order.status === 'cancelled' || order.status === 'refunded';

  const lines: { label: string; value: number }[] = [
    { label: `${order.productTitle} (${order.quantity} adet)`, value: order.itemPrice },
    { label: 'Kargo bedeli', value: order.shippingCost },
    { label: 'Alıcı Koruması hizmet bedeli', value: order.serviceFee },
  ];
  if (order.creditUsed > 0) lines.push({ label: 'Mezat Kredisi indirimi', value: -order.creditUsed });

  const share = async () => {
    const text = [
      `e-Arşiv Fatura · ${invoiceNo}`,
      `Satıcı: ${seller?.displayName ?? 'Mezat satıcısı'} (VKN ${vkn})`,
      `Alıcı: ${buyerName}`,
      `Tarih: ${formatDateTime(order.createdAt)}`,
      ...lines.map((l) => `${l.label}: ${formatTRY(l.value, { cents: true })}`),
      `KDV (%20): ${formatTRY(kdv, { cents: true })}`,
      `Toplam: ${formatTRY(gross, { cents: true })}`,
      `ETTN: ${ettn}`,
    ].join('\n');
    try {
      await Share.share({ title: `Fatura ${invoiceNo}`, message: text });
    } catch {
      toast.error('Fatura paylaşılamadı');
    }
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="e-Arşiv Fatura"
      subtitle={`Sipariş ${order.number} · ${ORDER_SOURCE_LABELS[order.source]}`}
      showClose
      maxHeight={0.92}
      footer={<Button title="Faturayı paylaş" icon="share-outline" size="lg" fullWidth onPress={share} />}>
      <View style={[styles.invoice, { borderColor: colors.border, backgroundColor: colors.card }]}>
        <View style={styles.invoiceHead}>
          <View style={styles.flex}>
            <Text variant="headline">{seller?.displayName ?? 'Mezat satıcısı'}</Text>
            <Text variant="caption" color="textSecondary">
              VKN: {vkn} · {seller?.city ?? 'İstanbul'}
            </Text>
          </View>
          <View style={[styles.stamp, { borderColor: cancelled ? colors.danger : colors.success }]}>
            <Text variant="caption" weight="800" color={cancelled ? 'danger' : 'success'}>
              {cancelled ? 'İPTAL' : 'e-ARŞİV'}
            </Text>
          </View>
        </View>
        <Divider style={styles.invDivider} />
        <InvoiceMeta label="Fatura no" value={invoiceNo} />
        <InvoiceMeta label="Fatura tarihi" value={formatDateTime(order.createdAt)} />
        <InvoiceMeta label="Alıcı" value={buyerName} />
        {address ? <InvoiceMeta label="Adres" value={`${address.district} / ${address.city}`} /> : null}
        <InvoiceMeta label="Senaryo" value="e-Arşiv · İnternet satışı" />
        <Divider style={styles.invDivider} />
        {lines.map((l) => (
          <View key={l.label} style={styles.invLine}>
            <Text variant="footnote" style={styles.flex} numberOfLines={2}>
              {l.label}
            </Text>
            <Text variant="footnote" weight="600" tabular>
              {formatTRY(l.value, { cents: true })}
            </Text>
          </View>
        ))}
        <Divider style={styles.invDivider} />
        <InvoiceMeta label="Mal/Hizmet tutarı (KDV hariç)" value={formatTRY(base, { cents: true })} />
        <InvoiceMeta label="Hesaplanan KDV (%20)" value={formatTRY(kdv, { cents: true })} />
        <View style={styles.invLine}>
          <Text variant="headline" style={styles.flex}>
            Ödenecek tutar
          </Text>
          <Text variant="headline" tabular>
            {formatTRY(gross, { cents: true })}
          </Text>
        </View>
        <Text variant="caption" color="textTertiary" style={styles.ettn}>
          ETTN: {ettn}
        </Text>
      </View>
      <Text variant="caption" color="textTertiary" style={styles.note}>
        Bu fatura 213 sayılı VUK kapsamında elektronik ortamda düzenlenmiştir. Bir kopyası kayıtlı e-posta adresine de gönderildi.
      </Text>
    </Sheet>
  );
}

function InvoiceMeta({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.invLine}>
      <Text variant="footnote" color="textSecondary" style={styles.flex}>
        {label}
      </Text>
      <Text variant="footnote" weight="600" numberOfLines={1} style={styles.metaValue}>
        {value}
      </Text>
    </View>
  );
}

// ─── Alıcı Koruması ─────────────────────────────────────────────────────────

const COVERED = ['Ürün hiç gelmedi ya da kargoda kayboldu', 'Hasarlı, kırık ya da çalışmıyor', 'Eksik veya yanlış ürün', 'Açıklamaya ve fotoğraflara uygun değil', 'Sahte / taklit ürün'];
const NOT_COVERED = ['Fikir değişikliği (cayma hakkı ayrıca geçerlidir)', 'Açıklamada belirtilmiş kusurlar', 'Platform dışında yapılan ödemeler', 'Teslim alınmayan veya reddedilen paketler'];

export function ProtectionSheet({ visible, onClose, info, onGetHelp }: { visible: boolean; onClose: () => void; info: ProtectionInfo; onGetHelp: () => void }) {
  const { colors } = useTheme();
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Mezat Alıcı Garantisi"
      subtitle="Ürünün zamanında ve açıklandığı gibi gelmezse paranı iade ediyoruz."
      showClose
      footer={<Button title="Bu siparişle ilgili yardım al" size="lg" fullWidth onPress={onGetHelp} disabled={!info.active} />}>
      <InfoBanner
        icon={info.active ? 'shield-checkmark' : 'shield-outline'}
        tone={info.active ? 'success' : 'neutral'}
        text={`${protectionLabel(info)} · Teslimattan sonra ${info.windowDays} gün, satın almadan sonra en fazla 30 gün.`}
        style={styles.mbLg}
      />
      <Text variant="headline" style={styles.listTitle}>
        Koruma kapsamında
      </Text>
      {COVERED.map((t) => (
        <View key={t} style={styles.bullet}>
          <Icon name="checkmark-circle" size={18} color={colors.success} />
          <Text variant="callout" style={styles.flex}>
            {t}
          </Text>
        </View>
      ))}
      <Text variant="headline" style={[styles.listTitle, styles.mtLg]}>
        Kapsam dışında
      </Text>
      {NOT_COVERED.map((t) => (
        <View key={t} style={styles.bullet}>
          <Icon name="close-circle" size={18} color={colors.textTertiary} />
          <Text variant="callout" color="textSecondary" style={styles.flex}>
            {t}
          </Text>
        </View>
      ))}
      <Text variant="caption" color="textTertiary" style={styles.note}>
        Kartlar, sikkeler, sneaker ve lüks ürünlerde koruma süresi teslimattan sonra 7 gün; bitki ve gıdada 2 gündür. İadeler bankana bağlı olarak 2–10 iş günü içinde kartına yansır.
      </Text>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  empty: { paddingVertical: 24 },
  addBtn: { alignSelf: 'flex-start', marginTop: 12 },
  note: { marginTop: 12 },
  addrRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  pin: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  invoice: { borderWidth: StyleSheet.hairlineWidth * 2, borderRadius: radius.md, padding: 14, gap: 6 },
  invoiceHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stamp: { borderWidth: 1.5, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, transform: [{ rotate: '-6deg' }] },
  invDivider: { marginVertical: 6 },
  invLine: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  metaValue: { maxWidth: '60%' },
  ettn: { marginTop: 6 },
  mbLg: { marginBottom: 14 },
  mtLg: { marginTop: 16 },
  listTitle: { marginBottom: 6 },
  bullet: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingVertical: 4 },
});
