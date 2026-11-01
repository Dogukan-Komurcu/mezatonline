/**
 * S85 — Canlıya Geç (yayın öncesi hazırlık).
 * Tam ekran kamera önizlemesi + alttan yayın seçimi, kontrol listesi, Prova Modu ve 3-2-1 geri sayım.
 */
import type { CameraType } from 'expo-camera';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, router, useIsFocused, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Icon, IconButton, PressableScale, Text, TextField, toast, type IconName } from '@/components/ui';
import { CATEGORIES_BY_POPULARITY, getCategory } from '@/data';
import { useSellerExtras } from '@/features/seller/store';
import { bannedMessage, scanText } from '@/features/trust/counterfeit';
import { useTrustStore } from '@/features/trust/store';
import { formatShowTime } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { useMe } from '@/store/auth';
import { useSellerStore } from '@/store/seller';
import { liveColors, radius, SCREEN_PADDING, useTheme } from '@/theme';
import type { Show } from '@/types';

import { CameraStage, PermissionCard, useCameraAccess } from './camera';
import { InfoBox, OptionChips, SwitchRow } from './controls';
import { CountdownOverlay } from './CountdownOverlay';
import { isLiveSellable, resolveShowProductIds, useIsSeller, useKeyboardHeight, ZOOM_LEVELS } from './helpers';

const QUICK = 'quick';

export function GoLiveScreen() {
  const isSeller = useIsSeller();
  if (!isSeller) return <Redirect href="/seller/apply" />;
  return <GoLiveContent />;
}

