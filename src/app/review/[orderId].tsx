/**
 * Siparişi değerlendir (Whatnot S63 "Rate Purchase"): genel puan zorunlu; 4 ve altı puanda
 * Kargo hızı · Paketleme · Açıklamaya uygunluk alt puanları da istenir.
 */
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View, type TextInputInstance, type ViewInstance } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar, Button, EmptyState, Header, Icon, PressableScale, Screen, Text, TextField, toast } from '@/components/ui';
import { useActivityExtras } from '@/features/activity/store';
import { shortDate } from '@/features/activity/utils';
import { getUser } from '@/data';
import { formatTRY } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { useOrdersStore } from '@/store/orders';
import { radius, SCREEN_PADDING, useTheme } from '@/theme';

const LABELS = ['Çok kötü', 'Kötü', 'İdare eder', 'İyi', 'Mükemmel'] as const;
const MAX_COMMENT = 500;
/** iOS'ta modal (page sheet) durum çubuğunun altında açılır; üst güvenli alan boşluğu gerekmez */
const MODAL_SAFE_TOP = Platform.OS !== 'ios';

type SubKey = 'shipping' | 'packaging' | 'accuracy';
const SUB_RATINGS: { key: SubKey; title: string; question: string; icon: 'rocket-outline' | 'cube-outline' | 'checkmark-done-outline' }[] = [
  { key: 'shipping', title: 'Kargo hızı', question: 'Paket beklediğin sürede eline ulaştı mı?', icon: 'rocket-outline' },
  { key: 'packaging', title: 'Paketleme', question: 'Kutu ve koruma, ürünü sağlam getirdi mi?', icon: 'cube-outline' },
  { key: 'accuracy', title: 'İlana uygunluk', question: 'Fotoğraflar ve açıklama, gelen ürünle örtüşüyor mu?', icon: 'checkmark-done-outline' },
];

function StarPicker({ value, onChange, size }: { value: number; onChange: (v: number) => void; size: number }) {
  const { colors } = useTheme();
  return (
    <View style={styles.stars}>
      {[1, 2, 3, 4, 5].map((i) => (
        <PressableScale
          key={i}
          scaleTo={0.8}
          hitSlop={4}
          onPress={() => {
            haptic.tap();
            onChange(i);
          }}
          accessibilityRole="button"
          accessibilityLabel={`${i} yıldız · ${LABELS[i - 1]}`}
          accessibilityState={{ selected: value === i }}>
          <Icon name={value >= i ? 'star' : 'star-outline'} size={size} color={value >= i ? colors.accent : colors.textTertiary} />
        </PressableScale>
      ))}
    </View>
  );
}

function Required({ done }: { done: boolean }) {
  return (
    <Text variant="caption" color={done ? 'success' : 'textTertiary'}>
      {done ? '✓ Tamam' : 'Zorunlu'}
    </Text>
  );
}

