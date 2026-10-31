import { StyleSheet, View } from 'react-native';

import { Avatar, Button, Icon, Sheet, Text, type IconName } from '@/components/ui';
import { MUDAVIM_COUPON_CODE } from '@/features/live/liveStore';
import { formatTRY } from '@/lib/format';
import { liveColors } from '@/theme';
import type { User } from '@/types';

import { alpha } from '../components/styles';

/**
 * Müdavim Kartı: satıcıya özel sadakat programı.
 * Seviyeler Ahilik geleneğinden gelir ve yalnızca bu satıcıdan yapılan alışveriş sayısına bağlıdır:
 * Çırak (1+), Kalfa (5+), Usta (15+). Kalfa seviyesinde tek kullanımlık indirim kodu açılır.
 */

type Tier = { key: 'cirak' | 'kalfa' | 'usta'; name: string; icon: IconName; purchases: number; perk: string };

const TIERS: Tier[] = [
  { key: 'cirak', name: 'Çırak', icon: 'leaf-outline', purchases: 1, perk: 'Yayın sohbetinde adının yanında Çırak rozeti' },
  { key: 'kalfa', name: 'Kalfa', icon: 'hammer-outline', purchases: 5, perk: `Tek alışverişte %5 indirim (en fazla ₺75) · kod ${MUDAVIM_COUPON_CODE}` },
  { key: 'usta', name: 'Usta', icon: 'ribbon-outline', purchases: 15, perk: 'Usta rozeti, yeni yayınlara erken erişim ve öncelikli destek' },
];

/** İndirim kodunun açıldığı seviye */
const COUPON_TIER: Tier['key'] = 'kalfa';
const TOP = TIERS[TIERS.length - 1].purchases;
/** Henüz kartı olmayanlara gösterilen tanışma adımı (seviyeyi etkilemez) */
const WATCH_GOAL_MIN = 10;

export type RewardsClubSheetProps = {
  visible: boolean;
  onClose: () => void;
  seller: User;
  /** Bu satıcıdan tamamlanan alışveriş sayısı (seviyeyi belirler) */
  purchases: number;
  /** Bu satıcıdan toplam harcama (bilgi amaçlı gösterilir) */
  spend: number;
  watchedMinutes: number;
  /** Müdavim indirim kodu şu an uygulanmış mı */
  couponActive: boolean;
  onRedeem: (code: string) => void;
};

export function RewardsClubSheet({ visible, onClose, seller, purchases, spend, watchedMinutes, couponActive, onRedeem }: RewardsClubSheetProps) {
  let tierIndex = -1;
  TIERS.forEach((t, i) => {
    if (purchases >= t.purchases) tierIndex = i;
  });
  const tier = tierIndex >= 0 ? TIERS[tierIndex] : undefined;
  const next = TIERS[tierIndex + 1];
  const couponIndex = TIERS.findIndex((t) => t.key === COUPON_TIER);
  const canRedeem = tierIndex >= couponIndex;
  const left = next ? next.purchases - purchases : 0;

  return (
    <Sheet visible={visible} onClose={onClose} dark showClose maxHeight={0.9}>
      <View style={styles.card}>
        <View style={styles.cardHead}>
          <View style={styles.emblem}>
            <Icon name="id-card-outline" size={26} color={liveColors.copper} />
          </View>
          <View style={styles.flex}>
            <Text variant="title3" weight="800" color={liveColors.text}>
              Müdavim Kartı
            </Text>
            <View style={styles.sellerRow}>
              <Avatar uri={seller.avatar} name={seller.username} size={18} />
              <Text variant="footnote" weight="600" color={liveColors.textSecondary} numberOfLines={1}>
                {seller.username}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.statsRow}>
          <View style={styles.flex}>
            <Text variant="caption" color={liveColors.textTertiary}>
              Seviyen
            </Text>
            <Text variant="headline" weight="800" color={tier ? liveColors.copper : liveColors.text}>
              {tier ? tier.name : 'Henüz kartın yok'}
            </Text>
          </View>
          <View style={styles.stat}>
            <Text variant="caption" color={liveColors.textTertiary}>
              Alışveriş
            </Text>
            <Text variant="headline" weight="800" color={liveColors.text} tabular>
              {purchases}
            </Text>
          </View>
          <View style={styles.stat}>
            <Text variant="caption" color={liveColors.textTertiary}>
              Toplam
            </Text>
            <Text variant="headline" weight="800" color={liveColors.text} tabular numberOfLines={1}>
              {formatTRY(spend)}
            </Text>
          </View>
        </View>

        <TierTrack purchases={purchases} />
      </View>

      <Text variant="footnote" color="textSecondary" align="center" style={styles.lead}>
        {next
          ? tier
            ? `${next.name} olmak için bu satıcıdan ${left} alışveriş daha yap.`
            : `Bu satıcıdan ilk alışverişinle kartın açılır ve ${next.name} olursun.`
          : 'Kartın en üst seviyede: artık bu satıcının ustasısın.'}
      </Text>

      {!tier ? (
        <View style={styles.box}>
          <Progress label={`Satıcıyı tanı: bu yayında ${WATCH_GOAL_MIN} dk izle`} value={watchedMinutes} target={WATCH_GOAL_MIN} display={`${Math.min(WATCH_GOAL_MIN, Math.floor(watchedMinutes))}/${WATCH_GOAL_MIN} dk`} />
          <Progress label="İlk alışveriş" value={purchases} target={1} display={`${Math.min(purchases, 1)}/1`} />
        </View>
      ) : null}

      <Text variant="subhead" weight="800" color="textSecondary" style={styles.section}>
        Seviye ayrıcalıkları
      </Text>
      {TIERS.map((t, i) => {
        const unlocked = i <= tierIndex;
        return (
          <View key={t.key} style={styles.perkRow}>
            <View style={[styles.perkIcon, { backgroundColor: unlocked ? alpha(liveColors.copper, 0.16) : liveColors.glassLight }]}>
              <Icon name={t.icon} size={18} color={unlocked ? liveColors.copper : liveColors.textTertiary} />
            </View>
            <View style={styles.flex}>
              <Text variant="subhead" weight="700" color={unlocked ? 'text' : 'textSecondary'}>
                {t.name} · {t.purchases}+ alışveriş
              </Text>
              <Text variant="caption" color="textSecondary">
                {t.perk}
              </Text>
            </View>
            {t.key === COUPON_TIER && unlocked ? (
              <Button title={couponActive ? 'Uygulandı' : 'Kullan'} size="sm" variant={couponActive ? 'secondary' : 'primary'} disabled={couponActive} onPress={() => onRedeem(MUDAVIM_COUPON_CODE)} />
            ) : (
              <Icon name={unlocked ? 'checkmark-circle-outline' : 'lock-closed-outline'} size={18} color={unlocked ? liveColors.success : liveColors.textTertiary} />
            )}
          </View>
        );
      })}
      {!canRedeem ? (
        <Text variant="caption" color="textTertiary" style={styles.footnote}>
          İndirim kodu tek bir alışverişte kullanılır; fiyat önerisiyle alınan ürünlerde ve çoklu adet alımlarında geçerli değildir.
        </Text>
      ) : null}
    </Sheet>
  );
}

