/**
 * Canlı yayın simülasyon motoru.
 *
 * Saf TypeScript; React'ten bağımsız. `useLiveShow` hook'u bunu useSyncExternalStore ile bağlar.
 * - İzleyici modu (viewer): ürün planı otomatik döner (açık artırmalar → satılmayanların tekrarı →
 *   birkaç Hemen Al ürünü mezatla), botlar teklif verir/sohbet eder, aralarda çekiliş ve flaş indirim olur.
 *   Plan bittiğinde satıcı yayını kapatır (`ended`, `endReason: 'sold_out'`).
 *   Sayfa görünmezken (stop) simülasyon zamanı durur; tekrar başlayınca kaldığı yerden devam eder.
 * - Satıcı modu (seller): açık artırmayı/çekilişi satıcı başlatır; botlar katılır.
 * Demo sürümde sohbetin başına ve sabitlenmiş mesaja simülasyon uyarısı (DEMO_COPY.simulated) eklenir.
 */
import { DEMO_COPY, DEMO_MODE, FEATURES } from '@/config/demo';
import {
  bidIncrement,
  DEFAULT_AUCTION_DURATION,
  DEFAULT_COUNTER_BID_TIME,
  DEFAULT_SUDDEN_DEATH_DURATION,
  extendedEndsAt,
  nextMinBid,
} from '@/lib/auction';
import { formatTRY } from '@/lib/format';
import { random, uid } from '@/lib/rng';
import type { ChatMessage, Product, Show, User } from '@/types';

import {
  BIDDING_CHAT,
  CATEGORY_CHAT,
  GENERIC_CHAT,
  makeBots,
  MOD_LINES,
  MOD_NAMES,
  PINNED_LINES,
  SELLER_LINES,
  SOLD_CHAT,
  type Bot,
} from './bots';

export type Bidder = {
  id: string;
  username: string;
  avatar?: string;
  isMe: boolean;
};

export type BidEntry = { bidder: Bidder; amount: number; at: number };

export type LiveLot = {
  id: string;
  product: Product;
  startPrice: number;
  /** En yüksek teklif (teklif yoksa başlangıç fiyatı) */
  currentBid: number;
  bidCount: number;
  leader?: Bidder;
  startedAt: number;
  endsAt: number;
  duration: number;
  suddenDeath: boolean;
  /** Son 10 sn'de gelen teklif süreyi bu değere çeker (sn) */
  counterBidTime: number;
  status: 'running' | 'sold' | 'unsold';
  /** Kullanıcının maksimum (otomatik) teklif tavanı */
  myMaxBid?: number;
  /** Kullanıcı bu lotta en az bir kez teklif verdi mi */
  iBid: boolean;
  recentBids: BidEntry[];
  /** Botların gizli "değer biçimi" — bu tutarın üstüne nadiren çıkarlar */
  hiddenValue: number;
};

export type Giveaway = {
  id: string;
  product: Product;
  startedAt: number;
  endsAt: number;
  entrants: number;
  entered: boolean;
  requiresFollow: boolean;
  status: 'running' | 'done';
  winner?: Bidder;
};

export type FlashSale = {
  id: string;
  product: Product;
  price: number;
  originalPrice: number;
  startedAt: number;
  endsAt: number;
  remaining: number;
  status: 'running' | 'done';
};

export type SoldItem = {
  id: string;
  product: Product;
  price: number;
  winner: Bidder;
  via: 'auction' | 'buy_now' | 'giveaway' | 'flash_sale';
  at: number;
};

export type LiveSnapshot = {
  showId: string;
  mode: 'viewer' | 'seller';
  viewers: number;
  peakViewers: number;
  likes: number;
  messages: ChatMessage[];
  pinned?: ChatMessage;
  lot?: LiveLot;
  /** Lot bittikten sonra kısa süre gösterilen sonuç */
  lastResult?: { lot: LiveLot; wonByMe: boolean; at: number };
  giveaway?: Giveaway;
  flash?: FlashSale;
  sold: SoldItem[];
  /** Sıradaki ürünler (izleyici modunda otomatik döner) */
  queue: Product[];
  /** Hemen Al ürünleri (mağaza sekmesi) */
  shop: Product[];
  ended: boolean;
  /** Satıcı modunda toplam satış (₺) */
  gross: number;
  startedAt: number;
  /** Botlardan gelen tepki (kalp) sayacı — izleyici ekranında uçan emojiler için */
  crowdLikes?: number;
  /** Kullanıcının bu yayındaki ön teklifleri: productId → maks. tutar */
  myPreBids?: Record<string, number>;
  /** Yayının bitiş sebebi */
  endReason?: 'seller' | 'sold_out';
};

export type LiveEvents = {
  onOutbid?: (lot: LiveLot) => void;
  onWon?: (lot: LiveLot) => void;
  onLost?: (lot: LiveLot) => void;
  onGiveawayWon?: (g: Giveaway) => void;
  onSold?: (item: SoldItem) => void;
  /** Yayın bitti (satıcı kapattı ya da tüm ürünler satıldı) */
  onEnded?: (reason: 'seller' | 'sold_out') => void;
};

