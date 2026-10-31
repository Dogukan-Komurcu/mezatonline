import Constants from 'expo-constants';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Header, Screen, Text } from '@/components/ui';
import { DEMO_COPY } from '@/config/demo';
import { InfoNote, MenuGroup, MenuRow } from '@/features/account/ui';
import { SCREEN_PADDING } from '@/theme';

const PENDING = 'Şirket kuruluşundan sonra eklenecek';
const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';

/** Künye: şirket kurulana kadar ticari bilgiler yer tutucudur (herkese açık) */
export default function KunyeScreen() {
  const insets = useSafeAreaInsets();
  return (
    <Screen>
      <Header title="Künye ve İletişim" />
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
        <Text variant="subhead" color="textSecondary" style={styles.intro}>
          Mezatonline şu an demo sürümdür. Şirket kuruluşu tamamlandığında ticari bilgiler ve iletişim adresleri bu sayfada yayımlanacak.
        </Text>

        <MenuGroup title="Şirket bilgileri">
          <MenuRow icon="business-outline" title="Ticaret unvanı" subtitle={PENDING} />
          <MenuRow icon="barcode-outline" title="MERSİS numarası" subtitle={PENDING} />
          <MenuRow icon="receipt-outline" title="Vergi dairesi ve no" subtitle={PENDING} />
          <MenuRow icon="location-outline" title="Adres" subtitle={PENDING} />
          <MenuRow icon="mail-unread-outline" title="KEP adresi" subtitle={PENDING} />
        </MenuGroup>

        <MenuGroup title="İletişim">
          <MenuRow icon="mail-outline" title="E-posta" subtitle="destek@mezatonline.com · yayın öncesi aktif edilecek" />
        </MenuGroup>

        <MenuGroup title="Uygulama">
          <MenuRow icon="phone-portrait-outline" title="Uygulama" subtitle="Mezatonline (Demo sürüm)" value={`v${APP_VERSION}`} />
        </MenuGroup>

        <View style={[styles.pad, { marginTop: 20 }]}>
          <InfoNote icon="flask-outline">{DEMO_COPY.banner}</InfoNote>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: SCREEN_PADDING },
  intro: { paddingHorizontal: SCREEN_PADDING, paddingTop: 4 },
});
