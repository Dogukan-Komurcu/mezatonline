/**
 * Satıcı konsolu araç sheet'leri: İzleyiciler & istatistik (S31 host), Diğer (S88), Mesaj sabitle,
 * Moderatörler, Baskın (Raid), Tanıt (Promote), Yayın notları, kullanıcı eylemleri, Yayını bitir.
 */
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import { Avatar, Button, Chip, Divider, EmptyState, Icon, IconButton, ListRow, PressableScale, Sheet, Text, TextField, UnderlineTabs, toast } from '@/components/ui';
import { FEATURES } from '@/config/demo';
import { getLiveShows, getUser } from '@/data';
import type { LiveViewer } from '@/features/live/engine';
import { formatCompact, formatTRY, timeAgo } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { random } from '@/lib/rng';
import { radius, useTheme } from '@/theme';
import type { ChatMessage, Show, User } from '@/types';

import { FieldLabel, InfoBox, OptionChips, StatTile } from './controls';
import { formatDurationLong, formatElapsed, formatTimer } from './helpers';

// ─── İzleyiciler & istatistik ────────────────────────────────────────────────

export type LiveStats = {
  gross: number;
  orders: number;
  elapsedSec: number;
  shares: number;
  viewers: number;
  peak: number;
  tips: number;
  newFollowers: number;
  likes: number;
};

type ViewerSort = 'all' | 'mods' | 'buyers';
type ActivityFilter = 'all' | 'auction' | 'giveaway' | 'tip' | 'follow';