export default function ReviewScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { orderId, qa } = useLocalSearchParams<{ orderId: string; qa?: string }>();
  const order = useOrdersStore((s) => s.orders.find((o) => o.id === orderId));
  const [rating, setRating] = useState(0);
  const bodyRef = useRef<ViewInstance>(null);
  const commentRef = useRef<TextInputInstance>(null);
  // iOS page-sheet modal ekranın tepesinden aşağıda başlar; KeyboardAvoidingView klavyeyi pencere koordinatında ölçtüğü için o farkı ofset olarak ver
  const [kbOffset, setKbOffset] = useState(0);
  const [sub, setSub] = useState<Record<SubKey, number>>({ shipping: 0, packaging: 0, accuracy: 0 });
  const [comment, setComment] = useState('');
  const [sending, setSending] = useState(false);
  const seller = getUser(order?.sellerId);

  // Yalnızca geliştirme: QA ekran görüntüleri için başlangıç puanı (?qa=r3) ve klavye (?qa=r5kb)
  useEffect(() => {
    if (!__DEV__ || !qa?.startsWith('r')) return;
    const v = Number(qa.slice(1, 2));
    if (v >= 1 && v <= 5) setRating(v);
    if (!qa.endsWith('kb')) return;
    const t = setTimeout(() => commentRef.current?.focus(), 1200);
    return () => clearTimeout(t);
  }, [qa]);

  const close = () => (router.canGoBack() ? router.back() : router.replace('/activity'));

  if (!order || order.reviewed || order.status !== 'delivered') {
    const reason = !order
      ? { title: 'Sipariş bulunamadı', message: 'Bu sipariş artık mevcut değil.' }
      : order.reviewed
        ? { title: 'Bu siparişi zaten değerlendirdin', message: 'Gönderilen puan ve yorum sonradan değiştirilemez. Katkın için teşekkürler! ❤️' }
        : { title: 'Henüz değerlendirilemez', message: 'Puanlama, sipariş “Teslim edildi” olduktan sonra açılır ve 30 gün boyunca açık kalır.' };
    return (
      <Screen>
        <Header title="Değerlendir" back="close" onBack={close} safeTop={MODAL_SAFE_TOP} />
        <EmptyState emoji={order?.reviewed ? '⭐' : '📦'} title={reason.title} message={reason.message} actionLabel="Tamam" onAction={close} />
      </Screen>
    );
  }

  const needsSub = rating > 0 && rating <= 4;
  const valid = rating > 0 && (!needsSub || SUB_RATINGS.every((r) => sub[r.key] > 0));

  const submit = () => {
    if (!valid) {
      haptic.error();
      toast.warning(rating === 0 ? 'Lütfen genel bir puan seç' : 'Lütfen tüm alt puanları seç');
      return;
    }
    setSending(true);
    setTimeout(() => {
      useOrdersStore.getState().markReviewed(order.id);
      useActivityExtras.getState().addReview({
        orderId: order.id,
        sellerId: order.sellerId,
        rating,
        shipping: needsSub ? sub.shipping : 5,
        packaging: needsSub ? sub.packaging : 5,
        accuracy: needsSub ? sub.accuracy : 5,
        comment: comment.trim(),
        productTitle: order.productTitle,
        productImage: order.productImage,
        createdAt: new Date().toISOString(),
      });
      haptic.success();
      toast.success('Değerlendirmen için teşekkürler! ❤️', 'star');
      close();
    }, 800);
  };

  return (
    <Screen>
      <Header title="Alışverişini puanla" back="close" onBack={close} border safeTop={MODAL_SAFE_TOP} />
      <View ref={bodyRef} style={styles.flex} onLayout={() => bodyRef.current?.measureInWindow((_x, y) => setKbOffset(Math.max(0, Math.round(y))))}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={kbOffset}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {/* Satıcı */}
            <View style={styles.sellerBlock}>
              <Avatar uri={seller?.avatar} name={seller?.username ?? 'satıcı'} size={64} verified={seller?.badges.includes('verified')} />
              <Text variant="title3" align="center">
                {seller?.username ?? 'Satıcı'}
              </Text>
              <Text variant="subhead" color="textSecondary" align="center">
                <Text variant="subhead" weight="700">
                  {formatTRY(order.total)}
                </Text>{' '}
                toplam · Satın alma{' '}
                <Text variant="subhead" weight="700">
                  {shortDate(order.createdAt)}
                </Text>
              </Text>
            </View>

            {/* Siparişteki ürünler */}
            <Text variant="subhead" weight="700" color="textSecondary" style={styles.label}>
              Siparişteki ürünler ({order.quantity})
            </Text>
            <View style={[styles.itemCard, { backgroundColor: colors.surface }]}>
              <View style={[styles.itemImg, { backgroundColor: colors.skeleton }]}>
                <Image source={{ uri: order.productImage }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" />
              </View>
              <View style={styles.flex}>
                <Text variant="subhead" weight="600" numberOfLines={2}>
                  {order.productTitle}
                </Text>
                <Text variant="footnote" color="textSecondary">
                  {order.itemPrice > 0 ? formatTRY(order.itemPrice) : 'Çekiliş'}
                </Text>
              </View>
            </View>

            {/* Genel puan */}
            <View style={styles.block}>
              <View style={styles.rowBetween}>
                <Text variant="title3">Genel</Text>
                <Required done={rating > 0} />
              </View>
              <Text variant="callout" color="textSecondary">
                Bu alışverişe kaç yıldız verirsin?
              </Text>
              <View style={styles.mainStars}>
                <StarPicker value={rating} onChange={setRating} size={42} />
                <Text variant="headline" color={rating ? 'accent' : 'textTertiary'} style={styles.ratingLabel}>
                  {rating ? LABELS[rating - 1] : 'Puan vermek için yıldızlara dokun'}
                </Text>
              </View>
            </View>

            {/* Alt puanlar (≤4 yıldız) */}
            {needsSub ? (
              <Animated.View entering={FadeInDown.duration(220)} style={[styles.subCard, { borderColor: colors.border }]}>
                <Text variant="footnote" color="textSecondary">
                  Tam puan vermediysen, hangi aşamada aksadığını da puanla.
                </Text>
                {SUB_RATINGS.map((r) => (
                  <View key={r.key} style={styles.subRow}>
                    <View style={styles.rowBetween}>
                      <View style={styles.subTitle}>
                        <Icon name={r.icon} size={18} color="textSecondary" />
                        <Text variant="headline">{r.title}</Text>
                      </View>
                      <Required done={sub[r.key] > 0} />
                    </View>
                    <Text variant="footnote" color="textSecondary">
                      {r.question}
                    </Text>
                    <StarPicker value={sub[r.key]} onChange={(v) => setSub((s) => ({ ...s, [r.key]: v }))} size={30} />
                  </View>
                ))}
              </Animated.View>
            ) : null}

            {/* Yorum */}
            <TextField
              ref={commentRef}
              label="Yorumun (isteğe bağlı)"
              placeholder="Ürün, paketleme ve satıcıyla ilgili deneyimini paylaş"
              value={comment}
              onChangeText={(t) => setComment(t.slice(0, MAX_COMMENT))}
              multiline
              maxLength={MAX_COMMENT}
              helper={`${MAX_COMMENT - comment.length} karakter daha yazabilirsin`}
              containerStyle={styles.block}
            />
            <Text variant="caption" color="textTertiary" style={styles.note}>
              Yazdığın yorum satıcının profilinde herkese açık yayımlanır. Gönderdikten sonra metni değiştiremezsin; istersen değerlendirmeni tümüyle silebilirsin.
            </Text>
          </ScrollView>
          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12), borderTopColor: colors.border, backgroundColor: colors.bg }]}>
            <Button title="Gönder" size="lg" fullWidth loading={sending} disabled={!valid} onPress={submit} />
          </View>
        </KeyboardAvoidingView>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: SCREEN_PADDING, paddingTop: 20, paddingBottom: 24 },
  sellerBlock: { alignItems: 'center', gap: 6, marginBottom: 22 },
  label: { marginBottom: 8 },
  itemCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: radius.md, padding: 10 },
  itemImg: { width: 56, height: 56, borderRadius: radius.sm, overflow: 'hidden' },
  block: { marginTop: 24, gap: 4 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  mainStars: { alignItems: 'center', gap: 10, marginTop: 14 },
  stars: { flexDirection: 'row', gap: 8 },
  ratingLabel: { minHeight: 22 },
  subCard: { marginTop: 18, borderWidth: StyleSheet.hairlineWidth * 2, borderRadius: radius.lg, padding: 14, gap: 16 },
  subRow: { gap: 6 },
  subTitle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  note: { marginTop: 10 },
  footer: { paddingHorizontal: SCREEN_PADDING, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
});
