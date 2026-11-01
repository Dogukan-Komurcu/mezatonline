import { Image } from 'expo-image';
import { useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { Avatar, Button, EmptyState, Icon, PressableScale, Sheet, Text } from '@/components/ui';
import { CONDITION_LABELS } from '@/components/cards/ProductCard';
import { formatTRY, timeAgo } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { liveColors, useTheme } from '@/theme';
import type { Product } from '@/types';

import type { LiveSnapshot, SoldItem } from '../engine';

type TabKey = 'auction' | 'buy_now' | 'giveaway' | 'sold';

export type ShopSheetProps = {
  visible: boolean;
  onClose: () => void;
  sellerName: string;
  state: LiveSnapshot;
  onProductPress: (p: Product) => void;
  onBuyNow: (p: Product) => void;
  onPreBid: (p: Product) => void;
  onEnterGiveaway: () => void;
  /** Satırdaki kargo metni (paket ve yayının ücretsiz kargo eşiği dahil); yoksa ilanın kargo ücreti */
  shippingFor?: (p: Product) => string;
};

const VIA_LABEL: Record<SoldItem['via'], string> = { auction: 'Açık artırma', buy_now: 'Hemen Al', giveaway: 'Çekiliş', flash_sale: 'Flaş indirim' };

/** S24: Yayın Mağazası — sekmeler yerine çipler: Sırada · Satın al · (Çekiliş) · Satıldı */
export function ShopSheet({ visible, onClose, sellerName, state, onProductPress, onBuyNow, onPreBid, onEnterGiveaway, shippingFor }: ShopSheetProps) {
  const { colors } = useTheme();
  const [tab, setTab] = useState<TabKey>('auction');
  const [query, setQuery] = useState('');
  useEffect(() => {
    if (visible) setQuery('');
  }, [visible]);

  const q = query.trim().toLocaleLowerCase('tr-TR');
  const match = (p: Product) => !q || p.title.toLocaleLowerCase('tr-TR').includes(q);
  const lot = state.lot;
  const soldAuctionIds = new Set(state.sold.filter((s) => s.via === 'auction').map((s) => s.product.id));
  // Satılan açık artırma ürünleri yalnızca "Satıldı" sekmesinde görünür (Whatnot ile aynı)
  const openAuctions = state.queue.filter((p) => !soldAuctionIds.has(p.id));
  const auctions = openAuctions.filter(match);
  const bins = state.shop.filter(match);
  const sold = state.sold.filter((s) => match(s.product));
  const g = state.giveaway;

  const tabs = [
    { key: 'auction' as const, label: 'Sırada', count: openAuctions.length },
    { key: 'buy_now' as const, label: 'Satın al', count: state.shop.length },
    ...(g ? [{ key: 'giveaway' as const, label: 'Çekiliş', count: 1 }] : []),
    { key: 'sold' as const, label: 'Satıldı', count: state.sold.length },
  ];
  const activeTab: TabKey = tab === 'giveaway' && !g ? 'auction' : tab;

  const renderAuction = (p: Product) => {
    const onStage = lot?.product.id === p.id && lot.status === 'running';
    const soldItem = state.sold.find((s) => s.via === 'auction' && s.product.id === p.id);
    const pre = state.myPreBids?.[p.id];
    return (
      <Row shippingFor={shippingFor}
        key={p.id}
        product={p}
        onPress={() => onProductPress(p)}
        right={
          !onStage && !soldItem && !soldAuctionIds.has(p.id) ? (
            <Button title={pre ? 'Artır' : 'Ön teklif'} size="sm" variant={pre ? 'secondary' : 'outline'} onPress={() => onPreBid(p)} />
          ) : undefined
        }>
        {onStage ? (
          <>
            <View style={styles.tagRow}>
              <View style={[styles.tag, { backgroundColor: liveColors.primary }]}>
                <Icon name="pin" size={10} color={liveColors.onPrimary} />
                <Text variant="caption" weight="800" color={liveColors.onPrimary} style={styles.tagText}>
                  Sahnede
                </Text>
              </View>
              {lot.leader?.isMe ? (
                <Text variant="caption" weight="800" color={liveColors.success}>
                  Öndesin
                </Text>
              ) : null}
            </View>
            <Text variant="subhead" weight="800">
              Güncel teklif {formatTRY(lot.currentBid)} · {lot.bidCount} teklif
            </Text>
          </>
        ) : soldItem ? (
          <Text variant="subhead" weight="700" color={liveColors.live}>
            Satıldı {formatTRY(soldItem.price)} · {soldItem.winner.isMe ? 'Sen kazandın' : `@${soldItem.winner.username}`}
          </Text>
        ) : (
          <>
            <View style={styles.tagRow}>
              <View style={[styles.tag, { backgroundColor: colors.surfaceAlt }]}>
                <Text variant="caption" weight="800" style={styles.tagText}>
                  Sırada
                </Text>
              </View>
              {pre ? (
                <Text variant="caption" weight="800" color={liveColors.success}>
                  Ön teklifin: {formatTRY(pre)}
                </Text>
              ) : null}
            </View>
            <Text variant="subhead" weight="700">
              Açılış {formatTRY(p.price)}
            </Text>
          </>
        )}
      </Row>
    );
  };

  const renderBin = (p: Product) => {
    const stock = p.quantity - p.sold;
    const flash = state.flash && state.flash.status === 'running' && state.flash.product.id === p.id ? state.flash : undefined;
    const onStage = lot?.product.id === p.id && lot.status === 'running';
    return (
      <Row shippingFor={shippingFor} key={p.id} product={p} onPress={() => onProductPress(p)} right={stock > 0 && !onStage ? <Button title="Hemen Al" size="sm" onPress={() => onBuyNow(p)} /> : undefined}>
        <View style={styles.priceRow}>
          {flash ? (
            <>
              <Text variant="subhead" weight="800" color={liveColors.primary}>
                ⚡ {formatTRY(flash.price)}
              </Text>
              <Text variant="caption" color="textTertiary" style={styles.strike}>
                {formatTRY(flash.originalPrice)}
              </Text>
            </>
          ) : (
            <Text variant="subhead" weight="800">
              {formatTRY(p.price)}
            </Text>
          )}
          {p.compareAtPrice && p.compareAtPrice > p.price && !flash ? (
            <Text variant="caption" color="textTertiary" style={styles.strike}>
              {formatTRY(p.compareAtPrice)}
            </Text>
          ) : null}
        </View>
        <Text variant="caption" weight="600" color={stock > 0 ? (stock <= 2 ? liveColors.copper : 'textSecondary') : liveColors.live}>
          {onStage ? 'Şu an mezatta' : stock > 0 ? `Stokta ${stock} adet` : 'Tükendi'}
        </Text>
      </Row>
    );
  };

  const empty = (title: string, message: string) => <EmptyState icon="storefront-outline" title={title} message={message} style={styles.empty} />;

  return (
    <Sheet visible={visible} onClose={onClose} dark title={`${sellerName} Mağazası`} showClose height={0.86}>
      <View style={[styles.search, { backgroundColor: colors.surface }]}>
        <Icon name="search" size={16} color="textSecondary" />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Mağazada ara"
          placeholderTextColor={colors.textTertiary}
          style={[styles.searchInput, { color: colors.text }]}
          keyboardAppearance="dark"
          returnKeyType="search"
        />
        {query ? (
          <PressableScale onPress={() => setQuery('')} hitSlop={8} accessibilityLabel="Aramayı temizle">
            <Icon name="close-circle" size={16} color="textTertiary" />
          </PressableScale>
        ) : null}
      </View>
      <View style={styles.chips} accessibilityRole="tablist">
        {tabs.map((t) => {
          const on = t.key === activeTab;
          return (
            <PressableScale
              key={t.key}
              scaleTo={0.95}
              onPress={() => {
                haptic.tap();
                setTab(t.key);
              }}
              style={[styles.chip, { backgroundColor: on ? colors.primary : colors.surface }]}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`${t.label}, ${t.count}`}>
              <Text variant="footnote" weight="700" color={on ? colors.onPrimary : colors.text}>
                {t.label}
              </Text>
              <Text variant="caption" weight="700" color={on ? colors.onPrimary : colors.textSecondary} tabular>
                {t.count}
              </Text>
            </PressableScale>
          );
        })}
      </View>
      {activeTab === 'auction' ? (auctions.length ? auctions.map(renderAuction) : empty('Açık artırma yok', 'Bu yayında henüz sırada ürün yok.')) : null}
      {activeTab === 'buy_now' ? (bins.length ? bins.map(renderBin) : empty('Hemen Al ürünü yok', 'Satıcı bu yayında Hemen Al ürünü eklemedi.')) : null}
      {activeTab === 'giveaway' && g ? (
        <Row shippingFor={shippingFor}
          product={g.product}
          shippingIncluded
          onPress={() => undefined}
          right={g.status === 'running' ? <Button title={g.entered ? 'Katıldın ✓' : 'Katıl'} size="sm" disabled={g.entered} onPress={onEnterGiveaway} /> : undefined}>
          <Text variant="subhead" weight="800" color={liveColors.copper}>
            🎁 Ücretsiz · {g.entrants} katılımcı
          </Text>
          <Text variant="caption" color="textSecondary">
            {g.status === 'done' ? (g.winner?.isMe ? 'Kazanan: Sen 🎉' : `Kazanan: @${g.winner?.username ?? ''}`) : g.requiresFollow ? 'Takipçilere özel' : 'Herkes katılabilir'}
          </Text>
        </Row>
      ) : null}
      {activeTab === 'sold'
        ? sold.length
          ? sold.map((s) => (
              <View key={s.id} style={styles.row}>
                <Image source={{ uri: s.product.images[0] }} style={styles.thumb} contentFit="cover" cachePolicy="memory-disk" />
                <View style={styles.flex}>
                  <Text variant="subhead" weight="700" numberOfLines={2}>
                    {s.product.title.replace(/^🎁\s*/, '')}
                  </Text>
                  <View style={styles.soldRow}>
                    <Avatar uri={s.winner.avatar} name={s.winner.username} size={16} />
                    <Text variant="caption" color={s.winner.isMe ? liveColors.success : 'textSecondary'} numberOfLines={1} style={styles.flex}>
                      {s.winner.isMe ? 'Sen' : `@${s.winner.username}`} · {VIA_LABEL[s.via]} · {timeAgo(s.at)}
                    </Text>
                  </View>
                </View>
                <Text variant="subhead" weight="800" color={s.price > 0 ? 'text' : liveColors.copper}>
                  {s.price > 0 ? formatTRY(s.price) : 'Ücretsiz'}
                </Text>
              </View>
            ))
          : empty('Henüz satış yok', 'Satılan ürünler burada listelenir.')
        : null}
    </Sheet>
  );
}

