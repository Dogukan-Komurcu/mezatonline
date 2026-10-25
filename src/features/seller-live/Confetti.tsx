import { useEffect, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { brand, liveColors } from '@/theme';

const COLORS = [liveColors.primary, liveColors.live, liveColors.success, liveColors.accent, brand.blue, brand.purple, liveColors.text];

type Piece = { id: number; x: number; delay: number; size: number; color: string; spin: number; drift: number; duration: number };

function makePieces(width: number, count: number): Piece[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * width,
    delay: Math.random() * 400,
    size: 6 + Math.random() * 6,
    color: COLORS[i % COLORS.length],
    spin: (Math.random() > 0.5 ? 1 : -1) * (360 + Math.random() * 540),
    drift: (Math.random() - 0.5) * 120,
    duration: 1800 + Math.random() * 1200,
  }));
}

/** Kısa süreli renkli konfeti yağmuru (çekiliş kazananı, yayın özeti) */
export function Confetti({ count = 36 }: { count?: number }) {
  const { width, height } = useWindowDimensions();
  const [pieces] = useState(() => makePieces(width, count));
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {pieces.map((p) => (
        <ConfettiPiece key={p.id} piece={p} height={height} />
      ))}
    </View>
  );
}

function ConfettiPiece({ piece, height }: { piece: Piece; height: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.set(withDelay(piece.delay, withTiming(1, { duration: piece.duration, easing: Easing.in(Easing.quad) })));
  }, [t, piece.delay, piece.duration]);
  const style = useAnimatedStyle(() => {
    const v = t.get();
    return {
      opacity: v > 0.85 ? (1 - v) / 0.15 : 1,
      transform: [{ translateY: -40 + v * (height + 80) }, { translateX: piece.drift * v }, { rotate: `${piece.spin * v}deg` }],
    };
  });
  return <Animated.View style={[styles.piece, { left: piece.x, width: piece.size, height: piece.size * 1.6, backgroundColor: piece.color }, style]} />;
}

const styles = StyleSheet.create({
  piece: { position: 'absolute', top: 0, borderRadius: 2 },
});