export function ViewersSheet({
  visible,
  onClose,
  stats,
  viewers,
  mods,
  buyers,
  activity,
  onMention,
  onUser,
}: {
  visible: boolean;
  onClose: () => void;
  stats: LiveStats;
  viewers: LiveViewer[];
  mods: string[];
  buyers: string[];
  activity: ChatMessage[];
  onMention: (username: string) => void;
  onUser: (u: { username: string; avatar?: string }) => void;
}) {
  const { colors } = useTheme();
  const [tab, setTab] = useState<'watching' | 'activity'>('watching');
  const [sort, setSort] = useState<ViewerSort>('all');
  const [filter, setFilter] = useState<ActivityFilter>('all');

  const isMod = (v: LiveViewer) => v.isMod || mods.includes(v.username);
  const list = viewers
    .filter((v) => (sort === 'mods' ? isMod(v) : sort === 'buyers' ? buyers.includes(v.username) : true))
    .sort((a, b) => Number(isMod(b)) - Number(isMod(a)) || Number(buyers.includes(b.username)) - Number(buyers.includes(a.username)));

  const feed = activity
    .filter((m) =>
      filter === 'all'
        ? true
        : filter === 'auction'
          ? m.type === 'won' || m.type === 'purchase'
          : filter === 'giveaway'
            ? m.type === 'giveaway_won' || m.type === 'giveaway_entry'
            : filter === 'tip'
              ? m.type === 'tip'
              : m.type === 'follow',
    )
    .slice()
    .reverse();

  const header = (
    <View style={{ gap: 10, paddingTop: 4 }}>
      <View style={styles.grid}>
        <StatTile label="Tahmini satış" value={formatTRY(stats.gross)} icon="cash-outline" accent={colors.success} />
        <StatTile label="Sipariş" value={String(stats.orders)} icon="receipt-outline" />
      </View>
      <View style={styles.grid}>
        <StatTile label="Yayın süresi" value={formatElapsed(stats.elapsedSec)} icon="time-outline" />
        <StatTile label="Paylaşım" value={formatCompact(stats.shares)} icon="share-social-outline" />
      </View>
      <View style={styles.miniRow}>
        <MiniStat label="Şu an" value={formatCompact(stats.viewers)} />
        <MiniStat label="Zirve" value={formatCompact(stats.peak)} />
        <MiniStat label="Yeni takipçi" value={`+${stats.newFollowers}`} />
        {FEATURES.tips ? <MiniStat label="Bahşiş" value={formatTRY(stats.tips)} /> : null}
      </View>
    </View>
  );

  return (
    <Sheet visible={visible} onClose={onClose} dark height={0.86} scroll={false} title="Yayın istatistikleri" showClose contentStyle={{ paddingHorizontal: 0 }}>
      <View style={{ flex: 1 }}>
        <View style={{ paddingHorizontal: 16 }}>{header}</View>
        <UnderlineTabs
          dark
          equal
          style={{ marginTop: 12 }}
          tabs={[
            { key: 'watching', label: 'İzleyenler', count: stats.viewers },
            { key: 'activity', label: 'Etkinlik', count: activity.length },
          ]}
          value={tab}
          onChange={setTab}
        />
        <View style={styles.chipRow}>
          {tab === 'watching'
            ? (
                [
                  ['all', 'Tümü'],
                  ['mods', 'Moderatörler'],
                  ['buyers', 'En çok alanlar'],
                ] as const
              ).map(([k, l]) => <Chip key={k} label={l} size="sm" selected={sort === k} onPress={() => setSort(k)} />)
            : (
                [
                  ['all', 'Tümü'],
                  ['auction', 'Satışlar'],
                  ['giveaway', 'Çekiliş'],
                  ['tip', 'Bahşiş'],
                  ['follow', 'Takip'],
                ] as const
              )
                .filter(([k]) => (k !== 'tip' || FEATURES.tips) && (k !== 'giveaway' || FEATURES.giveaways))
                .map(([k, l]) => <Chip key={k} label={l} size="sm" selected={filter === k} onPress={() => setFilter(k)} />)}
        </View>
        {tab === 'watching' ? (
          <FlatList
            data={list}
            keyExtractor={(v) => v.id}
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingHorizontal: 16 }}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={<EmptyState icon="people-outline" title="Liste boş" message="Bu filtreye uyan izleyici yok." />}
            renderItem={({ item }) => (
              <View style={styles.viewerRow}>
                <Avatar uri={item.avatar} name={item.username} size={36} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text variant="callout" weight="700" numberOfLines={1}>
                    {item.username}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    {isMod(item) ? <Tag label="Mod" /> : null}
                    {buyers.includes(item.username) ? <Tag label="Alıcı" tone="success" /> : null}
                    {!isMod(item) && !buyers.includes(item.username) ? (
                      <Text variant="caption" color="textTertiary">
                        İzliyor
                      </Text>
                    ) : null}
                  </View>
                </View>
                <IconButton name="at" variant="surface" size={34} onPress={() => onMention(item.username)} accessibilityLabel={`@${item.username} etiketle`} />
                <IconButton
                  name="ellipsis-horizontal"
                  variant="surface"
                  size={34}
                  onPress={() => onUser({ username: item.username, avatar: item.avatar })}
                  accessibilityLabel="Eylemler"
                />
              </View>
            )}
          />
        ) : (
          <FlatList
            data={feed}
            keyExtractor={(m) => m.id}
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingHorizontal: 16 }}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={ActivitySeparator}
            ListEmptyComponent={
              <EmptyState icon="pulse-outline" title="Henüz etkinlik yok" message={`Satışlar, ${FEATURES.tips ? 'bahşişler, ' : ''}yeni takipçiler${FEATURES.giveaways ? ' ve çekiliş kazananları' : ''} burada görünür.`} />
            }
            renderItem={({ item }) => <ActivityRow m={item} />}
          />
        )}
      </View>
    </Sheet>
  );
}

function ActivitySeparator() {
  return <Divider inset={48} />;
}

function MiniStat({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.mini, { backgroundColor: colors.surface }]}>
      <Text variant="subhead" weight="800" numberOfLines={1} adjustsFontSizeToFit tabular>
        {value}
      </Text>
      <Text variant="caption" color="textSecondary" numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function Tag({ label, tone }: { label: string; tone?: 'success' }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.tag, { backgroundColor: tone === 'success' ? colors.success : colors.surfaceAlt }]}>
      <Text variant="caption" color={tone === 'success' ? colors.onPrimary : colors.text}>
        {label}
      </Text>
    </View>
  );
}

