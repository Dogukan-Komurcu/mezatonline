/**
 * Teklif vermeden / satın almadan önce ödeme yöntemi + teslimat adresi zorunluluğu.
 *
 * Kullanım (herhangi bir ekrandan):
 *   requireTransactSetup(() => engine.placeBid());
 * Eksik bilgi yoksa callback hemen çalışır; varsa alttan kurulum sayfası açılır,
 * tamamlanınca callback çalışır. <TransactSetupHost /> kök layout'ta bir kez render edilir.
 */
import { useState } from 'react';
import { View } from 'react-native';
import { create } from 'zustand';

import { Button, Icon, Sheet, Text, toast } from '@/components/ui';
import { haptic } from '@/lib/haptics';
import { useMe } from '@/store/auth';
import { useWalletStore } from '@/store/wallet';

import { AddressForm, CardForm, emptyAddress, emptyCard, TestCardHint, validateAddress, validateCard, type AddressDraft, type CardDraft } from './forms';

type SetupState = { open: boolean; dark: boolean; onReady?: () => void; reason?: string };

const useSetupStore = create<SetupState>(() => ({ open: false, dark: false }));

export function requireTransactSetup(onReady: () => void, opts: { dark?: boolean; reason?: string } = {}) {
  const { addresses, paymentMethods } = useWalletStore.getState();
  if (addresses.length > 0 && paymentMethods.length > 0) {
    onReady();
    return;
  }
  useSetupStore.setState({ open: true, onReady, dark: !!opts.dark, reason: opts.reason });
}

export function TransactSetupHost() {
  const { open, onReady, dark, reason } = useSetupStore();
  const me = useMe();
  const hasCard = useWalletStore((s) => s.paymentMethods.length > 0);
  const hasAddress = useWalletStore((s) => s.addresses.length > 0);
  const addPaymentMethod = useWalletStore((s) => s.addPaymentMethod);
  const addAddress = useWalletStore((s) => s.addAddress);
  const [card, setCard] = useState<CardDraft>(emptyCard);
  const [address, setAddress] = useState<AddressDraft>(() => emptyAddress(me.displayName));
  const [cardErrors, setCardErrors] = useState<Partial<Record<keyof CardDraft, string>>>({});
  const [addrErrors, setAddrErrors] = useState<Partial<Record<keyof AddressDraft, string>>>({});
  const [saving, setSaving] = useState(false);

  const step: 'card' | 'address' = !hasCard ? 'card' : 'address';
  const close = () => useSetupStore.setState({ open: false, onReady: undefined });

  const submit = () => {
    if (step === 'card') {
      const e = validateCard(card);
      setCardErrors(e);
      if (Object.keys(e).length) {
        haptic.error();
        return;
      }
      setSaving(true);
      setTimeout(() => {
        addPaymentMethod({ number: card.number, holder: card.holder, expiry: card.expiry });
        setSaving(false);
        setCard(emptyCard());
        haptic.success();
        toast.success('Kart kaydedildi', 'card');
        if (hasAddress) finish();
      }, 900);
    } else {
      const e = validateAddress(address);
      setAddrErrors(e);
      if (Object.keys(e).length) {
        haptic.error();
        return;
      }
      addAddress(address);
      haptic.success();
      toast.success('Adres kaydedildi', 'location');
      finish();
    }
  };

  const finish = () => {
    const cb = onReady;
    close();
    setTimeout(() => cb?.(), 350);
  };

  return (
    <Sheet
      visible={open}
      onClose={close}
      dark={dark}
      title={step === 'card' ? 'Ödeme yöntemi ekle' : 'Teslimat adresi ekle'}
      subtitle={reason ?? 'Teklif verebilmek ve satın alabilmek için bir kart ve teslimat adresi gerekli. Kartından yalnızca kazandığında çekim yapılır.'}
      maxHeight={0.94}
      showClose
      footer={
        <View style={{ gap: 8 }}>
          <Button title={step === 'card' ? (hasAddress ? 'Kaydet ve devam et' : 'Kaydet · Sonraki: Adres') : 'Kaydet ve devam et'} fullWidth size="lg" loading={saving} onPress={submit} />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Icon name="lock-closed" size={12} color={dark ? 'rgba(255,255,255,0.6)' : 'textTertiary'} />
            <Text variant="caption" color={dark ? 'rgba(255,255,255,0.6)' : 'textTertiary'}>
              {step === 'card' ? 'Adım 1/2 · 256-bit SSL ile korunur' : hasCard ? 'Adım 2/2' : 'Adres'}
            </Text>
          </View>
        </View>
      }>
      {step === 'card' ? (
        <>
          <CardForm value={card} onChange={setCard} errors={cardErrors} />
          <TestCardHint onUse={setCard} />
        </>
      ) : (
        <AddressForm value={address} onChange={setAddress} errors={addrErrors} />
      )}
    </Sheet>
  );
}
