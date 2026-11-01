/**
 * Profil sheet'leri: ⋯ menüsü (paylaş, bağlantıyı kopyala, engelle, şikayet et) ve satıcı bildirim zili.
 */
import { StyleSheet, View } from 'react-native';

import { Icon, ListRow, Sheet, Text } from '@/components/ui';
import type { User } from '@/types';

import type { SellerNotifyLevel } from './store';

export function MoreSheet({
  visible,
  onClose,
  user,
  isMe,
  blocked,
  onShare,
  onCopy,
  onBlock,
  onReport,
  onEdit,
}: {
  visible: boolean;
  onClose: () => void;
  user: User;
  isMe: boolean;
  blocked: boolean;
  onShare: () => void;
  onCopy: () => void;
  onBlock: () => void;
  onReport: () => void;
  onEdit: () => void;
}) {
  return (
    <Sheet visible={visible} onClose={onClose} title={`@${user.username}`} showClose>
      <ListRow title="Profili paylaş" icon="share-outline" onPress={onShare} chevron={false} style={styles.row} />
      <ListRow title="Profil bağlantısını kopyala" icon="link-outline" onPress={onCopy} chevron={false} style={styles.row} />
      {isMe ? (
        <ListRow title="Profili düzenle" icon="create-outline" onPress={onEdit} chevron={false} style={styles.row} />
      ) : (
        <>
          <ListRow
            title={blocked ? 'Engeli kaldır' : 'Engelle'}
            subtitle={blocked ? undefined : 'Sessizce uygulanır; sana yazamaz, yayınlarına giremez'}
            icon={blocked ? 'lock-open-outline' : 'ban-outline'}
            destructive={!blocked}
            onPress={onBlock}
            chevron={false}
            style={styles.row}
          />
          <ListRow title="Şikayet et" icon="flag-outline" destructive onPress={onReport} chevron={false} style={styles.row} />
        </>
      )}
    </Sheet>
  );
}

const NOTIFY_OPTIONS: { key: SellerNotifyLevel; title: string; subtitle: string; icon: 'notifications' | 'notifications-off-outline' }[] = [
  { key: 'all', title: 'Tüm bildirimler', subtitle: 'Canlı yayına başladığında ve yeni yayın planladığında haber ver', icon: 'notifications' },
  { key: 'none', title: 'Bildirim yok', subtitle: 'Takip etmeye devam et ama bildirim gönderme', icon: 'notifications-off-outline' },
];

export function NotifySheet({ visible, onClose, user, value, onChange }: { visible: boolean; onClose: () => void; user: User; value: SellerNotifyLevel; onChange: (v: SellerNotifyLevel) => void }) {
  return (
    <Sheet visible={visible} onClose={onClose} title="Bildirimler" subtitle={`@${user.username} için bildirim tercihin`} showClose>
      {NOTIFY_OPTIONS.map((o) => (
        <ListRow
          key={o.key}
          title={o.title}
          subtitle={o.subtitle}
          icon={o.icon}
          onPress={() => onChange(o.key)}
          chevron={false}
          right={<Icon name={value === o.key ? 'radio-button-on' : 'radio-button-off'} size={22} color={value === o.key ? 'text' : 'textTertiary'} />}
          style={styles.row}
        />
      ))}
      <View style={styles.note}>
        <Text variant="caption" color="textTertiary">
          Genel bildirim ayarlarını Hesap › Bildirimler bölümünden değiştirebilirsin.
        </Text>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  row: { paddingHorizontal: 0 },
  note: { marginTop: 8 },
});