function ActivityRow({ m }: { m: ChatMessage }) {
  const { colors } = useTheme();
  const amount = m.amount !== undefined ? formatTRY(m.amount) : undefined;
  const map: Record<string, { verb: string; tint: string }> = {
    won: { verb: 'açık artırmayı kazandı', tint: colors.primary },
    purchase: { verb: 'satın aldı', tint: colors.success },
    tip: { verb: 'bahşiş gönderdi!', tint: colors.success },
    follow: { verb: 'seni takip etti', tint: colors.text },
    giveaway_won: { verb: 'çekilişi kazandı 🎉', tint: colors.primary },
    giveaway_entry: { verb: 'çekilişe katıldı', tint: colors.textSecondary },
  };
  const meta = map[m.type] ?? { verb: m.text, tint: colors.text };
  const detail =
    m.type === 'won' || m.type === 'purchase'
      ? m.text.replace(/^(kazandı|satın aldı):\s*/, '')
      : m.type === 'giveaway_won'
        ? m.text.replace(/^çekilişi kazandı!\s*/, '')
        : undefined;
  return (
    <View style={styles.activityRow}>
      <Avatar uri={m.avatar} name={m.username} size={36} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="callout" numberOfLines={2}>
          <Text variant="callout" weight="700">
            {m.username}
          </Text>{' '}
          <Text variant="callout" weight="700" color={meta.tint}>
            {m.type === 'tip' && amount ? `${amount} ` : ''}
            {meta.verb}
          </Text>
        </Text>
        <Text variant="footnote" color="textSecondary" numberOfLines={1}>
          {timeAgo(m.createdAt)}
          {detail ? ` · ${detail}` : ''}
        </Text>
      </View>
      {amount && m.type !== 'tip' ? (
        <Text variant="headline" color="success" tabular>
          {amount}
        </Text>
      ) : null}
    </View>
  );
}

// ─── Diğer (⋯) ───────────────────────────────────────────────────────────────

export function MoreSheet({
  visible,
  onClose,
  rehearsal,
  verifiedOnly,
  onVerifiedOnly,
  slowMode,
  onSlowMode,
  zoomLabel,
  onZoom,
  modCount,
  onPinMessage,
  onMods,
  onRaid,
  onShare,
  onEdit,
  onEnd,
}: {
  visible: boolean;
  onClose: () => void;
  rehearsal: boolean;
  verifiedOnly: boolean;
  onVerifiedOnly: (v: boolean) => void;
  slowMode: boolean;
  onSlowMode: (v: boolean) => void;
  zoomLabel: string;
  onZoom: () => void;
  modCount: number;
  onPinMessage: () => void;
  onMods: () => void;
  onRaid: () => void;
  onShare: () => void;
  onEdit?: () => void;
  onEnd: () => void;
}) {
  return (
    <Sheet visible={visible} onClose={onClose} dark title="Satıcı araçları" contentStyle={{ paddingHorizontal: 0 }}>
      <ListRow icon="pin-outline" title="Mesaj sabitle" subtitle="Sohbetin üstünde duyuru göster (/duyuru)" onPress={onPinMessage} />
      <ListRow icon="people-outline" title="Moderatör ekle" subtitle={modCount ? `${modCount} moderatör` : 'Sohbeti birlikte yönetin'} onPress={onMods} />
      <ListRow icon="scan-outline" title="Kamera yakınlaştır" value={zoomLabel} onPress={onZoom} chevron={false} />
      <ListRow
        icon="shield-checkmark-outline"
        title="Doğrulanmış alıcılar"
        subtitle="Yalnızca doğrulanmış alıcılar teklif verebilir"
        switchValue={verifiedOnly}
        onSwitch={onVerifiedOnly}
      />
      <ListRow icon="hourglass-outline" title="Yavaş mod" subtitle="İzleyiciler 5 saniyede bir mesaj yazabilir" switchValue={slowMode} onSwitch={onSlowMode} />
      <ListRow icon="share-social-outline" title="Yayını paylaş" onPress={onShare} />
      {onEdit ? <ListRow icon="create-outline" title="Yayın bilgilerini düzenle" onPress={onEdit} /> : null}
      <ListRow
        icon="rocket-outline"
        title="Yayını devret"
        subtitle={rehearsal ? 'Provada yayın devredilemez' : 'Yayını bitirirken izleyicilerini başka bir canlı yayına yönlendir'}
        onPress={onRaid}
        disabled={rehearsal}
      />
      <Divider style={{ marginVertical: 6 }} />
      <ListRow icon="stop-circle-outline" title={rehearsal ? 'Provayı bitir' : 'Yayını bitir'} destructive onPress={onEnd} chevron={false} />
    </Sheet>
  );
}

