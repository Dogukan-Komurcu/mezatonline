/**
 * Tek bir canlı yayın sayfası (dikey kaydırıcıdaki bir sayfa).
 * Video + üst bilgi + "Yayın bilgisi" çipi + çekiliş şeridi + sohbet + sağdaki cam eylem kapsülü +
 * açık artırma kartı ve teklif paneli + alt çubuk ve tüm alt sayfalar (S20–S34).
 * Tasarım: docs/TASARIM-KIMLIGI.md (bölüm 4).
 * Ücretli öne çıkarma, bahşiş ve çekiliş giriş noktaları FEATURES bayraklarıyla açılıp kapanır.
 */
import { router, type Href } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Icon, PressableScale, Text, toast } from '@/components/ui';
import { FEATURES } from '@/config/demo';
import { BUYER_USERS, getProductsByShow, getShowsBySeller, getUser } from '@/data';
import { AUTH_REASONS, isSignedIn, requireAuth, useIsGuest } from '@/features/auth/gate';
import { ReportSheet, shareLink, TipSheet } from '@/features/shared/sheets';
import { shippingQuoteFor, shippingText, thresholdText, type ShippingQuote } from '@/features/shared/shipping';
import { nextMinBid } from '@/lib/auction';
import { formatCompact, formatTRY } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { containsBlocked, MODERATION_BLOCKED_MESSAGE } from '@/lib/moderation';
import { random } from '@/lib/rng';
import { useMe } from '@/store/auth';
import { useInboxStore } from '@/store/inbox';
import { useOrdersStore } from '@/store/orders';
import { completeChallenge, POINTS_SHOP, useRewardsStore } from '@/store/rewards';
import { useSettingsStore } from '@/store/settings';
import { useSocialStore } from '@/store/social';
import { useWalletStore } from '@/store/wallet';
import { liveColors, SCREEN_PADDING } from '@/theme';
import type { ChatMessage, Product, Show } from '@/types';

import { CROWD_REACTIONS } from './bots';
import { ActionRail, railCapacity, type RailItem } from './components/ActionRail';
import { ActionRow } from './components/ActionRow';
import { AuctionCard } from './components/AuctionCard';
import { BottomBar } from './components/BottomBar';
import { Celebration, type CelebrationData } from './components/Celebration';
import { Confetti } from './components/Confetti';
import { ChatComposer } from './components/ChatComposer';
import { ChatList } from './components/ChatList';
import { FlashSaleCard } from './components/FlashSaleCard';
import { GiveawayCard } from './components/GiveawayCard';
import { LiveHeader } from './components/LiveHeader';
import { LiveVideo } from './components/LiveVideo';
import { DEFAULT_REACTION, ReactionLayer, useReactions } from './components/Reactions';
import { ReadyBanner } from './components/ReadyBanner';
import { ShowEnded } from './components/ShowEnded';
import { ShowNotes } from './components/ShowNotes';
import { LIVE_RADIUS, liveStyles } from './components/styles';
import type { LiveEvents, LiveLot, LiveViewer } from './engine';
import { couponDiscount, hasAcceptedBidRules, MUDAVIM_COUPON_CODE, useLivePrefs } from './liveStore';
import { markPreBid } from './prebids';
import { purchaseInLive } from './purchase';
import { BidSetupSheet, type BidSetupIntent, type BidSetupRequest } from './sheets/BidSetupSheet';
import { BoostSheet } from './sheets/BoostSheet';
import { BuyNowSheet } from './sheets/BuyNowSheet';
import { CustomBidSheet, type CustomBidSubmit } from './sheets/CustomBidSheet';
import { MoreSheet } from './sheets/MoreSheet';
import { ProductSheet } from './sheets/ProductSheet';
import { RewardsClubSheet } from './sheets/RewardsClubSheet';
import { SellerSheet } from './sheets/SellerSheet';
import { ShopSheet } from './sheets/ShopSheet';
import { FollowEnterSheet, GiveawayInfoSheet, ReactionSheet } from './sheets/SmallSheets';
import { UserSheet, type ChatUser } from './sheets/UserSheet';
import { ViewersSheet } from './sheets/ViewersSheet';
import { WalletSheet } from './sheets/WalletSheet';
import { useLiveShow } from './useLiveShow';

type SheetName =
  | 'custom'
  | 'prebid'
  | 'setup'
  | 'seller'
  | 'viewers'
  | 'user'
  | 'more'
  | 'club'
  | 'wallet'
  | 'boost'
  | 'shop'
  | 'buy'
  | 'product'
  | 'followEnter'
  | 'giveawayInfo'
  | 'reactions'
  | 'tip'
  | 'reportSeller'
  | 'reportShow'
  | 'reportUser';

