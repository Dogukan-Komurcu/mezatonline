import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Chip, EmptyState, Header, Icon, IconButton, PressableScale, Screen, Text, TextField, toast, UnderlineTabs } from '@/components/ui';
import { getUser } from '@/data';
import { ActionSheet, ConfirmSheet, type SheetAction } from '@/features/account/ui';
import { useAccountStore } from '@/features/account/store';
import { ComposeSheet, ConversationRow } from '@/features/inbox/components';
import { ensureRequestsSeeded, isRequest, SUPPORT_THREAD_ID, SUPPORT_USER, useInboxExtras } from '@/features/inbox/store';
import { useQaParams } from '@/features/account/qa';
import { haptic } from '@/lib/haptics';
import { useInboxStore } from '@/store/inbox';
import { useOrdersStore } from '@/store/orders';
import { useSocialStore } from '@/store/social';
import { radius, SCREEN_PADDING, useTheme } from '@/theme';
import type { Conversation, DirectMessage, User } from '@/types';

type Tab = 'messages' | 'requests';
type Filter = 'all' | 'unread' | 'orders';

type Item =
  | { kind: 'support'; key: string; last?: DirectMessage; unread: number }
  | { kind: 'dm'; key: string; conv: Conversation; user: User; last?: DirectMessage };

const lastOf = (c: Conversation): DirectMessage | undefined => c.messages[c.messages.length - 1];
const norm = (s: string) => s.toLocaleLowerCase('tr-TR');

