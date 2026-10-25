/**
 * Fotoğraf seçimi: galeri / kamera (expo-image-picker) ve simülatör için kategori örnek görselleri.
 */
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { Button, Chip, Icon, PressableScale, Sheet, Text, toast } from '@/components/ui';
import { CATEGORIES_BY_POPULARITY } from '@/data';
import { categoryPhotos } from '@/data/categories';
import { haptic } from '@/lib/haptics';
import { liveColors, radius, SCREEN_PADDING, useTheme } from '@/theme';

export async function pickFromLibrary(opts: { limit: number; aspect?: [number, number] }): Promise<string[]> {
  try {
    const single = opts.limit <= 1;
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: !single,
      selectionLimit: single ? 1 : opts.limit,
      orderedSelection: true,
      allowsEditing: single && !!opts.aspect,
      aspect: opts.aspect,
      quality: 0.8,
    });
    if (res.canceled) return [];
    return res.assets.map((a) => a.uri).slice(0, opts.limit);
  } catch {
    toast.error('Galeri açılamadı');
    return [];
  }
}

export async function takePhoto(aspect: [number, number] = [1, 1]): Promise<string | null> {
  try {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      toast.warning('Kamera izni gerekli. Ayarlar’dan izin verebilirsin.');
      return null;
    }
    const res = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], allowsEditing: true, aspect, quality: 0.8 });
    return res.canceled ? null : res.assets[0].uri;
  } catch {
    toast.error('Kamera bu cihazda kullanılamıyor. Örnek fotoğraf seçebilirsin.');
    return null;
  }
}

/**
 * Kategori görsel havuzundan örnek fotoğraf seçme sayfası (simülatörde kamera/galeri yokken).
 */
export function SamplePhotoSheet({
  visible,
  onClose,
  initialCategoryId,
  max,
  aspect = 1,
  onPick,
}: {
  visible: boolean;
  onClose: () => void;
  initialCategoryId?: string;
  max: number;
  /** genişlik / yükseklik oranı yerine yükseklik çarpanı (1 = kare, 16/9 = dikey) */
  aspect?: number;
  onPick: (uris: string[]) => void;
}) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const [categoryId, setCategoryId] = useState(initialCategoryId ?? CATEGORIES_BY_POPULARITY[0].id);
  const [selected, setSelected] = useState<string[]>([]);
  const photos = categoryPhotos(categoryId).slice(0, 18);
  const tile = Math.floor((width - SCREEN_PADDING * 2 - 16) / 3);

  const toggle = (uri: string) => {
    haptic.tap();
    if (max <= 1) {
      setSelected([uri]);
      return;
    }
    setSelected((cur) => (cur.includes(uri) ? cur.filter((u) => u !== uri) : cur.length >= max ? cur : [...cur, uri]));
  };

  const close = () => {
    setSelected([]);
    onClose();
  };

  return (
    <Sheet
      visible={visible}
      onClose={close}
      title="Örnek fotoğraf seç"
      subtitle={max > 1 ? `En fazla ${max} fotoğraf seçebilirsin` : 'Bir görsel seç'}
      height={0.85}
      showClose
      footer={
        <Button
          title={selected.length ? `${selected.length} fotoğrafı ekle` : 'Fotoğraf seç'}
          disabled={!selected.length}
          fullWidth
          size="lg"
          onPress={() => {
            onPick(selected);
            close();
          }}
        />
      }>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} style={{ marginHorizontal: -SCREEN_PADDING }}>
        {CATEGORIES_BY_POPULARITY.map((c) => (
          <Chip key={c.id} label={c.shortName} emoji={c.emoji} size="sm" selected={c.id === categoryId} onPress={() => setCategoryId(c.id)} />
        ))}
      </ScrollView>
      <View style={styles.grid}>
        {photos.map((uri) => {
          const idx = selected.indexOf(uri);
          return (
            <PressableScale key={uri} scaleTo={0.95} onPress={() => toggle(uri)} style={{ width: tile, height: Math.round(tile * aspect), borderRadius: radius.sm, overflow: 'hidden', backgroundColor: colors.skeleton }}>
              <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" transition={150} recyclingKey={uri} />
              <View style={[styles.mark, { borderColor: liveColors.text, backgroundColor: idx >= 0 ? colors.primary : liveColors.glass }]}>
                {idx >= 0 ? (
                  max > 1 ? (
                    <Text variant="caption" color={colors.onPrimary}>
                      {idx + 1}
                    </Text>
                  ) : (
                    <Icon name="checkmark" size={14} color={colors.onPrimary} />
                  )
                ) : null}
              </View>
            </PressableScale>
          );
        })}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  chips: { paddingHorizontal: SCREEN_PADDING, gap: 8, paddingBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  mark: { position: 'absolute', top: 6, right: 6, width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
});