/** shippingIncluded: kargoyu satıcı öder (kargo dahil ilan; çekiliş ödülünde her zaman) */
function Row({
  product,
  shippingIncluded,
  shippingFor,
  onPress,
  right,
  children,
}: {
  product: Product;
  shippingIncluded?: boolean;
  shippingFor?: (p: Product) => string;
  onPress: () => void;
  right?: ReactNode;
  children: ReactNode;
}) {
  const shipping = shippingIncluded || product.shippingIncluded ? 'Kargo dahil' : shippingFor ? shippingFor(product) : `Kargo ${formatTRY(product.shippingCost)}`;
  return (
    <PressableScale scaleTo={0.99} onPress={onPress} style={[styles.row, styles.rowCentered]}>
      <Image source={{ uri: product.images[0] }} style={styles.thumb} contentFit="cover" cachePolicy="memory-disk" recyclingKey={product.id} />
      <View style={styles.flex}>
        <Text variant="subhead" weight="600" numberOfLines={2}>
          {product.title.replace(/^🎁\s*/, '')}
        </Text>
        <Text variant="caption" color="textSecondary" numberOfLines={1}>
          {product.grade ?? CONDITION_LABELS[product.condition]} · {shipping}
        </Text>
        <View style={styles.rowBody}>{children}</View>
      </View>
      {right ? <View style={styles.rowRight}>{right}</View> : null}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, paddingHorizontal: 12, height: 42 },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12, marginBottom: 6 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 34, borderRadius: 999, paddingHorizontal: 14 },
  row: { flexDirection: 'row', gap: 12, paddingVertical: 10, alignItems: 'flex-start' },
  thumb: { width: 64, height: 64, borderRadius: 10, backgroundColor: liveColors.panelAlt },
  rowBody: { marginTop: 4, gap: 3, alignItems: 'flex-start' },
  rowCentered: { alignItems: 'center' },
  rowRight: { alignSelf: 'center' },
  tagRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 },
  tagText: { fontSize: 10, lineHeight: 13 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  strike: { textDecorationLine: 'line-through' },
  soldRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  empty: { paddingVertical: 36 },
});
