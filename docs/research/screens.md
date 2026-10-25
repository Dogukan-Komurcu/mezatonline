# Whatnot App: Screen Inventory and Visual Layout Spec (for the Mezatonline clone)

Researched 2026-10-26. Target: Expo SDK 58 / React Native clone, Turkish copy, ₺ (TRY), mock data first.
The spec is written in English. Turkish copy suggestions are given inline as `TR:`.

---

## 0. Sources and confidence tags

The tag after an item says how sure we are about it:

- **[V]** Seen directly in a real Whatnot screenshot: App Store or Play Store images (2026 set), help-center article screenshots (2025–2026) or Lazyweb captures (Jan/May 2026). Treat these as ground truth.
- **[H]** Taken from the text of a help-center article (all 300 articles were pulled through the Zendesk API `help.whatnot.com/api/v2/help_center/en-us/articles.json`). The label and behaviour are reliable. The exact pixel layout is inferred.
- **[W]** Taken from whatnot.com web HTML or CSS (Wayback captures of /browse, /tag/trading_card_games, /user/*, /listing/*) or from the web i18n catalog embedded in the pages (about 6,700 strings). Web labels normally match the app labels.
- **[I]** Inferred from Whatnot conventions or common patterns. Build it this way unless new evidence turns up.

whatnot.com HTML is behind a Cloudflare challenge (HTTP 403 for curl and WebFetch). Static assets under `/cdn/assets/...` are NOT blocked, and Wayback (`web.archive.org/web/2026id_/...`) works.

Corrections to the "known facts" in the task brief:
- The category link under a show card is **blue `#005AE1`** (token `system-blue`), not purple [W][V].
- In the 2026 app, the right-side icons on the live screen are **More (…), Boost, Clip, Share (with count badge), Wallet, Shop (with item-count badge or product thumbnail)** [V]. The "Mute" icon only appears in older marketing shots. There is no permanent giveaway icon: a giveaway shows up as a card at the top of the screen [H].
- The bottom tab bar is **Home · Categories · Sell (+) · Activity · Account**. For approved sellers the middle tab becomes **Seller Hub** with a 2×2 grid icon [V].

---

## 1. Global design system

### 1.1 Color tokens [W] (taken from whatnot.com CSS `--color-*`)
| Token | Hex | Use |
|---|---|---|
| brand-yellow / primary-yellow-default | `#FFE414` | Primary buttons (Bid, Buy Now, Follow, Pre-Bid, Save), selected chip fill, brand |
| primary-yellow-lightest | `#FFF7B9` | Disabled yellow button (e.g. greyed "Update"), soft highlights |
| primary-yellow-darkest | `#A59200` | Yellow text on light backgrounds |
| tertiary-red | `#EF233C` | "Live • N" badge, viewer-count icon circle, red unread dots |
| system-dark-red | `#CE291A` | Destructive ("Request cancellation" button), error text |
| system-blue | `#005AE1` | Category link on cards, text links ("See More", "Learn More", "How Max Bid Works", "From: seller") |
| system-green | `#009E52` | Positive money ("$1,310" sales, "tipped $5!", "boosted $10", toggle-on), "Winning!" |
| system-orange | `#EF6A1F` | Progress-bar gradient end (order progress, challenges, boost) |
| neutrals-900 | `#1C1C1C` (alt `#121212`) | Primary text, dark buttons ("Rate Purchase", "Join Live"), dark-mode background |
| neutrals-800 | `#2D2D2D` / `#282527` | Dark surfaces, dark-mode cards |
| neutrals-700 | `#545454` / `#343434` | |
| neutrals-500 | `#7F7F7F` / `#6A6A6A` | Secondary text |
| neutrals-300 | `#BBB` / `#AAA` | Disabled text |
| neutrals-100 | `#DDD` / `#D2D2D2` | Dividers |
| neutrals-50 | `#F5F5F5` / `#E3E3E3` | Grey chip fill, grey row-icon circle, category tile background |
| neutrals-0 | `#FFFFFF` | Surfaces |
| black-5 … black-80 | `#0000000D` … `#000000B3` | Overlays. Show cards use a top gradient `black/60 → transparent at 30%`, subcategory tiles use `black/50` |
| white-10 … white-80 | | Translucent pills on top of video |

The app follows the system light/dark theme. Home, Activity and Order Detail all exist in dark mode [V]. The **live player, onboarding and sign-up are always dark** [V].

### 1.2 Typography [W]
- Body font: `system-ui` (SF Pro on iOS, Roboto on Android). Headlines and marketing use **"Whatnot Sans"** (a rounded geometric sans). In RN use the system font; use a heavy rounded font such as *Nunito Black* or *Rubik Bold* only for marketing and empty-state headings.
- Type scale (px, line-height): display1 32/36 · display2 24/32 · title1 18/24 · title2 16/20 · body1 14/20 · body2 13/18 · caption1 12/16 · caption2 10 · `text-100` 11/13 (badge text). Weights: 400, 600, 700.
- On-screen app text measured from screenshots runs 1–2 px larger than web: card title ≈15 semibold, username ≈15 semibold, meta ≈13, screen titles ≈28 bold ("Activity").

### 1.3 Shape and spacing [W][V]
- Radii: 2, 4 (live badge), 8 (card image, thumbnails), 12 (tiles, sheets content cards), 16 (sheet top corners, product card on live), 24, full (pills, buttons, avatars).
- Aspect ratios: **show-card cover 3:4** (`--aspect-vertical-video-sm`), subcategory tile 2:1, full live video 9:16, show thumbnail upload 9:16 at 1080×1920, profile banner 3:1 at 1500×500, avatar 1:1.
- Screen gutter 16. Grid gap 12. Feed grid has 2 columns.
- Avatar sizes: 24 (card header), 32–36 (chat, list rows), 40 (live header), 56 (account header), 96 (profile).

### 1.4 Reusable components
| Component | Spec |
|---|---|
| **Pill button – primary** [V] | Yellow `#FFE414`, black text, semibold 16, height 48–52 (sheet CTA) or 32 (inline). Full radius. Disabled = `#FFF7B9` + grey text. |
| **Pill button – dark** [V] | `#1C1C1C`, white text ("Rate Purchase", "Join Live", "Boost Show", "Send Tip", "Continue with Affirm"). |
| **Pill button – grey** [V] | `#F0F0F0` (light) or `white/15` (on video), black or white text ("Learn More", "Get help", "Add New", "Retry Payment", "Join", "Message"). |
| **Pill button – outline** [V] | 1 px grey border ("Cancel", "Save Show (4)", "Find Friends"). |
| **Follow pill** [V] | Small yellow pill, h≈22–24, px 10, 12–13 semibold black "Follow". Becomes grey "Following" (a tap opens a confirm). |
| **Filter chip** [V] | h 32–36, radius full (or 8), grey `#F0F0F0` fill, black 14–15 medium. **Selected = `#1C1C1C`/`#333` fill + white text** ("All", "Recommended", "Live Now"). Optional trailing ⌄ for dropdowns ("Sort ⌄", "Buy Format ⌄", "Newest ⌄"). Optional leading icon ("Filter" with sliders icon). |
| **Underline tabs** [V] | Text tabs 17–18 medium. Active = black + 3 px black underline under the text width. Inactive = grey `#8A8A8A`. Used in Activity, Search results, Rewards Hub, Profile, viewers sheet. |
| **Live badge** [V][W] | Red `#EF233C`, radius 4, px 8 py 2, white 11–13 semibold, text **"Live • 436"** (app) / "Live · 648" (web). Placed 12 px from top-left of the cover. TR: `CANLI • 436`. |
| **Viewer pill (on video)** [V] | Dark translucent pill containing a red circle with a white "signal bars" icon (3 vertical bars) and a white count "789". TR count format: `1,2B` for 1.2K. |
| **Viewers metric (tiles)** [V] | Small red filled circle (≈16 px) with white bars icon + grey "2.3K Viewers". TR: `2,3B izleyici`. |
| **Row with icon circle** [V] | 40 px light-grey circle with a 20 px line icon, title 16 semibold, optional grey subtitle 14, trailing chevron › or external-link icon. Used in Account, Order detail, Wallet. |
| **Bottom sheet** [V] | White (or dark on live), top radius 16, grab handle 36×4 grey, centered title 17 semibold, optional ✕ top-right. |
| **Center modal** [V] | White card, radius 16, title 17 bold centered, body 14 centered, stacked full-width pill buttons (red / grey / outline). |
| **Toast** [I] | Dark pill at top, white text ("Bid Confirmed!", "Copied", "Message sent!"). |
| **Coachmark** [V] | White rounded tooltip with a pointer, bold lead-in + regular text ("**Tap to watch** your first live show and start shopping"). The target gets a 3 px yellow border and the rest is dimmed. |

### 1.5 Iconography (map to `lucide-react-native` or similar) [V]
home (house; filled when active) · categories (search magnifier) · sell (plus-in-circle) · seller hub (layout-grid 2×2) · activity (message-circle-heart; filled when active) · account (user avatar; fallback user-circle) · inbox (message-square-text) · notifications (bell, with red dot) · rewards (gift; yellow-on-black circle in light mode, black-on-yellow in dark mode) · viewers (bar-chart / signal bars on red) · more (more-horizontal) · boost (bolt-in-circle or "bills" glyph) · clip (clapperboard) · share (upload / arrow-up-from-box) · wallet (credit-card) · shop (store) · crown (Rewards Club, yellow rounded square) · minimize (chevron-down in a dark circle) · close (x in a dark circle) · bookmark · truck (ship time) · star · pin · skull 💀 (sudden death) · shield-W (buyer protection).

---

## 2. Navigation map (Expo Router suggestion)

```
(auth)/welcome → signup-email | login → verify-phone → verify-code → create-username
(onboarding)/gender → interests → follow-sellers → notifications-permission   (then coachmarks on Home)
(tabs)/
   home            (S11)  → live/[id] (S20) | show/[id] upcoming (S40) | user/[username] (S50) | category/[slug] (S13)
   categories      (S12)  → category/[slug] (S13) → top-sellers/[slug] (S14); search (S15)
   sell | seller-hub (S80/S81) → schedule-show (S82) | create-product (S83) | go-live (S85)
   activity        (S60)  → order/[id] (S61) …
   account         (S70)  → payments-shipping, addresses, notifications-settings, preferences, …
modal: inbox (S67), notifications (S66), rewards (S68), listing/[id] (S41), search (S15)
```
The live player is a full-screen modal stack with a vertical swipe to the next or previous show [I]. The chevron-down minimizes it to picture-in-picture [I].

---

## 3. Auth and onboarding

### S01 Splash [V]
Dark olive or black background (`#2B2B1E` to `#1C1C1C`). Small yellow rounded-square "W" logo near the top, a large dark "W" glyph in the center. Fades into S02.

### S02 Sign up / Welcome: "Sign up for Whatnot" [V]
- Background `#1E1E1E`. Small yellow logo at top center (≈56 px rounded square).
- Title **"Sign up for Whatnot"** (white, 28–32 semibold, centered). TR: `Mezatonline'a Kaydol`.
- Four full-width **outlined** buttons (h 56, radius 10–12, 1 px `white/25` border, white 16 semibold, left-aligned brand icon):
  1. "Continue with Google" 2. "Continue with Facebook" 3. "Continue with Apple" 4. "Continue with Email" (envelope icon).
  TR: `Google ile devam et`, `Facebook ile devam et`, `Apple ile devam et`, `E-posta ile devam et`.
  The web catalog also has "Continue with Passkey" [W] (optional).
- Bottom: grey "Already have an account?" (TR `Zaten hesabın var mı?`), then a full-width **grey pill "Log In"** (`#5A5A5A` bg, white text). TR `Giriş Yap`.
- Legal footer 13 grey: "By continuing, you agree to our <u>Terms of Service</u> and <u>Privacy Policy</u>". TR: `Devam ederek Kullanım Koşulları'nı ve Gizlilik Politikası'nı kabul etmiş olursun.` (KVKK: add the `Aydınlatma Metni` link).

### S03 Email sign-up / Log in [W]
- Sign up: "Email", "Password" (min length shown on error: "Password must be at least {min} characters long"), checkbox "I am at least 18 years of age", Terms checkbox ("You must agree to the Terms of Service and Privacy Policy"), CTA "Sign Up".
- Log in: header "Welcome back to Whatnot", field "Email or username", "Password", link "Forgot your password?", CTA "Log in", footer "Don't have an account? Sign up".
- TR: `Tekrar hoş geldin`, `E-posta veya kullanıcı adı`, `Şifre`, `Şifreni mi unuttun?`, `18 yaşından büyüğüm`.

### S04 Finish Signup: verify phone [V]
- Nav bar: ✕ (left), title **"Finish Signup"** (TR `Kaydı Tamamla`).
- H1 **"Verify your phone number"** (24 bold white). Sub: "To keep our community secure and trustworthy, we verify every new account." (TR `Topluluğumuzu güvende tutmak için her yeni hesabı doğruluyoruz.`)
- One outlined input row: flag + "+1 ⌄" country picker │ "Phone Number*" (floating label; asterisk red). TR default `🇹🇷 +90`.
- Bottom CTA (disabled grey until valid): **"Send Code"** (TR `Kod Gönder`). Number pad keyboard.
- Next screen [W]: "Enter the code that was sent to {phone_number}", 6-digit code, "Didn't get it? Resend code.", "Use phone call for code", CTA "Verify code". TR: `{telefon} numarasına gönderilen kodu gir`, `Kodu tekrar gönder`.

### S05 Create username [W]
"Create your username". Helper: "Choose a username that helps buyers understand what you sell and is easy to remember." Rules [H]: lowercase letters, numbers and `_` only, max 30 characters, no spaces. Error: "Invalid username format. Don't use spaces or special characters." CTA "Continue". TR: `Kullanıcı adını oluştur`.

### S06 Interest picker (onboarding) [V-partial via Lazyweb text, W strings]
A sequence of full-screen dark steps, each with a progress indicator (thin segmented bar at top [I]), a "Skip for now" link top-right [W] and a bottom yellow CTA "Continue":
1. **"What's your gender?"**: three large selectable rows or pills: Female · Male · Non-Binary (used to tailor category suggestions). TR: `Cinsiyetin?` → Kadın · Erkek · Belirtmek istemiyorum.
2. **Category picker**: heading "Pick a couple to get started" [W] (TR `Başlamak için birkaç tane seç`). A **3-column grid of category tiles**, same tile as S12: label top-left plus a 3D object image. Selected tile = yellow `#FFE414` background + 2 px black border + check. "Continue" is enabled after at least 2 picks. Optional "Pick for me" link [W].
3. **Suggested sellers to follow**: list rows with avatar, username, category or viewer meta and a yellow "Follow" pill (becomes "Following"). A header action **"Follow all"**. Bottom "Continue" [Lazyweb].
4. **Notifications pre-prompt**: illustration, copy like "Look out for a notification" / "Get notified when your favorite sellers go live", buttons "Turn on notifications" (yellow) and "Not now" (text). Then the OS permission dialog [Lazyweb][W].
5. Lands on Home with **coachmarks** [V]:
   - A tooltip above the first show card: "**Tap to watch** your first live show and start shopping"; the card gets a yellow 3 px outline and the rest of the screen dims.
   - An optional full-screen tutorial overlay: centered phone mockup with a hand-drawn white arrow and yellow sparkle strokes, title "Tap on a show to start shopping", bottom white pill **"Got It"** (black text).
   TR: `Bir yayına dokun ve alışverişe başla`, `Anladım`.

---

## 4. Main tabs

### S10 Bottom tab bar [V]
- Height ≈ 83 incl. home indicator. Background white (dark: `#121212`) with a 1 px top hairline.
- 5 items with an icon (26 px) and a label below (11–12 medium). **Active** = black, filled icon, label semibold. **Inactive** = grey `#6B6B6B`, outline icon.
  1. **Home**: house. TR `Ana Sayfa`
  2. **Categories**: magnifying glass (this tab also hosts search). TR `Keşfet` or `Kategoriler`
  3. **Sell** (buyer, plus-in-circle) / **Seller Hub** (approved seller, 2×2 grid). A red dot badge shows when there are tasks. TR `Sat` / `Satıcı Paneli`
  4. **Activity**: speech bubble containing a heart. Badge when there are unread DMs or orders. TR `Aktivite`
  5. **Account**: the user's avatar in a circle (generic person-circle when none). TR `Hesap`
- Older app versions used Home · Browse · Seller Hub · Purchases · Account [V], so Activity replaced Purchases.

### S11 Home feed [V]
Top to bottom:
1. **Header row** (h 56, px 16): search field pill (flex 1, h 44, radius full, 1 px grey border `#D0D0D0`, magnifier icon + placeholder **"Search Whatnot"**, TR `Mezatonline'da ara`). Then three 28 px icons with 16 px gaps: **Inbox** (message-square-text; red dot when unread) → S67, **Bell** (red dot) → S66, **Gift** (40 px black circle with a yellow gift outline; in dark mode a yellow circle with a black gift) → S68 Rewards Hub.
2. **Category chip row (horizontal scroll)**: big square tiles ≈ 104×112, radius 12, gap 8:
   - Label at the top, centered, 2 lines max, 15 medium. A 3D object image (≈60 px) below it.
   - Tile backgrounds are soft per-category gradients (cream, grey, lavender, mint) with a light inner border.
   - Tile 1: **"For You"**, yellow `#FFE414` background with the user's avatar in a circle. **Selected state = yellow fill + 2.5 px black border + 2 px inner white ring.**
   - Tile 2: **"Followed Hosts"** with a 3D yellow heart. Then the user's followed or suggested categories ("Sneakers & Streetwear", "Toys", "Bags & Accessories", "Food & Drink", "Electronics", "Everyday Electronics" …).
   - Last tile: **"See All Categories"** (white background, collage image) → S12.
   - **Compact state** (after scrolling or for some users): text-only chips h≈46, radius 10, the same gradient backgrounds, selected = yellow + black border ("Music", "Vinyl Records", "Food & Drink").
   - TR: `Sana Özel`, `Takip Ettiklerin`, `Tüm Kategoriler`.
   - Older variant [V]: a text tab row "⊞ For You | Following | Sports Cards | Men's …" with a black underline.
3. **Feed** for the selected chip: a **2-column grid of Show Cards** (gutter 16, gap 12, row gap ≈20).
4. **Interleaved sections**, full width, separated by an 8 px `#EFEFEF` band:
   - **"Top Seller Leaderboard"** with subtitle "Live now in {category}", a 3D trophy icon on the left and **"See More ›"** on the right. A horizontal carousel of cards (≈190 wide, grey `#F2F2F2`, radius 16): a gradient top (gold for #1, silver for #2), a rank medal ①②③ over a 64 px avatar, username 17 semibold, "🔴 56 Viewers", and a full-width dark pill **"Join Live"**. TR `En İyi Satıcılar`, `{kategori} kategorisinde şu an canlı`, `Canlıya Katıl`.
   - [I] Further sections seen in Whatnot builds: "Upcoming" or "Coming Up" shows (cards with a dark date badge "Today 7:00 PM" / "Tomorrow 3:00 PM" [W]), "Breaking Now" (💥 [W]), "Recommended Friends" [W], "Products" / product carousels.
5. Older builds have a floating segmented control at the bottom center, **"Shows | Products"**: a black capsule, the active segment is a white or black inverted pill [V]. Use it on category feeds (S13).

**Show Card (live)** [V][W]:
```
[24px avatar] username (15 semibold, 1 line, truncate)          ← row height 36
┌──────────────────────────────┐  cover 3:4, radius 8–12, object-fit cover
│[Live • 436]          [🔖]?   │  red badge top-left (12px inset); bookmark only on upcoming
│  (top gradient black/60→0)   │
│ …optional overlays:          │
│ [Free Shipping] bottom-left white label, black 13 medium, radius 6
│ [<< Bid: £1 >>] yellow strip across the bottom (current auction teaser)
│ [Pick Your Team] purple (#7B4DFF) banner bottom-left (break format)
└──────────────────────────────┘
Title, 2 lines max, 15 semibold (emoji-rich, often starts with a flag 🇺🇸)
Category (blue #005AE1, 13 semibold) • tags (grey 13, truncated), e.g. "Sports Cards • Hobby, Case…"
```
- Upcoming variant: the badge is a dark translucent "Tomorrow 3:00 PM", with a bookmark icon top-right and a save count.
- Boosted variant: subtitle under the username "Boosted by Viewers" (grey 13) and a 2 px yellow border on the cover [V]. Sponsored variant: a "Sponsored" label [W].
- Tap the cover or title → S20 Live (or S40 if upcoming). Tap the avatar or username → S50. Tap the category → S13.
- Long-press [I]: Save show, Not interested, Share.

### S12 Categories (Browse) [V]
- Header: full-width search pill **"Search"** (h 48). Tapping it opens S15.
- Segmented chips: **"Recommended"** (selected, dark `#333` fill, white text), **"Popular"**, **"A - Z"**. TR `Önerilen`, `Popüler`, `A - Z`.
- A **3-column grid of category tiles** (gap 8, tile ≈ 110×168, radius 12, bg `#F2F2F2`; dark mode `#1E1E1E`):
  - Label top-left, 2 lines, 15 semibold black. A 3D product image centered (≈90 px). Bottom-left "🔴 2.3K Viewers" (red circle bars icon + grey 13).
- Category order (Recommended, web Jan 2026) [W]: Trading Card Games, Sports Cards, Women's Fashion, Toys & Hobbies, Men's Fashion, Sneakers & Shoes, Coins & Money, Food & Drink, Bags & Accessories, Electronics, Home & Garden, **and Whatnot** (misc; shows the brand "W" coin), Books & Movies, Estate Sales & Storage Units, Sports Memorabilia, Beauty, Jewelry, Music, Video Games, Antiques & Vintage Decor, Rocks & Crystals, Baby & Kids, Arts & Handmade, Comics, Knives & Hunting, Wholesale, Outdoors, Anime & Manga, Sporting Goods, Pets, Vintage, Watches.
- Proposed Turkish category set (adapted to the TR market): Koleksiyon Kartları (TCG) · Spor Kartları · Kadın Giyim · Oyuncak & Hobi · Erkek Giyim · Sneaker & Ayakkabı · Nümismatik (Para & Madeni Para) · Yiyecek & İçecek · Çanta & Aksesuar · Elektronik · Ev & Bahçe · Kitap & Film · Müzayede & Depo Çıkışı · Spor Hatıraları (forma, imzalı) · Kozmetik & Bakım · Takı & Mücevher · Müzik & Plak · Video Oyunları · Antika & Vintage Dekor · Taş & Kristal · Bebek & Çocuk · El Sanatları · Çizgi Roman · Bıçak & Av · Toptan Fırsatlar · Outdoor & Kamp · Anime & Manga · Spor Malzemeleri · Evcil Hayvan · Vintage · Saat · **ve Dahası** (= "and Whatnot"). Optional TR-specific extras: Halı & Kilim, Pul (philately), Osmanlı/Cumhuriyet Hatıra Eşyaları.

### S13 Category page [W][V]
Opened from S12 or a Home chip. Route `/category/{slug}` (web `/tag/{slug}`).
1. Nav: back ‹, title **category name** (24 bold, e.g. "Trading Card Games"), yellow **Follow** pill (or grey "Following") next to or under the title, share icon top-right [I].
2. **Subcategory carousel** (horizontal): tiles **2:1 aspect, min-width 176, radius 8**. A full-bleed image (the yellow `#FFE414` placeholder shows while loading) under a `black/50` overlay. Label white 13 semibold centered at the top. At the bottom a red 20 px circle with the white bars icon and "18.9K Viewers" (white 12). Example for TCG: Pokémon Cards 18.9K · One Piece Cards 1.2K · Magic: The Gathering 609 · Yu-Gi-Oh! Cards 307 · Dragon Ball Cards 254 · Other TCG 82 · Weiß Schwarz 62 · Lorcana 62 · Naruto Cards 56 · VeeFriends 23 · Union Arena 6 · Riftbound.
3. **Refinement chip row** (sticky): `[⚙ Filter] [Sort ⌄] [Recommended*] [Top Sellers] [New and Noteworthy] [Show Format ⌄] …`. Data model [W]: the flat sort "Recommended", flat filters `virtual.topSeller` = "Top Sellers" and `virtual.newSeller` = "New and Noteworthy", the dropdown filter "Show Format" (multi-select), plus **suggested tags** chips (e.g. Singles, Breaks, Sealed, Graded Cards, $1 Starts, Sudden Death, Vintage). TR: `Filtrele`, `Sırala`, `Önerilen`, `En İyi Satıcılar`, `Yeni ve Dikkat Çekenler`, `Yayın Formatı`.
4. A **2-column Show Card grid** (24 per page, infinite scroll).
5. A floating **"Shows | Products"** segmented pill at the bottom center. The Products mode shows a 2-column product grid (S15 product card).
6. Sub-subcategory pages (e.g. Pokémon Cards) repeat the same layout without the carousel.
- Web title format: "Livestream shopping for {Category} on Whatnot".

### S14 Top Sellers leaderboard [V]
- Nav: a circular back ‹ (white circle) left, a circular **ⓘ** right (opens the "About Top Sellers" sheet).
- Title block: grey "Top Sellers" (28 bold `#8A8A8A`), then **"{Category} ⌄"** (32 bold black; tap for a category switcher). A large 3D category object bleeds off the right edge.
- Chips: **Live Now** (selected black), **Today**, **This Week**.
- A list of white cards (radius 16, h≈84, gap 12, page bg `#F2F2F2`): rank (①②③ as gold/silver/bronze medal ribbons, then plain grey numbers 4, 5…), a 56 px avatar, username 18 semibold, "🔴 57 Viewers" grey, and a grey pill **"Join"** on the right.
- ⓘ sheet: "About Top Sellers". "How sellers are ranked: Sellers are ranked on their sales, viewership, and how reliably they fulfill orders." "Why rankings change: Live rankings show the top sellers live right now, based on performance within the past 4 hours. Daily rankings show the top sellers within the last 24 hours, and weekly rankings within the last 7 days."
- TR: `En İyi Satıcılar`, `Şu An Canlı`, `Bugün`, `Bu Hafta`, `Katıl`.

### S15 Search [V][W]
**Entry state** (focused field): back ‹, search input with a clear ✕. Sections "Your Recent Searches" (rows with ✕ remove; empty: "No recent searches") and "These are the most popular:" (chips). Typeahead rows show users (avatar), categories and queries [I].

**Results** (screenshot "Coach pocket purse") [V]:
1. Back ‹ + search pill with the query + ✕.
2. Underline tabs: **Top · Products · Shows · Users · Categories**. TR `Öne Çıkanlar · Ürünler · Yayınlar · Kullanıcılar · Kategoriler`.
3. Chip row (Products): **[⚙ Filter] [Sort ⌄] [In Show] [Buy Format ⌄]**. TR `Filtrele · Sırala · Yayında · Satış Şekli`.
4. Row "Results" (15 semibold) left, **"Saved 🔖"** right (blue; tap to save the search, filled when saved). TR `Sonuçlar`, `Aramayı kaydet`.
5. **Product row** (list layout): 1:1 image 150 px radius 8, with a white pill on the image top-right "🔖 3" (bookmark count, filled if saved by me). Right column: 20 px avatar + username 14 semibold + "• ⭐ 5.0"; title 2 lines 16 semibold; grey meta "Shoulder Bags · Excellent" (subcategory · condition); price 18 bold "$325"; optional grey "Show starts 1/31 • 7:30 AM".
6. Shows tab = 2-column Show Cards. Users tab = rows (avatar, username, followers, Follow pill). Categories tab = tile list.
- Filter sheet [W/I]: sections Category, Condition, Price (Min / Max), Buy Format (Auction / Buy It Now), Shipping (Free Shipping), Local Pickup radius ("Display shows & products within a specific distance"), buttons "Clear all" + "Show Results".
- Sort options [I]: Recommended (default), Ending Soon, Newly Listed, Price: Low to High, Price: High to Low.
- Saved searches notify you when there are new results "({count} new results)" [W]. Searches for Shows, Categories or Users cannot be saved [H].

---

## 5. Live show (viewer)

### S20 Live player [V], all overlays
Full-screen 9:16 video (cover fit), always dark UI, status bar light. Layers from top to bottom:

**A. Header (top safe area + 8)**
- Left: seller avatar 40 px (Rewards Club members also see the seller's badge). To its right: **username** (16 semibold white), and a second row **"★ 4.9 · 🚚 1d"** (white/80, 13; star rating, then truck + average ship time "<1d", "1d", "2d") followed by a small **yellow "Follow" pill** (hidden once followed). Some sellers also show a small round verified or premier badge after the rating [V].
  - Tap the avatar or username → **S29 seller mini-sheet**.
- Right cluster (gap 8): a yellow rounded-square **crown** (only if the seller has Rewards Club) → S33; a **viewer pill** (red circle + bars icon + "940" / "1.1K"; a lock icon next to the count for private shows) → S31; a **chevron-down** in a 36 px dark circle (minimize to PiP / exit). On non-live previews it is an **✕** instead.
- Under the header, a top **banner slot** shows in this priority: Giveaway card (S27), "Show starts in…" countdown card (S40 pre-live), Party Purchase hero, raid notice, "friends watching" banner [H].
- A **Show Notes sticky** on the left under the header [V]: a pale-yellow note (≈ 120×110, `#F4E9A8`, folded corner) titled "Show Notes" with a truncated first line ("Welco…", "Eyewear di…"). Tap → expanded card "Show Notes" + ⊖ collapse. TR `Yayın Notları`.

**B. Right action rail** (bottom-right, above the product card, vertical, gap 14, white icon 26 + label 11 white/90 with a text shadow):
1. **More** (…) → S32 sheet. TR `Diğer`
2. **Boost** → S30 "Boost Seller" sheet (Community Boost + Send a Tip). TR `Destekle`
3. **Clip** (clapperboard) → generates a clip: a sheet with "Generating your clip…", "This clip is saved to your profile as private.", Download, then "Edit Clip" (trimmer with a yellow handle frame, "Clip Name*", "Save"). TR `Klip`
4. **Share** (with a white count bubble "4K") → share sheet (S44). TR `Paylaş`
5. **Wallet** → S26. TR `Cüzdan`
6. **Shop**: a 44 px rounded tile showing the currently pinned product's thumbnail (or a store icon), with a count badge "117" top-right → S24. TR `Mağaza`
- Older or alternate builds show **Mute / Activity (bell)** in the rail [V]. Optionally include Mute (speaker) for parity.

**C. Chat (bottom-left, ≈70 % width, above the input)**
- Messages fade at the top (gradient mask). Each message: 32 px avatar, **username** (14 semibold, white/60), message (15 semibold white) under it.
- System lines: "{user} joined 👋" (grey username + white "joined 👋"), "Joined the party" (grey tag), "{user} tipped $5!" (green), "{user} is raiding with a party of N", "{seller} raided the show".
- Badges after the username: **"Mod"** (grey translucent pill), **"Host"** [I], Rewards Club tier badge, **Verified buyer** icon [W].
- **Questions are highlighted in yellow text** ("Do you have this in a small?") [V][H].
- Pinned or "announce" messages render as a highlighted card at the top of the chat (from `/announce`) [H].
- Mentions: typing `@` opens a username autocomplete. Tap a username → mini profile (Report, Tag/Mention) [H].
- Double-tap any empty video area → floating **Reaction** animation (hearts by default; Points-shop reactions) [H][V].
- Chat states [W]: "Connecting to chat...", "Reconnecting to chat...", "Chat is unavailable at the moment.", slow mode "Love your enthusiasm! But please wait a few seconds before your next message.", "In order to chat, you need to verify your phone number."

**D. Chat input row**
- A pill input **"Say something..."** (h 40, `white/10` fill, 1 px `white/25` border, white/60 placeholder). TR `Bir şey yaz...`.
- On the right a **yellow heart button** (36 px circle) for reactions. Long-press it to open the Jumbotron/Reaction management sheet [V][H].

**E. Status pill (above the product card, left)**: avatar 20 + "{username} **won!**" ("won!" in yellow) or "{username} is **winning!**" (yellow, or green "Winning!") in a dark translucent pill [V]. TR `{kullanıcı} kazandı!` / `{kullanıcı} önde!`.

**F. Pinned product card** (full width minus 16, dark translucent `black/55` + blur, radius 16, padding 12) [V]:
```
[thumb 64x64 r8] Title (16 semibold white, 2 lines)                 $35   ← price 20 bold white
                 1 Available · Condition is new with ta…           00:29  ← timer 17 bold yellow (#FFE414)
                 $4.13 Shipping + Taxes  (grey 13)                 (💀 before timer if sudden death)
                 [chips: "$2.00 Shipping + Tax" grey pill] ["🏪 Free Pickup" purple pill]
```
- Under the price, other states: "**Sold**" (red `#EF233C`, 15 semibold) after the auction; "14 Left" (yellow) for BIN quantity; strike-through "$35" over a yellow "$28" for a Flash Sale; "Sold Out" (red).
- Tap the card → expanded product details sheet (photos, description, condition, "View Product Details") [I]. "MORE" inline expands the condition text [V].
- Coupon note: "Coupon applied" shows under the description when a coupon applies [H].

**G. Primary action row (bottom, above the home indicator)**, depending on state [V]:
| State | UI |
|---|---|
| Auction running | Left: **"Custom"** pill (≈30 % width, h 52, dark translucent, 1.5 px `white/40` border, white 17 semibold). Right: the **swipe track** (h 52, radius full, 1.5 px yellow border, transparent) containing the yellow knob pill **"Bid: $1 ›››"** / "Bid $40 »" (≈80 % of the track, black 17 semibold, double chevron). **Swipe right to place the next valid bid**; the knob slides and snaps. On release: "Bid Confirmed!" toast, haptic. TR `Pey: ₺50 »` (see §9 terminology), `Özel`. |
| Winning | Knob turns grey or green with "You're winning" [I]. Web: "You are currently winning at {amount}." |
| Outbid | Push or toast "You've been outbid" [W]. The knob shows the next amount again. |
| BIN pinned | **"Checkout"** dark pill (left, ≈35 %) + swipe track **"Buy Now ›››"** yellow (right) [V]. |
| Pinned auction not started | Full-width grey translucent disabled pill **"Auction hasn't started"** [V] (or "Pre-Bid" if pre-bids are enabled). |
| Nothing pinned / item sold | Full-width grey pill **"Awaiting Next Item"** [V]. TR `Sıradaki ürün bekleniyor`. |
| Sold out | Full-width grey **"Item Sold Out"** [V]. |
| Logged out | Yellow "Sign up to bid" → S02 [W] ("Unlock the full experience! Sign Up to Shop, Chat with, and Follow {seller}"). |

**H. Overlays and animations**
- **Winner** [V]: when an auction ends, the status pill shows "{user} won!", the price area shows "Sold" in red, and a full-screen **Jumbotron** animation plays for the buyer (the user's avatar + name in a celebratory animation, e.g. "Cheer Cyclone": flying laughing emojis around a W coin). The winner gets a modal or toast "**You won the auction!**" / "Won!" [W].
- **Giveaway winner** [V]: a dark translucent card at the top: "Giveaway winner" (white 18 semibold), the username in yellow inside a darker inner pill, an ✕ close, and **multicolor confetti** falling across the screen.
- **Community Boost Activated** [V]: a yellow pill banner with a black circle bars icon and "Community Boost Activated" + confetti.
- **Party Purchase** [V]: a center hero ("Let's Party / Share the Party with Friends" with a disco ball). Above the product card a progress module: "Next Reward – 10% Off ($31.50) **$31.50**", a timer "02:55", a milestone track (40 / 80 / 120 / 160 with gift icons), "9 of 200 · {user} purchased", link "Rewards". On completion: "Party Purchase Complete" with unlocked rewards ("Giveaway Unlocked", "20% Off ($28) Unlocked").
- **Flash Sale** [H]: a BIN with a countdown timer and a discounted price (strike-through), auto-pinned.
- **Breaks** [W]: card text "This is the time where you'll buy into the break. You can see how many spots are left…", "💥 Breaking Now", "The break is over…". Spot-picker sheet "Pick Your Team" with team chips (sold ones greyed).
- **Polls** [W]: "Create poll", "Poll ended with…" (seller tool; a chat card for buyers).
- **First-time modal** (S21).

### S21 First-entry "Buyer Protection" modal [V]
The live video dims behind it. A white center card (radius 20): a 3D black shield with a yellow "W", the title "**Whatnot Buyer Protection**" (22 bold) and the body "Get what you purchased, or we'll make it right." Below the card a separate yellow pill **"Next"** (part of a short multi-step intro carousel; later steps [I] explain swipe-to-bid and Custom/Max bid).
TR: `Mezatonline Alıcı Koruması` / `Satın aldığın ürünü al, yoksa telafi edelim.` / `İleri`.

### S22 Custom bid / Max Bid sheet [V][H][W]
Opened by "Custom". A dark sheet (bg `#1C1C1C`, handle) over the dimmed video. The numeric keypad stays open.
- Title "**Place your Bid**" (22 bold white, centered).
- Body (grey 14, centered): "You are entering a max bid for **{ITEM TITLE}**. By entering your max bid, we'll automatically place bids for you, up to that amount…"
- Status (white bold): "Someone else is currently winning at $32.00" / "You are currently winning at {amount}." / "<Be the first to bid!>".
- [I/W] A preset chip row "Select bid amount": the next 3 valid amounts (e.g. $34 · $36 · $40) + "Enter other amount".
- A **Max Bid toggle** row [H]: label "Max Bid", default **ON**. OFF = "submit exact bid" (one immediate bid).
- Field label "Max Bid", helper "Enter a bid of at least $34.00", input (h 56, radius 12, 1 px `white/20` border, "$34"). Errors: "Bid can't be lower than {min}", "Enter an amount above your current max bid of {amount}."
- "+$6.65 Shipping" (grey, centered).
- CTA **white pill "Submit"** (pre-show) or **"Set Max Bid $40" / "Confirm & Bid $40"** (live) [W]; secondary "Cancel".
- Footer grey 12: "Bids are final. You can increase at anytime, but are not able to reduce or cancel your max bid." Blue link "**How Max Bid Works**" → an info sheet with the long explanation and the vintage-guitar example [W].
- Success toast: "Max Bid of {amount} Submitted!" [W].
- TR: `Pey Ver`, `Maksimum Pey`, `En az ₺340 gir`, `Peyler kesindir. Peyini istediğin zaman artırabilirsin ama düşüremez veya iptal edemezsin.`, `Maksimum Pey Nasıl Çalışır?`.

### S23 Bid gating sheets [W][V]
- **First bid confirmation**: "Confirm your bid". "Are you sure you want to place a {bid_amount} bid? Failed payments may lead to action against your account." with Confirm / Cancel.
- **No payment or address**: "Payments & Shipping. This is required in order to place a bid, order or buy a product on a show. We charge your card if a bid or offer is accepted." → Payment Method row + Shipping Details row (same as S71).
- **Verified Buyer required**: "Verify Your Payment Information". "Verify your payment information in order to bid in this show." "To keep the bidding fair and honest, we'll place a temporary {amount} hold on your payment method. This isn't a charge, and we'll release the full amount after 7 days." Buttons "Get Verified" → "Authorize". Success: "You are now a **Verified Buyer!**" (green) + "You're now free to participate in auctions. Happy bidding!" TR hold amount: ₺100 suggested.
- **Payment declined** [V]: a white sheet, a red ⚠ in a pink circle, "**Your payment method was declined.**", "Please retry or update your payment method to complete your transaction. Once you start, we'll automatically let the host know you're working on fixing it.", a Payment row (visa •••• + ✎), a yellow pill **"Add New Payment Method"** and a grey pill **"Retry Payment"**.
- Spend or watch limit (Account Controls): "Spend limit reached", "Watch limit reached", "You have self excluded from this live show." [H][W].

### S24 Live Shop sheet [H][V-partial]
Opened by the Shop tile. A tall dark or white sheet (≈85 %):
- Title "Shop" or "{seller}'s Shop" + search field "Search shop" [I].
- **Underline tabs: Auction · Buy Now · Giveaway · Sold** [H] (Auction, Buy Now and Giveaway are verified; Sold [I]). Counts in parentheses.
- Item rows: thumbnail 64, title, "1 Available · Condition", price ("Starting at $125" / "Current bid $32" / "$55"), shipping line; right-side buttons by tab: **Pre-Bid** (auction not yet run, yellow outline), **Buy Now** (yellow), "Pinned" tag (yellow pin), "Sold for $40" (sold tab, with the buyer username).
- "Winning" label next to the bid count when I am the top pre-bidder [H].
- Tap a row → S41 listing detail inside the show context.

### S25 Buy Now checkout sheet [V]
A white sheet over the dimmed live or listing:
1. Title (18 semibold) + product thumbnail on the right; "• Only 1 Available"; blue "**See More ⌄**" (description).
2. Collapsible sections with a divider and chevron: **Promotion** (coupon or referral credit), **Payment** (expanded: radio + card brand icon + "Apple Pay" + ✎; then "Or pay for this item over time **Learn More**" + radios "Use affirm", "Use Klarna"), **Address** (formatted address + ✎), **Delivery Method** if pickup is available.
3. Summary: Subtotal $120.00 · Shipping $9.21 · Est Tax $11.70 · **Total $140.91** (bold).
4. Buttons: "Cancel" (outline, 30 %) + **"Buy Now"** / "Continue with Affirm" (black pill, 70 %). Fine print about redirection.
5. Success: "Purchase successful!" + Jumbotron (in a live).
- TR adaptation: replace Affirm/Klarna with **"Taksitle öde"** (card installments 2–12 via iyzico/PayTR). Tax line: "KDV dahil" (prices are VAT-inclusive in TR), so show `Ara toplam`, `Kargo`, `Toplam (KDV dahil)`.

### S26 Wallet sheet [V]
A white sheet, title **"Wallet"** (TR `Cüzdan`):
- Row 🚚 **Shipping**: "Ship to / Los Angeles CA 90032-2941" › (→ address picker; the Delivery Method sheet when Free Pickup is available).
- Row 💳 **Payment**: "visa" › → payment-method chooser. Add flow: "**Add payment method** / You won't be charged until you purchase an item" with rows **Credit or Debit Card**, **PayPal**, **Apple Pay**, **Venmo** (›). TR rows: `Kredi / Banka Kartı`, `Apple Pay`, `Google Pay`, (optional) `Papara`, `BKM Express`.
- Row (yellow circle gift) **"Make Referrals, Earn Credit"** / "Earn $5 for each referral" ›.
- An input **"Promo Code"** with a grey **"Apply"** button attached on the right (also used for coupons: "Coupon Code") [V][H].
- Active coupon rows appear here ("Coupon: 10% off, Expires 3 days") [H].
- **Delivery Methods** sheet [V]: back ‹, title "Delivery Methods". Radio **Shipping** (truck icon, address block, blue "Edit Address"). Radio **Free Pickup** (address, blue "📍 23 mi from your shipping address", "Instructions" + quote). A yellow **Save** pill. A tooltip on the live screen: "This seller is offering free pickup near you. Opt-in to pick up your items from your wallet."

### S27 Giveaway card (top of screen) [H][W]
- Appears when the seller runs a giveaway (only the host sees the countdown; buyers see no timer) [H].
- A dark translucent card under the header: a gift icon + "**Giveaway**" + item title + entrants count [I]. A yellow pill **"Enter Giveaway"**.
  - Follower-only: **"Follow Host & Enter Giveaway"**.
  - Buyer Appreciation: requires a purchase in this show ("Make a purchase to enter" [I]); the US/CA free-entry form flow is not needed for TR.
  - Not eligible (no address or payment): opens S23 Payments & Shipping.
- After entering: the button changes to a disabled **"You're in the Giveaway"** ✓ [W].
- Leaving the show removes your entry; coming back re-enters you automatically [H].
- End: "Selecting Giveaway Winner" (shimmer) → the **Giveaway winner** card + confetti (S20-H). The winner sees "You won the giveaway!" plus an order in Activity. Error states: "There are no entries in the giveaway", "No eligible winner".
- TR: `Çekiliş`, `Çekilişe Katıl`, `Takip Et ve Katıl`, `Çekilişe katıldın`, `Kazanan seçiliyor…`, `Çekilişi kazandın!`. Note: giveaways in Turkey may fall under MPİ (Milli Piyango) raffle regulation, so check before launch.

### S28 Purchase or win celebrations [V][H]
- **Jumbotron**: a full-screen celebration for everyone in the show when someone buys (shows the buyer's name + avatar). Users pick a Jumbotron from the Points Shop.
- Chat line: "{user} just won {item}".
- Buyer's own result modal: "You won the auction!" with item, price, "+ shipping & taxes", "View Order Details" [W].

### S29 Seller mini-sheet (tap avatar in live) [H]
A sheet with avatar 64, username, rating, followers. Buttons: **Following ⌄** (→ Unfollow confirm: "Are you sure you want to unfollow this user?"), **Tip or Boost** (→ S30), **View Profile**, **Message**, and kebab actions **Report** / **Block**. For viewers tapped in chat: Mention in chat, Report, Block.

### S30 Boost Seller sheet [V][H]
- Header: a full-width yellow gradient (`#FFE414 → #FFC700`), a white circular ✕ top-right, title **"Boost Seller"** (34 bold black), sub "To show appreciation for your host, you can support through boosting this show or by tipping."
- Section ⚡ **Community Boost**: "Contribute with others to boost this show's visibility across Whatnot." Buttons: grey "Learn More" + black "**Boost Show**". A progress bar (yellow→orange gradient fill with a "$8" orange bubble at the end) with "$0" … "$25" labels.
  - Boost Show sub-sheet [W]: preset amounts + "Enter other amount", "Join the boost, {remaining} to go!", "We'll shout you out in chat each time you contribute", "Contributions carry to the seller's next show if the goal isn't met". Success: "Community boost purchased successfully!"
  - The Community Boost screen [V]: back + title, a donut ring (yellow→orange) with "Total **$24** raised of $30", the list "Next Boost (3)" with rows "{user} **boosted $10** · Just Now" (green).
- Section 💵 **Send a Tip**: "Quickly and securely show your appreciation for this seller." "Learn More" + black "**Send Tip**".
  - Tip flow [H]: preset amounts only (no custom; e.g. $1, $3, $5, $10, $20, $50, $100), an optional "thank you note", **Next** → review payment (fees shown) → **Send Tip**. Limits: 10 tips per seller per show, $200 per seller per show, $500 per day. TR suggestion: ₺20 / ₺50 / ₺100 / ₺250 / ₺500 / ₺1.000.

### S31 Viewers sheet [H][V]
Opened by tapping the viewer pill. Buyer view: a "Friends in live" section + a list of viewers [H]. Host view [V]: stats card **Sales $1,310 / Orders 108**, underline tabs **Watching | Activity**, chips **All · Auction · Giveaway · Offers · Label**, and feed rows ("gardenkid29 **tipped $5!** · 1m", "mistique made a purchase · 1m / $22 · Hoya Compacta Rope" + thumbnail). Watching can be sorted by Friends, Host and Mods, and Top Buyers.

### S32 More (…) sheet, buyer [I + W]
Rows: Share show, Clip, Report show ("Select a problem to report"), Hide chat / Show chat, Mute, Enable Chat Translation [W], Live captions (uses OS captions [H]), Jumbotron & Reactions settings, Exit show.

### S33 Rewards Club (crown) sheet [H]
Shows your current tier (Bronze, Silver, Gold, Platinum, Diamond), progress to the next tier (achievement progress bars: Shows watched 10+ min, Purchases completed, Amount spent), available rewards, earned or redeemed coupons with a **Redeem** button. Season info: 3-month seasons and a 5-day coupon grace period. TR tiers: `Bronz · Gümüş · Altın · Platin · Elmas`.

### S34 Show ended / Raid [W][H]
- **Raid**: a full-screen interstitial "{seller} is raiding with a party of N" with the target show preview; a countdown auto-moves viewers into the raided show; buyers can leave. In chat: "{user} raided the show".
- **Ended**: the video freezes or blurs; a center card "**Show has ended**" (TR `Yayın sona erdi`) with the seller avatar, "Follow" and "Schedule Next Show"/upcoming show, carousel "**Browse more shows**" / "Explore more shows" [W], buttons "Back to home" and "View show" for the replay (if `endedVideoReplayUrl`).
- Unavailable: "This show isn't available right now", "Your access to this show has been restricted.", "We're at max capacity…" (viewer limit; "Chat is unavailable because this stream reached the viewer limit.") [W].

---

## 6. Upcoming show, product and sharing

### S40 Upcoming show page [V]
The same frame as live (the cover image or trailer video behind it), the seller header with Follow, the rail (More, Share, **Save** with a count), the Shop tile bottom-right.
- Top card (dark translucent, radius 16): **"Show starts in 6d 1h 9m 32s"** (white with the countdown in yellow). Alternate form: "Show Starts" (grey) + big "**6/8, 6:30 PM**" (32 bold white). An outline pill "🔖 **Save Show (4)**" or "🔖 **Save & Notify Me**", and an underlined link "**Add to Calendar**", plus ✕ to collapse.
- A Show Notes sticky (expanded or collapsed).
- Bottom: the pinned or first listing card ("Starting at **$125** + $4.87 shipping + taxes") and a full-width yellow **"Pre-Bid"** (opens S42).
- The share link preview shows the seller username, title and thumbnail [H].
- TR: `Yayının başlamasına 6g 1s 9dk 32sn`, `Kaydet ve Hatırlat`, `Takvime Ekle`, `Ön Pey Ver`.

### S41 Product / listing detail (app) [V]
Full-screen dark media viewer:
- A photo carousel (swipe) with a page indicator (white active capsule + grey dots, centered under the header). Video up to 30 s supported [H].
- Header: seller avatar 40, username (17 semibold white), "★ 4.9 · 🚚 <1d" + yellow **Follow** pill; a views pill "50 views" [V]; an **✕** close in a dark circle.
- Right rail: **More** (…: Report Listing, Copy link), **Share**, **Save** (bookmark with a count badge "11").
- Bottom info card (dark `#1C1C1C`, radius 16): title (20 semibold, 2 lines), expand ⤢ icon (→ full description sheet: Description, Condition, Category, Quantity, SKU-free, "Shipping from {region}", "Ships {service}", Buyer Protections), "1 Available • Very Good Plus (VG…)", price row "**$55** + $4.87 shipping + taxes" or "Current bid **$32**" / "Starting at **$125**".
- CTA row by format:
  - BIN with offers: **"Make Offer"** (dark pill) + **"Buy Now"** (yellow).
  - BIN only: full-width "Buy Now".
  - Scheduled auction: a "Show Starts … / Save & Notify Me" card at the top + full-width **"Pre-Bid"**.
  - Unavailable or sold: "Unavailable" / "Item Unavailable" / "No Longer Available" [W].
- Web listing page sections [W] (for an extended scroll view): Title · status · price "(approx. €0.00) + shipping + taxes" · **Seller Shop** card (avatar, username, ★4.9 Rating · 8.9K Reviews · 43.1K Sold) · **About the Seller** (bio, following/followers, stats) · **More from the Seller** (grid: title, price, "Qty. 25") · **Message Seller** / **View Profile** · **Buyer Protections: Whatnot Buyer Guarantee – "Receive your purchase on time and as described or we'll make it right."** · "Created on 12/29/24" · **Report Listing**.

### S42 Pre-bid sheet
Same as S22 (pre-show copy). Behaviour [H]: starts at the seller's starting price, binding, applies to one unit, expires 24 h after the scheduled start if the item doesn't run, and sends a push when the item is pinned.

### S43 Make Offer sheet [H][W]
"Make an Offer": percentage chips (e.g. −5 %, −10 %, −15 %, −20 %) + "Custom Offer" amount field, **Continue** → review (offer, payment, shipping) → **Confirm**. Note: "You won't be charged unless the seller accepts the offer." Toast: "Your offer has been placed. The seller will review your offer and respond." Expires after 30 days. Counter-offers can be accepted or rejected within 24 h. Coupons don't apply to offers. TR `Teklif Ver`, `Özel Teklif`.

### S44 Share sheet [H][W]
A sheet titled "Share this show". A top row of recent Whatnot DM recipients (avatars) plus a "Search" icon (Whatnot DM), then a row of channels: Copy link, Messages, WhatsApp, Instagram Stories, X, Facebook, More. Toast "Copied". Links carry `sender_id` + `sharing_channel`. TR: put WhatsApp first.

---

## 7. Profiles

### S50 User / seller profile [W][V]
Layout top to bottom (mobile):
1. A **banner image** (h≈176, 3:1, cover; grey or yellow placeholder). Top bar over it: back ‹, right side **bell** (follow-notification setting: "All Notifications / No Notifications") [H], share, … (Report User, Block, Copy profile link).
2. A **96 px avatar** overlapping the banner bottom edge (−72 offset), left-aligned at 16.
3. **username** (17 semibold; verified or premier badge if applicable), display name (grey 14).
4. Stats line (12–13): "★ **5.0** Rating • **261** Reviews • **3.3K** Sold • **<1 day** Avg Ship Time" (numbers black, labels grey). TR: `5,0 Puan • 261 Değerlendirme • 3,3B Satış • <1 gün Ort. Kargolama`.
5. "**64** following   **1.6K** followers" (tap → S51). TR `takip`, `takipçi`.
6. Bio (up to 1,000 characters, "See more"), links as plain text.
7. Buttons row: **Follow** (yellow pill, flex) / "Following" (grey), **Message** (grey pill), **Tip Me** (grey) [H], share (32 px grey circle). On your own profile: **Edit Profile** (grey) + Share.
8. **Live now** banner if the seller is live ("User is currently live" + "Join Show") [W].
9. **Underline tabs (sticky)**: **Shop · Shows · Reviews · Clips** (sellers); buyers show only **Clips** (or Reviews if they have any) [W].
   - **Shop**: filter chips "Buy It Now · Auction · Sold" [H], a 2-column product grid (image 1:1 with a bookmark count, title, price, "Qty. 25").
   - **Shows**: "Upcoming Shows (n)" cards with date + "Save", then past shows / replays.
   - **Reviews**: a header "Reviews (261)" + average stars + a rating breakdown [I]. Rows: avatar (or initial), username 14 semibold, date "8/14/2025", a star value "5.0", text, "See more". Seller reply indented with the "{seller} **Seller**" label. A kebab per review (Report; Reply if mine).
   - **Clips**: a 3-column 9:16 grid of clips with view counts.

### S51 Followers / Following list [H]
Tabs **Following | Followers** (plus Friends = mutual follows). Rows: avatar, username, name, a Follow/Following pill on the right; Friends get a "Friend" tag. A search field at the top [I].

### S52 Edit Profile [H]
Fields: Profile picture (square, ≤7 MB), Banner (3:1, ≤7 MB), Name, Username (rules above; 24 h cooldown; can't change with pending orders), Bio (1,000 characters, counter). Save button **"Save changes"**.

---

## 8. Activity, notifications, messages, rewards

### S60 Activity tab [V][H]
- Large title **"Activity"** (28 bold) left. Right: **"Friends Online"** pill (overlapping 24 px avatars + a "+1" bubble, outlined, radius full) **or** **"👥 Find Friends"** outlined pill, then the gift circle.
- Underline tabs: **Purchases · Bids · Offers · Saved** (plus a **Friends** list reached from the pill) [V][H].
- **Purchases** chips: All · In Progress · Completed · Refunds · Canceled · Pending review · Tips · Community Boost [H]. Rows [V]: thumbnail 1:1 (≈100, radius 8), a grey status chip ("Label Created", "In Transit", "Pending Review", "Preparing Package", "Delivered", "Pending Cancellation"), title 16 semibold, "Price: **$13.78**", "Purchased: **2/7/26**", "Delivery expected: 2/14/26", "From: **palcielovintage**" (blue). Tap → S61.
- **Bids** chips: Upcoming · Outbid · Winning · Expired · Lost · Won · Ended · All [H]. Rows show the item, my max bid, the current bid, show time and a status chip.
- **Offers** statuses: Awaiting Reply · Counter Offer · Accepted · Cancelled · Expired [H]. Counter → Accept / Reject.
- **Saved** chips: All · Shows · Products · Searches · (Videos) [V]. Sections "Products" (2-column cards: image with a bookmark count, avatar + username + ⭐5.0, title, "Shoulder Bags · Excellent", price, "Show starts 1/31 • 7:30 AM"), "Shows", "Searches" (rows with ⋮ → "Delete this search").
- **Friends** [H]: "Online" (friends watching or hosting, with **Join** / **Message**), "Recommended friends" (from contacts, **Follow**).
- Empty states [W]: "No orders", "No saved items", "No saved searches", "Nothing to see here...".
- TR status set: `Paket Hazırlanıyor · Kargo Etiketi Oluşturuldu · Kargoya Verildi · Yolda · Teslim Edildi · Değerlendirme Bekliyor · Tamamlandı · İptal Talebi Bekliyor · İptal Edildi · İade Edildi`.

### S61 Order detail [V]
- Nav: back ‹ + item title (17 semibold, truncate) + share (for pickup orders).
- **Status card** (outlined, radius 16, padding 20):
  - Status title (20 semibold): "Preparing Package" / "In Transit" / "Pending Review" / "Ready for Pickup".
  - Subtitle (17 semibold): "Typically ships same day" / "Typically ships in 1 day" / "Expected by Feb 14, 2026" / "Order Has Arrived".
  - A **progress bar** (4 px, grey track, fill = yellow→orange gradient: ~15 % preparing, ~60 % in transit, 100 % **green** delivered).
  - Body grey 15: "The seller is preparing your package to ship. They typically ship in 1 day. Once the package is scanned, you'll receive tracking updates to follow its journey to you." / "Shipment is expected to be delivered to Los Angeles CA 90027 on Feb 14, 2026" / "Your item was delivered on Jan 21, 2026 at 6:40 PM to …".
  - "Order placed Feb 4, 2026 at 3:05 PM" (grey 13).
  - Optional drop-off scan photo thumbnail [V].
  - If Pending Review: a dark pill **"Rate Purchase"** + "Your feedback helps us ensure a high-quality experience for all buyers." Pickup: a yellow **"View Pickup Code"** + "Present your code to the seller for pickup confirmation when you arrive. Pick up this order before {date}."
  - Rows (icon circles): **Shipping to** (address; editable before shipping → S65) · **Message the seller** · **Get help with this purchase** ("Eligible for a refund within 26 days of delivery.") · **Track your purchase** (external-link icon → carrier page) · **Refer a buyer, earn $5!** ("Get credit towards your next purchase", yellow gift circle).
- Item image, item title (26 bold), blue "View Product Details ⌄".
- **Order Details** (striped rows): Order ID (9 digits, copy icon), Order Date, Sold By (blue link), Qty, Category (blue link), Show (link).
- Rows: **Receipt & shipping details** (→ S62), **Video Receipt** "Video receipt available for 60 more days" (▶ icon → plays a clip from the moment of purchase), VAT invoice (→ TR: **e-Arşiv Fatura**).
- **Buyer Protections**: shield-W icon, "Whatnot Buyer Guarantee", "Receive your purchase on time and as described or we'll make it right." ›
- **About the Seller** card at the bottom.

### S62 Receipt & shipping details [H]
Subtotal, Shipping (per item if bundled), Taxes, Coupon/credit lines, Total, Shipping address, Payment method (email only in Whatnot; show the masked card in TR). TR: `Ara Toplam`, `Kargo`, `İndirim`, `Toplam (KDV dahil)`.

### S63 Rate Purchase sheet [V]
A full sheet with ✕: seller avatar, seller name, "**$13.00** Total Price | Purchased **1/13/26**"; "Items in Order (1)" (grey card with title, price, thumb). **Overall**: "How happy are you overall?" + 5 stars (selected = blue `#005AE1` filled stars), "Required" label right. A textarea "Tell us more (Optional)" with "Characters left 1,000". If 4 stars or fewer, three more required star rows: **Shipping** "How fast was your delivery?", **Packaging** "How was the condition of your purchase?", **Accuracy** "Did you receive what you expected?". Submit button at the bottom [I]. Reviews can't be edited, only deleted. The window is 30 days after delivery.

### S64 Get help / Cancel flow [V][H]
- Tapping "Get help with this purchase" while still cancellable shows a center modal: "**Eligible to Request Cancellation**". "You can still make a request to the seller to cancel this order. The seller has discretion to confirm or deny any cancellation requests. Would you like to request a cancellation or proceed to get help?" Buttons: red **"Request cancellation"**, grey **"Get help"**, outline **"Cancel"**.
- Rules: within 24 h of purchase and before the label exists; the seller has 2 business days; the status becomes "Pending Cancellation".
- Get help options [H]: hasn't shipped / delayed; damaged; missing items; wrong item; not as described; defective or expired; not authentic → describe + upload photos → submit. Routes to the seller (Seller Provided Support; appears in Inbox as "Support Request · Awaiting seller response") or to Whatnot Support (email). Escalate with the "?" icon in the request header.
- TR: legally, `14 gün cayma hakkı` (Mesafeli Sözleşmeler Yönetmeliği) applies to many categories, so add "Cayma hakkı / İade talebi" for eligible orders.

### S65 Change shipping address (order) [V]
Back + "Shipping Address". "Update your address for this shipment. Since the seller hasn't shipped your items, you're eligible to change your shipping address. All items within this shipment will be sent to this new address." "Addresses" list: rows with a pin-in-grey-circle icon + Name / Street / City, State + a radio on the right. A grey **"Add New"** pill. A sticky yellow **"Update"** (light-yellow disabled until changed).

### S66 Notifications (bell) [W][I]
Title "Notifications" (web "Notifications Hub"). Sections **Today / Yesterday / Earlier**. Rows: avatar (seller or system W logo), rich text, relative time, optional right thumbnail; unread rows get a light-yellow bg or a blue dot. Types: "{seller} is live: {title}", "A show you saved is starting", "{user} started following you", "You were mentioned by {user} in {show}", "You've been outbid on {item}", "You won the auction!", "Your pre-bid item is up next", "Your order has shipped", "Rate your purchase", "Counter offer received", "New results for your saved search", "Price drop / item back". Empty: "View Shows, Follow Sellers, and Bid in Auctions to be notified about them" [W]. Error: "Unable to load notifications".

### S67 Inbox / messages [V][H]
- Inbox list: back ‹, title **"Inbox"**, an archive-box icon top-right (or ☰ menu → **Archive**, **Message requests**). Chips: **Newest ⌄** · **Purchases** · **Unread** (sellers also get **Customer Support** and **Whatnot Support** tabs). Rows: 48 px avatar (stacked avatars for groups, with the item thumbnail behind for support requests), name 17 semibold · time grey, preview (e.g. "Support Request" / "Awaiting seller response" / "nickki shared a show" / "You: omg I know…"), a red unread dot on the right. A floating yellow **"✎ Compose"** pill (bottom-right) → "New Message": "Search username..." → **Start message**. Groups up to 20 (buyer) or 32 (seller).
- Thread: back, title (username, or "Support Request" + grey subtitle "Awaiting seller response"), "?" escalate (support only), "…" (Mark unread, Archive, Block, Report). Header block: avatar 96, display name, username, a grey "View Profile" pill, date separator "Today, 8:10 AM". Bubbles (mine right black or yellow [I], theirs left grey). A shared show or listing renders as a card. Support "Request Details" renders as a dark card (reason, description, "Items in Request (1)" with item thumb, order #, price, ▶). Composer: gallery icon, camera icon, a pill input **"Message seller..."**, send.
- DMs off → "Turn on Direct Messages" (Account Controls → Settings).
- TR: `Gelen Kutusu`, `Yeni Mesaj`, `Mesaj İstekleri`, `Arşiv`, `Okunmadı olarak işaretle`.

### S68 Rewards Hub (gift icon) [V]
- Top: back ‹ (grey circle), right-side balance pills: an orange gift coin "**$0**" (credit) and a yellow W coin "**10**" (points).
- Title **"Earn Rewards & Unlock Perks"** (24 semibold).
- Underline tabs: **Referrals · Challenges** (red dot when new) **· Points Shop · Coupons**.
- **Challenges**: "Points Challenges" + "Ends: 15h 32m ⓘ", grey "Progress updates can take a few minutes". A 2-column grid of grey cards (radius 20): a top-right points chip "🪙 200", a 3D icon, title 20 medium centered ("Double-tap 5 times in shows", "Make 3 Purchases", "Follow 3 Sellers", "Save 3 Shows", "Enter a giveaway", "Swipe to bid…"), a segmented progress (3 capsules, yellow→orange filled) + "2 of 3". Daily reset; points never expire.
- **Points Shop**: "Jumbotrons" + "View Collection ›", grey "Live purchased announcement", a hero dark card (animated preview, "🪙 12,200", name "**Cheer Cyclone**", a yellow **View** pill), a thumbnail strip (selected = dark tile). "Reactions" + "View Collection ›", cards with a yellow "New" tag.
- **Referrals**: "Give {X}, Get {Y}", "Invite your friends", a referral link + **Copy** / **Share**, "View referral history", credit balance and history. Seller variant "Invite a seller, earn {amount}".
- **Coupons**: coupon cards (seller avatar, "10% off up to ₺100", "Min. ₺500", "Expires {date}", "See terms").
- TR: `Ödüller`, `Davet Et`, `Görevler`, `Puan Mağazası`, `Kuponlar`, `Ödül Kazan, Ayrıcalıkların Kilidini Aç`.

---

## 9. Account and settings

### S70 Account tab [V][H]
- Header: avatar 56, **username ⌄** (24 bold; the chevron opens the account switcher "Switch Role"/teams [W]), a black small pill **"View Profile"** under the name. Top-right ☰ "two lines" icon → Settings [H].
- Section label "Account" (20 semibold).
- Two tiles side by side (grey `#F2F2F2`, radius 12, icon top-left): **"Referrals & Credit"** / "Balance: **$10.00**" (green) and **"My Rewards"** (crown) / "Coupons: **12**" (green).
- Rows (40 px grey icon circle + title + ›), in order [V][H]:
  1. Account Health (shield-check)
  2. **Payments & Shipping** (card) → S71
  3. **Addresses** (pin) → S72
  4. **Notifications** (bell) → S74
  5. Change Email (envelope)
  6. Change Password (lock)
  7. **Preferences** (gear) → S75
  8. **Account Controls** (time/spend limits) → S76
  9. **Verified Buyer** → S77
  10. User Reports (report status: All / Submitted / Closed)
  11. Contact Us / Help Center
  12. Change Phone [H] · Download Orders History [W] · Log Out ("Sign Out") [W]
- Sellers additionally get "Switch to Selling" / Seller Hub entry and "Seller Tools" toggle (Preferences).
- TR: `Hesap Sağlığı`, `Ödeme ve Teslimat`, `Adreslerim`, `Bildirimler`, `E-posta Değiştir`, `Şifre Değiştir`, `Tercihler`, `Hesap Kontrolleri`, `Doğrulanmış Alıcı`, `Şikayetlerim`, `Yardım & İletişim`, `Çıkış Yap`, `Davet & Bakiye`, `Ödüllerim`.

### S71 Payments & Shipping [V]
A sheet or screen titled **"Payments & Shipping"**. Grey "This is required in order to place a bid, order or buy a product on a show. We charge your card if a bid or offer is accepted." Rows: 💳 **Payment Method** "amex - 0112 - 01/2032" › ; 🚚 **Shipping Details** "1234 Coolcat Lane / Somewhere, AB 12345-6789" ›. Section **Shipping Preferences**: an outlined card "Allow Signature Confirmation" + "Shipments may require signature in order to be delivered." + a toggle (green when on). Off → red outline + a pink alert "You may not be eligible for refunds on high-value shipments." Also **Weekly Bundling** (toggle) [H]. TR: drop signature confirmation, replace with "Kapıda teslim / Kargo şubesinden teslim" preference.

### S72 Addresses [H][W]
List with a "+" (top-right) and saved addresses (the default one tagged "Default"; ⋯ → Edit, Delete, "Set as default address"). Add form (Whatnot fields: Full name, Address Line 1, Address Line 2, City, State, Postal Code, Country, Phone, then the "We found this address for the one you entered" verification with "Accept suggested address" / "Edit entered address").
**TR form**: `Ad Soyad*`, `Telefon* (+90)`, `İl*` (81 il picker), `İlçe*` (dependent picker), `Mahalle*` (dependent picker), `Açık Adres*` (sokak, bina no, daire), `Posta Kodu`, `Adres Başlığı` (Ev / İş / Diğer), toggle `Fatura adresim aynı`, invoice type `Bireysel / Kurumsal` (Kurumsal: `Firma Adı`, `Vergi Dairesi`, `Vergi No`), `TC Kimlik No` (optional, required for e-arşiv above the legal threshold).

### S73 Payment methods [H]
Types: Credit or Debit Card ("New Card"; Saved: "View More", Edit → remove), Apple Pay (iOS), Google Pay (Android), PayPal, Venmo. Default handling: "Are you sure you'd like to make this payment method your default?" [W]. TR: Kart (Visa/MasterCard/Troy), Apple Pay, Google Pay; 3-D Secure step.

### S74 Notification settings [H]
Grouped **Buyer** / **Seller** / **General** sections of toggles: Followed Users go live, Recommended shows, Saved shows & products, Saved searches, Mentions, New followers, Offers, Order updates, Messages, Promotions; per-channel (Push / Email / SMS) [I].

### S75 Preferences / Settings [H][W]
Toggles: Direct Messages, Activity status, Sync contacts, Suggest account to others, Private entry, Display Rewards Club Status, Seller Tools (sellers), Language selector [W], Cookie or ads personalization ("Personalized advertising") [W]. Section **Account Management** → **Delete Account** (reason picker).

### S76 Account Controls [H]
A screen with an Account Control PIN. Cards **Watch Time** (this week / this month totals; "Set Reminder", "Set Limit") and **Spend** (week / month totals incl. taxes and shipping; reminder or limit). A Settings tab with DMs, Private Entry, Activity Status. Limits can't be removed once hit; they reset at period end. Full-page notifications "Watch limit reached" / "Spend limit reached".

### S77 Verified Buyer [H][W]
Status ("You are a Verified Buyer ✓" or "Become a Verified Buyer"), upload-ID flow ("Verify With Photo ID") or a card pre-authorization hold. TR: TC Kimlik / e-Devlet (or NFC ID read) + a ₺100 provision.

---

## 10. Seller side

### S80 Sell tab (non-seller) [H][W]
A landing screen: hero "Sell live. Grow fast." (yellow background), benefits ("Sell in seconds, not days or weeks", "Sell to the best buyers in the business", "Keep more of what you earn" / "Whatnot's 8% commission is one of the lowest in the industry"), CTA **Get Started** → application:
1. Short questions about experience and plans ("How do you promote your items?", "How long was your season…").
2. Agree to Community Guidelines.
3. "Which category will you sell in most often?" → "Which subcategory will you sell in most often?"
4. Selling experience level.
5. "What's your return address?" (legal name as on ID + fulfilment address).
6. Submit → instant approval or "under review" email.
Then an in-app **first-show checklist**: schedule your first show, add listings, add a payout method, verify identity ("Verify your account to go live!"), test with Rehearsal Mode. TR: KYC with TC Kimlik + IBAN; seller type Bireysel / Şahıs Şirketi / Limited-AŞ (for invoicing).

### S81 Seller Hub (tab) [H]
- Header "Seller Hub" + **☰ menu** top-right.
- Top quick actions: **Schedule a Show**, **Create Product** (a.k.a. "Create a Product"), "List an Item" [W].
- **Upcoming Shows** horizontal cards (thumbnail 9:16, date, "Start Show", ··· More → Edit Show / Cancel Show / Share).
- To-do and alerts: "Ship your orders" (n Needs Label), pending offers, cancellation requests (! icon), "Your payout will be available by {date} if you ship all qualifying orders."
- Summary cards: sales this period, orders, account balance.
- Lower list entries: **Orders**, **Shipments**, **Inventory**, **Payouts** (Transactions / Ledger), Analytics (web only).
- ☰ menu sections [H]: Shows (Upcoming / Past → replays), Inventory (Active / Inactive / Drafts), Sales › Orders / Fulfillment ("Ready to Ship", "Confirm Drop-Off" scanner), Shipments, Offers, Payouts ("Start Payout", Early Payout), Marketing (Coupons, Promote), Rewards Club, Invite a Seller & Earn, **Settings**: Shipping Settings (Shipping Profiles, Shipping Costs, Free Pickup, Domestic Shipments, Default Label Options), Seller Status (Gated Categories, Verified Brand), **Rehearsal Mode**, Vacation Mode (toggle), Team Permissions.
- TR: `Satıcı Paneli`, `Yayın Planla`, `Ürün Oluştur`, `Yaklaşan Yayınlar`, `Siparişler`, `Gönderiler`, `Envanter`, `Ödemeler`, `Teklifler`, `Kargo Ayarları`, `Tatil Modu`, `Prova Modu`.

### S82 Schedule a Show form [H]
Fields in order: **Show name** (title), **Date** + **Time**, **Category** (primary; "Shows only appear in the selected category"), **Primary selling format** (Auction / Buy It Now / Breaks / Giveaway-heavy…), **Thumbnail or preview video** (9:16, 1080×1920; defaults to the profile photo), **Tags** (Show tags such as "$1 Starts", "Sudden Death", "Graded Cards"), **Moderators** (add users), **Repeat** schedule, **Shipping settings for this show** (Free shipping / buyer pays max / Free Pickup), **Content settings**: Explicit content (strong language) flag, **Mute words**, **Visibility**: Public / Private (private shows show a lock next to the viewer count; shared via link), "Require Verified Buyers". CTA **Publish** (or Save). Afterwards: "Add listings" to the show's Live Shop, "Share" (copy link), "Show Notes" sticky editor.

### S83 Create Product (listing form) [H]
Sections: **Category** (+ subcategory), **Photos/Videos/Scan** (up to N photos, video ≤30 s, barcode or slab scan), **Title**, **Description**, **Condition** (category-specific: New with tags, New without tags, Pre-owned – Excellent/Good/Fair; TCG: Near Mint…), **Quantity**, **Variants** (size/color), **SKU**, **Cost Per Item** (private), **Shipping Profile** (weight tiers), Hazardous materials toggle, **Pricing**:
- Buy It Now: Price* · Accept offers · Flash Sale (discount type %, or amount off, duration, "Available for full price", max per buyer) · Reserve for Live.
- Auction: Starting Bid* · Reserve for Live (auto) · Sudden Death · Disable pre-bids.
- Giveaway (from inside a show only): type Standard / Followers Only / Buyer Appreciation, international entry.
Buttons **Publish** / **Save Draft**.

### S84 Orders / Shipments / Payouts / Inventory (brief) [H]
Orders: filter by status, row → order (buyer, items, earnings, "Message the buyer", cancel). Shipments: filters "Needs Label", show filter, ✎ edit package (weight, dimensions, flat-rate), **Generate label** → print (4×6), bundle or unbundle, "Confirm Drop-Off" camera scan. Payouts: Account Balance, "Start Payout", Transactions tab (Processing, Completed, Withdrawals), Statements. Inventory: Active / Inactive / Drafts, multi-select bottom bar (Deactivate, Delete, Add to show). TR carriers: **Yurtiçi Kargo, Aras Kargo, MNG Kargo, PTT Kargo, Sürat Kargo, HepsiJet, Kolay Gelsin, DHL eCommerce TR**; label = barcode/QR "gönderi kodu" for drop-off.

### S85 Go Live (pre-live) [H][I]
Seller Hub → upcoming show → **Start Show**. A camera preview (front/rear switch, flash, Facecam, zoom 0.5×/1×/2×), a mic check, a title strip, a checklist ("Always have something pinned or running" tip [W]), and a red or yellow **"Go Live"** button with a 3-2-1 countdown. Option "Use two devices", OBS stream key (web).

### S86 Seller live console (host view) [V][H]
The same skeleton as S20 with host additions:
- Top-left: the **Show Notes** sticky (editable); a multicast pill if multicasting.
- Top-right: the viewer count → **stats + viewer sheet** (S31 host view: Sales/Orders, Watching/Activity, chips All/Auction/Giveaway/Offers/Label).
- Chat with a **filter caret (^)** above the chat: Questions (highlighted yellow), Buyers, Mods, Muted. Moderation commands: `/announce <msg>`, `/hide <msg>` (mods only), `/slow <seconds>`, `/raid <username>`.
- Right rail: More (… → Zoom Camera, Facecam, Seller Tools, **Raid**, Share screen, **End Show**), Share, **Promote** (boost the show; credits), Shop (inventory).
- The Shop (host) has tabs **Auction · Buy Now · Giveaway** (+ Sold/Unsold); per row: pin icon (yellow when pinned), **Start Auction**, Product Actions → Pin item / Start Flash Sale / Run as Auction / Run Giveaway; "+" → Create Listing / Import from Inventory.
- The bottom card shows live bids, active participants, the highest bidder and the timer; when ended, "Sold for $X" + "Run again / Next item".
- Giveaway running: host-only countdown, "End Giveaway", "Draw Winner".

### S87 Start Auction sheet [H][W]
Fields: **Starting Price** (Starting bid), **Auction Duration** (presets e.g. 5 s, 10 s, 15 s, 30 s, 1 m, 2 m, 5 m [I]; "many auctions are 30 seconds or less"), **Counter-Bid Time** (default 10 s; when fewer than 10 s remain, each new bid resets the timer to this amount: "any bid in the last 10 seconds extends the timer back up to 10 seconds"), **Sudden Death** toggle (💀; ends at 00:01 with no extension). CTA **Start**. Once started an auction can't be cancelled. Other formats in the catalog: "Reverse Auction" (price drops until the first bid) and "Anytime Auction" (outside lives) [W].

### S88 Raid / End Show [H][W]
More → **Raid** → list "Recommended" live sellers + search ("Select raid") or "Pick for me" → **Raid Now** → confirm "Starting this Raid will end this show and send {n} viewers to…" → Continue. **End Show** → confirm. "You can restart your show within 2 hours." The post-show summary [I]: Sales, Orders, Viewers, Avg watch time, New followers, "Ship your orders" CTA.

### S89 Rehearsal Mode [H]
Seller Hub → ☰ → Settings → Rehearsal Mode: a guided tour + a simulated show with demo products and test bidders; practice pinning and auctions.

---

## 11. Turkish terminology and formatting guide

| Whatnot term | Recommended TR | Note |
|---|---|---|
| Live show / Show | **Canlı Yayın** / Yayın | Badge: `CANLI • 436` |
| Auction | **Mezat** / Açık Artırma | The brand is "Mezat", so use "Mezat" in UI chips ("Mezat", "Ani Ölüm Mezatı") |
| Bid / Swipe to bid | **Pey** / Pey ver (kaydır) | Traditional mezat word; avoids a clash with "Teklif" (offer). Fallback: "Teklif ver". |
| Custom / Max Bid | **Özel** / **Maks. Pey** | |
| Pre-Bid | **Ön Pey** | |
| Sudden Death | **Ani Bitiş** 💀 | |
| Buy It Now | **Hemen Al** | |
| Make Offer / Offer | **Teklif Ver** / Teklif | Counter offer = Karşı Teklif |
| Flash Sale | **Flaş İndirim** | |
| Giveaway | **Çekiliş** | Check legal status in TR |
| Breaks | **Kutu Açılışı (Break)** | Keep "Break" for collector slang; PYT = "Takımını Seç" |
| Shop | **Mağaza** | |
| Wallet | **Cüzdan** | |
| Follow / Following / Followers | **Takip Et / Takipte / Takipçi** | |
| Seller Hub | **Satıcı Paneli** | |
| Shipping + Taxes | **+ Kargo** (prices KDV dahil) | Show "KDV dahil" on totals |
| Avg ship time "<1d" | **<1 gün** | |
| Viewers | **izleyici** | 1.3K → `1,3B` |
| Sold | **Satıldı** | |
| Awaiting Next Item | **Sıradaki ürün bekleniyor** | |
| Show starts in | **Yayın başlıyor:** 6g 1s 9dk | |
| Buyer Protection | **Alıcı Koruması** | |

- Currency: `₺1.250` (no decimals when whole) or `₺1.250,50`; thousands separator ".", decimal ",". Locale `tr-TR`.
- Dates: `14 Şub 2026`, `Bugün 20:00`, `Yarın 15:00`. 24-hour clock.
- Phone: `+90 5XX XXX XX XX`.
- **Bid increments**: Whatnot shows "the next valid bid", which grows with the price (observed pairs: $1→$1 opening, $32→$34, $35→$40, $201→$210). Proposed TRY table for mock logic: ₺0–99 → +₺5 · ₺100–499 → +₺10 · ₺500–999 → +₺25 · ₺1.000–4.999 → +₺50 · ₺5.000–9.999 → +₺100 · ₺10.000+ → +₺250. Round the next bid up to a clean multiple.
- **Timer rules for the mock engine**: standard = configured duration; any bid when ≤10 s remain resets to 10 s (the counter-bid time). Sudden death = no extension; show 💀. Timer text `00:29` in yellow; the last 5 s may pulse red [I].

---

## 12. Mock data needed (for the build agent)

- **Users/Sellers** (≥20): id, username (lowercase), displayName, avatar, banner, bio, rating (4.5–5.0), reviewCount, soldCount, followerCount, followingCount, avgShipDays (`<1`, 1, 2), isVerified, rewardsClub (tiers), isLive.
- **Categories**: the 31 top-level categories with TR names, 3D image (emoji or PNG placeholder), viewerCount, subcategories (the tree from the web: e.g. TCG → Pokémon, Magic, Yu-Gi-Oh!, One Piece, Disney Lorcana, Dragon Ball, …; Sports Cards → Futbol, Basketbol, …).
- **Shows**: id, sellerId, title (emoji-rich TR, e.g. "🔥₺10'dan BAŞLAYAN POKÉMON KARTLARI 🔥"), coverImage (3:4), categoryId, tags[], status (`live` | `scheduled` | `ended`), viewers, startTime, saveCount, isFreeShipping, format badges (PYT, Free Shipping), isBoosted, shareCount, showNotes.
- **Listings**: id, showId?, sellerId, title, images[], description, condition, quantity, format (`auction` | `bin` | `giveaway`), startingBid, currentBid, bidCount, price, acceptsOffers, flashSale {discount, durationSec}, shippingPrice, saveCount, views.
- **Chat script** per live show (looped): usernames, messages (TR), joins, questions, mod messages, tips.
- **Auction simulator**: bot bidders, a timer with counter-bid reset, the winner announcement, "Sold".
- **Orders** for Activity with all statuses + tracking timelines (carrier, tracking no., events), receipts.
- **Bids / Offers / Saved** fixtures; **Notifications** (Today / Yesterday / Earlier); **Inbox** threads incl. one support request; **Rewards** (points 10, credit ₺0, 6 challenges, 1 Jumbotron); **Addresses** (TR samples, e.g. "Kadıköy, İstanbul", "Çankaya, Ankara"); **Payment methods** (Visa •••• 4242, Troy •••• 1234, Apple Pay).
- **Seller Hub**: upcoming shows (3), inventory (15 listings), orders needing labels (5), balance ₺12.480, payouts history.

---

## 13. Evidence index (local copies; not committed)
- App Store screenshots (5 + Buyer Protection): live auction, home, giveaway winner, categories, host stats.
- Help-center screenshots: product page + pre-bid, Activity + order detail, rate purchase, cancel dialog, Rewards Hub (Challenges + Points Shop), video receipt (dark), BNPL checkout, Top Seller leaderboard (Home section + full page), Party Purchase (3 phones), Free Pickup (live tooltip + Delivery Methods + Pickup Details), Inbox/support flow, Account menu + Payments & Shipping, Wallet sheet + Add payment method, live bid card, search results + Saved, change order address, payment-declined sheet, Show Notes + "Show starts in", Community Boost, Boost Seller sheet, Clip flow, Sorting Labels.
- Lazyweb captures (Jan/May 2026): splash, "Sign up for Whatnot", Google OAuth, "Finish Signup / Verify your phone number", dark Home (non-seller tab bar with **Sell**), first-show coachmark, "Tap on a show to start shopping / Got It".
- Web: /browse (tabs Recommended / Popular / A-Z + viewer counts), /tag/trading_card_games (subcategory tiles, Follow, Recommended / Top Sellers / New and Noteworthy, show-card markup), /user/pranksybreaks (profile header + Shop / Shows / Reviews / Clips + review rows), /listing/* (listing sections), full category tree, design tokens from CSS, about 6,700 i18n strings.
