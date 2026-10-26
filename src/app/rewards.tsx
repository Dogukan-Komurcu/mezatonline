import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState, Header, Icon, PressableScale, Screen, Text, toast, UnderlineTabs } from '@/components/ui';
import { ConfirmSheet, IconCircle, InfoNote, SegmentedProgress } from '@/features/account/ui';
import { BouncyEmoji, ChallengeCard, Coin, nextMidnight, ReactionCard, ShopActionPill, shopState, useNow } from '@/features/rewards/components';
import { useQaParams } from '@/features/account/qa';
import { formatNumber, formatTimeUntil, formatTRY, timeAgoLong } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { useMe } from '@/store/auth';
import { DAILY_CHALLENGES, POINTS_SHOP, todayKey, useRewardsStore, type ShopItem } from '@/store/rewards';
import { useWalletStore } from '@/store/wallet';
import { liveColors, radius, SCREEN_PADDING, useTheme } from '@/theme';

type Tab = 'tasks' | 'shop' | 'history';

export default function RewardsScreen() {
  const qa = useQaParams();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const cardW = Math.floor((width - SCREEN_PADDING * 2 - 12) / 2);
  const now = useNow();
  const points = useRewardsStore((s) => s.points);
  const completed = useRewardsStore((s) => s.completed);
  const owned = useRewardsStore((s) => s.owned);
  const activeReaction = useRewardsStore((s) => s.activeReaction);
  const history = useRewardsStore((s) => s.history);
  const redeem = useRewardsStore((s) => s.redeem);
  const setActiveReaction = useRewardsStore((s) => s.setActiveReaction);
  const credits = useWalletStore((s) => s.credits);
  const me = useMe();

  const [tab, setTab] = useState<Tab>('tasks');
  const [confirm, setConfirm] = useState<ShopItem | null>(null);
  const jumbotrons = POINTS_SHOP.filter((i) => i.kind === 'jumbotron');
  const reactions = POINTS_SHOP.filter((i) => i.kind === 'reaction');
  const [heroId, setHeroId] = useState(jumbotrons[0]?.id);
  const hero = jumbotrons.find((j) => j.id === heroId) ?? jumbotrons[0];

  const doneToday = completed[todayKey(new Date(now))] ?? [];
  const earnedToday = DAILY_CHALLENGES.filter((c) => doneToday.includes(c.kind)).reduce((s, c) => s + c.points, 0);
  const maxToday = DAILY_CHALLENGES.reduce((s, c) => s + c.points, 0);
  const sortedChallenges = [...DAILY_CHALLENGES].sort((a, b) => Number(doneToday.includes(a.kind)) - Number(doneToday.includes(b.kind)));

  const onShopItem = (item: ShopItem) => {
    const state = shopState(item, owned, activeReaction, points);
    if (state === 'active') {
      toast(`${item.emoji} ${item.title} zaten kullanılıyor`);
      return;
    }
    if (state === 'owned') {
      if (item.kind === 'reaction') {
        setActiveReaction(item.id);
        haptic.success();
        toast.success(`${item.emoji} ${item.title} artık aktif tepkin`);
      } else toast(`${item.emoji} Bu jumbotron koleksiyonunda. Bir sonraki satın alımında gösterilecek.`);
      return;
    }
    if (state === 'locked') {
      haptic.warning();
      toast.warning(`${formatNumber(item.cost - points)} puan daha topla, sonra al`, 'lock-closed');
      return;
    }
    setConfirm(item);
  };

  const doRedeem = () => {
    const item = confirm;
    if (!item) return;
    const ok = redeem(item.id);
    setConfirm(null);
    if (!ok) {
      toast.error('Satın alınamadı. Puan bakiyeni kontrol et.');
      return;
    }
    haptic.success();
    if (item.kind === 'reaction') {
      setActiveReaction(item.id);
      toast.success(`${item.emoji} ${item.title} senin! Yayınlarda çift dokununca görünecek.`);
    } else toast.success(`${item.emoji} ${item.title} koleksiyonuna eklendi!`);
  };

  return (
    <Screen>
      <Header
        right={
          <View style={styles.balances}>
            <PressableScale onPress={() => router.push('/wallet')} style={[styles.balance, { backgroundColor: colors.surface }]} accessibilityRole="button" accessibilityLabel="Mezat Kredisi">
              <Icon name="gift" size={15} color="warning" />
              <Text variant="footnote" weight="800" tabular>
                {formatTRY(credits)}
              </Text>
            </PressableScale>
            <PressableScale onPress={() => setTab('shop')} style={[styles.balance, { backgroundColor: colors.surface }]} accessibilityRole="button" accessibilityLabel="Puanların">
              <Coin size={16} />
              <Text variant="footnote" weight="800" tabular>
                {formatNumber(points)}
              </Text>
            </PressableScale>
          </View>
        }
      />
      <ScrollView contentOffset={qa.offset} stickyHeaderIndices={[1]} contentContainerStyle={{ paddingBottom: insets.bottom + 32 }} showsVerticalScrollIndicator={false}>
        <Text variant="title2" style={styles.title}>
          Ödül Kazan, Ayrıcalıkların Kilidini Aç
        </Text>
        <View style={{ backgroundColor: colors.bg }}>
          <UnderlineTabs
            value={tab}
            onChange={setTab}
            tabs={[
              { key: 'tasks', label: 'Görevler' },
              { key: 'shop', label: 'Puan Mağazası' },
              { key: 'history', label: 'Geçmiş' },
            ]}
          />
        </View>

        {tab === 'tasks' ? (
          <View style={styles.body}>
            <View style={styles.rowBetween}>
              <Text variant="title3">Günlük Görevler</Text>
              <PressableScale
                onPress={() => toast('Görevler her gece 00:00’da yenilenir. Kazandığın puanların süresi hiç dolmaz.', 'information-circle')}
                style={styles.ends}
                accessibilityRole="button">
                <Text variant="footnote" weight="700" color="textSecondary">
                  Bitiş: {formatTimeUntil(nextMidnight(now), now)}
                </Text>
                <Icon name="information-circle-outline" size={15} color="textSecondary" />
              </PressableScale>
            </View>
            <Text variant="footnote" color="textTertiary" style={{ marginTop: -6 }}>
              İlerlemenin güncellenmesi birkaç dakika sürebilir.
            </Text>

            <View style={[styles.summary, { backgroundColor: colors.inverse }]}>
              <View style={styles.rowBetween}>
                <View>
                  <Text variant="footnote" weight="600" color={colors.onInverse} style={{ opacity: 0.7 }}>
                    Bugün kazandığın
                  </Text>
                  <View style={styles.summaryPoints}>
                    <Coin size={22} />
                    <Text variant="title2" color={colors.onInverse} tabular>
                      {formatNumber(earnedToday)}
                    </Text>
                    <Text variant="subhead" color={colors.onInverse} style={{ opacity: 0.6 }}>
                      / {formatNumber(maxToday)}
                    </Text>
                  </View>
                </View>
                <Text variant="headline" color={colors.onInverse}>
                  {doneToday.length}/{DAILY_CHALLENGES.length} görev
                </Text>
              </View>
              <SegmentedProgress total={DAILY_CHALLENGES.length} done={doneToday.length} />
            </View>

            <View style={styles.grid}>
              {sortedChallenges.map((c) => (
                <ChallengeCard key={c.kind} challenge={c} done={doneToday.includes(c.kind)} style={{ width: cardW }} />
              ))}
            </View>

            <PressableScale onPress={() => router.push('/wallet')} style={[styles.invite, { backgroundColor: colors.primary }]} accessibilityRole="button">
              <IconCircle name="people" size={44} bg={colors.onPrimary} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text variant="headline" color={colors.onPrimary}>
                  Arkadaşını davet et
                </Text>
                <Text variant="footnote" color={colors.onPrimary} style={{ opacity: 0.75 }}>
                  İkiniz de ₺250 Mezat Kredisi kazanın
                </Text>
              </View>
              <Icon name="chevron-forward" size={18} color={colors.onPrimary} />
            </PressableScale>
          </View>
        ) : null}

        {tab === 'shop' ? (
          <View style={styles.body}>
            <View style={[styles.shopBalance, { backgroundColor: colors.surface }]}>
              <Coin size={30} />
              <View style={{ flex: 1 }}>
                <Text variant="title3" tabular>
                  {formatNumber(points)} puan
                </Text>
                <Text variant="footnote" color="textSecondary">
                  Puanlarının süresi dolmaz. Görevlerle daha fazlasını kazan.
                </Text>
              </View>
              <Text variant="subhead" weight="700" color="accent" onPress={() => setTab('tasks')} suppressHighlighting>
                Kazan
              </Text>
            </View>

            {hero ? (
              <>
                <View>
                  <Text variant="title3">Jumbotronlar</Text>
                  <Text variant="footnote" color="textSecondary">
                    Satın alım yaptığında tüm izleyicilere adınla kutlama gösterilir
                  </Text>
                </View>
                <View style={[styles.hero, { backgroundColor: liveColors.panel }]}>
                  <View style={styles.heroStage}>
                    <BouncyEmoji key={hero.id} emoji={hero.emoji} size={76} />
                    <Text variant="footnote" weight="700" color={liveColors.textSecondary} numberOfLines={1}>
                      🎊 @{me.username} kazandı! 🎊
                    </Text>
                  </View>
                  <View style={styles.rowBetween}>
                    <View style={{ flex: 1 }}>
                      <Text variant="title3" color={liveColors.text} numberOfLines={1}>
                        {hero.title}
                      </Text>
                      <View style={styles.heroCost}>
                        <Coin size={15} />
                        <Text variant="footnote" weight="800" color={liveColors.text}>
                          {formatNumber(hero.cost)}
                        </Text>
                      </View>
                    </View>
                    <PressableScale onPress={() => onShopItem(hero)} accessibilityRole="button" accessibilityLabel={`${hero.title} al`}>
                      <ShopActionPill item={hero} state={shopState(hero, owned, activeReaction, points)} points={points} dark />
                    </PressableScale>
                  </View>
                </View>
                <View style={styles.strip}>
                  {jumbotrons.map((j) => {
                    const selected = j.id === hero.id;
                    return (
                      <PressableScale
                        key={j.id}
                        onPress={() => setHeroId(j.id)}
                        style={[styles.thumb, { backgroundColor: selected ? colors.inverse : colors.surface }]}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}>
                        <Text style={{ fontSize: 30, lineHeight: 38 }}>{j.emoji}</Text>
                        {owned.includes(j.id) ? <Icon name="checkmark-circle" size={16} color="success" style={styles.thumbCheck} /> : null}
                      </PressableScale>
                    );
                  })}
                </View>
              </>
            ) : null}

            <View style={{ marginTop: 8 }}>
              <Text variant="title3">Tepkiler</Text>
              <Text variant="footnote" color="textSecondary">
                Yayında ekrana çift dokunduğunda bu tepki uçuşur
              </Text>
            </View>
            <View style={styles.grid}>
              {reactions.map((r) => (
                <ReactionCard key={r.id} item={r} state={shopState(r, owned, activeReaction, points)} points={points} onPress={() => onShopItem(r)} style={{ width: cardW }} />
              ))}
            </View>
            <InfoNote icon="information-circle-outline">Puan Mağazası alımları kesindir; harcanan puanlar iade edilmez.</InfoNote>
          </View>
        ) : null}

        {tab === 'history' ? (
          <View style={{ paddingTop: 8 }}>
            {history.length ? (
              history.map((h) => (
                <View key={h.id} style={styles.historyRow}>
                  <IconCircle name={h.points >= 0 ? 'add' : 'bag-handle-outline'} bg={h.points >= 0 ? colors.primary : colors.surface} color={h.points >= 0 ? colors.onPrimary : colors.text} />
                  <View style={{ flex: 1 }}>
                    <Text variant="headline" numberOfLines={1}>
                      {h.label}
                    </Text>
                    <Text variant="footnote" color="textSecondary">
                      {h.points >= 0 ? 'Görev ödülü' : 'Puan Mağazası'} · {timeAgoLong(h.at)}
                    </Text>
                  </View>
                  <View style={styles.historyPts}>
                    <Text variant="headline" color={h.points >= 0 ? 'success' : 'text'} tabular>
                      {h.points >= 0 ? '+' : '−'}
                      {formatNumber(Math.abs(h.points))}
                    </Text>
                    <Coin size={15} />
                  </View>
                </View>
              ))
            ) : (
              <EmptyState icon="time-outline" title="Henüz hareket yok" message="Görev tamamladığında ve puan harcadığında burada göreceksin." actionLabel="Görevlere git" onAction={() => setTab('tasks')} />
            )}
          </View>
        ) : null}
      </ScrollView>

      <ConfirmSheet
        visible={!!confirm}
        onClose={() => setConfirm(null)}
        emoji={confirm?.emoji}
        title={confirm ? `${confirm.title} alınsın mı?` : ''}
        message={confirm ? `${formatNumber(confirm.cost)} puan harcanacak. Kalan bakiyen: ${formatNumber(points - confirm.cost)} puan.` : ''}
        confirmLabel="Puanla al"
        onConfirm={doRedeem}>
        <InfoNote icon="lock-closed-outline" style={{ marginTop: 4 }}>
          Alımlar kesindir, iade edilemez.
        </InfoNote>
      </ConfirmSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  balances: { flexDirection: 'row', gap: 8, paddingRight: 10 },
  balance: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, height: 32, borderRadius: radius.pill },
  title: { paddingHorizontal: SCREEN_PADDING, paddingBottom: 4 },
  body: { paddingHorizontal: SCREEN_PADDING, paddingTop: 18, gap: 14 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  ends: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  summary: { borderRadius: radius.xl, padding: 16, gap: 14 },
  summaryPoints: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  invite: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius.xl, marginTop: 4 },
  shopBalance: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius.lg },
  hero: { borderRadius: radius.xl, padding: 16, gap: 14 },
  heroStage: { alignItems: 'center', justifyContent: 'center', height: 150, gap: 4 },
  heroCost: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  strip: { flexDirection: 'row', gap: 10 },
  thumb: { flex: 1, height: 64, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  thumbCheck: { position: 'absolute', top: 6, right: 6 },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: SCREEN_PADDING, paddingVertical: 10 },
  historyPts: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
