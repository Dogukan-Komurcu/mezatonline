import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { Avatar, Button, Icon, PressableScale, Sheet, Text } from '@/components/ui';
import { DEMO_COPY, DEMO_MODE } from '@/config/demo';
import { formatCompact } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { POINTS_SHOP, useRewardsStore } from '@/store/rewards';
import { liveColors, useTheme } from '@/theme';
import type { User } from '@/types';

import type { Giveaway } from '../engine';
import { GIVEAWAY_LEGAL_NOTE, GIVEAWAY_RULES } from '../giveawayRules';

// ─── Takip et ve katıl ───────────────────────────────────────────────────────

export function FollowEnterSheet({ visible, onClose, seller, onConfirm }: { visible: boolean; onClose: () => void; seller: User; onConfirm: () => void }) {
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      dark
      footer={
        <View style={styles.footer}>
          <Button title="Takip et, çekilişe gir" size="lg" fullWidth icon="gift" onPress={onConfirm} />
          <Button title="Vazgeç" variant="ghost" fullWidth onPress={onClose} />
        </View>
      }>
      <View style={styles.center}>
        <View>
          <Avatar uri={seller.avatar} name={seller.username} size={72} />
          <View style={styles.giftBadge}>
            <Icon name="gift-outline" size={16} color={liveColors.text} />
          </View>
        </View>
        <Text variant="title3" weight="800" align="center">
          Bu çekiliş takipçilere özel
        </Text>
        <Text variant="callout" color="textSecondary" align="center">
          Katılmak için {seller.username} adlı satıcıyı takip et. Takip ettiğin satıcıların canlı yayınlarından da haberdar olursun.
        </Text>
      </View>
    </Sheet>
  );
}

// ─── Çekiliş bilgisi ─────────────────────────────────────────────────────────

export function GiveawayInfoSheet({ visible, onClose, giveaway, onEnter }: { visible: boolean; onClose: () => void; giveaway?: Giveaway; onEnter: () => void }) {
  const { colors } = useTheme();
  if (!giveaway) return null;
  const running = giveaway.status === 'running';
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      dark
      title="Çekiliş"
      showClose
      footer={
        running ? (
          <Button title={giveaway.entered ? 'Katıldın ✓' : 'Çekilişe katıl'} size="lg" fullWidth disabled={giveaway.entered} onPress={onEnter} icon="gift" />
        ) : undefined
      }>
      <View style={styles.prize}>
        <Image source={{ uri: giveaway.product.images[0] }} style={styles.prizeImg} contentFit="cover" cachePolicy="memory-disk" />
        <View style={styles.flex}>
          <Text variant="headline" weight="800" numberOfLines={2}>
            {giveaway.product.title.replace(/^🎁\s*(Çekiliş:\s*)?/, '')}
          </Text>
          <Text variant="footnote" color="textSecondary">
            {formatCompact(giveaway.entrants)} katılımcı · {giveaway.requiresFollow ? 'Takipçilere özel' : 'Herkes katılabilir'}
          </Text>
        </View>
      </View>
      {DEMO_MODE ? (
        <View style={[styles.demo, { backgroundColor: colors.surface }]}>
          <Icon name="information-circle-outline" size={16} color={liveColors.accent} />
          <Text variant="subhead" weight="700" color="text" style={styles.flex}>
            {DEMO_COPY.giveaway}
          </Text>
        </View>
      ) : null}
      <Text variant="caption" weight="700" color="textSecondary" style={styles.rulesTitle}>
        Katılım kuralları
      </Text>
      {GIVEAWAY_RULES.map((r) => (
        <View key={r} style={styles.rule}>
          <Icon name="checkmark-circle" size={16} color={liveColors.success} />
          <Text variant="subhead" color="text" style={styles.flex}>
            {r}
          </Text>
        </View>
      ))}
      <View style={[styles.legal, { backgroundColor: colors.surface }]}>
        <Text variant="caption" weight="700" color="textSecondary">
          Yasal uyarı
        </Text>
        <Text variant="caption" color="textTertiary">
          {GIVEAWAY_LEGAL_NOTE}
        </Text>
      </View>
    </Sheet>
  );
}

