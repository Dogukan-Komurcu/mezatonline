/**
 * S80 — "Sat" sekmesi (satıcı olmayan kullanıcı): Whatnot "Sell live. Grow fast." tanıtım sayfası.
 * Turkuaz hero (beyaz metin) + canlı yayın telefon kolajı, avantajlar, nasıl çalışır, ücretler, satıcı hikayeleri, SSS ve sabit "Hemen Başla".
 */
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { setStatusBarStyle } from 'expo-status-bar';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar, Button, Icon, LiveBadge, PressableScale, Text, type IconName } from '@/components/ui';
import { FEATURES } from '@/config/demo';
import { getLiveShows, getSellers, getUser } from '@/data';
import { RISKY_AREAS } from '@/features/account/content';
import { AUTH_REASONS, requireAuth } from '@/features/auth/gate';
import { formatCompact, formatTRY } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { CARD_FEE_FIXED, SELLER_FEE_TEXT, sellerFees, SHIPPING_PRICES } from '@/lib/pricing';
import { brand, liveColors, radius, SCREEN_PADDING, useTheme } from '@/theme';
import type { Show } from '@/types';

import { useQaOffset } from './qaSeed';
import { Card, KeyValue, StickyFooter } from './ui';

const BENEFITS: { icon: IconName; title: string; body: string }[] = [
  {
    icon: 'pricetags-outline',
    title: `Toplam ${SELLER_FEE_TEXT.totalRate} + ₺${CARD_FEE_FIXED} komisyon, ayrı işlem ücreti yok`,
    body: `${SELLER_FEE_TEXT.commissionRate} satış komisyonu ve ${SELLER_FEE_TEXT.cardFee} kredi kartı ücreti; ikisi de yalnızca satılan ürünün bedelinden kesilir. Onaydan sonraki ilk 30 günde satış komisyonu sana iade edilir.`,
  },
  { icon: 'cube-outline', title: 'Kargo kodu ile kolay gönderim', body: 'Satıştan sonra 2 iş günü içinde paketini şubeye bırak; etiket şubede basılır.' },
  { icon: 'card-outline', title: "IBAN'a 1-2 iş gününde ödeme", body: 'Paketin kargoya verilince kazancın çekilebilir olur, tek dokunuşla hesabına geçer.' },
  { icon: 'people-outline', title: 'Takipçilerinle canlı bağ', body: 'Takipçilerin yayınını planladığın anda hatırlatma kurabilir; sohbette sorularını yayın sırasında yanıtlarsın.' },
];

const STEPS: { title: string; body: string }[] = [
  { title: 'Başvur', body: 'Kategorini seç, kimlik ve IBAN bilgilerini gir. Demo sürümde başvurular otomatik onaylanır.' },
  { title: 'Yayın planla', body: 'Tarih ve saat seç, ürünlerini ekle. Takipçilerine otomatik hatırlatma gider.' },
  { title: 'Canlıya geç', body: 'Ürünü kamerada göster, açık artırmayı başlat. Gelen teklifleri ekranda anlık izlersin.' },
  { title: 'Kargola, kazan', body: 'Kargo kodunu oluştur, paketi şubeye bırak. Kazancın IBAN’ına geçsin.' },
];

const STORIES = [
  'İlk yayınımda iki saatte 40 kart sattım. Artık takipçilerim her pazar akşamı beni bekliyor.',
  'Dükkânımı kapatmadan Türkiye’nin her yerine satıyorum. Kargo kodu sistemi inanılmaz pratik.',
  'Açık artırmanın heyecanı bambaşka; ürünlerim beklediğimden çok daha iyi fiyatlara gidiyor.',
];

