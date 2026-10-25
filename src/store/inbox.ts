import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { AUTO_REPLIES, SEED_CONVERSATIONS, SEED_NOTIFICATIONS } from '@/data/seeds';
import { random, uid } from '@/lib/rng';
import type { AppNotification, Conversation, ID } from '@/types';

import { persistStorage, storeKey } from './storage';

type InboxState = {
  notifications: AppNotification[];
  conversations: Conversation[];
  pushNotification: (n: Omit<AppNotification, 'id' | 'createdAt' | 'read'>) => void;
  markNotificationRead: (id: ID) => void;
  markAllNotificationsRead: () => void;
  /** Kullanıcıyla konuşmayı getirir, yoksa oluşturur */
  ensureConversation: (userId: ID, orderId?: ID) => Conversation;
  sendMessage: (conversationId: ID, text: string, image?: string) => void;
  markConversationRead: (conversationId: ID) => void;
  deleteConversation: (conversationId: ID) => void;
};

export const useInboxStore = create<InboxState>()(
  persist(
    (set, get) => ({
      notifications: SEED_NOTIFICATIONS,
      conversations: SEED_CONVERSATIONS,
      pushNotification: (n) =>
        set((s) => ({ notifications: [{ ...n, id: uid('n'), createdAt: new Date().toISOString(), read: false }, ...s.notifications].slice(0, 100) })),
      markNotificationRead: (id) => set((s) => ({ notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) })),
      markAllNotificationsRead: () => set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) })),
      ensureConversation: (userId, orderId) => {
        const existing = get().conversations.find((c) => c.userId === userId);
        if (existing) return existing;
        const conv: Conversation = { id: uid('c'), userId, messages: [], unread: 0, orderId };
        set((s) => ({ conversations: [conv, ...s.conversations] }));
        return conv;
      },
      sendMessage: (conversationId, text, image) => {
        const msg = { id: uid('dm'), fromMe: true, text, image, createdAt: new Date().toISOString() };
        set((s) => ({
          conversations: s.conversations
            .map((c) => (c.id === conversationId ? { ...c, messages: [...c.messages, msg] } : c))
            .sort((a, b) => (a.id === conversationId ? -1 : b.id === conversationId ? 1 : 0)),
        }));
        // Karşı taraftan otomatik cevap (simülasyon)
        setTimeout(() => {
          const reply = { id: uid('dm'), fromMe: false, text: random.pick(AUTO_REPLIES), createdAt: new Date().toISOString() };
          set((s) => ({
            conversations: s.conversations.map((c) => (c.id === conversationId ? { ...c, messages: [...c.messages, reply], unread: c.unread + 1 } : c)),
          }));
        }, random.int(1800, 4500));
      },
      markConversationRead: (conversationId) =>
        set((s) => ({ conversations: s.conversations.map((c) => (c.id === conversationId ? { ...c, unread: 0 } : c)) })),
      deleteConversation: (conversationId) => set((s) => ({ conversations: s.conversations.filter((c) => c.id !== conversationId) })),
    }),
    { name: storeKey('inbox'), storage: persistStorage },
  ),
);

export const useUnreadNotificationCount = () => useInboxStore((s) => s.notifications.filter((n) => !n.read).length);
export const useUnreadMessageCount = () => useInboxStore((s) => s.conversations.reduce((sum, c) => sum + c.unread, 0));
