import { Image } from 'expo-image';
import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withSpring, withTiming, ZoomIn } from 'react-native-reanimated';

import { Avatar, Button, Text } from '@/components/ui';
import { formatTRY } from '@/lib/format';
import { liveColors } from '@/theme';
import type { Product } from '@/types';

import { Confetti } from './Confetti';
import { alpha } from './styles';

export type CelebrationData = {
  id: number;
  kind: 'won' | 'giveaway' | 'purchase';
  product: Product;
  price: number;
  quantity: number;
  orderId?: string;
  discount: number;
  bundled: boolean;
};

const COPY = {
  won: { emoji: '🏆', title: 'Kazandın! 🎉', caption: 'Açık artırmayı kazandın' },
  giveaway: { emoji: '🎁', title: 'Çekilişi kazandın! 🎉', caption: 'Hediyen ücretsiz olarak kargolanacak' },
  purchase: { emoji: '🛍️', title: 'Satın aldın! 🎉', caption: 'Siparişin alındı' },
} as const;

/** S28: tam ekran kutlama (Jumbotron) — konfeti, ürün, fiyat, Siparişi gör / Yayına devam */
export function Celebration({ data, me, onViewOrder, onClose }: { data: CelebrationData; me: { username: string; avatar?: string }; onViewOrder: () => void; onClose: () => void }) {
  const copy = COPY[data.kind];
  const bob = useSharedValue(0);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });
  useEffect(() => {
    bob.set(withRepeat(withSequence(withTiming(-6, { duration: 700 }), withTiming(0, { duration: 700 })), -1, false));
    const t = setTimeout(() => closeRef.current(), 9000);
    return () => clearTimeout(t);
  }, [bob, data.id]);
  const bobStyle = useAnimatedStyle(() => ({ transform: [{ translateY: bob.get() }] }));
  const scale = useSharedValue(0.6);
  useEffect(() => {
    scale.set(withSpring(1, { damping: 9, stiffness: 160 }));
  }, [scale]);
  const imgStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));

  const total = data.price * data.quantity;
  const shippingNote =
    data.kind === 'giveaway'
      ? 'Kargo ücretini satıcı karşılar · Siparişlerinde görebilirsin'
      : `Ödemen kayıtlı kartından alındı · ${data.bundled ? 'Kargo aynı pakete eklendi (+₺0)' : 'Kargo ücreti aynı yayın için tek sefer'}`;

  return (
    <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)} style={styles.overlay}>
      <Confetti burst={data.id} count={56} />
      <Animated.View entering={ZoomIn.springify().damping(14)} style={styles.card}>
        <Animated.View style={[styles.avatarRow, bobStyle]}>
          <Avatar uri={me.avatar} name={me.username} size={44} ring />
          <Text style={styles.bigEmoji}>{copy.emoji}</Text>
        </Animated.View>
        <Text variant="title1" weight="900" color={liveColors.text} align="center">
          {copy.title}
        </Text>
        <Text variant="callout" color={liveColors.textSecondary} align="center">
          {copy.caption}
        </Text>
        <Animated.View style={[styles.imageWrap, imgStyle]}>
          <Image source={{ uri: data.product.images[0] }} style={styles.image} contentFit="cover" cachePolicy="memory-disk" />
        </Animated.View>
        <Text variant="headline" weight="700" color={liveColors.text} align="center" numberOfLines={2}>
          {data.product.title.replace(/^🎁\s*(Çekiliş:\s*)?/, '')}
          {data.quantity > 1 ? ` × ${data.quantity}` : ''}
        </Text>
        <Text variant="display" weight="900" color={liveColors.primary} align="center" tabular>
          {data.kind === 'giveaway' ? 'Ücretsiz' : formatTRY(total)}
        </Text>
        {data.discount > 0 ? (
          <Text variant="footnote" weight="700" color={liveColors.success} align="center">
            Kupon indirimi uygulandı: -{formatTRY(data.discount)}
          </Text>
        ) : null}
        <Text variant="footnote" color={liveColors.textSecondary} align="center" style={styles.note}>
          {shippingNote}
        </Text>
        <View style={styles.buttons}>
          {data.orderId ? <Button title="Siparişi gör" size="lg" fullWidth onPress={onViewOrder} icon="receipt-outline" /> : null}
          <Button title="Yayına devam" size="lg" variant="glass" fullWidth onPress={onClose} />
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: liveColors.glassStrong, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, zIndex: 50 },
  card: {
    width: '100%',
    maxWidth: 360,
    // Arkadaki sohbet/kart metinleri kartın içinden okunmasın
    backgroundColor: alpha(liveColors.panel, 0.96),
    borderRadius: 28,
    borderWidth: 1,
    borderColor: liveColors.border,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 18,
    alignItems: 'center',
    gap: 6,
  },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  bigEmoji: { fontSize: 38, lineHeight: 46 },
  imageWrap: { marginVertical: 8 },
  image: { width: 132, height: 132, borderRadius: 18, backgroundColor: liveColors.panelAlt },
  note: { marginTop: 2, marginBottom: 6 },
  buttons: { alignSelf: 'stretch', gap: 8, marginTop: 4 },
});