/** Aynı lot için "teklifin geçildi" bildirimini yalnızca bir kez gönder */
const OUTBID_NOTIFIED = new Set<string>();
/** "Mezata hazır ol" şeridi kapatılan yayınlar (oturum boyunca hatırlanır) */
const READY_BANNER_DISMISSED = new Set<string>();
const READY_TOAST = 'Hazırsın! Sıradaki üründe tek dokunuşla teklif verebilirsin.';
const SHEET_SWAP_MS = 300;
const CHAT_COOLDOWN_MS = 2500;
/** AUTH_REASONS'ta karşılığı olmayan, yayına özgü giriş gerekçeleri */
function hashOf(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

export type LiveShowPageProps = {
  show: Show;
  width: number;
  height: number;
  /** Kaydırıcıda görünen sayfa */
  visible: boolean;
  /** Ekran odakta (başka bir sayfaya gidilmedi) */
  focused: boolean;
  nextShow?: Show;
  /** Yalnızca geliştirme (görsel QA): /live/s1?qa=custom gibi bir durum/sayfa açar */
  qa?: string;
  onClose: () => void;
  onNext: () => void;
};

export function LiveShowPage({ show, width, height, visible, focused, nextShow, qa, onClose, onNext }: LiveShowPageProps) {
  const insets = useSafeAreaInsets();
  const me = useMe();
  const guest = useIsGuest();
  const [seller] = useState(() => getUser(show.sellerId)!);
  const [products] = useState(() => getProductsByShow(show.id));
  const endedShow = show.status === 'ended';

  const following = useSocialStore((s) => s.followingIds.includes(show.sellerId));
  const blockedIds = useSocialStore((s) => s.blockedIds);
  const sellerBlocked = blockedIds.includes(show.sellerId);
  const active = visible && focused && !endedShow && !sellerBlocked;
  const liveSoundOn = useSettingsStore((s) => s.liveSoundOn);
  const setLiveSoundOn = useSettingsStore((s) => s.setLiveSoundOn);
  const activeReactionId = useRewardsStore((s) => s.activeReaction);
  const coupon = useLivePrefs((s) => s.coupon);
  const orders = useOrdersStore((s) => s.orders);
  const hasCard = useWalletStore((s) => s.paymentMethods.length > 0);
  const hasAddress = useWalletStore((s) => s.addresses.length > 0);
  const rulesAccepted = useLivePrefs(hasAcceptedBidRules);
  const reactionEmoji = (!guest && POINTS_SHOP.find((i) => i.id === activeReactionId)?.emoji) || DEFAULT_REACTION;

  const [sheet, setSheet] = useState<SheetName | null>(null);
  const [sheetProduct, setSheetProduct] = useState<Product | undefined>(undefined);
  const [chatUser, setChatUser] = useState<ChatUser | undefined>(undefined);
  const [composer, setComposer] = useState<{ open: boolean; text: string }>({ open: false, text: '' });
  const [chatHidden, setChatHidden] = useState(false);
  const [clipping, setClipping] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [boost, setBoost] = useState(() => ({ raised: 60 + (hashOf(show.id) % 280), goal: 500 }));
  const [boosting, setBoosting] = useState(false);
  const [dismissedGiveaway, setDismissedGiveaway] = useState<string | null>(null);
  const [celebration, setCelebration] = useState<CelebrationData | null>(null);
  const [middleH, setMiddleH] = useState(0);
  const [giveawayH, setGiveawayH] = useState(0);
  const [bottomH, setBottomH] = useState(220);
  const [muteHint, setMuteHint] = useState(false);
  const [viewerSample, setViewerSample] = useState<LiveViewer[]>([]);
  const [clubMinutes, setClubMinutes] = useState(0);
  /** "Teklife hazırlan" sayfasının isteği ve kaydedince sürecek işlem */
  const [setup, setSetup] = useState<{ req: BidSetupRequest; action?: () => void } | null>(null);
  const [readyDismissed, setReadyDismissed] = useState(() => READY_BANNER_DISMISSED.has(show.id));
  const reactions = useReactions();

  const lastTapAt = useRef(0);
  const lastChatAt = useRef(0);
  const seenCrowdLikes = useRef(-1);
  /** İzleme süresi (Müdavim Kartı ilerlemesi için) */
  const [watch, setWatch] = useState({ acc: 0, since: 0 });

  const closeAllSheets = () => setSheet(null);

  const events: LiveEvents = {
    onOutbid: (lot) => {
      haptic.warning();
      toast.warning(`Teklifin geçildi! Şu an ${formatTRY(lot.currentBid)}`, 'trending-up-outline');
      markPreBid(lot.product.id, 'outbid');
      if (!OUTBID_NOTIFIED.has(lot.id)) {
        OUTBID_NOTIFIED.add(lot.id);
        useInboxStore.getState().pushNotification({
          type: 'outbid',
          title: 'Teklifin geçildi',
          body: `${lot.product.title} · Şu an ${formatTRY(lot.currentBid)} · @${seller.username}`,
          image: lot.product.images[0],
          href: `/live/${show.id}`,
        });
      }
    },
    onWon: (lot) => {
      haptic.success();
      markPreBid(lot.product.id, 'won');
      const { order, discount } = purchaseInLive({ product: lot.product, price: lot.currentBid, source: 'auction', showId: show.id });
      if (sheet === 'custom') setSheet(null);
      setCelebration({
        id: Date.now(),
        kind: 'won',
        product: lot.product,
        price: Math.max(0, lot.currentBid - discount),
        quantity: 1,
        orderId: order.id,
        discount,
        // Yalnızca paket birleştirmesi "aynı pakette" sayılır (kargo dahil ilan / yayın kampanyası değil)
        bundled: order.shippingNote === 'bundled' && order.shippingCost === 0,
      });
    },
    onLost: (lot) => {
      markPreBid(lot.product.id, 'lost');
      toast(`Kaybettin, sıradaki ürün geliyor · Satış fiyatı ${formatTRY(lot.currentBid)}`, 'hourglass-outline');
    },
    onGiveawayWon: (g) => {
      haptic.success();
      // Çekilişte kargo ücretini satıcı karşılar (kargo dahil sayılır; etiket bedeli satıcıya yazılır)
      const prize = { ...g.product, shippingIncluded: true, shippingCost: 0 };
      const { order } = purchaseInLive({ product: prize, price: 0, source: 'giveaway', showId: show.id });
      setCelebration({ id: Date.now(), kind: 'giveaway', product: prize, price: 0, quantity: 1, orderId: order.id, discount: 0, bundled: false });
    },
    onEnded: () => {
      setSheet(null);
      setComposer({ open: false, text: '' });
    },
  };

  const { state, engine } = useLiveShow({
    show,
    seller,
    products,
    me: { id: me.id, username: me.username, avatar: me.avatar },
    mode: 'viewer',
    active,
    events,
    isFollowing: () => useSocialStore.getState().isFollowing(show.sellerId),
  });

  // ─── Yan etkiler ────────────────────────────────────────────────────────────

  // 30 sn izleyince günlük görev + izleme süresi sayacı
  useEffect(() => {
    if (!active) return;
    const since = Date.now();
    setWatch((w) => ({ ...w, since }));
    const t = setTimeout(() => {
      // Puan hesaba yazılır: misafire verilmez
      if (!isSignedIn()) return;
      const pts = completeChallenge('watch_show');
      if (pts) toast.success(`+${pts} puan · Bugünün görevi: canlı yayın izle 🎯`, 'trophy-outline');
    }, 30_000);
    return () => {
      clearTimeout(t);
      setWatch((w) => ({ acc: w.acc + (Date.now() - since), since: 0 }));
    };
  }, [active]);

  // Ses kapalıysa ilk açılışta kısa ipucu
  useEffect(() => {
    if (!active || liveSoundOn) {
      setMuteHint(false);
      return;
    }
    setMuteHint(true);
    const t = setTimeout(() => setMuteHint(false), 5000);
    return () => clearTimeout(t);
  }, [active, liveSoundOn]);

  // Kalabalığın tepkileri → uçan emojiler
  useEffect(() => {
    const c = state.crowdLikes ?? 0;
    if (seenCrowdLikes.current < 0) {
      seenCrowdLikes.current = c;
      return;
    }
    const diff = c - seenCrowdLikes.current;
    seenCrowdLikes.current = c;
    if (!active || diff <= 0) return;
    for (let i = 0; i < Math.min(3, diff); i++) {
      setTimeout(() => reactions.spawn(random.pick(CROWD_REACTIONS)), i * 140);
    }
  }, [state.crowdLikes, active, reactions]);

  // Açık artırma bittiyse özel teklif sayfasını kapat
  const lot = state.lot;
  const running = lot?.status === 'running';
  useEffect(() => {
    if (sheet === 'custom' && !running) {
      const t = setTimeout(() => setSheet((s) => (s === 'custom' ? null : s)), 900);
      return () => clearTimeout(t);
    }
  }, [sheet, running]);

  // Sayfa görünmez olunca açık sayfaları kapat
  useEffect(() => {
    if (!visible) {
      setSheet(null);
      setComposer({ open: false, text: '' });
    }
  }, [visible]);

  // ─── Yardımcılar ────────────────────────────────────────────────────────────

  const openSheet = (name: SheetName) => {
    if (sheet && sheet !== name) {
      setSheet(null);
      setTimeout(() => setSheet(name), SHEET_SWAP_MS);
    } else {
      setSheet(name);
    }
  };

  /**
   * Hesap gerektiren işlem. Giriş yapılmışsa hemen çalışır; misafirse açık alt sayfa / sohbet
   * kapatılır (iOS'ta RN Modal giriş ekranının açılmasını engeller), sonra giriş istenir.
   */
  const withAuth = (action: () => void, reason: string) => {
    if (isSignedIn()) {
      action();
      return;
    }
    const go = () => requireAuth(action, { reason, categoryIds: [show.categoryId] });
    if (sheet || composer.open) {
      setSheet(null);
      setComposer({ open: false, text: '' });
      setTimeout(go, SHEET_SWAP_MS);
    } else go();
  };

  const openWallet = () => withAuth(() => openSheet('wallet'), AUTH_REASONS.account);

  const navigate = (href: string) => {
    if (href === 'wallet') {
      openWallet();
      return;
    }
    setSheet(null);
    setTimeout(() => router.push(href as Href), sheet ? 260 : 0);
  };

  const isReady = () => {
    const w = useWalletStore.getState();
    return w.addresses.length > 0 && w.paymentMethods.length > 0;
  };

  /** Teklif / satın alma için eksikler (rules: teklif kuralları onayı da gerekli mi) */
  const setupNeeds = (rules: boolean) => {
    const w = useWalletStore.getState();
    return { needCard: w.paymentMethods.length === 0, needAddress: w.addresses.length === 0, needRules: rules && !hasAcceptedBidRules(useLivePrefs.getState()) };
  };

  /** Lotun motordaki son hâli: sahnedeyse güncel, bittiyse sonucu (SATILDI / SATILMADI ve son fiyat) */
  const latestLot = (target: LiveLot): LiveLot => {
    const s = engine.getSnapshot();
    if (s.lot?.id === target.id) return s.lot;
    if (s.lastResult?.lot.id === target.id) return s.lastResult.lot;
    const sold = s.sold.find((x) => x.via === 'auction' && x.product.id === target.product.id);
    return { ...target, status: sold ? 'sold' : 'unsold', currentBid: sold?.price ?? target.currentBid };
  };

  /** Tek sayfalık "Teklife hazırlan" kurulumunu aç; kaydedilince `action` sürer */
  const openSetup = (req: Omit<BidSetupRequest, 'id'>, action?: () => void) => {
    setSetup({ req: { ...req, id: Date.now() }, action });
    openSheet('setup');
  };

  /**
   * Giriş + kart/adres zorunluluğu ve (intro ile) teklif kuralları onayı.
   * Her şey hazırsa eylem hemen çalışır; değilse açık sayfa kapatılıp eksikler tek sayfada
   * ("Teklife hazırlan") istenir. Misafir önce kaydolur, ardından sayfa hemen açılır.
   */
  const withGate = (action: () => void, opts: { intro?: boolean; reason?: string; intent?: BidSetupIntent; bid?: BidSetupRequest['bid'] } = {}) => {
    // Misafir: önce giriş; tamamlanınca kontrol kaldığı yerden sürer
    if (!isSignedIn()) {
      withAuth(() => withGate(action, opts), opts.reason ?? AUTH_REASONS.generic);
      return;
    }
    const need = setupNeeds(!!opts.intro);
    if (!need.needCard && !need.needAddress && !need.needRules) {
      action();
      return;
    }
    // Giriş sırasında lot bitmiş olabilir: sayfa lotun son hâliyle (SATILDI…) açılır
    const bid = opts.bid ? { ...opts.bid, lot: latestLot(opts.bid.lot) } : undefined;
    openSetup({ intent: opts.intent ?? (opts.intro ? 'bidFlow' : 'other'), bid, ...need }, action);
  };

  const onSetupSaved = () => {
    const pending = setup;
    setSheet(null);
    setSetup((s) => (s ? { req: s.req } : s));
    if (pending?.action) {
      // Basılı tutarak verilen teklif hemen gider (sayfa açmaz); diğerleri sayfa kapanınca sürer
      if (pending.req.intent === 'bid') pending.action();
      else setTimeout(pending.action, SHEET_SWAP_MS);
      return;
    }
    toast.success(READY_TOAST, 'checkmark-circle-outline');
  };

  /** "Mezata hazır ol": misafirse önce kayıt, sonra eksikler için kurulum (bekleyen teklif yok) */
  const prepareToBid = () =>
    withAuth(() => {
      const need = setupNeeds(true);
      if (!need.needCard && !need.needAddress && !need.needRules) {
        toast.success(READY_TOAST, 'checkmark-circle-outline');
        return;
      }
      openSetup({ intent: 'setup', ...need });
    }, AUTH_REASONS.bid);

  const dismissReadyBanner = () => {
    READY_BANNER_DISMISSED.add(show.id);
    setReadyDismissed(true);
  };

  const doFollow = () => {
    if (useSocialStore.getState().isFollowing(seller.id)) return;
    useSocialStore.getState().toggleFollow(seller.id);
    engine.announceFollow();
    haptic.success();
    const pts = completeChallenge('follow_seller');
    toast.success(`${seller.username} takip ediliyor${pts ? ` · +${pts} puan` : ''}`, 'person-add-outline');
  };

  const followSeller = () => withAuth(doFollow, AUTH_REASONS.follow);

  const toggleFollow = () => {
    // Dokunulduğu andaki durum: giriş sırasında takip edildiyse "takibi bırak" sorusu çıkmasın
    const was = useSocialStore.getState().isFollowing(seller.id);
    withAuth(() => {
      if (!was || !useSocialStore.getState().isFollowing(seller.id)) {
        doFollow();
        return;
      }
      Alert.alert('Takibi bırak', `Takibi bırakırsan @${seller.username} yayına başladığında bildirim almazsın.`, [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Takibi bırak',
          style: 'destructive',
          onPress: () => {
            useSocialStore.getState().toggleFollow(seller.id);
            haptic.tap();
            toast(`${seller.username} artık takip edilmiyor`, 'person-remove-outline');
          },
        },
      ]);
    }, AUTH_REASONS.follow);
  };

  const sendReaction = () =>
    withAuth(() => {
      reactions.spawn(reactionEmoji, true);
      setTimeout(() => reactions.spawn(reactionEmoji, true), 120);
      engine.like();
    }, AUTH_REASONS.react);

  const onBackgroundPress = () => {
    const now = Date.now();
    if (now - lastTapAt.current < 320) {
      lastTapAt.current = 0;
      haptic.light();
      sendReaction();
    } else {
      lastTapAt.current = now;
    }
  };

  // ─── Teklif ────────────────────────────────────────────────────────────────

  const bidFeedback = (text: string) => {
    haptic.medium();
    const pts = completeChallenge('place_bid');
    toast.success(`${text}${pts ? ` · +${pts} puan` : ''}`, 'hammer-outline');
  };

  /**
   * Giriş/kurulumdan sonra sürdürülen işlemin lotu sahneden indiyse "sıradaki üründe hazırsın"
   * bildirimi gösterilir ve true döner (başka bir ürüne teklif verilmez).
   */
  const missedLot = (target?: LiveLot) => {
    if (!target) return false;
    const l = engine.getSnapshot().lot;
    if (l && l.id === target.id && l.status === 'running') return false;
    haptic.warning();
    const sold = latestLot(target).status === 'sold';
    toast(`${sold ? 'Bu ürün satıldı.' : 'Bu ürünün açık artırması sona erdi.'} Artık hazırsın; sıradaki üründe tek dokunuşla teklif verebilirsin.`, 'checkmark-circle-outline');
    return true;
  };

  /**
   * Hızlı teklif. `target`: giriş/kurulumdan sonra sürdürülen teklifin lotu; o lot bittiyse
   * başka bir ürüne teklif verilmez, "sıradaki üründe hazırsın" bildirimi gösterilir.
   */
  const quickBid = (shown: number, immediate: boolean, target?: LiveLot) => {
    if (missedLot(target)) return;
    const l = engine.getSnapshot().lot;
    if (!l || l.status !== 'running') {
      toast('Bu açık artırma sona erdi', 'time-outline');
      return;
    }
    if (l.leader?.isMe) {
      toast('Zaten öndesin 💪', 'checkmark-circle-outline');
      return;
    }
    const min = nextMinBid(l.currentBid, l.bidCount > 0);
    if (immediate && min > shown) {
      haptic.warning();
      toast.warning(`Fiyat değişti! Yeni teklif ${formatTRY(min)} · tekrar basılı tut`);
      return;
    }
    // Giriş/kurulum sonrası (immediate değil): seçilen tutar korunur, fiyat geçtiyse güncel en düşük teklif verilir
    const placed = engine.placeBid(immediate ? shown : Math.max(shown, min));
    if (placed == null) {
      haptic.error();
      toast.error('Teklif verilemedi, süre doldu');
      return;
    }
    bidFeedback(`Teklifin alındı · ${formatTRY(placed)}`);
  };

  const onSwipe = (shown: number) => {
    // Misafir giriş yapana / kurulum bitene kadar fiyat değişebilir: o durumda güncel en düşük teklif verilir
    const immediate = isSignedIn() && isReady() && hasAcceptedBidRules(useLivePrefs.getState());
    const target = engine.getSnapshot().lot;
    withGate(() => quickBid(shown, immediate, immediate ? undefined : target), {
      intro: true,
      reason: AUTH_REASONS.bid,
      intent: 'bid',
      bid: target ? { amount: shown, lot: target } : undefined,
    });
  };

  /** Özel tutar: kurulum sırasında lot bittiyse sayfa açılıp kapanmaz, "hazırsın" bildirimi çıkar */
  const onCustom = () => {
    const ready = isSignedIn() && isReady() && hasAcceptedBidRules(useLivePrefs.getState());
    const target = engine.getSnapshot().lot;
    withGate(
      () => {
        if (!ready && missedLot(target)) return;
        openSheet('custom');
      },
      { intro: true, reason: AUTH_REASONS.bid, bid: target ? { lot: target } : undefined },
    );
  };

  const onCustomSubmit = ({ amount, max }: CustomBidSubmit): boolean => {
    const l = engine.getSnapshot().lot;
    if (!l || l.status !== 'running') {
      toast('Bu açık artırma sona erdi', 'time-outline');
      return true;
    }
    const wasLeader = !!l.leader?.isMe;
    const result = max ? engine.setMaxBid(amount) : engine.placeBid(amount);
    if (result == null) {
      haptic.error();
      toast.error(`En az ${formatTRY(nextMinBid(l.currentBid, l.bidCount > 0))} teklif vermelisin`);
      return false;
    }
    if (max) bidFeedback(wasLeader ? `Otomatik teklif üst sınırın ${formatTRY(amount)} oldu` : `Otomatik teklif üst sınırın ${formatTRY(amount)} · ${formatTRY(result)} ile öndesin`);
    else bidFeedback(`Teklifin alındı · ${formatTRY(result)}`);
    return true;
  };

  const onPreBidSubmit = ({ amount }: CustomBidSubmit): boolean => {
    const p = sheetProduct;
    if (!p) return true;
    if (!engine.addPreBid(p.id, amount)) {
      toast('Bu ürün şu an sahnede, doğrudan teklif verebilirsin', 'hammer-outline');
      return true;
    }
    useOrdersStore.getState().placePreBid(p.id, show.id, amount);
    haptic.success();
    toast.success(`Ön teklifin ${formatTRY(amount)} · Ürün sahneye gelince otomatik devreye girer`, 'lock-closed-outline');
    return true;
  };

  // ─── Çekiliş ───────────────────────────────────────────────────────────────

  // Şansa dayalı katılım için görev puanı verilmez
  const giveawayFeedback = () => {
    haptic.success();
    toast.success('Kura listesindesin 🎁 Çekiliş bitene dek bu yayından çıkma.', 'gift-outline');
  };

  const enterGiveaway = () => {
    withGate(
      () => {
        const r = engine.enterGiveaway();
        if (r === 'need_follow') openSheet('followEnter');
        else if (r === 'entered') giveawayFeedback();
        else toast('Bu çekilişe artık katılınamıyor', 'time-outline');
      },
      { reason: AUTH_REASONS.giveaway },
    );
  };

  const followAndEnter = () => {
    doFollow();
    setSheet(null);
    setTimeout(() => {
      if (engine.enterGiveaway() === 'entered') giveawayFeedback();
    }, 60);
  };

  // ─── Hemen Al ──────────────────────────────────────────────────────────────

  const buyInfo = (p: Product) => {
    const snap = engine.getSnapshot();
    const fresh = snap.shop.find((x) => x.id === p.id) ?? p;
    const f = snap.flash && snap.flash.status === 'running' && snap.flash.product.id === p.id ? snap.flash : undefined;
    if (f) return { product: fresh, unitPrice: f.price, originalPrice: f.originalPrice, flash: true, stock: Math.min(f.remaining, fresh.quantity - fresh.sold) };
    return { product: fresh, unitPrice: fresh.price, originalPrice: fresh.compareAtPrice, flash: false, stock: fresh.quantity - fresh.sold };
  };

  const openBuy = (p: Product) => {
    setSheetProduct(p);
    openSheet('buy');
  };

  const confirmBuy = (qty: number) => {
    const p = sheetProduct;
    if (!p) return;
    if (!isSignedIn() || !isReady()) {
      withGate(
        () => {
          toast.success('Bilgilerin kaydedildi, şimdi satın alabilirsin', 'checkmark-circle-outline');
          openSheet('buy');
        },
        { reason: AUTH_REASONS.buy, intent: 'buy' },
      );
      return;
    }
    setProcessing(true);
    setTimeout(() => {
      setProcessing(false);
      const info = buyInfo(p);
      if (info.stock < qty) {
        haptic.error();
        toast.error('Üzgünüz, bu ürün az önce tükendi');
        setSheet(null);
        return;
      }
      const { order, discount } = purchaseInLive({ product: info.product, price: info.unitPrice, source: info.flash ? 'flash_sale' : 'buy_now', showId: show.id, quantity: qty });
      engine.recordPurchase(info.product, Math.max(0, info.unitPrice - discount), info.flash ? 'flash_sale' : 'buy_now', qty);
      haptic.success();
      setSheet(null);
      setCelebration({
        id: Date.now(),
        kind: 'purchase',
        product: info.product,
        price: Math.max(0, info.unitPrice - discount),
        quantity: qty,
        orderId: order.id,
        discount,
        bundled: order.shippingNote === 'bundled' && order.shippingCost === 0,
      });
    }, 1000);
  };

  // ─── Sohbet ────────────────────────────────────────────────────────────────

  const onSend = (text: string): boolean => {
    // Güvenlik ağı: misafir sohbet alanını zaten açamaz
    if (!isSignedIn()) {
      withAuth(() => setComposer({ open: true, text }), AUTH_REASONS.chat);
      return true;
    }
    if (containsBlocked(text)) {
      haptic.error();
      toast.error(MODERATION_BLOCKED_MESSAGE, 'shield-outline');
      return false;
    }
    const now = Date.now();
    if (now - lastChatAt.current < CHAT_COOLDOWN_MS) {
      haptic.warning();
      return false;
    }
    lastChatAt.current = now;
    engine.sendMessage(text);
    setComposer({ open: false, text: '' });
    const pts = completeChallenge('chat');
    if (pts) toast.success(`+${pts} puan · Sohbete katıldın 💬`, 'chatbubble-outline');
    return true;
  };

  const onChatUser = (m: ChatMessage) => {
    if (m.isMe) return;
    if (m.isSeller || m.userId === seller.id) {
      openSheet('seller');
      return;
    }
    setChatUser({ id: m.userId ?? m.username, username: m.username, avatar: m.avatar, isMod: m.isMod });
    openSheet('user');
  };

  const onViewer = (v: LiveViewer) => {
    setChatUser({ id: v.id, username: v.username, avatar: v.avatar, isMod: v.isMod });
    openSheet('user');
  };

  const messageUser = (userId: string) =>
    withAuth(() => {
      const conv = useInboxStore.getState().ensureConversation(userId);
      navigate(`/inbox/${conv.id}`);
    }, AUTH_REASONS.message);

  // ─── Diğer ─────────────────────────────────────────────────────────────────

  const share = () => {
    shareLink({ title: show.title, path: `/live/${show.id}`, message: `${seller.username} şu an Mezatonline'da canlı yayında! 🔴 ${show.title}` });
  };

  const toggleMute = () => {
    haptic.tap();
    setLiveSoundOn(!liveSoundOn);
  };

  // Satıcıyı destekle: ücretli öne çıkarma ve bahşiş bayraklarla kapatılabilir
  const supportEnabled = FEATURES.paidBoost || FEATURES.tips;
  const openTip = () => withGate(() => openSheet('tip'), { reason: AUTH_REASONS.tip });
  // Sağ sütunda ref erişen withGate kullanılmaz (render sırasında sıralanıyor); kart kontrolünü TipSheet yapar
  const openSupport = () => (FEATURES.paidBoost ? openSheet('boost') : withAuth(() => openSheet('tip'), AUTH_REASONS.tip));

  const doBoost = (amount: number) => {
    withGate(
      () => {
        setBoosting(true);
        if (sheet !== 'boost') openSheet('boost');
        setTimeout(() => {
          setBoosting(false);
          setBoost((b) => ({ ...b, raised: Math.min(b.goal, b.raised + amount) }));
          engine.boost(amount);
          haptic.success();
          toast.success(`${formatTRY(amount)} katkın için teşekkürler! 🚀`, 'rocket-outline');
        }, 800);
      },
      { reason: AUTH_REASONS.boost },
    );
  };

  const makeClip = () =>
    withAuth(() => {
      setSheet(null);
      setClipping(true);
      toast('Son bir dakikadan klip hazırlanıyor…', 'film-outline');
      setTimeout(() => {
        setClipping(false);
        haptic.success();
        toast.success('Klip hazırlandı 🎬 Demo sürümde klipler kaydedilmez.', 'film-outline');
      }, 1800);
    }, AUTH_REASONS.save);

  const hideShow = () => {
    useLivePrefs.getState().hideShow(show.id);
    setSheet(null);
    toast('Bu yayını gizledik, benzerlerini daha az göstereceğiz', 'eye-off-outline');
    onNext();
  };

  const blockSeller = () =>
    withAuth(() => {
      setSheet(null);
      setTimeout(() => {
        Alert.alert(`${seller.username} engellensin mi?`, 'Bu satıcının yayınlarını ve mesajlarını artık görmezsin. İstediğin zaman Ayarlar’dan kaldırabilirsin.', [
          { text: 'Vazgeç', style: 'cancel' },
          {
            text: 'Engelle',
            style: 'destructive',
            onPress: () => {
              useSocialStore.getState().block(seller.id);
              haptic.success();
              toast.success(`${seller.username} engellendi`, 'ban-outline');
              onClose();
            },
          },
        ]);
      }, SHEET_SWAP_MS);
    }, AUTH_REASONS.block);

  const toggleBlockUser = () => {
    if (!chatUser) return;
    withAuth(() => {
      const s = useSocialStore.getState();
      if (s.blockedIds.includes(chatUser.id)) {
        s.unblock(chatUser.id);
        toast(`${chatUser.username} için engel kaldırıldı`, 'checkmark-circle-outline');
      } else {
        s.block(chatUser.id);
        haptic.success();
        toast.success(`${chatUser.username} engellendi, mesajlarını görmeyeceksin`, 'ban-outline');
      }
      setSheet(null);
    }, AUTH_REASONS.block);
  };

  const openClub = () => {
    const extra = watch.since ? Date.now() - watch.since : 0;
    setClubMinutes((watch.acc + extra) / 60000);
    openSheet('club');
  };

  const openViewers = () => {
    setViewerSample(engine.getViewerSample(36));
    openSheet('viewers');
  };

  // Yalnızca geliştirme: ?qa=… ile sayfa/durum aç (simülatörde dokunmadan ekran görüntüsü almak için)
  const [qaDone, setQaDone] = useState(false);
  useEffect(() => {
    if (!__DEV__ || !qa || qaDone || !visible) return;
    setQaDone(true);
    const sheetNames: SheetName[] = (['custom', 'shop', 'wallet', 'seller', 'more', 'boost', 'club', 'reactions', 'tip', 'giveawayInfo'] as SheetName[]).filter(
      (n) => (n !== 'boost' || FEATURES.paidBoost) && (n !== 'tip' || FEATURES.tips),
    );
    // Lot isteyen durumlar: en az 8 sn'si kalan, süren bir açık artırma bekle (en fazla ~30 sn)
    const needsLot = ['custom', 'product', 'won', 'sold', 'leading', 'intro'].includes(qa);
    let tries = 0;
    // Temizlenmez: setQaDone sonrası yeniden render bu zamanlayıcıyı iptal etmemeli (yalnızca __DEV__)
    const attempt = () => {
      const s = engine.getSnapshot();
      if (needsLot && (s.lot?.status !== 'running' || s.lot.endsAt - Date.now() < 8000) && tries++ < 40) {
        setTimeout(attempt, 700);
        return;
      }
      const shopItem = s.shop.find((p) => p.quantity - p.sold > 0) ?? products[0];
      if (qa === 'viewers') openViewers();
      else if (qa === 'buy') openBuy(shopItem);
      else if (qa === 'product' && s.lot) {
        setSheetProduct(s.lot.product);
        setSheet('product');
      } else if (qa === 'prebid' && s.queue[0]) {
        setSheetProduct(s.queue[0]);
        setSheet('prebid');
      } else if (qa === 'user') {
        const m = s.messages.find((x) => x.type === 'chat' && !x.isSeller && !x.isMe);
        if (m) onChatUser(m);
      } else if (qa === 'composer') setComposer({ open: true, text: '' });
      else if (qa === 'mutehint') setMuteHint(true);
      else if (qa === 'leading' && s.lot) engine.setMaxBid(s.lot.currentBid * 5 + 500);
      else if (qa === 'giveaway') engine.startGiveaway(undefined, 120, true);
      else if (qa === 'giveawayWon') engine.startGiveaway(undefined, 2, false);
      else if (qa === 'flash' && shopItem) engine.startFlashSale(shopItem, 0.3, 120);
      else if (qa === 'sold') engine.endAuctionNow();
      // setup: tüm bölümler; intro: yalnızca kural onayı (teklif tutarıyla)
      else if (qa === 'setup') openSetup({ intent: 'setup', needCard: true, needAddress: true, needRules: true });
      else if (qa === 'intro' && s.lot) {
        const target = s.lot;
        const amount = nextMinBid(target.currentBid, target.bidCount > 0);
        openSetup({ intent: 'bid', bid: { amount, lot: target }, needCard: false, needAddress: false, needRules: true }, () => quickBid(amount, false, target));
      } else if (qa === 'ended') engine.endShow();
      else if (qa === 'won' && s.lot) {
        setCelebration({ id: Date.now(), kind: 'won', product: s.lot.product, price: s.lot.currentBid, quantity: 1, discount: 0, bundled: false });
      } else if ((sheetNames as string[]).includes(qa)) setSheet(qa as SheetName);
    };
    setTimeout(attempt, 2500);
  });

  // ─── Türetilmiş değerler ───────────────────────────────────────────────────

  const nextBid = lot ? nextMinBid(lot.currentBid, lot.bidCount > 0) : 0;
  const leading = !!lot?.leader?.isMe && running;
  const couponOff = lot && running && !guest ? couponDiscount(coupon, Math.max(lot.currentBid, nextBid)) : 0;
  const freeShippingThreshold = show.freeShippingThreshold;
  /**
   * Ürün bu birim fiyata alınırsa alıcının kargo payı. Sipariş gibi kupon düşülmüş tutarla hesaplanır
   * (yayının ücretsiz kargo eşiği bu tutara bakar); misafirin bu yayında paketi olmaz.
   */
  const quoteFor = (p: Product | undefined, price: number): ShippingQuote => {
    if (!p) return { buyer: 0, seller: 0 };
    const itemTotal = Math.max(0, price - (guest ? 0 : couponDiscount(coupon, price)));
    return shippingQuoteFor(p, show.id, itemTotal, guest ? [] : orders);
  };
  // Kazanırsan ödenecek fiyat: öndeysen güncel teklif, değilsen en az sıradaki teklif
  const winPrice = lot ? (running && !leading ? nextBid : lot.currentBid) : 0;
  const lotShipping = quoteFor(lot?.product, winPrice);
  const flash = state.flash;
  const soldAuctionIds = new Set(state.sold.filter((s) => s.via === 'auction').map((s) => s.product.id));
  const shopCount = state.queue.filter((p) => !soldAuctionIds.has(p.id)).length + state.shop.filter((p) => p.quantity - p.sold > 0).length;
  const sellerOrders = guest ? [] : orders.filter((o) => o.sellerId === seller.id && o.status !== 'cancelled');
  const sellerSpend = sellerOrders.reduce((sum, o) => sum + o.itemPrice, 0);
  const hasClub = seller.followers > 15000 || seller.badges.includes('top_seller');
  const muted = !liveSoundOn;
  const shareCount = show.savedCount * 3 + (hashOf(show.id) % 400);
  // Misafirin arkadaş listesi yok
  const friends = guest ? [] : BUYER_USERS.slice(hashOf(show.id) % 20, (hashOf(show.id) % 20) + (hashOf(show.id) % 3));
  const bottomPad = Math.max(insets.bottom, 10) + 2;
  const ended = state.ended || endedShow;
  const giveaway = FEATURES.giveaways && state.giveaway && state.giveaway.id !== dismissedGiveaway ? state.giveaway : undefined;
  // Hemen teklif veremeyen izleyiciye (misafir / kart, adres ya da kural onayı eksik) "Mezata hazır ol"
  const bidReady = !guest && hasCard && hasAddress && rulesAccepted;
  const showReadyBanner = !bidReady && !readyDismissed;
  // Sohbet: sol altta, ekran yüksekliğinin en fazla ~%38'i; üstündeki çekiliş şeridiyle birlikte orta bölgeye sığmazsa küçülür
  const chatH = Math.max(0, Math.min(Math.round(height * 0.38), middleH - 8 - (giveaway ? giveawayH + 6 : 0)));
  const mentionables = [
    { username: seller.username, avatar: seller.avatar },
    ...state.messages
      .slice(-40)
      .filter((m) => !m.isMe && m.type !== 'system' && m.username !== seller.username)
      .reverse()
      .map((m) => ({ username: m.username, avatar: m.avatar })),
  ];
  /** Ürün sayfasındaki kargo satırı: sahnedeki lotta kazanma fiyatına, diğerlerinde satış / açılış fiyatına göre */
  const shippingLine = (p?: Product) => {
    if (!p) return '';
    const q = quoteFor(p, lot?.product.id === p.id ? winPrice : buyInfo(p).unitPrice);
    return `${shippingText(q)}${freeShippingThreshold && q.buyer > 0 ? ` · ${thresholdText(freeShippingThreshold)}` : ''}`;
  };
  const buy = sheetProduct ? buyInfo(sheetProduct) : undefined;

  // Sağdaki cam kapsül: Paylaş · Müdavim Kartı · (Destekle) · Diğer · Ses. Ekrana sığdığı kadar öğe
  // gösterilir (prio küçük olan önce kalır); Cüzdan "Diğer" menüsündedir.
  const railAll: (RailItem & { prio: number })[] = [
    { key: 'share', label: 'Paylaş', icon: 'share-outline' as const, badge: formatCompact(shareCount), prio: 1, onPress: share },
    ...(hasClub ? [{ key: 'club', label: 'Müdavim', accessibilityLabel: 'Müdavim Kartı', icon: 'id-card-outline' as const, tint: liveColors.copper, prio: 2, onPress: openClub }] : []),
    ...(supportEnabled ? [{ key: 'boost', label: 'Destekle', icon: 'flash-outline' as const, prio: 3, onPress: openSupport }] : []),
    { key: 'more', label: 'Diğer', icon: 'ellipsis-horizontal' as const, prio: 0, onPress: () => openSheet('more') },
    { key: 'sound', label: muted ? 'Sesi aç' : 'Ses', icon: muted ? ('volume-mute-outline' as const) : ('volume-high-outline' as const), active: !muted, prio: 4, onPress: toggleMute },
  ];
  const railCompact = middleH > 0 && middleH < 330;
  // middleH, orta bölgenin alt boşluğunu (8) da içerir
  const railFit = middleH > 0 ? railCapacity(middleH - 8, railCompact) : railAll.length;
  const railKeep = new Set(
    railAll
      .slice()
      .sort((a, b) => a.prio - b.prio)
      .slice(0, railFit)
      .map((r) => r.key),
  );
  const rail: RailItem[] = railAll.filter((r) => railKeep.has(r.key));

  const actionRow = (
    <ActionRow
      state={running ? 'bidding' : 'waiting'}
      nextBid={nextBid}
      leading={leading}
      lotId={lot?.id}
      onCustom={onCustom}
      onSwipe={onSwipe}
      onTapHint={(amount) => toast(`Teklif vermek için düğmeyi basılı tut · ${formatTRY(amount)}`, 'hand-left-outline')}
    />
  );

  // ─── Görünüm ───────────────────────────────────────────────────────────────

  return (
    <View style={[styles.page, { width, height }]}>
      <LiveVideo coverImage={show.coverImage} videoUrl={show.videoUrl} mounted={visible && !endedShow} playing={active && !state.ended} muted={muted} />
      <Pressable style={StyleSheet.absoluteFill} onPress={onBackgroundPress} accessibilityLabel="Tepki göndermek için iki kez dokun" />

      {!ended ? (
        /*
          Tek sütunlu yerleşim (yukarıdan aşağı): üst bilgi → "Yayın bilgisi" çipi (+ ses ipucu) →
          orta bölge [çekiliş şeridi + sohbet (sol) | cam eylem kapsülü (sağ)] → açık artırma kartı
          (+ teklif paneli) → alt çubuk [sohbet kutusu | tepki | Mağaza · N] → ev göstergesi boşluğu.
          Hiçbir katman diğerinin üstüne taşmaz.
        */
        <View style={[StyleSheet.absoluteFill, { paddingBottom: bottomPad }]} pointerEvents="box-none">
          <LiveHeader
            show={show}
            seller={seller}
            viewers={state.viewers}
            following={following}
            topInset={insets.top}
            onFollow={followSeller}
            onSellerPress={() => openSheet('seller')}
            onViewersPress={openViewers}
            onClose={onClose}
          />

          <View style={styles.topSlot} pointerEvents="box-none">
            {show.description || muteHint ? (
              <View style={styles.notesRow} pointerEvents="box-none">
                {show.description ? <ShowNotes text={show.description} highlights={show.highlights} /> : <View />}
                {muteHint ? (
                  <Animated.View entering={FadeIn} exiting={FadeOut}>
                    <PressableScale scaleTo={0.94} onPress={toggleMute} style={[liveStyles.glass, styles.muteHint]} accessibilityLabel="Sesi aç">
                      <Icon name="volume-mute-outline" size={15} color={liveColors.text} />
                      <Text variant="footnote" weight="700" color={liveColors.text}>
                        Sesi açmak için dokun
                      </Text>
                    </PressableScale>
                  </Animated.View>
                ) : null}
              </View>
            ) : null}
            {showReadyBanner ? (
              <View style={styles.readyRow} pointerEvents="box-none">
                <ReadyBanner guest={guest} needCard={!hasCard} needAddress={!hasAddress} onPrepare={prepareToBid} onDismiss={dismissReadyBanner} />
              </View>
            ) : null}
          </View>

          <View style={styles.middle} pointerEvents="box-none" onLayout={(e) => setMiddleH(Math.round(e.nativeEvent.layout.height))}>
            <View style={styles.chatCol} pointerEvents="box-none">
              {giveaway ? (
                <View onLayout={(e) => setGiveawayH(Math.round(e.nativeEvent.layout.height))} pointerEvents="box-none">
                  <GiveawayCard
                    key={giveaway.id}
                    giveaway={giveaway}
                    onEnter={enterGiveaway}
                    onDismiss={() => setDismissedGiveaway(giveaway.id)}
                    onInfo={() => openSheet('giveawayInfo')}
                  />
                </View>
              ) : null}
              {!chatHidden && chatH > 56 ? <ChatList messages={state.messages} height={chatH} pinned={state.pinned} blockedIds={blockedIds} onUserPress={onChatUser} /> : null}
            </View>
            <ActionRail items={rail} compact={railCompact} />
          </View>

          <View style={styles.dock} pointerEvents="box-none" onLayout={(e) => setBottomH(Math.round(e.nativeEvent.layout.height) + bottomPad)}>
            {flash ? (
              <FlashSaleCard
                key={flash.id}
                flash={flash}
                onBuy={() => {
                  const p = state.shop.find((x) => x.id === flash.product.id) ?? flash.product;
                  withGate(() => openBuy(p), { reason: AUTH_REASONS.buy, intent: 'buy' });
                }}
              />
            ) : null}
            {lot ? (
              <AuctionCard
                lot={lot}
                shipping={lotShipping}
                freeShippingThreshold={freeShippingThreshold}
                couponDiscount={couponOff}
                onPress={() => {
                  setSheetProduct(lot.product);
                  openSheet('product');
                }}>
                {actionRow}
              </AuctionCard>
            ) : (
              actionRow
            )}
            <BottomBar
              shopCount={shopCount}
              reactionEmoji={reactionEmoji}
              guest={guest}
              onCompose={() => withAuth(() => setComposer({ open: true, text: '' }), AUTH_REASONS.chat)}
              onReact={sendReaction}
              onReactLong={() => withAuth(() => openSheet('reactions'), AUTH_REASONS.react)}
              onShop={() => openSheet('shop')}
            />
          </View>
        </View>
      ) : null}

      <ReactionLayer particles={reactions.particles} style={{ right: 12, bottom: bottomH + 4 }} />
      {giveaway?.status === 'done' && visible && !celebration ? <Confetti burst={hashOf(giveaway.id) || 1} count={40} /> : null}

      {ended ? (
        <ShowEnded
          seller={seller}
          following={following}
          soldCount={state.sold.length}
          nextShow={nextShow}
          upcoming={getShowsBySeller(seller.id).upcoming}
          active={visible && focused}
          onFollow={toggleFollow}
          onRaid={onNext}
          onHome={onClose}
        />
      ) : null}

      {ended ? (
        <View style={[styles.endedClose, { top: insets.top + 8 }]}>
          <PressableScale scaleTo={0.9} onPress={onClose} style={[liveStyles.glass, styles.closeBtn]} accessibilityRole="button" accessibilityLabel="Kapat">
            <Icon name="close" size={20} color={liveColors.text} />
          </PressableScale>
        </View>
      ) : null}

      {sellerBlocked ? (
        <View style={styles.blocked}>
          <Text variant="title3" weight="800" color={liveColors.text} align="center">
            Bu satıcıyı engelledin
          </Text>
          <Text variant="callout" color={liveColors.textSecondary} align="center">
            Engellediğin satıcıların yayınlarını izleyemez, teklif veremezsin.
          </Text>
          <View style={styles.blockedButtons}>
            <Button
              title="Engeli kaldır"
              variant="glass"
              onPress={() => {
                useSocialStore.getState().unblock(seller.id);
                haptic.success();
                toast(`${seller.username} için engel kaldırıldı`, 'checkmark-circle-outline');
              }}
            />
            <Button title="Kapat" onPress={onClose} />
          </View>
        </View>
      ) : null}

      {celebration ? (
        <Celebration
          key={celebration.id}
          data={celebration}
          me={{ username: me.username, avatar: me.avatar }}
          onClose={() => setCelebration(null)}
          onViewOrder={() => {
            const id = celebration.orderId;
            setCelebration(null);
            if (id) router.push(`/orders/${id}` as Href);
          }}
        />
      ) : null}

      {/* ─── Alt sayfalar ─── */}
      <ChatComposer
        visible={composer.open && visible}
        initialText={composer.text}
        mentionables={mentionables}
        onClose={() => setComposer({ open: false, text: '' })}
        onSend={onSend}
      />
      {setup ? (
        <BidSetupSheet
          key={setup.req.id}
          visible={sheet === 'setup'}
          request={setup.req}
          lot={lot}
          seller={seller}
          onClose={closeAllSheets}
          onSaved={onSetupSaved}
        />
      ) : null}
      <CustomBidSheet
        visible={sheet === 'custom'}
        onClose={closeAllSheets}
        mode="live"
        product={lot?.product}
        lot={lot}
        shippingFor={(price) => quoteFor(lot?.product, price)}
        freeShippingThreshold={freeShippingThreshold}
        onSubmit={onCustomSubmit}
      />
      <CustomBidSheet
        visible={sheet === 'prebid'}
        onClose={closeAllSheets}
        mode="prebid"
        product={sheetProduct}
        startPrice={sheetProduct?.price}
        existingPreBid={sheetProduct ? state.myPreBids?.[sheetProduct.id] : undefined}
        shippingFor={(price) => quoteFor(sheetProduct, price)}
        freeShippingThreshold={freeShippingThreshold}
        onSubmit={onPreBidSubmit}
      />
      <SellerSheet
        visible={sheet === 'seller'}
        onClose={closeAllSheets}
        seller={seller}
        following={following}
        onToggleFollow={toggleFollow}
        onMessage={() => messageUser(seller.id)}
        onTip={FEATURES.tips ? openTip : undefined}
        onBoost={FEATURES.paidBoost ? () => openSheet('boost') : undefined}
        onProfile={() => navigate(`/user/${seller.username}`)}
        onReport={() => withAuth(() => openSheet('reportSeller'), AUTH_REASONS.report)}
        onBlock={blockSeller}
      />
      {FEATURES.tips ? <TipSheet visible={sheet === 'tip'} onClose={closeAllSheets} seller={seller} dark onSent={(amount) => engine.tip(amount)} /> : null}
      <ReportSheet visible={sheet === 'reportSeller'} onClose={closeAllSheets} subject={`@${seller.username}`} dark />
      <ReportSheet visible={sheet === 'reportShow'} onClose={closeAllSheets} subject={`Yayın: ${show.title}`} dark />
      <ReportSheet visible={sheet === 'reportUser'} onClose={closeAllSheets} subject={`@${chatUser?.username ?? ''}`} dark />
      <ViewersSheet
        visible={sheet === 'viewers'}
        onClose={closeAllSheets}
        viewers={state.viewers}
        seller={seller}
        sample={viewerSample}
        friends={friends}
        onViewerPress={onViewer}
        onSellerPress={() => openSheet('seller')}
        onMessageFriend={(u) => messageUser(u.id)}
      />
      <UserSheet
        visible={sheet === 'user'}
        onClose={closeAllSheets}
        user={chatUser}
        blocked={!!chatUser && blockedIds.includes(chatUser.id)}
        onMention={() =>
          withAuth(() => {
            const name = chatUser?.username ?? '';
            setSheet(null);
            setTimeout(() => setComposer({ open: true, text: `@${name} ` }), SHEET_SWAP_MS);
          }, AUTH_REASONS.chat)
        }
        onReport={() => withAuth(() => openSheet('reportUser'), AUTH_REASONS.report)}
        onToggleBlock={toggleBlockUser}
      />
      <MoreSheet
        visible={sheet === 'more'}
        onClose={closeAllSheets}
        muted={muted}
        chatHidden={chatHidden}
        clipping={clipping}
        onShare={() => {
          setSheet(null);
          setTimeout(share, SHEET_SWAP_MS);
        }}
        onClip={makeClip}
        onToggleMute={(m) => setLiveSoundOn(!m)}
        onToggleChat={setChatHidden}
        onReactions={() => withAuth(() => openSheet('reactions'), AUTH_REASONS.react)}
        onWallet={openWallet}
        onBoost={supportEnabled ? openSupport : undefined}
        onClub={hasClub ? openClub : undefined}
        onCaptions={() => {
          setSheet(null);
          setTimeout(() => Alert.alert('Altyazılar', 'Canlı altyazıları cihazının Ayarlar › Erişilebilirlik › Altyazılar bölümünden açabilirsin.'), SHEET_SWAP_MS);
        }}
        onHideShow={hideShow}
        onReport={() => withAuth(() => openSheet('reportShow'), AUTH_REASONS.report)}
        onLeave={() => {
          setSheet(null);
          onClose();
        }}
      />
      <RewardsClubSheet
        visible={sheet === 'club'}
        onClose={closeAllSheets}
        seller={seller}
        purchases={sellerOrders.length}
        spend={sellerSpend}
        watchedMinutes={clubMinutes}
        couponActive={!guest && coupon?.code === MUDAVIM_COUPON_CODE}
        onRedeem={(code) =>
          withAuth(() => {
            const res = useLivePrefs.getState().applyCoupon(code);
            if (res.ok) {
              haptic.success();
              toast.success('Müdavim Kartı indirimin uygulandı: %5 indirim', 'pricetag-outline');
            } else toast(res.error, 'pricetag-outline');
          }, AUTH_REASONS.generic)
        }
      />
      <WalletSheet visible={sheet === 'wallet'} onClose={closeAllSheets} onNavigate={navigate} />
      {FEATURES.paidBoost ? (
        <BoostSheet
          visible={sheet === 'boost'}
          onClose={closeAllSheets}
          sellerName={seller.username}
          raised={boost.raised}
          goal={boost.goal}
          boosting={boosting}
          onBoost={doBoost}
          onTip={FEATURES.tips ? openTip : undefined}
        />
      ) : null}
      <ShopSheet
        visible={sheet === 'shop'}
        onClose={closeAllSheets}
        sellerName={seller.username}
        state={state}
        onProductPress={(p) => {
          setSheetProduct(p);
          openSheet('product');
        }}
        onBuyNow={(p) => withGate(() => openBuy(p), { reason: AUTH_REASONS.buy, intent: 'buy' })}
        shippingFor={(p) => shippingText(quoteFor(p, buyInfo(p).unitPrice))}
        onPreBid={(p) => {
          setSheetProduct(p);
          withGate(() => openSheet('prebid'), { intro: true, reason: AUTH_REASONS.bid });
        }}
        onEnterGiveaway={enterGiveaway}
      />
      <BuyNowSheet
        visible={sheet === 'buy'}
        onClose={closeAllSheets}
        product={buy?.product}
        unitPrice={buy?.unitPrice ?? 0}
        originalPrice={buy?.originalPrice}
        flash={!!buy?.flash}
        stock={buy?.stock ?? 0}
        showId={show.id}
        freeShippingThreshold={freeShippingThreshold}
        processing={processing}
        onNavigate={navigate}
        onConfirm={confirmBuy}
      />
      <ProductSheet
        visible={sheet === 'product'}
        onClose={closeAllSheets}
        product={sheetProduct}
        currentBid={sheetProduct && lot && running && lot.product.id === sheetProduct.id ? lot.currentBid : undefined}
        shippingLine={shippingLine(sheetProduct)}
        onOpenPage={(p) => navigate(`/product/${p.id}`)}
        withAuth={withAuth}
      />
      <FollowEnterSheet visible={sheet === 'followEnter'} onClose={closeAllSheets} seller={seller} onConfirm={followAndEnter} />
      <GiveawayInfoSheet
        visible={FEATURES.giveaways && sheet === 'giveawayInfo'}
        onClose={closeAllSheets}
        giveaway={state.giveaway}
        onEnter={() => {
          setSheet(null);
          setTimeout(enterGiveaway, SHEET_SWAP_MS);
        }}
      />
      <ReactionSheet visible={sheet === 'reactions'} onClose={closeAllSheets} onShop={() => navigate('/rewards')} />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { overflow: 'hidden', backgroundColor: liveColors.panel },
  topSlot: { minHeight: 6 },
  notesRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingHorizontal: SCREEN_PADDING - 4, marginTop: 8, gap: 8 },
  muteHint: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 30, borderRadius: 999, paddingHorizontal: 12 },
  readyRow: { paddingHorizontal: SCREEN_PADDING - 4, marginTop: 8 },
  middle: { flex: 1, minHeight: 0, flexDirection: 'row', alignItems: 'flex-end', paddingLeft: SCREEN_PADDING - 4, paddingRight: 6, paddingBottom: 8, gap: 6, overflow: 'hidden' },
  chatCol: { flex: 1, alignSelf: 'stretch', justifyContent: 'flex-end', maxWidth: '78%', gap: 6 },
  dock: { paddingHorizontal: SCREEN_PADDING - 4, gap: 8 },
  endedClose: { position: 'absolute', right: SCREEN_PADDING, zIndex: 60 },
  blocked: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 70, backgroundColor: liveColors.panel, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 10 },
  blockedButtons: { flexDirection: 'row', gap: 10, marginTop: 10 },
  closeBtn: { width: 36, height: 36, borderRadius: LIVE_RADIUS.button, alignItems: 'center', justifyContent: 'center' },
});
