import { Image } from 'expo-image';
import { router, useIsFocused, useLocalSearchParams } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Linking, Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, EmptyState, Header, Icon, IconButton, LiveBadge, PressableScale, Screen, Text, toast } from '@/components/ui';
import { getLiveShowOf, getUser } from '@/data';
import { ActionSheet, ConfirmSheet, type SheetAction } from '@/features/account/ui';
import { useAccountStore } from '@/features/account/store';
import { ChatAvatar, ChatIntro, ChatView, Composer } from '@/features/inbox/components';
import { isRequest, SUPPORT_THREAD_ID, SUPPORT_USER, useInboxExtras } from '@/features/inbox/store';
import { ReportSheet } from '@/features/shared/sheets';
import { formatRating, formatTRY } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { useInboxStore } from '@/store/inbox';
import { ORDER_STATUS_LABELS, useOrdersStore } from '@/store/orders';
import { useSocialStore } from '@/store/social';
import { radius, SCREEN_PADDING, useTheme } from '@/theme';
import type { User } from '@/types';

const SAFETY_NOTE = 'Güvenliğin için ödemeleri yalnızca Mezatonline üzerinden yap. Satıcılar senden asla kart bilgisi, IBAN ya da platform dışı ödeme istemez.';
const SUPPORT_QUICK = ['Siparişim nerede?', 'İade talebi oluşturmak istiyorum', 'Ödeme sorunu yaşıyorum', 'Hesabımla ilgili yardım'];

export default function ConversationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  if (id === SUPPORT_THREAD_ID) return <SupportChat />;
  return <DirectChat id={id ?? ''} />;
}

// ─── Başlık ──────────────────────────────────────────────────────────────────

function ChatHeader({ user, subtitle, onPressUser, right, live }: { user: User; subtitle: string; onPressUser?: () => void; right?: ReactNode; live?: () => void }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top, backgroundColor: colors.bg, borderBottomColor: colors.border }]}>
      <View style={styles.headerRow}>
        <IconButton name="chevron-back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/inbox'))} accessibilityLabel="Geri" />
        <PressableScale scaleTo={0.98} disabled={!onPressUser} onPress={onPressUser} style={styles.headerUser} accessibilityRole="button" accessibilityLabel={`${user.username} profili`}>
          <ChatAvatar user={user} size={36} />
          <View style={{ flex: 1 }}>
            <View style={styles.nameRow}>
              <Text variant="headline" numberOfLines={1} style={{ flexShrink: 1 }}>
                {user.id === SUPPORT_USER.id ? user.displayName : user.username}
              </Text>
              {user.badges.includes('verified') ? <Icon name="checkmark-circle" size={14} color="info" /> : null}
            </View>
            <Text variant="footnote" color="textSecondary" numberOfLines={1}>
              {subtitle}
            </Text>
          </View>
        </PressableScale>
        {live ? (
          <PressableScale onPress={live} accessibilityRole="button" accessibilityLabel="Canlı yayına git">
            <LiveBadge size="md" />
          </PressableScale>
        ) : null}
        {right}
      </View>
    </View>
  );
}

// ─── Kişiler arası sohbet ────────────────────────────────────────────────────