function GoLiveContent() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { height: screenH } = useWindowDimensions();
  const params = useLocalSearchParams<{ showId?: string }>();
  const focused = useIsFocused();
  const me = useMe();
  const access = useCameraAccess();
  const keyboard = useKeyboardHeight();

  const allShows = useSellerStore((s) => s.shows);
  const listings = useSellerStore((s) => s.listings);
  const statusMap = useSellerExtras((s) => s.listingStatus);
  const ipCases = useTrustStore((s) => s.cases);
  const scheduleShow = useSellerStore((s) => s.scheduleShow);
  const setShowStatus = useSellerStore((s) => s.setShowStatus);

  const shows = allShows
    .filter((s) => s.status === 'scheduled' || s.status === 'live')
    .sort((a, b) => (a.status === 'live' ? -1 : b.status === 'live' ? 1 : a.scheduledAt.localeCompare(b.scheduledAt)));

  const [facing, setFacing] = useState<CameraType>('front');
  const [torch, setTorch] = useState(false);
  const [zoomIndex, setZoomIndex] = useState(0);
  const [selectedId, setSelectedId] = useState<string>(() => {
    if (params.showId && allShows.some((s) => s.id === params.showId)) return params.showId;
    // Devam eden yayın varsa önce o ("Yayına Dön"), yoksa en yakın planlı yayın (liste bu sırayla sıralı)
    return shows[0]?.id ?? QUICK;
  });
  const [quickTitle, setQuickTitle] = useState('');
  const [quickCategory, setQuickCategory] = useState(() => me.categoryIds[0] ?? CATEGORIES_BY_POPULARITY[0]?.id ?? 'tcg');
  const [rehearsal, setRehearsal] = useState(false);
  const [checkStep, setCheckStep] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [panelH, setPanelH] = useState(0);
  const [toolsBottom, setToolsBottom] = useState(0);

  const selected: Show | undefined = shows.find((s) => s.id === selectedId);
  // Taslak/pasif ve şikâyetle kaldırılan ilanlar hızlı yayına da eklenmez
  const activeListings = listings.filter((p) => isLiveSellable(p, statusMap, ipCases));
  const productCount = selected ? resolveShowProductIds(selected, listings, statusMap, ipCases).length : activeListings.length;
  const linkedCount = selected ? listings.filter((p) => p.showId === selected.id || selected.productIds.includes(p.id)).length : 0;
  // Hızlı yayın başlığında da yasaklı ifade ("replika", "A kalite"…) kullanılamaz (planlı yayında ScheduleForm denetler)
  const quickTitleBanned = selectedId === QUICK ? bannedMessage(scanText([quickTitle], quickCategory).banned) : undefined;

  // Sahte donanım kontrolleri: ışık → ses → ürünler
  useEffect(() => {
    const timers = [700, 1300, 1900].map((ms, i) => setTimeout(() => setCheckStep(i + 1), ms));
    return () => timers.forEach(clearTimeout);
  }, []);

  const goLive = () => {
    let id = selectedId;
    let temp = false;
    if (id === QUICK) {
      const cat = getCategory(quickCategory);
      const show = scheduleShow({
        title: quickTitle.trim(),
        description: 'Hızlı canlı yayın',
        coverImage: cat?.image || me.cover || me.avatar,
        categoryId: quickCategory,
        scheduledAt: new Date().toISOString(),
        tags: ['Hızlı yayın'],
        productIds: activeListings.map((p) => p.id),
      });
      id = show.id;
      temp = rehearsal;
    }
    if (!rehearsal) setShowStatus(id, 'live');
    haptic.success();
    const extra: Record<string, string> = {};
    if (rehearsal) extra.prova = '1';
    if (temp) extra.temp = '1';
    router.replace({ pathname: '/seller/live/[id]', params: { id, ...extra } });
  };

  // 3-2-1 geri sayım (goLive'ın en güncel hali ref ile çağrılır; sayaç yalnızca countdown değişince ilerler)
  const goLiveRef = useRef(goLive);
  useEffect(() => {
    goLiveRef.current = goLive;
  });
  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) {
      const t = setTimeout(() => goLiveRef.current(), 450);
      return () => clearTimeout(t);
    }
    haptic.medium();
    const t = setTimeout(() => setCountdown((c) => (c === null ? null : c - 1)), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const start = () => {
    if (selected?.status === 'live') {
      haptic.success();
      router.replace({ pathname: '/seller/live/[id]', params: { id: selected.id } });
      return;
    }
    if (selectedId === QUICK && quickTitle.trim().length < 3) {
      haptic.error();
      toast.error('Yayın başlığı en az 3 karakter olmalı');
      return;
    }
    if (quickTitleBanned) {
      haptic.error();
      toast.error('Yasaklı ifadeyi kaldırmadan yayına başlayamazsın');
      return;
    }
    if (checkStep < 3) {
      toast('Kontroller bitmek üzere, bir saniye…', 'hourglass-outline');
      return;
    }
    setCountdown(3);
  };

  const close = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/sell');
  };

  const addProduct = () => {
    if (selected) router.push({ pathname: '/seller/listing', params: { showId: selected.id } });
    else router.push('/seller/listing');
  };

  const needsPermission = access.ready && access.available === true && (!access.camGranted || !access.micGranted);
  const micOk = access.available === false || access.micGranted;
  const zoom = ZOOM_LEVELS[zoomIndex];

  const checks: { label: string; detail: string; ok: boolean; warn?: boolean }[] = [
    { label: 'Işık', detail: 'Yüzün ve ürünlerin net görünüyor', ok: checkStep >= 1 },
    { label: 'Ses', detail: micOk ? 'Mikrofon seviyesi iyi' : 'Mikrofon izni gerekiyor', ok: checkStep >= 2, warn: !micOk },
    {
      label: 'Ürünler hazır',
      detail: productCount > 0 ? `${productCount} ürün mağazanda hazır` : 'Henüz ürün yok — yayında da ekleyebilirsin',
      ok: checkStep >= 3,
      warn: productCount === 0 && !rehearsal,
    },
  ];

  return (
    <View style={[styles.flex, { backgroundColor: liveColors.panel }]}>
      <CameraStage
        access={access}
        facing={facing}
        torch={torch}
        zoom={zoom.value}
        active={focused}
        placeholderHint={needsPermission ? '' : undefined}
        // Yer tutucu yazısı alttaki panelin arkasında kalmasın: üst çubuk ile panel arasındaki alana ortala
        placeholderInset={{ top: insets.top + 56, bottom: panelH || screenH * 0.62 }}
      />
      <LinearGradient colors={[liveColors.glassStrong, 'transparent']} style={[styles.topShade, { height: insets.top + 120 }]} pointerEvents="none" />

      {/* Üst çubuk */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <IconButton name="close" variant="glass" size={40} onPress={close} accessibilityLabel="Kapat" />
        <View style={styles.topTitle}>
          <Text variant="headline" color={liveColors.text}>
            Canlıya Geç
          </Text>
          <MicMeter active={micOk} />
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Kamera araçları */}
      <View style={[styles.tools, { top: insets.top + 64 }]} onLayout={(e) => setToolsBottom(Math.round(e.nativeEvent.layout.y + e.nativeEvent.layout.height))}>
        <IconButton
          name="camera-reverse-outline"
          variant="glass"
          size={44}
          label="Çevir"
          onPress={() => {
            setFacing((f) => (f === 'front' ? 'back' : 'front'));
            setTorch(false);
          }}
        />
        <IconButton
          name={torch ? 'flash' : 'flash-off-outline'}
          variant="glass"
          size={44}
          label="Flaş"
          color={torch ? liveColors.primary : undefined}
          onPress={() => {
            if (facing === 'front') {
              toast('Flaş yalnızca arka kamerada kullanılabilir', 'flash-off-outline');
              return;
            }
            setTorch((t) => !t);
          }}
        />
        <IconButton
          name={zoomIndex === 0 ? 'scan-outline' : 'search'}
          variant="glass"
          size={44}
          label={zoom.label}
          onPress={() => setZoomIndex((i) => (i + 1) % ZOOM_LEVELS.length)}
        />
      </View>

      {/* Alt panel */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.bottomWrap} pointerEvents="box-none">
        <Animated.View
          entering={FadeInDown.duration(320)}
          onLayout={(e) => setPanelH(Math.round(e.nativeEvent.layout.height))}
          style={[styles.panel, { backgroundColor: liveColors.panel, maxHeight: Math.min(screenH * 0.62, keyboard > 0 ? screenH - keyboard - insets.top - 72 : screenH - (toolsBottom || insets.top + 280) - 12) }]}>
          <View style={styles.handle}>
            <View style={[styles.handleBar, { backgroundColor: colors.surfaceAlt }]} />
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 12 }}>
            {needsPermission ? <PermissionCard access={access} style={[styles.permCard, { backgroundColor: colors.surface, borderColor: colors.border }]} /> : null}
            <View style={styles.sectionHead}>
              <Text variant="title3">Yayın seç</Text>
              <PressableScale onPress={() => router.push('/seller/schedule')} hitSlop={8}>
                <Text variant="subhead" weight="700" color="accent">
                  + Yayın planla
                </Text>
              </PressableScale>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.showRow} style={styles.showScroll}>
              <ShowOption selected={selectedId === QUICK} onPress={() => setSelectedId(QUICK)} title="Hızlı yayın" subtitle="Hemen başla" icon="flash" />
              {shows.map((s) => (
                <ShowOption
                  key={s.id}
                  selected={selectedId === s.id}
                  onPress={() => setSelectedId(s.id)}
                  title={s.title}
                  subtitle={s.status === 'live' ? 'Şu an canlı' : formatShowTime(s.scheduledAt)}
                  image={s.coverImage}
                  live={s.status === 'live'}
                />
              ))}
            </ScrollView>

            {selectedId === QUICK ? (
              <View style={{ gap: 12, marginTop: 4 }}>
                <TextField
                  label="Yayın başlığı"
                  placeholder="ör. ₺1'den başlayan Pokémon kartları 🔥"
                  value={quickTitle}
                  onChangeText={setQuickTitle}
                  maxLength={80}
                  returnKeyType="done"
                  error={quickTitleBanned}
                />
                <View style={{ gap: 8 }}>
                  <Text variant="subhead" weight="600" color="textSecondary" style={{ marginLeft: 2 }}>
                    Kategori
                  </Text>
                  <OptionChips
                    options={CATEGORIES_BY_POPULARITY.map((c) => ({ value: c.id, label: `${c.emoji} ${c.shortName}` }))}
                    value={quickCategory}
                    onChange={setQuickCategory}
                  />
                </View>
              </View>
            ) : selected ? (
              <View style={[styles.selectedCard, { backgroundColor: colors.surfaceAlt }]}>
                <View style={{ flex: 1, gap: 3 }}>
                  <Text variant="headline" numberOfLines={2}>
                    {selected.title}
                  </Text>
                  <Text variant="footnote" color="textSecondary" numberOfLines={1}>
                    {getCategory(selected.categoryId)?.emoji} {getCategory(selected.categoryId)?.shortName ?? 'Kategori'} ·{' '}
                    {selected.status === 'live' ? 'Yayın devam ediyor' : formatShowTime(selected.scheduledAt)}
                  </Text>
                </View>
                {selected.status !== 'live' ? (
                  <Button title="Düzenle" size="sm" variant="glass" onPress={() => router.push({ pathname: '/seller/schedule', params: { id: selected.id } })} />
                ) : null}
              </View>
            ) : null}

            {/* Ürünler */}
            <View style={[styles.productsRow, { borderColor: colors.border }]}>
              <View style={[styles.productsIcon, { backgroundColor: colors.surfaceAlt }]}>
                <Icon name="cube-outline" size={20} />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="headline">Mağaza</Text>
                <Text variant="footnote" color="textSecondary" numberOfLines={2}>
                  {productCount > 0
                    ? linkedCount > 0
                      ? `${productCount} ürün bu yayına eklendi`
                      : `${productCount} aktif ilanın yayın mağazasında olacak`
                    : rehearsal
                      ? 'Provada demo ürünler kullanılır'
                      : 'Yayına ürün ekle'}
                </Text>
              </View>
              <Button title="Ürün ekle" size="sm" variant="glass" icon="add" onPress={addProduct} />
            </View>

            {/* Kontrol listesi */}
            <Text variant="title3" style={{ marginTop: 18, marginBottom: 6 }}>
              Kontrol listesi
            </Text>
            {checks.map((c) => (
              <View key={c.label} style={styles.checkRow}>
                <View style={[styles.checkIcon, { backgroundColor: c.ok ? (c.warn ? colors.warning : colors.success) : colors.surfaceAlt }]}>
                  {c.ok ? <Icon name={c.warn ? 'alert' : 'checkmark'} size={15} color={colors.onPrimary} /> : <ActivityIndicator size="small" color={colors.textSecondary} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="callout" weight="700">
                    {c.label}
                  </Text>
                  <Text variant="footnote" color="textSecondary" numberOfLines={1}>
                    {c.ok ? c.detail : 'Kontrol ediliyor…'}
                  </Text>
                </View>
              </View>
            ))}

            <SwitchRow
              icon="school-outline"
              title="Prova Modu"
              subtitle="Kimse seni görmez; ekrana sanal alıcılar gelir ve teklif verir. Prova sırasında yapılan satışlar siparişe dönüşmez."
              value={rehearsal}
              onChange={setRehearsal}
            />
            <InfoBox icon="bulb-outline">İpucu: Mezatlar arasında uzun sessizlik olmasın. Sıradaki ürünü önceden hazırlarsan geçişler hızlanır.</InfoBox>
          </ScrollView>
          <View style={{ paddingTop: 10, paddingBottom: keyboard > 0 ? 10 : Math.max(insets.bottom, 12) }}>
            <Button
              title={selected?.status === 'live' ? 'Yayına Dön' : rehearsal ? 'Provayı Başlat' : 'Canlı Yayına Başla'}
              icon={rehearsal ? 'school' : 'radio'}
              size="lg"
              fullWidth
              onPress={start}
            />
          </View>
        </Animated.View>
      </KeyboardAvoidingView>

      {countdown !== null ? (
        <CountdownOverlay
          count={countdown}
          rehearsal={rehearsal}
          onCancel={() => {
            haptic.light();
            setCountdown(null);
          }}
        />
      ) : null}
      
    </View>
  );
}

