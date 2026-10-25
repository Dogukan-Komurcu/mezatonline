/**
 * Gelen kutusu yardımcı store'u:
 *  - Mezatonline Destek sohbeti (kendi otomatik yanıtlarıyla)
 *  - Mesaj istekleri (takip etmediğin kişilerden gelen ilk mesajlar)
 * Asıl DM'ler `@/store/inbox` içinde tutulur.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { getSellers, getUser, SELLER_USERS, BUYER_USERS } from '@/data';
import { uid } from '@/lib/rng';
import { useInboxStore } from '@/store/inbox';
import { persistStorage, storeKey } from '@/store/storage';
import type { Conversation, DirectMessage, ID, User } from '@/types';

export const SUPPORT_THREAD_ID = 'support';

/** Destek ekibinin profil kartı (gerçek kullanıcı değil) */
export const SUPPORT_USER: User = {
  id: 'mezat_support',
  username: 'mezatonline_destek',
  displayName: 'Mezatonline Destek',
  avatar: '',
  bio: '',
  city: 'İstanbul',
  isSeller: false,
  badges: ['verified'],
  rating: 0,
  reviewCount: 0,
  followers: 0,
  following: 0,
  itemsSold: 0,
  avgShipDays: 0,
  joinedAt: '2024-01-01T00:00:00.000Z',
  categoryIds: [],
};

const AGENTS = ['Elif', 'Mert', 'Zeynep', 'Kaan'];

function supportReply(text: string, isFirst: boolean, agent: string): string {
  const t = text.toLocaleLowerCase('tr-TR');
  const intro = isFirst ? `Merhaba, ben ${agent} 👋 ` : '';
  if (/kargo|nerede|takip|gelmedi|teslim/.test(t))
    return `${intro}Siparişinin durumunu Aktivite → Siparişlerim'den takip edebilirsin. Satıcılar 2 iş günü içinde kargolamakla yükümlü; gecikme varsa sipariş numaranı yazarsan hemen kontrol edeyim 📦`;
  if (/iade|cayma|geri|bozuk|hasar|sahte/.test(t))
    return `${intro}Üzgünüm, böyle bir durum yaşamana. Sipariş detayındaki "Bu siparişle ilgili yardım al" adımından fotoğraflarla talep oluşturabilirsin. Alıcı Koruması kapsamında paran güvende 🛡️`;
  if (/iptal/.test(t))
    return `${intro}Satın alımdan sonraki 24 saat içinde ve kargo etiketi oluşmadan iptal talep edebilirsin. Satıcının yanıt vermek için 2 iş günü var. Hangi sipariş için yardımcı olayım?`;
  if (/ödeme|kart|çekim|para|provizyon|ücret/.test(t))
    return `${intro}Ödemeler 3D Secure ile korunur ve yalnızca kazandığında ya da satın aldığında çekim yapılır. Doğrulama için alınan ₺1 / ₺250 provizyonlar 24 saat içinde otomatik iptal edilir 💳`;
  if (/teklif|pey|mezat|açık artırma/.test(t))
    return `${intro}Teklifler bağlayıcıdır ve geri alınamaz. Yanlışlıkla verdiğin bir teklif varsa 2 saat içinde yayın adını ve ürünü yazarsan satıcıyla birlikte inceleyelim.`;
  if (/hesap|şifre|giriş|kullanıcı adı|telefon/.test(t))
    return `${intro}Hesap bilgilerini Hesap → Profili düzenle'den güncelleyebilirsin. Telefon numarası değişikliği için güvenlik doğrulaması gerekiyor; kayıtlı e-posta adresini yazar mısın?`;
  if (/teşekkür|sağ ol|sağol/.test(t)) return 'Rica ederim! Başka bir konuda yardım gerekirse buradayız 💛';
  return `${intro}Mesajın için teşekkürler! Konuyu biraz daha detaylandırabilir misin? Sipariş numaran varsa eklemen işimizi hızlandırır.`;
}

type InboxExtrasState = {
  // ── Destek
  supportMessages: DirectMessage[];
  supportUnread: number;
  supportTyping: boolean;
  supportAgent: string;
  startSupport: () => void;
  sendSupport: (text: string, image?: string) => void;
  markSupportRead: () => void;
  // ── Mesaj istekleri
  requestsSeeded: boolean;
  requestIds: ID[];
  acceptedRequestIds: ID[];
  acceptRequest: (id: ID) => void;
  removeRequest: (id: ID) => void;
};