// ─── Tepki seçici ────────────────────────────────────────────────────────────

export function ReactionSheet({ visible, onClose, onShop }: { visible: boolean; onClose: () => void; onShop: () => void }) {
  const { colors } = useTheme();
  const owned = useRewardsStore((s) => s.owned);
  const active = useRewardsStore((s) => s.activeReaction);
  const points = useRewardsStore((s) => s.points);
  const setActive = useRewardsStore((s) => s.setActiveReaction);
  const reactions = POINTS_SHOP.filter((i) => i.kind === 'reaction');
  const jumbotrons = POINTS_SHOP.filter((i) => i.kind === 'jumbotron');
  return (
    <Sheet visible={visible} onClose={onClose} dark title="Tepkiler" subtitle={`Ekrana iki kez dokunarak ya da kalbe basarak gönder · ${points} puan`} showClose>
      <View style={styles.grid}>
        {reactions.map((r) => {
          const has = owned.includes(r.id);
          const selected = active === r.id;
          return (
            <PressableScale
              key={r.id}
              scaleTo={0.92}
              onPress={() => {
                if (!has) {
                  onShop();
                  return;
                }
                haptic.success();
                setActive(r.id);
              }}
              style={[styles.cell, { backgroundColor: colors.surface, borderColor: selected ? liveColors.primary : 'transparent' }]}>
              <Text style={[styles.cellEmoji, !has && styles.locked]}>{r.emoji}</Text>
              <Text variant="caption" weight="700" numberOfLines={1}>
                {r.title}
              </Text>
              <Text variant="caption" color={selected ? liveColors.accent : 'textSecondary'}>
                {selected ? 'Seçili' : has ? 'Seç' : `🔒 ${r.cost} puan`}
              </Text>
            </PressableScale>
          );
        })}
      </View>
      <Text variant="subhead" weight="800" color="textSecondary" style={styles.section}>
        Dev tepkiler
      </Text>
      {jumbotrons.map((j) => (
        <View key={j.id} style={styles.jRow}>
          <Text style={styles.jEmoji}>{j.emoji}</Text>
          <Text variant="subhead" weight="600" style={styles.flex}>
            {j.title}
          </Text>
          <Text variant="footnote" color={owned.includes(j.id) ? liveColors.success : 'textSecondary'}>
            {owned.includes(j.id) ? 'Sende var' : `${j.cost} puan`}
          </Text>
        </View>
      ))}
      <Button title="Puan Mağazası’na git" variant="secondary" fullWidth icon="gift-outline" onPress={onShop} style={styles.shopBtn} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  footer: { gap: 4 },
  center: { alignItems: 'center', gap: 10, paddingVertical: 10 },
  giftBadge: { position: 'absolute', right: -6, bottom: -6, width: 30, height: 30, borderRadius: 15, backgroundColor: liveColors.copper, alignItems: 'center', justifyContent: 'center' },
  prize: { flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: 12 },
  prizeImg: { width: 72, height: 72, borderRadius: 12, backgroundColor: liveColors.panelAlt },
  rule: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', paddingVertical: 5 },
  legal: { borderRadius: 12, padding: 12, gap: 4, marginTop: 12, marginBottom: 4 },
  demo: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 8 },
  rulesTitle: { marginBottom: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  cell: { width: '47%', flexGrow: 1, borderRadius: 14, borderWidth: 1.5, padding: 12, alignItems: 'center', gap: 2 },
  cellEmoji: { fontSize: 32, lineHeight: 40 },
  locked: { opacity: 0.4 },
  section: { marginTop: 18, marginBottom: 6 },
  jRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  jEmoji: { fontSize: 22, lineHeight: 28 },
  shopBtn: { marginTop: 14, marginBottom: 4 },
});
