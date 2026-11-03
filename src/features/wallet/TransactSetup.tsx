/**
 * Teklif vermeden / satın almadan önce ödeme yöntemi + teslimat adresi zorunluluğu.
 *
 * Kullanım (herhangi bir ekrandan):
 *   requireTransactSetup(() => engine.placeBid());
 * Eksik bilgi yoksa callback hemen çalışır; varsa alttan kurulum sayfası açılır,
 * tamamlanınca callback çalışır. <TransactSetupHost /> kök layout'ta bir kez render edilir.
 */
import { useEffect, useId, useRef, useState } from 'react';
import { Platform, View } from 'react-native';
import { create } from 'zustand';

import { Button, Icon, Sheet, Text, toast } from '@/components/ui';
import { DEMO_MODE } from '@/config/demo';
import { AUTH_REASONS, isSignedIn, requireAuth } from '@/features/auth/gate';
import { haptic } from '@/lib/haptics';
import { useMe } from '@/store/auth';
import { useWalletStore } from '@/store/wallet';

import { AddressForm, CardForm, emptyAddress, emptyCard, TestCardHint, validateAddress, validateCard, type AddressDraft, type CardDraft } from './forms';

type SetupState = { open: boolean; dark: boolean; onReady?: () => void; reason?: string; scopedHosts: string[] };

const useSetupStore = create<SetupState>(() => ({ open: false, dark: false, scopedHosts: [] }));

export function requireTransactSetup(onReady: () => void, opts: { dark?: boolean; reason?: string; authReason?: string } = {}) {
  // Misafirse önce giriş/kayıt; tamamlanınca bu kontrol kaldığı yerden devam eder
  if (!isSignedIn()) {
    requireAuth(() => requireTransactSetup(onReady, opts), { reason: opts.authReason ?? AUTH_REASONS.buy });
    return;
  }
  const { addresses, paymentMethods } = useWalletStore.getState();
  if (addresses.length > 0 && paymentMethods.length > 0) {
    onReady();
    return;
  }
  useSetupStore.setState({ open: true, onReady, dark: !!opts.dark, reason: opts.reason });
}

/**
 * Kurulum sayfasını çizen host. Kök layout'ta bir kez (scoped olmadan) bulunur.
 * iOS'ta başka bir şey sunmakta olan denetleyici yeni Modal açamaz; pencere görünmez ve ekran
 * dokunuşlara kapanabilir. Bu yüzden modal ekranlar (canlı yayın, ödeme) ve
 * kendi sayfası açıkken requireTransactSetup çağıran sayfalar (Fiyat Öner, Ön Teklif, Bahşiş) içinde
 * `scoped` bir kopya çizer. Öneriler sekmesi de çizer: yardım ekranından yayının üstünde açılabilir.
 * Sayfayı yalnızca en son açılan kopya, yani en üstteki çizer; altındaki
 * kopyalar ve kökteki host susar. Android'de kopyalar bir şey çizmez, kökteki host yeterlidir.
 */
export function TransactSetupHost({ scoped = false }: { scoped?: boolean }) {
  const id = useId();
  const topHost = useSetupStore((s) => s.scopedHosts.at(-1));
  useEffect(() => {
    if (!scoped || Platform.OS !== 'ios') return;
    useSetupStore.setState((s) => ({ scopedHosts: [...s.scopedHosts, id] }));
    return () => useSetupStore.setState((s) => ({ scopedHosts: s.scopedHosts.filter((h) => h !== id) }));
  }, [scoped, id]);
  if (scoped ? topHost !== id : topHost) return null;
  return <SetupSheet />;
}

function SetupSheet() {
  const { open, onReady, dark, reason } = useSetupStore();
  const me = useMe();
  const hasCard = useWalletStore((s) => s.paymentMethods.length > 0);
  const hasAddress = useWalletStore((s) => s.addresses.length > 0);
  const addPaymentMethod = useWalletStore((s) => s.addPaymentMethod);
  const addAddress = useWalletStore((s) => s.addAddress);
  const [card, setCard] = useState<CardDraft>(emptyCard);
  const [address, setAddress] = useState<AddressDraft>(() => emptyAddress(me.displayName));
  // Sayfa uygulama açılırken (çoğu zaman misafirken) kurulur: ad soyad güncel hesaptan gelsin, elle yazılan ad korunsun
  const [seededName, setSeededName] = useState(me.displayName);
  if (seededName !== me.displayName) {
    setSeededName(me.displayName);
    setAddress((a) => (a.fullName === seededName ? { ...a, fullName: me.displayName } : a));
  }
  const [cardErrors, setCardErrors] = useState<Partial<Record<keyof CardDraft, string>>>({});
  const [addrErrors, setAddrErrors] = useState<Partial<Record<keyof AddressDraft, string>>>({});
  const [saving, setSaving] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const step: 'card' | 'address' = !hasCard ? 'card' : 'address';
  // Kart kaydedilirken kapatılırsa vazgeçilmiştir: kart eklenmez, bekleyen işlem çalışmaz
  const close = () => {
    clearTimeout(saveTimer.current);
    setSaving(false);
    useSetupStore.setState({ open: false, onReady: undefined });
  };

  const submit = () => {
    if (step === 'card') {
      const e = validateCard(card);
      setCardErrors(e);
      if (Object.keys(e).length) {
        haptic.error();
        return;
      }
      setSaving(true);
      saveTimer.current = setTimeout(() => {
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
      subtitle={reason ?? 'Kartını ve adresini bir kez kaydedersen teklif ve alışverişleri tek dokunuşla tamamlarsın. Kayıt sırasında kartından ücret alınmaz.'}
      maxHeight={0.94}
      showClose
      footer={
        <View style={{ gap: 8 }}>
          <Button title={step === 'card' ? (hasAddress ? 'Kaydet ve devam et' : 'Kaydet · Sonraki: Adres') : 'Kaydet ve devam et'} fullWidth size="lg" loading={saving} onPress={submit} />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Icon name="lock-closed" size={12} color={dark ? 'rgba(255,255,255,0.6)' : 'textTertiary'} />
            <Text variant="caption" color={dark ? 'rgba(255,255,255,0.6)' : 'textTertiary'}>
              {step === 'card' ? (DEMO_MODE ? 'Adım 1/2 · Demo: kart numarası saklanmaz' : 'Adım 1/2 · Bağlantı şifrelidir') : hasCard ? 'Adım 2/2' : 'Adres'}
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
