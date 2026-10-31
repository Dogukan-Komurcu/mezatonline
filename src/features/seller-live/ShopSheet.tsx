/**
 * S24 (satıcı) — Yayın Mağazası: Açık Artırma | Hemen Al | Çekiliş | Satıldı.
 * Satır eylemleri: sabitle, açık artırmayı başlat, flaş indirim, çekiliş, düzenle.
 */
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import { CONDITION_LABELS } from '@/components/cards/ProductCard';
import { Button, EmptyState, Icon, IconButton, PressableScale, Sheet, Text, TextField, UnderlineTabs } from '@/components/ui';
import { FEATURES } from '@/config/demo';
import type { FlashSale, Giveaway, LiveLot, SoldItem } from '@/features/live/engine';
import { formatTRY, timeAgo } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { brand, liveColors, radius, useTheme } from '@/theme';
import type { Product } from '@/types';

import { formatTimer, useNow, VIA_LABELS } from './helpers';

export type ShopTab = 'auction' | 'buy_now' | 'giveaway' | 'sold';

export type ShopSheetProps = {
  visible: boolean;
  onClose: () => void;
  initialTab: ShopTab;
  products: Product[];
  remainingOf: (p: Product) => number;
  pinnedId?: string;
  lot?: LiveLot;
  flash?: FlashSale;
  giveaway?: Giveaway;
  sold: SoldItem[];
  /** Düzenlenebilir mi (kendi ilanı, demo değil) */
  canEdit: (p: Product) => boolean;
  rehearsal: boolean;
  onStartAuction: (p: Product) => void;
  onPin: (p: Product) => void;
  onFlash: (p: Product) => void;
  onGiveaway: (p?: Product) => void;
  onAddProduct: () => void;
  onEdit: (p: Product) => void;
  /** Mağaza boşken örnek ilanları içe aktar */
  onImportSamples?: () => void;
};

function norm(s: string) {
  return s.toLocaleLowerCase('tr-TR');
}

