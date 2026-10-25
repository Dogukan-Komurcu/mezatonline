/**
 * Tam ekran görsel görüntüleyici: kaydırarak gezin, iki parmakla / çift dokunarak yakınlaştır.
 */
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { FlatList, Modal, StyleSheet, useWindowDimensions, View } from 'react-native';
import { GestureDetector, GestureHandlerRootView, usePanGesture, usePinchGesture, useSimultaneousGestures, useTapGesture } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { IconButton, Text } from '@/components/ui';
import { liveColors } from '@/theme';

export function ImageViewer({ images, index, visible, onClose }: { images: string[]; index: number; visible: boolean; onClose: () => void }) {
  return (
    <Modal visible={visible} animationType="fade" transparent={false} onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent presentationStyle="fullScreen">
      {visible ? <ViewerBody images={images} initialIndex={index} onClose={onClose} /> : null}
    </Modal>
  );
}

function ViewerBody({ images, initialIndex, onClose }: { images: string[]; initialIndex: number; onClose: () => void }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [current, setCurrent] = useState(initialIndex);
  const [zoomed, setZoomed] = useState(false);
  return (
    <GestureHandlerRootView style={styles.root}>
      <StatusBar style="light" />
      <FlatList
        data={images}
        horizontal
        pagingEnabled
        scrollEnabled={!zoomed}
        initialScrollIndex={initialIndex}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        keyExtractor={(uri, i) => `${uri}-${i}`}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setCurrent(Math.round(e.nativeEvent.contentOffset.x / width))}
        renderItem={({ item }) => <ZoomableImage uri={item} width={width} height={height} onZoomChange={setZoomed} />}
      />
      <View style={[styles.top, { paddingTop: insets.top + 6 }]} pointerEvents="box-none">
        <View style={styles.counter}>
          <Text variant="subhead" weight="700" color={liveColors.text} tabular>
            {current + 1} / {images.length}
          </Text>
        </View>
        <IconButton name="close" variant="glass" size={40} onPress={onClose} accessibilityLabel="Kapat" />
      </View>
      <View style={[styles.bottom, { paddingBottom: insets.bottom + 18 }]} pointerEvents="none">
        <View style={styles.dots}>
          {images.map((uri, i) => (
            <View key={`${uri}-${i}`} style={[styles.dot, i === current ? styles.dotActive : null]} />
          ))}
        </View>
        <Text variant="footnote" color={liveColors.textTertiary} align="center">
          Yakınlaştırmak için çift dokun ya da iki parmakla büyüt
        </Text>
      </View>
    </GestureHandlerRootView>
  );
}

const MAX_SCALE = 4;

function ZoomableImage({ uri, width, height, onZoomChange }: { uri: string; width: number; height: number; onZoomChange: (z: boolean) => void }) {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const savedTx = useSharedValue(0);
  const savedTy = useSharedValue(0);
  const [zoomed, setZoomed] = useState(false);

  const report = (z: boolean) => {
    setZoomed(z);
    onZoomChange(z);
  };

  const pinch = usePinchGesture({
    onUpdate: (e) => {
      scale.set(Math.max(0.8, Math.min(MAX_SCALE, savedScale.get() * e.scale)));
    },
    onDeactivate: () => {
      if (scale.get() <= 1.05) {
        scale.set(withTiming(1));
        tx.set(withTiming(0));
        ty.set(withTiming(0));
        savedScale.set(1);
        savedTx.set(0);
        savedTy.set(0);
        scheduleOnRN(report, false);
      } else {
        savedScale.set(scale.get());
        scheduleOnRN(report, true);
      }
    },
  });

  const pan = usePanGesture({
    enabled: zoomed,
    onUpdate: (e) => {
      const s = scale.get();
      const maxX = (width * (s - 1)) / 2;
      const maxY = (height * (s - 1)) / 2;
      tx.set(Math.max(-maxX, Math.min(maxX, savedTx.get() + e.translationX)));
      ty.set(Math.max(-maxY, Math.min(maxY, savedTy.get() + e.translationY)));
    },
    onDeactivate: () => {
      savedTx.set(tx.get());
      savedTy.set(ty.get());
    },
  });

  const doubleTap = useTapGesture({
    numberOfTaps: 2,
    onActivate: () => {
      if (scale.get() > 1.05) {
        scale.set(withTiming(1));
        tx.set(withTiming(0));
        ty.set(withTiming(0));
        savedScale.set(1);
        savedTx.set(0);
        savedTy.set(0);
        scheduleOnRN(report, false);
      } else {
        scale.set(withTiming(2.5));
        savedScale.set(2.5);
        scheduleOnRN(report, true);
      }
    },
  });

  const gesture = useSimultaneousGestures(pinch, pan, doubleTap);
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: tx.get() }, { translateY: ty.get() }, { scale: scale.get() }] }));

  return (
    <GestureDetector gesture={gesture}>
      <View style={{ width, height }}>
        <Animated.View style={[StyleSheet.absoluteFill, style]}>
          <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="contain" cachePolicy="memory-disk" transition={150} />
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: liveColors.panel },
  top: { position: 'absolute', left: 0, right: 0, top: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12 },
  counter: { backgroundColor: liveColors.glass, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, gap: 10 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: liveColors.textTertiary },
  dotActive: { width: 18, backgroundColor: liveColors.text },
});
