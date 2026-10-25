import { Image } from 'expo-image';
import { useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { Avatar, Button, EmptyState, Icon, PressableScale, Sheet, Text, UnderlineTabs } from '@/components/ui';
import { CONDITION_LABELS } from '@/components/cards/ProductCard';
import { formatTRY, timeAgo } from '@/lib/format';
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
};

const VIA_LABEL: Record<SoldItem['via'], string> = { auction: 'Açık artırma', buy_now: 'Hemen Al', giveaway: 'Çekiliş', flash_sale: 'Flaş indirim' };

/** S24: Yayın Mağazası — Açık Artırma · Hemen Al · Çekiliş · Satıldı */
export function ShopSheet({ visible, onClose, sellerName, state, onProductPress, onBuyNow, onPreBid, onEnterGiveaway }: ShopSheetProps) {
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
  const auctions = state.queue.filter(match);
  const bins = state.shop.filter(match);
  const sold = state.sold.filter((s) => match(s.product));
  const g = state.giveaway;

  const tabs = [
    { key: 'auction' as const, label: 'Açık Artırma', count: state.queue.length },
    { key: 'buy_now' as const, label: 'Hemen Al', count: state.shop.length },
    ...(g ? [{ key: 'giveaway' as const, label: 'Çekiliş', count: 1 }] : []),
    { key: 'sold' as const, label: 'Satıldı', count: state.sold.length },
  ];
  const activeTab: TabKey = tab === 'giveaway' && !g ? 'auction' : tab;

  const renderAuction = (p: Product) => {
    const onStage = lot?.product.id === p.id && lot.status === 'running';
    const soldItem = state.sold.find((s) => s.via === 'auction' && s.product.id === p.id);
    const pre = state.myPreBids?.[p.id];
    return (
      <Row key={p.id} product={p} onPress={() => onProductPress(p)}>
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
        {!onStage && !soldItem && !soldAuctionIds.has(p.id) ? (
          <Button title={pre ? 'Artır' : 'Ön teklif'} size="sm" variant={pre ? 'secondary' : 'outline'} onPress={() => onPreBid(p)} style={styles.rowButton} />
        ) : null}
      </Row>
    );
  };

  const renderBin = (p: Product) => {
    const stock = p.quantity - p.sold;
    const flash = state.flash && state.flash.status === 'running' && state.flash.product.id === p.id ? state.flash : undefined;
    const onStage = lot?.product.id === p.id && lot.status === 'running';
    return (
      <Row key={p.id} product={p} onPress={() => onProductPress(p)}>
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
        <Text variant="caption" weight="600" color={stock > 0 ? (stock <= 2 ? liveColors.primary : 'textSecondary') : liveColors.live}>
          {onStage ? 'Şu an mezatta' : stock > 0 ? `Stokta ${stock} adet` : 'Tükendi'}
        </Text>
        {stock > 0 && !onStage ? <Button title="Hemen Al" size="sm" onPress={() => onBuyNow(p)} style={styles.rowButton} /> : null}
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
      <UnderlineTabs tabs={tabs} value={activeTab} onChange={setTab} dark style={styles.tabs} />
      {activeTab === 'auction' ? (auctions.length ? auctions.map(renderAuction) : empty('Açık artırma yok', 'Bu yayında henüz sırada ürün yok.')) : null}
      {activeTab === 'buy_now' ? (bins.length ? bins.map(renderBin) : empty('Hemen Al ürünü yok', 'Satıcı bu yayında Hemen Al ürünü eklemedi.')) : null}
      {activeTab === 'giveaway' && g ? (
        <Row product={g.product} onPress={() => undefined}>
          <Text variant="subhead" weight="800" color={liveColors.primary}>
            🎁 Ücretsiz · {g.entrants} katılımcı
          </Text>
          <Text variant="caption" color="textSecondary">
            {g.status === 'done' ? (g.winner?.isMe ? 'Kazanan: Sen 🎉' : `Kazanan: @${g.winner?.username ?? ''}`) : g.requiresFollow ? 'Takipçilere özel' : 'Herkes katılabilir'}
          </Text>
          {g.status === 'running' ? (
            <Button title={g.entered ? 'Katıldın ✓' : 'Çekilişe katıl'} size="sm" disabled={g.entered} onPress={onEnterGiveaway} style={styles.rowButton} />
          ) : null}
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
                <Text variant="subhead" weight="800" color={s.price > 0 ? 'text' : liveColors.primary}>
                  {s.price > 0 ? formatTRY(s.price) : 'Ücretsiz'}
                </Text>
              </View>
            ))
          : empty('Henüz satış yok', 'Satılan ürünler burada listelenir.')
        : null}
    </Sheet>
  );
}

function Row({ product, onPress, children }: { product: Product; onPress: () => void; children: ReactNode }) {
  return (
    <PressableScale scaleTo={0.99} onPress={onPress} style={styles.row}>
      <Image source={{ uri: product.images[0] }} style={styles.thumb} contentFit="cover" cachePolicy="memory-disk" recyclingKey={product.id} />
      <View style={styles.flex}>
        <Text variant="subhead" weight="600" numberOfLines={2}>
          {product.title.replace(/^🎁\s*/, '')}
        </Text>
        <Text variant="caption" color="textSecondary" numberOfLines={1}>
          {product.grade ?? CONDITION_LABELS[product.condition]} · Kargo {formatTRY(product.shippingCost)}
        </Text>
        <View style={styles.rowBody}>{children}</View>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, paddingHorizontal: 12, height: 42 },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 8 },
  tabs: { marginTop: 6, marginHorizontal: -16, marginBottom: 4 },
  row: { flexDirection: 'row', gap: 12, paddingVertical: 10, alignItems: 'flex-start' },
  thumb: { width: 64, height: 64, borderRadius: 10, backgroundColor: liveColors.panelAlt },
  rowBody: { marginTop: 4, gap: 3, alignItems: 'flex-start' },
  rowButton: { marginTop: 4 },
  tagRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 },
  tagText: { fontSize: 10, lineHeight: 13 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  strike: { textDecorationLine: 'line-through' },
  soldRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  empty: { paddingVertical: 36 },
});
