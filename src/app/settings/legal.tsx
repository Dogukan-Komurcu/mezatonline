import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Header, Screen, Sheet, Text, toast } from '@/components/ui';
import { LEGAL_DOCS, type LegalDoc } from '@/features/account/content';
import { useAccountStore } from '@/features/account/store';
import { ConfirmSheet, InfoNote, MenuGroup, MenuRow, SwitchRow } from '@/features/account/ui';
import { haptic } from '@/lib/haptics';
import { SCREEN_PADDING } from '@/theme';

export default function LegalScreen() {
  const insets = useSafeAreaInsets();
  const personalizedAds = useAccountStore((s) => s.personalizedAds);
  const iysEmail = useAccountStore((s) => s.iysEmail);
  const setFlag = useAccountStore((s) => s.setFlag);
  const [doc, setDoc] = useState<LegalDoc | null>(null);
  const [requestOpen, setRequestOpen] = useState(false);
  const [sending, setSending] = useState(false);

  return (
    <Screen>
      <Header title="Yasal & KVKK" />
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
        <Text variant="subhead" color="textSecondary" style={styles.intro}>
          Mezatonline’ı kullanırken geçerli olan sözleşmeler, kişisel verilerinin nasıl işlendiği ve izin tercihlerin.
        </Text>

        <MenuGroup title="Sözleşmeler ve politikalar">
          {LEGAL_DOCS.map((d) => (
            <MenuRow key={d.id} icon={d.icon} title={d.title} subtitle={`Son güncelleme: ${d.updated}`} onPress={() => setDoc(d)} />
          ))}
        </MenuGroup>

        <MenuGroup title="İzinlerin" footer="Açık rızanı istediğin zaman geri alabilirsin. Geri alma, önceki işlemlerin hukuka uygunluğunu etkilemez.">
          <SwitchRow title="Kişiselleştirilmiş reklam ve çerezler" subtitle="İlgi alanlarına göre kampanya gösterilmesine açık rıza" value={personalizedAds} onChange={(v) => setFlag('personalizedAds', v)} />
          <SwitchRow title="E-posta ile ticari ileti" subtitle="Kampanya, kupon ve yeni özelliklerden haberdar ol (İYS)" value={iysEmail} onChange={(v) => setFlag('iysEmail', v)} />
        </MenuGroup>

        <MenuGroup title="Veri hakların">
          <MenuRow icon="download-outline" title="Verilerimin bir kopyasını iste" subtitle="KVKK md. 11 · 30 gün içinde e-posta ile gönderilir" onPress={() => setRequestOpen(true)} />
        </MenuGroup>

        <View style={[styles.pad, { marginTop: 20 }]}>
          <InfoNote icon="business-outline">Mezatonline, 6563 sayılı Elektronik Ticaretin Düzenlenmesi Hakkında Kanun kapsamında aracı hizmet sağlayıcıdır. İletişim: kvkk@mezatonline.com</InfoNote>
        </View>
      </ScrollView>

      <Sheet
        visible={!!doc}
        onClose={() => setDoc(null)}
        title={doc?.title}
        subtitle={doc ? `Son güncelleme: ${doc.updated}` : undefined}
        showClose
        height={0.88}
        footer={<Button title="Okudum, anladım" size="lg" fullWidth onPress={() => setDoc(null)} />}>
        {doc ? (
          <View style={{ gap: 16, paddingBottom: 12 }}>
            <Text variant="body" color="textSecondary">
              {doc.intro}
            </Text>
            {doc.sections.map((s, i) => (
              <View key={s.h} style={{ gap: 4 }}>
                <Text variant="headline">
                  {i + 1}. {s.h}
                </Text>
                <Text variant="body" color="textSecondary">
                  {s.p}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
      </Sheet>

      <ConfirmSheet
        visible={requestOpen}
        onClose={() => setRequestOpen(false)}
        icon="download-outline"
        title="Veri talebi oluşturulsun mu?"
        message="Hesabına ait kişisel verilerin bir kopyası hazırlanıp kayıtlı e-posta adresine gönderilecek. Talepler en geç 30 gün içinde yanıtlanır."
        confirmLabel="Talep oluştur"
        loading={sending}
        onConfirm={() => {
          setSending(true);
          setTimeout(() => {
            setSending(false);
            setRequestOpen(false);
            haptic.success();
            toast.success('Talebin alındı. Hazır olduğunda e-posta ile bilgilendireceğiz.', 'mail-outline');
          }, 800);
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: SCREEN_PADDING },
  intro: { paddingHorizontal: SCREEN_PADDING, paddingTop: 4 },
});
