/**
 * Gelen kutusu bileşenleri: konuşma satırı, sohbet görünümü (baloncuklar, gün ayraçları,
 * yazıyor göstergesi, mesaj kutusu), yeni mesaj sayfası.
 */
import { Image } from 'expo-image';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { FlatList, Keyboard, Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Logo } from '@/components/Logo';
import { Avatar, Chip, CountBadge, EmptyState, Icon, IconButton, PressableScale, Sheet, Text, TextField } from '@/components/ui';
import { BUYER_USERS, getLiveShowOf, getSellers, getUser } from '@/data';
import { pickImage } from '@/features/account/media';
import { formatClock, formatCompact, formatDayLong, formatRating, timeAgo } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { useSocialStore } from '@/store/social';
import { brand, radius, SCREEN_PADDING, useTheme } from '@/theme';
import type { DirectMessage, User } from '@/types';

import { SUPPORT_USER } from './store';

// ─── Avatar ──────────────────────────────────────────────────────────────────

export function ChatAvatar({ user, size = 48 }: { user: User; size?: number }) {
  if (user.id === SUPPORT_USER.id) {
    return (
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Logo iconOnly size={size * 0.92} />
      </View>
    );
  }
  const live = user.isSeller && !!getLiveShowOf(user.id);
  return <Avatar uri={user.avatar} name={user.username} size={size} live={live} verified={user.badges.includes('verified')} />;
}

// ─── Konuşma satırı ──────────────────────────────────────────────────────────

export function previewOf(m: DirectMessage | undefined): string {
  if (!m) return 'Sohbete başla 👋';
  const body = m.image && !m.text ? '📷 Fotoğraf' : m.text;
  return m.fromMe ? `Sen: ${body}` : body;
}

export function ConversationRow({
  user,
  last,
  unread,
  onPress,
  onLongPress,
  tag,
  title,
}: {
  user: User;
  last?: DirectMessage;
  unread: number;
  onPress: () => void;
  onLongPress?: () => void;
  tag?: string;
  title?: string;
}) {
  const { colors } = useTheme();
  const isUnread = unread > 0;
  return (
    <PressableScale scaleTo={0.985} onPress={onPress} onLongPress={onLongPress} delayLongPress={350} style={styles.row} accessibilityRole="button" accessibilityLabel={`${title ?? user.username} ile sohbet`}>
      <ChatAvatar user={user} size={52} />
      <View style={styles.rowTexts}>
        <View style={styles.rowTop}>
          <Text variant="headline" weight={isUnread ? '800' : '600'} numberOfLines={1} style={{ flexShrink: 1 }}>
            {title ?? user.username}
          </Text>
          {user.badges.includes('verified') ? <Icon name="checkmark-circle" size={14} color="info" /> : null}
          <View style={{ flex: 1 }} />
          {last ? (
            <Text variant="footnote" color={isUnread ? 'text' : 'textTertiary'}>
              {timeAgo(last.createdAt)}
            </Text>
          ) : null}
        </View>
        <View style={styles.rowBottom}>
          <Text variant="subhead" weight={isUnread ? '600' : '400'} color={isUnread ? 'text' : 'textSecondary'} numberOfLines={1} style={{ flex: 1 }}>
            {previewOf(last)}
          </Text>
          {isUnread ? <CountBadge count={unread} /> : null}
        </View>
        {tag ? (
          <View style={[styles.rowTag, { backgroundColor: colors.surface }]}>
            <Icon name="bag-handle-outline" size={11} color="textSecondary" />
            <Text variant="caption" color="textSecondary" numberOfLines={1}>
              {tag}
            </Text>
          </View>
        ) : null}
      </View>
    </PressableScale>
  );
}

// ─── Sohbet satırları ────────────────────────────────────────────────────────

