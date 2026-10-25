import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useVideoPlayer, VideoView, type VideoPlayer } from 'expo-video';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { brand } from '@/theme';

import { alpha } from './styles';

// React Compiler: oynatıcı özelliklerini bileşen gövdesinde değil modül düzeyindeki yardımcılarla değiştir.
function applyMuted(player: VideoPlayer, muted: boolean) {
  player.muted = muted;
}
function applyPlaying(player: VideoPlayer, playing: boolean) {
  if (playing) player.play();
  else player.pause();
}

/** Video yoksa / yüklenirken kapak görseli üzerinde yavaş Ken Burns yakınlaşması */
function KenBurnsCover({ uri, animate }: { uri: string; animate: boolean }) {
  const t = useSharedValue(0);
  useEffect(() => {
    if (!animate) {
      cancelAnimation(t);
      return;
    }
    t.set(withRepeat(withTiming(1, { duration: 16000, easing: Easing.inOut(Easing.quad) }), -1, true));
    return () => cancelAnimation(t);
  }, [animate, t]);
  const style = useAnimatedStyle(() => {
    const v = t.get();
    return { transform: [{ scale: 1.06 + v * 0.14 }, { translateX: -8 + v * 16 }, { translateY: v * -18 }] };
  });
  return (
    <Animated.View style={[StyleSheet.absoluteFill, style]}>
      <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" transition={250} recyclingKey={uri} />
    </Animated.View>
  );
}

function VideoLayer({ uri, playing, muted }: { uri: string; playing: boolean; muted: boolean }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });
  const opacity = useSharedValue(0);
  useEffect(() => {
    applyMuted(player, muted);
  }, [player, muted]);
  useEffect(() => {
    applyPlaying(player, playing);
  }, [player, playing]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.get() }));
  return (
    <Animated.View style={[StyleSheet.absoluteFill, style]}>
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        nativeControls={false}
        allowsPictureInPicture={false}
        fullscreenOptions={{ enable: false }}
        surfaceType="textureView"
        onFirstFrameRender={() => opacity.set(withTiming(1, { duration: 350 }))}
      />
    </Animated.View>
  );
}

export type LiveVideoProps = {
  coverImage: string;
  videoUrl?: string;
  /** Sayfa görünür: video oynatıcısını bağla */
  mounted: boolean;
  /** Oynat (ekran odaktayken) */
  playing: boolean;
  muted: boolean;
};

/** Tam ekran 9:16 yayın görüntüsü + okunabilirlik gradyanları */
export function LiveVideo({ coverImage, videoUrl, mounted, playing, muted }: LiveVideoProps) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <KenBurnsCover uri={coverImage} animate={mounted && playing} />
      {mounted && videoUrl ? <VideoLayer uri={videoUrl} playing={playing} muted={muted} /> : null}
      <LinearGradient colors={[alpha(brand.black, 0.55), alpha(brand.black, 0.18), 'transparent']} locations={[0, 0.55, 1]} style={styles.top} />
      <LinearGradient colors={['transparent', alpha(brand.black, 0.35), alpha(brand.black, 0.82)]} locations={[0, 0.45, 1]} style={styles.bottom} />
    </View>
  );
}

const styles = StyleSheet.create({
  top: { position: 'absolute', left: 0, right: 0, top: 0, height: 190 },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '62%' },
});
