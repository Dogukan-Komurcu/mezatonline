/**
 * Profil sekmelerinin parçaları: rozetler, puan özeti, değerlendirme kartı, Hakkında bölümü.
 */
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Avatar, Chip, Icon, IconButton, Stars, Text, type IconName } from '@/components/ui';
import { getCategory, getUser, getRatingBreakdown, getReviewsForSeller } from '@/data';
import { formatCompact, formatDate, formatMonthYear, formatRating, formatTRY } from '@/lib/format';
import { radius, SCREEN_PADDING, useTheme, type ColorTokens } from '@/theme';
import type { Show, User, UserBadge } from '@/types';

import { useActivityExtras, type SubmittedReview } from '../activity/store';
import { withAlpha } from '../activity/utils';

// ─── Rozetler ────────────────────────────────────────────────────────────────

const BADGES: Record<UserBadge, { label: string; icon: IconName; tone: keyof Pick<ColorTokens, 'warning' | 'info' | 'success' | 'accent' | 'text'> }> = {
  top_seller: { label: 'Top Satıcı', icon: 'ribbon', tone: 'warning' },
  verified: { label: 'Doğrulanmış', icon: 'checkmark-circle', tone: 'info' },
  fast_shipper: { label: 'Hızlı Kargo', icon: 'rocket', tone: 'success' },
  new_seller: { label: 'Yeni Satıcı', icon: 'sparkles', tone: 'accent' },
  partner: { label: 'Seçkin Mağaza', icon: 'diamond', tone: 'text' },
};