// ─── Mesaj sabitle ───────────────────────────────────────────────────────────

const PIN_PRESETS = [
  'Kargo 24 saat içinde çıkar 📦',
  ...(FEATURES.giveaways ? ['Her 50 izleyicide çekiliş! 🎁 Takip etmeyi unutma'] : []),
  'Tüm kartlar orijinal ve kılıflı gönderilir ✅',
  'Aynı yayındaki alımlarda kargo tek sefer ödenir 🚚',
  'Sorularınızı yazın, hepsini cevaplıyorum 💬',
];

export function PinMessageSheet({ visible, onClose, current, onPin }: { visible: boolean; onClose: () => void; current?: string; onPin: (text: string) => void }) {
  const [text, setText] = useState('');
  useEffect(() => {
    if (visible) setText('');
  }, [visible]);
  const valid = text.trim().length >= 2;
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      dark
      title="Mesaj sabitle"
      showClose
      footer={<Button title="Sabitle" icon="pin" size="lg" fullWidth disabled={!valid} onPress={() => onPin(text.trim())} />}>
      {current ? <InfoBox icon="pin">Şu an sabitli: {current.replace(/^📌\s*/, '')}</InfoBox> : null}
      <FieldLabel title="Duyuru" hint="Tüm izleyiciler sohbetin en üstünde görür. Yenisi eskisinin yerini alır." />
      <TextField placeholder="ör. Çekiliş 100 izleyicide başlıyor! 🎉" value={text} onChangeText={setText} maxLength={120} multiline autoFocus />
      <Text variant="caption" color="textTertiary" align="right" style={{ marginTop: 4 }}>
        {text.length}/120
      </Text>
      <FieldLabel title="Hazır mesajlar" />
      <View style={{ gap: 8 }}>
        {PIN_PRESETS.map((p) => (
          <Chip key={p} label={p} onPress={() => setText(p)} selected={text === p} style={{ alignSelf: 'flex-start' }} />
        ))}
      </View>
    </Sheet>
  );
}

// ─── Moderatörler ────────────────────────────────────────────────────────────

export function ModeratorsSheet({
  visible,
  onClose,
  mods,
  suggestions,
  onAdd,
  onRemove,
}: {
  visible: boolean;
  onClose: () => void;
  mods: string[];
  suggestions: { username: string; avatar?: string }[];
  onAdd: (username: string) => void;
  onRemove: (username: string) => void;
}) {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | undefined>();
  const clean = name.trim().replace(/^@/, '').toLocaleLowerCase('tr-TR');
  const add = () => {
    if (clean.length < 3) {
      setError('Kullanıcı adı en az 3 karakter olmalı');
      return;
    }
    if (mods.includes(clean)) {
      setError('Bu kullanıcı zaten moderatör');
      return;
    }
    onAdd(clean);
    setName('');
    setError(undefined);
  };
  const sugg = suggestions.filter((s) => !mods.includes(s.username)).slice(0, 8);
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      dark
      title="Moderatörler"
      subtitle="Moderatörler izleyicileri yayından çıkarabilir ve gizlenen mesajları görebilir. Ürün sabitleyemez."
      showClose>
      <View style={styles.addRow}>
        <TextField
          containerStyle={{ flex: 1 }}
          icon="at"
          placeholder="kullanıcı adı"
          value={name}
          onChangeText={(t) => {
            setName(t);
            setError(undefined);
          }}
          error={error}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="done"
          onSubmitEditing={add}
        />
        <Button title="Ekle" onPress={add} disabled={clean.length < 3} style={{ minHeight: 50 }} />
      </View>
      <FieldLabel title={`Moderatörler (${mods.length})`} />
      {mods.length === 0 ? (
        <Text variant="footnote" color="textSecondary">
          Henüz moderatör eklemedin.
        </Text>
      ) : (
        mods.map((m) => (
          <View key={m} style={styles.modRow}>
            <Avatar name={m} size={34} />
            <Text variant="callout" weight="700" style={{ flex: 1 }} numberOfLines={1}>
              {m}
            </Text>
            <Button title="Çıkar" size="sm" variant="glass" onPress={() => onRemove(m)} />
          </View>
        ))
      )}
      {sugg.length ? (
        <>
          <FieldLabel title="Sohbette aktif olanlar" />
          {sugg.map((s) => (
            <View key={s.username} style={styles.modRow}>
              <Avatar uri={s.avatar} name={s.username} size={34} />
              <Text variant="callout" weight="600" style={{ flex: 1 }} numberOfLines={1}>
                {s.username}
              </Text>
              <Button title="Moderatör yap" size="sm" variant="glass" icon="shield-outline" onPress={() => onAdd(s.username)} />
            </View>
          ))}
        </>
      ) : null}
    </Sheet>
  );
}