export function ShopSheet(props: ShopSheetProps) {
  const { visible, onClose, initialTab, products, remainingOf, sold, lot, flash, giveaway } = props;
  const { colors } = useTheme();
  const [rawTab, setTab] = useState<ShopTab>(initialTab);
  // Çekiliş kapalıysa (FEATURES.giveaways) sekmesi gösterilmez
  const tab: ShopTab = rawTab === 'giveaway' && !FEATURES.giveaways ? 'auction' : rawTab;
  const [query, setQuery] = useState('');
  const lotRunning = lot?.status === 'running';
  const flashRunning = flash?.status === 'running';
  const giveawayRunning = giveaway?.status === 'running';
  const now = useNow(1000, visible && (giveawayRunning || lotRunning || flashRunning));

  useEffect(() => {
    if (visible) setTab(initialTab);
  }, [visible, initialTab]);

  const q = norm(query.trim());
  const match = (p: Product) => !q || norm(p.title).includes(q);
  const auctions = products.filter((p) => p.format === 'auction' && remainingOf(p) > 0 && match(p));
  const bins = products.filter((p) => p.format === 'buy_now' && match(p));
  const giveaways = products.filter((p) => p.format === 'giveaway' && remainingOf(p) > 0 && match(p));
  const soldList = sold.filter((s) => match(s.product));
  const binAvailable = products.filter((p) => p.format === 'buy_now' && remainingOf(p) > 0).length;

  const tabs = [
    { key: 'auction' as const, label: 'Açık Artırma', count: products.filter((p) => p.format === 'auction' && remainingOf(p) > 0).length },
    { key: 'buy_now' as const, label: 'Hemen Al', count: binAvailable },
    ...(FEATURES.giveaways ? [{ key: 'giveaway' as const, label: 'Çekiliş' }] : []),
    { key: 'sold' as const, label: 'Satıldı', count: sold.length },
  ];

  const empty = products.length === 0;

  const renderProduct = ({ item }: { item: Product }) => (
    <ProductRow
      product={item}
      remaining={remainingOf(item)}
      pinned={props.pinnedId === item.id}
      live={(lot?.status === 'running' && lot.product.id === item.id) || (flash?.status === 'running' && flash.product.id === item.id)}
      canEdit={props.canEdit(item)}
      onEdit={() => props.onEdit(item)}
      onPin={() => props.onPin(item)}
      onStartAuction={() => props.onStartAuction(item)}
      onFlash={() => props.onFlash(item)}
      onGiveaway={() => props.onGiveaway(item)}
      auctionLocked={lotRunning}
      pinLocked={lotRunning || flashRunning}
      flashLocked={lotRunning || flashRunning}
      giveawayLocked={giveawayRunning}
    />
  );

  let body;
  if (empty && tab !== 'sold') {
    body = (
      <EmptyState
        icon="storefront-outline"
        title="Mağazan boş"
        message={
          props.rehearsal
            ? 'Provada demo ürünler bulunamadı. Bir ilan ekleyip pratiğe devam edebilirsin.'
            : 'Yayında satmak için ilan ekle. İzleyiciler eklediğin ürünleri hemen görür.'
        }
        actionLabel="Ürün ekle"
        onAction={props.onAddProduct}
      />
    );
  } else if (tab === 'auction') {
    body = (
      <FlatList
        data={auctions}
        keyExtractor={(p) => p.id}
        renderItem={renderProduct}
        ItemSeparatorComponent={Separator}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            icon="hammer-outline"
            title={q ? 'Sonuç yok' : 'Açık artırma ürünü yok'}
            message={q ? 'Aramanı değiştirip tekrar dene.' : 'Açık artırma formatında bir ilan ekleyerek mezata çıkar.'}
          />
        }
      />
    );
  } else if (tab === 'buy_now') {
    body = (
      <FlatList
        data={bins}
        keyExtractor={(p) => p.id}
        renderItem={renderProduct}
        ItemSeparatorComponent={Separator}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            icon="bag-handle-outline"
            title={q ? 'Sonuç yok' : 'Hemen Al ürünü yok'}
            message={q ? 'Aramanı değiştirip tekrar dene.' : 'Sabit fiyatlı ürünler izleyicilerin her an satın alabileceği ürünlerdir.'}
          />
        }
      />
    );
  } else if (tab === 'giveaway') {
    body = (
      <FlatList
        data={giveaways}
        keyExtractor={(p) => p.id}
        renderItem={renderProduct}
        ItemSeparatorComponent={Separator}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={[styles.giveawayHero, { backgroundColor: colors.surface, borderColor: giveaway?.status === 'running' ? colors.primary : colors.border }]}>
            <View style={[styles.giftCircle, { backgroundColor: colors.copper }]}>
              <Icon name="gift-outline" size={22} color={brand.white} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="headline">{giveaway?.status === 'running' ? 'Çekiliş devam ediyor' : 'Çekiliş başlat'}</Text>
              <Text variant="footnote" color="textSecondary" numberOfLines={2}>
                {giveaway?.status === 'running'
                  ? `${giveaway.product.title} · ${formatTimer((giveaway.endsAt - now) / 1000)} kaldı · ${giveaway.entrants} katılımcı`
                  : 'En fazla 5 dakika · herkese açık ya da takipçilere özel'}
              </Text>
            </View>
            {giveaway?.status === 'running' ? null : <Button title="Başlat" size="sm" onPress={() => props.onGiveaway(undefined)} />}
          </View>
        }
        ListEmptyComponent={
          <Text variant="footnote" color="textSecondary" align="center" style={{ paddingVertical: 24, paddingHorizontal: 12 }}>
            Çekiliş formatında ilanın yok. Başlat'a dokunup "Sürpriz hediye" ya da mağazandaki bir ürünü ödül olarak seçebilirsin.
          </Text>
        }
      />
    );
  } else {
    body = (
      <FlatList
        data={soldList}
        keyExtractor={(s) => s.id}
        ItemSeparatorComponent={Separator}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => <SoldRow item={item} />}
        ListEmptyComponent={<EmptyState icon="pricetags-outline" title="Henüz satış yok" message="Bu yayında sattığın ürünler kazananlarıyla birlikte burada listelenir." />}
      />
    );
  }

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      dark
      height={0.86}
      scroll={false}
      title="Mağaza"
      subtitle={`${products.length} ürün · ${sold.length} satış`}
      contentStyle={{ paddingHorizontal: 0 }}
      headerRight={<IconButton name="add" variant="primary" size={34} onPress={props.onAddProduct} accessibilityLabel="Ürün ekle" />}>
      <View style={styles.flex}>
        <UnderlineTabs tabs={tabs} value={tab} onChange={setTab} dark />
        {lotRunning && lot ? (
          <View style={[styles.busy, { backgroundColor: colors.surface, borderColor: colors.live }]}>
            <Icon name="hammer" size={16} color={colors.live} />
            <Text variant="footnote" weight="600" style={{ flex: 1 }} numberOfLines={2}>
              Açık artırma sürüyor · {formatTimer((lot.endsAt - now) / 1000)} — bitince yeni ürün sabitleyebilir ya da başlatabilirsin.
            </Text>
          </View>
        ) : flashRunning && flash ? (
          <View style={[styles.busy, { backgroundColor: colors.surface, borderColor: colors.primary }]}>
            <Icon name="flash" size={16} color={colors.primary} />
            <Text variant="footnote" weight="600" style={{ flex: 1 }} numberOfLines={2}>
              Flaş indirim sürüyor · {formatTimer((flash.endsAt - now) / 1000)} — bitince yeni ürün sabitleyebilirsin.
            </Text>
          </View>
        ) : null}
        {!empty || tab === 'sold' ? (
          <View style={styles.search}>
            <TextField icon="search" placeholder="Mağazada ara" value={query} onChangeText={setQuery} returnKeyType="search" autoCorrect={false} clearButtonMode="while-editing" />
          </View>
        ) : null}
        <View style={styles.list}>{body}</View>
        {empty && props.onImportSamples && tab !== 'sold' ? (
          <View style={styles.importBox}>
            <Button title="Örnek ilanlarla başla" icon="sparkles-outline" variant="glass" fullWidth onPress={props.onImportSamples} />
            <Text variant="caption" color="textSecondary" align="center">
              Kategorine uygun 6 örnek ilan envanterine eklenir; sonra düzenleyebilirsin.
            </Text>
          </View>
        ) : null}
      </View>
    </Sheet>
  );
}