/** Çırak → Kalfa → Usta basamakları; dolum bu satıcıdan yapılan alışveriş sayısını gösterir */
function TierTrack({ purchases }: { purchases: number }) {
  const pct = Math.max(0, Math.min(1, purchases / TOP));
  return (
    <View style={styles.trackWrap}>
      <View style={styles.trackLine}>
        <View style={[styles.trackFill, { width: `${Math.round(pct * 100)}%` }]} />
      </View>
      {TIERS.map((t) => {
        const reached = purchases >= t.purchases;
        const left = `${(t.purchases / TOP) * 100}%` as const;
        return (
          <View key={t.key} style={[styles.node, { left }]}>
            <View style={[styles.nodeDot, reached && styles.nodeDotOn]} />
            <Text variant="caption" weight="700" color={reached ? liveColors.copper : liveColors.textTertiary} numberOfLines={1} style={styles.nodeLabel}>
              {t.name}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function Progress({ label, value, target, display }: { label: string; value: number; target: number; display: string }) {
  const pct = Math.max(0, Math.min(1, target ? value / target : 1));
  return (
    <View style={styles.progress}>
      <View style={styles.progressHead}>
        <Text variant="footnote" weight="600" style={styles.flex}>
          {label}
        </Text>
        <Text variant="footnote" weight="700" color="textSecondary" tabular>
          {display}
        </Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.round(pct * 100)}%` }]} />
      </View>
    </View>
  );
}

const NODE_W = 56;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: {
    borderRadius: 18,
    padding: 16,
    gap: 14,
    backgroundColor: alpha(liveColors.copper, 0.1),
    borderWidth: 1,
    borderColor: alpha(liveColors.copper, 0.35),
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  emblem: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: alpha(liveColors.copper, 0.18) },
  sellerRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: alpha(liveColors.copper, 0.35) },
  statsRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 16 },
  stat: { alignItems: 'flex-end', maxWidth: 110 },
  trackWrap: { height: 34, marginHorizontal: NODE_W / 2, marginTop: 2 },
  trackLine: { position: 'absolute', left: 0, right: 0, top: 5, height: 4, borderRadius: 2, backgroundColor: liveColors.glassLight, overflow: 'hidden' },
  trackFill: { height: 4, borderRadius: 2, backgroundColor: liveColors.copper },
  node: { position: 'absolute', top: 0, width: NODE_W, marginLeft: -NODE_W / 2, alignItems: 'center', gap: 4 },
  nodeDot: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: liveColors.textTertiary, backgroundColor: liveColors.panel },
  nodeDotOn: { borderColor: liveColors.copper, backgroundColor: liveColors.copper },
  nodeLabel: { textAlign: 'center' },
  lead: { marginTop: 12, paddingHorizontal: 8 },
  box: { borderRadius: 16, padding: 14, gap: 12, marginTop: 12, backgroundColor: liveColors.panelAlt },
  section: { marginTop: 18, marginBottom: 4 },
  perkRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  perkIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  footnote: { marginTop: 8, marginBottom: 4 },
  progress: { gap: 6 },
  progressHead: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  track: { height: 8, borderRadius: 4, overflow: 'hidden', backgroundColor: liveColors.glassLight },
  fill: { height: 8, borderRadius: 4, backgroundColor: liveColors.primary },
});
