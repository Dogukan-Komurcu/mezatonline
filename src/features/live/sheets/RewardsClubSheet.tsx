import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { StyleSheet, View } from 'react-native';

import { Avatar, Button, Icon, Sheet, Text } from '@/components/ui';
import { formatDate, formatTRY } from '@/lib/format';
import { liveColors, useTheme } from '@/theme';
import type { User } from '@/types';

import { alpha } from '../components/styles';

type Tier = { key: string; name: string; emoji: string; purchases: number; spend: number; reward: string };

const TIERS: Tier[] = [
  { key: 'bronze', name: 'Bronz', emoji: '🥉', purchases: 1, spend: 0, reward: 'Sohbette Bronz üye rozeti' },
  { key: 'silver', name: 'Gümüş', emoji: '🥈', purchases: 3, spend: 750, reward: '%5 indirim kuponu (KULUP5)' },
  { key: 'gold', name: 'Altın', emoji: '🥇', purchases: 6, spend: 2500, reward: 'Ücretsiz kargo fırsatları' },
  { key: 'platinum', name: 'Platin', emoji: '💠', purchases: 12, spend: 7500, reward: 'Üyelere özel yayınlara erken erişim' },
  { key: 'diamond', name: 'Elmas', emoji: '💎', purchases: 25, spend: 20000, reward: 'Elmas rozet + öncelikli destek' },
];

function seasonEnd(now = new Date()): Date {
  const q = Math.floor(now.getMonth() / 3);
  return new Date(now.getFullYear(), q * 3 + 3, 0);
}

export type RewardsClubSheetProps = {
  visible: boolean;
  onClose: () => void;
  seller: User;
  purchases: number;
  spend: number;
  watchedMinutes: number;
  couponActive: boolean;
  onRedeem: (code: string) => void;
};

/** S33: satıcının Sadakat Kulübü — seviye, ilerleme, ödüller */
export function RewardsClubSheet({ visible, onClose, seller, purchases, spend, watchedMinutes, couponActive, onRedeem }: RewardsClubSheetProps) {
  const { colors } = useTheme();
  let tierIndex = -1;
  TIERS.forEach((t, i) => {
    if (purchases >= t.purchases && spend >= t.spend) tierIndex = i;
  });
  const tier = tierIndex >= 0 ? TIERS[tierIndex] : undefined;
  const next = TIERS[tierIndex + 1];
  const canRedeem = tierIndex >= 1;

  return (
    <Sheet visible={visible} onClose={onClose} dark showClose maxHeight={0.9}>
      <View style={styles.hero}>
        <View style={styles.crown}>
          <MaterialCommunityIcons name="crown" size={30} color={liveColors.onPrimary} />
        </View>
        <Text variant="title2" weight="900" align="center">
          Sadakat Kulübü
        </Text>
        <View style={styles.sellerRow}>
          <Avatar uri={seller.avatar} name={seller.username} size={20} />
          <Text variant="subhead" weight="600" color="textSecondary">
            {seller.username}
          </Text>
        </View>
        <View style={[styles.tierPill, { backgroundColor: tier ? alpha(liveColors.primary, 0.16) : colors.surface }]}>
          <Text variant="headline" weight="800" color={tier ? liveColors.primary : 'text'}>
            {tier ? `${tier.emoji} ${tier.name} üye` : 'Henüz üye değilsin'}
          </Text>
        </View>
        <Text variant="footnote" color="textSecondary" align="center">
          {tier ? `Sezon ${formatDate(seasonEnd())} tarihinde bitiyor. Sezon sonunda ilerleme sıfırlanır.` : 'Bu satıcıdan ilk alışverişinle otomatik olarak Bronz üye olursun.'}
        </Text>
      </View>

      {next ? (
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text variant="headline" weight="800">
            {next.emoji} {next.name} seviyesine ilerleme
          </Text>
          <Progress label="Tamamlanan alışveriş" value={purchases} target={next.purchases} display={`${Math.min(purchases, next.purchases)}/${next.purchases}`} />
          {next.spend > 0 ? <Progress label="Harcanan tutar" value={spend} target={next.spend} display={`${formatTRY(Math.min(spend, next.spend))} / ${formatTRY(next.spend)}`} /> : null}
          {!tier ? <Progress label="Bu yayında 10+ dk izle" value={watchedMinutes} target={10} display={`${Math.min(10, Math.floor(watchedMinutes))}/10 dk`} /> : null}
        </View>
      ) : (
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text variant="headline" weight="800">
            💎 En üst seviyedesin!
          </Text>
          <Text variant="footnote" color="textSecondary">
            Elmas üyeler yeni sezona Altın seviyeden başlar.
          </Text>
        </View>
      )}

      <Text variant="subhead" weight="800" color="textSecondary" style={styles.section}>
        Seviye ödülleri
      </Text>
      {TIERS.map((t, i) => {
        const unlocked = i <= tierIndex;
        return (
          <View key={t.key} style={styles.rewardRow}>
            <Text style={styles.emoji}>{t.emoji}</Text>
            <View style={styles.flex}>
              <Text variant="subhead" weight="700" color={unlocked ? 'text' : 'textSecondary'}>
                {t.name}
              </Text>
              <Text variant="caption" color="textSecondary">
                {t.reward}
              </Text>
            </View>
            {t.key === 'silver' && unlocked ? (
              <Button title={couponActive ? 'Uygulandı' : 'Kullan'} size="sm" variant={couponActive ? 'secondary' : 'primary'} disabled={couponActive} onPress={() => onRedeem('KULUP5')} />
            ) : (
              <Icon name={unlocked ? 'checkmark-circle' : 'lock-closed'} size={18} color={unlocked ? liveColors.success : colors.textTertiary} />
            )}
          </View>
        );
      })}
      {!canRedeem ? (
        <Text variant="caption" color="textTertiary" style={styles.footnote}>
          Kuponlar tek bir alışverişte kullanılır; teklif (fiyat önerisi) ve çoklu adet alımlarında geçerli değildir.
        </Text>
      ) : null}
    </Sheet>
  );
}

function Progress({ label, value, target, display }: { label: string; value: number; target: number; display: string }) {
  const { colors } = useTheme();
  const pct = Math.max(0, Math.min(1, target ? value / target : 1));
  return (
    <View style={styles.progress}>
      <View style={styles.progressHead}>
        <Text variant="footnote" weight="600">
          {label}
        </Text>
        <Text variant="footnote" weight="700" color="textSecondary">
          {display}
        </Text>
      </View>
      <View style={[styles.track, { backgroundColor: colors.surfaceAlt }]}>
        <View style={[styles.fill, { width: `${Math.round(pct * 100)}%`, backgroundColor: liveColors.primary }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  hero: { alignItems: 'center', gap: 6, paddingBottom: 6 },
  crown: { width: 56, height: 56, borderRadius: 16, backgroundColor: liveColors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  sellerRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tierPill: { borderRadius: 999, paddingHorizontal: 16, paddingVertical: 7, marginVertical: 4 },
  card: { borderRadius: 16, padding: 14, gap: 12, marginTop: 12 },
  section: { marginTop: 18, marginBottom: 4 },
  rewardRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  emoji: { fontSize: 22, lineHeight: 28 },
  footnote: { marginTop: 8, marginBottom: 4 },
  progress: { gap: 6 },
  progressHead: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  track: { height: 8, borderRadius: 4, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4 },
});