// ─── Baskın (Raid) ───────────────────────────────────────────────────────────

export type RaidTarget = { show: Show; seller: User };

export function RaidSheet({
  visible,
  onClose,
  viewers,
  currentShowId,
  initialQuery,
  onRaid,
}: {
  visible: boolean;
  onClose: () => void;
  viewers: number;
  currentShowId: string;
  initialQuery?: string;
  onRaid: (t: RaidTarget) => void;
}) {
  const { colors } = useTheme();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string | undefined>();
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (visible) {
      setQuery(initialQuery ?? '');
      setSelected(undefined);
      setConfirming(false);
    }
  }, [visible, initialQuery]);

  const all: RaidTarget[] = getLiveShows()
    .filter((s) => s.id !== currentShowId)
    .map((show) => ({ show, seller: getUser(show.sellerId) }))
    .filter((t): t is RaidTarget => !!t.seller);
  const q = query.trim().replace(/^@/, '').toLocaleLowerCase('tr-TR');
  const list = (q ? all.filter((t) => t.seller.username.toLocaleLowerCase('tr-TR').includes(q) || t.show.title.toLocaleLowerCase('tr-TR').includes(q)) : all).slice(0, 20);
  const target = all.find((t) => t.show.id === selected);

  if (confirming && target) {
    return (
      <Sheet
        visible={visible}
        onClose={onClose}
        dark
        title="Devri başlat"
        footer={
          <View style={{ gap: 10 }}>
            <Button title="Devam et" icon="rocket" size="lg" fullWidth onPress={() => onRaid(target)} />
            <Button title="Geri" variant="ghost" fullWidth onPress={() => setConfirming(false)} />
          </View>
        }>
        <View style={{ alignItems: 'center', gap: 10, paddingVertical: 12 }}>
          <Avatar uri={target.seller.avatar} name={target.seller.username} size={72} live />
          <Text variant="title3" align="center">
            @{target.seller.username}
          </Text>
          <Text variant="callout" color="textSecondary" align="center">
            Bu işlem yayınını bitirecek ve {formatCompact(viewers)} izleyiciyi @{target.seller.username} adlı satıcının yayınına gönderecek.
          </Text>
        </View>
      </Sheet>
    );
  }

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      dark
      height={0.8}
      scroll={false}
      title="Yayını devret"
      subtitle="İzleyicilerini bir canlı yayına götür; yayının sona erer."
      showClose
      contentStyle={{ paddingHorizontal: 0 }}
      footer={
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Button
            title="Benim için seç"
            variant="glass"
            icon="shuffle"
            onPress={() => {
              const pick = all.length ? random.pick(all) : undefined;
              if (!pick) return;
              setSelected(pick.show.id);
              setConfirming(true);
            }}
            disabled={!all.length}
          />
          <Button title="Devret" icon="rocket-outline" style={{ flex: 1 }} disabled={!target} onPress={() => setConfirming(true)} />
        </View>
      }>
      <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
        <TextField icon="search" placeholder="Satıcı ara" value={query} onChangeText={setQuery} autoCapitalize="none" autoCorrect={false} />
      </View>
      <FlatList
        data={list}
        keyExtractor={(t) => t.show.id}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 12 }}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <Text variant="subhead" weight="700" color="textSecondary" style={{ marginVertical: 8 }}>
            Önerilen canlı yayınlar
          </Text>
        }
        ListEmptyComponent={<EmptyState icon="radio-outline" title="Canlı yayın bulunamadı" message="Aramanı değiştir ya da 'Benim için seç'i dene." />}
        renderItem={({ item }) => {
          const sel = item.show.id === selected;
          return (
            <PressableScale
              onPress={() => {
                haptic.tap();
                setSelected(item.show.id);
              }}
              style={[styles.raidRow, { backgroundColor: colors.surface, borderColor: sel ? colors.primary : 'transparent' }]}>
              <Image
                source={{ uri: item.show.coverImage }}
                style={[styles.raidThumb, { backgroundColor: colors.skeleton }]}
                contentFit="cover"
                cachePolicy="memory-disk"
                recyclingKey={item.show.id}
              />
              <View style={{ flex: 1, gap: 3 }}>
                <Text variant="callout" weight="700" numberOfLines={1}>
                  @{item.seller.username}
                </Text>
                <Text variant="footnote" color="textSecondary" numberOfLines={2}>
                  {item.show.title}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <View style={[styles.dot, { backgroundColor: colors.live }]} />
                  <Text variant="caption" color="textSecondary">
                    {formatCompact(item.show.viewers)} izleyici
                  </Text>
                </View>
              </View>
              <Icon name={sel ? 'radio-button-on' : 'radio-button-off'} size={22} color={sel ? colors.primary : colors.textTertiary} />
            </PressableScale>
          );
        }}
      />
    </Sheet>
  );
}

