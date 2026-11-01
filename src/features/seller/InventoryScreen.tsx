/**
 * Envanter: Aktif | Taslak | Satıldı | Pasif sekmeleri, arama, sıralama, ⋯ satır menüsü,
 * toplu seçim (yayına ekle / pasife al / sil) ve "+" butonu.
 * Hak sahibi şikâyetiyle kaldırılan ilanlar dosya kapanana kadar kilitlidir: satıra dokununca
 * şikâyet dosyası (IpCaseSheet) açılır, aktif etme / yayına ekleme bu ilanları atlar.
 * `?tab=inactive` → ilgili sekmeyle aç; `?qa=ipcase` (geliştirme) → örnek şikâyet dosyası.
 */
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, FlatList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FORMAT_LABELS } from '@/components/cards/ProductCard';
import { Button, Chip, EmptyState, Header, Icon, IconButton, PressableScale, Screen, Sheet, Text, TextField, toast, UnderlineTabs } from '@/components/ui';
import { settleDemoObjections } from '@/features/trust/actions';
import { authenticityRequirement, scanText } from '@/features/trust/counterfeit';
import { IpCaseSheet } from '@/features/trust/IpCaseSheet';
import { isIpLocked, useTrustStore } from '@/features/trust/store';
import { formatShowTime } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { useSellerStore } from '@/store/seller';
import { brand, radius, SCREEN_PADDING, useTheme } from '@/theme';
import type { ID, Product } from '@/types';

import { assignListingsToShow, deleteListings, duplicateListing } from './actions';
import { listingTab, priceLabel, type InventoryTab } from './logic';
import { seedIpCaseQa, useQaParam } from './qaSeed';
import { useSellerExtras } from './store';
import { ActionSheet, StatusPill, Thumb, tint, type SheetAction } from './ui';

type SortKey = 'newest' | 'oldest' | 'price_desc' | 'price_asc' | 'stock' | 'az';

const SORT_LABELS: Record<SortKey, string> = {
  newest: 'En yeni',
  oldest: 'En eski',
  price_desc: 'Fiyat (yüksek → düşük)',
  price_asc: 'Fiyat (düşük → yüksek)',
  stock: 'Stok (çok → az)',
  az: 'A → Z',
};

const EMPTY: Record<InventoryTab, { emoji: string; title: string; message: string }> = {
  active: { emoji: '📦', title: 'Aktif ürünün yok', message: 'Ürün oluştur; mağazanda ve canlı yayınlarında satmaya başla.' },
  draft: { emoji: '📝', title: 'Taslak yok', message: 'Yarım bıraktığın ürünler burada saklanır.' },
  sold: { emoji: '🏷️', title: 'Henüz satılan ürün yok', message: 'Stoğu tükenen ürünlerin burada listelenir.' },
  inactive: { emoji: '💤', title: 'Pasif ürün yok', message: 'Pasife aldığın ürünler alıcılara görünmez.' },
};

const TABS: InventoryTab[] = ['active', 'draft', 'sold', 'inactive'];

/** Şikâyet dosyası açık ilan aktif edilmek ya da yayına eklenmek istenince */
const IP_LOCK_MESSAGE = 'Hak sahibi şikâyeti olan ilanlar itiraz sonuçlanmadan yeniden yayımlanamaz';

/** Taslaktan yayına: zorunlu alanlar + yasaklı ifade yok + gerekiyorsa orijinallik belgesi */
export function isPublishable(p: Product): boolean {
  const base = p.images.length > 0 && p.title.trim().length >= 3 && !!p.categoryId && !!p.subcategoryId && (p.format === 'giveaway' || p.price > 0);
  if (!base) return false;
  if (scanText([p.title, p.description ?? ''], p.categoryId).banned.length) return false;
  return !authenticityRequirement(p).required || !!p.authenticity;
}

