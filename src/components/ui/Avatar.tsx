import { Image } from 'expo-image';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { brand, useTheme } from '@/theme';

import { Icon } from './Icon';
import { Text } from './Text';

const LETTER_COLORS = ['#8B5CF6', '#F59E0B', '#10B981', '#3B82F6', '#EF4444', '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#84CC16'];

function colorFor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return LETTER_COLORS[h % LETTER_COLORS.length];
}

export type AvatarProps = {
  uri?: string;
  name: string;
  size?: number;
  /** Canlı yayında: kırmızı halka */
  live?: boolean;
  /** Sarı halka (takip edilen / öne çıkan) */
  ring?: boolean;
  verified?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** Profil fotoğrafı; yoksa Whatnot'taki gibi renkli harf dairesi */
export function Avatar({ uri, name, size = 36, live, ring, verified, style }: AvatarProps) {
  const { colors } = useTheme();
  const ringColor = live ? colors.live : ring ? brand.yellow : undefined;
  const inner = ringColor ? size - 6 : size;
  return (
    <View style={[{ width: size, height: size }, style]}>
      <View
        style={[
          styles.ring,
          { width: size, height: size, borderRadius: size / 2, borderColor: ringColor ?? 'transparent', borderWidth: ringColor ? 2 : 0 },
        ]}>
        {uri ? (
          <Image
            source={{ uri }}
            style={{ width: inner, height: inner, borderRadius: inner / 2, backgroundColor: colors.skeleton }}
            contentFit="cover"
            transition={150}
            cachePolicy="memory-disk"
            recyclingKey={uri}
          />
        ) : (
          <View style={[styles.letter, { width: inner, height: inner, borderRadius: inner / 2, backgroundColor: colorFor(name) }]}>
            <Text style={{ fontSize: inner * 0.42, lineHeight: inner * 0.5, fontWeight: '700' }} color="#FFFFFF">
              {name.replace(/[^a-zA-ZçğıöşüÇĞİÖŞÜ0-9]/g, '').charAt(0).toLocaleUpperCase('tr-TR') || '?'}
            </Text>
          </View>
        )}
      </View>
      {live ? (
        <View style={[styles.liveTag, { backgroundColor: colors.live, bottom: -4 }]}>
          <Text variant="caption" color="#FFFFFF" numberOfLines={1} style={{ fontSize: Math.max(7, Math.min(11, size * 0.16)), lineHeight: Math.max(9, Math.min(13, size * 0.2)), letterSpacing: 0.2 }}>
            CANLI
          </Text>
        </View>
      ) : null}
      {verified && !live ? (
        <View style={[styles.verified, { backgroundColor: colors.bg }]}>
          <Icon name="checkmark-circle" size={Math.max(12, size * 0.32)} color="info" />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  ring: { alignItems: 'center', justifyContent: 'center' },
  letter: { alignItems: 'center', justifyContent: 'center' },
  liveTag: {
    position: 'absolute',
    alignSelf: 'center',
    minWidth: 30,
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  verified: { position: 'absolute', right: -2, bottom: -2, borderRadius: 10 },
});