export type EngineOptions = {
  show: Show;
  seller: User;
  products: Product[];
  me: Pick<User, 'id' | 'username' | 'avatar'>;
  mode: 'viewer' | 'seller';
  events?: LiveEvents;
  /** Kullanıcı satıcıyı takip ediyor mu (çekiliş şartı için) */
  isFollowing?: () => boolean;
};

export type LiveViewer = { id: string; username: string; avatar?: string; isMod: boolean };

type PlannedLot = { product: Product; startPrice?: number; /** Botların çıkabileceği en yüksek değer (Hemen Al fiyatının altında kalsın) */ valueCap?: number };

const TICK_MS = 250;
const MAX_MESSAGES = 120;
const RESULT_PAUSE_MS = 3500;

/** Mezata çıkan Hemen Al ürünleri için temiz açılış fiyatı */
function cleanStart(v: number): number {
  if (v < 20) return Math.max(1, Math.round(v));
  if (v < 100) return Math.round(v / 5) * 5;
  if (v < 1000) return Math.round(v / 10) * 10;
  return Math.round(v / 50) * 50;
}

export class LiveEngine {
  private state: LiveSnapshot;
  private listeners = new Set<() => void>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private bots: Bot[];
  private opts: EngineOptions;
  private nextChatAt = 0;
  private nextJoinAt = 0;
  private nextSellerLineAt = 0;
  private nextModLineAt = 0;
  private nextExtraAt = 0;
  private nextLotAt = 0;
  private lotsSinceGiveaway = 0;
  private lotsSinceFlash = 0;
  private me: Bidder;
  private sellerBidder: Bidder;
  /** İzleyici modu ürün planı */
  private plan: PlannedLot[] = [];
  private rerun = new Set<string>();
  private binPhaseAdded = false;
  /** Duraklatıldığı an (izleyici modunda simülasyon zamanını dondurmak için) */
  private pausedAt: number | undefined;

  constructor(opts: EngineOptions) {
    this.opts = opts;
    this.bots = makeBots(80);
    this.me = { id: opts.me.id, username: opts.me.username, avatar: opts.me.avatar, isMe: true };
    this.sellerBidder = { id: opts.seller.id, username: opts.seller.username, avatar: opts.seller.avatar, isMe: false };
    const now = Date.now();
    const auctionItems = opts.products.filter((p) => p.format === 'auction');
    const shopItems = opts.products.filter((p) => p.format === 'buy_now');
    const viewers = opts.mode === 'seller' ? 0 : Math.max(12, opts.show.viewers);
    const queue = auctionItems.length ? auctionItems : opts.products;
    this.state = {
      showId: opts.show.id,
      mode: opts.mode,
      viewers,
      peakViewers: viewers,
      likes: random.int(200, 4000),
      messages: [],
      pinned: DEMO_MODE
        ? { id: uid('pin'), type: 'chat', username: 'Mezatonline', text: `📌 ${DEMO_COPY.short}: ${DEMO_COPY.simulated}`, createdAt: now }
        : { id: uid('pin'), type: 'chat', username: random.pick(MOD_NAMES), text: random.pick(PINNED_LINES), isMod: true, createdAt: now },
      sold: [],
      queue,
      shop: shopItems,
      ended: false,
      gross: 0,
      startedAt: now,
      crowdLikes: 0,
      myPreBids: {},
    };
    if (opts.mode === 'viewer') {
      // Yayına ortadan katılmış gibi: kuyruğun rastgele bir noktasından başla
      const offset = queue.length > 2 ? random.int(0, Math.floor(queue.length / 3)) : 0;
      this.plan = [...queue.slice(offset), ...queue.slice(0, offset)].map((product) => ({ product }));
      this.seedHistory(now);
      this.pushDemoNotice();
      // İlk lotu hemen başlat; süresinin bir kısmı geçmiş gibi göster
      this.startNextLot(now, true);
      this.pausedAt = now;
    } else {
      this.pushDemoNotice();
      this.pushMessage({ type: 'system', username: 'Mezatonline', text: 'Yayındasın! İzleyiciler katılıyor… 🎥' });
    }
    this.nextChatAt = now + 600;
    this.nextJoinAt = now + 1500;
    this.nextSellerLineAt = now + random.int(6000, 12000);
    this.nextModLineAt = now + random.int(20000, 35000);
    this.nextExtraAt = now + random.int(12000, 25000);
  }

