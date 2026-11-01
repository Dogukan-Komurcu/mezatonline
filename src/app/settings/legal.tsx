import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, Share, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Header, Screen, Sheet, Text, toast } from '@/components/ui';
import { DEMO_COPY } from '@/config/demo';
import { LEGAL_DOCS, type LegalDoc } from '@/features/account/content';
import { useAccountStore } from '@/features/account/store';
import { ConfirmSheet, InfoNote, MenuGroup, MenuRow, SwitchRow } from '@/features/account/ui';
import { useQaParams } from '@/features/account/qa';
import { AUTH_REASONS, requireAuth, useIsGuest } from '@/features/auth/gate';
import { useLivePrefs } from '@/features/live/liveStore';
import { haptic } from '@/lib/haptics';
import { LEGAL_VERSION, useAuthStore } from '@/store/auth';
import { useModerationStore } from '@/store/moderation';
import { useOrdersStore } from '@/store/orders';
import { useSettingsStore } from '@/store/settings';
import { useSocialStore } from '@/store/social';
import { useWalletStore } from '@/store/wallet';
import { SCREEN_PADDING } from '@/theme';

const DEMO_DOC: LegalDoc = {
  id: 'demo',
  title: 'Demo sürüm bilgilendirmesi',
  icon: 'flask-outline',
  updated: '1 Kasım 2026',
  intro: `${DEMO_COPY.banner} Mezatonline şu an örnek (mock) verilerle çalışan bir tanıtım sürümüdür; uygulamayı denemen için hazırlanmıştır.`,
  sections: [
    {
      h: 'Demo sürüm',
      p: 'Uygulamadaki satıcılar, ürünler, yayınlar, değerlendirmeler, rozetler ve takipçi sayıları örnek verilerdir. Gerçek bir satıcıyı, kişiyi veya markayı temsil etmez; hiçbir marka ya da kuruluşla iş birliği anlamına gelmez.',
    },
    {
      h: 'Canlı yayınlar simülasyondur',
      p: `${DEMO_COPY.simulated} Açık artırmalarda sana karşı teklif veren diğer “kullanıcılar” da bu simülasyonun parçasıdır.`,
    },
    {
      h: 'Ödeme, satış ve kargo yapılmaz',
      p: `${DEMO_COPY.payment} Siparişler, kargo takibi, örnek faturalar, Mezat Kredisi, kuponlar ve puanlar da örnektir; gerçek para, ürün veya hak karşılığı yoktur. Gerçek sürümde ödemen, lisanslı bir ödeme kuruluşu tarafından ürün sana ulaşana kadar bekletilir.`,
    },
    {
      h: 'Çekilişlerde gerçek ödül verilmez',
      p: `${DEMO_COPY.giveaway} Yayınlardaki çekilişler ve kazananlar örnek amaçlıdır. Gerçek ödüllü çekilişler Milli Piyango İdaresi izniyle düzenlenebilir.`,
    },
    {
      h: 'Verilerin bu cihazda kalır',
      p: 'Hesap ve profil bilgilerin, tercihlerin, adreslerin, kartlarının son 4 hanesi, siparişlerin ve mesajların yalnızca bu cihazda saklanır; bir sunucuya gönderilmez. Bu verilerin bir kopyasını bu sayfadaki “Veri hakların” bölümünden dışa aktarabilir, Tercihler > Hesabı sil adımıyla ya da uygulamayı kaldırarak cihazdan silebilirsin.',
    },
    {
      h: 'Hukuki metinler taslaktır',
      p: 'Kullanım Koşulları, Gizlilik Politikası, KVKK Aydınlatma Metni ve diğer sözleşmeler avukat incelemesi bekleyen taslaklardır. Şirket kuruluşu tamamlanmadığından şirket unvanı, MERSİS numarası ve adres henüz yer almıyor; ayrıntılar Künye ve İletişim sayfasında.',
    },
  ],
};

/** Fonksiyonları ayıklar: store durumunu düz veri olarak döndürür */
function plain<T extends object>(state: T): Record<string, unknown> {
  return Object.fromEntries(Object.entries(state).filter(([, v]) => typeof v !== 'function'));
}

/** Demo: bu cihazda kalıcı olarak saklanan hesap verilerini JSON olarak derler */
function buildDeviceExport(): string {
  const auth = useAuthStore.getState();
  const { pin, ...account } = plain(useAccountStore.getState());
  const wallet = useWalletStore.getState();
  return JSON.stringify(
    {
      olusturulma: new Date().toISOString(),
      aciklama: 'Demo: Bu dosya yalnızca bu cihazda saklanan verileri içerir; Mezatonline demo sürümünde sunucuda kişisel veri tutulmaz.',
      hukukiMetinSurumu: LEGAL_VERSION,
      hesap: {
        durum: auth.status,
        yontem: auth.method,
        telefon: auth.phone,
        eposta: auth.email,
        profil: auth.me,
        ilgiAlanlari: auth.interests,
        kosullarOnayi: auth.termsAcceptance,
        teklifKurallariOnayi: useLivePrefs.getState().bidRulesAcceptance,
      },
      hesapTercihleri: { ...account, pin: pin ? 'ayarlı (gösterilmez)' : undefined },
      uygulamaAyarlari: plain(useSettingsStore.getState()),
      sosyal: plain(useSocialStore.getState()),
      cuzdan: {
        adresler: wallet.addresses,
        // Kart numarası hiç saklanmaz; yalnızca son 4 hane
        kartlar: wallet.paymentMethods.map((p) => ({ marka: p.brand, son4: p.last4, sonKullanma: p.expiry, kartSahibi: p.holder, varsayilan: p.isDefault })),
        mezatKredisi: wallet.credits,
        krediHareketleri: wallet.creditHistory,
        davetKodu: wallet.referralCode,
      },
      siparisler: plain(useOrdersStore.getState()),
      sikayetler: useModerationStore.getState().reports,
    },
    null,
    2,
  );
}

