import { useEffect, useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, interpolate, useAnimatedStyle, useSharedValue, withTiming, Extrapolation } from 'react-native-reanimated';

import { Text } from '@/components/ui';
import { random } from '@/lib/rng';

export type Particle = { id: number; emoji: string; x: number; drift: number; size: number; duration: number; rise: number };

let particleSeq = 0;
const MAX_PARTICLES = 18;

/** Uçan tepki parçacıklarını yöneten küçük hook */
export function useReactions() {
  const [particles, setParticles] = useState<Particle[]>([]);
  const spawn = (emoji: string, mine = false) => {
    particleSeq += 1;
    const p: Particle = {
      id: particleSeq,
      emoji,
      x: random.int(-6, 18),
      drift: random.int(-34, 30),
      size: mine ? random.int(30, 36) : random.int(20, 27),
      duration: random.int(1900, 2700),
      rise: random.int(220, 320),
    };
    setParticles((ps) => [...ps.slice(-(MAX_PARTICLES - 1)), p]);
    setTimeout(() => setParticles((ps) => ps.filter((x) => x.id !== p.id)), p.duration + 60);
  };
  return { particles, spawn };
}

function ReactionParticle({ p }: { p: Particle }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.set(withTiming(1, { duration: p.duration, easing: Easing.out(Easing.quad) }));
  }, [t, p.duration]);
  const style = useAnimatedStyle(() => {
    const v = t.get();
    return {
      opacity: interpolate(v, [0, 0.08, 0.7, 1], [0, 1, 0.9, 0], Extrapolation.CLAMP),
      transform: [
        { translateY: -v * p.rise },
        { translateX: p.x + Math.sin(v * Math.PI * 2.2) * 10 + p.drift * v },
        { scale: interpolate(v, [0, 0.15, 0.3, 1], [0.4, 1.15, 1, 0.85], Extrapolation.CLAMP) },
        { rotate: `${p.drift * 0.4 * v}deg` },
      ],
    };
  });
  return (
    <Animated.View style={[styles.particle, style]} pointerEvents="none">
      <Text style={{ fontSize: p.size, lineHeight: p.size * 1.2 }}>{p.emoji}</Text>
    </Animated.View>
  );
}

/** Sağ alttan yükselen kalpler / emojiler */
export function ReactionLayer({ particles, style }: { particles: Particle[]; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.layer, style]} pointerEvents="none">
      {particles.map((p) => (
        <ReactionParticle key={p.id} p={p} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  layer: { position: 'absolute', width: 60, height: 10 },
  particle: { position: 'absolute', bottom: 0, left: 10 },
});