  // ─── Abonelik ──────────────────────────────────────────────────────────────

  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  };

  getSnapshot = () => this.state;

  private emit() {
    for (const l of this.listeners) l();
  }

  private setState(patch: Partial<LiveSnapshot>) {
    this.state = { ...this.state, ...patch };
    this.emit();
  }

  start() {
    if (this.timer || this.state.ended) return;
    if (this.state.mode === 'viewer' && this.pausedAt !== undefined) {
      const delta = Date.now() - this.pausedAt;
      if (delta > 0) this.shiftTime(delta);
    }
    this.pausedAt = undefined;
    this.timer = setInterval(() => this.tick(), TICK_MS);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.pausedAt = Date.now();
    }
    this.timer = null;
  }

  updateEvents(events: LiveEvents) {
    this.opts = { ...this.opts, events };
  }

  /** Kullanıcı değişti (ör. misafir yayın sırasında kaydoldu): sonraki mesaj/tekliflerde yeni ad görünür */
  updateMe(me: Pick<User, 'id' | 'username' | 'avatar'>) {
    this.me = { ...this.me, id: me.id, username: me.username, avatar: me.avatar };
  }

  /** İzleyici modunda duraklatılan süre kadar tüm zamanlayıcıları ileri kaydır */
  private shiftTime(delta: number) {
    const s = this.state;
    const lot = s.lot ? { ...s.lot, startedAt: s.lot.startedAt + delta, endsAt: s.lot.status === 'running' ? s.lot.endsAt + delta : s.lot.endsAt } : undefined;
    const giveaway = s.giveaway ? { ...s.giveaway, startedAt: s.giveaway.startedAt + delta, endsAt: s.giveaway.endsAt + delta } : undefined;
    const flash = s.flash ? { ...s.flash, startedAt: s.flash.startedAt + delta, endsAt: s.flash.endsAt + delta } : undefined;
    const lastResult = s.lastResult ? { ...s.lastResult, at: s.lastResult.at + delta } : undefined;
    this.nextChatAt += delta;
    this.nextJoinAt += delta;
    this.nextSellerLineAt += delta;
    this.nextModLineAt += delta;
    this.nextExtraAt += delta;
    this.nextLotAt += delta;
    this.state = { ...s, lot, giveaway, flash, lastResult };
    this.emit();
  }

  // ─── Yardımcılar ───────────────────────────────────────────────────────────

  private botBidder(b: Bot): Bidder {
    return { id: b.id, username: b.username, avatar: b.avatar, isMe: false };
  }

  private pushMessage(m: Omit<ChatMessage, 'id' | 'createdAt'> & { createdAt?: number }) {
    const msg: ChatMessage = { id: uid('m'), createdAt: Date.now(), ...m };
    const messages = this.state.messages.length >= MAX_MESSAGES ? this.state.messages.slice(-MAX_MESSAGES + 1) : this.state.messages.slice();
    messages.push(msg);
    this.state = { ...this.state, messages };
  }

  /** Demo: izleyici, teklif, sohbet ve kazananların simülasyon olduğunu sohbetin başında belirt */
  private pushDemoNotice() {
    if (!DEMO_MODE) return;
    this.pushMessage({ type: 'system', username: 'Mezatonline', text: `ℹ️ ${DEMO_COPY.short}: ${DEMO_COPY.simulated}` });
  }

  private seedHistory(now: number) {
    const cat = this.opts.show.categoryId;
    for (let i = 0; i < 14; i++) {
      const b = random.pick(this.bots);
      const pool = random.chance(0.35) && CATEGORY_CHAT[cat] ? CATEGORY_CHAT[cat] : GENERIC_CHAT;
      this.pushMessage({ type: 'chat', userId: b.id, username: b.username, avatar: b.avatar, text: random.pick(pool), createdAt: now - (14 - i) * 4000 });
    }
  }

  private categoryLine(): string {
    const pool = CATEGORY_CHAT[this.opts.show.categoryId];
    return pool && random.chance(0.4) ? random.pick(pool) : random.pick(GENERIC_CHAT);
  }

  /** Yayındaki izleyicilerden bir örnek (izleyiciler listesi için) */
  getViewerSample(n = 40): LiveViewer[] {
    const mods = MOD_NAMES.slice(0, 2).map((name) => ({ id: 'mod_' + name, username: name, avatar: undefined, isMod: true }));
    const bots = this.bots.slice(0, Math.max(0, n - mods.length)).map((b) => ({ id: b.id, username: b.username, avatar: b.avatar, isMod: false }));
    return [...mods, ...bots];
  }

  // ─── Lot yönetimi ──────────────────────────────────────────────────────────

  /** İzleyici modunda sıradaki planlı ürün */
  private nextPlanned(): PlannedLot | undefined {
    if (!this.plan.length && !this.binPhaseAdded) {
      this.binPhaseAdded = true;
      const bins = this.state.shop.filter((p) => p.quantity - p.sold > 0).slice(0, 6);
      this.plan = bins.map((product) => ({ product, startPrice: cleanStart(product.price * random.float(0.25, 0.45)), valueCap: Math.round(product.price * random.float(0.6, 0.95)) }));
      if (this.plan.length) {
        this.pushMessage({
          type: 'chat',
          userId: this.opts.seller.id,
          username: this.opts.seller.username,
          avatar: this.opts.seller.avatar,
          text: 'Mağazadaki birkaç ürünü de düşük fiyattan mezata çıkarıyorum, kaçırmayın 🔥',
          isSeller: true,
        });
      }
    }
    return this.plan.shift();
  }

  private makeLot(product: Product, now: number, opts: { startPrice?: number; duration?: number; suddenDeath?: boolean; counterBidTime?: number } = {}): LiveLot {
    const suddenDeath = opts.suddenDeath ?? product.suddenDeath;
    const duration = opts.duration ?? (suddenDeath ? DEFAULT_SUDDEN_DEATH_DURATION : DEFAULT_AUCTION_DURATION);
    const startPrice = Math.max(1, Math.round(opts.startPrice ?? product.price));
    // Ürün başlangıç fiyatı ₺1 ise piyasa değerini farklı tahmin et
    const base = product.compareAtPrice ?? Math.max(product.price, 60);
    const hiddenValue = Math.round(base * random.float(0.7, 1.9));
    return {
      id: uid('lot'),
      product,
      startPrice,
      currentBid: startPrice,
      bidCount: 0,
      startedAt: now,
      endsAt: now + duration * 1000,
      duration,
      suddenDeath,
      counterBidTime: opts.counterBidTime ?? DEFAULT_COUNTER_BID_TIME,
      status: 'running',
      iBid: false,
      recentBids: [],
      hiddenValue: Math.max(hiddenValue, startPrice + bidIncrement(startPrice) * 2),
    };
  }

  /** Kullanıcının bu ürün için verdiği ön teklifi yeni lota uygula */
  private applyPreBid(lot: LiveLot, now: number) {
    const pre = this.state.myPreBids?.[lot.product.id];
    if (!pre) return;
    const rest = { ...(this.state.myPreBids ?? {}) };
    delete rest[lot.product.id];
    this.state = { ...this.state, myPreBids: rest };
    const next = nextMinBid(lot.currentBid, lot.bidCount > 0);
    if (pre < next) return;
    lot.myMaxBid = pre;
    lot.iBid = true;
    this.pushMessage({ type: 'system', username: 'Mezatonline', text: `Ön teklifin devrede 🔒 Maks. ${formatTRY(pre)}`, isMe: true });
    if (!lot.leader?.isMe) this.applyBid(lot, this.me, next, now);
  }

  private startNextLot(now: number, warm = false) {
    const planned = this.nextPlanned();
    if (!planned) {
      // Plan bitti: çekiliş sürüyorsa bekle, değilse yayını kapat
      if (this.state.giveaway?.status === 'running') {
        this.nextLotAt = now + 1000;
        return;
      }
      this.finishShow();
      return;
    }
    const { product, startPrice, valueCap } = planned;
    const lot = this.makeLot(product, now, { startPrice });
    if (valueCap) lot.hiddenValue = Math.max(lot.startPrice + bidIncrement(lot.startPrice) * 2, Math.min(lot.hiddenValue, valueCap));
    if (warm) {
      // Yayına ortadan katılmış gibi: birkaç teklif önceden verilmiş olsun
      const n = random.int(1, 5);
      for (let i = 0; i < n; i++) this.applyBid(lot, this.botBidder(random.pick(this.bots)), nextMinBid(lot.currentBid, lot.bidCount > 0), now, true);
      lot.endsAt = now + random.int(9, Math.max(10, lot.duration)) * 1000;
    }
    this.pushMessage({ type: 'system', username: this.opts.seller.username, text: `🔨 Açık artırma başladı: ${product.title}`, isSeller: true });
    this.applyPreBid(lot, now);
    this.state = { ...this.state, lot, lastResult: undefined };
  }

  private applyBid(lot: LiveLot, bidder: Bidder, amount: number, now: number, silent = false) {
    lot.currentBid = amount;
    lot.bidCount += 1;
    lot.leader = bidder;
    lot.endsAt = extendedEndsAt(lot.endsAt, now, lot.suddenDeath, lot.counterBidTime);
    lot.recentBids = [{ bidder, amount, at: now }, ...lot.recentBids].slice(0, 8);
    if (!silent) {
      this.pushMessage({ type: 'bid', userId: bidder.id, username: bidder.username, avatar: bidder.avatar, text: 'teklif verdi', amount, isMe: bidder.isMe });
    }
  }

  /** Kullanıcının maksimum teklifi varsa ve geçildiyse otomatik karşılık ver */
  private resolveProxy(lot: LiveLot, now: number) {
    if (!lot.myMaxBid || lot.leader?.isMe) return;
    const next = nextMinBid(lot.currentBid, lot.bidCount > 0);
    if (next <= lot.myMaxBid) {
      this.applyBid(lot, this.me, next, now);
    }
  }

  private finishLot(now: number) {
    const lot = this.state.lot;
    if (!lot || lot.status !== 'running') return;
    const finished: LiveLot = { ...lot, status: lot.leader ? 'sold' : 'unsold' };
    const wonByMe = !!finished.leader?.isMe;
    let sold = this.state.sold;
    let gross = this.state.gross;
    let shop = this.state.shop;
    if (finished.leader) {
      const item: SoldItem = { id: uid('sold'), product: finished.product, price: finished.currentBid, winner: finished.leader, via: 'auction', at: now };
      sold = [item, ...sold];
      gross += finished.currentBid;
      // Mezata çıkan bir Hemen Al ürünüyse stoktan düş
      if (shop.some((p) => p.id === finished.product.id)) shop = shop.map((p) => (p.id === finished.product.id ? { ...p, sold: p.sold + 1 } : p));
      this.pushMessage({ type: 'won', userId: finished.leader.id, username: finished.leader.username, avatar: finished.leader.avatar, text: `kazandı: ${finished.product.title}`, amount: finished.currentBid, isMe: wonByMe });
      this.opts.events?.onSold?.(item);
    } else {
      this.pushMessage({ type: 'system', username: this.opts.seller.username, text: `Teklif gelmedi: ${finished.product.title}`, isSeller: true });
      // İzleyici modunda satılmayan ürün bir kez daha, daha düşük fiyattan denenir
      if (this.state.mode === 'viewer' && !this.rerun.has(finished.product.id)) {
        this.rerun.add(finished.product.id);
        this.plan.push({ product: finished.product, startPrice: cleanStart(Math.max(1, finished.startPrice * 0.7)) });
      }
    }
    this.state = { ...this.state, lot: finished, lastResult: { lot: finished, wonByMe, at: now }, sold, gross, shop };
    if (wonByMe) this.opts.events?.onWon?.(finished);
    else if (finished.iBid) this.opts.events?.onLost?.(finished);
    this.nextLotAt = now + RESULT_PAUSE_MS;
    this.lotsSinceGiveaway += 1;
    this.lotsSinceFlash += 1;
    // Satılanın ardından tebrik mesajları
    setTimeout(() => {
      if (this.state.ended) return;
      for (let i = 0; i < random.int(1, 3); i++) {
        const b = random.pick(this.bots);
        this.pushMessage({ type: 'chat', userId: b.id, username: b.username, avatar: b.avatar, text: random.pick(SOLD_CHAT) });
      }
      this.emit();
    }, 700);
  }

  /** İzleyici modunda plan bittiğinde satıcı yayını kapatır */
  private finishShow() {
    this.pushMessage({
      type: 'chat',
      userId: this.opts.seller.id,
      username: this.opts.seller.username,
      avatar: this.opts.seller.avatar,
      text: 'Bugünlük bu kadar! Katıldığınız için çok teşekkürler, bir sonraki yayında görüşmek üzere 💛',
      isSeller: true,
    });
    this.stop();
    this.pushMessage({ type: 'system', username: 'Mezatonline', text: 'Yayın sona erdi. İzlediğiniz için teşekkürler! 💛' });
    this.state = { ...this.state, ended: true, endReason: 'sold_out', lot: this.state.lot?.status === 'running' ? undefined : this.state.lot };
    this.emit();
    this.opts.events?.onEnded?.('sold_out');
  }

  // ─── Döngü ────────────────────────────────────────────────────────────────

  private tick() {
    if (this.state.ended) return;
    const now = Date.now();
    let changed = false;
    const s = this.state;
    const viewerMode = s.mode === 'viewer';

    // İzleyici sayısı dalgalanması
    if (random.chance(0.12)) {
      const target = s.mode === 'seller' ? Math.min(400, 8 + Math.floor((now - s.startedAt) / 1500)) : this.opts.show.viewers;
      const drift = Math.round((target - s.viewers) * 0.08 + random.int(-3, 4));
      const viewers = Math.max(1, s.viewers + drift);
      this.state = { ...this.state, viewers, peakViewers: Math.max(s.peakViewers, viewers) };
      changed = true;
    }

    // Kalabalık tepkileri (kızışan açık artırmada daha sık)
    const hotLot = s.lot && s.lot.status === 'running' && (s.lot.endsAt - now) / 1000 < 6;
    if (random.chance(hotLot ? 0.3 : 0.12)) {
      const n = random.int(1, hotLot ? 3 : 2);
      this.state = { ...this.state, likes: this.state.likes + n, crowdLikes: (this.state.crowdLikes ?? 0) + n };
      changed = true;
    }

    // Sohbet
    if (now >= this.nextChatAt) {
      const b = random.pick(this.bots);
      const lot = this.state.lot;
      const hot = lot && lot.status === 'running' && (lot.endsAt - now) / 1000 < 6 && lot.bidCount > 2;
      const text = hot && random.chance(0.5) ? random.pick(BIDDING_CHAT) : this.categoryLine();
      this.pushMessage({ type: 'chat', userId: b.id, username: b.username, avatar: b.avatar, text });
      const busy = Math.min(1, this.state.viewers / 600);
      this.nextChatAt = now + random.int(Math.round(900 - busy * 500), Math.round(3200 - busy * 1800));
      changed = true;
    }

    // Katılım mesajları
    if (now >= this.nextJoinAt) {
      const b = random.pick(this.bots);
      this.pushMessage({ type: 'join', userId: b.id, username: b.username, avatar: b.avatar, text: 'katıldı 👋' });
      this.nextJoinAt = now + random.int(3500, 9000);
      changed = true;
    }

    // Satıcı konuşmaları
    if (now >= this.nextSellerLineAt && viewerMode) {
      this.pushMessage({ type: 'chat', userId: this.opts.seller.id, username: this.opts.seller.username, avatar: this.opts.seller.avatar, text: random.pick(SELLER_LINES), isSeller: true });
      this.nextSellerLineAt = now + random.int(15000, 30000);
      changed = true;
    }

    // Moderatör satırları
    if (now >= this.nextModLineAt && viewerMode) {
      const name = random.pick(MOD_NAMES);
      this.pushMessage({ type: 'chat', userId: 'mod_' + name, username: name, text: random.pick(MOD_LINES), isMod: true });
      this.nextModLineAt = now + random.int(30000, 55000);
      changed = true;
    }

    // Ara sıra bahşiş / takip olayları (bahşiş kapalıysa yalnız takip)
    if (now >= this.nextExtraAt && viewerMode) {
      const b = random.pick(this.bots);
      if (FEATURES.tips && random.chance(0.45)) {
        this.pushMessage({ type: 'tip', userId: b.id, username: b.username, avatar: b.avatar, text: 'bahşiş gönderdi 💛', amount: random.pick([20, 50, 50, 100, 250]) });
      } else {
        this.pushMessage({ type: 'follow', userId: b.id, username: b.username, avatar: b.avatar, text: 'satıcıyı takip etti' });
      }
      this.nextExtraAt = now + random.int(18000, 40000);
      changed = true;
    }

    // Lot
    const lot = this.state.lot;
    if (lot && lot.status === 'running') {
      if (now >= lot.endsAt) {
        this.finishLot(now);
        changed = true;
      } else {
        changed = this.botBidding(lot, now) || changed;
      }
    } else if (viewerMode && now >= this.nextLotAt) {
      // Ara etkinlikler: çekiliş / flaş indirim
      if (FEATURES.giveaways && !this.state.giveaway && this.lotsSinceGiveaway >= random.int(3, 5)) {
        this.startGiveaway(undefined, 45, random.chance(0.6));
        this.lotsSinceGiveaway = 0;
      } else if (!this.state.flash && this.state.shop.some((p) => p.quantity - p.sold > 0) && this.lotsSinceFlash >= random.int(4, 7)) {
        this.startFlashSale(random.pick(this.state.shop.filter((p) => p.quantity - p.sold > 0)), random.pick([0.2, 0.3, 0.4]), 60);
        this.lotsSinceFlash = 0;
      }
      this.startNextLot(now);
      if (this.state.ended) return;
      changed = true;
    }

    // Çekiliş
    const g = this.state.giveaway;
    if (g && g.status === 'running') {
      if (now >= g.endsAt) {
        this.finishGiveaway(now);
      } else if (random.chance(0.35)) {
        this.state = { ...this.state, giveaway: { ...g, entrants: g.entrants + random.int(1, 6) } };
        if (random.chance(0.08)) {
          const b = random.pick(this.bots);
          this.pushMessage({ type: 'giveaway_entry', userId: b.id, username: b.username, avatar: b.avatar, text: 'çekilişe katıldı 🎁' });
        }
      }
      changed = true;
    } else if (g && g.status === 'done' && g.winner && now - g.endsAt > 6000) {
      this.state = { ...this.state, giveaway: undefined };
      changed = true;
    }

    // Flaş indirim
    const f = this.state.flash;
    if (f && f.status === 'running') {
      if (now >= f.endsAt || f.remaining <= 0) {
        this.state = { ...this.state, flash: { ...f, status: 'done', endsAt: Math.min(f.endsAt, now) } };
        this.pushMessage({ type: 'system', username: this.opts.seller.username, text: '⚡ Flaş indirim sona erdi', isSeller: true });
      } else if (random.chance(0.03) && f.remaining > 1) {
        const b = random.pick(this.bots);
        this.state = { ...this.state, flash: { ...f, remaining: f.remaining - 1 } };
        this.pushMessage({ type: 'purchase', userId: b.id, username: b.username, avatar: b.avatar, text: `satın aldı: ${f.product.title}`, amount: f.price });
      }
      changed = true;
    } else if (f && f.status === 'done' && now - f.endsAt > 5000) {
      this.state = { ...this.state, flash: undefined };
      changed = true;
    }

    if (changed) this.emit();
  }

  /** Botların teklif davranışı. Değişiklik olduysa true döner. */
  private botBidding(lot: LiveLot, now: number): boolean {
    const remaining = (lot.endsAt - now) / 1000;
    const next = nextMinBid(lot.currentBid, lot.bidCount > 0);
    if (next > lot.hiddenValue * (random.chance(0.04) ? 1.25 : 1)) return false;
    // Süre azaldıkça ve fiyat değerin altındayken teklif olasılığı artar
    const valueRoom = 1 - lot.currentBid / lot.hiddenValue;
    const urgency = remaining < 4 ? 0.55 : remaining < 8 ? 0.22 : 0.07;
    const viewerFactor = Math.min(1.4, 0.4 + this.state.viewers / 400);
    const p = urgency * Math.max(0.15, valueRoom) * viewerFactor;
    if (!random.chance(p)) return false;
    const candidates = this.bots.filter((b) => b.id !== lot.leader?.id);
    const bot = random.pick(candidates);
    if (!random.chance(bot.appetite)) return false;
    // Bazen bir basamak fazlası
    const jump = random.chance(0.15) ? bidIncrement(next) : 0;
    const wasMeLeading = !!lot.leader?.isMe;
    const updated: LiveLot = { ...lot, recentBids: lot.recentBids.slice() };
    this.applyBid(updated, this.botBidder(bot), next + jump, now);
    this.resolveProxy(updated, now);
    this.state = { ...this.state, lot: updated };
    if (wasMeLeading && !updated.leader?.isMe) this.opts.events?.onOutbid?.(updated);
    return true;
  }

  // ─── Kullanıcı eylemleri (izleyici) ─────────────────────────────────────────

  /** Hızlı teklif: bir sonraki minimum tutar. Başarılıysa verilen tutarı döner. */
  placeBid(amount?: number): number | null {
    const lot = this.state.lot;
    if (!lot || lot.status !== 'running') return null;
    const now = Date.now();
    if (now >= lot.endsAt) return null;
    const min = nextMinBid(lot.currentBid, lot.bidCount > 0);
    const value = Math.max(min, Math.round(amount ?? min));
    if (lot.leader?.isMe && amount === undefined) return null;
    const updated: LiveLot = { ...lot, iBid: true, recentBids: lot.recentBids.slice() };
    this.applyBid(updated, this.me, value, now);
    this.state = { ...this.state, lot: updated };
    this.emit();
    return value;
  }

  /**
   * Özel teklif / maksimum teklif: tavanı kaydeder, hemen minimum geçerli teklifi verir.
   * Botlar geçtikçe sistem tavana kadar otomatik karşılık verir.
   */
  setMaxBid(max: number): number | null {
    const lot = this.state.lot;
    if (!lot || lot.status !== 'running') return null;
    const now = Date.now();
    if (now >= lot.endsAt) return null;
    const min = nextMinBid(lot.currentBid, lot.bidCount > 0);
    if (max < min) return null;
    const updated: LiveLot = { ...lot, myMaxBid: max, iBid: true, recentBids: lot.recentBids.slice() };
    if (!updated.leader?.isMe) this.applyBid(updated, this.me, min, now);
    this.state = { ...this.state, lot: updated };
    this.emit();
    return updated.currentBid;
  }

  /** Henüz mezata çıkmamış ürün için ön teklif (maks. teklif gibi çalışır) */
  addPreBid(productId: string, max: number): boolean {
    if (this.state.lot?.status === 'running' && this.state.lot.product.id === productId) return false;
    const current = this.state.myPreBids?.[productId] ?? 0;
    this.state = { ...this.state, myPreBids: { ...(this.state.myPreBids ?? {}), [productId]: Math.max(current, Math.round(max)) } };
    this.emit();
    return true;
  }

  sendMessage(text: string) {
    const t = text.trim();
    if (!t) return;
    this.pushMessage({ type: 'chat', userId: this.me.id, username: this.me.username, avatar: this.me.avatar, text: t, isMe: true, isSeller: this.state.mode === 'seller' });
    this.emit();
    // Satıcı bazen kullanıcıya cevap verir
    if (this.state.mode === 'viewer' && random.chance(0.45)) {
      setTimeout(() => {
        if (this.state.ended) return;
        const replies = ['@' + this.me.username + ' hoş geldin 💛', '@' + this.me.username + ' tabii, hemen gösteriyorum', '@' + this.me.username + ' evet orijinal ✅', '@' + this.me.username + ' kargo 24 saatte çıkıyor 📦', '@' + this.me.username + ' teşekkürler 🙏'];
        this.pushMessage({ type: 'chat', userId: this.opts.seller.id, username: this.opts.seller.username, avatar: this.opts.seller.avatar, text: random.pick(replies), isSeller: true });
        this.emit();
      }, random.int(1500, 4000));
    }
  }

  enterGiveaway(): 'entered' | 'need_follow' | 'unavailable' {
    const g = this.state.giveaway;
    if (!g || g.status !== 'running' || g.entered) return 'unavailable';
    if (g.requiresFollow && this.opts.isFollowing && !this.opts.isFollowing()) return 'need_follow';
    this.state = { ...this.state, giveaway: { ...g, entered: true, entrants: g.entrants + 1 } };
    this.pushMessage({ type: 'giveaway_entry', userId: this.me.id, username: this.me.username, avatar: this.me.avatar, text: 'çekilişe katıldı 🎁', isMe: true });
    this.emit();
    return 'entered';
  }

  tip(amount: number) {
    this.pushMessage({ type: 'tip', userId: this.me.id, username: this.me.username, avatar: this.me.avatar, text: `${this.opts.seller.username} adlı satıcıya bahşiş gönderdi 💛`, amount, isMe: true });
    this.emit();
  }

  /** Yayını öne çıkarma katkısı (Community Boost) */
  boost(amount: number) {
    this.pushMessage({ type: 'tip', userId: this.me.id, username: this.me.username, avatar: this.me.avatar, text: 'yayını öne çıkardı 🚀', amount, isMe: true });
    this.emit();
  }

  /** Kullanıcı satıcıyı takip etti → sohbette görünür */
  announceFollow() {
    this.pushMessage({ type: 'follow', userId: this.me.id, username: this.me.username, avatar: this.me.avatar, text: 'satıcıyı takip etti 💛', isMe: true });
    this.emit();
  }

  like(count = 1) {
    this.state = { ...this.state, likes: this.state.likes + count };
    this.emit();
  }

  /** Mağazadan / flaş indirimden satın alma kaydı (ödeme dışarıda yapılır) */
  recordPurchase(product: Product, price: number, via: 'buy_now' | 'flash_sale', quantity = 1) {
    const items: SoldItem[] = Array.from({ length: Math.max(1, quantity) }, () => ({ id: uid('sold'), product, price, winner: this.me, via, at: Date.now() }));
    const shop = this.state.shop.map((p) => (p.id === product.id ? { ...p, sold: Math.min(p.quantity, p.sold + quantity) } : p));
    const flash =
      this.state.flash && this.state.flash.product.id === product.id ? { ...this.state.flash, remaining: Math.max(0, this.state.flash.remaining - quantity) } : this.state.flash;
    this.pushMessage({ type: 'purchase', userId: this.me.id, username: this.me.username, avatar: this.me.avatar, text: `satın aldı: ${product.title}`, amount: price * quantity, isMe: true });
    this.state = { ...this.state, sold: [...items, ...this.state.sold], shop, flash };
    this.emit();
  }

  // ─── Satıcı eylemleri ──────────────────────────────────────────────────────

  startAuction(product: Product, opts: { startPrice: number; duration: number; suddenDeath: boolean; counterBidTime?: number }): boolean {
    if (this.state.lot?.status === 'running') return false;
    const now = Date.now();
    const lot = this.makeLot(product, now, opts);
    this.pushMessage({ type: 'system', username: this.opts.seller.username, text: `🔨 Açık artırma başladı: ${product.title}`, isSeller: true });
    this.state = { ...this.state, lot, lastResult: undefined };
    this.emit();
    return true;
  }

  /** Satıcı: süreyi erken bitir (satıldı olarak kapat) */
  endAuctionNow() {
    const lot = this.state.lot;
    if (!lot || lot.status !== 'running') return;
    this.state = { ...this.state, lot: { ...lot, endsAt: Date.now() } };
    this.finishLot(Date.now());
    this.emit();
  }

  startGiveaway(product?: Product, durationSec = 60, requiresFollow = true) {
    if (!FEATURES.giveaways) return;
    const now = Date.now();
    const prize: Product =
      product ??
      ({
        ...(this.state.queue[0] ?? this.opts.products[0]),
        id: uid('gw'),
        // Gizemli kutu / booster paketi gibi şansa dayalı ödüller kullanılmaz
        title: '🎁 Çekiliş: ' + random.pick(['Mini Hediye', 'Koleksiyon Parçası', 'Teşekkür Hediyesi', 'Yayın Hatırası']),
        price: 0,
        format: 'giveaway',
      } as Product);
    const g: Giveaway = {
      id: uid('gw'),
      product: prize,
      startedAt: now,
      endsAt: now + durationSec * 1000,
      entrants: random.int(5, 30),
      entered: false,
      requiresFollow,
      status: 'running',
    };
    this.pushMessage({ type: 'system', username: this.opts.seller.username, text: `🎁 Çekiliş başladı: ${prize.title}`, isSeller: true });
    this.state = { ...this.state, giveaway: g };
    this.emit();
  }

  private finishGiveaway(now: number) {
    const g = this.state.giveaway;
    if (!g) return;
    // Demo deneyimi için kullanıcıya makul bir kazanma şansı ver
    const meWins = g.entered && random.chance(Math.min(0.35, 6 / Math.max(6, g.entrants)) + 0.12);
    const winner: Bidder = meWins ? this.me : this.botBidder(random.pick(this.bots));
    const done: Giveaway = { ...g, status: 'done', winner, endsAt: now };
    this.pushMessage({ type: 'giveaway_won', userId: winner.id, username: winner.username, avatar: winner.avatar, text: `çekilişi kazandı! ${g.product.title}`, isMe: winner.isMe });
    const item: SoldItem = { id: uid('sold'), product: g.product, price: 0, winner, via: 'giveaway', at: now };
    this.state = { ...this.state, giveaway: done, sold: [item, ...this.state.sold] };
    if (winner.isMe) this.opts.events?.onGiveawayWon?.(done);
  }

  startFlashSale(product: Product, discount = 0.3, durationSec = 60) {
    const now = Date.now();
    const originalPrice = product.price;
    const price = Math.max(1, Math.round(originalPrice * (1 - discount)));
    const f: FlashSale = {
      id: uid('flash'),
      product,
      price,
      originalPrice,
      startedAt: now,
      endsAt: now + durationSec * 1000,
      remaining: Math.max(1, product.quantity - product.sold),
      status: 'running',
    };
    this.pushMessage({ type: 'system', username: this.opts.seller.username, text: `⚡ Flaş indirim! ${product.title} — %${Math.round(discount * 100)} indirim`, isSeller: true });
    this.state = { ...this.state, flash: f };
    this.emit();
  }

  pinMessage(text: string) {
    this.state = {
      ...this.state,
      pinned: { id: uid('pin'), type: 'chat', username: this.opts.seller.username, text: '📌 ' + text, isSeller: true, createdAt: Date.now() },
    };
    this.emit();
  }

  endShow() {
    this.stop();
    this.pushMessage({ type: 'system', username: 'Mezatonline', text: 'Yayın sona erdi. İzlediğiniz için teşekkürler! 💛' });
    this.state = { ...this.state, ended: true, endReason: this.state.endReason ?? 'seller' };
    this.emit();
    this.opts.events?.onEnded?.('seller');
  }
}