// ─── Tanıt (Promote) ─────────────────────────────────────────────────────────

export type PromoState = { startedAt: number; endsAt: number; budget: number; impressions: number };

const PROMO_BUDGETS = [100, 250, 500, 1000];
export const PROMO_DURATION_SEC = 15 * 60;

export function PromoteSheet({
  visible,
  onClose,
  promo,
  credit,
  now,
  onStart,
  onStop,
}: {
  visible: boolean;
  onClose: () => void;
  promo: PromoState | null;
  credit: number;
  now: number;
  onStart: (budget: number) => Promise<void> | void;
  onStop: () => void;
}) {
  const { colors } = useTheme();
  const [budget, setBudget] = useState(250);
  const [loading, setLoading] = useState(false);
  const active = !!promo && promo.endsAt > now;
  const fromCredit = Math.min(credit, budget);
  const charge = budget - fromCredit;
  const lo = Math.round(budget * 9);
  const hi = Math.round(budget * 16);

  if (active && promo) {
    const left = (promo.endsAt - now) / 1000;
    const progress = 1 - left / PROMO_DURATION_SEC;
    const delivered = Math.round(promo.impressions * Math.min(1, Math.max(0.02, progress)));
    return (
      <Sheet
        visible={visible}
        onClose={onClose}
        dark
        title="Yayın öne çıkarılıyor 🚀"
        showClose
        footer={<Button title="Tanıtımı bitir" variant="glass" size="lg" fullWidth onPress={onStop} />}>
        <View style={styles.grid}>
          <StatTile label="Kalan süre" value={formatTimer(left)} icon="time-outline" accent={colors.primary} />
          <StatTile label="Gösterim" value={formatCompact(delivered)} icon="eye-outline" />
        </View>
        <View style={[styles.progressTrack, { backgroundColor: colors.surfaceAlt }]}>
          <View style={[styles.progressFill, { width: `${Math.min(100, progress * 100)}%`, backgroundColor: colors.primary }]} />
        </View>
        <InfoBox icon="information-circle-outline" style={{ marginTop: 14 }}>
          Bütçe {formatTRY(promo.budget)} · Sadece kullandığın süre kadar ücretlendirilirsin. Erken bitirirsen kalan tutar kredine iade edilir.
        </InfoBox>
      </Sheet>
    );
  }

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      dark
      title="Yayını Tanıt"
      subtitle="Yayınını Ana Sayfa ve Keşfet'te öne çıkar"
      showClose
      footer={
        <Button
          title={`Öne Çıkar · ${formatDurationLong(PROMO_DURATION_SEC)}`}
          icon="rocket"
          size="lg"
          fullWidth
          loading={loading}
          onPress={() => {
            setLoading(true);
            Promise.resolve(onStart(budget))
              .catch(() => toast.error('Tanıtım başlatılamadı, tekrar dene'))
              .finally(() => setLoading(false));
          }}
        />
      }>
      <FieldLabel title="Bütçe" hint="Öne çıkarma 15 dakika sürer; gösterimler teslim edilince erken bitebilir." />
      <OptionChips options={PROMO_BUDGETS.map((b) => ({ value: b, label: formatTRY(b) }))} value={budget} onChange={setBudget} wrap />
      <View style={[styles.summary, { backgroundColor: colors.surface }]}>
        <SummaryLine label="Tahmini gösterim" value={`${formatCompact(lo)} – ${formatCompact(hi)}`} />
        <SummaryLine label="Süre" value="15 dk" />
        <SummaryLine label="Tanıtım kredisi" value={fromCredit > 0 ? `-${formatTRY(fromCredit)}` : formatTRY(0)} tint={fromCredit > 0 ? colors.success : undefined} />
        <Divider style={{ marginVertical: 6 }} />
        <SummaryLine label="Toplam harcama" value={formatTRY(charge)} bold />
      </View>
      <Text variant="caption" color="textSecondary" style={{ marginTop: 10 }}>
        Kalan tanıtım kredin: {formatTRY(credit)}. Ücret yayın bittikten sonra bakiyenden düşülür; organik gösterimler ücretlendirilmez.
      </Text>
    </Sheet>
  );
}

