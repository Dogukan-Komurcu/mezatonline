/**
 * S86 — Satıcı canlı yayın konsolu (host görünümü).
 *
 * Kamera önizlemesi üzerinde: başlık (CANLI + süre + izleyici), anlık istatistikler, yayın notu,
 * çekiliş kartı, sohbet + moderasyon, sağ ray, sahnedeki ürün kartı ve Mağaza.
 * Simülasyon `useLiveShow` motorunun satıcı moduyla çalışır; mağaza satışları, bahşiş ve
 * takip olayları konsolda yerel olarak üretilir.
 */
import type { CameraType } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, router, useIsFocused, useLocalSearchParams, usePreventRemove } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, TextInput, useWindowDimensions, View, type TextInputInstance } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState, Header, Icon, IconButton, PressableScale, Text, toast } from '@/components/ui';
import { getShow } from '@/data';
import { makeBots } from '@/features/live/bots';
import type { SoldItem } from '@/features/live/engine';
import { useLiveShow } from '@/features/live/useLiveShow';
import { shareLink } from '@/features/shared/sheets';
import { DEFAULT_AUCTION_DURATION, DEFAULT_COUNTER_BID_TIME } from '@/lib/auction';
import { formatTRY } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { random, uid } from '@/lib/rng';
import { ME_ID, useMe } from '@/store/auth';
import { useSellerStore } from '@/store/seller';
import { liveColors, radius, SCREEN_PADDING, useTheme } from '@/theme';
import type { ChatMessage, Order, Product, Show } from '@/types';

import { CameraStage, useCameraAccess } from './camera';
import { Confetti } from './Confetti';
import { HostChat, type ChatFilter } from './HostChat';
import { FloatingHearts, GiveawayBanner, HostHeader, NotesSticky, PinnedMessage, RightRail, StatsStrip } from './HostOverlays';
import {
  dataShowProducts,
  demoProducts,
  formatTimer,
  isQuestion,
  makeSurprisePrize,
  remainingOf as baseRemaining,
  resolveShowProductIds,
  sampleListingInputs,
  useIsSeller,
  useKeyboardHeight,
  useNow,
  ZOOM_LEVELS,
  type ShowSummaryData,
} from './helpers';
import { LotCard } from './LotCard';
import { FlashSaleSheet, GiveawaySheet, StartAuctionSheet, type AuctionSettings } from './SaleSheets';
import { ShopSheet, type ShopTab } from './ShopSheet';
import { ShowSummary } from './ShowSummary';
import {
  EndShowSheet,
  ModeratorsSheet,
  MoreSheet,
  NotesSheet,
  PinMessageSheet,
  PROMO_DURATION_SEC,
  PromoteSheet,
  RaidSheet,
  UserActionsSheet,
  ViewersSheet,
  type PromoState,
  type RaidTarget,
  type UserTarget,
} from './ToolSheets';

type SheetKind = 'shop' | 'auction' | 'flash' | 'giveaway' | 'viewers' | 'more' | 'pin' | 'mods' | 'raid' | 'promote' | 'notes' | 'user' | 'end';

const SHEET_SWAP_MS = 280;
const ACTIVITY_TYPES = new Set<ChatMessage['type']>(['won', 'purchase', 'tip', 'follow', 'giveaway_won']);
const DEFAULT_NOTES = 'Hoş geldin! 👋 Takip etmeyi unutma.\nKargo 2 iş günü içinde çıkar 📦\nHer 50 izleyicide çekiliş 🎁';

// ─── Rota: yayını çöz ────────────────────────────────────────────────────────

export function HostConsoleScreen() {
  const params = useLocalSearchParams<{ id: string; prova?: string; temp?: string }>();
  const isSeller = useIsSeller();
  const myShow = useSellerStore((s) => s.shows.find((x) => x.id === params.id));
  // Prova için açılan geçici yayın kapanışta silinir; özet ekranı açıkken kaybolmasın
  const [frozen] = useState<Show | undefined>(() => myShow ?? getShow(params.id));
  const show = myShow ?? getShow(params.id) ?? frozen;
  if (!isSeller) return <Redirect href="/seller/apply" />;
  if (!show) return <ShowNotFound />;
  return <HostConsole key={show.id} show={show} rehearsal={params.prova === '1'} temporary={params.temp === '1'} />;
}

function ShowNotFound() {
  const { colors } = useTheme();
  return (
    <View style={[styles.flex, { backgroundColor: colors.bg }]}>
      <Header title="Canlı yayın" back="close" onBack={() => router.dismissTo('/sell')} />
      <EmptyState
        icon="videocam-off-outline"
        title="Yayın bulunamadı"
        message="Bu yayın silinmiş ya da sana ait değil. Satıcı Paneli'nden yeni bir yayın başlatabilirsin."
        actionLabel="Canlıya geç"
        onAction={() => router.replace('/seller/go-live')}
      />
    </View>
  );
}

// ─── Konsol ──────────────────────────────────────────────────────────────────