function sortList(list: Product[], key: SortKey): Product[] {
  const out = [...list];
  switch (key) {
    case 'oldest':
      return out.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    case 'price_desc':
      return out.sort((a, b) => b.price - a.price);
    case 'price_asc':
      return out.sort((a, b) => a.price - b.price);
    case 'stock':
      return out.sort((a, b) => b.quantity - b.sold - (a.quantity - a.sold));
    case 'az':
      return out.sort((a, b) => a.title.localeCompare(b.title, 'tr'));
    default:
      return out.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
}

function Separator() {
  const { colors } = useTheme();
  return <View style={[styles.sep, { backgroundColor: colors.border }]} />;
}

/** Ürünleri bir yayına ekleme sayfası */
export function ShowPickerSheet({ visible, onClose, listingIds, currentShowId }: { visible: boolean; onClose: () => void; listingIds: ID[]; currentShowId?: string }) {
  const { colors } = useTheme();
  const shows = useSellerStore((s) => s.shows).filter((s) => s.status !== 'ended');
  const pick = (showId: string | undefined) => {
    assignListingsToShow(listingIds, showId);
    haptic.success();
    const show = shows.find((s) => s.id === showId);
    toast.success(show ? `${listingIds.length} ürün “${show.title}” yayınına eklendi` : 'Ürünler yayından çıkarıldı');
    onClose();
  };
  return (
    <Sheet visible={visible} onClose={onClose} title="Yayına ekle" subtitle={`${listingIds.length} ürün seçildi`} showClose>
      {shows.length ? (
        <View style={{ gap: 8 }}>
          {shows.map((s) => (
            <PressableScale key={s.id} scaleTo={0.98} onPress={() => pick(s.id)} style={[styles.showRow, { backgroundColor: s.id === currentShowId ? colors.surfaceAlt : colors.surface }]}>
              <Thumb uri={s.coverImage} size={40} height={64} />
              <View style={{ flex: 1 }}>
                <Text variant="subhead" weight="700" numberOfLines={2}>
                  {s.title}
                </Text>
                <Text variant="footnote" color="textSecondary">
                  {s.status === 'live' ? 'Şu an canlı' : formatShowTime(s.scheduledAt)} · {s.productIds.length} ürün
                </Text>
              </View>
              {s.id === currentShowId ? <Icon name="checkmark-circle" size={22} color={colors.success} /> : <Icon name="add-circle-outline" size={22} color="textSecondary" />}
            </PressableScale>
          ))}
          {currentShowId ? <Button title="Yayından çıkar" variant="ghost" onPress={() => pick(undefined)} /> : null}
        </View>
      ) : (
        <EmptyState
          icon="calendar-outline"
          title="Planlanmış yayının yok"
          message="Ürünlerini eklemek için önce bir yayın planla."
          actionLabel="Yayın Planla"
          onAction={() => {
            onClose();
            setTimeout(() => router.push('/seller/schedule'), 350);
          }}
        />
      )}
    </Sheet>
  );
}

export function InventoryScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const listings = useSellerStore((s) => s.listings);
  const shows = useSellerStore((s) => s.shows);
  const statusMap = useSellerExtras((s) => s.listingStatus);
  const setStatuses = useSellerExtras((s) => s.setListingStatuses);
  const vacation = useSellerExtras((s) => s.vacation);
  const cases = useTrustStore((s) => s.cases);
  const params = useLocalSearchParams<{ tab?: string }>();
  const qa = useQaParam();
  // ?qa=ipcase: kaldırılan ilan Pasif sekmesinde görünür
  const [tab, setTab] = useState<InventoryTab>(() => (qa === 'ipcase' ? 'inactive' : (TABS.find((t) => t === params.tab) ?? 'active')));
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortKey>('newest');
  const [sortOpen, setSortOpen] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<ID[]>([]);
  const [menuFor, setMenuFor] = useState<Product | null>(null);
  const [pickerIds, setPickerIds] = useState<ID[] | null>(null);
  const [caseFor, setCaseFor] = useState<ID | null>(null);
  const qaRan = useRef(false);

  // Demo: uygulama kapanıp açıldıysa süresi dolmuş itirazları sonuçlandır
  useEffect(() => {
    settleDemoObjections();
  }, []);

  // Yalnızca geliştirme: ?qa=ipcase → aktif bir ilanı örnek şikâyetle kaldır ve dosyasını aç
  useEffect(() => {
    if (qa !== 'ipcase' || qaRan.current) return;
    qaRan.current = true;
    const id = seedIpCaseQa();
    if (!id) {
      toast.warning('QA: kaldırılacak aktif ilan bulunamadı');
      return;
    }
    setTimeout(() => setCaseFor(id), 400);
  }, [qa]);

  const isLocked = (p: Product) => isIpLocked(cases[p.id]);
  const lockedCount = listings.filter(isLocked).length;
  const awaitingObjection = listings.some((p) => cases[p.id]?.status === 'removed');

  const counts: Record<InventoryTab, number> = { active: 0, draft: 0, sold: 0, inactive: 0 };
  listings.forEach((p) => {
    counts[listingTab(p, statusMap)] += 1;
  });
  const q = query.trim().toLocaleLowerCase('tr-TR');
  const list = sortList(
    listings.filter((p) => listingTab(p, statusMap) === tab && (!q || p.title.toLocaleLowerCase('tr-TR').includes(q))),
    sort,
  );
  const showTitle = (id?: string) => (id ? shows.find((s) => s.id === id) : undefined);

  const changeTab = (t: InventoryTab) => {
    setTab(t);
    setSelected([]);
  };
  const toggle = (id: ID) => {
    haptic.tap();
    setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  };
  const exitSelect = () => {
    setSelecting(false);
    setSelected([]);
  };

  const activate = (items: Product[]) => {
    const free = items.filter((p) => !isLocked(p));
    const ok = free.filter((p) => tab !== 'draft' || isPublishable(p));
    const skipped = free.length - ok.length;
    if (ok.length) setStatuses(ok.map((p) => p.id), 'active');
    if (free.length < items.length) {
      haptic.warning();
      toast.warning(ok.length ? `${ok.length} ürün ${tab === 'draft' ? 'yayınlandı' : 'aktif edildi'}. ${IP_LOCK_MESSAGE}` : IP_LOCK_MESSAGE, 'shield-outline');
      return;
    }
    haptic.success();
    if (skipped) toast.warning(`${ok.length} ürün yayınlandı, ${skipped} taslak yayın şartlarını karşılamıyor`);
    else toast.success(tab === 'draft' ? `${ok.length} ürün yayınlandı` : `${ok.length} ürün aktif edildi`);
  };
  /** Yayına ekle: şikâyetli ilanlar ve yayın şartlarını karşılamayan taslaklar (yasaklı ifade, eksik belge…) atlanır */
  const openShowPicker = (items: Product[]) => {
    const free = items.filter((p) => !isLocked(p));
    const ok = free.filter((p) => listingTab(p, statusMap) !== 'draft' || isPublishable(p));
    if (free.length < items.length) {
      haptic.warning();
      toast.warning(IP_LOCK_MESSAGE, 'shield-outline');
    } else if (ok.length < free.length) {
      haptic.warning();
      toast.warning(`${free.length - ok.length} taslak yayın şartlarını karşılamıyor`);
    }
    if (ok.length) setPickerIds(ok.map((p) => p.id));
  };
  const deactivate = (items: Product[]) => {
    setStatuses(
      items.map((p) => p.id),
      'inactive',
    );
    haptic.light();
    toast(`${items.length} ürün pasife alındı`, 'eye-off');
  };
  const confirmDelete = (items: Product[]) => {
    const deletable = items.filter((p) => p.sold === 0);
    if (!deletable.length) {
      toast.warning('Satılmış ürünler silinemez; pasife alabilirsin');
      return;
    }
    Alert.alert(
      deletable.length > 1 ? `${deletable.length} ürünü sil` : 'Ürünü sil',
      `${deletable.length > 1 ? 'Seçili ürünler' : `“${deletable[0].title || 'Başlıksız taslak'}”`} kalıcı olarak silinsin mi?${deletable.length < items.length ? ' Satılmış ürünler silinmez.' : ''}`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: () => {
            deleteListings(deletable.map((p) => p.id));
            setSelected([]);
            haptic.warning();
            toast(`${deletable.length} ürün silindi`, 'trash');
          },
        },
      ],
    );
  };

  const rowActions = (p: Product): SheetAction[] => {
    const t = listingTab(p, statusMap);
    const ipCase = cases[p.id];
    const locked = isIpLocked(ipCase);
    const actions: SheetAction[] = [];
    if (ipCase)
      actions.push({
        label: 'Şikâyet dosyası',
        icon: 'shield-outline',
        subtitle: ipCase.status === 'removed' ? 'Belgeyle itiraz et' : ipCase.status === 'objected' ? 'İtiraz inceleniyor' : 'İtirazın kabul edildi',
        onPress: () => setCaseFor(p.id),
      });
    actions.push({ label: 'Düzenle', icon: 'create-outline', onPress: () => router.push({ pathname: '/seller/listing', params: { id: p.id } }) });
    if (t === 'draft')
      actions.push({
        label: 'Yayınla',
        icon: 'rocket-outline',
        onPress: () => {
          if (isPublishable(p)) activate([p]);
          else {
            toast.warning('Yayınlamak için eksik bilgileri tamamla');
            router.push({ pathname: '/seller/listing', params: { id: p.id } });
          }
        },
      });
    actions.push({
      label: 'Kopyala',
      icon: 'copy-outline',
      // Kopya, şikâyetli ilanın kilidini aşmanın yolu olmasın
      disabled: locked,
      subtitle: locked ? 'Şikâyet sonuçlanana kadar kopyalanamaz' : 'Bilgileri yeni bir taslağa aktarır; stok sayısı ayrı tutulur',
      onPress: () => {
        duplicateListing(p);
        haptic.success();
        toast.success('Kopya taslaklara eklendi');
      },
    });
    if (t !== 'sold')
      actions.push({
        label: p.showId ? 'Yayını değiştir' : 'Yayına ekle',
        icon: 'videocam-outline',
        subtitle: locked ? 'Şikâyet sonuçlanana kadar yayına eklenemez' : undefined,
        onPress: () => openShowPicker([p]),
      });
    if (t === 'active') actions.push({ label: 'Pasife al', icon: 'eye-off-outline', subtitle: 'Alıcılara görünmez olur', onPress: () => deactivate([p]) });
    if (t === 'inactive') actions.push({ label: 'Aktif et', icon: 'eye-outline', subtitle: locked ? (ipCase?.status === 'objected' ? 'İtirazın kabul edilirse yeniden yayımlanır' : 'Önce belgeyle itiraz et; kabul edilirse yeniden yayımlanır') : undefined, onPress: () => activate([p]) });
    if (t === 'sold')
      actions.push({ label: 'Stok ekle', icon: 'add-circle-outline', subtitle: 'Adedi artırarak yeniden satışa çıkar', onPress: () => router.push({ pathname: '/seller/listing', params: { id: p.id } }) });
    actions.push({ label: 'Sil', icon: 'trash-outline', destructive: true, disabled: p.sold > 0, subtitle: p.sold > 0 ? 'Satılmış ürünler silinemez' : undefined, onPress: () => confirmDelete([p]) });
    return actions;
  };

  const selectedItems = listings.filter((p) => selected.includes(p.id));
  const allSelected = list.length > 0 && list.every((p) => selected.includes(p.id));

  return (
    <Screen>
      <Header
        title="Envanter"
        subtitle={`${listings.length} ürün`}
        right={
          listings.length ? (
            <Text variant="subhead" weight="700" color="accent" onPress={selecting ? exitSelect : () => setSelecting(true)} suppressHighlighting style={{ paddingHorizontal: 10 }}>
              {selecting ? 'Bitti' : 'Seç'}
            </Text>
          ) : null
        }
      />
      <View style={styles.tools}>
        <TextField icon="search" placeholder="Envanterde ara" value={query} onChangeText={setQuery} returnKeyType="search" autoCorrect={false} clearButtonMode="while-editing" />
      </View>
      <UnderlineTabs
        equal
        value={tab}
        onChange={changeTab}
        tabs={[
          { key: 'active', label: 'Aktif', count: counts.active },
          { key: 'draft', label: 'Taslak', count: counts.draft },
          { key: 'sold', label: 'Satıldı', count: counts.sold },
          { key: 'inactive', label: 'Pasif', count: counts.inactive },
        ]}
      />
      <View style={styles.subbar}>
        {selecting ? (
          <Text variant="subhead" weight="700" color="accent" onPress={() => setSelected(allSelected ? [] : list.map((p) => p.id))} suppressHighlighting>
            {allSelected ? 'Seçimi kaldır' : 'Tümünü seç'}
          </Text>
        ) : (
          <Text variant="footnote" color="textSecondary">
            {list.length} ürün
          </Text>
        )}
        <Chip label={SORT_LABELS[sort]} icon="swap-vertical" size="sm" onPress={() => setSortOpen(true)} />
      </View>
      {lockedCount > 0 && tab === 'active' ? (
        <PressableScale scaleTo={0.99} onPress={() => changeTab('inactive')} style={[styles.vacation, { backgroundColor: tint(colors.danger, 0.1) }]} accessibilityRole="button">
          <Icon name="shield-outline" size={16} color={colors.danger} />
          <Text variant="footnote" color="textSecondary" style={{ flex: 1 }}>
            {lockedCount} ilanın hak sahibi şikâyetiyle kaldırıldı. {awaitingObjection ? 'Pasif sekmesinden belgeyle itiraz edebilirsin.' : lockedCount > 1 ? 'İtirazların inceleniyor.' : 'İtirazın inceleniyor.'}
          </Text>
          <Icon name="chevron-forward" size={14} color="textTertiary" />
        </PressableScale>
      ) : null}
      {tab === 'inactive' && list.some(isLocked) ? (
        <View style={[styles.vacation, { backgroundColor: tint(colors.danger, 0.1) }]}>
          <Icon name="shield-outline" size={16} color={colors.danger} />
          <Text variant="footnote" color="textSecondary" style={{ flex: 1 }}>
            Şikâyetli ilanlar itiraz sonuçlanmadan yeniden yayımlanamaz. Dosyayı görmek ve itiraz etmek için ilana dokun.
          </Text>
        </View>
      ) : null}
      {vacation && tab === 'active' ? (
        <View style={[styles.vacation, { backgroundColor: tint(colors.info, 0.1) }]}>
          <Icon name="airplane" size={16} color={colors.info} />
          <Text variant="footnote" color="textSecondary" style={{ flex: 1 }}>
            Tatil modundasın: Hemen Al ürünlerin mağazanda gizli.
          </Text>
        </View>
      ) : null}
      <FlatList
        data={list}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ paddingBottom: insets.bottom + 110, flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        ItemSeparatorComponent={Separator}
        ListEmptyComponent={
          q ? (
            <EmptyState icon="search" title="Sonuç bulunamadı" message={`“${query}” ile eşleşen ürün yok.`} />
          ) : (
            <EmptyState
              emoji={EMPTY[tab].emoji}
              title={EMPTY[tab].title}
              message={EMPTY[tab].message}
              actionLabel={tab === 'active' || tab === 'draft' ? 'Ürün Oluştur' : undefined}
              onAction={() => router.push('/seller/listing')}
            />
          )
        }
        renderItem={({ item: p }) => {
          const on = selected.includes(p.id);
          const show = showTitle(p.showId);
          const left = Math.max(0, p.quantity - p.sold);
          const ipCase = cases[p.id];
          const locked = isIpLocked(ipCase);
          const objected = ipCase?.status === 'objected';
          return (
            <PressableScale
              scaleTo={0.99}
              onPress={() => (selecting ? toggle(p.id) : locked ? setCaseFor(p.id) : router.push({ pathname: '/seller/listing', params: { id: p.id } }))}
              onLongPress={() => {
                if (!selecting) {
                  haptic.medium();
                  setSelecting(true);
                  setSelected([p.id]);
                }
              }}
              style={[styles.row, on && { backgroundColor: colors.surface }]}>
              {selecting ? (
                <View style={[styles.box, { borderColor: on ? colors.text : colors.textTertiary, backgroundColor: on ? colors.text : 'transparent' }]}>
                  {on ? <Icon name="checkmark" size={14} color={colors.bg} /> : null}
                </View>
              ) : null}
              <Thumb uri={p.images[0]} size={64} />
              <View style={{ flex: 1, gap: 4 }}>
                <Text variant="subhead" weight="600" numberOfLines={2} color={p.title ? 'text' : 'textTertiary'}>
                  {p.title || 'Başlıksız taslak'}
                </Text>
                {locked ? <StatusPill label={objected ? 'İtiraz inceleniyor' : 'Hak sahibi şikâyeti'} tone={objected ? 'warning' : 'danger'} icon={objected ? 'hourglass-outline' : 'shield-outline'} /> : null}
                <View style={styles.inline}>
                  <StatusPill label={FORMAT_LABELS[p.format]} tone={p.format === 'auction' ? 'warning' : p.format === 'giveaway' ? 'info' : 'neutral'} />
                  <Text variant="footnote" weight="700" numberOfLines={1} style={{ flexShrink: 1 }}>
                    {priceLabel(p)}
                  </Text>
                </View>
                <Text variant="footnote" color="textSecondary" numberOfLines={1}>
                  {tab === 'sold' ? `${p.sold} adet satıldı` : `Stok ${left}/${p.quantity}${p.sold ? ` · ${p.sold} satıldı` : ''}`}
                  {show ? ` · 📅 ${show.status === 'live' ? 'Canlıda' : formatShowTime(show.scheduledAt)}` : ''}
                </Text>
              </View>
              {!selecting ? <IconButton name="ellipsis-horizontal" size={36} onPress={() => setMenuFor(p)} accessibilityLabel="Ürün seçenekleri" /> : null}
            </PressableScale>
          );
        }}
      />

      {selecting ? (
        <View style={[styles.bulk, { backgroundColor: colors.bg, borderTopColor: colors.border, paddingBottom: Math.max(insets.bottom, 12) }]}>
          <Text variant="subhead" weight="700">
            {selected.length} ürün seçildi
          </Text>
          <View style={styles.bulkBtns}>
            {tab !== 'sold' ? <Button title="Yayına ekle" size="sm" variant="secondary" disabled={!selected.length} onPress={() => openShowPicker(selectedItems)} style={{ flex: 1 }} /> : null}
            {tab === 'active' ? (
              <Button title="Pasife al" size="sm" variant="secondary" disabled={!selected.length} onPress={() => {
                  deactivate(selectedItems);
                  setSelected([]);
                }} style={{ flex: 1 }} />
            ) : tab === 'inactive' || tab === 'draft' ? (
              <Button title={tab === 'draft' ? 'Yayınla' : 'Aktif et'} size="sm" variant="secondary" disabled={!selected.length} onPress={() => {
                  activate(selectedItems);
                  setSelected([]);
                }} style={{ flex: 1 }} />
            ) : null}
            <Button title="Sil" size="sm" variant="danger" disabled={!selected.length} onPress={() => confirmDelete(selectedItems)} style={{ flex: 1 }} />
          </View>
        </View>
      ) : (
        <PressableScale
          scaleTo={0.9}
          onPress={() => {
            haptic.light();
            router.push('/seller/listing');
          }}
          style={[styles.fab, { backgroundColor: colors.primary, bottom: insets.bottom + 20 }]}
          accessibilityLabel="Ürün oluştur">
          <Icon name="add" size={30} color={colors.onPrimary} />
        </PressableScale>
      )}

      <ActionSheet visible={!!menuFor} onClose={() => setMenuFor(null)} title={menuFor?.title || 'Başlıksız taslak'} subtitle={menuFor ? priceLabel(menuFor) : undefined} actions={menuFor ? rowActions(menuFor) : []} />
      <ActionSheet
        visible={sortOpen}
        onClose={() => setSortOpen(false)}
        title="Sırala"
        actions={(Object.keys(SORT_LABELS) as SortKey[]).map((k) => ({ label: SORT_LABELS[k], icon: sort === k ? 'radio-button-on' : 'radio-button-off', onPress: () => setSort(k) }))}
      />
      <ShowPickerSheet
        visible={!!pickerIds}
        onClose={() => {
          setPickerIds(null);
          exitSelect();
        }}
        listingIds={pickerIds ?? []}
        currentShowId={pickerIds?.length === 1 ? listings.find((p) => p.id === pickerIds[0])?.showId : undefined}
      />
      <IpCaseSheet listingId={caseFor} onClose={() => setCaseFor(null)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  tools: { paddingHorizontal: SCREEN_PADDING, paddingBottom: 4 },
  subbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SCREEN_PADDING, paddingVertical: 10 },
  vacation: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: SCREEN_PADDING, marginBottom: 6, padding: 10, borderRadius: radius.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: SCREEN_PADDING, paddingVertical: 12 },
  sep: { height: StyleSheet.hairlineWidth, marginLeft: SCREEN_PADDING + 76 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  box: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  fab: { position: 'absolute', right: SCREEN_PADDING + 4, width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center', shadowColor: brand.ink, shadowOpacity: 0.2, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  bulk: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: SCREEN_PADDING, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, gap: 10 },
  bulkBtns: { flexDirection: 'row', gap: 8 },
  showRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: radius.md },
});