function Separator() {
  const { colors } = useTheme();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: 68 }} />;
}

function ProductRow({
  product,
  remaining,
  pinned,
  live,
  canEdit,
  onEdit,
  onPin,
  onStartAuction,
  onFlash,
  onGiveaway,
  auctionLocked,
  pinLocked,
  flashLocked,
  giveawayLocked,
}: {
  product: Product;
  remaining: number;
  pinned: boolean;
  live: boolean;
  canEdit: boolean;
  onEdit: () => void;
  onPin: () => void;
  onStartAuction: () => void;
  onFlash: () => void;
  onGiveaway: () => void;
  auctionLocked: boolean;
  pinLocked: boolean;
  flashLocked: boolean;
  giveawayLocked: boolean;
}) {
  const { colors } = useTheme();
  const soldOut = remaining <= 0;
  const meta =
    product.format === 'auction'
      ? `Açılış ${formatTRY(product.price)}`
      : product.format === 'buy_now'
        ? `${formatTRY(product.price)}${product.compareAtPrice && product.compareAtPrice > product.price ? ' · indirimli' : ''}`
        : 'Çekiliş ödülü';
  return (
    <View style={[styles.row, soldOut && { opacity: 0.55 }]}>
      <PressableScale
        disabled={!canEdit}
        onPress={() => {
          haptic.tap();
          onEdit();
        }}
        accessibilityLabel={canEdit ? `${product.title} — düzenle` : product.title}
        style={styles.rowMain}>
        <View>
          <Image
            source={{ uri: product.images[0] }}
            style={[styles.thumb, { backgroundColor: colors.skeleton }]}
            contentFit="cover"
            cachePolicy="memory-disk"
            recyclingKey={product.id}
          />
          {pinned ? (
            <View style={[styles.pinBadge, { backgroundColor: colors.primary }]}>
              <Icon name="pin" size={11} color={colors.onPrimary} />
            </View>
          ) : null}
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="callout" weight="700" numberOfLines={2}>
            {product.title}
          </Text>
          <Text variant="footnote" color="textSecondary" numberOfLines={1}>
            {soldOut ? 'Tükendi' : `${remaining} adet`} · {CONDITION_LABELS[product.condition]}
          </Text>
          <Text variant="footnote" weight="700" numberOfLines={1}>
            {meta}
            {canEdit ? (
              <Text variant="footnote" color="textTertiary">
                {'  '}✎ Düzenle
              </Text>
            ) : null}
          </Text>
        </View>
      </PressableScale>
      <View style={styles.rowActions}>
        {live ? (
          <View style={[styles.liveTag, { backgroundColor: colors.live }]}>
            <Text variant="caption" color={liveColors.text}>
              CANLIDA
            </Text>
          </View>
        ) : soldOut ? null : product.format === 'auction' ? (
          <>
            <IconButton
              name={pinned ? 'pin' : 'pin-outline'}
              size={34}
              variant="surface"
              color={pinned ? colors.primary : colors.text}
              onPress={onPin}
              disabled={pinLocked && !pinned}
              style={pinLocked && !pinned ? styles.locked : undefined}
              accessibilityLabel={pinned ? 'Sabitlemeyi kaldır' : 'Sabitle'}
            />
            <Button title="Başlat" size="sm" onPress={onStartAuction} disabled={auctionLocked} />
          </>
        ) : product.format === 'buy_now' ? (
          <>
            <IconButton
              name="flash"
              size={34}
              variant="surface"
              color={colors.primary}
              onPress={onFlash}
              disabled={flashLocked}
              style={flashLocked ? styles.locked : undefined}
              accessibilityLabel="Flaş indirim"
            />
            <Button title={pinned ? 'Sabitlendi' : 'Sabitle'} size="sm" variant={pinned ? 'primary' : 'glass'} onPress={onPin} disabled={pinLocked && !pinned} />
          </>
        ) : (
          <Button title="Çekiliş yap" size="sm" icon="gift-outline" onPress={onGiveaway} disabled={giveawayLocked} />
        )}
      </View>
    </View>
  );
}