function ShowOption({
  selected,
  onPress,
  title,
  subtitle,
  image,
  icon,
  live,
}: {
  selected: boolean;
  onPress: () => void;
  title: string;
  subtitle: string;
  image?: string;
  icon?: IconName;
  live?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <PressableScale
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      style={[styles.showOption, { backgroundColor: colors.surface, borderColor: selected ? colors.primary : colors.border }]}>
      {image ? (
        <Image source={{ uri: image }} style={[styles.showThumb, { backgroundColor: colors.skeleton }]} contentFit="cover" cachePolicy="memory-disk" />
      ) : (
        <View style={[styles.showThumb, styles.quickThumb, { backgroundColor: colors.primary }]}>
          <Icon name={icon ?? 'flash'} size={20} color={colors.onPrimary} />
        </View>
      )}
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="subhead" weight="700" numberOfLines={2}>
          {title}
        </Text>
        <Text variant="caption" color={live ? colors.live : colors.textSecondary} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
    </PressableScale>
  );
}

/** Hareketli mikrofon seviyesi göstergesi */
function MicMeter({ active }: { active: boolean }) {
  return (
    <View style={styles.meter}>
      <Icon name={active ? 'mic' : 'mic-off'} size={12} color={active ? liveColors.text : liveColors.danger} />
      {[0, 1, 2, 3, 4].map((i) => (
        <MeterBar key={i} index={i} active={active} />
      ))}
    </View>
  );
}

