# Whatnot buyer side: research for Mezatonline (TR)

> Scope: everything a **buyer** sees and does on Whatnot, with exact labels, numbers and rules, plus how each piece should be localized for Turkey.
> Research date: 2026-10-26. Main source: the **full Whatnot Help Center** (300 en-US articles, pulled through the public Zendesk API `help.whatnot.com/api/v2/help_center/en-us/articles.json`, most updated 2026-10-22..25). Also used: the official product blog (blog.teamwhatnot.com, 2024–2026 "Product Spotlight" posts), the Whatnot Engineering blog (the "Secret Max Bid" post, read through search excerpts), the App Store listing, and Turkish legal and cargo sources.
> Not reachable: `whatnot.com` and `whatnot.com/blog` (Cloudflare challenge, 403) and Reddit (403). Where Whatnot publishes no number (for example the bid increment table), this doc says so and gives a ₺ proposal.
> Notation: **[WN]** = verified Whatnot behavior. **[TR]** = recommendation for Mezatonline. **[INFERRED]** = UI detail pieced together from several help articles, not seen in a screenshot.

---

## 0. Cheat sheet: the numbers that matter

| Topic | Whatnot rule [WN] | Mezatonline proposal [TR] |
|---|---|---|
| Auction duration | Seller picks per auction, from "a few seconds to several minutes". 47% of sellers run ≤10 s; most run 5–15 s; a 7 s option was added in 2026; "many end in 30 seconds or less" | Options `5, 7, 10, 15, 20, 30, 45, 60 s` (+ `2, 3, 5 dk` for high-value items). Default 15 s |
| Late-bid extension | When **< 10 s** remain, each new bid resets the clock to the seller's **Counter Bid Time** (historically 10 s) | Threshold 10 s; reset to `counterBidTime` (default 10 s, options 5/7/10/15/20 s), never shorten the clock |
| Sudden Death | No extension. Ends at **00:01** to the last bidder. **💀** next to the timer | "Ani Bitiş 💀" toggle; server rejects bids that arrive after `endsAt` |
| Bid increment | Minimum step scales with price; the next valid amount is always shown. **No public table** | See §6 table (₺2 → ₺2.500 steps) |
| Max Bid / custom | "Custom" next to Bid. **Max Bid on (default)** = proxy bidding up to the cap; off = place exact amount. Hidden from everyone. Tie: **earlier bid leads** | Same. Turkish label: "Maks. teklif" |
| Bids binding | All bids and pre-bids are final; they cannot be cancelled or lowered | "Teklifler bağlayıcıdır" banner on the first bid |
| Pre-bid | Starts at the starting price, no maximum. Cannot be cancelled. Expires **24 h after the scheduled start**. Buyer is notified when the item is pinned and when outbid before the show | Same |
| Giveaway | Runs **up to 5 min**; host can end early; **cannot pause or cancel**. Buyer must be **present**, with address + payment method saved. One entry per person | Same mechanics. **Legal flag:** Turkish çekiliş needs Milli Piyango İdaresi permission (§21.7) |
| Flash Sale | Discounted BIN, duration set by seller (recommended ≥ 30 s). % or amount off. Optional per-buyer cap. No offers on it | Same, "Flaş İndirim" |
| Offers (BIN) | % presets or custom amount. Seller can accept, counter or decline. Counter expires in **24 h**; offer expires in **30 days** | Same, label "Fiyat Öner" (not "Teklif", see glossary) |
| Cancellation | Request before the label is created **and** within **24 h** of purchase. Seller has **2 business days**; no answer = order ships. Refund in 3–5 business days. Bidding-error report within **2 h** | Same, plus Turkish **cayma hakkı** (§21.6) |
| Ship-by | Seller ships within **2 business days**. Domestic delivery 5–14 business days (US). Support steps in if no label after **7 days** | 2 iş günü. Turkish delivery is typically 1–3 iş günü |
| Buyer Protection window | Earlier of **30 days from purchase / 14 days from delivery**. **7 days** for cards, TCG, coins, sneakers, luxury. **2 days** for plants and fresh food. Counterfeit claims: 30 days from receipt | Same |
| Return | Prepaid label. Ship within **5 business days**. Seller reviews the return within 48 h | Return code for Yurtiçi/Aras etc., paid by the seller (TR law) |
| Rating | 5 stars, within **30 days of delivery** (status "Pending Review"). ≤ 4★ asks for Shipping / Packaging / Accuracy. Reviews can be deleted but not edited | Same |
| Verified Buyer | Temporary **$10** authorization, released within 24 h, or prior purchase, or ID upload | ₺250 ön provizyon (3DS), released within 24 h |
| Tips | $1–$100 per tip, **presets only**. Max $200 or 10 tips per seller per show; $500/day. Buyer pays processing fee. Cards only. Non-refundable | §9 ₺ table |
| Video receipt | Clip of the moment you bought; available **60 days**, app only | Same |
| Referral credit | Paid to both sides after the new buyer's first delivered order. Subtotal only. Expires in **90 days**. Random $10–$200 variant | ₺ credit, 90 days |
| First-time buyer coupon | Up to **$20**, one livestream item, expires **7 days** after claim | ₺500 |
| Account Controls | Weekly/monthly **spend** and **watch-time** reminders and limits behind a **PIN**. A reached limit cannot be lifted | Same, week = Mon–Sun Europe/Istanbul |
| Age | 18+. Teens 13–17 only on a parent's account. Under 13 not allowed | 18+ (TR contract capacity) |

---

## 1. App structure and navigation [WN, partly INFERRED]

**Bottom tab bar (mobile app):**
1. **Home** (house icon): the live show feed.
2. **Categories** (app) / **Browse** (web): category tree, popular tags and topics.
3. **"+" / Sell**: listing creation for sellers (the blog says "tap '+' on the bottom home navigation, then 'List an Item'"). Approved sellers see **Seller Hub** instead.
4. **Activity**: Purchases, Bids, Offers, Saved (older docs also show a **Friends** tab here, under a chat-bubble icon).
5. **Account** (profile icon, bottom right).