function SoldRow({ item }: { item: SoldItem }) {
  const { colors } = useTheme();
  return (
    <View style={styles.row}>
      <View style={styles.rowMain}>
        <Image
          source={{ uri: item.product.images[0] }}
          style={[styles.thumb, { backgroundColor: colors.skeleton }]}
          contentFit="cover"
          cachePolicy="memory-disk"
          recyclingKey={item.id}
        />
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="callout" weight="700" numberOfLines={2}>
            {item.product.title}
          </Text>
          <Text variant="footnote" color="textSecondary" numberOfLines={1}>
            @{item.winner.username} · {VIA_LABELS[item.via]} · {timeAgo(item.at)}
          </Text>
        </View>
      </View>
      <Text variant="headline" color={item.via === 'giveaway' ? 'textSecondary' : 'success'} tabular>
        {item.via === 'giveaway' ? 'Hediye' : formatTRY(item.price)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  search: { paddingHorizontal: 16, paddingTop: 12 },
  list: { flex: 1, paddingHorizontal: 16, paddingTop: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  thumb: { width: 56, height: 56, borderRadius: radius.sm },
  pinBadge: { position: 'absolute', top: -4, left: -4, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  liveTag: { borderRadius: 4, paddingHorizontal: 7, paddingVertical: 3 },
  giveawayHero: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: radius.lg, borderWidth: 1.5, marginTop: 8, marginBottom: 6 },
  giftCircle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  importBox: { paddingHorizontal: 16, paddingBottom: 8, gap: 8 },
  busy: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 16, marginTop: 12, padding: 10, borderRadius: radius.md, borderWidth: 1 },
  locked: { opacity: 0.4 },
});