function DirectChat({ id }: { id: string }) {
  const { colors } = useTheme();
  const focused = useIsFocused();
  const conv = useInboxStore((s) => s.conversations.find((c) => c.id === id));
  const sendMessage = useInboxStore((s) => s.sendMessage);
  const markRead = useInboxStore((s) => s.markConversationRead);
  const deleteConversation = useInboxStore((s) => s.deleteConversation);
  const order = useOrdersStore((s) => (conv?.orderId ? s.orders.find((o) => o.id === conv.orderId) : undefined));
  const blockedIds = useSocialStore((s) => s.blockedIds);
  const block = useSocialStore((s) => s.block);
  const unblock = useSocialStore((s) => s.unblock);
  const dmEnabled = useAccountStore((s) => s.dmEnabled);
  const setFlag = useAccountStore((s) => s.setFlag);
  const requestIds = useInboxExtras((s) => s.requestIds);
  const acceptedIds = useInboxExtras((s) => s.acceptedRequestIds);
  const acceptRequest = useInboxExtras((s) => s.acceptRequest);
  const removeRequest = useInboxExtras((s) => s.removeRequest);

  const [awaiting, setAwaiting] = useState<number | null>(null);
  const [typing, setTyping] = useState(false);
  const [menu, setMenu] = useState(false);
  const [report, setReport] = useState(false);
  const [confirmBlock, setConfirmBlock] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const user = conv ? getUser(conv.userId) : undefined;
  const msgCount = conv?.messages.length ?? 0;
  const last = conv?.messages[msgCount - 1];

  // Ekrandayken gelen mesajları okundu say
  useEffect(() => {
    if (focused && msgCount) markRead(id);
  }, [focused, msgCount, id, markRead]);

  // Otomatik yanıt beklenirken "yazıyor…" göstergesi
  useEffect(() => {
    if (awaiting === null) return;
    if (last && !last.fromMe && new Date(last.createdAt).getTime() >= awaiting) {
      setAwaiting(null);
      setTyping(false);
      haptic.light();
      return;
    }
    const t1 = setTimeout(() => setTyping(true), 800);
    const t2 = setTimeout(() => {
      setAwaiting(null);
      setTyping(false);
    }, 7000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [awaiting, last]);

  if (!conv || !user) {
    return (
      <Screen>
        <Header title="Mesajlar" />
        <EmptyState icon="chatbubbles-outline" title="Sohbet bulunamadı" message="Bu sohbet silinmiş ya da artık erişilebilir değil." actionLabel="Mesajlara dön" onAction={() => router.replace('/inbox')} />
      </Screen>
    );
  }

  const blocked = blockedIds.includes(user.id);
  const request = isRequest(conv, requestIds, acceptedIds);
  const liveShow = user.isSeller ? getLiveShowOf(user.id) : undefined;
  const openProfile = () => router.push(`/user/${user.username}`);

  const onSend = (text: string, image?: string) => {
    sendMessage(conv.id, text, image);
    setAwaiting(Date.now());
  };

  const actions: SheetAction[] = [
    { label: 'Profili görüntüle', icon: 'person-circle-outline', onPress: openProfile },
    {
      label: 'Okunmadı olarak işaretle',
      icon: 'mail-unread-outline',
      onPress: () => {
        router.back();
        setTimeout(() => useInboxStore.setState((s) => ({ conversations: s.conversations.map((c) => (c.id === conv.id ? { ...c, unread: Math.max(1, c.unread) } : c)) })), 350);
      },
    },
    blocked
      ? {
          label: 'Engeli kaldır',
          icon: 'ban-outline',
          onPress: () => {
            unblock(user.id);
            toast.success('Engel kaldırıldı');
          },
        }
      : { label: 'Engelle', icon: 'ban-outline', onPress: () => setConfirmBlock(true) },
    { label: 'Şikayet et', icon: 'flag-outline', onPress: () => setReport(true) },
    { label: 'Sohbeti sil', icon: 'trash-outline', destructive: true, onPress: () => setConfirmDelete(true) },
  ];

  let footer: ReactNode;
  if (blocked) {
    footer = (
      <Notice icon="ban-outline" title="Bu kullanıcıyı engelledin" message="Engeli kaldırana kadar birbirinize mesaj gönderemezsiniz.">
        <Button
          title="Engeli kaldır"
          variant="secondary"
          size="sm"
          onPress={() => {
            unblock(user.id);
            toast.success('Engel kaldırıldı');
          }}
        />
      </Notice>
    );
  } else if (!dmEnabled) {
    footer = (
      <Notice icon="chatbubbles-outline" title="Doğrudan mesajların kapalı" message="Mesaj gönderip alabilmek için Hesap Kontrolleri'nden doğrudan mesajları aç.">
        <Button
          title="Aç"
          size="sm"
          onPress={() => {
            setFlag('dmEnabled', true);
            toast.success('Doğrudan mesajlar açıldı', 'chatbubbles');
          }}
        />
      </Notice>
    );
  } else if (request) {
    footer = (
      <Notice icon="mail-unread-outline" title={`${user.username} sana mesaj göndermek istiyor`} message="Kabul edersen yanıt verebilirsin ve sohbet Mesajlar'a taşınır. Kabul edene kadar mesajı gördüğünü bilmez.">
        <View style={styles.reqButtons}>
          <Button
            title="Sil"
            variant="outline"
            size="sm"
            style={{ flex: 1 }}
            onPress={() => {
              router.back();
              setTimeout(() => {
                removeRequest(conv.id);
                deleteConversation(conv.id);
              }, 300);
              toast('İstek silindi', 'trash-outline');
            }}
          />
          <Button title="Engelle" variant="outline" size="sm" style={{ flex: 1 }} onPress={() => setConfirmBlock(true)} />
          <Button
            title="Kabul et"
            size="sm"
            style={{ flex: 1.2 }}
            onPress={() => {
              acceptRequest(conv.id);
              haptic.success();
              toast.success('İstek kabul edildi', 'checkmark-circle');
            }}
          />
        </View>
      </Notice>
    );
  } else {
    footer = <Composer onSend={onSend} placeholder={user.isSeller ? 'Satıcıya mesaj yaz…' : 'Mesaj yaz…'} />;
  }

  return (
    <Screen>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ChatHeader
          user={user}
          subtitle={user.isSeller ? `Satıcı · ★ ${formatRating(user.rating)} · ${user.avgShipDays < 1.5 ? 'Hızlı kargo' : `${user.city}`}` : user.city}
          onPressUser={openProfile}
          live={liveShow ? () => router.push(`/live/${liveShow.id}`) : undefined}
          right={<IconButton name="ellipsis-horizontal" onPress={() => setMenu(true)} accessibilityLabel="Seçenekler" />}
        />
        {order ? (
          <PressableScale scaleTo={0.99} onPress={() => router.push(`/orders/${order.id}`)} style={[styles.order, { backgroundColor: colors.surface }]} accessibilityRole="button">
            <Image source={{ uri: order.productImage }} style={[styles.orderImg, { backgroundColor: colors.skeleton }]} contentFit="cover" cachePolicy="memory-disk" />
            <View style={{ flex: 1 }}>
              <Text variant="footnote" color="textSecondary" numberOfLines={1}>
                Sipariş {order.number} · {ORDER_STATUS_LABELS[order.status]}
              </Text>
              <Text variant="callout" weight="700" numberOfLines={1}>
                {order.productTitle}
              </Text>
            </View>
            <Text variant="callout" weight="700">
              {formatTRY(order.total)}
            </Text>
            <Icon name="chevron-forward" size={16} color="textTertiary" />
          </PressableScale>
        ) : null}
        <ChatView messages={conv.messages} partner={user} typing={typing} header={<ChatIntro user={user} onProfile={openProfile} note={SAFETY_NOTE} />} footer={footer} />
      </KeyboardAvoidingView>

      <ActionSheet visible={menu} onClose={() => setMenu(false)} title={user.username} actions={actions} />
      <ReportSheet visible={report} onClose={() => setReport(false)} subject={`@${user.username} adlı kullanıcının mesajları`} />
      <ConfirmSheet
        visible={confirmBlock}
        onClose={() => setConfirmBlock(false)}
        icon="ban-outline"
        destructive
        title={`${user.username} engellensin mi?`}
        message="Engellediğin kişi sana mesaj gönderemez, yayınlarına katılamaz ve seni takip edemez. Engellendiğine dair bildirim almaz."
        confirmLabel="Engelle"
        onConfirm={() => {
          block(user.id);
          if (request) removeRequest(conv.id);
          setConfirmBlock(false);
          haptic.success();
          toast.success(`${user.username} engellendi`, 'ban-outline');
        }}
      />
      <ConfirmSheet
        visible={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        icon="trash-outline"
        destructive
        title="Sohbet silinsin mi?"
        message="Bu sohbetteki tüm mesajlar senin için silinir. Bu işlem geri alınamaz."
        confirmLabel="Sohbeti sil"
        onConfirm={() => {
          setConfirmDelete(false);
          router.back();
          setTimeout(() => deleteConversation(conv.id), 300);
          toast('Sohbet silindi', 'trash-outline');
        }}
      />
    </Screen>
  );
}

// ─── Destek sohbeti ──────────────────────────────────────────────────────────

function SupportChat() {
  const focused = useIsFocused();
  const messages = useInboxExtras((s) => s.supportMessages);
  const typing = useInboxExtras((s) => s.supportTyping);
  const agent = useInboxExtras((s) => s.supportAgent);
  const startSupport = useInboxExtras((s) => s.startSupport);
  const sendSupport = useInboxExtras((s) => s.sendSupport);
  const markSupportRead = useInboxExtras((s) => s.markSupportRead);
  const [menu, setMenu] = useState(false);

  useEffect(() => {
    startSupport();
  }, [startSupport]);

  useEffect(() => {
    if (focused) markSupportRead();
  }, [focused, messages.length, markSupportRead]);

  const asked = messages.some((m) => m.fromMe);

  return (
    <Screen>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ChatHeader
          user={SUPPORT_USER}
          subtitle={asked ? `${agent} · Destek uzmanı` : 'Genellikle birkaç dakika içinde yanıt verir'}
          right={<IconButton name="ellipsis-horizontal" onPress={() => setMenu(true)} accessibilityLabel="Seçenekler" />}
        />
        <ChatView
          messages={messages}
          partner={SUPPORT_USER}
          typing={typing}
          header={<ChatIntro user={SUPPORT_USER} note="Mezatonline ekibi senden asla şifre, kart bilgisi ya da doğrulama kodu istemez. Resmi e-postalarımız yalnızca @mezatonline.com uzantılıdır." />}
          footer={<Composer onSend={(t, img) => sendSupport(t, img)} placeholder="Destek ekibine yaz…" quickReplies={asked ? undefined : SUPPORT_QUICK} />}
        />
      </KeyboardAvoidingView>
      <ActionSheet
        visible={menu}
        onClose={() => setMenu(false)}
        title="Mezatonline Destek"
        actions={[
          { label: 'Yardım Merkezi', icon: 'help-circle-outline', subtitle: 'Sık sorulan sorulara göz at', onPress: () => router.push('/settings/help') },
          {
            label: 'E-posta ile yaz',
            icon: 'mail-outline',
            subtitle: 'destek@mezatonline.com',
            onPress: () => Linking.openURL('mailto:destek@mezatonline.com?subject=Mezatonline%20Destek').catch(() => toast.error('E-posta uygulaması açılamadı')),
          },
          { label: 'Yasal & KVKK', icon: 'document-text-outline', onPress: () => router.push('/settings/legal') },
        ]}
      />
    </Screen>
  );
}

// ─── Mesaj kutusu yerine bilgi kartı ─────────────────────────────────────────

function Notice({ icon, title, message, children }: { icon: 'ban-outline' | 'chatbubbles-outline' | 'mail-unread-outline'; title: string; message: string; children?: ReactNode }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.notice, { borderTopColor: colors.border, backgroundColor: colors.bg, paddingBottom: Math.max(insets.bottom, 12) }]}>
      <View style={styles.noticeHead}>
        <Icon name={icon} size={20} color="textSecondary" />
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="callout" weight="700" numberOfLines={2}>
            {title}
          </Text>
          <Text variant="footnote" color="textSecondary">
            {message}
          </Text>
        </View>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { borderBottomWidth: StyleSheet.hairlineWidth },
  headerRow: { height: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, gap: 4 },
  headerUser: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  order: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: SCREEN_PADDING, marginTop: 8, padding: 10, borderRadius: radius.md },
  orderImg: { width: 44, height: 44, borderRadius: radius.sm },
  notice: { borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: SCREEN_PADDING, paddingTop: 12, gap: 12 },
  noticeHead: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  reqButtons: { flexDirection: 'row', gap: 8 },
});
