import { useEffect, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { random } from '@/lib/rng';
import { liveColors } from '@/theme';

const COLORS = [liveColors.primary, liveColors.primaryBright, liveColors.copper, liveColors.live, liveColors.success, liveColors.accent, liveColors.text];

type Piece = { id: number; x: number; drift: number; delay: number; duration: number; w: number; h: number; color: string; spin: number; round: boolean };

function makePieces(width: number, count: number): Piece[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: random.int(0, Math.max(1, Math.round(width))),
    drift: random.int(-70, 70),
    delay: random.int(0, 450),
    duration: random.int(1900, 3200),
    w: random.int(6, 10),
    h: random.int(9, 15),
    color: random.pick(COLORS),
    spin: random.int(240, 900) * (random.chance(0.5) ? 1 : -1),
    round: random.chance(0.25),
  }));
}

function ConfettiPiece({ piece, height }: { piece: Piece; height: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.set(withDelay(piece.delay, withTiming(1, { duration: piece.duration, easing: Easing.in(Easing.quad) })));
  }, [t, piece.delay, piece.duration]);
  const style = useAnimatedStyle(() => {
    const v = t.get();
    return {
      opacity: v === 0 ? 0 : v > 0.85 ? (1 - v) / 0.15 : 1,
      transform: [
        { translateY: -40 + v * (height + 80) },
        { translateX: piece.drift * v + Math.sin(v * Math.PI * 3) * 14 },
        { rotate: `${piece.spin * v}deg` },
        { rotateY: `${piece.spin * 0.6 * v}deg` },
      ],
    };
  });
  return (
    <Animated.View
      style={[
        styles.piece,
        { left: piece.x, width: piece.w, height: piece.round ? piece.w : piece.h, borderRadius: piece.round ? piece.w / 2 : 2, backgroundColor: piece.color },
        style,
      ]}
    />
  );
}

/** Tam ekran konfeti patlaması (S28 kutlama, çekiliş kazananı). `burst` her değiştiğinde yeniden patlar. */
export function Confetti({ burst, count = 46 }: { burst: number; count?: number }) {
  const { width, height } = useWindowDimensions();
  const [pieces, setPieces] = useState<Piece[]>([]);
  useEffect(() => {
    if (!burst) return;
    setPieces(makePieces(width, count));
    const t = setTimeout(() => setPieces([]), 3900);
    return () => clearTimeout(t);
  }, [burst, width, count]);
  if (!pieces.length) return null;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {pieces.map((p) => (
        <ConfettiPiece key={`${burst}-${p.id}`} piece={p} height={height} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  piece: { position: 'absolute', top: 0 },
});
