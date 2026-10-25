import { StyleSheet, View } from 'react-native';

import { Avatar, ListRow, Sheet, Text } from '@/components/ui';

export type ChatUser = { id: string; username: string; avatar?: string; isMod?: boolean };

export type UserSheetProps = {
  visible: boolean;
  onClose: () => void;
  user?: ChatUser;
  blocked: boolean;
  onMention: () => void;
  onReport: () => void;
  onToggleBlock: () => void;
};

/** Sohbette kullanıcı adına dokununca: Bahset, Şikayet et, Engelle */
export function UserSheet({ visible, onClose, user, blocked, onMention, onReport, onToggleBlock }: UserSheetProps) {
  return (
    <Sheet visible={visible} onClose={onClose} dark>
      {user ? (
        <>
          <View style={styles.head}>
            <Avatar uri={user.avatar} name={user.username} size={64} />
            <Text variant="title3" weight="800">
              {user.username}
            </Text>
            <Text variant="footnote" color="textSecondary">
              {user.isMod ? 'Bu yayının moderatörü' : 'Bu yayını izliyor'}
            </Text>
          </View>
          <ListRow title="Sohbette bahset" subtitle={`Mesajına @${user.username} ekle`} icon="at" onPress={onMention} style={styles.row} />
          <ListRow title="Şikayet et" icon="flag-outline" onPress={onReport} style={styles.row} />
          <ListRow
            title={blocked ? 'Engeli kaldır' : 'Engelle'}
            subtitle={blocked ? 'Mesajları yeniden görünür' : 'Bu kişinin mesajlarını artık görmezsin'}
            icon={blocked ? 'checkmark-circle-outline' : 'ban'}
            destructive={!blocked}
            onPress={onToggleBlock}
            chevron={false}
            style={styles.row}
          />
        </>
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  head: { alignItems: 'center', gap: 6, paddingVertical: 8, marginBottom: 6 },
  row: { paddingHorizontal: 0 },
});