function MeterBar({ index, active }: { index: number; active: boolean }) {
  const h = useSharedValue(0.3);
  useEffect(() => {
    if (!active) {
      h.set(withTiming(0.15));
      return;
    }
    const d = 260 + index * 70;
    h.set(
      withRepeat(
        withSequence(withTiming(0.4 + ((index * 37) % 50) / 100, { duration: d }), withTiming(0.2, { duration: d * 0.8 }), withTiming(0.9 - index * 0.08, { duration: d })),
        -1,
        true,
      ),
    );
  }, [active, index, h]);
  const style = useAnimatedStyle(() => ({ height: 4 + h.get() * 10 }));
  return <Animated.View style={[styles.meterBar, { backgroundColor: active ? liveColors.success : liveColors.textTertiary }, style]} />;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  topShade: { position: 'absolute', top: 0, left: 0, right: 0 },
  topBar: { position: 'absolute', left: 0, right: 0, top: 0, flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: SCREEN_PADDING },
  topTitle: { flex: 1, alignItems: 'center', gap: 6, paddingTop: 2 },
  tools: { position: 'absolute', right: SCREEN_PADDING - 4, gap: 14, alignItems: 'center' },
  permCard: { marginTop: 4, marginBottom: 12 },
  bottomWrap: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  panel: { borderTopLeftRadius: radius.xxl, borderTopRightRadius: radius.xxl, paddingHorizontal: SCREEN_PADDING },
  handle: { alignItems: 'center', paddingTop: 8, paddingBottom: 6 },
  handleBar: { width: 40, height: 5, borderRadius: 3 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4, marginBottom: 10 },
  showScroll: { marginHorizontal: -SCREEN_PADDING, marginBottom: 12 },
  showRow: { paddingHorizontal: SCREEN_PADDING, gap: 10 },
  showOption: { width: 176, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 8, borderRadius: radius.md, borderWidth: 2 },
  showThumb: { width: 40, height: 54, borderRadius: radius.xs },
  quickThumb: { alignItems: 'center', justifyContent: 'center' },
  selectedCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: radius.md },
  productsRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, marginTop: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  productsIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 7 },
  checkIcon: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  meter: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
    height: 16,
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: liveColors.glass,
  },
  meterBar: { width: 3, borderRadius: 2 },
});
