import { StyleSheet } from 'react-native';

import { Divider, ListRow, Sheet } from '@/components/ui';
import { DEMO_COPY, DEMO_MODE, FEATURES } from '@/config/demo';

const SUPPORT_SUBTITLE = FEATURES.paidBoost && FEATURES.tips ? 'Yayını öne çıkar ya da bahşiş gönder' : FEATURES.paidBoost ? 'Yayını öne çıkar' : 'Bahşiş gönder';

export type MoreSheetProps = {
  visible: boolean;
  onClose: () => void;
  muted: boolean;
  chatHidden: boolean;
  clipping: boolean;
  onShare: () => void;
  onClip: () => void;
  onToggleMute: (muted: boolean) => void;
  onToggleChat: (hidden: boolean) => void;
  onReactions: () => void;
  /** Teslimat adresi, ödeme yöntemi, kredi ve kupon (cüzdan sayfası); verilmezse satır gizlenir */
  onWallet?: () => void;
  /** Verilmezse "Satıcıyı destekle" satırı gizlenir (FEATURES.paidBoost / FEATURES.tips) */
  onBoost?: () => void;
  /** Satıcının Müdavim Kartı programı varsa */
  onClub?: () => void;
  onCaptions: () => void;
  onHideShow: () => void;
  onReport: () => void;
  onLeave: () => void;
};

/** S32: Diğer (⋯) — paylaş, klip, tepkiler, ödeme ve adres, ses, sohbet, altyazı, yayın hakkında, gizle, şikayet, ayrıl */
export function MoreSheet(p: MoreSheetProps) {
  return (
    <Sheet visible={p.visible} onClose={p.onClose} dark title="Diğer">
      <ListRow title="Yayını paylaş" icon="share-outline" onPress={p.onShare} style={styles.row} />
      <ListRow
        title={p.clipping ? 'Klip oluşturuluyor…' : 'Klip oluştur'}
        subtitle="Az önce olanlardan 1 dakikalık kısa video çıkar"
        icon="film-outline"
        onPress={p.clipping ? undefined : p.onClip}
        style={styles.row}
      />
      <ListRow title="Tepkiler ve dev tepkiler" subtitle="Uçan tepkini seç" icon="heart-outline" onPress={p.onReactions} style={styles.row} />
      {p.onWallet ? (
        <ListRow title="Cüzdan" subtitle="Teslimat adresi, kart, Mezat kredisi ve kupon" icon="wallet-outline" onPress={p.onWallet} style={styles.row} />
      ) : null}
      {p.onBoost ? <ListRow title="Satıcıyı destekle" subtitle={SUPPORT_SUBTITLE} icon="flash-outline" onPress={p.onBoost} style={styles.row} /> : null}
      {p.onClub ? <ListRow title="Müdavim Kartı" subtitle="Bu satıcıdaki seviyeni ve ayrıcalıklarını gör" icon="id-card-outline" onPress={p.onClub} style={styles.row} /> : null}
      <Divider />
      <ListRow title="Sesi kapat" icon={p.muted ? 'volume-mute' : 'volume-high'} switchValue={p.muted} onSwitch={p.onToggleMute} style={styles.row} />
      <ListRow title="Sohbeti gizle" icon="chatbubbles-outline" switchValue={p.chatHidden} onSwitch={p.onToggleChat} style={styles.row} />
      <ListRow title="Altyazılar" subtitle="Cihazının erişilebilirlik ayarlarından açılır" icon="text-outline" onPress={p.onCaptions} style={styles.row} />
      {DEMO_MODE ? (
        <>
          <Divider />
          <ListRow title="Bu yayın hakkında" subtitle={DEMO_COPY.simulated} subtitleLines={4} icon="information-circle-outline" chevron={false} style={styles.row} />
        </>
      ) : null}
      <Divider />
      <ListRow title="Bu yayını gizle" subtitle="Benzer yayınları daha az göster ve sıradakine geç" icon="eye-off-outline" onPress={p.onHideShow} style={styles.row} />
      <ListRow title="Yayını şikayet et" icon="flag-outline" onPress={p.onReport} style={styles.row} />
      <ListRow title="Yayından ayrıl" icon="exit-outline" destructive chevron={false} onPress={p.onLeave} style={styles.row} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  row: { paddingHorizontal: 0 },
});