export const useInboxExtras = create<InboxExtrasState>()(
  persist(
    (set, get) => ({
      supportMessages: [],
      supportUnread: 0,
      supportTyping: false,
      supportAgent: AGENTS[0],
      startSupport: () => {
        if (get().supportMessages.length) return;
        const agent = AGENTS[Math.floor(Math.random() * AGENTS.length)];
        set({
          supportAgent: agent,
          supportMessages: [
            {
              id: uid('sp'),
              fromMe: false,
              text: "Merhaba 👋 Mezatonline Destek'e hoş geldin! Sipariş, ödeme, iade ya da hesabınla ilgili her konuda yardımcı olabiliriz. Nasıl yardımcı olalım?",
              createdAt: new Date().toISOString(),
            },
          ],
        });
      },
      sendSupport: (text, image) => {
        const isFirst = !get().supportMessages.some((m) => m.fromMe);
        const msg: DirectMessage = { id: uid('sp'), fromMe: true, text, image, createdAt: new Date().toISOString() };
        set((s) => ({ supportMessages: [...s.supportMessages, msg] }));
        setTimeout(() => set({ supportTyping: true }), 900);
        setTimeout(
          () => {
            const reply: DirectMessage = {
              id: uid('sp'),
              fromMe: false,
              text: image && !text ? 'Fotoğrafı aldım, teşekkürler 📸 İnceleyip birkaç dakika içinde dönüyorum.' : supportReply(text, isFirst, get().supportAgent),
              createdAt: new Date().toISOString(),
            };
            set((s) => ({ supportTyping: false, supportMessages: [...s.supportMessages, reply], supportUnread: s.supportUnread + 1 }));
          },
          2600 + Math.floor(Math.random() * 1800),
        );
      },
      markSupportRead: () => set({ supportUnread: 0 }),
      requestsSeeded: false,
      requestIds: [],
      acceptedRequestIds: [],
      acceptRequest: (id) => set((s) => ({ acceptedRequestIds: s.acceptedRequestIds.includes(id) ? s.acceptedRequestIds : [...s.acceptedRequestIds, id] })),
      removeRequest: (id) => set((s) => ({ requestIds: s.requestIds.filter((x) => x !== id) })),
    }),
    {
      name: storeKey('inbox-extras'),
      storage: persistStorage,
      partialize: (s) => ({
        supportMessages: s.supportMessages,
        supportUnread: s.supportUnread,
        supportAgent: s.supportAgent,
        requestsSeeded: s.requestsSeeded,
        requestIds: s.requestIds,
        acceptedRequestIds: s.acceptedRequestIds,
      }),
    },
  ),
);

// ─── Mesaj isteklerini ilk açılışta oluştur ───────────────────────────────────

const ago = (min: number) => new Date(Date.now() - min * 60_000).toISOString();

function buildRequestSeeds(): Conversation[] {
  const unfollowedSeller = getSellers().find((s) => !['u1', 'u3', 'u7', 'u12'].includes(s.id)) ?? SELLER_USERS[5];
  const collector = BUYER_USERS[2];
  const tcg = BUYER_USERS[5];
  return [
    {
      id: 'req_1',
      userId: unfollowedSeller.id,
      unread: 0,
      messages: [
        { id: 'req_1_m1', fromMe: false, text: `Merhaba! Ben ${unfollowedSeller.displayName} 👋 Bu akşam 21:00'de büyük bir yayın yapıyorum, ₺1'den başlayan mezatlar olacak. Hatırlatıcı kurmayı unutma 🎁`, createdAt: ago(95) },
      ],
    },
    {
      id: 'req_2',
      userId: tcg.id,
      unread: 0,
      messages: [
        { id: 'req_2_m1', fromMe: false, text: 'Selam! Dünkü yayında Charizard ex için sen de teklif veriyordun sanırım 😄', createdAt: ago(60 * 26) },
        { id: 'req_2_m2', fromMe: false, text: 'Elinde fazla 151 seti kartı varsa takas yapabiliriz, ilgilenir misin?', createdAt: ago(60 * 26 - 1) },
      ],
    },
    {
      id: 'req_3',
      userId: collector.id,
      unread: 0,
      messages: [{ id: 'req_3_m1', fromMe: false, text: 'Merhaba, Osmanlı sikke koleksiyonunu gördüm, çok güzel! Hangi satıcıdan aldığını sorabilir miyim? 🙂', createdAt: ago(60 * 72) }],
    },
  ];
}

function seedNow() {
  const extras = useInboxExtras.getState();
  if (extras.requestsSeeded) return;
  const seeds = buildRequestSeeds().filter((c) => !!getUser(c.userId));
  const existing = new Set(useInboxStore.getState().conversations.map((c) => c.id));
  const fresh = seeds.filter((c) => !existing.has(c.id));
  if (fresh.length) useInboxStore.setState((s) => ({ conversations: [...s.conversations, ...fresh] }));
  useInboxExtras.setState({ requestsSeeded: true, requestIds: seeds.map((c) => c.id) });
}

/** Mesaj isteklerini (bir kez) gelen kutusuna ekler. Store'lar yüklendikten sonra çalışır. */
export function ensureRequestsSeeded() {
  const ready = () => useInboxExtras.persist.hasHydrated() && useInboxStore.persist.hasHydrated();
  if (ready()) {
    seedNow();
    return () => {};
  }
  const unsubs = [useInboxExtras.persist.onFinishHydration(() => ready() && seedNow()), useInboxStore.persist.onFinishHydration(() => ready() && seedNow())];
  return () => unsubs.forEach((u) => u());
}

/** Konuşma şu an bir mesaj isteği mi (kabul edilmemiş + hiç yanıt verilmemiş) */
export function isRequest(c: Conversation, requestIds: ID[], acceptedIds: ID[]): boolean {
  return requestIds.includes(c.id) && !acceptedIds.includes(c.id) && !c.messages.some((m) => m.fromMe);
}

/** Konuşmanın karşı tarafı */
export function chatUser(userId: ID): User | undefined {
  return getUser(userId);
}
