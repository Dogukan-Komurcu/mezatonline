/**
 * Canlı yayın kamera katmanı: izinler, önizleme ve kamerası olmayan cihazlar (simülatör) için
 * hareketli degrade yer tutucu.
 */
import * as Device from 'expo-device';
import { CameraView, useCameraPermissions, useMicrophonePermissions, type CameraType } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Linking, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

import { Button, Icon, Text } from '@/components/ui';
import { haptic } from '@/lib/haptics';
import { liveColors, radius } from '@/theme';

export type CameraAccess = {
  /** Cihazda kamera var mı (simülatörde false) */
  available: boolean | null;
  camGranted: boolean;
  micGranted: boolean;
  /** İzin durumları yüklendi mi */
  ready: boolean;
  /** Kullanıcı reddetti ve bir daha sorulamıyor → ayarlar */
  blocked: boolean;
  request: () => Promise<void>;
};

/** Kamera + mikrofon izinleri ve cihaz uygunluğu */
export function useCameraAccess(): CameraAccess {
  const [cam, requestCam] = useCameraPermissions();
  const [mic, requestMic] = useMicrophonePermissions();
  const [available, setAvailable] = useState<boolean | null>(Device.isDevice ? null : false);

  useEffect(() => {
    if (!Device.isDevice) return;
    let alive = true;
    CameraView.isAvailableAsync()
      .then((ok) => {
        if (alive) setAvailable(ok);
      })
      .catch(() => {
        if (alive) setAvailable(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const camGranted = !!cam?.granted;
  const micGranted = !!mic?.granted;
  const blocked = (!!cam && !cam.granted && !cam.canAskAgain) || (!!mic && !mic.granted && !mic.canAskAgain);

  const request = async () => {
    haptic.tap();
    if (blocked) {
      Linking.openSettings().catch(() => {});
      return;
    }
    if (!cam?.granted) await requestCam();
    if (!mic?.granted) await requestMic();
  };

  return { available, camGranted, micGranted, ready: !!cam && !!mic && available !== null, blocked, request };
}

/** Kamerasız cihazlarda (simülatör) yavaşça hareket eden koyu degrade */
export function CameraPlaceholder({ label = 'Kamera önizlemesi', hint, style }: { label?: string; hint?: string; style?: StyleProp<ViewStyle> }) {
  const a = useSharedValue(0);
  const b = useSharedValue(0);
  const pulse = useSharedValue(1);
  useEffect(() => {
    a.set(withRepeat(withTiming(1, { duration: 7000, easing: Easing.inOut(Easing.sin) }), -1, true));
    b.set(withRepeat(withTiming(1, { duration: 9000, easing: Easing.inOut(Easing.sin) }), -1, true));
    pulse.set(withRepeat(withSequence(withTiming(1.08, { duration: 1200 }), withTiming(1, { duration: 1200 })), -1));
  }, [a, b, pulse]);
  const blobA = useAnimatedStyle(() => ({
    transform: [{ translateX: -80 + a.get() * 160 }, { translateY: -60 + a.get() * 120 }, { scale: 1 + a.get() * 0.3 }],
  }));
  const blobB = useAnimatedStyle(() => ({
    transform: [{ translateX: 90 - b.get() * 180 }, { translateY: 80 - b.get() * 140 }, { scale: 1.2 - b.get() * 0.3 }],
  }));
  const iconStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.get() }] }));
  return (
    <View style={[StyleSheet.absoluteFill, styles.placeholder, style]} pointerEvents="none">
      <LinearGradient colors={[liveColors.panelAlt, liveColors.panel, liveColors.panel]} locations={[0, 0.6, 1]} style={StyleSheet.absoluteFill} />
      <Animated.View style={[styles.blob, styles.blobA, blobA]} />
      <Animated.View style={[styles.blob, styles.blobB, blobB]} />
      <View style={styles.placeholderCenter}>
        <Animated.View style={[styles.camIcon, iconStyle]}>
          <Icon name="videocam" size={30} color={liveColors.text} />
        </Animated.View>
        <Text variant="headline" color={liveColors.text}>
          {label}
        </Text>
        {hint ? (
          <Text variant="footnote" color={liveColors.textSecondary} align="center" style={{ maxWidth: 260 }}>
            {hint}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

export type CameraStageProps = {
  access: CameraAccess;
  facing: CameraType;
  zoom?: number;
  torch?: boolean;
  muted?: boolean;
  /** Ekran odakta değilken kamerayı kapat */
  active?: boolean;
  placeholderHint?: string;
};

/**
 * Tam ekran kamera önizlemesi. İzin yoksa / cihazda kamera yoksa / hata olursa yer tutucu gösterir.
 */
export function CameraStage({ access, facing, zoom = 0, torch, muted, active = true, placeholderHint }: CameraStageProps) {
  const [mountError, setMountError] = useState(false);
  const canShow = access.available === true && access.camGranted && !mountError && active;
  if (!canShow) {
    const hint =
      placeholderHint ??
      (access.available === false
        ? 'Bu cihazda kamera bulunamadı. Yayın provası için önizleme gösteriliyor.'
        : mountError
          ? 'Kamera başlatılamadı. Diğer uygulamaları kapatıp tekrar dene.'
          : access.ready && !access.camGranted
            ? 'Kamera izni verilmedi. Ayarlar › Mezatonline › Kamera adımından izin verebilirsin.'
            : undefined);
    return <CameraPlaceholder hint={hint} />;
  }
  return (
    <CameraView
      style={StyleSheet.absoluteFill}
      facing={facing}
      zoom={zoom}
      enableTorch={!!torch && facing === 'back'}
      mute={muted}
      mirror={facing === 'front'}
      mode="picture"
      active={active}
      onMountError={() => setMountError(true)}
    />
  );
}

/** İzin açıklama kartı (kamera önizlemesinin üstünde) */
export function PermissionCard({ access, style }: { access: CameraAccess; style?: StyleProp<ViewStyle> }) {
  const missing = !access.camGranted && !access.micGranted ? 'Kamera ve mikrofon' : !access.camGranted ? 'Kamera' : 'Mikrofon';
  return (
    <View style={[styles.permCard, style]}>
      <View style={styles.permIcon}>
        <Icon name={access.camGranted ? 'mic' : 'videocam'} size={24} color={liveColors.onPrimary} />
      </View>
      <Text variant="title3" color={liveColors.text} align="center">
        {missing} izni gerekli
      </Text>
      <Text variant="callout" color={liveColors.textSecondary} align="center">
        İzleyicilerin seni görebilmesi ve duyabilmesi için {missing.toLocaleLowerCase('tr-TR')} erişimine izin vermelisin.
      </Text>
      <Button
        title={access.blocked ? 'Ayarları aç' : 'İzin ver'}
        icon={access.blocked ? 'settings-outline' : 'checkmark'}
        onPress={access.request}
        style={{ marginTop: 4, alignSelf: 'stretch' }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: { overflow: 'hidden', backgroundColor: liveColors.panel },
  blob: { position: 'absolute', width: 340, height: 340, borderRadius: 170 },
  blobA: { top: '12%', left: '-10%', backgroundColor: liveColors.accent, opacity: 0.22 },
  blobB: { bottom: '18%', right: '-14%', backgroundColor: liveColors.primary, opacity: 0.14 },
  placeholderCenter: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', gap: 8, paddingBottom: '30%' },
  camIcon: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: liveColors.glassLight,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: liveColors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  permCard: {
    backgroundColor: liveColors.glassStrong,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: liveColors.border,
    padding: 20,
    gap: 8,
    alignItems: 'center',
  },
  permIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: liveColors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
});