function SummaryLine({ label, value, tint, bold }: { label: string; value: string; tint?: string; bold?: boolean }) {
  return (
    <View style={styles.summaryLine}>
      <Text variant="callout" color={bold ? 'text' : 'textSecondary'} weight={bold ? '700' : '500'}>
        {label}
      </Text>
      <Text variant="callout" weight="700" color={tint ?? 'text'} tabular>
        {value}
      </Text>
    </View>
  );
}

// ─── Yayın notları ───────────────────────────────────────────────────────────

export function NotesSheet({ visible, onClose, text, onSave }: { visible: boolean; onClose: () => void; text: string; onSave: (t: string) => void }) {
  const [draft, setDraft] = useState(text);
  useEffect(() => {
    if (visible) setDraft(text);
  }, [visible, text]);
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      dark
      title="Yayın notları"
      subtitle="İzleyiciler başlığın altındaki “Yayın bilgisi” çipine dokunarak görür"
      showClose
      footer={<Button title="Kaydet" size="lg" fullWidth onPress={() => onSave(draft.trim())} />}>
      <TextField
        value={draft}
        onChangeText={setDraft}
        multiline
        maxLength={300}
        placeholder="ör. Hoş geldin! 👋 Kargo 2 iş günü içinde çıkar. Her 50 izleyicide çekiliş 🎁"
        style={{ minHeight: 120 }}
      />
      <Text variant="caption" color="textTertiary" align="right" style={{ marginTop: 4 }}>
        {draft.length}/300
      </Text>
    </Sheet>
  );
}

// ─── Kullanıcı eylemleri ─────────────────────────────────────────────────────

export type UserTarget = { username: string; avatar?: string; text?: string };

export function UserActionsSheet({
  visible,
  onClose,
  target,
  isMod,
  isSelf,
  onReply,
  onPin,
  onToggleMod,
  onRemove,
  onBlock,
  onReport,
}: {
  visible: boolean;
  onClose: () => void;
  target?: UserTarget;
  isMod: boolean;
  isSelf: boolean;
  onReply: () => void;
  onPin: () => void;
  onToggleMod: () => void;
  onRemove: () => void;
  onBlock: () => void;
  onReport: () => void;
}) {
  const { colors } = useTheme();
  if (!target) return null;
  return (
    <Sheet visible={visible} onClose={onClose} dark contentStyle={{ paddingHorizontal: 0 }}>
      <View style={styles.userHead}>
        <Avatar uri={target.avatar} name={target.username} size={48} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="headline" numberOfLines={1}>
            {isSelf ? `${target.username} (sen)` : target.username}
          </Text>
          {isMod ? (
            <Text variant="footnote" color="textSecondary">
              Moderatör
            </Text>
          ) : null}
        </View>
      </View>
      {target.text ? (
        <View style={[styles.quote, { backgroundColor: colors.surface, borderLeftColor: colors.primary }]}>
          <Text variant="callout" numberOfLines={3}>
            “{target.text}”
          </Text>
        </View>
      ) : null}
      {!isSelf ? (
        <ListRow
          icon={target.text ? 'arrow-undo-outline' : 'at'}
          title={target.text ? 'Yanıtla' : 'Sohbette etiketle'}
          subtitle={`@${target.username} etiketlenir`}
          onPress={onReply}
        />
      ) : null}
      {target.text ? <ListRow icon="pin-outline" title="Sabitle" subtitle="Mesajı sohbetin üstüne sabitle" onPress={onPin} /> : null}
      {!isSelf ? (
        <>
          <ListRow icon={isMod ? 'remove-circle-outline' : 'shield-outline'} title={isMod ? 'Moderatörlükten çıkar' : 'Moderatör yap'} onPress={onToggleMod} />
          <ListRow icon="exit-outline" title="Yayından çıkar" subtitle="Bu yayında sohbet edemez, teklif veremez ve geri dönemez" onPress={onRemove} />
          <ListRow icon="ban-outline" title="Engelle" subtitle="Seni takip edemez, mesaj atamaz, yayınlarına katılamaz" destructive onPress={onBlock} />
          <ListRow icon="flag-outline" title="Şikayet et" onPress={onReport} />
        </>
      ) : null}
    </Sheet>
  );
}

