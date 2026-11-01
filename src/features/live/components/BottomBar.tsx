import { StyleSheet, View } from 'react-native';

import { Icon, PressableScale, Text } from '@/components/ui';
import { haptic } from '@/lib/haptics';
import { liveColors } from '@/theme';

import { DEFAULT_REACTION } from './Reactions';
import { LIVE_RADIUS, liveStyles } from './styles';

export type BottomBarProps = {
  shopCount: number;
  /** Artık kullanılmıyor (ürün görseli kutucuğu kaldırıldı); geriye dönük uyumluluk için duruyor */
  shopThumb?: string;
  reactionEmoji: string;
  /** Misafir: sohbet alanı yerine giriş istemi (dokununca giriş kapısı açılır) */
  guest?: boolean;
  onCompose: () => void;
  onReact: () => void;
  onReactLong: () => void;
  onShop: () => void;
};

const H = 42;

/**
 * S20-D: alt çubuk. Cam sohbet kutusu + dış hatlı kalp ikonlu cam tepki düğmesi
 * (uzun basınca tepki seçici; puanla alınmış özel tepki seçiliyse köşesinde küçük emoji) +
 * çanta ikonlu cam "Mağaza · N" etiketi.
 */
export function BottomBar({ shopCount, reactionEmoji, guest, onCompose, onReact, onReactLong, onShop }: BottomBarProps) {
  const placeholder = guest ? 'Mesaj yazmak için giriş yap' : 'Sohbete katıl…';
  const custom = reactionEmoji !== DEFAULT_REACTION;
  return (
    <View style={styles.row}>
      <PressableScale scaleTo={0.98} onPress={onCompose} style={[liveStyles.glass, styles.input]} accessibilityRole="button" accessibilityLabel={placeholder}>
        <Icon name="chatbubble-ellipses-outline" size={17} color={liveColors.textSecondary} />
        <Text variant="callout" weight="500" color={liveColors.textSecondary} numberOfLines={1} style={styles.flex}>
          {placeholder}
        </Text>
      </PressableScale>
      <PressableScale
        scaleTo={0.85}
        onPress={() => {
          haptic.light();
          onReact();
        }}
        onLongPress={() => {
          haptic.medium();
          onReactLong();
        }}
        delayLongPress={350}
        style={[liveStyles.glass, styles.react]}
        accessibilityRole="button"
        accessibilityLabel="Tepki gönder"
        accessibilityHint="Uzun basınca tepki seçebilirsin">
        <Icon name="heart-outline" size={22} color={liveColors.text} />
        {custom ? (
          <View style={styles.reactBadge}>
            <Text style={styles.reactEmoji}>{reactionEmoji}</Text>
          </View>
        ) : null}
      </PressableScale>
      <PressableScale scaleTo={0.92} onPress={onShop} style={[liveStyles.glass, styles.shop]} accessibilityRole="button" accessibilityLabel={`Mağaza, ${shopCount} ürün`}>
        <Icon name="bag-handle-outline" size={17} color={liveColors.text} />
        <Text variant="subhead" weight="700" color={liveColors.text} numberOfLines={1} tabular>
          Mağaza{shopCount > 0 ? ` · ${shopCount > 99 ? '99+' : shopCount}` : ''}
        </Text>
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flex: { flex: 1 },
  input: {
    flex: 1,
    height: H,
    borderRadius: LIVE_RADIUS.button,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  react: { width: H, height: H, borderRadius: H / 2, alignItems: 'center', justifyContent: 'center' },
  reactBadge: {
    position: 'absolute',
    right: -3,
    bottom: -3,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: liveColors.panelAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reactEmoji: { fontSize: 11, lineHeight: 14 },
  shop: { height: H, borderRadius: H / 2, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 6 },
});
