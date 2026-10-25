/**
 * Fotoğraf seçme / çekme yardımcısı (expo-image-picker).
 * Bileşen dışında tutulur: try/catch içeren async akışlar React Compiler'ın derlemesini engellemesin.
 */
import * as ImagePicker from 'expo-image-picker';

import { toast } from '@/components/ui';

export type PickOptions = { aspect?: [number, number]; allowsEditing?: boolean; front?: boolean; maxBytes?: number };

export async function pickImage(source: 'library' | 'camera', opts: PickOptions = {}): Promise<ImagePicker.ImagePickerAsset | null> {
  try {
    if (source === 'camera') {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        toast.warning('Fotoğraf çekmek için kamera izni gerekli', 'camera-outline');
        return null;
      }
    }
    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: opts.allowsEditing ?? false,
      aspect: opts.aspect,
      cameraType: opts.front ? ImagePicker.CameraType.front : undefined,
    };
    const res = source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
    if (res.canceled || !res.assets[0]) return null;
    const asset = res.assets[0];
    if (opts.maxBytes && asset.fileSize && asset.fileSize > opts.maxBytes) {
      toast.error(`Fotoğraf en fazla ${Math.round(opts.maxBytes / (1024 * 1024))} MB olabilir`);
      return null;
    }
    return asset;
  } catch {
    toast.error(source === 'camera' ? 'Kamera açılamadı' : 'Fotoğraf seçilemedi');
    return null;
  }
}