export function BadgeRow({ badges }: { badges: UserBadge[] }) {
  const { colors } = useTheme();
  if (!badges.length) return null;
  return (
    <View style={styles.badges}>
      {badges.map((b) => {
        const def = BADGES[b];
        const c = colors[def.tone];
        return (
          <View key={b} style={[styles.badge, { backgroundColor: withAlpha(c, 0.12) }]}>
            <Icon name={def.icon} size={13} color={c} />
            <Text variant="caption" weight="700" color={c}>
              {def.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

export function shipTimeLabel(days: number): string {
  if (days <= 0) return '—';
  if (days < 1) return '<1 gün';
  return `${Math.max(1, Math.round(days))} gün`;
}

// ─── Değerlendirmeler ───────────────────────────────────────────────────────

export type ReviewView = {
  id: string;
  buyerName: string;
  buyerAvatar?: string;
  rating: number;
  text: string;
  productTitle: string;
  productImage?: string;
  createdAt: string;
  shipping?: number;
  accuracy?: number;
  mine?: boolean;
};

function fromSubmitted(r: SubmittedReview, me: User): ReviewView {
  return {
    id: `mine_${r.orderId}`,
    buyerName: me.username,
    buyerAvatar: me.avatar,
    rating: r.rating,
    text: r.comment,
    productTitle: r.productTitle,
    productImage: r.productImage,
    createdAt: r.createdAt,
    shipping: r.shipping,
    accuracy: r.accuracy,
    mine: true,
  };
}

/** Satıcının değerlendirmeleri: önce benim gönderdiklerim, sonra mock değerlendirmeler (yazılı olanlar) */
export function useSellerReviews(seller: User | undefined, me: User) {
  const mine = useActivityExtras((s) => s.reviews);
  if (!seller || !seller.isSeller) return { reviews: [] as ReviewView[], counts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<1 | 2 | 3 | 4 | 5, number>, total: 0, average: 0 };
  const myReviews = Object.values(mine)
    .filter((r) => r.sellerId === seller.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((r) => fromSubmitted(r, me));
  const mock: ReviewView[] = getReviewsForSeller(seller.id).map((r) => {
    const buyer = getUser(r.buyerId);
    return {
      id: r.id,
      buyerName: buyer?.username ?? 'mezat_alicisi',
      buyerAvatar: buyer?.avatar,
      rating: r.rating,
      text: r.text,
      productTitle: r.productTitle,
      productImage: r.productImage,
      createdAt: r.createdAt,
      shipping: r.shipping,
      accuracy: r.accuracy,
    };
  });
  const breakdown = getRatingBreakdown(seller.id);
  const counts = { ...breakdown.counts };
  myReviews.forEach((r) => {
    const k = Math.min(5, Math.max(1, Math.round(r.rating))) as 1 | 2 | 3 | 4 | 5;
    counts[k] += 1;
  });
  const total = seller.reviewCount + myReviews.length;
  const average = myReviews.length ? (seller.rating * seller.reviewCount + myReviews.reduce((s, r) => s + r.rating, 0)) / total : seller.rating;
  return { reviews: [...myReviews, ...mock], counts, total, average };
}

export function RatingSummary({ average, total, counts }: { average: number; total: number; counts: Record<1 | 2 | 3 | 4 | 5, number> }) {
  const { colors } = useTheme();
  const sum = Math.max(1, counts[1] + counts[2] + counts[3] + counts[4] + counts[5]);
  return (
    <View style={[styles.summary, { backgroundColor: colors.surface }]}>
      <View style={styles.summaryLeft}>
        <Text style={styles.bigRating}>{formatRating(average)}</Text>
        <Stars rating={average} size={14} />
        <Text variant="caption" color="textSecondary" align="center">
          {formatCompact(total)} değerlendirme
        </Text>
      </View>
      <View style={styles.bars}>
        {([5, 4, 3, 2, 1] as const).map((k) => {
          const pct = counts[k] / sum;
          return (
            <View key={k} style={styles.barRow}>
              <Text variant="caption" color="textSecondary" style={styles.barLabel}>
                {k}
              </Text>
              <Icon name="star" size={10} color={colors.warning} />
              <View style={[styles.barTrack, { backgroundColor: colors.surfaceAlt }]}>
                <View style={[styles.barFill, { width: `${Math.round(pct * 100)}%`, backgroundColor: colors.warning }]} />
              </View>
              <Text variant="caption" color="textTertiary" style={styles.barPct}>
                %{Math.round(pct * 100)}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

export function ReviewCard({ review, onMore }: { review: ReviewView; onMore: () => void }) {
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const long = review.text.length > 140;
  return (
    <View style={styles.review}>
      <View style={styles.reviewHead}>
        <Avatar uri={review.buyerAvatar} name={review.buyerName} size={36} />
        <View style={styles.flex}>
          <Text variant="subhead" weight="700" numberOfLines={1}>
            {review.buyerName}
            {review.mine ? (
              <Text variant="caption" color="accent">
                {'  '}Senin değerlendirmen
              </Text>
            ) : null}
          </Text>
          <View style={styles.reviewMeta}>
            <Stars rating={review.rating} size={12} />
            <Text variant="caption" color="textTertiary">
              {formatRating(review.rating)} · {formatDate(review.createdAt)}
            </Text>
          </View>
        </View>
        <IconButton name="ellipsis-horizontal" size={32} onPress={onMore} accessibilityLabel="Değerlendirme seçenekleri" />
      </View>
      {review.text ? (
        <Text variant="callout" numberOfLines={expanded ? undefined : 4} style={styles.reviewText}>
          {review.text}
        </Text>
      ) : null}
      {long ? (
        <Text variant="subhead" weight="700" color="accent" onPress={() => setExpanded((e) => !e)} suppressHighlighting>
          {expanded ? 'Daha az göster' : 'Devamını gör'}
        </Text>
      ) : null}
      {review.shipping && review.accuracy && review.rating < 5 ? (
        <Text variant="caption" color="textSecondary">
          Kargo ★{review.shipping} · Açıklamaya uygunluk ★{review.accuracy}
        </Text>
      ) : null}
      <View style={[styles.reviewProduct, { backgroundColor: colors.surface }]}>
        <View style={[styles.reviewThumb, { backgroundColor: colors.skeleton }]}>
          {review.productImage ? <Image source={{ uri: review.productImage }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" /> : null}
        </View>
        <Text variant="footnote" color="textSecondary" numberOfLines={1} style={styles.flex}>
          {review.productTitle}
        </Text>
      </View>
    </View>
  );
}

// ─── Hakkında ───────────────────────────────────────────────────────────────

export function AboutSection({
  user,
  followers,
  following,
  purchases,
  nextShow,
  onReport,
}: {
  user: User;
  followers: number;
  following: number;
  purchases?: number;
  nextShow?: Show;
  onReport?: () => void;
}) {
  const { colors } = useTheme();
  const categories = user.categoryIds.map((id) => getCategory(id)).filter((c): c is NonNullable<typeof c> => !!c);
  const corporate = user.badges.includes('verified') || user.badges.includes('partner');
  const stats: { label: string; value: string }[] = user.isSeller
    ? [
        { label: 'Takipçi', value: formatCompact(followers) },
        { label: 'Satış', value: formatCompact(user.itemsSold) },
        { label: 'Puan', value: user.rating ? `★ ${formatRating(user.rating)}` : '—' },
        { label: 'Ort. kargolama', value: shipTimeLabel(user.avgShipDays) },
      ]
    : [
        { label: 'Takipçi', value: formatCompact(followers) },
        { label: 'Takip', value: formatCompact(following) },
        ...(purchases !== undefined ? [{ label: 'Alışveriş', value: formatCompact(purchases) }] : []),
      ];
  return (
    <View style={styles.about}>
      <View style={styles.statsGrid}>
        {stats.map((s) => (
          <View key={s.label} style={[styles.statBox, { backgroundColor: colors.surface }]}>
            <Text variant="title3" numberOfLines={1}>
              {s.value}
            </Text>
            <Text variant="caption" color="textSecondary" numberOfLines={1}>
              {s.label}
            </Text>
          </View>
        ))}
      </View>

      {categories.length ? (
        <View style={styles.aboutBlock}>
          <Text variant="headline">Kategoriler</Text>
          <View style={styles.chipWrap}>
            {categories.map((c) => (
              <Chip key={c.id} label={c.name} emoji={c.emoji} size="sm" onPress={() => router.push(`/category/${c.id}`)} />
            ))}
          </View>
        </View>
      ) : null}

      <View style={styles.aboutBlock}>
        <Text variant="headline">Bilgiler</Text>
        <AboutLine icon="location-outline" text={user.city || 'Türkiye'} />
        <AboutLine icon="calendar-outline" text={`Katılma: ${formatMonthYear(user.joinedAt)}`} />
        {user.isSeller ? <AboutLine icon="briefcase-outline" text={corporate ? 'Kurumsal satıcı · e-Arşiv fatura düzenler' : 'Bireysel satıcı'} /> : null}
        {nextShow ? <AboutLine icon="radio-outline" text={`Sıradaki yayın: ${formatDate(nextShow.scheduledAt)}`} /> : null}
      </View>

      {user.isSeller ? (
        <>
          <View style={styles.aboutBlock}>
            <Text variant="headline">Kargo politikası</Text>
            <Text variant="callout" color="textSecondary">
              Siparişler ortalama {shipTimeLabel(user.avgShipDays)} içinde kargoya verilir (en geç 2 iş günü). Aynı yayında aldığın ürünler tek pakette gönderilir; kargo ücretini bir kez ödersin, sonraki ürünler “aynı pakete eklendi” olarak gelir.
              {nextShow?.freeShippingThreshold ? ` ${formatTRY(nextShow.freeShippingThreshold)} ve üzeri alışverişlerde kargo ücretsiz.` : ''}
            </Text>
          </View>
          <View style={styles.aboutBlock}>
            <Text variant="headline">İade politikası</Text>
            <Text variant="callout" color="textSecondary">
              Tüm siparişler Alıcı Koruması kapsamındadır: ürün gelmezse paran iade edilir; hasarlı, yanlış, sahte ya da açıklamaya uygun değilse ürün sana ulaştıktan sonra 14 gün içinde bildirmen yeterli.
              {corporate
                ? ' Satıcı kurumsal olduğu için ürünü teslim aldıktan sonra 14 gün içinde yasal cayma hakkını da kullanabilirsin.'
                : ' Bireysel satıcıdan (tüketiciden tüketiciye) alımlar Tüketici Kanunu kapsamında değildir.'}
            </Text>
          </View>
        </>
      ) : null}

      {onReport ? (
        <Text variant="subhead" weight="700" color="danger" onPress={onReport} suppressHighlighting style={styles.report}>
          Bu kullanıcıyı şikayet et
        </Text>
      ) : null}
    </View>
  );
}

function AboutLine({ icon, text }: { icon: IconName; text: string }) {
  return (
    <View style={styles.aboutLine}>
      <Icon name={icon} size={17} color="textSecondary" />
      <Text variant="callout" style={styles.flex}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3 },
  summary: { flexDirection: 'row', alignItems: 'center', gap: 16, marginHorizontal: SCREEN_PADDING, borderRadius: radius.lg, padding: 16, marginTop: 4, marginBottom: 8 },
  summaryLeft: { alignItems: 'center', gap: 4, minWidth: 88 },
  bigRating: { fontSize: 40, lineHeight: 46, fontWeight: '800' },
  bars: { flex: 1, gap: 5 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  barLabel: { width: 10, textAlign: 'right' },
  barTrack: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 3 },
  barPct: { width: 34, textAlign: 'right' },
  review: { paddingHorizontal: SCREEN_PADDING, paddingVertical: 14, gap: 8 },
  reviewHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  reviewMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  reviewText: { lineHeight: 20 },
  reviewProduct: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: radius.sm, padding: 6, paddingRight: 10 },
  reviewThumb: { width: 36, height: 36, borderRadius: 6, overflow: 'hidden' },
  about: { paddingHorizontal: SCREEN_PADDING, paddingTop: 16, gap: 22 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statBox: { flexGrow: 1, flexBasis: '22%', minWidth: 76, borderRadius: radius.md, paddingVertical: 12, paddingHorizontal: 8, alignItems: 'center', gap: 2 },
  aboutBlock: { gap: 8 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  aboutLine: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  report: { marginTop: 4 },
});