**Home header (top right):** **Inbox** (messages icon: DMs, message requests, support requests), **Notifications bell** (tags, alerts), **Rewards Hub / Referral Hub** (gift icon: Points challenges, Points Shop, referral link, first-time buyer "Free Gift").
**Home body:** search bar at the top, then feed tabs:
- **For You**: live shows only, ranked by predicted watch time and orders (seller category, your history with the seller and the category, trust and safety quality).
- **Following** / **Followed Hosts**: shows from sellers you follow.
- **Category feeds** (chips such as Trading Cards, Sneakers, Coins & Money). Brand shelves exist in some categories (for example Men's Fashion).
- Feed items are **vertical 9:16 show thumbnails** (sellers upload 1080×1920 images or preview videos; the profile photo is the fallback). Each tile shows: LIVE badge or scheduled time, viewer count, seller avatar and username, show title, category/brand tags. Premier Shop sellers carry a badge on thumbnails. Community-Boosted shows get an animated border and a "Boosted by Viewers" badge.
- New in 2026: category browse tiles can show **what the seller is selling right now** (live listings preview).

**Search:** keyword, category, brand, seller or show name. Results have tabs (Products / Shows / Users). The Shows tab has **Filter → Free Pickup** (address + radius). Product results have **"Save this Search"** (saved searches only work for products, not for Shows, Categories or Users).

**Seller Leaderboards** (buyer-visible): per category, with **Live** (default, last 4 h, live sellers only), **Daily** (rolling 24 h) and **Weekly** (rolling 7 d) tabs. Same ranking for everyone in a region. Ranked by show sales and viewership.

[TR] Tabs: `Ana Sayfa · Kategoriler · (+) Sat · Aktivite · Hesap`. Header: `Gelen Kutusu`, `Bildirimler`, `Ödüller (🎁)`. Feed tabs: `Senin İçin · Takip Ettiklerin · <kategori chip'leri>`.

---

## 2. Live show screen anatomy [WN facts, layout INFERRED from help articles]

```
┌──────────────────────────────────────────────┐
│ [avatar] seller_name  [Follow]   👁 1.2K  [X]│  top-left: host; top-right: viewer count
│ ⭐4.9 · "Show title"                          │
│ ┌──────────── Giveaway box ──────────────┐   │  appears at TOP while a giveaway runs
│ │ 🎁 Free: <prize>   [Enter Giveaway]     │   │
│ └─────────────────────────────────────────┘   │
│ 👥 "ali & 2 friends are here" banner          │  friends banner (if friends present)
│                                        [👑]  │  crown = Rewards Club (if seller has one)
│            (video, full screen)        [↗]   │  Share
│                                        [✂]   │  Clip (last 60 s)
│                                        [👛]  │  Wallet
│                                        [⋯]   │  More (report, captions...)
│ chat messages (bottom-left overlay)          │
│  @user: is it PSA 10?                        │
│  ★ seller: /announce Next: Charizard         │  highlighted announcements
│ ┌───────── pinned product card ──────────┐   │
│ │ [img] Title                     ⏱ 0:08 💀│  │  💀 only for Sudden Death
│ │ Shipping: $X (or "Free shipping")       │  │  shipping shown under the title
│ │ Current bid $35 · 12 bids · Winning     │  │
│ │ [Custom]   [ >>> Swipe to Bid $37 >>> ] │  │
│ └─────────────────────────────────────────┘   │
│ [Say something…]  [🙂 reactions/jumbotron] [🛍 Shop]│  Shop icon bottom-right
└──────────────────────────────────────────────┘
```

Elements and behavior [WN]:
- **Host header (top-left):** tap the avatar/username to open a profile sheet with **Follow / Following → Unfollow**, **Tip or Boost** (Send Tip / Community Boost) and **Report**. The Report sheet lists **"Seller's Category Permissions"** (gated categories the seller may sell in).
- **Follow** button in the top-left.
- **Viewer count (top-right):** opens the viewer list. Buyers see **"Friends in live"**. Hosts and mods also see Watching (Friends, Host & Mods, Top Buyers) and Activity (raids, follows, tips, wins, purchases).
- **Giveaway box at the top:** "Enter Giveaway". Giveaways are never pinned at the bottom.
- **Pinned listing at the bottom:** one item at a time, showing title, image and price. You can bid or buy straight from it. Starting an auction auto-pins its item and replaces a pinned BIN. Nothing new can be pinned while an auction runs.
- **Bid control:** **swipe** the Bid button (click on web) to place the next valid bid; the amount is visible before you commit. **Custom** sits next to it.
- **Shipping cost** is shown **under the item title** before you bid or buy.
- **Shop icon (bottom-right):** the show's Live Shop, with tabs **Auction**, **Buy Now** (BIN), **Giveaway**, plus **Breaks** / **Party Purchase** when used. Auction items not run yet show a **Pre-Bid** button. Nearly half of buyers open the Live Shop as soon as they join.
- **Wallet icon:** Payment (methods, Gift Card toggle), Shipping (address), **Delivery Method** (Shipping / Free Pickup), **Coupon Code** field + **Apply**, **Promotions** field (legacy referral codes), Weekly Bundling toggle. Your active coupon shows under "Shipping & Payment".
- **Chat:** `@username` autocomplete for tagging (tagging is rate-limited). Questions are highlighted in yellow for the seller. Seller and mods can type `/announce`, `/hide`, `/slow <sec>` and `/raid <username>`. Seller-only badges mark first-time buyers and repeat buyers.
- **Double-tap an empty area** sends a **Reaction** that everyone sees. The icon next to the chat box opens a management sheet for picking the active Reaction and Jumbotron.
- **Jumbotron:** a full-screen celebration with the buyer's name and avatar, shown to everyone after a purchase (redeemed with Points). More than 1 in 5 live orders include one.
- **Crown icon:** the seller's Rewards Club (tier, progress, coupons, Redeem).
- **Booster** badge next to your name for the show you contributed Community Boost to.
- **Clip:** captures the last 60 s; minimum 5 s; private by default.
- Captions come from the OS accessibility features; there is no in-app toggle.
- **Raid:** when a host ends with a raid, viewers get a notice and are moved to another live show. You can opt out by leaving.
- **Co-host:** up to one, with their own video next to the host's.
- **Removed from show:** you cannot rejoin, chat or bid for the rest of that show.
- **Verified-only shows:** you can watch but not bid or enter giveaways until verified.
- **Watch-limit reached:** a full-page notice removes you from the show ("You have self excluded from this live show").

[TR] Labels: `Takip et / Takip ediliyor`, `👁 1,2B`, `Çekilişe katıl`, `Kargo: ₺65` / `Ücretsiz kargo` / `Kargo: +₺0 (paketine eklenir)`, `Güncel teklif ₺350 · 12 teklif · Öndesin`, `Özel`, `→ Kaydır: ₺360 teklif ver`, `Bir şey yaz…`, `Mağaza`, `Cüzdan`, `Paylaş`, `Klip`.

---

## 3. Sales formats a buyer can meet [WN]

| Format | Where | How the buyer buys |
|---|---|---|
| **Auction** | In show (most common) | Swipe to bid, or Custom (Max Bid). Highest bid at 0 wins; card charged automatically |
| **Sudden Death auction** | In show | Same, no time extension, 💀 |
| **Pre-bid** | Before the show, on auction listings in the show's shop | Enter Max Bid; it plays automatically when the item runs |
| **Buy It Now (BIN / Buy Now)** | In show (Buy Now tab) and in the seller's **Profile Shop** (marketplace) | Item → **Buy Now** → checkout sheet → confirm. Some BINs are "Reserved for Live" and only buyable while the show is live |
| **Make Offer** | BIN listings with offers on | % or custom amount; charged only if accepted |
| **Flash Sale** | In show | BIN at a timed discount; buy before the countdown ends |
| **Giveaway** | In show | Free; tap Enter Giveaway and stay in the show |
| **Breaks** (cards) | In show | Buy "spots" by auction or BIN. Formats: Random Spot, Pick Your Spot/Team, Hit Draft, Pack Break |
| **Surprise Sets** | In show | Buy a spot (auction) and receive one of up to 500 items, assigned at random with a spin animation |
| **Party Purchase** (beta, app only) | In show | Group buying of BIN items toward milestone rewards |
| **Auctions (formerly "Anytime Auctions")** | Marketplace, outside shows (2024, selected categories, about a week long, can be pinned in a live) | Legacy or limited; not in the current help center. Skip for the MVP |

**There is no shopping cart.** Every bid win or Buy Now is its own order, charged immediately, and shipping is worked out per item (bundled afterwards, see §12).

---

## 4. Auctions in detail

### 4.1 Swipe to bid [WN]
- The bid button always shows the **next valid amount** (current price + minimum increment, or the starting price if nobody has bid).
- On mobile it is a **swipe** gesture (prevents accidental taps); on web it is a click.
- After a successful bid you are the leader ("Winning"). When someone outbids you, the button updates and you can swipe again.
- When the timer hits 0, the **highest bidder wins** and the **default payment method saved at bid time** is charged automatically. Order: Activity › Purchases.

### 4.2 Custom bid and Max Bid [WN]
Tap **Custom** next to the Bid button to enter an amount. Two modes:
- **Max Bid ON (default):** Whatnot bids for you in minimum increments **only when someone bids against you**, up to your cap. If nobody else bids you can win below your max. If someone goes past your max you are outbid and can bid again or set a new max.
- **Max Bid OFF ("submit exact bid"):** the whole amount is placed at once as one bid.
- Max Bids are **private**; seller and other buyers only see the current high bid.
- **Ties:** whoever reached that amount **first** keeps the lead.
- "Why did it reach my max so fast?" Many bidders and other Max Bids make the proxy climb quickly. You are never charged above your cap.
- Shipping and tax are added on top if you win.
- Engineering: Max Bid was built so the cap is never leaked in websocket payloads to anyone but its owner, and it had to work with old app versions. About 570k max bids in the first period, roughly 4% of all bids.

**Proxy resolution algorithm [TR, standard English auction proxy, consistent with WN text]:**
```
on newBid(user U, amount A, isMax):
  require A >= nextMinBid(current)                 // otherwise "En az ₺X teklif vermelisin"
  if U is current leader and isMax: just raise U.max = A; price unchanged; return
  L = current leader, Lmax = L.max ?? current
  if isMax:
     if A > Lmax: price = min(A, Lmax + inc(Lmax)); leader = U; U.max = A
     else:        price = min(Lmax, A + inc(A));    leader = L   // A == Lmax: L keeps the lead (earlier)
  else (exact):
     if A > Lmax: price = A; leader = U
     else:        price = min(Lmax, A + inc(A)); leader = L      // proxy answers at once
  every accepted price change counts as a bid for timer extension (§5)
```
The UI shows the bid count, the current price and the leader's username. Proxy bids show up as ordinary bids by the leader.

### 4.3 Pre-bids [WN]
- Only on auction listings the seller added before the show, and only if the seller left pre-bids on (sellers can **Disable pre-bids** against disruptive bidders, web only).
- App flow: open the upcoming show → **Store** icon (bottom-right) → **Auction** filter → **Pre-Bid** → enter Max Bid → **Submit**. Web flow ends with **"Confirm & bid"**; on web you can only pre-bid from inside the show, not from a standalone listing page.
- "**Winning**" appears next to the bid count when you are the top pre-bidder.
- Pre-bids behave exactly like Max Bids and are used automatically when the item runs, **even if you are not watching**.
- Minimum = the seller's starting price; **no maximum**. If the seller starts the auction above every pre-bid, those pre-bids are cleared.
- **Binding**: cannot be cancelled or lowered.
- **Expiry:** 24 h after the scheduled start time you saw. Also expires if the show moves more than 24 h later, never starts, or the listing is deleted or never run. Payment holds and Account Controls amounts are released and you get a notification to re-bid.
- Multi-quantity listing: the pre-bid applies to **one unit**, the first one auctioned.
- Notifications: **when the seller pins the item** you pre-bid on, and (since 2026) **when you are outbid before the show**, linking straight back to the listing (+4% daily pre-bidders, +7% pre-show pre-bids).
- **Activity › Bids** filters: `Upcoming · Outbid · Winning · Expired · Lost · Won · Ended · All`. This tab only covers pre-bids, not live bids.
- Seller side: shows with strong pre-bid activity see up to 7× sales.

### 4.4 Auction rules shown to buyers [WN]
- **"You bid, you buy."** All bids are binding. Cancelling or charging back can lead to account action, up to a ban.
- **Bid responsibly**: no shill bidding (seller, family, employees, friends or mods bidding the price up) and no **disruptive bidding** (absurdly high or fake bids).
- **Clear errors** (for example an accidental 10× bid): Whatnot may cancel the auction so the seller can re-run it. The buyer must contact support **within 2 hours**.
- Once started, an auction **cannot be cancelled or stopped by the seller**. With no bids the item stays unsold and the seller may re-run it.
- **Payment declined after winning:** the buyer gets a notification to **retry** or **add a new payment method** and has **until the end of the show**. The seller may re-run the item meanwhile. If unpaid when the show ends, the order is cancelled automatically and nothing is charged.
- Bots and programmatic bidding are prohibited.

### 4.5 Edge cases to implement [TR]
- Bid arrives after `endsAt` (server time): reject with "Süre doldu".
- Custom amount below the next minimum: inline error "En az ₺X".
- Leader raising their own max: no price change, toast "Maksimum teklifin ₺X olarak güncellendi".
- Equal max bids: the earlier one leads at that amount.
- Buyer over the spend limit (§11.2): bid disabled, Account Controls notice. Existing max/pre-bids keep climbing and stay binding.
- Unverified buyer in a Verified-only show: the "Get Verified" sheet opens on the first swipe.
- Blocked by the seller: cannot join the show or buy. Removed from the show: cannot rejoin.
- Network lag: optimistic "Gönderiliyor…" state, then confirm or revert with "Teklifin geçildi".
- Seller's own account cannot bid; mods and co-host are flagged for shill checks.
- Coupon active and you lose the auction: the coupon is not consumed.

---

## 5. Auction timer rules (normal vs Sudden Death, extensions)

**What Whatnot documents [WN]:**
1. The seller sets three things when starting an auction (in show: Shop → Auction tab → item → **Start Auction** → settings → **Start**):
   - **Starting bid**
   - **Auction time**: the *minimum* length. New bids can extend it.
   - **Counter bid time**: "When fewer than **10 seconds** remain, each new bid resets the timer to this amount."
   - **Sudden death** (optional): "Ends the auction at **00:01** to the final bidder without extending time."
2. **Standard timer:** starts with the chosen duration (help example: 30 s). A bid in the final 10 s resets the remaining time to the counter-bid time. The engineering blog describes the original rule as "a new bid within the last 10 seconds resets the timer back to 10 seconds".
3. **Sudden Death timer:** never extends. The highest bid placed **before time runs out** wins. A **💀** sits next to the timer.
4. The countdown is always visible to every viewer. (Giveaway countdowns, by contrast, are only shown to the host.)
5. Real-world durations: 47% of sellers run ≤ 10 s auctions; most run 5–15 s; 5 s timers give the most sales per hour and 10 s comes next; a **7 s** timer was added in 2026 and is used for about 30% of auctions by 17k high-velocity sellers. Fast categories (Food & Drink, Womenswear) average under 10 s; Luxury Handbags and Sneakers run longer. Engineering blog: "typically 30 sec – 1 min" (2023).
6. Bids extend the timer; the seller cannot stop the auction.

**Mezatonline spec [TR]:**
```
AUCTION_DURATIONS      = [5, 7, 10, 15, 20, 30, 45, 60, 120, 180, 300] s   (default 15; "Ani Bitiş" default 10)
COUNTER_BID_OPTIONS    = [5, 7, 10, 15, 20] s   (default 10)
EXTEND_THRESHOLD       = 10 s (fixed, as on Whatnot)
on accepted bid at time t (server clock), remaining r = endsAt - t:
   if suddenDeath:            no change
   else if r < 10 s:          endsAt = t + max(r, counterBidTime)   // never shortens
   else:                      no change
end:  at endsAt the server locks the lot. Bids with server timestamp ≥ endsAt are rejected.
      Display rounds up so "0:01" is the last visible moment (matches "ends at 00:01").
SOLD → winner banner + Jumbotron (if any) + order created. No bids → "Satılmadı" and the seller may re-run.
```
- Show the timer as `0:12`, red under 5 s, pulsing under 3 s, with 💀 + "Ani Bitiş" when sudden death is on.
- Auto-bids (Max Bid proxies) count as bids and also extend the timer.
- This matches the existing `src/lib/auction.ts` (`EXTEND_THRESHOLD_SEC = 10`, `EXTEND_TO_SEC = 10`). Suggested changes: make `EXTEND_TO_SEC` a per-auction `counterBidTime`, use `max(remaining, counterBidTime)` so a short counter time never cuts the clock, and add 7 s to `AUCTION_DURATIONS`.
- Open question: Whatnot's wording "resets the timer to this amount" could also shorten time if the counter-bid time is below the remaining time. That reading is buyer-hostile and ambiguous, so the `max()` version is recommended.

---

## 6. Bid increment table

**Whatnot [WN]:** "Bids increase by a minimum increment based on the current price. As the price goes up, the minimum increment may increase too. You'll always see the next valid bid amount before placing a bid." No official table exists in the help center, the blog or the engineering posts, and Reddit and the web app were not reachable. Observed practice in US shows: $1 steps at low prices, growing to $5/$10/$25+ at high prices. Some App Store reviews complain about "bid amounts jumping sharply", which suggests steep tiers at high prices. Custom bids may be any amount at or above the next minimum; they do not have to land on an increment.

**Proposed ₺ table [TR]** (whole lira only, roughly 2–10% steps; same values as the existing `INCREMENT_TABLE` in `src/lib/auction.ts`):

| Current price (₺) | Min. increment | Example next bids |
|---|---|---|
| 0 – 49 | **₺2** | 10 → 12 → 14 |
| 50 – 99 | **₺5** | 50 → 55 → 60 |
| 100 – 499 | **₺10** | 120 → 130 |
| 500 – 999 | **₺25** | 500 → 525 → 550 |
| 1.000 – 2.499 | **₺50** | 1.000 → 1.050 |
| 2.500 – 4.999 | **₺100** | 2.500 → 2.600 |
| 5.000 – 9.999 | **₺250** | 5.000 → 5.250 |
| 10.000 – 24.999 | **₺500** | 10.000 → 10.500 |
| 25.000 – 49.999 | **₺1.000** | 25.000 → 26.000 |
| 50.000+ | **₺2.500** | 50.000 → 52.500 |

Rules [TR]:
- The first bid equals the starting price (`₺1` minimum; "1 liradan mezat" is a popular hook, so allow `₺1` starts).
- Optional low-end tweak: below ₺20 use ₺1 steps so "₺1 starts" feel like Whatnot's $1 steps.
- The increment is computed from the **current** price (`bidIncrement(current)`).
- Custom bids: any integer ≥ `nextMinBid`; with Max ON it is stored as a cap.
- Quick-pick chips in the Custom sheet: `min, min+1×, +3×, +7×, +15× step` (as in the existing code), plus a numeric keypad.
- Sellers do **not** set increments on Whatnot; the platform enforces them. Keep that.

---

## 7. Buy It Now, Offers, Flash Sale, Party Purchase, Breaks, Surprise Sets

### 7.1 Buy It Now [WN]
- In show: **Shop → Buy Now tab → item → Buy Now**. Out of show: seller profile → **Shop** tab → filter **Buy It Now** → item → **Buy Now**.
- Checkout sheet: item, price, shipping, tax and total; **Payment** section (expand, pencil to change; Gift Card toggle; "Pay over time" BNPL); **Delivery Method** (Shipping / Free Pickup); coupon line; confirm button "Buy Now" / "Pay [amount]".
- Available while stock lasts. Multi-quantity and variants (size/color, up to 3 options) supported.
- Reserved-for-Live BINs can only be bought during that show.
- Sellers who list at least 3 BIN items in a live earn about 2× per hour; roughly 40% of their sales come from BIN.
- [TR] Label: `Hemen Al` · `₺1.250` · `Stokta 3 adet`.

### 7.2 Make Offer [WN]
- Button **Make Offer** (app) / **Offer** (web) on BIN listings where the seller turned **Accept Offers** on (imported show items have offers on by default).
- Flow: choose a **percentage discount** chip or enter a **custom amount** → **Continue** → review offer, payment and shipping → **Confirm**.
- Not charged unless accepted. On acceptance the card is charged and an order confirmation email is sent.
- Seller options: **Accept**, **Counter**, **Decline**. In a live the seller can "Accept the highest offer / Counter all / Reject all".
- Counteroffer: notification; buyer has **24 h** in **Activity → Offers**, with **Accept** (charged now) or **Reject**.
- Offer auto-expires after **30 days** without a reply. Cancel in the app only: Activity → Offers → offer → **Cancel**.
- Offer statuses: `Awaiting Reply · Counter Offer · Accepted · Cancelled · Expired`.
- Not allowed on Flash Sale items. Coupons do not apply to offers. Gift cards cannot pay for offers.
- [TR] Labels: `Fiyat Öner`, `%10 · %15 · %20 · Özel`, statuses `Yanıt bekleniyor · Karşı teklif · Kabul edildi · İptal · Süresi doldu`.

### 7.3 Flash Sale [WN]
- A BIN with a timed discount, live only. The seller sets **% off** or **amount off** (the % is calculated), the **duration** (recommended ≥ 30 s), optionally **Available for full price** afterwards, and a **Max purchase limit** per buyer.
- It auto-pins when started, with a countdown. Sellers sometimes chain several within seconds.
- After the sale the listing goes back to normal BIN at full price, or disappears if sold out or not set to full price.
- [TR] `⚡ Flaş İndirim · %30 · 00:25` with the struck-through old price `₺̶1̶.̶0̶0̶0̶ ₺700`.

### 7.4 Party Purchase (beta, 2026) [WN]
- The seller pins a "party" of BIN items with a **unit goal**, a **duration of 1, 3, 5 or 20 min**, and **up to 10 milestones** (% or amount off, coupon, giveaway entry).
- The buyer sees a **progress bar + countdown**. Each eligible purchase moves the bar. The party ends when every milestone is reached **or** time runs out.
- Discounts do not stack: you get the **largest** unlocked one, also on purchases made before that milestone.
- Payment: a **hold for the full list price** at purchase, then the final amount is captured after the party ends and the rest is released. Your purchase goes through even if no reward unlocks.
- Giveaway milestone: everyone with an authorized purchase by the time it unlocks is entered.
- [TR] "Ortak Alım". Optional for the MVP and a nice differentiator.

### 7.5 Breaks (cards) [WN]
- Formats: **Random Spot** (team assigned randomly after purchase), **Pick Your Spot/Team**, **Hit Draft** (cards shown first, draft order bought), **Pack Break** (buy a specific pack).
- Buyer UI: pinned break → **See Spots** list → buy a spot (BIN or auction) or make an offer if enabled. **Start Breaking** notifies every spot buyer to come back.
- Video receipt for a break = the full show.
- High-Value Card Protection: lost high-value cards from breaks or Surprise Sets are refunded at **market value**, up to the paid amount in money and the rest as credit. Claims within 30 days of purchase.

### 7.6 Surprise Sets [WN]
- Buy a spot and receive one of up to 500 similar products at random. **Auto-Randomize** and **Quick Spin** animation.
- [TR] **Legal flag:** random-outcome paid products can fall under Turkish **şans oyunu** rules (§21.7). Keep Breaks and Surprise Sets in mock form only until legal review.

---

## 8. Giveaways

**Types [WN]:**
| Type | Who can enter |
|---|---|
| **Standard** ("Everyone") | Any eligible viewer; optionally domestic-only |
| **Follower-Only** | Followers; the entry prompt includes a follow step |
| **Buyer Appreciation (BAG)** | Buyers who made a purchase **after the giveaway listing was created** and before the draw. US/CA also offer a free web-form entry (AMOE) with a Giveaway ID |

**Requirements [WN]:** a saved **shipping address** and **payment method** (never charged); **app only** (not web); **present** in the show at the draw. Leaving removes your entry; coming back before the draw re-enters you automatically. Switching accounts on the same device removes the previous account. **One entry** per user per giveaway; multi-account or automated entries are voided.

**Mechanics [WN]:**
- Runs for **up to 5 minutes**. The host can **End Giveaway** early; at 0 a winner is picked automatically.
- Cannot be **paused or cancelled** once started. Only one at a time. Selling continues during it.
- Countdown **visible only to the host**. Buyers see the **Giveaway box at the top** with **Enter Giveaway**.
- Winner is drawn **randomly by Whatnot** and announced publicly in the show. The winner does not need to react.
- The winner gets a **$0 order** in Activity. The **seller pays shipping** (deducted from the balance) and must ship within 2 business days. A giveaway item can bundle with the winner's other purchases.
- No refunds on giveaway items (nothing was bought), but a missing item can be escalated to support.
- The seller may not deny or downgrade the prize, add extra conditions (for example "follow my Instagram"), require a purchase, use wheels or physical randomizers, or redeem in a future stream. The prize must be disclosed before running.
- Variants: Coupon Giveaways (Japan), Gift Card Giveaways (US/CA).

**[TR] localization:** `🎁 Çekiliş · Hediye: <ürün> · [Çekilişe katıl]` → after entry: `Katıldın ✓ · Çekiliş bitene kadar yayında kal`. Winner toast: `🎉 @kullanici kazandı!`. **Legal:** in Turkey any çekiliş (prize draw) generally needs **Milli Piyango İdaresi** permission; running one without permission is a crime (3–6 years plus judicial fines, per the Finance Minister's warning; MPİ filed complaints about 286 unauthorized draws in 2024). Mezatonline needs either a platform-level MPİ permission model, or to restrict the format (for example skill-based or "first N followers" rewards) after legal review. In the mock build, keep the UI but put a legal disclaimer in the rules sheet.

---

## 9. Tipping and Community Boost

**Tip a seller [WN]:**
- App only. Supported countries only, and buyer and seller in the same country.
- In show: tap the seller avatar (top-left) → **Tip or Boost** → **Send Tip** → **pick a preset amount (no custom)** → optional thank-you note → **Next** → review payment → **Send Tip**. From the profile: **Tip Me** button.
- Limits: **$/£/€1–100 per tip**; **$200 or 10 tips per seller per livestream**; **$500 per day** in total. Cooldown between tips (the T&Cs say both "15 second" and "wait 30 seconds"; use 30 s).
- The **buyer pays processing fees**, shown before confirming; the seller gets 100% (no commission). **Cards only** (no Apple Pay or PayPal). **Non-refundable**.
- If the seller has tipping alerts on, the tip and note appear in chat; tips from the profile land in the seller's DMs. History: Activity → Purchases → **Tips** filter.
- [TR] `Bahşiş Gönder`. Presets `₺20 · ₺50 · ₺100 · ₺250 · ₺500 · ₺1.000`. Limits: per tip ₺20–₺2.500; per seller per show ₺5.000 or 10 tips; per day ₺10.000. Processing fee line shown ("İşlem ücreti ₺X"). Optional note up to 140 characters.

**Community Boost [WN]:** viewers pool contributions toward a promotion goal set by category demand (sellers do not set it). When reached, the show gets a **15-minute boost** with an animated border and "Boosted by Viewers" badge in feeds. Contributors get a **"Booster"** badge for that show only. Contributions are final, roll across shows, and are **auto-refunded if the goal is not hit within 30 days**. They do not count toward Rewards Club. [TR] "Yayını Öne Çıkar" / badge "Destekçi". Low priority.

---

## 10. Payments, Wallet, coupons, credits, referrals, rewards

### 10.1 Payment methods [WN]
- Credit/debit cards, PayPal, Apple Pay (iOS), Google Pay (Android), Venmo, Wero, and **BNPL** (Klarna from $/£/€10, Affirm from $50, US only).
- BNPL is **BIN only, app only, same-country only**, cannot be the default, and is never usable on auctions.
- One **default** payment method. **Auctions use the default set when you placed the bid.** BIN and offers preselect the default but let you change it.
- Add or change a method in Account → **Payments & Shipping**, in show via **Wallet → Payment**, or in BIN checkout (Payment → pencil). A newly added method becomes the default.
- A method cannot be changed after the order is placed. You can only remove a method if you have more than one.
- Declines: insufficient funds, expired card, wrong details, billing-address mismatch, bank block. In show: notify, then retry or add a new method before the show ends. Outside a show: "payment declined", order not placed.
- Pending charges come from purchases or the verification hold. Whatnot has **no subscriptions**.

### 10.2 Order of application [WN]
**Coupons → Promotional credits (referral etc.) → Gift Card balance → default payment method.** Coupons and credits apply to the **item subtotal only** (not shipping, tax or fees). Gift cards can also pay shipping and tax.

### 10.3 Coupons [WN]
- Seller coupons are claimed in show: **Wallet → Coupon Code → Apply**. They are used once per buyer, on a **single item**, and leftover value is forfeited.
- Seller coupon types: fixed amount or % (with a maximum). Restrictions: first-time buyers, specific shows, minimum subtotal.
- Live purchases only (not out-of-show or offers). **Only one coupon active at a time.** Applied automatically to the first qualifying purchase; shown under the item description in a live and at BIN checkout.
- Whatnot "Coupon Drops" (Rewards Hub, app only): e.g. "$5 off $15+". Limited claim counts, expiry, category limits. **Tax is computed on the pre-coupon price.**
- **First-Time Buyer "Free Gift":** coupon up to **$20**, one livestream item, expires **7 days** after claiming. Claimed from the in-live Free Gift prompt or the Rewards Hub.
- First-time buyer free shipping test: up to **$25** (iOS, US).
- Refunds never return coupon value.

### 10.4 Referrals [WN]
- Gift icon → copy the **Buyer Referral link** (codes are legacy). The new user signs up through the link and **verifies a phone number**; both get credit after the new buyer's **first eligible order is delivered**.
- Variants: Standard (amount shown in the Referral Hub), **Randomized $10–$200** (everyone at least $10; about 5% get ≥ $20, 2% ≥ $50, 0.2% $200), **Tiered** ($10 each plus monthly milestones, reset at month-end).
- Credit applies to the subtotal only, has no minimum spend, works in and out of shows, not on Free Pickup orders, same currency only, and **expires 90 days** after issue. Lifetime cap $10,000.
- Referral history: Gift icon → Referrals → **View referral history**.
- [TR] "Arkadaşını davet et, ikiniz de ₺250 kazanın". Phone (+90) OTP required.

### 10.5 Gift Cards [WN] (US/CA only)
Digital, never expire, claimed in Account → **Gift Cards**, applied automatically (toggle off in Wallet or checkout), oldest card first. Not usable for tips, offers, coins/bullion or Community Boost. [TR] Skip for now.

### 10.6 Points and Rewards Hub [WN]
- **Challenges** change daily (watch a show, save a show, follow a seller, purchase…) and can be completed once per day; progress can take 2 minutes to update. **Points never expire.**
- **Points Shop:** **Jumbotrons** (purchase celebration with your name and avatar, shown to everyone) and **Reactions** (double-tap; cheers, hearts, crowns). Redemptions are final.
- About 1 in 5 active buyers opens Points daily and 75% of them complete a challenge.
- [TR] `Ödüller → Görevler / Puan Mağazası`. Strong engagement mechanic, worth building with mock data.

### 10.7 Rewards Club (per-seller loyalty) [WN]
- Joined automatically at the first qualifying purchase. Shown through the **crown icon** in the seller's show.
- Tiers: **Bronze, Silver, Gold, Platinum, Diamond**. Achievements: shows watched (≥ 10 consecutive minutes, Bronze only), purchases completed, amount spent (subtotal).
- Rewards: coupons, exclusive (tier-gated) shows, membership badges in chat, free shipping.
- Seasons last **3 months**; progress resets, except Diamond restarts at Gold. Coupons get a **5-day (120 h) grace period** after the season ends.
- One coupon per purchase, not on offers or multi-quantity buys, and purchases made with them are final.
- The badge can be hidden: Account → Preferences → "Display Rewards Club Status".
- [TR] `Sadakat Kulübü · Bronz / Gümüş / Altın / Platin / Elmas`.

---

## 11. Verification, account controls, age

### 11.1 Verified Buyer [WN]
- Sellers can turn on **Verified Buyers** for a show; unverified users can watch but not bid or enter giveaways. Large shows may ask everyone to re-verify.
- You count as verified if you have **a successful past purchase**, **verified your ID** (Account → Verified Buyer → upload ID), or **approved a temporary authorization** ($10 in the US, released within 24 h, captured only in fraud cases).
- In-show flow: swipe to bid → prompt → **Get Verified** → (optional) update payment → **Authorize** → close and bid.
- Status: Account → **Verified Buyer**.
- [TR] `Doğrulanmış Alıcı`. Flow: `Doğrulan` → 3D Secure **₺250 ön provizyon** through iyzico (released within 24 h). Optional e-Devlet / NVİ TCKN check as the "ID" path.

### 11.2 Account Controls [WN]
- Account → **Account Controls**: **Watch Time** and **Spend** pages with weekly and monthly totals (Sun 00:00 – Sat 23:59 GMT; calendar month).
- **Reminder**: full-page, dismissable. **Limit**: blocks watching or spending until the period ends; once reached it **cannot be lifted, even by support**. Editing requires the **Account Controls PIN** (enter twice).
- Spend counts **won + currently winning** bids, including tax, fees and shipping, but **not** unused max-bid headroom. A limit is a threshold, not a hard cap: one purchase can cross it, and binding max or pre-bids keep incrementing.
- With a spend limit you can still watch; with a watch limit you can still buy from shops outside shows.
- Also on this page: **DM on/off**, Private Entry, Activity Status.
- [TR] `Hesap Kontrolleri · İzleme süresi · Harcama · Hatırlatıcı · Limit · PIN`. Week = Pazartesi 00:00 – Pazar 23:59 (Europe/Istanbul).

### 11.3 Age and accounts [WN]
- 18+. Teens 13–17 only on an account owned and supervised by a parent. Under 13 never (not even with a parent present). App Store rating 13+.
- Sign-up with Google, Facebook, Apple or email. One account per email. Multiple buyer accounts allowed, with an iOS **account switcher** (▼ next to the username). Push notifications only for the active account.
- [TR] Sign-up with Apple, Google or e-posta, then **telefon OTP (+90)**. Checkboxes: KVKK Aydınlatma Metni (read), Açık Rıza (optional), Ticari İleti İzni (İYS, optional), Kullanım Koşulları. Confirm "18 yaşından büyüğüm".

---

## 12. Shipping (buyer view)

### 12.1 How costs work [WN]
- Whatnot generates a **prepaid label**; the buyer never picks a carrier. The service is chosen automatically from category, weight and size, seller settings and discounts, and distance.
- **Shipping is charged per item at purchase time** (no cart). The cost is **shown under the item title before bidding** and again in the receipt.
- **Smart Bundling™**: items from the **same seller** in the **same sales channel** (one show, or the marketplace) are combined. Each extra item is charged only the **incremental** cost it adds, often **"Free Shipping"** if it fits the package already paid for. Show purchases and marketplace purchases never bundle together. Large orders may be split into several packages, each with its own tracking.
- **EU/UK model** (closest to "one shipping fee per show"): the first purchase in a stream picks the cheapest package format that fits; later items go into the same package; you pay only the difference if a bigger format is needed (UK example: Large Letter £2.62 → Small Parcel £3.27, charged as the difference).
- US examples: Ground Advantage $4.47 (≤ 4 oz) … flat **$7.75 for 1–5 lb**; FCML letters for cards $0.78–1.36; Flat Rate $12.99; UPS for 6–20 lb ($11–$18.40). Germany: €1.19 letter … €7.73 for 31 kg.
- Seller discounts are applied automatically: **"Free shipping"** (seller pays) or **"Reduced shipping"** (you pay at most a cap for the whole show, however many items you buy).
- Incremental weights for small items: TCG, sports cards and LEGO add 0.5 oz each; comics add 2.5 oz each.
- **Postage due** at the door is reimbursed by Whatnot (don't refuse the package). Overcharges from wrong seller weights can be reviewed by support.
- Taxes: US sales tax is added on top; UK/EU prices include VAT.

### 12.2 Weekly Bundling [WN]
Opt-in by **both** buyer and seller (Account → Payments & Shipping → **Weekly Bundling**, or from the Wallet). You pay shipping on the first purchase of the week; later purchases (show, marketplace and BIN) join the bundle and pay only weight-tier differences. The bundle **closes Sunday midnight** (seller's time zone) and must ship **by end of Tuesday**. You can DM the seller to ship early. Not available in France or Belgium.

### 12.3 Free Pickup / Local Pickup [WN]
App only, only if the seller offers it, for auctions and BIN in that show. It must be chosen **before** buying: **Wallet → Delivery Method → Free Pickup** (auctions) or **Delivery Method** at BIN checkout. The choice is remembered per seller. You get pickup instructions, a **Pickup Code** and a **QR code**, and must **pick up within 7 days** (then the order auto-completes). Keep arrangements in Whatnot DMs and meet in public.

### 12.4 Timelines, tracking and signature [WN]
- Ship within **2 business days**. Average arrival 7 days; up to 14 is normal (US). International 1–4 weeks, and the buyer pays customs.
- Tracking: order details → **Track your purchase** (opens the carrier page). Tracking can lag 24–48 h after the label. A **drop-off confirmation photo** appears if the seller scanned the package in the app (this cuts "not shipped" tickets by 71%).
- Contact support if there is no label after **7 days**, a domestic package has not arrived **2 weeks after shipment**, or an international one after 30 days. "Delivered but missing": wait 1–2 days, then report **within 14 days**.
- **Signature confirmation** is automatic on US shipments **≥ $500** (seller pays $4.15). Buyers can opt out (Account → Payments & Shipping → Allow Signature Confirmation), but then lose protection for "not received" claims.
- Shipping address: Account → **Addresses** (+ to add; edit or delete). In show: Wallet → Shipping. For an existing order the address can only be changed while it is **Preparing Package**: order → **Shipping to** → choose → **Update** (US only). Sellers cannot change addresses.

### 12.5 [TR] Shipping localization
- **Carriers:** Yurtiçi Kargo, Aras Kargo, MNG Kargo, PTT Kargo, Sürat Kargo, HepsiJet (optionally Trendyol Express, Kolay Gelsin, Sendeo). As on Whatnot, the **platform picks** the carrier (seller default + availability). The buyer sees the carrier name and logo on the order.
- **Label model:** Turkish marketplaces usually give the seller a **"gönderi kodu / kargo kodu"** (barcode/QR) to show at the branch instead of a printed label. Mock this as `Kargo kodu: YK-4829-1736`.
- **Pricing by desi** (desi = cm³ ÷ 3000, the higher of weight and desi). 2026 marketplace-contract benchmark for 1–5 desi is about ₺61–81. Mock buyer-facing table (KDV dahil):

| Package format | Max | Buyer price |
|---|---|---|
| Zarf (kartlar, sticker) | 0,5 desi / 500 g | ₺45 |
| Küçük paket | 1 desi | ₺65 |
| Orta paket | 3 desi | ₺75 |
| Büyük paket | 5 desi | ₺89 |
| Koli | 10 desi | ₺129 |
| Büyük koli | 20 desi | ₺199 |
| 20+ desi | — | Seller quote / ₺199 + ₺9 per desi |

- **Bundling rule for Turkey:** use the **per-show package model** (EU/UK). The first item in a show pays its package; later items say `Kargo: +₺0 (aynı pakete eklendi)` or `Kargo farkı: +₺14`. Seller options: `Ücretsiz kargo` and `Yayında kargo en fazla ₺X`.
- **Status copy:** `Hazırlanıyor` → `Kargo kodu oluşturuldu` → `Kargoya verildi` → `Transfer merkezinde` → `Dağıtıma çıktı` → `Teslim edildi` (+ `Şubede bekliyor`, `Teslim edilemedi`, `Göndericiye iade`).
- Delivery estimate: "Tahmini teslimat: 2–4 iş günü".
- **Free Pickup → `Elden teslim (ücretsiz)`** with the same 7-day code/QR rule. Optionally add `PTT/HepsiJet teslimat noktası`.
- Ship-by text: "Satıcı 2 iş günü içinde kargoya verir". Delays past 7 days → `Destek'e yaz` CTA.

---

## 13. Activity tab, order lifecycle, receipts

### 13.1 Activity [WN]
- **Purchases** filters: `All · In Progress · Completed · Refunds · Canceled · Pending review` and other types `Tips · Community Boost`.
- **Bids** (pre-bids only): `Upcoming · Outbid · Winning · Expired · Lost · Won · Ended · All`.
- **Offers**: `Awaiting Reply · Counter Offer · Accepted · Cancelled · Expired`.
- **Saved**: `All · Shows · Products · Searches · Videos` (bookmarked items; saved searches flag new results).
- Purchase history CSV (web only): Order ID, Order numeric ID, Buyer, Seller, Product name/description/category, Processed date, Order status, Order style (`Direct_order`, `Direct_offer`, `Giveaway`), Sold price, Quantity, Subtotal, Shipping, Taxes, Customs, Credits applied, Total.

### 13.2 Order statuses [WN]
Buyer-facing: **Preparing Package** (no label yet, so cancel and address change still possible) → **Label Created** → **Shipped** → (Delivered) → **Pending Review** (30-day rating window) → **Completed**. Side states: **Pending Cancellation**, **Canceled**, **Refunded**, and the Free Pickup "awaiting pickup". Internal/CSV: `Created · Ask_Pending (offer waiting) · Processing · Completed · Canceling · Canceled`.

```
           ┌──── İptal talebi (≤24 h, before label) ──► Pending Cancellation ─┬► Canceled (refund 3–5 business days)
Paid ──► Preparing Package ──► Label Created ──► Shipped ──► Delivered ──► Pending Review ──► Completed
   │            │                                   │            │              (30 d or after rating)
   │            └─► (no label 7 d → support)         │            └─► Get help (protection window) ─► Refund / Return / Partial / Replacement
   └─► payment failed in show ─► (retry until show ends) ─► auto-Canceled
```

### 13.3 Order details page [WN]
Status and tracking at the top · **9-digit Order ID** · order date, expected delivery, quantity, seller, show/category · shipping address (**Shipping to**, editable while Preparing Package) · **Receipt & shipping details** (subtotal, shipping for *this* item, tax, address; the email receipt also shows card brand and last 4) · **Video Receipt** (app only, shows days left, 60 days) · VAT invoice where applicable · actions **Request cancellation** (via "Get help with this purchase"), **Get help with this purchase**, **View support request**, **Message the seller**, **Rate Purchase**, Pickup code/QR · seller drop-off photo when available · "time left for Buyer Protection" countdown.

[TR] Labels: `Sipariş No: 482917365`, `Fatura (e-Arşiv PDF)`, `Satın alma videosu (54 gün kaldı)`, `Kargo takibi`, `Bu siparişle ilgili yardım al`, `Satıcıya mesaj gönder`, `Değerlendir`. Status chips: `Hazırlanıyor · Kargo kodu oluşturuldu · Kargoda · Teslim edildi · Değerlendirme bekliyor · Tamamlandı · İptal talebi bekleniyor · İptal edildi · İade edildi`.

---

## 14. Cancellations [WN]

- Can be requested **before the seller creates a label** and **within 24 h of purchase** (if not shipped), per item, from order → **Get help with this purchase → Request cancellation** (web: "I need help with something else" → "Submit a cancellation request"). The option only appears when eligible.
- Status becomes **Pending Cancellation**. The seller has **two business days**. Approved means a full refund to the original method in 3–5 business days. Declined or no answer means the order ships.
- Bundles: only the cancelled item and its share of shipping are refunded.
- Whatnot steps in for: a **bidding technical error** (contact within **2 h** with screenshots); a **one-time exception** (no label yet, never used before; not for breaks or consumables); EU/UK 14-day withdrawal.
- Frequent requests lead to account action. **You lose the right to review an order once you have requested its cancellation**, even if declined. Orders in transit cannot be cancelled. Pre-bids cannot be cancelled.
- [TR] `İptal talep et` → reason picker (`Yanlışlıkla teklif verdim`, `Fikrimi değiştirdim`, `Teknik hata`, `Diğer`) → `Talebi gönder`. Banner: "Teklifler bağlayıcıdır; iptal satıcının onayına bağlıdır." Separate legal **Cayma hakkı** flow, see §21.6.

---

## 15. Buyer Protection, support, returns, refunds [WN]

**Covered:** not shipped or very delayed, stuck or lost in transit, damaged, missing item, wrong item, wrong size or color, not as described (description, condition, size, color, photos), defective, expired or not working, not authentic. Also: return-to-sender reshipping, postage due, incorrectly charged tax, High-Value Card Protection.
**Not covered:** changed your mind, fit or style, flaws that were disclosed, refused delivery, packages not collected from the carrier, refused customs, off-platform deals, FX losses, **chargebacks**, signature opt-out with a "not received" claim, abuse patterns.

**Windows:** the earlier of 30 days from purchase / 14 days from delivery. 7 days for Coins & Money, Sports Cards, Sneakers & Streetwear, TCG, Luxury. 2 days for Plants, Meat & Seafood, Specialty Food. Counterfeit: 30 days from receipt. Delivered-not-received: 14 days from the "delivered" scan. Disaster extensions are possible. The order page shows the time left.

**Flow:** Activity → Purchases → order → **Get help with this purchase** → choose the issue → describe and **upload photos** (counterfeit claims follow photo guides per category: sneakers, handbags, clothing) → submit.
- With **Seller Provided Support** (SPS, rolled out to all US sellers on 2026-09-01), the request goes to the seller's inbox. Updates come in the **Inbox** (filter "Purchases"). The seller must answer within **48 business hours**. Escalate to Whatnot through the **"?" icon** at the top right of the request. Otherwise Whatnot Support handles it by email: confirmation with a ticket number, reply within **48 h**. No phone support.
- Seller responses and buyer timers:
  - full refund, no return: same day;
  - full refund with return: drop off within **5 business days**; the seller has **48 h** after delivery to accept or dispute, or the refund is automatic;
  - **partial refund offer**: the buyer has **48 h**; declining means a full refund **with return**;
  - **replacement**: must ship within 48 h, otherwise the buyer may return for a full refund;
  - no-refund explanation or request for more info: the buyer can escalate.
- Missing or wrong items from breaks, surprise products or opened consumables always go to Whatnot, not the seller.
- Returns use a **prepaid label** (printer needed), the item in the same condition, within 5 business days. Refunds take 3–5 business days. Compensation above the price paid is issued as **Whatnot credit**.

[TR] Same flow and timers. Return = `İade kargo kodu` (no printer needed in Turkey). Refunds go back to the card through iyzico (2–10 business days depending on the bank; say "bankana bağlı olarak 2–10 iş günü"). Add the `Cayma hakkı` path (§21.6). Disputes: per the 2026 rules, the pre-information form must mention **arabulucu** (mediation) before consumer court, plus Tüketici Hakem Heyeti limits.

---

## 16. Ratings and reviews [WN]

- After delivery the order goes to **Pending Review**. Within **30 days**: Activity → Purchases → order → **Rate Purchase** → 1–5 stars + optional written comment. **≤ 4 stars** adds sub-ratings: **Shipping** (how fast), **Packaging** (condition), **Accuracy** (as expected).
- The order is marked Completed after rating or when the window closes. Not allowed if you requested cancellation or the order was never marked delivered.
- Profile shows the **average of all ratings** and a **total count** (incl. star-only); the **Reviews tab** lists only written reviews, newest first.
- Reviews **cannot be edited**; they can be **deleted** (⋮ → Delete), which removes the rating, and you cannot re-review.
- The seller can **reply publicly once** (no edits) or report a review.
- [TR] `Siparişini değerlendir` → `Kargo hızı · Paketleme · Ürün açıklamaya uygun mu?`. Display `⭐ 4,9 (1.284 değerlendirme)`.

---

## 17. Social features [WN]

- **Follow:** from the show header or the profile. Followers get go-live pushes, the shows appear in Followed Hosts, and they can enter follower-only giveaways. The followed person sees you in their list and may be notified. **Mutual follow = Friend.**
- **Per-seller bell** on the profile (top-right): **All Notifications / No Notifications**. Unfollow: profile → **Following** → confirm.
- **Friends** (app only): contact sync, "Suggest account to others", **Activity status** (friends see which live you are watching or hosting). Activity → Friends tab with **Online** list, **Join** and **Message**.
- **DMs:** Inbox → **Compose** → username → Start message. Also from an order (**Message the seller**) or a profile. **Group chats up to 20.** Non-connections land in **Message requests**. Mark unread, **Archive**, Block, Report. DMs can be turned off (Account Controls → Settings). No sharing contact details to move deals off-platform.
- **Share a show:** Share icon → Whatnot DM or copy link / socials. The link opens the app or the web, and its preview shows seller, title and thumbnail. Sellers only see the share count. Mass-DMing links is spam.
- **Tagging:** `@username` in chat notifies the tagged person (rate-limited).
- **Clips:** last 60 s of any live, ≥ 5 s, trim once, private by default, can be published to your profile and the seller's (if allowed), share or download. Sellers can opt out ("Clips of you").
- **Profile (public):** avatar (JPEG/PNG < 7 MB, square 1024²), banner (3:1, 1500×500), bio ≤ 1,000 characters plain text, name, **username: lowercase letters, digits, underscore, ≤ 30 characters, one change per 24 h, no pending orders**. Profile tabs (seller): **Shop** (Buy It Now / Auction filters), **Shows** (upcoming and past), **Reviews**, **Clips**; follower/following counts; ⋯ menu (Block User, Report); **Tip Me**; Premier Shop badge.
- [TR] `Takip et`, `Arkadaşlar`, `Çevrimiçi`, `Katıl`, `Mesaj`, `Mesaj istekleri`, `Arşiv`, `Paylaş`, `Bağlantıyı kopyala`, `Klip`. Username rule: `a-z 0-9 _` only (no Turkish characters ç ğ ı ö ş ü), ≤ 30.

---

## 18. Notifications, bookmarks, reminders

**Bookmark (save) [WN]:** bookmark icon on a show or product (solid = saved). Saved items go to Activity → **Saved** and you get notified when the **show goes live**, the **product goes live**, or a **saved search** gets new results. Bookmarks are anonymous; sellers only see the count. Bookmarking a show works without following the seller.
**Notification settings:** Account → **Notifications**, grouped as Buyer / Seller / General (followed users going live, recommended content, saved content, @mentions, new followers…). The app badge clears only after both DMs and bell notifications are cleared.

**Buyer push/in-app triggers to mock [WN + TR]:**
| Trigger | Turkish copy example |
|---|---|
| Followed seller goes live | "🔴 @kartdukkani canlı: Pokémon kutu açılımı" |
| Bookmarked show starting | "⏰ Kaydettiğin yayın başladı" |
| Pre-bid item pinned | "Ön teklif verdiğin ürün şimdi sahnede!" |
| Outbid (pre-show) | "Ön teklifin geçildi: ₺1.250. Tekrar teklif ver" |
| Pre-bid expired | "Yayın ertelendi, ön teklifin sona erdi" |
| Auction won | "🎉 Kazandın! ₺850 · Sipariş oluşturuldu" |
| Payment failed after win | "Ödeme başarısız. Yayın bitmeden kartını güncelle" |
| Counter-offer received | "Satıcı ₺900 karşı teklif yaptı (24 saat)" |
| Offer accepted / declined / expired | "Fiyat önerin kabul edildi" |
| Break starting | "Kırılım başlıyor, yayına dön" |
| Tagged in chat | "@ayse seni etiketledi" |
| New follower / friend | "@mehmet seni takip etmeye başladı" |
| Order shipped / out for delivery / delivered | "Siparişin kargoya verildi (Yurtiçi Kargo)" |
| Rate reminder | "Siparişini değerlendir (30 gün)" |
| Support / SPS update | "Satıcı talebine yanıt verdi" |
| Giveaway won | "🎁 Çekilişi kazandın!" |
| Referral credit / coupon expiring / Rewards tier up | "₺250 davet kredin hesabında" |
| Spend/watch reminder or limit; limit period ended | "Haftalık harcama hatırlatıcına ulaştın" |

[TR] Upcoming show cards: `Hatırlat 🔔` (= bookmark). Marketing pushes need İYS consent; transactional ones do not.

---

## 19. Safety: block, report, enforcement

- **Block** (profile ⋯ → **Block User** → confirm). The blocked user cannot follow you, find or open your profile, DM you, join, chat in or bookmark your shows, or buy from you (old orders are still honored). They are not notified. There is no blocked-users list; unblock from their profile.
- **Report** a seller (avatar top-left), a viewer (their chat avatar), a DM (⋯), a profile (⋯) or a listing (**Report Listing** at the bottom of the listing sheet; ⋯ → Report in search or profile). Email fallback: trustandsafety@. Reports are confidential. Status: Account → **User Reports** (`All · Submitted · Closed`); outcomes are not shared.
- **Removed from show** (host or mod: "Remove from show" / "Ban from live"): you cannot rejoin that show.
- **Enforcement ladder:** Warning → Feature restriction (DMs, giveaways…) → Discovery restriction (sellers) → **Temporary suspension 2 or 7 days** → Investigation suspension → Loss of selling access → **Ban**. Violations expire after **180 days**; appeals in Account Health. No ban evasion with new accounts.
- **Buyer-relevant policies:** binding bids, no disruptive or shill bidding, no bots, no fraudulent disputes, no off-platform payments, no harassment, no doxxing (no sharing other users' addresses), no unsolicited spam, no account selling. High cancellation or refund rates lead to penalties.
- **Scam education:** official mail only comes from @whatnot.com; Whatnot never asks for card details by DM or email; fake "you won, pay shipping" DMs; impersonation of buyers after they leave a live.
- [TR] `Engelle`, `Şikayet et`, `Şikayetlerim (Tümü · Gönderildi · Kapandı)`, `Yayından çıkar`. Official domain notice: "Resmi e-postalarımız yalnızca @mezatonline.com uzantılıdır."

---

## 20. Account tab (settings map) [WN, consolidated]

`View Profile / Edit Profile` · **Payments & Shipping** (payment methods, Weekly Bundling, Shipping Preferences → Allow Signature Confirmation) · **Addresses** · **Notifications** · **Account Controls** (watch time, spend, PIN, DMs, private entry, activity status) · **Verified Buyer** · **Gift Cards** · **Preferences** (Display Rewards Club Status, Clips of you, Seller Tools, Account Management → Delete Account) · **Settings** (contact sync, suggest account, activity status) · **User Reports** · **Contact Us** (Account → Update Account Information → Update Phone Number; buyers change phone numbers through support) · change email and password · account switcher (iOS) · Apply to sell.
**Delete account:** needs no open orders (all Completed) and no positive seller balance. Delete Account → reason → **Permanently Delete Account** → confirm (the app redirects to the web).

[TR] `Profili görüntüle · Ödeme ve Kargo · Adreslerim · Bildirimler · Hesap Kontrolleri · Doğrulanmış Alıcı · Tercihler · Şikayetlerim · Bize Ulaş · Satıcı ol · Çıkış yap · Hesabı sil`. Add `Fatura bilgileri` and `KVKK & İzinler` (consent toggles: İYS SMS / e-posta / arama).

---

## 21. Turkey localization (consolidated)

### 21.1 Currency, numbers, dates
- Only TRY. Format with `Intl.NumberFormat('tr-TR',{style:'currency',currency:'TRY',maximumFractionDigits:0})` → `₺1.250`. In receipts show 2 decimals: `₺1.250,00`. Thousands use dots and decimals use commas. Compact counts: `1,2B` (bin), `3,4Mn`.
- Bids are whole lira only.
- Time zone **Europe/Istanbul** (UTC+3, no DST). 24-hour clock. Relative dates: `Bugün 21:00`, `Yarın 20:30`, `Cmt 19:00`.
- Planning factor used for converting Whatnot $ thresholds: **$1 ≈ ₺45**, rounded and adjusted down for purchasing power.

### 21.2 Payments (iyzico-like)
- Card form: card number, `AA/YY`, CVC, name on card. **3D Secure** when a card is saved (with a ₺1 or ₺250 ön provizyon that is voided). The saved token is then charged automatically for auction wins (merchant-initiated; agree non-3DS charges with the PSP, or 3DS on win with a fallback "ödemeyi tamamla" link before the show ends, mirroring Whatnot's "fix payment until show ends").
- Show card brand and last 4 (`Bonus •••• 4242`, `Troy`, `Visa`, `Mastercard`).
- **Taksit = Turkey's BNPL.** Offer `Taksit seçenekleri (2–12)` **only for Hemen Al / BIN**, never auctions or tips (mirrors Whatnot's BNPL restriction). Respect BDDK category limits (for example no installments on gold and jewellery, limits on phones and electronics). Mock bank tables (Bonus, World, Maximum, Axess, CardFinans, Paraf).
- Optional wallets: Masterpass / BKM Express / Papara / Apple Pay / Google Pay where available.
- Escrow-style marketplace payment (iyzico Marketplace / PayTR Marketplace): money is held until delivery or the review window, then paid to the seller (matches Whatnot's protection model).
- Application order kept: Kupon → Promosyon kredisi → (Hediye kartı) → Kart.

### 21.3 KDV and invoices
- Turkish price-display rules require **tax-inclusive prices**: every price, bid and shipping fee is **KDV dahil**. The receipt shows `Ürün tutarı (KDV dahil) · Kargo (KDV dahil) · İndirim · Toplam` and optionally a `KDV %20` breakdown line (20% standard; 10% / 1% for some categories).
- Invoices: **e-Arşiv fatura** issued by the seller (if a merchant) for the item, and by the platform for its fees. Make it downloadable in order details (`Faturayı görüntüle`), the equivalent of Whatnot's VAT invoice.
- Billing profile: `Bireysel` (Ad Soyad, TCKN optional; use `11111111111` when not provided) or `Kurumsal` (Firma unvanı, Vergi dairesi, Vergi no). Checkbox "Fatura adresim teslimat adresiyle aynı".

### 21.4 Addresses
Form: `Adres başlığı (Ev/İş)` · `Ad Soyad` · `Telefon (+90 5XX XXX XX XX)` · `İl` (81, dropdown) → `İlçe` (dependent) → `Mahalle` (dependent) · `Açık adres` (Cadde/Sokak, Bina No, Kat, Daire No) · `Posta kodu` (5 digits, optional, auto-filled from mahalle) · `Varsayılan adres` toggle. Address line on labels: `Mahalle, Sokak No:Daire, İlçe/İl`. Mock seed: a few il/ilçe/mahalle sets (İstanbul/Kadıköy/Caferağa, Ankara/Çankaya/Kızılay, İzmir/Karşıyaka/Bostanlı, Bursa/Nilüfer/Görükle, Antalya/Muratpaşa/Lara).

### 21.5 Cargo
See §12.5 (Yurtiçi, Aras, MNG, PTT, Sürat, HepsiJet; desi pricing; gönderi kodu; status copy; 2 iş günü ship-by; elden teslim).

### 21.6 Consumer law (needs legal review before launch)
- **6502 sayılı TKHK + Mesafeli Sözleşmeler Yönetmeliği** apply to **B2C** sales by merchant sellers: before the first purchase the buyer must confirm the **Ön Bilgilendirme Formu** and **Mesafeli Satış Sözleşmesi**. Implement as a one-time checkbox at first bid or purchase, plus a per-order PDF.
- **Cayma hakkı: 14 days from delivery, no reason needed**, and the **seller pays return shipping** when its contracted carrier is used. Unlike EU law, Turkish law has no clear auction exception, so Whatnot's "all sales final" cannot simply be copied for merchant sellers. Add an order action `Cayma hakkını kullan` (like Whatnot's EU "Withdraw and return item"), with category exceptions (opened hygiene and cosmetic items, perishables, personalized items, sealed software or media once opened, price-volatile goods such as gold or bullion; the 2026 amendment brought phones, smartwatches and computers back inside cayma). C2C sales between individuals fall outside 6502; mark listings `Bireysel satıcı` vs `Kurumsal satıcı`.
- From 2026-01-01 the pre-information form must mention **arabuluculuk** (mediation) before consumer court. Maximum delivery time under the law is 30 days.
- **KVKK** (Aydınlatma + Açık Rıza), **İYS** for commercial messages, **ETBİS** registration, and e-commerce law 6563 duties for intermediary service providers.

### 21.7 Giveaways and chance mechanics (high risk)
- **Çekiliş** (prize draws, including free social-media giveaways) need **Milli Piyango İdaresi** permission; running one without permission is a criminal offence (3–6 years plus judicial fines were cited publicly; MPİ filed complaints over 286 unauthorized draws in 2024). Options: obtain platform-level permission, or redesign as non-random rewards. Keep the mock UI but put a "Yasal uyarı" placeholder in the giveaway rules sheet.
- Breaks with random team assignment, Surprise Sets and Party Purchase giveaway milestones involve chance and may count as **şans oyunu**. Whatnot itself bans raffles, wheels and purchase-based prizes. Mirror those bans and get legal advice.

### 21.8 Copy glossary (EN → TR)
| Whatnot | Mezatonline |
|---|---|
| Bid / Swipe to bid | Teklif ver / Kaydır, teklif ver |
| Custom | Özel |
| Max Bid | Maks. teklif |
| Pre-bid | Ön teklif |
| Winning / Outbid / Won / Lost | Öndesin / Teklifin geçildi / Kazandın / Kaybettin |
| Sudden Death 💀 | Ani Bitiş 💀 |
| Starting bid | Açılış fiyatı |
| Sold / Unsold | Satıldı / Satılmadı |
| Buy It Now | Hemen Al |
| Make Offer / Offer | Fiyat Öner (avoid "Teklif" so it is not confused with bids) |
| Counter offer | Karşı teklif |
| Flash Sale | Flaş İndirim |
| Giveaway / Enter Giveaway | Çekiliş / Çekilişe katıl |
| Follower-Only / Buyer Appreciation | Takipçilere özel / Alıcılara teşekkür |
| Break / Spot | Kırılım (Break) / Slot |
| Surprise Set | Sürpriz Set |
| Party Purchase | Ortak Alım |
| Tip / Tip Me | Bahşiş / Bahşiş gönder |
| Community Boost / Booster | Yayını Öne Çıkar / Destekçi |
| Shop / Live Shop / Profile Shop | Mağaza / Yayın Mağazası / Profil Mağazası |
| Wallet | Cüzdan |
| Activity / Purchases / Bids / Offers / Saved | Aktivite / Siparişlerim / Ön Tekliflerim / Fiyat Önerilerim / Kaydedilenler |
| Bookmark / Save this Search | Kaydet / Bu aramayı kaydet |
| Follow / Following / Friends | Takip et / Takip ediliyor / Arkadaşlar |
| For You / Followed Hosts | Senin İçin / Takip Ettiklerin |
| Pinned | Sahnede |
| Shipping / Free shipping / Reduced shipping | Kargo / Ücretsiz kargo / İndirimli kargo |
| Smart Bundling / Weekly Bundling | Akıllı Paketleme / Haftalık Birleştirme |
| Free Pickup / Pickup Code | Elden Teslim / Teslim kodu |
| Preparing Package / Label Created / Shipped / Pending Review / Completed | Hazırlanıyor / Kargo kodu oluşturuldu / Kargoda / Değerlendirme bekliyor / Tamamlandı |
| Get help with this purchase | Bu siparişle ilgili yardım al |
| Request cancellation | İptal talep et |
| Buyer Protection | Alıcı Koruması |
| Rate Purchase | Değerlendir |
| Video Receipt | Satın alma videosu |
| Verified Buyer / Get Verified / Authorize | Doğrulanmış Alıcı / Doğrulan / Onayla |
| Account Controls | Hesap Kontrolleri |
| Rewards Hub / Challenges / Points Shop | Ödüller / Görevler / Puan Mağazası |
| Rewards Club (Bronze…Diamond) | Sadakat Kulübü (Bronz, Gümüş, Altın, Platin, Elmas) |
| Referral | Arkadaşını davet et |
| Premier Shop | Seçkin Mağaza |
| Block / Report / Remove from show | Engelle / Şikayet et / Yayından çıkar |

---

## 22. Implementation notes for the mock build [TR]

- **Server-authoritative auction engine** (in mock form, `src/features/live/engine.ts` + bots): states `idle → pinned → running → sold|unsold`. Store `startPrice, current, leaderId, bids[], maxBids{userId:cap,ts}, endsAt, suddenDeath, counterBidTime`. Apply §4.2 proxy and §5 extension rules. Lock at `endsAt` and create the order.
- **Bots** should cover: early bidder, sniper (bids in the last 2 s to show extensions), max-bid holder (to show proxy jumps), chat questions ("Kargo ne kadar?", "Orijinal mi?"), occasional tips and reactions, a giveaway entrant crowd.
- **One pinned item at a time.** Starting an auction auto-pins it. A giveaway shows at the top, separately. No new pin while an auction runs.
- **No cart.** Each win or BIN creates an Order with `shippingCharged` computed from the show's package for that buyer (per-show desi bundling, §12.5).
- **Mock entities:** User (username rules, verified flag, spend/watch limits, points, referral), Seller (rating avg/count, followers, premier flag, rewards club, free-shipping or cap setting, carrier), Show (status scheduled/live/ended, category, thumbnail 9:16, viewers, bookmarks, verifiedOnly, preBidsDisabled), Listing (format auction/bin/giveaway, startPrice/price, qty, variants, offersEnabled, flashSale, reservedForLive, shippingProfile desi), Bid/MaxBid/PreBid (status), Offer (status, expiresAt, counter), Order (status machine §13.2, carrier, kargo kodu, tracking events, receipt lines KDV dahil, videoReceiptExpiresAt, protectionDeadline), Coupon, Credit, Review (stars + sub-ratings), Notification, DM thread, Report.
- **Haptics:** a light haptic on a successful swipe, a heavier one on outbid and win (expo-haptics).
- **Default demo values:** start ₺1–₺50 for "ucuz mezat" shows; card shows ₺100–₺5.000; sneakers ₺2.500–₺15.000; auction 15 s with 10 s counter time; one sudden-death round per show; giveaway every ~10 min of mock time (3 min draw).

## 23. Open items (not verifiable from accessible sources)
1. Exact Whatnot bid-increment table (§6 is a proposal).
2. The default Counter Bid Time and full list of options (§5 proposal).
3. Exact pixel layout and icon order of the live screen and the exact "sold"/winner banner (§2 is inferred).
4. Exact tip preset amounts (Whatnot only says "choose a tip amount").
5. Whether proxy (max-bid) auto-bids in the final 10 s extend the timer (assumed yes).
6. Turkish legal treatment of live auctions (cayma hakkı), çekiliş and random breaks: needs a lawyer.

---

### Key sources
- Whatnot Help Center (full corpus via `https://help.whatnot.com/api/v2/help_center/en-us/articles.json`). Main articles: Bid on an item during a show (14932924544141); Pre-bid (14933026908301); How to buy (360061194792); Make an offer (4407216260493); Start an auction (9779931101837); Create product listings (9779149424269); Run a Flash Sale (32761422601869); Pinning (47956550101645); Party Purchase (47808284488973); Enter a Giveaway (13177624401165); About Giveaways (11329417780365); Tip a seller (15100673573005); Tips T&C (15503013555085); Community Boost (30706194092045); Payment methods (37362516423053); Fix a payment issue (37362462405261); BNPL (17151383107725); Coupons (16111227728653); Coupon Drops T&C (49307115521037); First-Time Buyer Coupons (17920065866381); Buyer Referral (4407952429581); Gift Cards (49004562202765); Points (42612765832205); Rewards Club (46336632029709); Verified Buyer (4967789710221); Account Controls (41633425532557); Shipping US/UK/DE (16369289657741, 21559276628621, 21927521730317); Troubleshoot shipping costs (13889209206925); Smart Bundling (16285911553677); Weekly Bundling (36574693132173); Free Pickup (26310028168333); Track your order (360061605391); Delayed/missing (38788419229965); Signature confirmation (43853565000845); Activity (48286460264461); Order details (19289702460813); Receipt (39455712292749); Video receipt (38489439584909); Purchase history (12678684960909); Cancel (360061605451); Get help (38113709695501); Seller Provided Support (26528075446541); Buyer Protection (360061194552); High-Value Card Protection (5522583677837); Rate your purchase (360061605331); Seller ratings (26543966203405); Follow (48062745622669); Friends (12791941690253); DMs (6591676701325); Share (48071282071949); Tagging (8441403568269); Clips (9535359092749); Bookmark (9780885421069); Notifications (9429224729101); Block (9816865522317); Report (5380381014925); What Actions We Take (5380505120269); Community Guidelines (360061197472); Gambling policy (4410443596813); Teens (27689602370317); Profile (7937283893005); Discoverability (12190921464461); Seller Leaderboards (44918704243469); Premier Shop (31084236928909).
- Whatnot blog (blog.teamwhatnot.com/unitedstates/): faster-auctions-growth (timer data, 7 s timer), tools-for-discovery-and-demand (pre-bid expirations), new-tools-from-discovery-to-delivery (Bids tab, signature ≥ $500), new-tools-to-understand-and-engage-your-audience (Points, Jumbotrons, outbid notifications), capture-buyer-intent-and-drive-sales (BIN stats), flashsales, ftbfreeshipping, auctions-and-video-listings, taking-on-shill-bidding.
- Whatnot Engineering, "Peeking Behind the Curtain of Secret Max Bid" (medium.com/whatnot-engineering): 10 s reset rule, sudden death, privacy of max bids.
- App Store listing (apps.apple.com/us/app/…/id1488269261): 4.7★ from about 1.1M ratings, age 13+.
- Turkey: MPİ çekiliş permission (eleman.net, ekonomist.com.tr, isbank.com.tr blog); Mesafeli Sözleşmeler 2026 amendment (benguturk.com / AA, cnnturk.com); 2026 desi price benchmarks (parasut.com Trendyol tariffs, karekod.org HepsiBurada tariffs).