export default function LegalScreen() {
  const qa = useQaParams();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ doc?: string }>();
  const personalizedAds = useAccountStore((s) => s.personalizedAds);
  const iysEmail = useAccountStore((s) => s.iysEmail);
  const setFlag = useAccountStore((s) => s.setFlag);
  const guest = useIsGuest();
  const [doc, setDoc] = useState<LegalDoc | null>(null);
  const [exportOpen, setExportOpen] = useState(false);

  // Ana sayfadaki demo şeridinden "Ayrıntılar" ile gelindiyse bilgilendirmeyi aç
  useEffect(() => {
    if (params.doc !== 'demo') return;
    const t = setTimeout(() => setDoc(DEMO_DOC), 350);
    return () => clearTimeout(t);
  }, [params.doc]);

  const exportData = async () => {
    try {
      await Share.share({ title: 'Mezatonline verilerim (demo)', message: buildDeviceExport() });
    } catch {
      toast.error('Paylaşım menüsü açılamadı');
    }
  };

  return (
    <Screen>
      <Header title="Yasal & KVKK" />
      <ScrollView contentOffset={qa.offset} contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
        <Text variant="subhead" color="textSecondary" style={styles.intro}>
          Mezatonline’ı kullanırken geçerli olan sözleşmeler, kişisel verilerinin nasıl işlendiği ve izin tercihlerin. Demo sürümde bu metinler taslaktır.
        </Text>

        <MenuGroup title="Sözleşmeler ve politikalar">
          {[DEMO_DOC, ...LEGAL_DOCS].map((d) => (
            <MenuRow key={d.id} icon={d.icon} title={d.title} subtitle={`Son güncelleme: ${d.updated}`} onPress={() => setDoc(d)} />
          ))}
        </MenuGroup>

        <MenuGroup title="İzinlerin" footer="Açık rızanı istediğin zaman geri alabilirsin. Geri alma, önceki işlemlerin hukuka uygunluğunu etkilemez.">
          <SwitchRow title="Kişiselleştirilmiş reklam ve çerezler" subtitle="İlgi alanlarına göre kampanya gösterilmesine açık rıza" value={personalizedAds} onChange={(v) => setFlag('personalizedAds', v)} />
          {guest ? null : (
            <SwitchRow
              title="E-posta ile ticari ileti"
              subtitle="Kampanya ve kuponlardan haberdar olmaya açık rıza (demoda e-posta gönderilmez)"
              value={iysEmail}
              onChange={(v) => setFlag('iysEmail', v)}
            />
          )}
        </MenuGroup>

        <MenuGroup title="Veri hakların">
          <MenuRow
            icon="download-outline"
            title="Verilerimin bir kopyasını al"
            subtitle="Demo: veriler bu cihazdan dışa aktarılır"
            onPress={() => requireAuth(() => setExportOpen(true), { reason: AUTH_REASONS.account })}
          />
        </MenuGroup>

        <MenuGroup title="Şirket ve iletişim">
          <MenuRow icon="business-outline" title="Künye ve İletişim" subtitle="Şirket bilgileri ve iletişim adresleri" onPress={() => router.push('/settings/kunye')} />
        </MenuGroup>

        <View style={[styles.pad, { marginTop: 20 }]}>
          <InfoNote icon="business-outline">
            Mezatonline (demo sürüm; şirket unvanı, MERSİS numarası ve adres şirket kuruluşundan sonra eklenecektir). Gerçek sürümde 6563 sayılı Elektronik Ticaretin Düzenlenmesi Hakkında Kanun
            kapsamında aracı hizmet sağlayıcı olarak hizmet verecektir.
          </InfoNote>
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
        visible={exportOpen}
        onClose={() => setExportOpen(false)}
        icon="download-outline"
        title="Verilerin dışa aktarılsın mı?"
        message="Demo: Bu cihazda saklanan profil, tercih, adres, kart (yalnızca son 4 hane), sosyal ve sipariş verilerin JSON olarak hazırlanıp paylaşım menüsünde açılır. Sunucuda saklanan veri yoktur."
        confirmLabel="Dışa aktar"
        onConfirm={() => {
          setExportOpen(false);
          haptic.success();
          // Sheet kapanma animasyonu bitmeden paylaşım menüsü açılmasın
          setTimeout(exportData, 350);
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: SCREEN_PADDING },
  intro: { paddingHorizontal: SCREEN_PADDING, paddingTop: 4 },
});
