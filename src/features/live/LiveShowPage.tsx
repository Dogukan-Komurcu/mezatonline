/**
 * Tek bir canlı yayın sayfası (dikey kaydırıcıdaki bir sayfa).
 * Video + üst bilgi + çekiliş + sohbet + sağ eylem sütunu + sabit ürün kartı + kaydır-teklif-ver
 * ve tüm alt sayfalar (S20–S34).
 */
import { router, type Href } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, PressableScale, Text, toast } from '@/components/ui';
import { BUYER_USERS, getProductsByShow, getShowsBySeller, getUser } from '@/data';
import { ReportSheet, shareLink, TipSheet } from '@/features/shared/sheets';
import { requireTransactSetup } from '@/features/wallet/TransactSetup';
import { nextMinBid } from '@/lib/auction';
import { formatCompact, formatTRY } from '@/lib/format';
import { haptic } from '@/lib/haptics';
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
import { ActionRail, type RailItem } from './components/ActionRail';
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
import { ReactionLayer, useReactions } from './components/Reactions';
import { ShowEnded } from './components/ShowEnded';
import { ShowNotes } from './components/ShowNotes';
import { textShadow } from './components/styles';
import type { LiveEvents, LiveViewer } from './engine';
import { couponDiscount, useLivePrefs } from './liveStore';
import { markPreBid } from './prebids';
import { hasBundleInShow, purchaseInLive, useShowBundle } from './purchase';
import { BidIntroSheet } from './sheets/BidIntroSheet';
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
  | 'intro'
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
const SHEET_SWAP_MS = 300;
const CHAT_COOLDOWN_MS = 2500;

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
  onClose: () => void;
  onNext: () => void;
};