export default function InboxScreen() {
  const qa = useQaParams();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const conversations = useInboxStore((s) => s.conversations);
  const ensureConversation = useInboxStore((s) => s.ensureConversation);
  const deleteConversation = useInboxStore((s) => s.deleteConversation);
  const markConversationRead = useInboxStore((s) => s.markConversationRead);
  const requestIds = useInboxExtras((s) => s.requestIds);
  const acceptedIds = useInboxExtras((s) => s.acceptedRequestIds);
  const acceptRequest = useInboxExtras((s) => s.acceptRequest);
  const supportMessages = useInboxExtras((s) => s.supportMessages);
  const supportUnread = useInboxExtras((s) => s.supportUnread);
  const blockedIds = useSocialStore((s) => s.blockedIds);
  const block = useSocialStore((s) => s.block);
  const dmEnabled = useAccountStore((s) => s.dmEnabled);
  const setFlag = useAccountStore((s) => s.setFlag);
  const orders = useOrdersStore((s) => s.orders);

  const [tab, setTab] = useState<Tab>('messages');
  const [filter, setFilter] = useState<Filter>('all');
  const [q, setQ] = useState('');
  const [composeOpen, setComposeOpen] = useState(false);
  const [menuFor, setMenuFor] = useState<{ conv: Conversation; user: User } | null>(null);
  const [toDelete, setToDelete] = useState<Conversation | null>(null);
  const [toBlock, setToBlock] = useState<{ conv: Conversation; user: User } | null>(null);

  useEffect(() => ensureRequestsSeeded(), []);

  const { messages, requests } = useMemo(() => {
    const dm: Item[] = [];
    const req: Item[] = [];
    conversations.forEach((c) => {
      const user = getUser(c.userId);
      if (!user || blockedIds.includes(user.id)) return;
      const item: Item = { kind: 'dm', key: c.id, conv: c, user, last: lastOf(c) };
      if (isRequest(c, requestIds, acceptedIds)) req.push(item);
      else if (c.messages.length) dm.push(item);
    });
    if (supportMessages.length) dm.push({ kind: 'support', key: SUPPORT_THREAD_ID, last: supportMessages[supportMessages.length - 1], unread: supportUnread });
    const byTime = (a: Item, b: Item) => (b.last?.createdAt ?? '').localeCompare(a.last?.createdAt ?? '');
    return { messages: dm.sort(byTime), requests: req.sort(byTime) };
  }, [conversations, blockedIds, requestIds, acceptedIds, supportMessages, supportUnread]);

  const unreadCount = messages.reduce((n, i) => n + ((i.kind === 'dm' ? i.conv.unread : i.unread) > 0 ? 1 : 0), 0);

  const visible = useMemo(() => {
    const base = tab === 'messages' ? messages : requests;
    const query = norm(q.trim());
    return base.filter((i) => {
      if (tab === 'messages') {
        if (filter === 'unread' && (i.kind === 'dm' ? i.conv.unread : i.unread) === 0) return false;
        if (filter === 'orders' && (i.kind !== 'dm' || !i.conv.orderId)) return false;
      }
      if (!query) return true;
      const user = i.kind === 'dm' ? i.user : SUPPORT_USER;
      const msgs = i.kind === 'dm' ? i.conv.messages : supportMessages;
      return norm(user.username).includes(query) || norm(user.displayName).includes(query) || msgs.some((m) => norm(m.text).includes(query));
    });
  }, [tab, messages, requests, filter, q, supportMessages]);

  const startChat = (user: User) => {
    setComposeOpen(false);
    if (!dmEnabled) {
      toast.warning('Mesaj göndermek için doğrudan mesajları açmalısın', 'chatbubbles-outline');
      return;
    }
    const conv = ensureConversation(user.id);
    if (requestIds.includes(conv.id)) acceptRequest(conv.id);
    setTimeout(() => router.push(`/inbox/${conv.id}`), 260);
  };

  const menuActions: SheetAction[] = menuFor
    ? [
        menuFor.conv.unread > 0
          ? { label: 'Okundu olarak işaretle', icon: 'mail-open-outline', onPress: () => markConversationRead(menuFor.conv.id) }
          : {
              label: 'Okunmadı olarak işaretle',
              icon: 'mail-unread-outline',
              onPress: () => useInboxStore.setState((s) => ({ conversations: s.conversations.map((c) => (c.id === menuFor.conv.id ? { ...c, unread: Math.max(1, c.unread) } : c)) })),
            },
        { label: 'Profili görüntüle', icon: 'person-circle-outline', onPress: () => router.push(`/user/${menuFor.user.username}`) },
        { label: 'Engelle', icon: 'ban-outline', onPress: () => setToBlock(menuFor) },
        { label: 'Sohbeti sil', icon: 'trash-outline', destructive: true, onPress: () => setToDelete(menuFor.conv) },
      ]
    : [];

  const orderTag = (c: Conversation) => {
    if (!c.orderId) return undefined;
    const o = orders.find((x) => x.id === c.orderId);
    return o ? `Sipariş ${o.number}` : 'Sipariş';
  };

  return (
    <Screen>
      <Header title="Mesajlar" right={<IconButton name="create-outline" onPress={() => setComposeOpen(true)} accessibilityLabel="Yeni mesaj" />} />
      <View style={styles.search}>
        <TextField icon="search" placeholder="Mesajlarda ara" value={q} onChangeText={setQ} autoCapitalize="none" autoCorrect={false} returnKeyType="search" />
      </View>
      <UnderlineTabs
        equal
        value={tab}
        onChange={setTab}
        tabs={[
          { key: 'messages', label: 'Mesajlar' },
          { key: 'requests', label: requests.length ? `İstekler (${requests.length})` : 'İstekler' },
        ]}
      />
      <FlatList
        contentOffset={qa.offset}
        data={visible}
        keyExtractor={(i) => i.key}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{ paddingBottom: insets.bottom + 96, flexGrow: 1 }}
        ListHeaderComponent={
          <View>
            {!dmEnabled ? (
              <View style={[styles.banner, { backgroundColor: colors.surface }]}>
                <Icon name="chatbubbles-outline" size={22} />
                <View style={{ flex: 1 }}>
                  <Text variant="callout" weight="700">
                    Doğrudan mesajların kapalı
                  </Text>
                  <Text variant="footnote" color="textSecondary">
                    Kimse sana mesaj gönderemez, sen de yeni sohbet başlatamazsın.
                  </Text>
                </View>
                <Button
                  title="Aç"
                  size="sm"
                  onPress={() => {
                    setFlag('dmEnabled', true);
                    toast.success('Doğrudan mesajlar açıldı', 'chatbubbles');
                  }}
                />
              </View>
            ) : null}
            {tab === 'messages' ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
                <Chip label="Tümü" selected={filter === 'all'} onPress={() => setFilter('all')} />
                <Chip label="Okunmamış" count={unreadCount ? String(unreadCount) : undefined} selected={filter === 'unread'} onPress={() => setFilter('unread')} />
                <Chip label="Siparişler" icon="bag-handle-outline" selected={filter === 'orders'} onPress={() => setFilter('orders')} />
              </ScrollView>
            ) : (
              <Text variant="footnote" color="textSecondary" style={styles.reqInfo}>
                Takip etmediğin kişilerden gelen mesajlar burada bekler. Kabul edene kadar karşı taraf mesajını gördüğünü bilmez.
              </Text>
            )}
          </View>
        }
        ListEmptyComponent={
          tab === 'messages' ? (
            q || filter !== 'all' ? (
              <EmptyState icon="search" title="Sonuç yok" message={q ? `"${q}" ile eşleşen bir sohbet bulunamadı.` : 'Bu filtrede gösterilecek sohbet yok.'} />
            ) : (
              <EmptyState
                icon="chatbubbles-outline"
                title="Henüz mesajın yok"
                message="Satıcılara ürünleri hakkında soru sor ya da siparişlerinle ilgili iletişime geç."
                actionLabel="Yeni mesaj"
                onAction={() => setComposeOpen(true)}
              />
            )
          ) : (
            <EmptyState icon="mail-unread-outline" title="Mesaj isteği yok" message="Takip etmediğin kişiler sana mesaj gönderdiğinde burada göreceksin." />
          )
        }
        renderItem={({ item }) =>
          item.kind === 'support' ? (
            <ConversationRow user={SUPPORT_USER} title="Mezatonline Destek" last={item.last} unread={item.unread} onPress={() => router.push(`/inbox/${SUPPORT_THREAD_ID}`)} />
          ) : (
            <ConversationRow
              user={item.user}
              last={item.last}
              unread={tab === 'requests' ? 0 : item.conv.unread}
              tag={orderTag(item.conv)}
              onPress={() => router.push(`/inbox/${item.conv.id}`)}
              onLongPress={() => {
                haptic.medium();
                setMenuFor({ conv: item.conv, user: item.user });
              }}
            />
          )
        }
      />

      <PressableScale
        onPress={() => setComposeOpen(true)}
        accessibilityRole="button"
        accessibilityLabel="Yeni mesaj"
        style={[styles.fab, { backgroundColor: colors.primary, bottom: insets.bottom + 16 }]}>
        <Icon name="create-outline" size={20} color={colors.onPrimary} />
        <Text variant="headline" color={colors.onPrimary}>
          Yeni mesaj
        </Text>
      </PressableScale>

      <ComposeSheet visible={composeOpen} onClose={() => setComposeOpen(false)} onPick={startChat} />
      <ActionSheet visible={!!menuFor} onClose={() => setMenuFor(null)} title={menuFor?.user.username} actions={menuActions} />
      <ConfirmSheet
        visible={!!toDelete}
        onClose={() => setToDelete(null)}
        icon="trash-outline"
        destructive
        title="Sohbet silinsin mi?"
        message="Bu sohbetteki tüm mesajlar senin için silinir. Bu işlem geri alınamaz."
        confirmLabel="Sohbeti sil"
        onConfirm={() => {
          if (toDelete) deleteConversation(toDelete.id);
          setToDelete(null);
          haptic.success();
          toast('Sohbet silindi', 'trash-outline');
        }}
      />
      <ConfirmSheet
        visible={!!toBlock}
        onClose={() => setToBlock(null)}
        icon="ban-outline"
        destructive
        title={`${toBlock?.user.username ?? ''} engellensin mi?`}
        message="Engellediğin kişi sana mesaj gönderemez, yayınlarına katılamaz ve seni takip edemez. Engellendiğine dair bildirim almaz."
        confirmLabel="Engelle"
        onConfirm={() => {
          if (toBlock) block(toBlock.user.id);
          setToBlock(null);
          haptic.success();
          toast.success('Kullanıcı engellendi', 'ban-outline');
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  search: { paddingHorizontal: SCREEN_PADDING, paddingBottom: 4 },
  chips: { gap: 8, paddingHorizontal: SCREEN_PADDING, paddingTop: 12, paddingBottom: 6 },
  reqInfo: { paddingHorizontal: SCREEN_PADDING, paddingTop: 12, paddingBottom: 4 },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: SCREEN_PADDING, marginTop: 12, padding: 14, borderRadius: radius.md },
  fab: {
    position: 'absolute',
    right: SCREEN_PADDING,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    height: 48,
    borderRadius: radius.pill,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
});
