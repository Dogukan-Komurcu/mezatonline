import { StyleSheet, View } from 'react-native';

import { Avatar, Button, PressableScale, Sheet, Text } from '@/components/ui';
import { formatCompact } from '@/lib/format';
import { liveColors, useTheme } from '@/theme';
import type { User } from '@/types';

import type { LiveViewer } from '../engine';

export type ViewersSheetProps = {
  visible: boolean;
  onClose: () => void;
  viewers: number;
  seller: User;
  sample: LiveViewer[];
  friends: User[];
  onViewerPress: (v: LiveViewer) => void;
  onSellerPress: () => void;
  onMessageFriend: (u: User) => void;
};

/** S31: izleyiciler — arkadaşların, satıcı & moderatörler, izleyenler */
export function ViewersSheet({ visible, onClose, viewers, seller, sample, friends, onViewerPress, onSellerPress, onMessageFriend }: ViewersSheetProps) {
  const { colors } = useTheme();
  const mods = sample.filter((v) => v.isMod);
  const others = sample.filter((v) => !v.isMod);
  const rest = Math.max(0, viewers - others.length - mods.length - friends.length - 1);
  return (
    <Sheet visible={visible} onClose={onClose} dark title={`İzleyiciler · ${formatCompact(viewers)}`} subtitle="Bu yayını şu an izleyenler" showClose height={0.82}>
      {friends.length ? (
        <>
          <Text variant="subhead" weight="800" color="textSecondary" style={styles.section}>
            Arkadaşların ({friends.length})
          </Text>
          {friends.map((f) => (
            <View key={f.id} style={styles.row}>
              <Avatar uri={f.avatar} name={f.username} size={40} />
              <View style={styles.flex}>
                <Text variant="headline" numberOfLines={1}>
                  {f.username}
                </Text>
                <Text variant="caption" color="textSecondary">
                  Seninle aynı yayında 👀
                </Text>
              </View>
              <Button title="Mesaj" size="sm" variant="secondary" icon="chatbubble-outline" onPress={() => onMessageFriend(f)} />
            </View>
          ))}
        </>
      ) : null}
      <Text variant="subhead" weight="800" color="textSecondary" style={styles.section}>
        Satıcı & moderatörler
      </Text>
      <PressableScale scaleTo={0.99} onPress={onSellerPress} style={styles.row}>
        <Avatar uri={seller.avatar} name={seller.username} size={40} />
        <View style={styles.flex}>
          <Text variant="headline" numberOfLines={1}>
            {seller.username}
          </Text>
          <Text variant="caption" color="textSecondary">
            Yayıncı
          </Text>
        </View>
        <View style={[styles.tag, { backgroundColor: liveColors.primary }]}>
          <Text variant="caption" weight="800" color={liveColors.onPrimary}>
            Satıcı
          </Text>
        </View>
      </PressableScale>
      {mods.map((m) => (
        <PressableScale key={m.id} scaleTo={0.99} onPress={() => onViewerPress(m)} style={styles.row}>
          <Avatar uri={m.avatar} name={m.username} size={40} />
          <View style={styles.flex}>
            <Text variant="headline" numberOfLines={1}>
              {m.username}
            </Text>
            <Text variant="caption" color="textSecondary">
              Moderatör
            </Text>
          </View>
          <View style={[styles.tag, { backgroundColor: colors.surfaceAlt }]}>
            <Text variant="caption" weight="800">
              Mod
            </Text>
          </View>
        </PressableScale>
      ))}
      <Text variant="subhead" weight="800" color="textSecondary" style={styles.section}>
        İzleyenler
      </Text>
      {others.map((v) => (
        <PressableScale key={v.id} scaleTo={0.99} onPress={() => onViewerPress(v)} style={styles.row}>
          <Avatar uri={v.avatar} name={v.username} size={36} />
          <Text variant="body" weight="600" numberOfLines={1} style={styles.flex}>
            {v.username}
          </Text>
        </PressableScale>
      ))}
      {rest > 0 ? (
        <Text variant="footnote" color="textTertiary" align="center" style={styles.more}>
          ve {formatCompact(rest)} kişi daha izliyor
        </Text>
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  section: { marginTop: 14, marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 7 },
  tag: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  more: { marginVertical: 14 },
});
