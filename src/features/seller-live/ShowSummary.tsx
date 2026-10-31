/**
 * Yayın sonu özeti (seller.md §7.11): süre, brüt satış, satılan ürün, zirve izleyici,
 * yeni takipçi, bahşiş, en çok kazandıran ürün ve satış listesi.
 */
import { Image } from 'expo-image';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar, Button, Icon, Text } from '@/components/ui';
import { FEATURES } from '@/config/demo';
import { formatCompact, formatTRY } from '@/lib/format';
import { radius, SCREEN_PADDING, useTheme } from '@/theme';
import type { User } from '@/types';

import { Confetti } from './Confetti';
import { StatTile } from './controls';
import { formatDurationLong, VIA_LABELS, type ShowSummaryData } from './helpers';

export function ShowSummary({ data, me, onOrders, onHub, onRaidShow }: { data: ShowSummaryData; me: User; onOrders: () => void; onHub: () => void; onRaidShow?: () => void }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const paidSales = data.sales.filter((s) => s.via !== 'giveaway');
  const avg = paidSales.length ? data.gross / paidSales.length : 0;
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.bg }]}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 24, paddingHorizontal: SCREEN_PADDING, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInUp.duration(400)} style={styles.hero}>
          <Avatar uri={me.avatar} name={me.username} size={72} ring />
          <Text variant="title1" align="center">
            {data.rehearsal ? 'Prova tamamlandı 🎓' : data.raidTo ? 'Yayın devredildi 🚀' : 'Yayın bitti 🎉'}
          </Text>
          <Text variant="callout" color="textSecondary" align="center" numberOfLines={2}>
            {data.title}
          </Text>
          {data.raidTo ? (
            <View style={[styles.raid, { backgroundColor: colors.surface }]}>
              <Avatar uri={data.raidTo.avatar} name={data.raidTo.username} size={32} live />
              <Text variant="callout" weight="600" style={{ flex: 1 }}>
                {formatCompact(data.raidTo.viewers)} izleyicini @{data.raidTo.username} yayınına yönlendirdin
              </Text>
            </View>
          ) : null}
          {data.rehearsal ? (
            <Text variant="footnote" color="textSecondary" align="center">
              Provadaki satışlar kaydedilmedi. Hazır olduğunda gerçek yayınını başlatabilirsin.
            </Text>
          ) : null}
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(120).duration(400)} style={styles.grid}>
          <View style={styles.gridRow}>
            <StatTile label="Brüt satış" value={formatTRY(data.gross)} icon="cash-outline" accent={colors.success} />
            <StatTile label="Satılan ürün" value={String(data.itemsSold)} icon="pricetag-outline" />
          </View>
          <View style={styles.gridRow}>
            <StatTile label="Yayın süresi" value={formatDurationLong(data.durationSec)} icon="time-outline" />
            <StatTile label="Zirve izleyici" value={formatCompact(data.peakViewers)} icon="trending-up" />
          </View>
          <View style={styles.gridRow}>
            <StatTile label="Yeni takipçi" value={`+${formatCompact(data.newFollowers)}`} icon="person-add-outline" />
            {FEATURES.tips ? (
              <StatTile label="Bahşiş" value={formatTRY(data.tips)} icon="heart-outline" />
            ) : (
              <StatTile label="Sipariş" value={formatCompact(data.orders)} icon="receipt-outline" />
            )}
          </View>
          <View style={styles.gridRow}>
            <StatTile label="Ortalama sepet" value={formatTRY(Math.round(avg))} icon="basket-outline" />
            <StatTile label="Çekiliş / Paylaşım" value={`${data.giveaways} / ${data.shares}`} icon="gift-outline" />
          </View>
        </Animated.View>

        {data.topItem ? (
          <Animated.View entering={FadeInDown.delay(220).duration(400)}>
            <Text variant="title3" style={styles.section}>
              En çok kazandıran ürün
            </Text>
            <View style={[styles.top, { backgroundColor: colors.surface }]}>
              <Image
                source={{ uri: data.topItem.product.images[0] }}
                style={[styles.topThumb, { backgroundColor: colors.skeleton }]}
                contentFit="cover"
                cachePolicy="memory-disk"
              />
              <View style={{ flex: 1, gap: 3 }}>
                <Text variant="headline" numberOfLines={2}>
                  {data.topItem.product.title}
                </Text>
                <Text variant="footnote" color="textSecondary">
                  @{data.topItem.winner.username} · {VIA_LABELS[data.topItem.via]}
                </Text>
              </View>
              <Text variant="title3" color="success" tabular>
                {formatTRY(data.topItem.price)}
              </Text>
            </View>
          </Animated.View>
        ) : null}

        {data.sales.length ? (
          <Animated.View entering={FadeInDown.delay(300).duration(400)}>
            <Text variant="title3" style={styles.section}>
              Satışlar ({data.sales.length})
            </Text>
            {data.sales.slice(0, 8).map((s) => (
              <View key={s.id} style={[styles.saleRow, { borderBottomColor: colors.border }]}>
                <Image
                  source={{ uri: s.product.images[0] }}
                  style={[styles.saleThumb, { backgroundColor: colors.skeleton }]}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                  recyclingKey={s.id}
                />
                <View style={{ flex: 1 }}>
                  <Text variant="callout" weight="600" numberOfLines={1}>
                    {s.product.title}
                  </Text>
                  <Text variant="footnote" color="textSecondary" numberOfLines={1}>
                    @{s.winner.username} · {VIA_LABELS[s.via]}
                  </Text>
                </View>
                <Text variant="callout" weight="700" color={s.via === 'giveaway' ? 'textSecondary' : 'text'} tabular>
                  {s.via === 'giveaway' ? 'Hediye' : formatTRY(s.price)}
                </Text>
              </View>
            ))}
            {data.sales.length > 8 ? (
              <Text variant="footnote" color="textSecondary" style={{ marginTop: 8 }}>
                +{data.sales.length - 8} satış daha · tümü Siparişler'de
              </Text>
            ) : null}
          </Animated.View>
        ) : (
          <View style={[styles.noSales, { backgroundColor: colors.surface }]}>
            <Icon name="bulb-outline" size={20} color={colors.warning} />
            <Text variant="footnote" color="textSecondary" style={{ flex: 1 }}>
              Bu yayında satış olmadı. İpucu: düşük açılış fiyatlı (₺1–₺10) hızlı açık artırmalar izleyiciyi ısıtır ve yayına daha çok kişi çeker.
            </Text>
          </View>
        )}

        {!data.rehearsal && data.orders > 0 ? (
          <View style={[styles.ship, { backgroundColor: colors.surface }]}>
            <Icon name="cube-outline" size={20} />
            <Text variant="footnote" color="textSecondary" style={{ flex: 1 }}>
              {data.orders} siparişi 2 iş günü içinde kargoya ver. Zamanında kargolanan siparişler ödemeni hızlandırır.
            </Text>
          </View>
        ) : null}
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12), borderTopColor: colors.border, backgroundColor: colors.bg }]}>
        {data.raidTo && onRaidShow ? <Button title={`@${data.raidTo.username} yayınına git`} icon="rocket" size="lg" fullWidth onPress={onRaidShow} /> : null}
        {!data.rehearsal ? <Button title="Siparişlere git" icon="receipt-outline" size="lg" fullWidth variant={data.raidTo ? 'glass' : 'primary'} onPress={onOrders} /> : null}
        <Button title="Satıcı Paneline dön" size="lg" fullWidth variant={data.rehearsal ? 'primary' : 'ghost'} onPress={onHub} />
      </View>
      {!data.rehearsal && data.itemsSold > 0 ? <Confetti /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: 8, marginBottom: 20 },
  raid: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: radius.md, marginTop: 6, alignSelf: 'stretch' },
  grid: { gap: 10 },
  gridRow: { flexDirection: 'row', gap: 10 },
  section: { marginTop: 24, marginBottom: 10 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: radius.lg },
  topThumb: { width: 60, height: 60, borderRadius: radius.sm },
  saleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  saleThumb: { width: 44, height: 44, borderRadius: radius.sm },
  noSales: { flexDirection: 'row', gap: 10, padding: 12, borderRadius: radius.md, marginTop: 20 },
  ship: { flexDirection: 'row', gap: 10, padding: 12, borderRadius: radius.md, marginTop: 20, alignItems: 'center' },
  footer: { paddingHorizontal: SCREEN_PADDING, paddingTop: 12, gap: 8, borderTopWidth: StyleSheet.hairlineWidth },
});