export function LiveShowPage({ show, width, height, visible, focused, nextShow, onClose, onNext }: LiveShowPageProps) {
  const insets = useSafeAreaInsets();
  const me = useMe();
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
  const bundled = useShowBundle(show.id, show.sellerId);
  const reactionEmoji = POINTS_SHOP.find((i) => i.id === activeReactionId)?.emoji ?? '💛';

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
  const [bottomH, setBottomH] = useState(220);
  const [muteHint, setMuteHint] = useState(false);
  const [viewerSample, setViewerSample] = useState<LiveViewer[]>([]);
  const [clubMinutes, setClubMinutes] = useState(0);
  const reactions = useReactions();

  const pendingAction = useRef<(() => void) | null>(null);
  const lastTapAt = useRef(0);
  const lastChatAt = useRef(0);
  const seenCrowdLikes = useRef(-1);
  /** İzleme süresi (Sadakat Kulübü ilerlemesi için) */
  const [watch, setWatch] = useState({ acc: 0, since: 0 });

  const closeAllSheets = () => setSheet(null);

  const events: LiveEvents = {
    onOutbid: (lot) => {
      haptic.warning();
      toast.warning(`Teklifin geçildi! Şu an ${formatTRY(lot.currentBid)}`, 'trending-up');
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
        bundled: order.shippingCost === 0 && lot.product.shippingCost > 0,
      });
    },
    onLost: (lot) => {
      markPreBid(lot.product.id, 'lost');
      toast(`Kaybettin, sıradaki ürün geliyor · Satış fiyatı ${formatTRY(lot.currentBid)}`, 'hourglass-outline');
    },
    onGiveawayWon: (g) => {
      haptic.success();
      // Çekilişte kargo ücretini satıcı karşılar
      const prize = { ...g.product, shippingCost: 0 };
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
      const pts = completeChallenge('watch_show');
      if (pts) toast.success(`+${pts} puan · Bugünün görevi: canlı yayın izle 🎯`, 'trophy');
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

  const navigate = (href: string) => {
    if (href === 'wallet') {
      openSheet('wallet');
      return;
    }
    setSheet(null);
    setTimeout(() => router.push(href as Href), sheet ? 260 : 0);
  };

  const isReady = () => {
    const w = useWalletStore.getState();
    return w.addresses.length > 0 && w.paymentMethods.length > 0;
  };

  /**
   * Kart + adres zorunluluğu (requireTransactSetup) ve istenirse ilk teklif tanıtımı.
   * Her şey hazırsa eylem hemen çalışır; değilse açık sayfa kapatılıp kurulum gösterilir.
   */
  const withGate = (action: () => void, opts: { intro?: boolean } = {}) => {
    const needIntro = !!opts.intro && !useLivePrefs.getState().bidIntroAccepted;
    if (isReady() && !needIntro) {
      action();
      return;
    }
    const run = () =>
      requireTransactSetup(
        () => {
          if (needIntro && !useLivePrefs.getState().bidIntroAccepted) {
            pendingAction.current = action;
            setSheet('intro');
            return;
          }
          action();
        },
        { dark: true },
      );
    if (sheet) {
      setSheet(null);
      setTimeout(run, SHEET_SWAP_MS);
    } else run();
  };

  const doFollow = () => {
    if (useSocialStore.getState().isFollowing(seller.id)) return;
    useSocialStore.getState().toggleFollow(seller.id);
    engine.announceFollow();
    haptic.success();
    const pts = completeChallenge('follow_seller');
    toast.success(`${seller.username} takip ediliyor${pts ? ` · +${pts} puan` : ''}`, 'person-add');
  };

  const toggleFollow = () => {
    if (!useSocialStore.getState().isFollowing(seller.id)) {
      doFollow();
      return;
    }
    Alert.alert('Takibi bırak', `${seller.username} adlı satıcıyı takip etmeyi bırakmak istediğine emin misin?`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Takibi bırak',
        style: 'destructive',
        onPress: () => {
          useSocialStore.getState().toggleFollow(seller.id);
          haptic.tap();
          toast(`${seller.username} artık takip edilmiyor`, 'person-remove');
        },
      },
    ]);
  };

  const sendReaction = () => {
    reactions.spawn(reactionEmoji, true);
    setTimeout(() => reactions.spawn(reactionEmoji, true), 120);
    engine.like();
  };

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
    toast.success(`${text}${pts ? ` · +${pts} puan` : ''}`, 'hammer');
  };

  const quickBid = (shown: number, immediate: boolean) => {
    const l = engine.getSnapshot().lot;
    if (!l || l.status !== 'running') {
      toast('Bu açık artırma sona erdi', 'time-outline');
      return;
    }
    if (l.leader?.isMe) {
      toast('Zaten öndesin 💪', 'checkmark-circle');
      return;
    }
    const min = nextMinBid(l.currentBid, l.bidCount > 0);
    if (immediate && min > shown) {
      haptic.warning();
      toast.warning(`Fiyat değişti! Yeni teklif ${formatTRY(min)} · tekrar kaydır`);
      return;
    }
    const placed = engine.placeBid(immediate ? shown : min);
    if (placed == null) {
      haptic.error();
      toast.error('Teklif verilemedi, süre doldu');
      return;
    }
    bidFeedback(`Teklifin alındı · ${formatTRY(placed)}`);
  };

  const onSwipe = (shown: number) => {
    const immediate = isReady() && useLivePrefs.getState().bidIntroAccepted;
    withGate(() => quickBid(shown, immediate), { intro: true });
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
    if (max) bidFeedback(wasLeader ? `Maks. teklifin ${formatTRY(amount)} olarak güncellendi` : `Maks. teklifin ${formatTRY(amount)} · ${formatTRY(result)} ile öndesin`);
    else bidFeedback(`Teklifin alındı · ${formatTRY(result)}`);
    return true;
  };

  const onPreBidSubmit = ({ amount }: CustomBidSubmit): boolean => {
    const p = sheetProduct;
    if (!p) return true;
    if (!engine.addPreBid(p.id, amount)) {
      toast('Bu ürün şu an sahnede, doğrudan teklif verebilirsin', 'hammer');
      return true;
    }
    useOrdersStore.getState().placePreBid(p.id, show.id, amount);
    haptic.success();
    toast.success(`Ön teklifin ${formatTRY(amount)} · Ürün sahneye gelince otomatik devreye girer`, 'lock-closed');
    return true;
  };

  // ─── Çekiliş ───────────────────────────────────────────────────────────────

  const giveawayFeedback = () => {
    haptic.success();
    const pts = completeChallenge('enter_giveaway');
    toast.success(`Çekilişe katıldın! Bitene kadar yayında kal 🎁${pts ? ` · +${pts} puan` : ''}`, 'gift');
  };

  const enterGiveaway = () => {
    withGate(() => {
      const r = engine.enterGiveaway();
      if (r === 'need_follow') openSheet('followEnter');
      else if (r === 'entered') giveawayFeedback();
      else toast('Bu çekilişe artık katılınamıyor', 'time-outline');
    });
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
    if (!isReady()) {
      setSheet(null);
      setTimeout(
        () =>
          requireTransactSetup(
            () => {
              toast.success('Bilgilerin kaydedildi, şimdi satın alabilirsin', 'checkmark-circle');
              setSheet('buy');
            },
            { dark: true },
          ),
        SHEET_SWAP_MS,
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
        bundled: order.shippingCost === 0 && info.product.shippingCost > 0,
      });
    }, 1000);
  };

  // ─── Sohbet ────────────────────────────────────────────────────────────────

  const onSend = (text: string): boolean => {
    const now = Date.now();
    if (now - lastChatAt.current < CHAT_COOLDOWN_MS) {
      haptic.warning();
      return false;
    }
    lastChatAt.current = now;
    engine.sendMessage(text);
    setComposer({ open: false, text: '' });
    const pts = completeChallenge('chat');
    if (pts) toast.success(`+${pts} puan · Sohbete katıldın 💬`, 'chatbubble');
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

  const messageUser = (userId: string) => {
    const conv = useInboxStore.getState().ensureConversation(userId);
    navigate(`/inbox/${conv.id}`);
  };

  // ─── Diğer ─────────────────────────────────────────────────────────────────

  const share = () => {
    shareLink({ title: show.title, path: `/live/${show.id}`, message: `${seller.username} şu an Mezatonline'da canlı yayında! 🔴 ${show.title}` });
  };

  const toggleMute = () => {
    haptic.tap();
    setLiveSoundOn(!liveSoundOn);
  };

  const doBoost = (amount: number) => {
    withGate(() => {
      setBoosting(true);
      if (sheet !== 'boost') openSheet('boost');
      setTimeout(() => {
        setBoosting(false);
        setBoost((b) => ({ ...b, raised: Math.min(b.goal, b.raised + amount) }));
        engine.boost(amount);
        haptic.success();
        toast.success(`${formatTRY(amount)} katkın için teşekkürler! 🚀`, 'rocket');
      }, 800);
    });
  };

  const makeClip = () => {
    setSheet(null);
    setClipping(true);
    toast('Klip oluşturuluyor… Son 60 saniye kaydediliyor', 'film-outline');
    setTimeout(() => {
      setClipping(false);
      haptic.success();
      toast.success('Klip profiline gizli olarak kaydedildi 🎬', 'film');
    }, 1800);
  };

  const hideShow = () => {
    useLivePrefs.getState().hideShow(show.id);
    setSheet(null);
    toast('Bu yayını gizledik, benzerlerini daha az göstereceğiz', 'eye-off-outline');
    onNext();
  };

  const blockSeller = () => {
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
            toast.success(`${seller.username} engellendi`, 'ban');
            onClose();
          },
        },
      ]);
    }, SHEET_SWAP_MS);
  };

  const toggleBlockUser = () => {
    if (!chatUser) return;
    const s = useSocialStore.getState();
    if (s.blockedIds.includes(chatUser.id)) {
      s.unblock(chatUser.id);
      toast(`${chatUser.username} için engel kaldırıldı`, 'checkmark-circle');
    } else {
      s.block(chatUser.id);
      haptic.success();
      toast.success(`${chatUser.username} engellendi, mesajlarını görmeyeceksin`, 'ban');
    }
    setSheet(null);
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

  // ─── Türetilmiş değerler ───────────────────────────────────────────────────

  const nextBid = lot ? nextMinBid(lot.currentBid, lot.bidCount > 0) : 0;
  const leading = !!lot?.leader?.isMe && running;
  const shippingCost = lot ? lot.product.shippingCost : 0;
  const couponOff = lot && running ? couponDiscount(coupon, Math.max(lot.currentBid, nextBid)) : 0;
  const giveaway = state.giveaway && state.giveaway.id !== dismissedGiveaway ? state.giveaway : undefined;
  const flash = state.flash;
  const shopCount = state.queue.length + state.shop.filter((p) => p.quantity - p.sold > 0).length;
  const sellerOrders = orders.filter((o) => o.sellerId === seller.id && o.status !== 'cancelled');
  const sellerSpend = sellerOrders.reduce((sum, o) => sum + o.itemPrice, 0);
  const hasClub = seller.followers > 15000 || seller.badges.includes('top_seller');
  const tall = height >= 760;
  const muted = !liveSoundOn;
  const shareCount = show.savedCount * 3 + (hashOf(show.id) % 400);
  const friends = BUYER_USERS.slice(hashOf(show.id) % 20, (hashOf(show.id) % 20) + (hashOf(show.id) % 3));
  const chatH = Math.max(0, Math.min(height * 0.4, middleH - 4));
  const ended = state.ended || endedShow;
  const mentionables = [
    { username: seller.username, avatar: seller.avatar },
    ...state.messages
      .slice(-40)
      .filter((m) => !m.isMe && m.type !== 'system' && m.username !== seller.username)
      .reverse()
      .map((m) => ({ username: m.username, avatar: m.avatar })),
  ];
  const shippingLine = (p?: Product) => {
    if (!p) return '';
    const b = bundled || hasBundleInShow(show.id, show.sellerId);
    return b ? 'Kargo: +₺0 (aynı pakete eklendi)' : `Kargo: ${formatTRY(p.shippingCost)}`;
  };
  const buy = sheetProduct ? buyInfo(sheetProduct) : undefined;

  // Sağ sütun: ekrana sığdığı kadar öğe (öncelik sırasına göre), küçük ekranda sıkışık görünüm
  const railAll: (RailItem & { prio: number })[] = [
    ...(hasClub ? [{ key: 'club', label: 'Sadakat', crown: true, prio: 4, onPress: openClub }] : []),
    { key: 'more', label: 'Diğer', icon: 'ellipsis-horizontal' as const, prio: 0, onPress: () => openSheet('more') },
    { key: 'boost', label: 'Destekle', icon: 'flash' as const, prio: 3, onPress: () => openSheet('boost') },
    { key: 'share', label: 'Paylaş', icon: 'share-outline' as const, badge: formatCompact(shareCount), prio: 1, onPress: share },
    { key: 'wallet', label: 'Cüzdan', icon: 'wallet-outline' as const, prio: 2, onPress: () => openSheet('wallet') },
    ...(tall
      ? [{ key: 'sound', label: muted ? 'Sesi aç' : 'Ses', icon: muted ? ('volume-mute' as const) : ('volume-high' as const), active: !muted, prio: 5, onPress: toggleMute }]
      : []),
  ];
  const railCompact = middleH > 0 && middleH < 330;
  const railFit = middleH > 0 ? Math.max(2, Math.floor((middleH + 8) / (railCompact ? 49 : 61))) : railAll.length;
  const railKeep = new Set(
    railAll
      .slice()
      .sort((a, b) => a.prio - b.prio)
      .slice(0, railFit)
      .map((r) => r.key),
  );
  const rail: RailItem[] = railAll.filter((r) => railKeep.has(r.key));

  // ─── Görünüm ───────────────────────────────────────────────────────────────

  return (
    <View style={[styles.page, { width, height }]}>
      <LiveVideo coverImage={show.coverImage} videoUrl={show.videoUrl} mounted={visible && !endedShow} playing={active && !state.ended} muted={muted} />
      <Pressable style={StyleSheet.absoluteFill} onPress={onBackgroundPress} accessibilityLabel="Tepki göndermek için iki kez dokun" />

      {!ended ? (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <LiveHeader
            show={show}
            seller={seller}
            viewers={state.viewers}
            following={following}
            topInset={insets.top}
            onFollow={doFollow}
            onSellerPress={() => openSheet('seller')}
            onViewersPress={openViewers}
            onClose={onClose}
          />

          <View style={styles.topSlot} pointerEvents="box-none">
            {giveaway ? (
              <GiveawayCard
                key={giveaway.id}
                giveaway={giveaway}
                onEnter={enterGiveaway}
                onDismiss={() => setDismissedGiveaway(giveaway.id)}
                onInfo={() => openSheet('giveawayInfo')}
              />
            ) : (
              <View style={styles.notesRow} pointerEvents="box-none">
                {show.description ? <ShowNotes text={show.description} highlights={show.highlights} /> : <View />}
                {muteHint ? (
                  <Animated.View entering={FadeIn} exiting={FadeOut}>
                    <PressableScale scaleTo={0.94} onPress={toggleMute} style={styles.muteHint} accessibilityLabel="Sesi aç">
                      <Text variant="footnote" weight="700" color={liveColors.text}>
                        🔇 Sesi açmak için dokun
                      </Text>
                    </PressableScale>
                  </Animated.View>
                ) : null}
              </View>
            )}
          </View>

          <View style={styles.middle} pointerEvents="box-none" onLayout={(e) => setMiddleH(e.nativeEvent.layout.height)}>
            <View style={styles.chatCol} pointerEvents="box-none">
              {!chatHidden && chatH > 60 ? <ChatList messages={state.messages} height={chatH} pinned={state.pinned} blockedIds={blockedIds} onUserPress={onChatUser} /> : null}
            </View>
            <ActionRail items={rail} compact={railCompact} />
          </View>

          <View style={[styles.bottom, { paddingBottom: Math.max(insets.bottom, 10) + 4 }]} pointerEvents="box-none" onLayout={(e) => setBottomH(e.nativeEvent.layout.height)}>
            <BottomBar
              shopCount={shopCount}
              shopThumb={lot?.product.images[0]}
              reactionEmoji={reactionEmoji}
              onCompose={() => setComposer({ open: true, text: '' })}
              onReact={sendReaction}
              onReactLong={() => openSheet('reactions')}
              onShop={() => openSheet('shop')}
            />
            {flash ? (
              <FlashSaleCard
                key={flash.id}
                flash={flash}
                onBuy={() => {
                  const p = state.shop.find((x) => x.id === flash.product.id) ?? flash.product;
                  withGate(() => openBuy(p));
                }}
              />
            ) : null}
            {lot ? (
              <AuctionCard
                lot={lot}
                shippingCost={shippingCost}
                bundled={bundled}
                couponDiscount={couponOff}
                onPress={() => {
                  setSheetProduct(lot.product);
                  openSheet('product');
                }}
              />
            ) : null}
            <ActionRow
              state={running ? 'bidding' : 'waiting'}
              nextBid={nextBid}
              leading={leading}
              onCustom={() => withGate(() => openSheet('custom'), { intro: true })}
              onSwipe={onSwipe}
              onTapHint={() => toast(`Teklif vermek için sağa kaydır → ${formatTRY(nextBid)}`, 'hand-right')}
            />
          </View>
        </View>
      ) : null}

      <ReactionLayer particles={reactions.particles} style={{ right: 16, bottom: bottomH + 8 }} />
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
          <PressableScale scaleTo={0.9} onPress={onClose} style={styles.closeBtn} accessibilityLabel="Kapat">
            <Text variant="headline" weight="800" color={liveColors.text} style={textShadow}>
              ✕
            </Text>
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
                toast(`${seller.username} için engel kaldırıldı`, 'checkmark-circle');
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
      <BidIntroSheet
        visible={sheet === 'intro'}
        onClose={() => {
          pendingAction.current = null;
          setSheet(null);
        }}
        onAccept={() => {
          useLivePrefs.getState().acceptBidIntro();
          const action = pendingAction.current;
          pendingAction.current = null;
          setSheet(null);
          if (action) setTimeout(action, SHEET_SWAP_MS);
        }}
      />
      <CustomBidSheet
        visible={sheet === 'custom'}
        onClose={closeAllSheets}
        mode="live"
        product={lot?.product}
        lot={lot}
        shippingLine={shippingLine(lot?.product)}
        onSubmit={onCustomSubmit}
      />
      <CustomBidSheet
        visible={sheet === 'prebid'}
        onClose={closeAllSheets}
        mode="prebid"
        product={sheetProduct}
        startPrice={sheetProduct?.price}
        existingPreBid={sheetProduct ? state.myPreBids?.[sheetProduct.id] : undefined}
        shippingLine={shippingLine(sheetProduct)}
        onSubmit={onPreBidSubmit}
      />
      <SellerSheet
        visible={sheet === 'seller'}
        onClose={closeAllSheets}
        seller={seller}
        following={following}
        onToggleFollow={toggleFollow}
        onMessage={() => messageUser(seller.id)}
        onTip={() => withGate(() => openSheet('tip'))}
        onBoost={() => openSheet('boost')}
        onProfile={() => navigate(`/user/${seller.username}`)}
        onReport={() => openSheet('reportSeller')}
        onBlock={blockSeller}
      />
      <TipSheet visible={sheet === 'tip'} onClose={closeAllSheets} seller={seller} dark onSent={(amount) => engine.tip(amount)} />
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
        onMention={() => {
          const name = chatUser?.username ?? '';
          setSheet(null);
          setTimeout(() => setComposer({ open: true, text: `@${name} ` }), SHEET_SWAP_MS);
        }}
        onReport={() => openSheet('reportUser')}
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
        onReactions={() => openSheet('reactions')}
        onBoost={() => openSheet('boost')}
        onClub={hasClub ? openClub : undefined}
        onCaptions={() => {
          setSheet(null);
          setTimeout(() => Alert.alert('Altyazılar', 'Canlı altyazıları cihazının Ayarlar › Erişilebilirlik › Altyazılar bölümünden açabilirsin.'), SHEET_SWAP_MS);
        }}
        onHideShow={hideShow}
        onReport={() => openSheet('reportShow')}
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
        couponActive={coupon?.code === 'KULUP5'}
        onRedeem={(code) => {
          const res = useLivePrefs.getState().applyCoupon(code);
          if (res.ok) {
            haptic.success();
            toast.success('Kulüp kuponun uygulandı: %5 indirim', 'pricetag');
          } else toast(res.error, 'pricetag-outline');
        }}
      />
      <WalletSheet visible={sheet === 'wallet'} onClose={closeAllSheets} onNavigate={navigate} />
      <BoostSheet
        visible={sheet === 'boost'}
        onClose={closeAllSheets}
        sellerName={seller.username}
        raised={boost.raised}
        goal={boost.goal}
        boosting={boosting}
        onBoost={doBoost}
        onTip={() => withGate(() => openSheet('tip'))}
      />
      <ShopSheet
        visible={sheet === 'shop'}
        onClose={closeAllSheets}
        sellerName={seller.username}
        state={state}
        onProductPress={(p) => {
          setSheetProduct(p);
          openSheet('product');
        }}
        onBuyNow={(p) => withGate(() => openBuy(p))}
        onPreBid={(p) => {
          setSheetProduct(p);
          withGate(() => openSheet('prebid'), { intro: true });
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
        bundled={bundled}
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
      />
      <FollowEnterSheet visible={sheet === 'followEnter'} onClose={closeAllSheets} seller={seller} onConfirm={followAndEnter} />
      <GiveawayInfoSheet
        visible={sheet === 'giveawayInfo'}
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
  topSlot: { minHeight: 8 },
  notesRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingHorizontal: SCREEN_PADDING - 4, marginTop: 10, gap: 8 },
  muteHint: { backgroundColor: liveColors.glassStrong, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  middle: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', paddingLeft: SCREEN_PADDING - 4, paddingRight: 6, paddingBottom: 8, gap: 6 },
  chatCol: { flex: 1, justifyContent: 'flex-end', maxWidth: '78%' },
  bottom: { paddingHorizontal: SCREEN_PADDING - 4, gap: 8 },
  endedClose: { position: 'absolute', right: SCREEN_PADDING, zIndex: 60 },
  blocked: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 70, backgroundColor: liveColors.panel, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 10 },
  blockedButtons: { flexDirection: 'row', gap: 10, marginTop: 10 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: liveColors.glass, alignItems: 'center', justifyContent: 'center' },
});