function HostConsole({ show, rehearsal, temporary }: { show: Show; rehearsal: boolean; temporary: boolean }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { height: screenH } = useWindowDimensions();
  const focused = useIsFocused();
  const me = useMe();
  const access = useCameraAccess();
  const keyboard = useKeyboardHeight();
  const isMyShow = show.sellerId === ME_ID;

  const listings = useSellerStore((s) => s.listings);
  const recordSale = useSellerStore((s) => s.recordSale);
  const addSession = useSellerStore((s) => s.addSession);
  const setShowStatus = useSellerStore((s) => s.setShowStatus);
  const createListing = useSellerStore((s) => s.createListing);
  const cancelShow = useSellerStore((s) => s.cancelShow);

  // ── Ürünler ──
  const [initialIds] = useState(() => new Set(isMyShow ? resolveShowProductIds(show, listings) : []));
  const [demo] = useState(() => (rehearsal && isMyShow && initialIds.size === 0 ? demoProducts(show.categoryId) : []));
  const listingById = new Map(listings.map((p) => [p.id, p]));
  const linked = isMyShow
    ? listings.filter((p) => initialIds.has(p.id) || p.showId === show.id || show.productIds.includes(p.id))
    : [...dataShowProducts(show.id), ...listings.filter((p) => p.showId === show.id)];
  const products = linked.length ? linked : demo;

  // ── Motor ──
  const registerSale = (item: SoldItem, source: Order['source']) => {
    if (!rehearsal) recordSale({ product: item.product, price: item.price, buyerUsername: item.winner.username, showId: show.id, source });
    haptic.success();
    toast.success(`${rehearsal ? 'Prova satışı' : 'Satıldı!'} ${formatTRY(item.price)} · @${item.winner.username}`, 'pricetag');
  };
  const [engineInit] = useState(() => ({ show, products }));
  const { state, engine } = useLiveShow({
    show: engineInit.show,
    seller: me,
    products: engineInit.products,
    me,
    mode: 'seller',
    active: true,
    events: {
      onSold: (item) => {
        if (!item.winner.isMe) registerSale(item, 'auction');
      },
    },
  });

  // ── Yerel durum ──
  const [facing, setFacing] = useState<CameraType>('front');
  const [muted, setMuted] = useState(false);
  const [zoomIndex, setZoomIndex] = useState(0);
  const [pinnedId, setPinnedId] = useState<string | undefined>();
  const [dismissedLotId, setDismissedLotId] = useState<string | undefined>();
  const [localEvents, setLocalEvents] = useState<ChatMessage[]>(() =>
    rehearsal
      ? [
          {
            id: uid('le'),
            type: 'system',
            username: 'Mezatonline',
            text: '🎓 Prova modundasın: yayının gizli, izleyiciler demo hesaplar ve satışlar kaydedilmez.',
            createdAt: Date.now(),
          },
        ]
      : [],
  );
  const [extraSold, setExtraSold] = useState<SoldItem[]>([]);
  const [flashLocalSold, setFlashLocalSold] = useState<Record<string, number>>({});
  const [mods, setMods] = useState<string[]>([]);
  const [removed, setRemoved] = useState<string[]>([]);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [slowMode, setSlowMode] = useState(0);
  const [notes, setNotes] = useState(() => (show.description && show.description.length > 24 ? show.description : DEFAULT_NOTES));
  const [notesCollapsed, setNotesCollapsed] = useState(false);
  const [shares, setShares] = useState(0);
  const [newFollowers, setNewFollowers] = useState(0);
  const [tips, setTips] = useState(0);
  const [promo, setPromo] = useState<PromoState | null>(null);
  const [promoCredit, setPromoCredit] = useState(500);
  const [chatFilter, setChatFilter] = useState<ChatFilter>('all');
  const [draft, setDraft] = useState('');
  const [hiddenPinId, setHiddenPinId] = useState<string | undefined>();
  const [sheet, setSheet] = useState<SheetKind | null>(null);
  const [shopTab, setShopTab] = useState<ShopTab>('auction');
  const [auctionTarget, setAuctionTarget] = useState<Product | undefined>();
  const [flashTarget, setFlashTarget] = useState<Product | undefined>();
  const [giveawayPrizeId, setGiveawayPrizeId] = useState<string | undefined>();
  const [userTarget, setUserTarget] = useState<UserTarget | undefined>();
  const [raidQuery, setRaidQuery] = useState<string | undefined>();
  const [auctionDefaults, setAuctionDefaults] = useState<AuctionSettings>({ duration: DEFAULT_AUCTION_DURATION, counterBidTime: DEFAULT_COUNTER_BID_TIME, suddenDeath: false });
  const [summary, setSummary] = useState<ShowSummaryData | null>(null);
  const [hearts, setHearts] = useState<number[]>([]);
  const [confetti, setConfetti] = useState(0);
  const [peak, setPeak] = useState(0);
  const [bots] = useState(() => makeBots(40));
  const inputRef = useRef<TextInputInstance>(null);
  const seenRef = useRef<Set<string> | null>(null);
  const heartSeq = useRef(0);
  const simRef = useRef<() => void>(() => {});

  const ended = !!summary || state.ended;
  const now = useNow(1000, !summary);

  // ── Türetilmiş değerler ──
  const elapsedSec = (now - state.startedAt) / 1000;
  const promoActive = !!promo && promo.endsAt > now;
  const promoBonus = promo && promoActive ? Math.round(state.viewers * 0.45 * Math.min(1, (now - promo.startedAt) / 45_000)) : 0;
  const viewers = state.viewers + promoBonus;
  const peakViewers = Math.max(state.peakViewers, peak, viewers);

  const allSold = [...state.sold, ...extraSold].sort((a, b) => b.at - a.at);
  const paidSold = allSold.filter((s) => s.via !== 'giveaway');
  const gross = paidSold.reduce((t, s) => t + s.price, 0);
  const itemsSold = paidSold.length;
  const buyers = Array.from(new Set(allSold.map((s) => s.winner.username)));
  const soldCounts: Record<string, number> = {};
  for (const s of allSold) soldCounts[s.product.id] = (soldCounts[s.product.id] ?? 0) + 1;

  /** Kalan stok: kayıtlı ilanlarda mağaza store'u, diğerlerinde (veri/demo/prova) bu yayındaki satışlar düşülür */
  const remainingOf = (p: Product) => {
    const latest = listingById.get(p.id);
    if (latest && !rehearsal) return baseRemaining(latest);
    return baseRemaining(latest ?? p, soldCounts[p.id] ?? 0);
  };

  const pinned = pinnedId ? products.find((p) => p.id === pinnedId) : undefined;
  const lotRunning = state.lot?.status === 'running';
  const flashRunning = state.flash?.status === 'running';
  const giveawayRunning = state.giveaway?.status === 'running';
  const availableCount = products.filter((p) => remainingOf(p) > 0).length;

  const merged = [...state.messages, ...localEvents].sort((a, b) => a.createdAt - b.createdAt);
  const chat = merged.filter((m) => {
    if (m.type === 'bid') return false;
    const isRemoved = !m.isMe && removed.includes(m.username);
    if (chatFilter === 'muted') return isRemoved;
    if (isRemoved) return false;
    if (chatFilter === 'questions') return m.type === 'chat' && !m.isMe && isQuestion(m.text);
    if (chatFilter === 'buyers') return buyers.includes(m.username);
    if (chatFilter === 'mods') return !!m.isMod || mods.includes(m.username);
    return true;
  });
  const activity = merged.filter((m) => ACTIVITY_TYPES.has(m.type));
  const pinnedMsg = state.pinned && state.pinned.id !== hiddenPinId ? state.pinned : undefined;
  const recentChatters = Array.from(
    new Map(
      merged
        .filter((m) => m.type === 'chat' && !m.isMe && !m.isSeller && !removed.includes(m.username))
        .slice(-30)
        .reverse()
        .map((m) => [m.username, { username: m.username, avatar: m.avatar }] as const),
    ).values(),
  );

  // ── Sheet yönetimi ──
  const openSheet = (next: SheetKind) => {
    if (sheet && sheet !== next) {
      setSheet(null);
      setTimeout(() => setSheet(next), SHEET_SWAP_MS);
    } else setSheet(next);
  };
  const closeSheet = () => setSheet(null);
  const openShop = (tab?: ShopTab) => {
    const fallback: ShopTab = lotRunning || !products.some((p) => p.format === 'auction') ? 'buy_now' : 'auction';
    setShopTab(tab ?? fallback);
    openSheet('shop');
  };

  const pushLocal = (m: Omit<ChatMessage, 'id' | 'createdAt'>) => {
    setLocalEvents((prev) => [...prev.slice(-80), { ...m, id: uid('le'), createdAt: Date.now() }]);
  };

  // ── Etkiler ──
  // Konsol doğrudan açıldıysa (Canlıya Geç atlanarak) planlı yayını canlıya al
  useEffect(() => {
    if (!rehearsal && isMyShow && show.status === 'scheduled') setShowStatus(show.id, 'live');
  }, [rehearsal, isMyShow, show.status, show.id, setShowStatus]);

  useEffect(() => {
    if (viewers > peak) setPeak(viewers);
  }, [viewers, peak]);

  // Botların flaş indirim alımları → sipariş
  useEffect(() => {
    if (!seenRef.current) seenRef.current = new Set();
    const seen = seenRef.current;
    const f = state.flash;
    for (const m of state.messages) {
      if (m.type !== 'purchase' || m.isMe || seen.has(m.id)) continue;
      seen.add(m.id);
      if (!f) continue;
      const item: SoldItem = {
        id: uid('sold'),
        product: f.product,
        price: m.amount ?? f.price,
        winner: { id: m.userId ?? m.username, username: m.username, avatar: m.avatar, isMe: false },
        via: 'flash_sale',
        at: m.createdAt,
      };
      setExtraSold((prev) => [item, ...prev]);
      registerSale(item, 'flash_sale');
    }
  }, [state.messages, state.flash, registerSale]);

  // Çekiliş bitti → kazanan siparişi + konfeti
  useEffect(() => {
    const g = state.giveaway;
    if (!g || g.status !== 'done' || !g.winner) return;
    if (!seenRef.current) seenRef.current = new Set();
    const key = 'gw:' + g.id;
    if (seenRef.current.has(key)) return;
    seenRef.current.add(key);
    if (!rehearsal) recordSale({ product: g.product, price: 0, buyerUsername: g.winner.username, showId: show.id, source: 'giveaway' });
    haptic.success();
    toast.success(`Çekilişi @${g.winner.username} kazandı! 🎉`, 'gift');
    setConfetti((c) => c + 1);
    const t = setTimeout(() => setConfetti(0), 3600);
    return () => clearTimeout(t);
  }, [state.giveaway, rehearsal, recordSale, show.id]);

  // Flaş indirim bitti → ürün normal fiyatla tekrar sahneye
  const flashDoneId = state.flash?.status === 'done' ? state.flash.id : undefined;
  useEffect(() => {
    const f = state.flash;
    if (!flashDoneId || !f) return;
    if (!seenRef.current) seenRef.current = new Set();
    const key = 'fl:' + flashDoneId;
    if (seenRef.current.has(key)) return;
    seenRef.current.add(key);
    const soldInFlash = extraSold.filter((s) => s.via === 'flash_sale' && s.product.id === f.product.id && s.at >= f.startedAt).length;
    toast(`Flaş indirim bitti · ${soldInFlash} satış`, 'flash-outline');
    const product = products.find((p) => p.id === f.product.id);
    if (product && !lotRunning && remainingOf(product) > 0) setPinnedId(product.id);
  }, [flashDoneId]);

  // Kalabalık tepkileri → uçan kalpler
  const crowd = state.crowdLikes ?? 0;
  useEffect(() => {
    if (!crowd || ended) return;
    heartSeq.current += 1;
    const id = heartSeq.current;
    setHearts((h) => [...h.slice(-7), id]);
    setTimeout(() => setHearts((h) => h.filter((x) => x !== id)), 1900);
  }, [crowd, ended]);

  // Yerel simülasyon: takip, bahşiş, mağaza (Hemen Al) satışları
  const buyLocal = (p: Product, price: number, via: 'buy_now' | 'flash_sale') => {
    const b = random.pick(bots);
    const item: SoldItem = { id: uid('sold'), product: p, price, winner: { id: b.id, username: b.username, avatar: b.avatar, isMe: false }, via, at: Date.now() };
    setExtraSold((prev) => [item, ...prev]);
    pushLocal({ type: 'purchase', userId: b.id, username: b.username, avatar: b.avatar, text: `satın aldı: ${p.title}`, amount: price });
    registerSale(item, via);
  };
  const simulate = () => {
    if (ended) return;
    const crowdFactor = Math.min(1.5, 0.25 + viewers / 160);
    if (viewers > 2 && random.chance(0.04 + Math.min(0.1, viewers / 3000))) {
      const b = random.pick(bots);
      pushLocal({ type: 'follow', userId: b.id, username: b.username, avatar: b.avatar, text: 'seni takip etti' });
      setNewFollowers((n) => n + 1);
    }
    if (viewers > 8 && random.chance(0.01)) {
      const b = random.pick(bots);
      const amount = random.pick([20, 50, 50, 100, 250]);
      pushLocal({ type: 'tip', userId: b.id, username: b.username, avatar: b.avatar, text: 'bahşiş gönderdi 💛', amount });
      setTips((t) => t + amount);
      haptic.light();
    }
    const f = state.flash;
    if (f && f.status === 'running') {
      // Motor son adedi izleyiciye bırakır; satıcı konsolunda son adet de satılabilsin
      const left = f.remaining - (flashLocalSold[f.id] ?? 0);
      if (left === 1 && random.chance(0.05 * crowdFactor)) {
        setFlashLocalSold((m) => ({ ...m, [f.id]: (m[f.id] ?? 0) + 1 }));
        buyLocal(f.product, f.price, 'flash_sale');
      }
      return;
    }
    if (pinned && pinned.format === 'buy_now' && remainingOf(pinned) > 0) {
      if (random.chance(0.045 * crowdFactor)) buyLocal(pinned, pinned.price, 'buy_now');
    } else if (viewers > 10 && random.chance(0.004)) {
      const pool = products.filter((p) => p.format === 'buy_now' && remainingOf(p) > 0);
      if (pool.length) {
        const p = random.pick(pool);
        buyLocal(p, p.price, 'buy_now');
      }
    }
  };
  useEffect(() => {
    simRef.current = simulate;
  });
  useEffect(() => {
    if (ended) return;
    const t = setInterval(() => simRef.current(), 1000);
    return () => clearInterval(t);
  }, [ended]);

  // ── Satış eylemleri ──
  const pin = (p: Product) => {
    if (pinnedId === p.id) {
      setPinnedId(undefined);
      haptic.tap();
      toast('Sabitleme kaldırıldı', 'pin-outline');
      return;
    }
    if (lotRunning) {
      haptic.warning();
      toast.warning('Açık artırma sürerken ürün sabitleyemezsin');
      return;
    }
    if (flashRunning) {
      haptic.warning();
      toast.warning('Flaş indirim bitince yeni ürün sabitleyebilirsin');
      return;
    }
    if (remainingOf(p) <= 0) {
      toast.error('Bu ürün tükendi');
      return;
    }
    setPinnedId(p.id);
    setDismissedLotId(state.lot?.id);
    closeSheet();
    haptic.medium();
    toast.success('Sabitlendi — izleyiciler ürünü görüyor', 'pin');
  };

  const requestAuction = (p: Product) => {
    if (lotRunning) {
      haptic.warning();
      toast.warning('Bir açık artırma zaten devam ediyor');
      return;
    }
    if (remainingOf(p) <= 0) {
      toast.error('Bu ürün tükendi');
      return;
    }
    setAuctionTarget(p);
    openSheet('auction');
  };
  const startAuction = (opts: AuctionSettings & { startPrice: number }) => {
    const p = auctionTarget;
    if (!p) return;
    const ok = engine.startAuction(p, { startPrice: opts.startPrice, duration: opts.duration, suddenDeath: opts.suddenDeath, counterBidTime: opts.counterBidTime });
    if (!ok) {
      toast.warning('Bir açık artırma zaten devam ediyor');
      return;
    }
    setAuctionDefaults({ duration: opts.duration, counterBidTime: opts.counterBidTime, suddenDeath: opts.suddenDeath });
    setPinnedId(undefined);
    closeSheet();
    haptic.heavy();
    toast.success(`Açık artırma başladı · ${formatTRY(opts.startPrice)} 🔨`, 'hammer');
  };

  const requestFlash = (p: Product) => {
    if (flashRunning) {
      toast.warning('Zaten devam eden bir flaş indirim var');
      return;
    }
    if (lotRunning) {
      toast.warning('Açık artırma bitince flaş indirim başlatabilirsin');
      return;
    }
    if (remainingOf(p) <= 0) {
      toast.error('Bu ürün tükendi');
      return;
    }
    setFlashTarget(p);
    openSheet('flash');
  };
  const startFlash = (discount: number, durationSec: number) => {
    const p = flashTarget;
    if (!p) return;
    engine.startFlashSale({ ...p, sold: p.quantity - remainingOf(p) }, discount, durationSec);
    setPinnedId(undefined);
    closeSheet();
    haptic.heavy();
    toast.success(`Flaş indirim başladı · %${Math.round(discount * 100)} ⚡`, 'flash');
  };

  const requestGiveaway = (p?: Product) => {
    if (giveawayRunning) {
      toast.warning('Aynı anda yalnızca bir çekiliş yapılabilir');
      return;
    }
    setGiveawayPrizeId(p?.id);
    openSheet('giveaway');
  };
  const startGiveaway = (prize: Product | undefined, durationSec: number, requiresFollow: boolean) => {
    if (giveawayRunning) return;
    engine.startGiveaway(prize ?? makeSurprisePrize(show), durationSec, requiresFollow);
    closeSheet();
    haptic.heavy();
    toast.success('Çekiliş başladı! 🎁', 'gift');
  };

  const addProduct = () => {
    closeSheet();
    setTimeout(() => router.push({ pathname: '/seller/listing', params: { showId: show.id } }), SHEET_SWAP_MS);
  };
  const editProduct = (p: Product) => {
    closeSheet();
    setTimeout(() => router.push({ pathname: '/seller/listing', params: { id: p.id } }), SHEET_SWAP_MS);
  };
  const importSamples = () => {
    const inputs = sampleListingInputs(show.categoryId, show.id);
    inputs.forEach((i) => createListing(i));
    haptic.success();
    toast.success(`${inputs.length} örnek ilan mağazana eklendi`, 'sparkles');
  };

  // ── Sohbet ──
  const focusInput = (text: string) => {
    closeSheet();
    setDraft(text);
    setTimeout(() => inputRef.current?.focus(), SHEET_SWAP_MS + 60);
  };
  const send = () => {
    const text = draft.trim();
    if (!text) return;
    const [cmdRaw, ...rest] = text.split(/\s+/);
    const cmd = cmdRaw.toLocaleLowerCase('tr-TR');
    const arg = rest.join(' ').trim();
    haptic.tap();
    if (cmd === '/duyuru' || cmd === '/announce') {
      if (!arg) {
        toast('Kullanım: /duyuru mesajın', 'megaphone-outline');
        return;
      }
      engine.pinMessage(arg);
      toast.success('Duyuru sabitlendi', 'megaphone');
    } else if (cmd === '/yavas' || cmd === '/yavaş' || cmd === '/slow') {
      const n = parseInt(arg, 10);
      const sec = Number.isFinite(n) && n > 0 ? Math.min(60, n) : 0;
      setSlowMode(sec);
      pushLocal({ type: 'system', username: 'Mezatonline', text: sec ? `🐢 Yavaş mod açıldı: ${sec} sn` : '🐇 Yavaş mod kapatıldı' });
    } else if (cmd === '/baskin' || cmd === '/baskın' || cmd === '/raid') {
      setDraft('');
      openRaid(arg.replace(/^@/, ''));
      return;
    } else if (cmd === '/gizli' || cmd === '/hide') {
      if (!arg) {
        toast('Kullanım: /gizli mesajın', 'eye-off-outline');
        return;
      }
      pushLocal({ type: 'system', username: me.username, text: `🔒 Yalnız sen ve moderatörler görür: ${arg}`, isSeller: true });
    } else {
      engine.sendMessage(text);
    }
    setDraft('');
  };

  // ── Moderasyon ──
  const openUser = (t: UserTarget) => {
    setUserTarget(t);
    openSheet('user');
  };
  const toggleMod = (username: string) => {
    if (mods.includes(username)) {
      setMods((m) => m.filter((x) => x !== username));
      toast(`@${username} artık moderatör değil`, 'remove-circle-outline');
    } else {
      setMods((m) => [...m, username]);
      pushLocal({ type: 'system', username: 'Mezatonline', text: `🛡️ @${username} moderatör oldu` });
      toast.success(`@${username} moderatör yapıldı`, 'shield-checkmark');
    }
  };
  const removeUser = (username: string, block: boolean) => {
    setRemoved((r) => (r.includes(username) ? r : [...r, username]));
    setMods((m) => m.filter((x) => x !== username));
    closeSheet();
    haptic.warning();
    toast(block ? `@${username} engellendi` : `@${username} yayından çıkarıldı`, block ? 'ban-outline' : 'exit-outline');
  };

  // ── Araçlar ──
  const share = () => {
    if (rehearsal) {
      toast('Prova yayınları gizlidir, paylaşılamaz', 'lock-closed-outline');
      return;
    }
    setShares((s) => s + 1);
    shareLink({ title: show.title, path: `/live/${show.id}`, message: `🔴 ${me.username} şu an canlıda: ${show.title}` });
  };
  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    if (next) toast.warning('Mikrofon kapalı — izleyiciler seni duyamıyor', 'mic-off');
    else toast.success('Mikrofon açık', 'mic');
  };
  const cycleZoom = () => {
    const next = (zoomIndex + 1) % ZOOM_LEVELS.length;
    setZoomIndex(next);
    haptic.tap();
    toast(`Kamera: ${ZOOM_LEVELS[next].label}`, 'scan-outline');
  };
  const startPromo = async (budget: number) => {
    if (rehearsal) {
      toast('Provada tanıtım yapılamaz', 'lock-closed-outline');
      return;
    }
    await new Promise((r) => setTimeout(r, 700));
    const t = Date.now();
    setPromo({ startedAt: t, endsAt: t + PROMO_DURATION_SEC * 1000, budget, impressions: Math.round(budget * random.float(9, 16)) });
    setPromoCredit((c) => Math.max(0, c - Math.min(c, budget)));
    closeSheet();
    haptic.success();
    toast.success('Yayının öne çıkarıldı 🚀', 'rocket');
    pushLocal({ type: 'system', username: 'Mezatonline', text: '🚀 Yayın öne çıkarıldı — yeni izleyiciler geliyor!' });
  };
  const stopPromo = () => {
    if (promo) {
      const usedRatio = Math.min(1, Math.max(0, (Date.now() - promo.startedAt) / (PROMO_DURATION_SEC * 1000)));
      const refund = Math.round(promo.budget * (1 - usedRatio));
      if (refund > 0) setPromoCredit((c) => c + refund);
      toast(`Tanıtım bitirildi${refund > 0 ? ` · ${formatTRY(refund)} kredine iade edildi` : ''}`, 'rocket-outline');
    }
    setPromo(null);
    closeSheet();
  };
  const openRaid = (query?: string) => {
    if (rehearsal) {
      toast('Provada baskın yapılamaz', 'lock-closed-outline');
      return;
    }
    setRaidQuery(query);
    openSheet('raid');
  };

  // ── Yayını bitir ──
  const finish = (raid?: RaidTarget) => {
    if (summary) return;
    if (lotRunning) {
      toast.warning('Açık artırma bitmeden yayını bitiremezsin');
      return;
    }
    engine.endShow();
    const endedAt = Date.now();
    const topItem = paidSold.reduce<SoldItem | undefined>((best, s) => (!best || s.price > best.price ? s : best), undefined);
    const data: ShowSummaryData = {
      showId: show.id,
      title: show.title,
      rehearsal,
      durationSec: (endedAt - state.startedAt) / 1000,
      gross,
      itemsSold,
      orders: allSold.length,
      peakViewers,
      newFollowers,
      tips,
      giveaways: allSold.filter((s) => s.via === 'giveaway').length,
      shares,
      topItem,
      sales: allSold,
      raidTo: raid ? { username: raid.seller.username, avatar: raid.seller.avatar, showId: raid.show.id, viewers } : undefined,
    };
    if (!rehearsal) {
      addSession({ showId: show.id, startedAt: new Date(state.startedAt).toISOString(), endedAt: new Date(endedAt).toISOString(), gross, itemsSold, peakViewers });
      if (isMyShow) setShowStatus(show.id, 'ended');
    }
    setSheet(null);
    setSummary(data);
    haptic.success();
  };

  usePreventRemove(!ended, () => openSheet('end'));

  const leave = (to: 'orders' | 'hub' | 'raid') => {
    if (temporary) cancelShow(show.id);
    if (to === 'orders') router.replace('/seller/orders');
    else if (to === 'raid' && summary?.raidTo) router.replace(`/live/${summary.raidTo.showId}`);
    else router.dismissTo('/sell');
  };

  // ── Görünüm ──
  if (summary) {
    return (
      <View style={[styles.flex, { backgroundColor: colors.bg }]}>
        <ShowSummary data={summary} me={me} onOrders={() => leave('orders')} onHub={() => leave('hub')} onRaidShow={summary.raidTo ? () => leave('raid') : undefined} />
        
      </View>
    );
  }

  const compact = screenH < 740;
  const typing = keyboard > 0;
  const baseChat = Math.max(140, Math.min(250, screenH * (compact ? 0.22 : 0.27)));
  // Klavye açıkken sohbet, üst bölümün altına sığacak kadar kısalır; ürün kartı ve ray gizlenir
  const chatHeight = Math.round(typing ? Math.max(90, Math.min(baseChat, screenH - keyboard - insets.top - 250)) : baseChat);
  const promoLeft = promo && promoActive ? (promo.endsAt - now) / 1000 : 0;

  return (
    <View style={[styles.flex, { backgroundColor: liveColors.panel }]}>
      <CameraStage access={access} facing={facing} zoom={ZOOM_LEVELS[zoomIndex].value} muted={muted} active={focused} />
      <LinearGradient colors={[liveColors.glassStrong, 'transparent']} style={[styles.topShade, { height: insets.top + 180 }]} pointerEvents="none" />
      <LinearGradient
        colors={['transparent', liveColors.glassStrong, liveColors.glassStrong]}
        locations={[0, 0.55, 1]}
        style={[styles.bottomShade, { height: screenH * 0.58 }]}
        pointerEvents="none"
      />

      {/* Üst bölüm */}
      <View style={[styles.top, { paddingTop: insets.top + 6 }]} pointerEvents="box-none">
        <HostHeader
          me={me}
          rehearsal={rehearsal}
          elapsedSec={elapsedSec}
          viewers={viewers}
          verifiedOnly={verifiedOnly}
          muted={muted}
          onViewers={() => openSheet('viewers')}
          onMore={() => openSheet('more')}
          onClose={() => openSheet('end')}
        />
        <StatsStrip gross={gross} itemsSold={itemsSold} peakViewers={peakViewers} likes={state.likes} onPress={() => openSheet('viewers')} />
        <View style={styles.topRow} pointerEvents="box-none">
          <NotesSticky text={notes} collapsed={notesCollapsed} onPress={() => openSheet('notes')} onToggle={() => setNotesCollapsed((c) => !c)} />
          <View style={styles.topRight} pointerEvents="box-none">
            {state.giveaway ? <GiveawayBanner giveaway={state.giveaway} now={now} /> : null}
            {slowMode ? (
              <View style={styles.slowPill}>
                <Icon name="hourglass-outline" size={12} color={liveColors.text} />
                <Text variant="caption" color={liveColors.text}>
                  Yavaş mod · {slowMode} sn
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>

      {/* Alt bölüm */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.bottom} pointerEvents="box-none">
        <View style={styles.middleRow} pointerEvents="box-none">
          <View style={styles.chatCol} pointerEvents="box-none">
            {pinnedMsg ? <PinnedMessage message={pinnedMsg} onHide={() => setHiddenPinId(pinnedMsg.id)} /> : null}
            <HostChat
              messages={chat}
              filter={chatFilter}
              onFilter={setChatFilter}
              mods={mods}
              buyers={buyers}
              height={chatHeight}
              onPressMessage={(m) => openUser({ username: m.username, avatar: m.avatar, text: m.text })}
            />
          </View>
          {typing ? null : (
            <View style={styles.railCol} pointerEvents="box-none">
              <FloatingHearts ids={hearts} />
              <RightRail
                compact={compact}
                items={[
                  {
                    key: 'flip',
                    icon: 'camera-reverse-outline',
                    label: 'Çevir',
                    onPress: () => {
                      setFacing((f) => (f === 'front' ? 'back' : 'front'));
                      haptic.tap();
                    },
                  },
                  { key: 'mic', icon: muted ? 'mic-off' : 'mic-outline', label: muted ? 'Sessiz' : 'Ses', onPress: toggleMute, danger: muted },
                  { key: 'share', icon: 'share-social-outline', label: 'Paylaş', onPress: share },
                  { key: 'notes', icon: 'document-text-outline', label: 'Notlar', onPress: () => openSheet('notes') },
                  {
                    key: 'promo',
                    icon: promoActive ? 'rocket' : 'megaphone-outline',
                    label: promoActive ? formatTimer(promoLeft) : 'Tanıt',
                    onPress: () => (rehearsal ? toast('Provada tanıtım yapılamaz', 'lock-closed-outline') : openSheet('promote')),
                    active: promoActive,
                  },
                ]}
              />
            </View>
          )}
        </View>

        <View style={[styles.cardWrap, typing && styles.collapsed]} pointerEvents={typing ? 'none' : 'auto'}>
          <LotCard
            lot={state.lot}
            resultDismissed={!state.lot || dismissedLotId === state.lot.id}
            flash={state.flash}
            flashExtraSold={state.flash ? (flashLocalSold[state.flash.id] ?? 0) : 0}
            pinned={pinned}
            pinnedRemaining={pinned ? remainingOf(pinned) : 0}
            remainingOf={remainingOf}
            onStartAuction={requestAuction}
            onFlash={requestFlash}
            onUnpin={() => {
              setPinnedId(undefined);
              haptic.tap();
            }}
            onOpenShop={openShop}
            onDismissResult={() => setDismissedLotId(state.lot?.id)}
          />
        </View>

        <View style={[styles.inputBar, { paddingBottom: typing ? 8 : Math.max(insets.bottom, 10) }]}>
          <View style={styles.inputPill}>
            <TextInput
              ref={inputRef}
              value={draft}
              onChangeText={setDraft}
              placeholder="Sohbete yaz…"
              placeholderTextColor={liveColors.textTertiary}
              selectionColor={liveColors.primary}
              style={styles.input}
              returnKeyType="send"
              submitBehavior="submit"
              onSubmitEditing={send}
              maxLength={200}
              autoCorrect
            />
            {draft.trim() ? <IconButton name="arrow-up" variant="primary" size={30} onPress={send} accessibilityLabel="Gönder" /> : null}
          </View>
          <PressableScale onPress={() => openShop()} accessibilityRole="button" accessibilityLabel="Mağaza" style={[styles.shopBtn, { backgroundColor: liveColors.primary }]}>
            <Icon name="storefront" size={18} color={liveColors.onPrimary} />
            <Text variant="subhead" weight="800" color={liveColors.onPrimary}>
              Mağaza
            </Text>
            {availableCount ? (
              <View style={[styles.shopCount, { backgroundColor: liveColors.live }]}>
                <Text variant="caption" color={liveColors.text} style={styles.shopCountText}>
                  {availableCount > 99 ? '99+' : availableCount}
                </Text>
              </View>
            ) : null}
          </PressableScale>
        </View>
      </KeyboardAvoidingView>

      {confetti ? <Confetti key={confetti} /> : null}

      {/* Sheet'ler */}
      <ShopSheet
        visible={sheet === 'shop'}
        onClose={closeSheet}
        initialTab={shopTab}
        products={products}
        remainingOf={remainingOf}
        pinnedId={pinnedId}
        lot={state.lot}
        flash={state.flash}
        giveaway={state.giveaway}
        sold={allSold}
        canEdit={(p) => !rehearsal && listingById.has(p.id)}
        rehearsal={rehearsal}
        onStartAuction={requestAuction}
        onPin={pin}
        onFlash={requestFlash}
        onGiveaway={requestGiveaway}
        onAddProduct={addProduct}
        onEdit={editProduct}
        onImportSamples={isMyShow && !rehearsal ? importSamples : undefined}
      />
      <StartAuctionSheet visible={sheet === 'auction'} onClose={closeSheet} product={auctionTarget} defaults={auctionDefaults} onStart={startAuction} />
      <FlashSaleSheet visible={sheet === 'flash'} onClose={closeSheet} product={flashTarget} remaining={flashTarget ? remainingOf(flashTarget) : 0} onStart={startFlash} />
      <GiveawaySheet
        visible={sheet === 'giveaway'}
        onClose={closeSheet}
        candidates={products.filter((p) => remainingOf(p) > 0)}
        initialPrizeId={giveawayPrizeId}
        coverImage={show.coverImage}
        onStart={startGiveaway}
      />
      <ViewersSheet
        visible={sheet === 'viewers'}
        onClose={closeSheet}
        stats={{ gross, orders: allSold.length, elapsedSec, shares, viewers, peak: peakViewers, tips, newFollowers, likes: state.likes }}
        viewers={engine.getViewerSample(Math.min(60, Math.max(3, viewers))).filter((v) => !removed.includes(v.username))}
        mods={mods}
        buyers={buyers}
        activity={activity}
        onMention={(u) => focusInput(`@${u} `)}
        onUser={(u) => openUser(u)}
      />
      <MoreSheet
        visible={sheet === 'more'}
        onClose={closeSheet}
        rehearsal={rehearsal}
        verifiedOnly={verifiedOnly}
        onVerifiedOnly={(v) => {
          setVerifiedOnly(v);
          toast(v ? 'Artık yalnızca doğrulanmış alıcılar teklif verebilir' : 'Tüm alıcılar teklif verebilir', 'shield-checkmark-outline');
        }}
        slowMode={slowMode > 0}
        onSlowMode={(v) => {
          setSlowMode(v ? 5 : 0);
          pushLocal({ type: 'system', username: 'Mezatonline', text: v ? '🐢 Yavaş mod açıldı: 5 sn' : '🐇 Yavaş mod kapatıldı' });
        }}
        zoomLabel={ZOOM_LEVELS[zoomIndex].label}
        onZoom={cycleZoom}
        modCount={mods.length}
        onPinMessage={() => openSheet('pin')}
        onMods={() => openSheet('mods')}
        onRaid={() => openRaid()}
        onShare={() => {
          closeSheet();
          setTimeout(share, SHEET_SWAP_MS);
        }}
        onEnd={() => openSheet('end')}
      />
      <PinMessageSheet
        visible={sheet === 'pin'}
        onClose={closeSheet}
        current={pinnedMsg?.text}
        onPin={(text) => {
          engine.pinMessage(text);
          closeSheet();
          haptic.success();
          toast.success('Mesaj sabitlendi', 'pin');
        }}
      />
      <ModeratorsSheet
        visible={sheet === 'mods'}
        onClose={closeSheet}
        mods={mods}
        suggestions={recentChatters}
        onAdd={(u) => !mods.includes(u) && toggleMod(u)}
        onRemove={toggleMod}
      />
      <RaidSheet visible={sheet === 'raid'} onClose={closeSheet} viewers={viewers} currentShowId={show.id} initialQuery={raidQuery} onRaid={(t) => finish(t)} />
      <PromoteSheet visible={sheet === 'promote'} onClose={closeSheet} promo={promo} credit={promoCredit} now={now} onStart={startPromo} onStop={stopPromo} />
      <NotesSheet
        visible={sheet === 'notes'}
        onClose={closeSheet}
        text={notes}
        onSave={(t) => {
          setNotes(t);
          setNotesCollapsed(false);
          closeSheet();
          toast.success('Yayın notları güncellendi', 'document-text');
        }}
      />
      <UserActionsSheet
        visible={sheet === 'user'}
        onClose={closeSheet}
        target={userTarget}
        isSelf={userTarget?.username === me.username}
        isMod={!!userTarget && mods.includes(userTarget.username)}
        onReply={() => userTarget && focusInput(`@${userTarget.username} `)}
        onPin={() => {
          if (!userTarget?.text) return;
          engine.pinMessage(userTarget.username === me.username ? userTarget.text : `@${userTarget.username}: ${userTarget.text}`);
          closeSheet();
          toast.success('Mesaj sabitlendi', 'pin');
        }}
        onToggleMod={() => {
          if (!userTarget) return;
          toggleMod(userTarget.username);
          closeSheet();
        }}
        onRemove={() => userTarget && removeUser(userTarget.username, false)}
        onBlock={() => userTarget && removeUser(userTarget.username, true)}
        onReport={() => {
          closeSheet();
          toast.success('Şikayetin alındı. Ekibimiz inceleyecek.', 'flag');
        }}
      />
      <EndShowSheet
        visible={sheet === 'end'}
        onClose={closeSheet}
        rehearsal={rehearsal}
        lotRunning={lotRunning}
        giveawayRunning={giveawayRunning}
        gross={gross}
        itemsSold={itemsSold}
        onConfirm={() => finish()}
      />
      
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  topShade: { position: 'absolute', top: 0, left: 0, right: 0 },
  bottomShade: { position: 'absolute', bottom: 0, left: 0, right: 0 },
  top: { position: 'absolute', top: 0, left: 0, right: 0 },
  topRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingHorizontal: SCREEN_PADDING - 4, marginTop: 10 },
  topRight: { flex: 1, alignItems: 'flex-end', gap: 6 },
  slowPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: liveColors.glass, borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 4 },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  middleRow: { flexDirection: 'row', alignItems: 'flex-end', paddingLeft: SCREEN_PADDING - 4, paddingRight: 6, gap: 6 },
  chatCol: { flex: 1 },
  railCol: { alignItems: 'center' },
  collapsed: { height: 0, marginTop: 0, overflow: 'hidden', opacity: 0 },
  cardWrap: { paddingHorizontal: SCREEN_PADDING - 4, marginTop: 8 },
  inputBar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: SCREEN_PADDING - 4, paddingTop: 8 },
  inputPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 42,
    borderRadius: radius.pill,
    backgroundColor: liveColors.glassLight,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: liveColors.border,
    paddingLeft: 14,
    paddingRight: 6,
  },
  input: { flex: 1, color: liveColors.text, fontSize: 15, paddingVertical: 10 },
  shopBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 42, paddingHorizontal: 14, borderRadius: radius.pill },
  shopCount: { position: 'absolute', top: -6, right: -4, minWidth: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  shopCountText: { fontSize: 10, lineHeight: 12 },
});