type ChatRow =
  | { kind: 'day'; key: string; label: string }
  | { kind: 'msg'; key: string; msg: DirectMessage; first: boolean; last: boolean; lastMine: boolean };

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const start = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((start(now) - start(d)) / 86_400_000);
  if (diff === 0) return `Bugün ${formatClock(d)}`;
  if (diff === 1) return `Dün ${formatClock(d)}`;
  return `${formatDayLong(d)} ${formatClock(d)}`;
}

const GROUP_GAP_MS = 3 * 60_000;

function buildRows(messages: DirectMessage[]): ChatRow[] {
  const sorted = [...messages].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const lastMineId = [...sorted].reverse().find((m) => m.fromMe)?.id;
  const rows: ChatRow[] = [];
  let prevDay = '';
  sorted.forEach((m, i) => {
    const d = new Date(m.createdAt);
    const dayKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (dayKey !== prevDay) {
      rows.push({ kind: 'day', key: `day_${dayKey}_${m.id}`, label: dayLabel(m.createdAt) });
      prevDay = dayKey;
    }
    const prev = sorted[i - 1];
    const next = sorted[i + 1];
    const sameAsPrev = !!prev && prev.fromMe === m.fromMe && d.getTime() - new Date(prev.createdAt).getTime() < GROUP_GAP_MS && new Date(prev.createdAt).getDate() === d.getDate();
    const sameAsNext = !!next && next.fromMe === m.fromMe && new Date(next.createdAt).getTime() - d.getTime() < GROUP_GAP_MS && new Date(next.createdAt).getDate() === d.getDate();
    rows.push({ kind: 'msg', key: m.id, msg: m, first: !sameAsPrev, last: !sameAsNext, lastMine: m.id === lastMineId });
  });
  return rows.reverse();
}

// ─── Yazıyor göstergesi ──────────────────────────────────────────────────────

function TypingDot({ delay }: { delay: number }) {
  const { colors } = useTheme();
  const v = useSharedValue(0.3);
  useEffect(() => {
    v.set(withDelay(delay, withRepeat(withSequence(withTiming(1, { duration: 320 }), withTiming(0.3, { duration: 320 })), -1)));
  }, [v, delay]);
  const style = useAnimatedStyle(() => ({ opacity: v.get(), transform: [{ translateY: (1 - v.get()) * 2 }] }));
  return <Animated.View style={[styles.typingDot, { backgroundColor: colors.textSecondary }, style]} />;
}

export function TypingBubble({ user }: { user: User }) {
  const { colors } = useTheme();
  return (
    <Animated.View entering={FadeInDown.duration(200)} style={[styles.msgRow, { justifyContent: 'flex-start', marginTop: 6 }]}>
      <ChatAvatar user={user} size={28} />
      <View style={[styles.bubble, styles.theirs, { backgroundColor: colors.surface, flexDirection: 'row', gap: 5, paddingVertical: 14 }]}>
        <TypingDot delay={0} />
        <TypingDot delay={160} />
        <TypingDot delay={320} />
      </View>
    </Animated.View>
  );
}

// ─── Klavye görünür mü ───────────────────────────────────────────────────────

function useKeyboardVisible() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const a = Keyboard.addListener(showEvt, () => setVisible(true));
    const b = Keyboard.addListener(hideEvt, () => setVisible(false));
    return () => {
      a.remove();
      b.remove();
    };
  }, []);
  return visible;
}

// ─── Mesaj kutusu ────────────────────────────────────────────────────────────

