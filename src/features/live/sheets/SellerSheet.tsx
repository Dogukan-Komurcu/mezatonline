import { StyleSheet, View } from 'react-native';

import { Avatar, Button, Icon, ListRow, Sheet, Text } from '@/components/ui';
import { formatCompact, formatMonthYear, formatRating } from '@/lib/format';
import { useTheme } from '@/theme';
import type { User } from '@/types';

import { shipDaysLabel } from '../components/styles';

export type SellerSheetProps = {
  visible: boolean;
  onClose: () => void;
  seller: User;
  following: boolean;
  onToggleFollow: () => void;
  onMessage: () => void;
  /** Verilmezse satır gizlenir (FEATURES.tips) */
  onTip?: () => void;
  /** Verilmezse satır gizlenir (FEATURES.paidBoost) */
  onBoost?: () => void;
  onProfile: () => void;
  onReport: () => void;
  onBlock: () => void;
};

const BADGE_LABELS: Record<string, string> = {
  top_seller: '🏆 Gözde satıcı',
  verified: '✓ Onaylı',
  fast_shipper: '⚡ Hızlı kargo',
  partner: '🤝 Partner',
  new_seller: '✨ Yeni satıcı',
};

/** S29: yayında satıcı avatarına dokununca açılan mini profil */
export function SellerSheet({ visible, onClose, seller, following, onToggleFollow, onMessage, onTip, onBoost, onProfile, onReport, onBlock }: SellerSheetProps) {
  const { colors } = useTheme();
  return (
    <Sheet visible={visible} onClose={onClose} dark>
      <View style={styles.head}>
        <Avatar uri={seller.avatar} name={seller.username} size={72} verified={seller.badges.includes('verified')} />
        <Text variant="title3" weight="800" style={styles.name}>
          {seller.displayName}
        </Text>
        <Text variant="subhead" color="textSecondary">
          @{seller.username} · {seller.city}
        </Text>
        {seller.badges.length ? (
          <View style={styles.badges}>
            {seller.badges.map((b) => (
              <View key={b} style={[styles.badge, { backgroundColor: colors.surfaceAlt }]}>
                <Text variant="caption" weight="700">
                  {BADGE_LABELS[b] ?? b}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>
      <View style={[styles.stats, { backgroundColor: colors.surface }]}>
        <Stat value={`★ ${formatRating(seller.rating)}`} label={`${formatCompact(seller.reviewCount)} yorum`} />
        <Stat value={formatCompact(seller.followers)} label="takipçi" />
        <Stat value={formatCompact(seller.itemsSold)} label="satış" />
        <Stat value={shipDaysLabel(seller.avgShipDays)} label="kargoya verme" />
      </View>
      {seller.bio ? (
        <Text variant="subhead" color="textSecondary" numberOfLines={3} style={styles.bio}>
          {seller.bio}
        </Text>
      ) : null}
      <View style={styles.actions}>
        <Button
          title={following ? 'Takiptesin' : 'Takip Et'}
          icon={following ? 'checkmark' : 'person-add'}
          iconRight={following ? 'chevron-down' : undefined}
          variant={following ? 'secondary' : 'primary'}
          onPress={onToggleFollow}
          style={styles.flex}
        />
        <Button title="Mesaj" icon="chatbubble-outline" variant="secondary" onPress={onMessage} style={styles.flex} />
      </View>
      <View style={styles.rows}>
        {onTip ? <ListRow title="Bahşiş gönder" subtitle="Bahşişin %100'ü satıcıya gider" icon="cash-outline" onPress={onTip} style={styles.row} /> : null}
        {onBoost ? <ListRow title="Yayını öne çıkar" subtitle="Bu yayının daha çok kişiye ulaşmasına destek ol" icon="rocket-outline" onPress={onBoost} style={styles.row} /> : null}
        <ListRow title="Profili gör" subtitle={`Katılma: ${formatMonthYear(seller.joinedAt)}`} icon="person-circle-outline" onPress={onProfile} style={styles.row} />
        <ListRow title="Şikayet et" icon="flag-outline" onPress={onReport} style={styles.row} />
        <ListRow title="Engelle" icon="ban" destructive onPress={onBlock} style={styles.row} chevron={false} />
      </View>
      <View style={styles.protect}>
        <Icon name="shield-checkmark" size={14} color="textSecondary" />
        <Text variant="caption" color="textSecondary">
          Bu satıcıdan yaptığın tüm alışverişler Alıcı Koruması kapsamında.
        </Text>
      </View>
    </Sheet>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text variant="headline" weight="800" numberOfLines={1}>
        {value}
      </Text>
      <Text variant="caption" color="textSecondary" numberOfLines={1} align="center">
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  head: { alignItems: 'center', paddingTop: 4 },
  name: { marginTop: 10 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6, marginTop: 10 },
  badge: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 },
  stats: { flexDirection: 'row', borderRadius: 14, paddingVertical: 12, marginTop: 16 },
  stat: { flex: 1, alignItems: 'center', gap: 2, paddingHorizontal: 2 },
  bio: { marginTop: 12, textAlign: 'center' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  rows: { marginTop: 8 },
  row: { paddingHorizontal: 0 },
  protect: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center', marginTop: 8, marginBottom: 4 },
});