// ─── Yayını bitir ────────────────────────────────────────────────────────────

export function EndShowSheet({
  visible,
  onClose,
  rehearsal,
  lotRunning,
  giveawayRunning,
  gross,
  itemsSold,
  onConfirm,
}: {
  visible: boolean;
  onClose: () => void;
  rehearsal: boolean;
  lotRunning: boolean;
  giveawayRunning: boolean;
  gross: number;
  itemsSold: number;
  onConfirm: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      dark
      footer={
        <View style={{ gap: 10 }}>
          <Button title={rehearsal ? 'Provayı bitir' : 'Yayını bitir'} variant="danger" size="lg" fullWidth disabled={lotRunning || giveawayRunning} onPress={onConfirm} />
          <Button title="Yayına devam et" variant="glass" size="lg" fullWidth onPress={onClose} />
        </View>
      }>
      <View style={{ alignItems: 'center', gap: 10, paddingTop: 8 }}>
        <View style={[styles.endIcon, { backgroundColor: colors.surface }]}>
          <Icon name="stop-circle" size={34} color={colors.live} />
        </View>
        <Text variant="title3" align="center">
          {rehearsal ? 'Provayı bitirmek istiyor musun?' : 'Yayını bitirmek istiyor musun?'}
        </Text>
        <Text variant="callout" color="textSecondary" align="center">
          {rehearsal
            ? 'Prova özetini göreceksin. Satışlar kaydedilmedi.'
            : `${itemsSold > 0 ? `Şu ana kadar ${itemsSold} ürün sattın (${formatTRY(gross)}).` : 'Bu yayında henüz satış olmadı.'} Yayını bitirince izleyiciler çıkarılır; 2 saat içinde yeniden başlatabilirsin.`}
        </Text>
        {lotRunning || giveawayRunning ? (
          <InfoBox icon="alert-circle-outline" tone="warning" style={{ alignSelf: 'stretch', marginTop: 4 }}>
            {lotRunning
              ? 'Devam eden açık artırma var. Başlayan açık artırmalar iptal edilemez; bitmesini bekle.'
              : 'Devam eden çekiliş var. Kazanan seçilince yayını bitirebilirsin.'}
          </InfoBox>
        ) : null}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', gap: 10 },
  miniRow: { flexDirection: 'row', gap: 8 },
  mini: { flex: 1, alignItems: 'center', paddingVertical: 8, paddingHorizontal: 4, borderRadius: radius.md, gap: 1 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 16, paddingVertical: 10 },
  viewerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  tag: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 1 },
  activityRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  addRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 4 },
  modRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  raidRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: radius.md, borderWidth: 1.5, marginBottom: 8 },
  raidThumb: { width: 54, height: 72, borderRadius: radius.sm },
  dot: { width: 6, height: 6, borderRadius: 3 },
  progressTrack: { height: 6, borderRadius: 3, overflow: 'hidden', marginTop: 14 },
  progressFill: { height: 6, borderRadius: 3 },
  summary: { borderRadius: radius.md, padding: 12, marginTop: 16, gap: 6 },
  summaryLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  userHead: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingBottom: 10 },
  quote: { marginHorizontal: 16, marginBottom: 8, padding: 10, borderRadius: radius.sm, borderLeftWidth: 3 },
  endIcon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
});