const FAQ: { q: string; a: string }[] = [
  { q: 'Kimler satıcı olabilir?', a: '18 yaşını doldurmuş, Türkiye’de yaşayan herkes başvurabilir. Bireysel, şahıs şirketi ya da kurumsal olarak satış yapabilirsin.' },
  {
    q: 'Hangi ürünleri satabilirim?',
    a: `Koleksiyon kartları, sneaker, giyim, antika, nümismatik, oyuncak, kozmetik ve daha fazlası. Replika, taklit ya da hak sahibinin izni olmadan üretilmiş ürünler, silah ve şans oyunları yasaktır. Taklidi yaygın kategorilerdeki (${RISKY_AREAS}) ve taklidi yaygın markaların geçtiği ilanlara orijinallik belgesi (fatura, sertifika ya da tedarik belgesi) eklemen gerekir.`,
  },
  { q: 'Ödemelerimi nasıl alırım?', a: 'Siparişi kargoya verdiğinde kazancın çekilebilir bakiyene geçer. “Para Çek” ile 1-2 iş günü içinde IBAN’ına aktarılır.' },
  { q: 'Kargo nasıl işliyor?', a: 'Satıştan sonra uygulamada kargo kodu oluşturursun. Paketini kargo firmasının şubesine bırakıp kodu göstermen yeterli. Kargo ücretini alıcı öder.' },
  { q: 'Yayın için ekipman gerekir mi?', a: 'Hayır. Telefonun yeterli. İyi ışık ve sabit bir tripod yayın kaliteni artırır.' },
  { q: 'Fatura kesmem gerekiyor mu?', a: 'Bireysel satıcılar ara sıra yaptıkları satışlar için fatura kesmek zorunda değildir. Şirketler her satış için e-Arşiv fatura düzenler.' },
];