export function Composer({ onSend, placeholder = 'Mesaj yaz…', quickReplies }: { onSend: (text: string, image?: string) => void; placeholder?: string; quickReplies?: string[] }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const keyboard = useKeyboardVisible();
  const [text, setText] = useState('');
  const canSend = text.trim().length > 0;

  const send = () => {
    const t = text.trim();
    if (!t) return;
    haptic.light();
    onSend(t);
    setText('');
  };

  const pick = async (source: 'library' | 'camera') => {
    const asset = await pickImage(source, { allowsEditing: source === 'camera' });
    if (!asset) return;
    haptic.light();
    onSend(text.trim(), asset.uri);
    setText('');
  };

  return (
    <View style={{ backgroundColor: colors.bg }}>
      {quickReplies?.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quick} keyboardShouldPersistTaps="handled">
          {quickReplies.map((q) => (
            <Chip key={q} label={q} size="sm" onPress={() => onSend(q)} />
          ))}
        </ScrollView>
      ) : null}
      <View style={[styles.composer, { borderTopColor: colors.border, paddingBottom: keyboard ? 8 : Math.max(insets.bottom, 8) }]}>
        <IconButton name="image-outline" size={40} onPress={() => pick('library')} accessibilityLabel="Fotoğraf ekle" />
        <IconButton name="camera-outline" size={40} onPress={() => pick('camera')} accessibilityLabel="Fotoğraf çek" />
        <View style={[styles.inputPill, { backgroundColor: colors.surface }]}>
          <TextInput
            value={text}
            onChangeText={(v) => setText(v.slice(0, 1000))}
            placeholder={placeholder}
            placeholderTextColor={colors.textTertiary}
            selectionColor={colors.text}
            multiline
            style={[styles.input, { color: colors.text }]}
            accessibilityLabel="Mesaj"
          />
        </View>
        <PressableScale
          scaleTo={0.88}
          disabled={!canSend}
          onPress={send}
          accessibilityRole="button"
          accessibilityLabel="Gönder"
          style={[styles.send, { backgroundColor: canSend ? colors.primary : colors.surface }]}>
          <Icon name="arrow-up" size={20} color={canSend ? colors.onPrimary : colors.textTertiary} />
        </PressableScale>
      </View>
    </View>
  );
}

// ─── Sohbet görünümü ─────────────────────────────────────────────────────────

