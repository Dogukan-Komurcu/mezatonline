import { StyleSheet } from 'react-native';

import { Divider, ListRow, Sheet } from '@/components/ui';

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
  onBoost: () => void;
  /** Satıcının Sadakat Kulübü varsa */
  onClub?: () => void;
  onCaptions: () => void;
  onHideShow: () => void;
  onReport: () => void;
  onLeave: () => void;
};

/** S32: Diğer (⋯) — paylaş, klip, ses, sohbet, altyazı, gizle, şikayet, ayrıl */
export function MoreSheet(p: MoreSheetProps) {
  return (
    <Sheet visible={p.visible} onClose={p.onClose} dark title="Diğer">
      <ListRow title="Yayını paylaş" icon="share-outline" onPress={p.onShare} style={styles.row} />
      <ListRow
        title={p.clipping ? 'Klip oluşturuluyor…' : 'Klip oluştur'}
        subtitle="Son 60 saniyeyi profiline gizli olarak kaydet"
        icon="film-outline"
        onPress={p.clipping ? undefined : p.onClip}
        style={styles.row}
      />
      <ListRow title="Tepkiler ve Jumbotron" subtitle="Uçan tepkini seç" icon="heart-outline" onPress={p.onReactions} style={styles.row} />
      <ListRow title="Satıcıyı destekle" subtitle="Yayını öne çıkar ya da bahşiş gönder" icon="flash-outline" onPress={p.onBoost} style={styles.row} />
      {p.onClub ? <ListRow title="Sadakat Kulübü" subtitle="Seviyeni ve ödüllerini gör" icon="ribbon-outline" onPress={p.onClub} style={styles.row} /> : null}
      <Divider />
      <ListRow title="Sesi kapat" icon={p.muted ? 'volume-mute' : 'volume-high'} switchValue={p.muted} onSwitch={p.onToggleMute} style={styles.row} />
      <ListRow title="Sohbeti gizle" icon="chatbubbles-outline" switchValue={p.chatHidden} onSwitch={p.onToggleChat} style={styles.row} />
      <ListRow title="Altyazılar" subtitle="Cihazının erişilebilirlik ayarlarından açılır" icon="text-outline" onPress={p.onCaptions} style={styles.row} />
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