function PhoneMock({ show, w, rotate, style }: { show?: Show; w: number; rotate: number; style: object }) {
  const seller = show ? getUser(show.sellerId) : undefined;
  const h = Math.round(w * 2);
  return (
    <View style={[styles.phone, { width: w, height: h, borderColor: brand.ink, backgroundColor: brand.ink, transform: [{ rotate: `${rotate}deg` }] }, style]}>
      {show ? <Image source={{ uri: show.coverImage }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" transition={200} /> : null}
      <LinearGradient colors={[liveColors.glass, 'transparent', liveColors.glassStrong]} locations={[0, 0.35, 1]} style={StyleSheet.absoluteFill} />
      <View style={styles.phoneTop}>
        <LiveBadge viewers={show?.viewers ?? 240} />
      </View>
      <View style={styles.phoneBottom}>
        <View style={styles.phoneUser}>
          <Avatar uri={seller?.avatar} name={seller?.username ?? 'mezat'} size={16} />
          <Text variant="caption" color={liveColors.text} numberOfLines={1} style={{ flex: 1 }}>
            {seller?.username ?? 'satici'}
          </Text>
        </View>
        <View style={[styles.phoneBid, { backgroundColor: liveColors.primary }]}>
          <Text variant="caption" color={liveColors.onPrimary} numberOfLines={1}>
            Teklif ver
          </Text>
        </View>
      </View>
    </View>
  );
}

export function SellLanding() {
  const { colors, isDark } = useTheme();
  const qaOffset = useQaOffset();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  // Turkuaz hero kaydırılıp geçilince durum çubuğunun arkasına zemin rengi gelir (metin saatle çakışmasın)
  const [heroH, setHeroH] = useState(0);
  const [pastHero, setPastHero] = useState(false);
  const shows = getLiveShows().slice(0, 3);
  const sellers = getSellers().slice(0, 3);
  const example = sellerFees(1000);

  // Turkuaz hero üstünde durum çubuğu açık (beyaz); hero geçilince temaya göre
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle(!pastHero || isDark ? 'light' : 'dark', true);
      return () => setStatusBarStyle(isDark ? 'light' : 'dark', true);
    }, [isDark, pastHero]),
  );

  const center = width / 2;
  const big = Math.min(150, Math.round(width * 0.36));
  const small = Math.round(big * 0.84);

  return (
    <View style={[styles.flex, { backgroundColor: colors.bg }]}>
      <ScrollView
        contentOffset={qaOffset}
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={32}
        onScroll={(e) => {
          const past = heroH > 0 && e.nativeEvent.contentOffset.y > heroH - insets.top;
          if (past !== pastHero) setPastHero(past);
        }}>
        <View
          onLayout={(e) => {
            const h = e.nativeEvent.layout.height;
            setHeroH(h);
            // Başlangıç ofsetiyle açıldıysa (QA) kaydırma olayı gelmez
            if (qaOffset && qaOffset.y > h - insets.top) setPastHero(true);
          }}
          style={[styles.hero, { backgroundColor: colors.primary, paddingTop: insets.top + 16 }]}>
          <View style={[styles.heroTag, { backgroundColor: colors.onPrimary }]}>
            <Icon name="storefront-outline" size={14} color={colors.primary} />
            <Text variant="caption" color={colors.primary}>
              MEZATONLINE SATICI
            </Text>
          </View>
          <Text variant="display" color={colors.onPrimary} style={styles.heroTitle}>
            Mezatonline’da sat, canlı yayında kazan
          </Text>
          <Text variant="body" color={colors.onPrimary} style={{ opacity: 0.78, marginTop: 10 }}>
            Ürününü kameraya göster, izleyiciler canlı teklif versin. Başvuru ücretsizdir ve tek bir formda tamamlanır.
          </Text>
          <View style={[styles.collage, { height: big * 2 + 30 }]}>
            <PhoneMock show={shows[1]} w={small} rotate={-9} style={{ left: center - SCREEN_PADDING - big / 2 - small * 0.78, top: 34 }} />
            <PhoneMock show={shows[2]} w={small} rotate={9} style={{ left: center - SCREEN_PADDING + big / 2 - small * 0.22, top: 34 }} />
            <PhoneMock show={shows[0]} w={big} rotate={0} style={{ left: center - SCREEN_PADDING - big / 2, top: 0, zIndex: 2 }} />
            <View style={[styles.floatChip, { backgroundColor: liveColors.glassStrong, left: 4, top: big * 1.25 }]}>
              <Text variant="caption" color={liveColors.text}>
                🔥 bu benim!
              </Text>
            </View>
            <View style={[styles.floatChip, { backgroundColor: colors.success, right: 4, top: big * 0.5, zIndex: 3 }]}>
              <Text variant="caption" color={liveColors.text}>
                Çekiç indi · {formatTRY(1340)}
              </Text>
            </View>
          </View>
        </View>

        <View style={[styles.stats, { borderColor: colors.border, backgroundColor: colors.card }]}>
          {[
            [`${SELLER_FEE_TEXT.totalRate} + ₺${CARD_FEE_FIXED}`, 'toplam komisyon'],
            ['1-2 gün', "IBAN'a ödeme"],
            ['₺0', 'listeleme ücreti'],
          ].map(([v, l], i) => (
            <View key={l} style={[styles.stat, i > 0 && { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: colors.border }]}>
              <Text variant="title3" weight="800" align="center">
                {v}
              </Text>
              <Text variant="footnote" color="textSecondary" align="center">
                {l}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.block}>
          <Text variant="title2">Neden Mezatonline?</Text>
          {BENEFITS.map((b) => (
            <View key={b.title} style={styles.benefit}>
              <View style={[styles.benefitIcon, { backgroundColor: colors.primarySoft }]}>
                <Icon name={b.icon} size={22} color={isDark ? colors.accent : colors.primary} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text variant="headline" weight="700">
                  {b.title}
                </Text>
                <Text variant="callout" color="textSecondary">
                  {b.body}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <View style={[styles.block, { backgroundColor: colors.surface }]}>
          <Text variant="title2">Nasıl çalışır?</Text>
          {STEPS.map((s, i) => (
            <View key={s.title} style={styles.step}>
              <View style={styles.stepRail}>
                <View style={[styles.stepNum, { backgroundColor: colors.inverse }]}>
                  <Text variant="subhead" weight="800" color={colors.onInverse}>
                    {i + 1}
                  </Text>
                </View>
                {i < STEPS.length - 1 ? <View style={[styles.stepLine, { backgroundColor: colors.border }]} /> : null}
              </View>
              <View style={{ flex: 1, paddingBottom: 18 }}>
                <Text variant="headline" weight="700">
                  {s.title}
                </Text>
                <Text variant="callout" color="textSecondary" style={{ marginTop: 2 }}>
                  {s.body}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.block}>
          <Text variant="title2">Ücretler</Text>
          <Text variant="callout" color="textSecondary">
            Listeleme ücreti ve aylık abonelik yok. Yalnızca sattığında {SELLER_FEE_TEXT.total} ödersin.
          </Text>
          <Card padded={false}>
            {[
              ['Satış komisyonu', SELLER_FEE_TEXT.commissionRate, 'Ürün bedeli üzerinden · ilk 30 gün iade edilir'],
              ['Kredi kartı ücreti', SELLER_FEE_TEXT.cardFee, `Ürün bedeli üzerinden · ₺${CARD_FEE_FIXED} sipariş başına sabit`],
              ['Ödeme işlem ücreti', 'Yok', 'Ayrıca işlem ücreti alınmaz'],
              ['Listeleme ve yayın', 'Ücretsiz', 'Sınırsız ürün, sınırsız yayın'],
              ['Kargo', 'Alıcı öder', `Desi bazlı, ${formatTRY(SHIPPING_PRICES.small)}'den başlar`],
              ...(FEATURES.tips ? [['Bahşişler', '%0', 'Bahşişlerin tamamı senin']] : []),
            ].map(([label, value, hint], i) => (
              <View key={label} style={[styles.feeRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}>
                <View style={{ flex: 1 }}>
                  <Text variant="callout" weight="600">
                    {label}
                  </Text>
                  <Text variant="footnote" color="textSecondary">
                    {hint}
                  </Text>
                </View>
                <Text variant="headline" weight="800">
                  {value}
                </Text>
              </View>
            ))}
          </Card>
          <Card style={{ backgroundColor: colors.surface, borderColor: colors.surface }}>
            <Text variant="subhead" weight="700" style={{ marginBottom: 6 }}>
              Örnek: {formatTRY(1000)}’lik satış
            </Text>
            <KeyValue label={SELLER_FEE_TEXT.commissionLabel} value={`-${formatTRY(example.commission)}`} />
            <KeyValue label={SELLER_FEE_TEXT.cardFeeLabel} value={`-${formatTRY(example.cardFee)}`} />
            <View style={[styles.hr, { backgroundColor: colors.border }]} />
            <KeyValue label="Eline geçen" value={formatTRY(example.net)} strong tone="success" />
            <Text variant="footnote" color="textSecondary" style={{ marginTop: 4 }}>
              İlk ayında satış komisyonu iadesiyle {formatTRY(example.net + example.commission)} kazanırsın.
            </Text>
          </Card>
        </View>

        <View style={{ paddingVertical: 20, gap: 12 }}>
          <Text variant="title2" style={{ paddingHorizontal: SCREEN_PADDING }}>
            Örnek satıcı hikayeleri
          </Text>
          <Text variant="footnote" color="textSecondary" style={{ paddingHorizontal: SCREEN_PADDING, marginTop: -6 }}>
            Bu yorumlar ve satıcı hesapları demo amaçlı örneklerdir.
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: SCREEN_PADDING, gap: 12 }} snapToInterval={width * 0.78 + 12} decelerationRate="fast">
            {sellers.map((u, i) => (
              <PressableScale key={u.id} scaleTo={0.98} onPress={() => router.push(`/user/${u.username}`)} style={[styles.story, { width: width * 0.78, backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text variant="body" style={{ flex: 1 }}>
                  “{STORIES[i % STORIES.length]}”
                </Text>
                <View style={styles.storyUser}>
                  <Avatar uri={u.avatar} name={u.username} size={36} verified={u.badges.includes('verified')} />
                  <View style={{ flex: 1 }}>
                    <Text variant="subhead" weight="700" numberOfLines={1}>
                      {u.username}
                    </Text>
                    <Text variant="footnote" color="textSecondary" numberOfLines={1}>
                      {formatCompact(u.followers)} takipçi · {formatCompact(u.itemsSold)} satış
                    </Text>
                  </View>
                </View>
              </PressableScale>
            ))}
          </ScrollView>
        </View>

        <View style={styles.block}>
          <Text variant="title2">Sıkça sorulanlar</Text>
          <View>
            {FAQ.map((f, i) => {
              const open = openFaq === i;
              return (
                <View key={f.q} style={[styles.faq, { borderBottomColor: colors.border }]}>
                  <PressableScale
                    scaleTo={0.99}
                    onPress={() => {
                      haptic.tap();
                      setOpenFaq(open ? null : i);
                    }}
                    style={styles.faqHead}
                    accessibilityRole="button"
                    accessibilityState={{ expanded: open }}>
                    <Text variant="headline" weight="600" style={{ flex: 1 }}>
                      {f.q}
                    </Text>
                    <Icon name={open ? 'remove' : 'add'} size={22} />
                  </PressableScale>
                  {open ? (
                    <Animated.View entering={FadeIn.duration(200)}>
                      <Text variant="callout" color="textSecondary" style={{ paddingBottom: 14 }}>
                        {f.a}
                      </Text>
                    </Animated.View>
                  ) : null}
                </View>
              );
            })}
          </View>
          <Text variant="footnote" color="textTertiary">
            Aradığın cevap burada yoksa diğer sorular ve destek sohbeti için:{' '}
            <Text variant="footnote" weight="700" color="accent" onPress={() => router.push('/settings/help')} suppressHighlighting>
              Yardım Merkezi
            </Text>
          </Text>
        </View>
      </ScrollView>
      {pastHero ? <Animated.View entering={FadeIn.duration(150)} exiting={FadeOut.duration(150)} style={[styles.statusBackdrop, { height: insets.top, backgroundColor: colors.bg }]} /> : null}
      <StickyFooter safeBottom={false}>
        <Button title="Hemen Başla" size="lg" fullWidth iconRight="arrow-forward" onPress={() => requireAuth(() => router.push('/seller/apply'), { reason: AUTH_REASONS.sell })} />
        <Text variant="footnote" color="textSecondary" align="center">
          Başvuru ücretsiz · Tek form, adım adım
        </Text>
      </StickyFooter>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  statusBackdrop: { position: 'absolute', top: 0, left: 0, right: 0 },
  hero: { paddingHorizontal: SCREEN_PADDING, paddingBottom: 24, borderBottomLeftRadius: radius.xxl, borderBottomRightRadius: radius.xxl, overflow: 'hidden' },
  heroTag: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill, marginBottom: 14 },
  heroTitle: { letterSpacing: -0.5 },
  collage: { marginTop: 22 },
  phone: { position: 'absolute', borderRadius: 22, borderWidth: 5, overflow: 'hidden' },
  phoneTop: { position: 'absolute', top: 8, left: 8 },
  phoneBottom: { position: 'absolute', left: 8, right: 8, bottom: 10, gap: 6 },
  phoneUser: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  phoneBid: { borderRadius: radius.sm, paddingVertical: 6, alignItems: 'center' },
  floatChip: { position: 'absolute', paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.pill },
  stats: { flexDirection: 'row', marginHorizontal: SCREEN_PADDING, marginTop: 16, borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.lg, paddingVertical: 14 },
  stat: { flex: 1, paddingHorizontal: 6, gap: 2 },
  block: { paddingHorizontal: SCREEN_PADDING, paddingVertical: 24, gap: 14 },
  benefit: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  benefitIcon: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  step: { flexDirection: 'row', gap: 14 },
  stepRail: { alignItems: 'center', width: 30 },
  stepNum: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  stepLine: { width: 2, flex: 1, marginTop: 4 },
  feeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  hr: { height: StyleSheet.hairlineWidth, marginVertical: 6 },
  story: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.lg, padding: 16, gap: 16, minHeight: 170 },
  storyUser: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  faq: { borderBottomWidth: StyleSheet.hairlineWidth },
  faqHead: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 16 },
});