export function ChatView({
  messages,
  partner,
  typing,
  header,
  footer,
}: {
  messages: DirectMessage[];
  partner: User;
  typing: boolean;
  /** Konuşmanın en başında (en üstte) gösterilen içerik: profil kartı vb. */
  header?: ReactNode;
  /** Mesaj kutusu ya da onun yerine gösterilen uyarı */
  footer: ReactNode;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const rows = useMemo(() => buildRows(messages), [messages]);
  const [preview, setPreview] = useState<string | null>(null);

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        inverted
        data={rows}
        keyExtractor={(r) => r.key}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.list}
        ListHeaderComponent={typing ? <TypingBubble user={partner} /> : undefined}
        ListFooterComponent={header ? <View>{header}</View> : undefined}
        renderItem={({ item }) => {
          if (item.kind === 'day') {
            return (
              <Text variant="footnote" weight="600" color="textTertiary" align="center" style={styles.day}>
                {item.label}
              </Text>
            );
          }
          const m = item.msg;
          const mine = m.fromMe;
          const bg = mine ? colors.primary : colors.surface;
          const fg = mine ? colors.onPrimary : colors.text;
          return (
            <Animated.View entering={FadeIn.duration(180)} style={{ marginTop: item.first ? 10 : 2 }}>
              <View style={[styles.msgRow, { justifyContent: mine ? 'flex-end' : 'flex-start' }]}>
                {!mine ? <View style={styles.avatarSlot}>{item.last ? <ChatAvatar user={partner} size={28} /> : null}</View> : null}
                <View style={{ maxWidth: '76%', gap: 4, alignItems: mine ? 'flex-end' : 'flex-start' }}>
                  {m.image ? (
                    <Pressable onPress={() => setPreview(m.image ?? null)} accessibilityLabel="Fotoğrafı büyüt">
                      <Image source={{ uri: m.image }} style={[styles.photo, { backgroundColor: colors.skeleton }]} contentFit="cover" cachePolicy="memory-disk" transition={150} />
                    </Pressable>
                  ) : null}
                  {m.text ? (
                    <View
                      style={[
                        styles.bubble,
                        mine ? styles.mine : styles.theirs,
                        { backgroundColor: bg },
                        mine && !item.last ? { borderBottomRightRadius: 18 } : null,
                        !mine && !item.last ? { borderBottomLeftRadius: 18 } : null,
                      ]}>
                      <Text variant="body" color={fg}>
                        {m.text}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>
              {item.last ? (
                <Text variant="caption" weight="500" color="textTertiary" style={[styles.time, mine ? { textAlign: 'right' } : { marginLeft: 36 }]}>
                  {formatClock(m.createdAt)}
                  {mine && item.lastMine ? ' · Gönderildi' : ''}
                </Text>
              ) : null}
            </Animated.View>
          );
        }}
      />
      {footer}
      <Modal visible={!!preview} transparent animationType="fade" onRequestClose={() => setPreview(null)} statusBarTranslucent>
        <View style={styles.previewBg}>
          {preview ? <Image source={{ uri: preview }} style={StyleSheet.absoluteFill} contentFit="contain" cachePolicy="memory-disk" /> : null}
          <IconButton name="close" variant="glass" style={[styles.previewClose, { top: insets.top + 12 }]} onPress={() => setPreview(null)} accessibilityLabel="Kapat" />
        </View>
      </Modal>
    </View>
  );
}

/** Sohbetin başındaki profil kartı */
export function ChatIntro({ user, onProfile, note }: { user: User; onProfile?: () => void; note?: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.intro}>
      <ChatAvatar user={user} size={80} />
      <Text variant="title3" align="center" numberOfLines={1}>
        {user.displayName}
      </Text>
      <Text variant="subhead" color="textSecondary" align="center">
        {user.id === SUPPORT_USER.id
          ? 'Resmi Mezatonline destek hesabı'
          : user.isSeller
            ? `@${user.username} · ★ ${formatRating(user.rating)} · ${formatCompact(user.followers)} takipçi`
            : `@${user.username}`}
      </Text>
      {onProfile ? (
        <PressableScale onPress={onProfile} style={[styles.introBtn, { backgroundColor: colors.surface }]} accessibilityRole="button">
          <Text variant="subhead" weight="700">
            Profili görüntüle
          </Text>
        </PressableScale>
      ) : null}
      {note ? (
        <View style={[styles.introNote, { backgroundColor: colors.surface }]}>
          <Icon name="shield-checkmark-outline" size={16} color="textSecondary" />
          <Text variant="footnote" color="textSecondary" style={{ flex: 1 }}>
            {note}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

// ─── Yeni mesaj sayfası ──────────────────────────────────────────────────────

export function ComposeSheet({ visible, onClose, onPick }: { visible: boolean; onClose: () => void; onPick: (user: User) => void }) {
  const [q, setQ] = useState('');
  const followingIds = useSocialStore((s) => s.followingIds);
  const blockedIds = useSocialStore((s) => s.blockedIds);
  const data = useMemo(() => {
    const query = q.trim().toLocaleLowerCase('tr-TR').replace(/^@/, '');
    const sellers = getSellers().filter((u) => !blockedIds.includes(u.id));
    if (!query) {
      const followed = followingIds.map((id) => getUser(id)).filter((u): u is User => !!u && !blockedIds.includes(u.id));
      const suggested = sellers.filter((u) => !followingIds.includes(u.id)).slice(0, 12);
      return [
        ...(followed.length ? [{ header: 'Takip ettiklerin' as const }, ...followed.map((u) => ({ user: u }))] : []),
        { header: 'Önerilen satıcılar' as const },
        ...suggested.map((u) => ({ user: u })),
      ];
    }
    const all = [...sellers, ...BUYER_USERS.filter((u) => !blockedIds.includes(u.id))];
    return all
      .filter((u) => u.username.toLocaleLowerCase('tr-TR').includes(query) || u.displayName.toLocaleLowerCase('tr-TR').includes(query))
      .slice(0, 30)
      .map((u) => ({ user: u }));
  }, [q, followingIds, blockedIds]);

  const close = () => {
    setQ('');
    onClose();
  };

  return (
    <Sheet visible={visible} onClose={close} title="Yeni Mesaj" showClose height={0.85} scroll={false}>
      <TextField icon="search" placeholder="Kullanıcı adı ara…" value={q} onChangeText={setQ} autoCapitalize="none" autoCorrect={false} containerStyle={{ marginBottom: 6 }} />
      <FlatList
        data={data}
        keyExtractor={(item, i) => ('user' in item ? item.user.id : `h_${item.header}_${i}`)}
        keyboardShouldPersistTaps="handled"
        style={{ marginHorizontal: -SCREEN_PADDING }}
        ListEmptyComponent={<EmptyState icon="search" title="Kullanıcı bulunamadı" message="Kullanıcı adını kontrol edip tekrar dene." />}
        renderItem={({ item }) =>
          'user' in item ? (
            <PressableScale
              scaleTo={0.985}
              style={styles.pickRow}
              onPress={() => {
                haptic.tap();
                setQ('');
                onPick(item.user);
              }}>
              <ChatAvatar user={item.user} size={44} />
              <View style={{ flex: 1 }}>
                <Text variant="headline" numberOfLines={1}>
                  {item.user.username}
                </Text>
                <Text variant="footnote" color="textSecondary" numberOfLines={1}>
                  {item.user.isSeller ? `${item.user.displayName} · ${formatCompact(item.user.followers)} takipçi` : item.user.displayName}
                </Text>
              </View>
              <Icon name="chatbubble-ellipses-outline" size={20} color="textSecondary" />
            </PressableScale>
          ) : (
            <Text variant="footnote" weight="700" color="textSecondary" style={styles.pickHeader}>
              {item.header.toLocaleUpperCase('tr-TR')}
            </Text>
          )
        }
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: SCREEN_PADDING, paddingVertical: 10 },
  rowTexts: { flex: 1, gap: 2 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rowBottom: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowTag: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingHorizontal: 7, paddingVertical: 2, borderRadius: radius.pill, marginTop: 3 },
  list: { paddingHorizontal: 12, paddingVertical: 12 },
  day: { marginTop: 18, marginBottom: 6 },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  avatarSlot: { width: 28 },
  bubble: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20 },
  mine: { borderBottomRightRadius: 6 },
  theirs: { borderBottomLeftRadius: 6 },
  photo: { width: 210, height: 260, borderRadius: radius.lg },
  time: { marginTop: 4, marginHorizontal: 4 },
  typingDot: { width: 7, height: 7, borderRadius: 4 },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, paddingHorizontal: 8, paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth },
  inputPill: { flex: 1, borderRadius: 22, paddingHorizontal: 14, minHeight: 40, justifyContent: 'center', marginHorizontal: 4 },
  input: { fontSize: 16, maxHeight: 110, paddingTop: Platform.OS === 'ios' ? 10 : 6, paddingBottom: Platform.OS === 'ios' ? 10 : 6 },
  send: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  quick: { gap: 8, paddingHorizontal: 12, paddingTop: 8 },
  intro: { alignItems: 'center', gap: 6, paddingTop: 16, paddingBottom: 8, paddingHorizontal: 16 },
  introBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: radius.pill, marginTop: 6 },
  introNote: { flexDirection: 'row', gap: 8, padding: 12, borderRadius: radius.md, marginTop: 10, alignItems: 'center', alignSelf: 'stretch' },
  previewBg: { flex: 1, backgroundColor: brand.black },
  previewClose: { position: 'absolute', right: 16 },
  pickRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: SCREEN_PADDING, paddingVertical: 9 },
  pickHeader: { paddingHorizontal: SCREEN_PADDING, paddingTop: 14, paddingBottom: 4, letterSpacing: 0.5 },
});
