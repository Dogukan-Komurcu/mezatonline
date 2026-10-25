# Whatnot seller side: research and spec for Mezatonline

Research date: **2026-10-26**. Main source: the full Whatnot Help Center. All 300 articles in the en-us help center were pulled through its public Zendesk API and read; 120+ of them are about selling. Secondary sources: Seller Academy "Go Live Guide" (selleracademy.whatnot.com/guide), Value Added Resource articles, and third-party seller guides (Closo, Nifty, Vendoo, Crosslist). whatnot.com/sell, Medium and Reddit returned 403 to scripted access, so they are not quoted.

Confidence tags used below:
- **[HC]** comes verbatim or near-verbatim from a help.whatnot.com article that was current in Oct 2026.
- **[SA]** comes from Seller Academy, an older page from about 2023–24.
- **[3P]** comes from a third-party guide.
- **[INF]** means the exact value isn't published. It is inferred, or remembered from the app, and should be treated as a design recommendation.
- **TR:** marks a Turkey localization note or a proposed Turkish copy string.

The existing code already has `src/lib/auction.ts` (durations, increment table) and `src/lib/pricing.ts` (8% commission, 2.9% + ₺3 processing, 4 shipping profiles). This doc points out where Whatnot differs from those so the team can align them.

---

## 0. TL;DR: the most important rules to replicate

| Area | Whatnot rule | Source |
|---|---|---|
| Ship SLA | Ship within **2 business days** (weekends and holidays excluded). An order counts as "shipped" at the **first drop-off scan**, not at label creation. | HC |
| Commission | **Tiered by 4-week (28-day) sales**, per category. US Standard is **8%** (Coins 4%), going down to 6.5% / 4.5% / 5% / 4% at Tier 6. It is charged on **item price only (GMV)**, not on shipping or tax. New structure since **Sep 21 2026**. | HC |
| Payment processing | US/CA/AU: **2.9% + $0.30** on the **total buyer-paid amount** (item + shipping + tax). EU/UK: **2.42% + €/£0.25 + VAT**. | HC |
| High-value | **0% commission on the part of an order above 1,500** (USD/EUR/GBP) in collectible categories, plus Bags and Jewelry. | HC |
| Payout | Earnings stay **Processing** until delivery is confirmed (+ ≤4 h; EU/UK also need ≥96 h after the sale), then become **Completed** (available). The seller starts the payout manually and it lands in **1–2 business days**. | HC |
| Early Payout | Earnings become available at **label generation**. Eligibility is based on rating, lifetime shows and lifetime sales/orders, and is reviewed every 24 h. | HC |
| Auction | Seller sets **Starting bid, Auction time, Counter bid time**, plus an optional **Sudden Death** toggle. Under 10 s left, a new bid resets the timer to the counter-bid time. Sudden Death ends at 00:01 without extension, with a 💀 next to the timer. **A started auction can't be cancelled.** Most auctions last ≤30 s. | HC |
| Pinning | One pinned product at a time. Starting an auction or flash sale auto-pins it. You can't pin while an auction runs. **Mods can't pin.** | HC |
| Giveaway | Up to **5 minutes**. Can't be paused or cancelled. One at a time. **Seller pays shipping, deducted when it runs.** Types: Standard, Followers-only, Buyer Appreciation. Only the host sees the timer. | HC |
| Cancel | Buyer can request within **24 h**; the seller has **48 h** to accept/decline. A seller-initiated cancel fee is **max(3 currency units, 3%)**; the first one is waived. | HC |
| Shipping adjustments | **5 free per week**. Reset: US Sunday 7 pm ET, rest of world Monday 00:01 UTC. | HC |
| Ratings | Buyers can rate for **30 days after delivery**. The seller can reply **once** and can't edit the reply. | HC |
| Account Health | On-Time Scan Rate (≥80%), Refund-Free Rate (≥97%), Cancellation-Free Rate (≥99%), SPS Response Rate (≥80% weekly). | HC |
| Premier Shop | 90+ days selling, and in the last 90 days: ≥10 shows, ≥250 orders, ≥$50k sales. Performance: ≥95% on-time, ≥99% defect-free, ≥95% SPS response. Evaluated monthly. | HC |

---

## 1. Seller lifecycle (end-to-end flow)

```
Buyer account → "+ Sell" → Apply (≈ minutes) → Seller access granted
  → In-app first-show checklist: Schedule show → add listings → verification (phone OTP, payment method, gov ID) → shipping check
  → First live show (unlocks full Seller Hub + Rehearsal Mode)
  → Live: pin / auction / BIN / flash sale / giveaway / offers / moderation
  → Post-show summary → Orders & Shipments → (cancellation requests) → labels + packing slips → pack → in-app drop-off scan
  → Delivery → earnings Processing → Completed → Start Payout → bank (1–2 business days)
  → Ratings (30 days), Seller Provided Support requests (respond ≤2 business days)
  → Account Health, Analytics, commission tier (28-day), Premier Shop (monthly), Early Payout (daily check)
```

---

## 2. Seller application and onboarding

### 2.1 Entry points [HC]
- App: on the home screen, tap **"+ Sell"** at the bottom of the screen, then **"Get Started"**.
- The help center describes Seller Hub as reachable "from the app or whatnot.com".
- After approval, the bottom-bar "+ Sell" item becomes **Seller Hub** [INF, consistent with HC phrasing "Tap Seller Hub at the bottom of the screen"].

### 2.2 Application steps, in order [HC: "Apply to sell on Whatnot", updated 2026-10-25]
1. **Start**: "+ Sell" → "Get Started". The seller answers a short series of questions about experience and selling plans.
2. **Agree to Whatnot's Guidelines**, meaning the Community Guidelines (checkbox/agree).
3. **Choose your primary seller category.** This later drives default commission display ("If you haven't sold yet, we'll show the category you selected when you signed up").
4. **Tell us about your selling experience.** Single-select experience level, for example "brand new" vs "already selling elsewhere".
5. **Enter your return address.** Full legal name exactly as it appears on the government ID, plus the fulfillment address. That address is used to calculate buyer shipping, partly by distance. After approval the seller can switch to a business name or alias in Seller Hub. A PO Box is allowed if the name field has ≥2 characters.
6. **Submit.** "Many sellers unlock seller access within minutes." If more review is needed, the next steps come by email.
7. **Next**: "follow the in-app checklist to schedule your first show."

Older and third-party guides describe extra fields: links to other selling platforms (eBay/Mercari/etc.), a main social account, inventory photos/videos (1–3+), a 30–60 s intro video, and "why Whatnot" text. These fields still appear in the denial reasons (2.4), so include them as **optional** fields [3P + HC].

### 2.3 Eligibility [HC]
- The seller must live in a supported country. Sellers: AU, AT, BE, CA, FR, DE, JP (pilot), NL, UK, US (incl. PR/USVI). Turkey isn't supported.
- Age ≥13; ages 13–17 need a parent/guardian, a special application and a verified parent account. **All account holders who verify as sellers must be 18+** (from the verification article).
- Bank country and currency must match the registration country. A separate account is needed per selling country.
- A seller can go live while travelling inside the approved country only.
- APO/FPO military addresses can't be the shipping origin.

### 2.4 Denial reasons and reapply rule [HC: "Reasons seller applications aren't approved"]
**Reapply allowed after 30 days** for:
- Incomplete application (missing or broken seller links, too few photos, too little "why Whatnot")
- Product quantity
- Product quality
- Lack of selling experience
- Unsupported country
- Unsupported products

**Ineligible to reapply** for:
- Application deception (photos or links that aren't yours)
- Product authenticity (counterfeits)
- Under 13
- Inappropriate content
- Reputation (consistent negative reviews elsewhere)
- Trust & Safety violations, including related accounts

Mock UI: application status values `pending_review | approved | denied(reason, reapplyAt)`.

### 2.5 Seller verification, required before the first go-live [HC]
- **Phone number**: OTP during signup or from the seller dashboard.
- **Payment method**: card, bank account, or a supported payout method.
- **Government photo ID**: driver's licence or passport, through Stripe or Persona (KYC).
- HC copy: "Before going live you'll need to complete our seller verification process. It only takes a few minutes."

### 2.6 Unlocks and first-show gating [HC]
- "You'll unlock full Seller Hub access after you complete your first show checklist and go live."
- New sellers may not see Seller Hub or Rehearsal Mode until after their first live show.
- **Rehearsal Mode** (Seller Hub → menu → Settings → Rehearsal Mode) is a guided tour with preloaded demo products, simulated bids and simulated chat. The seller can practise pinning and auctions against test buyers.
- **Private show**: real purchases are still possible. Anyone with the link can join. A lock icon appears next to the viewer count.

### 2.7 Gated categories [HC]
Apply via Seller Hub → menu → Settings → **Seller Status** → **Gated Categories** → Apply Now. Current gated list:
- Luxury Bags & Accessories (named brands: LV, Hermès, Chanel, etc.)
- Luxury Watches (long brand list)
- Supplements
- Meat & Seafood / Specialty Food
- Surprise Sets in Sneakers & Streetwear (closed)
- Surprise Sets in Bags & Accessories (closed)
- Wholesale

Buyers can see a seller's "Seller's Category Permissions" in the report sheet.

### 2.8 New-seller incentives [HC]
- **New Seller Sales Match Bonus.** Whatnot pays 1 unit for every 1 unit of eligible live sales, up to a cap shown in the app. A home-feed banner shows progress, time left and the max bonus. The bonus period starts when selling access is granted and can't be restarted. Requirements can include a minimum live time and a minimum number of unique buyers. The bonus is paid within 14 days after the period ends and all qualifying orders have shipped, and shows in the ledger as "New Seller Sales Match Bonus". Exclusions: local pickup and private shows. Household cap: **$/£/€1,500 per year**. An older version (2024) matched the first $150, with 2 h live and 5 unique buyers required.
- **Rising / Power / Super Seller Bonus.** Offered after the first sale or after the Sales Match period. The seller picks one of three 7-day goals, and the goal is locked once picked. Illustrative values: Rising $250 sales → $50 bonus; Power $750 → $150; Super $2,500 → $500. Requirements: ≥3 h live, N unique buyers (e.g., 10), and all orders shipped. Marketplace orders, giveaways, private shows and local pickup are excluded.

**TR (onboarding):**
- Country lock: Turkey only, currency **TRY (₺)**, timezone **Europe/Istanbul (UTC+3, no DST)**.
- KYC fields: **Ad Soyad (kimlikteki gibi)**, **T.C. Kimlik No (11 hane, checksum)**, **Doğum tarihi** (enforce 18+, no teen selling at MVP), **Cep telefonu (+90 5XX XXX XX XX)** with SMS OTP, **E-posta**, **IBAN (TR + 24 hane)**.
- Seller type selector: **Bireysel Satıcı** (individual, TCKN) / **Şahıs Şirketi** (VKN + Vergi Dairesi) / **Limited / Anonim Şirket** (Ticari Unvan, VKN, Vergi Dairesi, MERSİS No). These map to iyzico/PayTR "alt üye işyeri" (sub-merchant) types.
- Return address in Turkish format: İl / İlçe / Mahalle / Cadde-Sokak / Bina No / Daire No / Posta Kodu (5 hane) / Adres tarifi.
- Legal consents:
  - KVKK Aydınlatma Metni (read)
  - Açık Rıza (checkbox, separate)
  - Satıcı Sözleşmesi
  - Topluluk Kuralları
  - (optional) Ticari Elektronik İleti onayı (İYS)
- Proposed copy:
  - "Satış yapmaya başla"
  - "Başvurunu birkaç dakikada tamamla"
  - "Birincil satış kategorini seç"
  - "Satış deneyimin nedir?" with the options "Yeni başlıyorum", "Başka platformlarda satıyorum (Sahibinden, Dolap, Trendyol, Instagram…)", "Fiziksel mağazam var"
  - "İade adresin"
  - "Başvurunu gönder"
  - "Başvurun incelemede — genellikle birkaç dakika sürer"
- Mock: auto-approve after about 3 s (Whatnot's "within minutes"), then show the **İlk Yayın Kontrol Listesi**:
  1. Yayın planla
  2. Ürün ekle
  3. Kimliğini doğrula
  4. IBAN ekle
  5. Kargo ayarlarını kontrol et
  6. Yayına geç

---

## 3. Seller Hub: information architecture

### 3.1 App (iOS/Android) [HC, assembled from navigation paths across 60+ articles]

**Bottom tab "Seller Hub"**, home screen:
- **Commission tier tracker**: "Your pace toward the next tier, your current tier, and your projected rate are all on the Seller Hub home page." [HC]
- **Upcoming Shows** list. Each show has a ⋯ More menu with Edit Show / Cancel Show / Share, plus Start Show.
- Primary actions: **Schedule a Show**, **Create Product** (labelled "Create a Product" in some articles).
- Banners: New Seller Sales Match Bonus, Super Seller challenge, first-show checklist.
- Lower down: **Orders**, **Payouts** (the HC says "Scroll down and tap Orders/Payouts").

**Top-right ☰ menu**, grouped. HC mentions the groups "Manage", "Sales", "Settings" and "Selling" on Android.
- **Manage**:
  - **Shows** (Upcoming / Past)
  - **Inventory** (Active / Drafts / Inactive tabs + Manage bulk mode)
  - **Offers**
  - **Tips**
  - **Rewards Club**
  - **Account Health**
- **Sales**:
  - **Orders**
  - **Fulfillment / Shipments** (filter **Ready to Ship** → **Confirm Drop-Off** scanner)
  - **Payouts** (tabs: Payouts/History, **Transactions**; Account Balance; Early Payout eligibility; Start Payout; Add/Edit Payout → Stripe Connect)
- **Grow**:
  - **Invite a Seller & Earn**
  - Promote (lives in the show screen)
- **Settings**:
  - **Shipping Settings** (Shipping Costs, domestic services, Free Pickup, Shipping Profiles, custom profiles toggle)
  - **Seller Status** (gated categories, Verified Brand)
  - **Rehearsal Mode**
  - **Vacation Mode** toggle

### 3.2 Web (whatnot.com/dashboard), left menu [HC]
- **Home** (tier tracker, pace, projected rate)
- **Shows**: Upcoming / Past. Per show: Copy show link, Edit, Restart Show (Past, ≤2 h), "View and clone items from this show".
- **Inventory**:
  - Create Product
  - Import from CSV
  - Tabs: Active / Drafts / Inactive
  - Bottom bulk bar: Add to Show, Duplicate, Deactivate, Delete
  - Sub-page **Offers**
- **Orders**: filters "All Shows & Marketplace", Order Status, Cancellations / Pending Cancellation. The right sidebar has order details, the fee breakdown and the Video Receipt.
- **Shipments** (▼ sub-items):
  - **Shipping Profiles**
  - **Shipping Settings** (US)
  - Carrier Adjustments dashboard
  - The sidebar ("Open Sidebar") holds **Default Label Options**, Label adjustment allowance, Weekly Bundling toggle, and Show Actions → Export Show Report (CSV).
- **Financials / Finances** (HC uses both names):
  - **Payouts**
  - **Ledger**
  - **Statements** (monthly, annual, weekly orders report)
  - Statements & Reports → Digital Platform Reporting
  - **Tax Documents**
  - **VAT Invoices**
- **Analytics**: Overview / Shows tabs, plus a Premier Shop tab.
- **Marketing**: Coupons, Promote Tools dashboard.
- **Rewards Club**
- **Party Purchases** (beta)
- **Tips**
- **Account Health**
- **Seller Referral**
- **Settings** → **Team** tab (Team Permissions)
- **Support Chat** (Whatbot)

### 3.3 TR menu labels (proposed)

| Whatnot | Mezatonline (TR) |
|---|---|
| Seller Hub | **Satıcı Paneli** |
| Schedule a Show | **Yayın Planla** |
| Create Product | **Ürün Oluştur** |
| Shows (Upcoming/Past) | **Yayınlarım** (Yaklaşan / Geçmiş) |
| Inventory (Active/Drafts/Inactive) | **Envanter** (Aktif / Taslak / Pasif) |
| Offers | **Teklifler** |
| Orders | **Siparişler** |
| Shipments / Fulfillment | **Gönderiler** / **Kargolama** |
| Payouts | **Ödemeler** (button: **Para Çek** / **Ödeme Başlat**) |
| Transactions / Ledger | **Hesap Hareketleri** |
| Statements | **Ekstreler ve Raporlar** |
| Tax Documents / VAT Invoices | **Faturalar** (Komisyon faturaları, e-Arşiv) |
| Analytics | **Analizler** |
| Marketing / Coupons | **Pazarlama** / **Kuponlar** |
| Tips | **Bahşişler** |
| Rewards Club | **Sadakat Kulübü** |
| Account Health | **Hesap Sağlığı** |
| Seller Status | **Satıcı Durumu** |
| Shipping Settings / Profiles | **Kargo Ayarları** / **Kargo Profilleri** |
| Rehearsal Mode | **Prova Modu** |
| Vacation Mode | **Tatil Modu** |
| Invite a Seller & Earn | **Satıcı Davet Et, Kazan** |
| Team | **Ekip** |

---

## 4. Scheduling a show

### 4.1 Flow [HC: "Schedule, edit, and start a show"]
Seller Hub → (web: Shows page) → **Schedule a Show** → fill in the fields → **Publish/Schedule**.

### 4.2 Fields

| # | Field (EN label) | Required | Type / constraints | Notes | TR label |
|---|---|---|---|---|---|
| 1 | **Show name / title** | ✔ | text | SA tip: say what you sell, and put the giveaway first in the title (3P). | **Yayın başlığı** |
| 2 | **Date** + **Time** | ✔ | datetime | Schedule about 1 week ahead [SA]. Pre-bids expire 24 h after the scheduled start time. | **Tarih / Saat** |
| 3 | **Category** (+ subcategory) | ✔ | picker (tree) | "Shows only appear in the selected category." With multiple product types, pick a **primary** category. The commission rate for live sales follows the **show category**. | **Kategori / Alt kategori** |
| 4 | **Primary selling format** | ✔ | single-select | Must be accurate (Gaming Policy). Values seen: **Auctions**, **Buy It Now**, **Breaks**, **Surprise Sets** [HC; full list INF]. | **Ana satış formatı**: Açık Artırma / Hemen Al / Kutu Açılımı / Sürpriz Set |
| 5 | **Thumbnail or preview video** | optional | image/video, **9:16, 1080×1920 px** recommended | Falls back to the profile photo if none is added. Whatnot offers a "Show Thumbnail Template". | **Kapak görseli / önizleme videosu** |
| 6 | **Tags** | optional | multi-tag | "Add tags to improve your show's discoverability". Must be accurate. Max count isn't published [INF: cap at 5]. | **Etiketler** |
| 7 | **Primary Brand** | optional, select categories | 1 brand + "request a brand" form | Extra brands are auto-tagged from the listings. | **Ana marka** |
| 8 | **Moderators** | optional | username search, multi | Can also be added live by tapping a chat username → "Allow to Moderate". | **Moderatörler** |
| 9 | **Repeat schedule** | optional | recurrence | Shipping overrides carry to future instances [INF: Daily / Weekly / Custom]. | **Tekrarla** (Her gün / Her hafta) |
| 10 | **Shipping Settings** (per show) | optional | Shipping Costs (3 options) + services + Free Pickup | **Can't be changed after the show starts.** See §6. | **Kargo ayarları** |
| 11 | **Content settings → Explicit content** | toggle | | "Flag if your stream has strong language." | **Argo/küfür içeriği var** |
| 12 | **Content settings → Mute words** | list | words | Auto-hides those words from chat. Mods can still see muted messages. | **Sessize alınan kelimeler** |
| 13 | **Show Discoverability: Public / Private** | ✔ (default Public) | radio | Private: not in Home feed, no follower notifications, anyone with the link can join, purchases are real. Switching public→private notifies existing bookmarkers. | **Görünürlük**: Herkese açık / Özel |
| 14 | Rewards Club **tier-only show** | optional | min tier | Only members of that tier or higher can view and join. | **Sadece … ve üzeri üyeler** |
| 15 | **Verified Buyers** (app, from ⋯ on the scheduled show) | toggle | | Only verified buyers can bid or enter giveaways. Others can watch. | **Sadece doğrulanmış alıcılar** |
| 16 | **Disable pre-bids** (web, Edit Show) | toggle | | Anti-troll tool. | **Ön teklifleri kapat** |
| 17 | **Tip Settings** (⋯ → Tip Settings) | optional | "Send a tip" message ≤**24 chars**; toggle "Show buyer tip message in live chat" | | **Bahşiş mesajı** (en fazla 24 karakter) |
| 18 | **Show Settings → Auction Numbering by Show** | toggle | | One running "#n" sequence across all listings in the show (see §5.6). | **Yayın bazında sıra numarası** |
| 19 | **Show Notes** | optional | free text, editable live | A yellow sticky shows top-left for viewers. Edits mid-show show a "new" badge. Unpost to remove. | **Yayın notları** |
| 20 | Co-host | live only | | See §7.10. | |

### 4.3 Manage a scheduled show [HC]
- **Edit / Cancel**: Shows → ⋯ More → **Edit Show** / **Cancel Show**. Rescheduling is preferred over cancelling.
- **Share**: Shows → **Share** (app), or **Copy show link** (web). The link preview shows username, title and thumbnail. The share count appears in a bubble next to the share icon.
- **Clone Items** (iOS/web): from another past or upcoming show, clones share inventory.
- **Add listings**: Shop → **+** → Create Listing / Import from Inventory. Web: **Add** → Create Quality Listing / Create Temporary Listing / Import from Inventory / (Create a Break, Create a Surprise Set, Upload CSV).
- **Start**: Seller Hub → Shows → open the show → **Start Show**. Followers and bookmarkers get a "went live" notification **once per show**.
- **Multicast prompt** on Start (iOS/desktop): "Multicast to other platforms" → link YouTube/Facebook/Twitch → "Do you want to start this livestream?" → **Go Live**.
- **End**: ⋯ More → **End Show** → confirm. Closing the app only *pauses* the show. The raid alternative ends the show and sends viewers on.
- **Restart**: within **2 hours** of ending (web: Shows → Past → **Restart Show**). The show moves back to Upcoming and keeps its listings and bookmarks. No second "went live" push is sent.

**TR copy:**
- "Yayın Planla"
- "Yayın başlığı (ör. 🎁 Çekilişli Pokémon Kart Gecesi)"
- "Ana kategori"
- "Kapak (9:16, 1080×1920)"
- "Yayını Yayınla"
- "Yayını Düzenle"
- "Yayını İptal Et"
- "Yayını Başlat"
- "Yayını Bitir"
- "Bitirmek istediğine emin misin?"
- "Yayını yeniden başlat (2 saat içinde)"
- "Bağlantıyı kopyala"

---

## 5. Inventory and listing creation

### 5.1 Concepts [HC]
- Listing = **Product Details** (what it is) + **Listing Details** (how it is sold).
- **Formats**: **Buy It Now (BIN)**, **Auction**, **Giveaway**.
- **Where it appears**: a **Profile Shop** (storefront, always on) or a **Live Shop** (one per show).

| Format | Profile Shop | Live Shop |
|---|---|---|
| Buy It Now | ✓ default | — |
| BIN + **Reserve for Live** | — | ✓ |
| Auction (Reserve for Live forced on) | — | ✓ default |
| Giveaway | — | ✓ default (can only be created inside a show) |

- **Quality Listing** vs **Temporary Listing**. While live, image and description are optional, so the seller can list "something you are just showing on screen". **Listings without image + description disappear when the show ends.** Temporary listings aren't kept in inventory.
- Format can be switched later (BIN ↔ Auction), except for Giveaways and listings currently in use.

### 5.2 Create Product: full field list [HC "Create product listings", "Scan a barcode", "Variants", CSV]

| Section | Field | Req. | Rules | TR label |
|---|---|---|---|---|
| Product | **Category** (+ Sub Category) | ✔ | Must be the correct category. Deliberate mis-categorizing to get a lower fee counts as fee avoidance. The marketplace commission follows the **product category**. | Kategori / Alt kategori |
| Media | **Photos/Videos** | ✔ to publish (optional for live temp listings) | Photos of the actual item (no stock photos for used goods). ≥1 photo clearly showing the whole item. Video up to **30 s**. CSV allows **up to 8 image URLs**. iPhone only: **Scan a Barcode or Slab** (UPC; PSA/CGC/PCGS/NGC) auto-fills category, title, description, attributes and shipping profile. | Fotoğraf / Video (en fazla 30 sn), Barkod tara |
| Product | **Title** | ✔ | Clear; keywords help search; no keyword stuffing or clickbait. | Başlık |
| Product | **Description** | ✔ (Quality) | Accurate, about this item only. | Açıklama |
| Product | **Condition** | category-dependent | Picklists per category (see §5.3). | Durum |
| Product | **Attributes** (optional) | | E.g., graded cards: Graded toggle, Grading Service, Grade, Cert Number, Brand/Set, Variety, Card Number, Year. Comics: Series, Issue Number, Artist, Character, Publisher, Genre, Features. Coins: Product Type, Composition, Precious Metal Weight, Fineness, Mint Mark, Strike Type. Autographs must be certified by JSA/PSA/Fanatics/Beckett/BAM. | Özellikler |
| Inventory | **Quantity** | ✔ (default 1) | App: "Quantity Available", plus "Choose whether you want to list the items individually" (#1, #2 numbering). | Adet |
| Inventory | **Variants** → Manage Variants | optional | **Up to 3 options** (Size/Color/Style), **up to 2,048 variants**. Suggested or custom values. Per-variant qty, price ("Variant Override") and photos ("Apply to all"). Set qty 0 to pause. Works for Auction and BIN (incl. Flash Sale), **not Offers**. When an auction starts, the seller confirms which variant is running. | Varyantlar (Beden, Renk, Model) |
| Private | **SKU** | optional | Free format. Prints on the packing slip. CSV match key. **Can't change after the listing sells.** | Stok kodu (SKU) |
| Private | **Cost Per Item** | optional | Private. Feeds "Cost of Goods" in the Weekly Orders Report. | Birim maliyet (sadece sen görürsün) |
| Shipping | **Shipping Profile** (or "Weight") | ✔ | Pick the packed weight (item + box + padding); round up when between classes. See §6. | Kargo profili (paketli ağırlık) |
| Shipping | **Restricted items / Hazmat** | toggle/yes-no | "indicate whether your item contains hazardous materials, such as lithium batteries, fragrances, or nail polish". | Tehlikeli madde içeriyor (lityum pil, parfüm, oje…) |
| Pricing | **Format**: Buy It Now / Auction / Giveaway | ✔ | SA calls this "Sales Type". | Satış türü: Hemen Al / Açık Artırma / Çekiliş |
| BIN | **Price** | ✔ | Must not be absurdly high or low. | Fiyat |
| BIN | **Accept Offers** | toggle | Buyers see an Offer icon and can offer a % discount or a custom amount. **On by default when importing shop items into a show.** CSV column `Offerable=TRUE`. | Teklif kabul et |
| BIN | **Flash Sale** | toggle | See §7.6. | Flaş indirim |
| BIN | **Reserve for Live** | toggle | Live Shop only. | Sadece canlı yayında sat |
| Auction | **Starting Bid** | ✔ | "lowest amount you're comfortable accepting". | Başlangıç fiyatı |
| Auction | **Reserve for Live** | auto ✔ | | |
| Auction | **Sudden Death** | toggle | Ends the auction when the timer hits zero; bids don't extend it. | Ani Bitiş 💀 |
| Auction | **Disable pre-bids** | toggle (web) | Anti-troll. | Ön teklifleri kapat |
| Giveaway | **Who can enter**: Everyone / Followers only / Buyer Appreciation | ✔ | BAG: optional official rules text. **BAG can't be edited or deleted after creation.** | Kimler katılabilir: Herkes / Sadece takipçiler / Alıcılara özel |
| Giveaway | **International Shipping** | toggle | Seller pays international shipping too. | Yurt dışı (TR'de kapalı) |
| Actions | **Publish** / **Save Draft** | | Drafts can't be created from inside a Live Shop. A published listing **can't be turned back into a draft**; deactivate it instead. | Yayınla / Taslak olarak kaydet |

Note: the auction **duration and counter-bid time aren't set on the listing**. They're chosen when the auction starts live (§7.4).

### 5.3 Condition picklists [HC]
- **TCG singles and sealed**: Mint, Near Mint, Lightly Played, Moderately Played, Heavily Played, Damaged; plus Graded (slabbed).
  - TR: Mint, Mint'e Yakın (NM), Az Oynanmış (LP), Orta Oynanmış (MP), Çok Oynanmış (HP), Hasarlı, Derecelendirilmiş (PSA/CGC/BGS).
- **Apparel**:
  - New with Tags
  - New with Defects
  - Pre-owned, with sub-grades Excellent, Good, Fair (flaws must be stated on stream) and Damaged (must be stated on stream)
  - TR: Yeni & Etiketli / Yeni (Kusurlu) / İkinci El: Mükemmel / İyi / Orta / Hasarlı.
- **Electronics**: New (Factory Sealed), Very Good, Good, Fair, Used and Fully Functioning (definitions incl. battery health, accessories, HAZMAT).
- Rule: major flaws must always be disclosed, verbally or in the description.

### 5.4 Inventory management [HC "Manage your product listings"]
- Tabs:
  - **Active**: buyers can see and buy.
  - **Drafts**: only the seller can see.
  - **Inactive**: deactivated **or sold out**. "When a listing sells out, it moves to Inactive."
- **Edit**: allowed for Active, Draft and Inactive. **Not allowed** while a buyer is checking out, while its auction is running, or while it's in a Flash Sale that has started.
- **Assign to Live Show** (app) / **Add to Show** (web). Bulk on iOS is labelled "Feature in Show".
- **Duplicate** (web only): creates a separate draft with **its own inventory**.
- **Clone** (iOS/web, not Android): the same listing appears in several upcoming shows with **shared inventory**. Edits apply everywhere. Only unsold Auction/BIN listings can be cloned. Marketplace listings must use "Assign to a Live Show".
- **Deactivate / Activate**: Activate fails if the listing is reserved for live but has no show, or qty = 0.
- **Delete** is permanent. Blocked if the listing has sold, is in a running flash sale, is in an active Party Purchase, or is a running auction.
- **Bulk**: app → Inventory → **Manage** → checkboxes → Feature in Show / ⋯. Web → checkbox bar at the bottom.
- **CSV import** (web): templates per market. Columns: Category, Sub Category, Title, Description, Quantity, Type, Price, Shipping Profile, Condition, Image URLs (≤8, https and public), Offerable, SKU. Values must match the Values tab exactly. Import to Inventory creates drafts; Upload to a show creates temporary listings.
- **Templates** (Fashion, early access, app ≥26.31): a reusable "type" listing (e.g., "Tops, XS–XL, Brands A/B/C"). The seller picks the size/brand at each auction start and switches templates bottom-left. Buyers see a "Live Listings" section.

### 5.5 Offers on BIN [HC]
- States: Accept (buyer charged, then ship), Counter (custom amount, buyer notified), Decline (may need to relist from Inactive).
- Where:
  - App: Seller Hub ☰ → **Offers**.
  - Web: Inventory → Offers → **Respond**.
  - In a live show (web): **Offers** panel with **Accept the highest offer / Counter all offers / Reject all offers**, plus search and sort.
- An Orders row shows **"Waiting for seller"** while an offer is pending.
- Offers aren't allowed on Flash Sales or variants.

### 5.6 Multi-quantity auction numbering [HC]
- Running qty>1 auctions appends "#n" (e.g., "Tops #1", "Tops #2").
- The default sequence is per listing. With **Auction Numbering by Show** turned on, one sequence runs across the whole show:
  - Off: Tops #1, Tops #2, Dresses #1, Tops #3
  - On: Tops #1, Tops #2, Dresses #3, Tops #4

### 5.7 Vacation Mode [HC]
- Seller Hub ☰ → toggle.
- Hides BIN listings from the Profile Shop and shows **"On vacation"** on the profile.
- Doesn't change deadlines for existing orders.
- New SPS support requests go to Whatnot while it's on.
- TR: **"Tatil Modu"**, with the profile badge **"Tatilde"**.

---

## 6. Shipping setup (before a sale)

### 6.1 Three layers [HC "Set up shipping before you sell"]
1. **Shipping profile** per listing: packed weight, sometimes dimensions.
2. **Default shipping settings** in Seller Hub, applied to all **new** shows. The seller can also apply them to already-scheduled shows.
3. **Per-show overrides**. These can't be changed once the show starts.

Marketplace (non-live) orders **ignore** the Seller Hub settings. They use the product profile and the cheapest eligible service. International shipping is auto-enabled and can't be disabled (TR MVP: domestic only).

### 6.2 Default Shipping Settings [HC]
- **Shipping Costs**:
  - **Buyers pay all shipping costs** (default)
  - **Buyer pays up to a set shipping cost** (e.g., max $7.75; if real cost is $20 the seller pays $12.25)
  - **Seller pays all shipping costs** (domestic only)
- These apply to shows only, not giveaways or marketplace orders. Shows with a discount get a **"Free Shipping" / "Reduced Shipping"** label in feeds, plus search filters.
- **Domestic shipping services**. US: 1–5 lb option, recommended USPS Ground Advantage $7.75 flat; over 5 lb: Ground Advantage / Flat Rate / UPS Ground Saver.
- **Free Pickup** (Local Pickup): pickup address (public) and instructions (e.g., "Available weekdays 9am–5pm").
- **Use custom shipping profiles** toggle.

### 6.3 Shipping profiles [HC]
**Suggested profiles** are weight classes chosen from a dropdown. Examples in HC: "0–1 oz" (single card), "4–7 oz" (comic), "1–2 lb". The US checkout ladder is: <4 oz $4.47 · 4–8 oz $4.85 · 8–12 oz $5.25 · 12–16 oz $6.75 · 1–5 lb **$7.75 flat** · >5 lb from $9.69 · Flat Rate $12.99 · PWE letter ≤3 oz $0.78/$1.09/$1.39.

**Custom profile fields**:

| Field | Req. | Example |
|---|---|---|
| Name | ✔ | "Skateboard deck", "Heavy gowns", "4-inch Funko" |
| Weight + unit (one item incl. packaging) | ✔ | 20 oz |
| Bundling: **max number of items in one package** | opt | 1 for a fragile vase (never bundles). Also custom box dimensions or a Flat-Rate box. |
| Bundling: **fixed weight for additional items** (incremental) | opt | First 20 oz (with packaging), each extra 15 oz |
| Update active listings (edit only) | opt | Applies changes to active listings. Sold ones aren't affected. |

- App path: Seller Hub ☰ → Settings → Shipping Settings → Shipping Profiles → **+** → Save.
- Web path: Shipments ▼ → Shipping Profiles → Create Shipping Profile → **Publish**.
- A max bundle size means items only bundle with the **same** custom profile, up to the cap (cap 3, buyer orders 4: ships as 3 + 1).

**Smart Bundling™ default incremental weights**:

| Category | Profile | Incremental |
|---|---|---|
| TCG / Sports Cards / LEGO | 0–1 oz (0–28 g) | 0.5 oz (14 g) |
| Comic Books | 4–7 oz (113–198 g) | 2.5 oz (71 g) |
| Diecast Cars | 4–7 oz | 3 oz (85 g) |

Example: 3 comics = 7 + 2.5 + 2.5 = 12 oz.

**Germany model** (closest analogue to TR desi pricing). Pricing uses weight **and** dimensions; the bundle "auto-upgrades" to the next format and the buyer sees the incremental fee in real time.

| Format | Max weight | Price |
|---|---|---|
| Letter | 20 g (23.5×12.5×0.5) | €1.19 |
| Letter | 50 g | €1.38 |
| Letter | 500 g | €2.25 |
| Parcel | 1 kg (35×25×8) | €4.10 |
| Parcel | 1 kg | €6.05 |
| Parcel | 2 kg | €6.17 |
| Parcel | 5 kg | €6.56 |
| Parcel | 31 kg | €7.73 |

Each package also carries an 8 g packaging buffer. **UK**: the system adds a packaging buffer automatically (no need to include packaging weight).

**TR shipping profiles** (proposal, replacing the four in `pricing.ts`). Turkish carriers price on **desi/kg, whichever is greater**, where **desi = (En × Boy × Yükseklik cm) / 3000**. Prices are mock buyer prices, KDV included; adjust to the carrier contract.

| Kod | Profil (TR label) | Paketli ağırlık | Maks desi | Örnek | Alıcı öder (mock) | Ek ürün artışı |
|---|---|---|---|---|---|---|
| `zarf` | Zarf – tek kart/çıkartma | 0–50 g | 1 | Tek kart (toploader) | ₺49,90 | +14 g |
| `xs` | Çok hafif paket | 50–250 g | 2 | Booster paket, takı | ₺69,90 | +50 g |
| `s` | Küçük paket | 250 g–1 kg | 3 | Çizgi roman, figür | ₺84,90 | profile göre |
| `m` | Orta paket | 1–3 kg | 8 | Ayakkabı kutusu, giyim | ₺99,90 | — |
| `l` | Büyük paket | 3–10 kg | 20 | Elektronik, dekor | ₺149,90 | — |
| `xl` | Çok büyük | 10–30 kg | 50 | Halı, küçük mobilya | ₺249,90 | — |

The bundle engine sums the first item's full weight and the incremental weights, then picks the smallest profile that fits both kg and desi. The buyer is charged the difference only.

### 6.4 Free Pickup / Elden Teslim [HC]
- Shows only. Must be enabled before the show starts. Both parties use the app.
- The buyer must pick **Free Pickup before purchase** (auctions: Wallet → Delivery Method). It becomes their default for this seller.
- The buyer gets a **Pickup Code + QR**. The seller confirms with Orders → **Confirm Pickup** (code or QR scan). Pickup is due within **7 days**; otherwise the order auto-completes.
- Excluded from ship-time metrics and from Sales Match.
- Earnings: 3 days after order creation or pickup, whichever is later.
- TR: **"Ücretsiz Elden Teslim"**, with **"Teslim kodu"** and **"Teslim Alındı olarak onayla"**.

---

## 7. Live show: seller controls

### 7.1 Seller live screen layout (app) [HC, assembled; positions INF where noted]
- **Top-left**: host avatar/username. The yellow **Show Notes** sticky sits at the top-left.
- **Upper-right**: the **viewer count** (tap it to open Show Stats + Viewer List), a 🔒 when the show is private, and a **caret ▾** that gives "minimize show".
- **Right rail** (top to bottom) [INF order]:
  - **⋯ More** → End Show, Raid, Edit Show/settings, Verified Buyers toggle, Tip Settings, Zoom Camera, Facecam, Seller Tools
  - **Promote** (megaphone)
  - **Share**
  - **Clip**
- **Bottom-left**: the **chat** panel, with a **caret (^)** in its upper-left that opens the filters. Questions are highlighted **yellow**.
- **Bottom**: the **pinned product card** (title, image, price or current bid, timer; Bid/Buy for viewers). Giveaways show **"Enter Giveaway"** at the **top** of viewers' screens instead of pinning.
- **Bottom-right**: the **Shop** icon (SA calls it "Store").
- Two-device mode: a second phone or computer opens the live show from Profile → Shows to control it. Its screen may be black, and the HC tip is to keep its volume down.

**Web live layout** [HC]:
- **Left panel**: tabs **Auction / Buy Now / Giveaways** (+ Breaks, Offers). Each row has a **Product Actions** menu: Start Auction, Pin item / Unpin Item, Start Flash Sale. "Add" creates listings.
- **Right sidebar**: Show stats (top), **Chat** tab with filters, **Watching / Activity** tabs.
- **Live Analytics** panel (web only) with tabs Overview / Sales / Audience / Trends.
- **Bottom-right**: the **Notes** icon and **More** → Seller Tools (Start Raid, Sorting Labels).

### 7.2 The Shop sheet (seller) [HC]
- Tabs: **Auction**, **Buy Now**, **Giveaway**, plus **Sold** [INF] and Breaks when relevant. Search box [INF].
- Header **+** → Create Listing / Import from Inventory.
- Row actions:
  - Auction rows: **pin icon** (yellow = pinned) and **Start Auction**.
  - Buy Now rows: **Pin Product / Pinned** and ⋯ → **Run as Flash Sale**.
  - Giveaway rows: **Run Giveaway**.
  - Edit: pencil → **Edit Listing**.

### 7.3 Pinning rules [HC]
- Pinning shows one listing to every viewer, with title, image and price at the bottom. Viewers can bid or buy from the pin.
- **Only one pin at a time.** You **can't pin while an auction runs.** **Only the seller can pin; mods can't.**
- Pinning doesn't start a sale.
- Starting an auction auto-pins it. Starting a flash sale auto-pins it. A pinned BIN gets **replaced** when an auction starts.
- Buyers who pre-bid get a push when the item is pinned.
- TR: "Sabitle", "Sabitlendi", "Sabitlemeyi kaldır".

### 7.4 Start an auction [HC "Start an auction during your show"]
- Shop → **Auction** tab → product → **Start Auction** → **auction details sheet** → **Start**.
- Fields:
  - **Starting bid**: pre-filled from the listing and editable. If it's set above all existing pre-bids, those pre-bids are cleared.
  - **Auction time**: "The minimum length of the auction. New bids can extend the timer."
  - **Counter bid time**: "When fewer than 10 seconds remain, each new bid resets the timer to this amount."
  - **Sudden death** (optional): "Ends the auction at 00:01 to the final bidder without extending time." Viewers see 💀 next to the timer.
  - Variant / Template item selection, when the listing has them.
- Rules:
  - "**Once an auction starts, it can't be canceled or stopped.**"
  - No bids means unsold, and the seller can "run it again or move on".
  - The highest bid wins. Ties go to whoever placed the amount first.
  - The winner's default payment method is charged automatically.
  - Bids are binding.
  - Bids and custom bids:
    - The bid button places the next valid increment.
    - **Custom** opens a sheet with **Max Bid on (default)**, where the system proxy-bids in increments up to the cap, or **Max Bid off**, which submits the exact amount.
    - Max bids are private.
  - Pre-bids:
    - Allowed on listings added before the show (unless disabled).
    - They behave like max bids and are applied when the auction starts.
    - They expire **24 h after the scheduled start time**, or when the listing is deleted or ends without running.
    - On a multi-qty listing a pre-bid applies to the first unit only.
  - Shipping cost appears under the item title before bidding.
  - "Most auctions on Whatnot move fast, and many last 30 seconds or less."
  - A buyer with a clear bidding error can contact Support within **2 h**, and Whatnot may cancel.
  - Payment failure (troll bidder): "re-run the item". Wait if the failure looks honest.
- **Duration presets** aren't published [INF]. Third-party guides say "15–60 seconds" and "30 s with 10 s added when someone bids in the last 10 s". The older engineering blog says the timer resets to 10 s when a bid arrives in the last 10 s. Recommendation:
  - Auction time chips: **5 s, 10 s, 15 s, 20 s, 30 s, 45 s, 1 dk** (+ 2 dk, 5 dk for high-value). This already matches `AUCTION_DURATIONS` in code.
  - Counter bid time chips: **5 s / 10 s / 15 s**, default **10 s**, with threshold = 10 s (= `EXTEND_THRESHOLD_SEC`).
  - Remember the last-used values per seller.
- **Bid increments**: Whatnot doesn't publish its table. The help center only says "minimum increment based on current price… may increase too". The ₺ table in `auction.ts` is fine. Third-party sources for USD: $1 up to $50, $5 up to $200, $10 above.
- Live HUD during an auction (seller) [HC]: bids, active participants and the current highest bid update in real time.
- TR copy:
  - "Açık Artırmayı Başlat"
  - "Başlangıç fiyatı"
  - "Süre"
  - "Uzatma süresi (son 10 sn'de gelen teklif süreyi buna sıfırlar)"
  - "Ani Bitiş 💀 — süre uzamaz"
  - "Başlat"
  - "Başladıktan sonra iptal edilemez"
  - "Satıldı! @kullanici ₺1.250"
  - "Teklif gelmedi — Tekrar başlat / Sonraki ürün"

### 7.5 Buy It Now during a show [HC]
- BIN items in the Live Shop can be bought at any time, pinned or not.
- Profile Shop items can be imported into the show (offers get turned on).
- Live offers come in on the **Offers** panel.

### 7.6 Flash Sale [HC "Run a Flash Sale"]
- Create it as a Quality Listing in BIN format, with Quantity (units in the sale) and the full Price. Then turn on **Flash Sale**:
  - **Discount type**: **Percentage off**, or **Price off** (the % is computed automatically)
  - **Flash Sale duration** ("We recommend at least 30 seconds")
  - **Available for full price** (optional): stays buyable at full price outside the sale
  - **Max purchase limit** (optional, per buyer)
- Start: Shop → Buy It Now tab → **Product Actions → Start Flash Sale**. It auto-pins.
- Any existing BIN can be run this way: ⋯ → **Run as Flash Sale**. It goes back to full-price BIN afterwards.
- No offers on flash sales. Only one variant per flash sale.
- TR: "Flaş İndirim", "% indirim / ₺ indirim", "Süre", "Normal fiyattan da satışta kalsın", "Kişi başı maksimum adet", "Flaş İndirimi Başlat". Suggested duration chips: 30 sn / 1 dk / 2 dk / 5 dk [INF].

### 7.7 Giveaways [HC "Start a giveaway", "About Giveaways", "Giveaway Rules"]
- Create one inside the show: Shop → Create Listing → Giveaway. The seller chooses **Everyone / Followers only / Buyer Appreciation**, plus the International toggle.
- Run: Shop → **Giveaway** tab → **Run Giveaway** (web: Giveaways tab → Start Giveaway). Runs **up to 5 minutes**. **End Giveaway** in the right panel ends it early.
- Rules:
  - **Only the host sees the countdown.**
  - Can't be paused or cancelled.
  - **One giveaway at a time.**
  - Selling continues while it runs, and auctions can run at the same time.
  - **Entrants must be present** when the winner is drawn; leaving removes the entry and rejoining re-enters it.
  - Whatnot picks the winner randomly and announces it in the show.
  - Entering requires a saved address and payment method.
  - One entry per user.
- Afterwards an order is created for the winner. It shows on Shipments, can be bundled with the winner's purchases, and must ship within 2 business days.
- Cost: **the seller pays shipping, deducted from the balance when the giveaway runs.** The balance can go negative.
- Buyer Appreciation (BAG):
  - Only purchases made **after** the BAG was created qualify.
  - US/CA offer a free web-form AMOE.
  - The seller must post rules.
  - No paid-entry raffles.
- Prohibited:
  - Denying a winner
  - Undisclosed prizes
  - Downgrading the prize based on who wins
  - Extra requirements beyond the built-in ones
  - Requiring a purchase
  - Future redemption
  - Mechanical or wheel randomizers
  - Cash prizes (except collectible currency)
- Analytics: "Giveaway Spend" and "Giveaways" count. Giveaway orders are excluded from order counts and AOV.
- **TR legal**: under 320 sayılı KHK and the "Karşılığı Nakit Olmayan Piyangolar ve Çekilişler Hakkında Yönetmelik", prize draws generally need **Milli Piyango İdaresi (MPİ) permission**. MPİ has investigated influencers over unpermitted social-media draws. Before launch, get legal review. Options:
  - Platform-level MPİ permission
  - Limit to "takipçilere hediye" with no participation condition
  - Feature-flag it off at launch
  - Keep the UI word **"Çekiliş"** in the mock, but add the disclaimer text "KATILIM İÇİN ALIŞVERİŞ ŞARTI YOKTUR"
  - **Never ship BAG-style purchase-based entries in TR** (that's şans oyunu risk).
- TR copy: "Çekiliş Oluştur", "Kimler katılabilir?", "Çekilişi Başlat", "Çekilişi Bitir", "Kazanan: @kullanici 🎉", "Kargo ücreti bakiyenden düşülür".

### 7.8 Moderation [HC]
- **Moderators**: add them while scheduling (Moderators section → username), or live by tapping a username → **"Allow to Moderate"**. Remove with **"Remove Moderator"**.
- Mod powers:
  - **Remove users from the show**
  - **View muted chat messages**
  - Use chat filters and the viewer list
  - **Not** pinning, and not show stats (stats are host/co-host only)
- **Remove from show** (mobile) / **"Ban from live"** (web): the user can't chat, bid or rejoin for the rest of this show, and **can't be re-added**. **Block** goes further: no following, DMs, profile view, bookmarks, joining, chatting or buying.
- **Chat commands**:
  - `/announce <message>` highlights a message
  - `/hide <message>` is visible to the seller and mods only
  - `/slow <seconds>` sets a chat cooldown, e.g., `/slow 5`
  - `/raid <username>`
- **Chat filters** (seller, co-host, mods): **Questions**, **Buyers**, **Mods**, **Muted**.
- **Viewer list** (tap the viewer count): tab **Watching**, sortable by **Friends**, **Host and Mods**, **Top Buyers**; tab **Activity** lists raids, new followers, tips, auction wins and purchases. An **@** button next to each user tags them in chat.
- **Anti-disruption**: Disable pre-bids (web), Verified Buyers only (app), re-run items after a failed payment.
- Mod guidelines: "lead by example, not by force". Warn first and don't ban over opinions.
- TR copy:
  - "Moderatör yap"
  - "Moderatörlükten çıkar"
  - "Yayından çıkar"
  - "Engelle"
  - "Şikayet et"
  - commands `/duyuru`, `/gizli`, `/yavas 5`, `/baskin @kullanici` (also accept the English commands)
  - filters "Sorular · Alıcılar · Moderatörler · Sessize alınanlar"
  - tabs "İzleyenler · Etkinlik"

### 7.9 Real-time show stats [HC]
- **In-app, host and co-host** (tap the viewer count; the stats sit above the viewer list): **Estimated gross sales**, **Estimated order count**, **Show time duration**, **Show shares**.
- **Live Analytics (web)**:
  - **Overview**: Sales, Orders (excl. giveaways), **Sales/hr**, **Orders/hr**, **AOV**, **Avg. watch time**.
  - **Sales**: Sales, Live Sales, Shop Sales, Orders, Live Orders, Shop Orders, AOV, Live AOV, Shop AOV, **Tips**, **Active Pre-bid Products**.
  - **Audience**: **% of Buyers**, **% of Followers**, **Lifetime Spend Distribution** (privacy-gated), **Rewards Club snapshot**, Current viewers, Viewers/hr, Unique viewers, **Bidders**, **Buyers**, Avg. watch time, Show shares, new vs returning viewers and buyers.
  - **Trends**: Viewers over time, Orders per hour, Follower growth. Filters: last 5 min / 30 min / 1 h / whole show.
  - **Benchmarks**: "+15% vs your average", compared with the seller's trailing **30-day** average.
- TR: "Tahmini satış ₺", "Sipariş", "Yayın süresi", "Paylaşım", "Saatlik satış", "Ortalama sepet", "Ort. izlenme süresi", "Teklif verenler", "Alıcılar", "30 günlük ortalamana göre +%15".

### 7.10 Co-host, raid, multicast and other tools [HC]
- **Co-host**:
  - Only the host can invite: tag the username in chat → tap it → **Invite to Co-host**. The invitee sees a pop-up with **Accept / Dismiss**.
  - **One co-host at a time.** Remove with "Remove co-host".
  - The co-host can't start or end the show, list from their own shop, see the Seller Hub, print labels, or get payouts.
  - The host owns every order and payout and can export labels and email them to the co-host.
  - All labels use the host's return address.
- **Raid**:
  - ⋯ More → **Raid** → pick a live seller or "let Whatnot choose" → **Raid Now** → **Continue**. Typing `/raid @user` also works.
  - Raiding **ends your show**.
  - The receiver's chat shows "<seller> is raiding with a party of N".
- **Camera tools** (⋯): **Zoom Camera** (cycles normal / ultra-wide 0.5x / close-up) and **Facecam** (front and rear at once). Opt in from Account → Preferences → **Seller Tools**.
- **Multicast** (iOS/desktop): YouTube Live, Facebook Live (profile/page/group), Twitch (stream key). Not for private shows or Android.
- **OBS / RTMP-WHIP**: a Show Tools page with a websocket and a per-show bearer token. Canvas must be **1080×1920**.
- **Screen share**: available to computer streamers.
- **Clips**: anyone can clip the **last 60 s**, minimum length **5 s**, trimmed once, private by default. Published clips appear on both profiles.
- **Show Notes**: see §4.2.
- **Sorting Labels** (beta, web + "Whatnot Tray" desktop app): auto-prints a small label per sale (2×1", 1×1", 4×6", 2×3"), by sale type (Auctions / BINs / Giveaways / Breaks-Surprise Sets).
- **Party Purchase** (beta, web Seller Hub):
  - The seller picks BIN listings, a unit goal and a duration of **1, 3, 5 or 20 min**, with **up to 10 milestone rewards** (₺/% discount, coupon, giveaway).
  - Discounts don't stack (the largest applies).
  - Payment is a hold at full price, captured with the discount at the end.
- **Breaks** (cards only, computer):
  - Pick Your Team (Auction/BIN, with optional offers) or Random (auction, with **Auto-Randomize**)
  - Up to 75 custom spots pasted in, presets like NBA teams
  - **Break Manager** actions: Randomize, Randomize Again, Assign Team, Clear Team, Start Breaking, Finish Breaking
  - CSV export
- **Surprise Sets**:
  - Up to 500 products per set
  - **Auto-Randomize** (on by default) and **Quick Spin** (on by default)
  - Can't be re-randomized
  - Requires the show format to be Surprise Sets
- **Tips**:
  - Buyers tip from the show or profile. Sellers get **100%** with no commission.
  - Shown in chat unless turned off.
  - Available after 3–4 days (instantly with Early Payout).
- **Promote / Boost / Community Boost**: these live on the show screen. See §12.

### 7.11 Post-show summary [HC]
- "After you finish your show, you will see a post show summary with key data points from your show, including information about your Promote Tools usage."
- Recommended mock content: duration, gross sales ₺, orders, buyers, peak viewers, new followers, tips, giveaways run, promote spend vs return. CTAs: **Kargo etiketlerini oluştur**, **Yayını yeniden başlat** (≤2 h), **Analizleri gör**.

---

## 8. After the show: orders, shipping and support

### 8.1 Orders vs Shipments [HC]
- **Orders** are individual purchases: buyer, item count, sales channel, price, status, earnings status badge, and actions (cancel, respond to a cancellation, message the buyer, Confirm Pickup, View Support Request, Video Receipt).
- **Shipments** are packages. One shipment can bundle several purchases. Each row shows buyer username, item count, shipment status, tracking, a pencil icon for **Edit Shipping Details**, and Expand for line items. Filters: **All Shows & Marketplace** (per show), and **Needs Label / Unfulfilled / Ready to Ship / Shipping / Delivered / Overdue** [HC uses Needs Label, Unfulfilled, Ready to Ship, Shipping, In Transit, Overdue, Preparing Package].
- **Video receipts**: a clip of the moment the item appeared, kept **60 days**. Full show VODs: **60 days**, app only (Manage → Shows → Past). Chat history isn't kept.
- **Show Report (CSV)**: Shipments → filter by show → Open Sidebar → Show Actions → **Export Show Report (CSV)**.

Suggested order and shipment status machines (from HC terms):
- Order: `paid → (pending_cancellation) → label_created → shipped/in_transit → delivered → pending_review (30 d) → completed`, plus `cancelled`, `refunded`.
- Shipment: `needs_label → ready_to_ship (label made) → shipping (drop-off scan) → in_transit → delivered`, plus `overdue` (>2 business days without a scan), `returned_to_sender`.
- Earnings: `processing → completed | cancelled`.

TR status labels: Ödendi · İptal talebi var · Etiket hazır · Kargoya verildi · Yolda · Teslim edildi · Değerlendirme bekliyor · Tamamlandı · İptal edildi · İade edildi · Gecikmiş.

### 8.2 Cancellations [HC]
- **Buyer request**:
  - The buyer can ask **within 24 h of purchase**, if the order hasn't shipped.
  - The seller has **48 h** to **Accept / Decline**. No response means the sale is final.
  - A **"!" warning icon** shows on Shipments, and **you can't generate a label while a request is pending.**
  - Accepting doesn't hurt Account Health.
  - A buyer who requested cancellation **can't rate the order**.
  - Whatnot can override in three cases: a bidding error reported within 2 h, a one-time buyer exception (no label yet; not breaks or consumables), and the EU/UK right of withdrawal.
- **Seller cancel**:
  - Allowed any time before the item ships, even after a label. Orders are cancelled one at a time.
  - The seller must pick a **reason** and can add an optional note (1–2 sentences).
  - **Fee = max(3 units of local currency, 3% of the order total)**. The **first one is waived**. The warning shows before confirming.
  - Fee applies for: missing inventory, wrong listing details, condition mismatch, changing your mind on price, unexpected shipping costs, cancelling after creating a label.
  - Fee waived for: buyer-requested cancellations through Whatnot, carrier issues, causes outside the seller's control, unfilled breaks.
  - Cancellations are final. Earnings are reversed, and so is an Early Payout already paid.
- **TR**:
  - Copy: "İptal talebi", "Kabul et / Reddet", "48 saat içinde yanıtla", "Siparişi iptal et", "İptal nedeni", "Alıcıya not".
  - Proposed fee: **max(₺100, %3)**, first one free.
  - **B2C sellers**: 6502 sayılı TKHK + Mesafeli Sözleşmeler Yönetmeliği give a **14-day cayma hakkı** to consumers of commercial sellers. That needs a separate "Cayma hakkı" return flow for Kurumsal sellers; check the exceptions with counsel.

### 8.3 Labels and packing slips [HC]
- **Default Label Options** (web, Shipments sidebar):
  - Label size **8.5×11 in (default) or 4×6 in** (thermal)
  - Packing slip size, same options
  - **Return address**, which must include a first and last name or "Shipping" / "Department" / a business name, and **can't be changed after a label is created**
- **Single label**: Shipments → Needs Label → select → **Generate Label** → **Print Shipping Label**. The app can do one label at a time.
- **Bulk**:
  1. Select All
  2. **Shipping Actions → Generate Labels**
  3. **Export Shipping Label / Slips**
  4. Choose Shipping labels / Packing slips / Both
  5. Choose a sort order (order time, buyer username, number of orders)
  6. Choose a label size
  7. **View & Print PDF** or **Send via Email**
- **Packing slips** list the buyer username and items, plus SKU and break spot names. Labels are PDFs (enable pop-ups). There's no QR-code label.
- **Rules**:
  - Use only Whatnot labels, unless approved for **BYOL**.
  - Packaging must match the label (US: a Priority box on a Ground label is about a $20 adjustment).
  - Shipments over $500 get signature confirmation automatically ($4.36, seller pays).
  - Keep a continuous packing video for at least 75 days.
  - Ground Advantage and Priority labels include $100 of coverage. Extra protection comes through Shippo/XCover. Whatnot files USPS claims automatically after 15 days.
- **TR**:
  - Use a carrier-integrator API (e.g., Geliver, Basit Kargo, Kargonomi-style) or direct carrier contracts:
    - **Yurtiçi Kargo**
    - **Aras Kargo**
    - **MNG Kargo (DHL eCommerce)**
    - **PTT Kargo**
    - **Sürat Kargo**
    - **HepsiJet**
    - **Kolay Gelsin**
    - **Sendeo**
    - **UPS Türkiye**
  - Deliverable: a **barcode label** (A4 or 10×15 cm thermal) or a "gönderi kodu" given at the branch. Packing slip: **"Paket İçerik Fişi"**, not "irsaliye".
  - Drop-off: "Şubeye teslim" or "Adresten alım (kurye)".
  - The default service is chosen from the seller's preferred carrier in Kargo Ayarları.

### 8.4 Bundling and shipment adjustments [HC]
- **Smart Bundling™** combines purchases from the **same buyer** in the **same channel**. Live and marketplace orders don't auto-bundle, but **can be bundled manually**. Out-of-show purchases keep bundling until a label is generated. Smart Bundling can also **split** a purchase if that's cheaper.
- **Manual bundling** (web): Needs Label → select 2+ shipments from the same buyer → **Bundle Selected Shipments**. Only possible **before labels**.
- **Unbundle**:
  - No label yet: **Unbundle Shipment** → choose items → **Unbundle Selected Items**.
  - Label already made: **Generate New Label** → uncheck items. Must be done before In Transit.
- **Adjustments** (web only): **Edit Shipping Details** (before a label) or **Generate New Label** (voids the old one). Changes: weight, dimensions, service, insurance/signature. Pending cost changes show under **Shipping Costs → Pending Adjustments**.
- **5 free shipping adjustments per week.**
  - US resets **Sunday 7:00 pm ET**; non-US resets **Monday 00:01 UTC**.
  - Always free: same pricing tier, bundling that lowers cost.
  - Charged: insurance/signature, weight +5 lb or more, more than 2 ft³.
  - Unbundling counts against the allowance if the extra cost is ≤$5 / €5 / £5 (¥500); beyond that the seller pays the full difference.
  - A cheaper new label doesn't trigger a refund.
  - The remaining allowance shows in the Shipments sidebar as **"Label adjustment allowance"**.
- **Carrier adjustments** (re-weighs): there's a dashboard. Appeals within **45 days**, one per shipment. US weight adjustments are charged to the ledger from Nov 4 2026.
- **TR**: "Akıllı Paketleme", "Paketleri birleştir / ayır", "Gönderi detaylarını düzenle", "Haftalık 5 ücretsiz düzeltme hakkın kaldı: 3", "Desi/kg farkı bakiyenden düşülür".

### 8.5 Shipping SLA and drop-off confirmation [HC]
- **Ship within 2 business days.** Example: sold Friday, so scan by end of Tuesday. "Shipped" means the first drop-off scan, from any of:
  - The **in-app scanner** (recommended): Seller Hub ☰ → Sales → Fulfillment → filter **Ready to Ship** → **Confirm Drop-Off**. Point the camera at each package, about 2 s each; after 5 s a manual shutter appears.
  - **Whatnot Manifest** (one scan for many packages, high-volume sellers).
  - A carrier acceptance or kiosk scan.
  - A carrier manifest (USPS SCAN form).
- Scanner rules: label must be attached, no scanning from a screen, scan close to hand-off, package only in the photo (the photo goes to the buyer).
- Effects: status goes **Ready to Ship → Shipping**, the buyer gets an email with the photo, and it counts toward ship time. The old "Mark Package as Shipped" button was removed.
- Late or unverified shipment means a possible cancel or refund billed to the seller, loss of Early Payout, and account action.
- **Average Ship Time**: business days from order to the first valid confirmation, a 30-day rolling average, updated daily. Shown on the profile, shows and listings.
- **Can't ship on time**: use Vacation Mode, message buyers, and email trustandsafety@ with the reason and ETA.
- **TR**:
  - Business days exclude Saturday/Sunday and resmi tatiller: 1 Ocak; Ramazan Bayramı (2026: 20–22 Mart, arife yarım gün); 23 Nisan; 1 Mayıs; 19 Mayıs; Kurban Bayramı (2026: 27–30 Mayıs, arife yarım gün); 15 Temmuz; 30 Ağustos; 28 Ekim yarım gün; 29 Ekim.
  - Copy: "2 iş günü içinde kargola", "Kargoya Teslim Ettim (Tara)", "Paketi okut".

### 8.6 Weekly Bundling (optional, non-US) [HC]
- An account-level toggle (Shipments sidebar). Both seller and buyer must opt in.
- The bundle closes **Sunday midnight local time** and must ship within 2 business days (by Tuesday). Generating a label closes the bundle early.
- Filter: "Only Show Weekly Bundles"; closed bundles are shown in orange.
- TR: "Haftalık Paket" is a good fit for collectors.

### 8.7 Seller Provided Support (SPS) [HC]
- Buyers' "Get help" requests land in the seller's **Inbox → Customer Support** tab. The seller should respond within **2 business days**, which counts toward the **SPS Response Rate**.
- Resolutions and ledger impact:
  - **Full refund, no return**: payout + buyer-paid shipping + processing fee, charged immediately.
  - **Full refund with return**:
    - The buyer has **10 (business) days** to drop off.
    - The seller has **48 h** to confirm or dispute after delivery.
    - The seller is charged at confirmation, or 48 h after delivery.
    - The seller also pays return shipping.
  - **Partial refund**: agree the amount by message first; it can't be edited. The buyer has **48 h** to answer, and declining means a full refund with return within 5 days.
  - **Replacement**: discuss first, then the seller buys the label and ships within 48 h.
  - **No refund, with an explanation** (the buyer can escalate).
  - **Ask for more info**.
- If there's no response and the buyer escalates, Whatnot decides, and the refund may be **billed back**. Appeals are possible.
- Seller-responsible issues:
  - Substantial shipping delay
  - Missing item
  - Wrong item, size or colour
  - Not as described
  - Defective or expired
  - Returned to sender
  - Damaged in transit
  - Spoiled
- Breaks and consumables go to Whatnot.
- Buyer's remorse is the seller's call.
- With Vacation Mode on, new requests route to Whatnot.
- TR: "Müşteri Destek Talepleri", "Tam iade (iadesiz)", "İade karşılığı tam iade", "Kısmi iade teklif et", "Yenisini gönder", "Neden iade edilmeyeceğini açıkla", "Ek bilgi iste".

---

## 9. Money: fees, balance and payouts

### 9.1 Commission: tiered (effective Sep 21 2026) [HC "Whatnot seller fees"]
- **Total sales across all categories** in a **4-week (28-day) period** decide the tier for the **next** period. Within that tier, each sale is charged **its category's rate**: live sales use the **show category**, marketplace sales the **product category**.
- The rate is locked for the whole period.
- The projection shown in Seller Hub = sales so far ÷ days elapsed × 28. Example: day 14 with $10k projects $20k.
- Private shows, local pickup and cancelled orders don't count toward the total.
- Each account is tiered separately.
- Promotional rates (new-seller 0%, events) override: the seller pays the **lower** rate, and those sales still count toward the tier.
- The headline **3%** is for custom terms with an account manager.
- Progress notifications go out by email and push.
- The rate on each order shows under Orders → order → **Receipt and earnings details**.

**US rate card**:

| Category | Standard $0–14,999 | T1 $15k–34,999 | T2 $35k–49,999 | T3 $50k–99,999 | T4 $100k–249,999 | T5 $250k–499,999 | T6 $500k+ |
|---|---|---|---|---|---|---|---|
| Sports | 8.00% | 7.75% | 7.50% | 7.25% | 7.00% | 6.75% | 6.50% |
| TCG | 8.00% | 7.75% | 7.50% | 7.25% | 7.00% | 6.75% | 6.50% |
| Fashion | 8.00% | 7.00% | 6.50% | 5.50% | 5.00% | 4.50% | 4.50% |
| Other Collectibles | 8.00% | 7.25% | 6.50% | 6.00% | 5.00% | 5.00% | 5.00% |
| Coins | 4.00% | 3.90% | 3.80% | 3.70% | 3.60% | 3.55% | 3.50% |
| Other | 8.00% | 7.00% | 6.50% | 5.50% | 4.00% | 4.00% | 4.00% |

- EU/UK: Standard **6.67% + VAT** (BE/FR Sports and TCG flat 4%), with thresholds €/£10k / 20k / 35k / 50k / 65k / 85k.
- AU: thresholds A$10k / 20k / 35k / 70k / 100k / 130k.
- Japan: 8% + JCT, not tiered.
- **Commission base = GMV**: the item price after seller coupons, excluding shipping and tax. HC example: a $10 item with $4.99 shipping and $0.85 tax gives 8% × $10 = $0.80.
- **High-value promo**: 0% commission on the part above **1,500** (USD/EUR/GBP/AUD; ¥225,000). Covers Comics & Anime, Toys & Hobbies, Coins & Money, TCG, Entertainment Cards, Sports **Singles** subcategories (not breaks or surprise), Bags & Accessories, Jewelry & Watches. Example: a $2,000 sale pays 8% × $1,500 = $120, plus processing on the full amount.
- **Premier Shop discount**: –10% relative (5% becomes 4.5%) **until Oct 31 2026**, removed from Nov 1.
- SPS penalty: after 3 warnings for a weekly response rate under 80%, the seller may get **+2% commission**.

### 9.2 Other fees and charges [HC]
- **Payment processing**:
  - US/CA/AU: **2.9% + $0.30 per transaction**
  - EU/UK: **2.42% + €/£0.25 + VAT**
  - Charged on the **total buyer-paid amount**: item + shipping + tax.
- **Seller cancellation fee**: max(3 units, 3%), first one waived.
- **Seller-paid shipping**: free or capped shipping, giveaway shipping, adjustments over the allowance, carrier adjustments, signature ($4.36), insurance.
- **Promote Tools spend**: deducted from the balance after the show.
- **Coupons**: the seller funds the discount.
- **Tips**: 0% fee.
- Analytics example: a sale of 50 − 8% commission (4) − processing (2) − seller shipping (0) = **44 earnings**.

### 9.3 Balance, statuses and timing [HC]
- **Account balance** = processing balance + **available balance**. You can pay out only from the available balance.
- **Earnings status**: **Processing** (not yet available) / **Completed** (available) / **Cancelled**.
- **When earnings become available** (without Early Payout):
  - CA, JP, US: within **4 h of confirmed delivery**.
  - AU, AT, BE, NL, UK: confirmed delivery **and ≥96 h since the sale**, then ≤4 h processing.
  - DE: 4 days after label generation.
  - FR: Mondial Relay = delivery + 96 h; La Poste = the sooner of ~4 h after delivery or 7 days after the order.
  - No-tracking methods: BYOL depends on the carrier; DHL/Deutsche Post 4 days after the label; **Free Pickup** 3 days after the order or after pickup, whichever is later; FCML **10 days** after the label.
- **Early Payout**:
  - Earnings become available at **label generation**.
  - Requirements (exact values shown in Seller Hub → Payouts → Account Balance): an average-rating threshold, a lifetime number of shows, and a lifetime milestone in qualifying sales **or** orders. The Seller Academy (older) version was **$100k lifetime or 1,000 orders, ≥10 shows, rating ≥4.8**, no strikes.
  - Qualifying orders: delivered (or 30 days without a dispute), not pickup, not a giveaway or tip, no coupon or credit.
  - Checked every 24 h.
  - Lost if the rating drops, shipping runs past 2 days, or refunds and cancellations climb. **Payment holds** for new sellers, sudden spikes or reviews push earnings back to the standard timeline.
- **Payout**:
  - Requires completed seller verification.
  - The payout method is a bank account through **Stripe Connect** (PayPal is legacy only).
  - App: Seller Hub → Payouts → **Add a Payout / Edit Payout**. Web: Financials → Payouts → **Add a Payout Method / Edit Payout Settings**.
  - **Start Payout** works any time the available balance is above 0 and shows an estimated arrival date.
  - Payout statuses: **Processing / Completed / Failed** (failed money goes back to the balance).
  - Arrival: **1–2 business days** (EU/UK/US), 2–3 days (AU/JP), 3–4 days (CA). Bank holidays add delay.
  - Older SA wording: "Cash Out".

### 9.4 Ledger / Transactions [HC]
- Columns:
  - **Created date**
  - **Amount** (net ±)
  - **Listing ID**
  - **Order ID** (links to the receipt)
  - **Message**
  - **Status** (Processing / Completed)
  - **Transaction type**: Sales, Tip, Adjustment, Payout, and also REWARD / REWARD_DEBIT and ADS credits that can't be paid out
  - **Completed date**
- Filters: **All / Processing / Completed / Withdrawals / Edit dates** (max **31 days**). Export to CSV.
- Not included: buyer activity, cancelled orders, failed payments, per-order fee breakdowns.
- Ledger labels seen: "New Seller Sales Match Bonus", "Seller Referral Reward", "Super Seller Bonus".

### 9.5 Statements and reports [HC]
- **Monthly statement** (every month with activity) and an **Annual statement** each January. Line items:
  - Opening balance
  - Earnings: Gross sales (net of coupons), Tips, Affiliate rewards, Seller referral bonus, Giveaway refund credit, New seller cash match, Other adjustments
  - Fees & costs: Commission fees, Payment processing fees, Sales & use tax on fees, Show boost and promote, Seller-paid shipping & handling, Shipping surcharges and fees, Order refunds, Other
  - Payouts
  - Closing funds
  - Total income
- **Weekly Orders Report** (CSV, Mondays 06:00 UTC, Mon–Sun UTC window). Columns:
  - Identifiers: Report Start Date, Week Number, Order Placed At UTC, Transaction Completed at UTC, Transaction Type (Order Earnings / Order Refund / Tips / Shipping Charge), Transaction Message, Order ID
  - Listing: Listing Title, Listing Description, Product Category, Buy Format (Auction / Buy-it-Now / Giveaway), Sale Type ("FLASH"), Quantity Sold, SKU, Cost of Goods
  - Show and buyer: Livestream ID, Livestream Title, Buyer Name, Buyer State, Buyer Country, Shipment ID
  - Money: Transaction Currency, Transaction Amount, Buyer Paid, Original Item Price, Coupon Cost, Post Coupon Price, Shipping Fee, Commission Fee, Payment Processing Fee, Tax on Commission, Tax on Payment Processing Fee
  - Refunds: Ledger Transaction ID, Order Refund Shipping Costs, Appealed Order Refund, Appealed Shipping Refund
- **VAT invoices from Whatnot to the seller** (commission + processing): monthly, published on the **10th** for the previous month (Finances → VAT Invoices).
- **Seller-to-buyer VAT invoice generator** (EU, web): per shipment, after the show ends and a label exists. Pre-filled with the standard VAT rate.
- **Digital platform reporting**: DAC7 (EU/UK/CA), 1099-K (US).

### 9.6 TR money model (proposal)
- **Currency display**: `₺1.250,00`, or `1.250 ₺` in compact lists. Use `Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' })` → "₺1.250,00". Whole-lira bids have no decimals: "₺1.250".
- **Commission**: keep Whatnot's structure, **8% base** (Coins 4%), **charged on the item price only**. **KDV %20 is added on top of the commission and processing fee**, mirroring EU "subject to VAT". Show "Komisyon: ₺100,00 + KDV ₺20,00".
- **TR tier thresholds** (proposed 28-day periods): Standart ₺0–399.999 · Seviye 1 ₺400.000+ · Seviye 2 ₺800.000+ · Seviye 3 ₺1,5M+ · Seviye 4 ₺2,5M+ · Seviye 5 ₺5M+ · Seviye 6 ₺10M+. Reuse the US rate columns. Tracker copy: "Bu dönem: ₺312.400 · Tahmini dönem sonu: ₺624.800 · Sonraki dönem oranın: %7,75 (Seviye 1)".
- **High-value rule**: 0% commission above **₺60.000** per order in the collectible categories [proposal ≈ $1.5k].
- **Payment processing** (iyzico/PayTR-style marketplace, mock): **%2,99 + ₺0,25** on the total paid amount. The code currently uses 2.9% + ₺3; pick one and display it. Turkish specifics:
  - Installments (**taksit**): the buyer pays the vade farkı, the seller gets the single-payment amount.
  - 3D Secure.
  - TROY / Visa / Mastercard.
- **E-ticaret stopajı**: since **1 Jan 2025**, under Law 7524, Presidential Decision 9284 and GVK 330 tebliğ, **aracı hizmet sağlayıcılar must withhold 1%** on payments to e-commerce sellers. Show it as its own ledger line, "Stopaj (%1)", and in statements. It applies to the net sale amount (check the base with an accountant).
- **Payout to IBAN**:
  - Format: TR + 2 check digits + 5-digit bank code + 1 reserve digit + 16-digit account number = **26 characters**. Validate with mod-97. The **account holder must match** the KYC name or ticari unvan.
  - Arrival: "1 iş günü içinde (FAST/EFT)".
  - Mock buttons: "Para Çek", "IBAN ekle", "IBAN'ı düzenle". The Stripe Connect equivalent is the iyzico/PayTR sub-merchant onboarding.
  - Earnings availability (recommended mirror of the EU rules): delivery confirmed **and** ≥96 h since the sale, + ≤4 h. This also covers TR chargeback and cayma risk.
  - Early Payout ("Erken Ödeme") unlocks at label creation.
- **Invoices**:
  - Platform → seller: a monthly **e-Fatura** (to VKN taxpayers) or **e-Arşiv Fatura** (to TCKN individuals) for commission + processing + KDV, published on the **10th of the next month**, mirroring Whatnot.
  - Seller → buyer: Kurumsal/Şahıs şirketi sellers must issue **e-Arşiv/e-Fatura** per sale. Add a "Fatura oluştur / yükle" action per shipment, as with Whatnot's VAT invoice generator. e-Arşiv/e-Fatura thresholds are updated by GİB every year, so check the current figures.
  - Bireysel (occasional C2C) sellers: no invoice, but they need an occasional-sales limit or should be nudged to become a şahıs şirketi. Mention the **GVK 9/6 esnaf muafiyeti** for home producers.
- **Ledger types (TR)**: Satış, Bahşiş, İade, Kargo düzeltmesi, Kargo farkı, Çekiliş kargo bedeli, Kupon, Tanıtım harcaması, Stopaj (%1), Komisyon KDV'si, Para çekme, Bonus.

Worked example (TR mock): a ₺1.000 item, buyer-paid shipping ₺84,90, KDV inside the item price.
- Commission 8% × 1.000 = ₺80,00; KDV on it 20% = ₺16,00
- Processing 2,99% × 1.084,90 = ₺32,44; + ₺0,25 = ₺32,69; KDV on it = ₺6,54
- Stopaj 1% × 1.000 = ₺10,00
- **Net to the seller ≈ ₺1.000 − 80 − 16 − 32,69 − 6,54 − 10 = ₺854,77.** Shipping passes through to the carrier.

---

## 10. Ratings and reviews [HC "Manage your seller ratings and reviews"]
- When the item is delivered, the order becomes **Pending Review**. The buyer has **30 days** to give **1–5 stars** with an optional written review. Afterwards, or after 30 days, the order is **Completed**.
- No rating is possible if the buyer requested a cancellation (accepted or declined) or the order was never marked delivered.
- Profile shows:
  - **Average rating** over all stars
  - **Total review count**, which includes star-only ratings
  - **Reviews tab**, which shows **written reviews only**
- Seller actions (app → Account → View Profile → Reviews → ⋯):
  - **Reply** once, publicly, and the reply can't be edited.
  - **Report** a review that clearly violates policy. Removal isn't guaranteed.
- Buyers can delete their review but can't edit it.
- Rating feeds Early Payout eligibility. SA lists ≥4.8; Rewards Club needs ≥**4.7**. Consistently low ratings lead to review under "What Actions We Take".
- Ratings timing doesn't affect payout.
- TR: "Değerlendirmeler", "Ortalama puan 4,9 (1.284 değerlendirme)", "Yanıtla (yalnızca bir kez, düzenlenemez)", "Şikayet et", buyer prompt "Siparişini değerlendir — 30 gün içinde".

---

## 11. Account Health and performance [HC]

| Metric (EN) | Definition | Threshold | TR |
|---|---|---|---|
| **On-Time Scan Rate** | % of orders shipped **and scanned** within 2 business days | Penalty risk if well **below 80%** for a long time. Premier needs **≥95%**. | Zamanında Kargo Oranı |
| **Refund-Free Rate** | % of orders without a seller-fault refund or replacement. SPS self-resolved cases don't count unless the item never shipped. | **≥97%** | İadesiz Sipariş Oranı |
| **Cancellation-Free Rate** | % not cancelled by the seller. Buyer requests and unfilled breaks are excluded. | **≥99%** | İptalsiz Sipariş Oranı |
| **Defect-Free Order Rate** | Cancellation-free and refund-free combined | Premier needs **≥99%** | Kusursuz Sipariş Oranı |
| **SPS Response Rate** | % of support requests answered within 2 business days | Warning if the week is **<80%**. After 3 warnings, loss of SPS and **+2% commission**. Premier needs **≥95%** over 90 days (≤3 misses are ignored). | Destek Yanıt Oranı |
| **Average Ship Time** | Business days to the first valid scan, 30-day rolling | Shown publicly | Ortalama Kargolama Süresi |

- Each metric has a detail page with a **12-week weekly history chart** (bars per order week, "projected" while scans are pending), recent issues and tips.
- **Account Standing** lists warnings and violations from the **last 180 days**, the actions taken, and an **appeal** button. Emails come from trustandsafety@.
- Mock: a Hesap Sağlığı screen with three big ring gauges (green / amber / red against the thresholds), a "Hesap Durumu: İyi" pill and a 12-week bar chart per metric.

---

## 12. Analytics, promotions and marketing

### 12.1 Seller Analytics (web only) [HC]
- Data lags **1–2 days**, all in **PT**. Only completed orders. Private shows aren't included.
- **Overview tab**:
  - **Edit Dates** (presets such as Last 30 Days)
  - Chart metric picker via **More**: Sales, Earnings, Buyer Count, Streamed Time, etc.
  - Channel filter: **All Sales / Show Sales / Marketplace Sales**
  - **Top Buyers** by sales and by orders, with CSV export
- **Shows tab**: pick a show from the last **30 days**. Hover the ⓘ next to a metric for its definition.
- **Metric definitions**:
  - Estimated Sales (after seller coupons; excludes shipping, tax, tips; refunds update within 24 h)
  - Earnings, Estimated Earnings, Completed Earnings
  - Order Count (excl. giveaways; 2 auctions count as 2)
  - AOV
  - Giveaway Spend, Giveaways
  - Buyer Count, Follows, Buyer Referrals, Buyer Shares, Top Buyers
  - Max Concurrent Viewers, Number of Shows, Streamed Time
- **Premier Shop tab**: eligibility and performance progress, updated daily.
- Analytics are estimates; use Statements for tax.

### 12.2 Promote Tools [HC] (show screen → **Promote** icon, right rail)
- **Promote Full Show**:
  - The seller sets an **hourly budget**, with an optional custom **Duration**.
  - A **Promotion Summary** shows the hourly budget, estimated impressions, duration and total spend. Promotion credits apply automatically (shown in green).
  - Charged only for the time live, and only for impressions delivered beyond organic ranking. The charge lands after the show.
- **Boost**: a surge of up to **15 min**. The seller picks a show and enters a **bid amount**. It may end early once the impressions are delivered.
- **Community Boost**:
  - Past buyers pool contributions towards a goal set by Whatnot per category. Reaching it triggers a 15-min boost with an **animated border** and a **"Boosted by Viewers"** tag.
  - Contributors get a "Booster" chat badge for that show.
  - Contributions last 30 days, then auto-refund. Sellers can't contribute or turn it off.
  - Show Promotion pauses while a Community Boost is active.
- **Cancel / End**: charged only for the time used.
- **Dashboard** (web → Marketing): Impressions, Taps/clicks, **Sustained watchers** (>30 s), Followers and first-time buyers, **Return on promotion spending (%)**.
- VAR (2024): promoted shows saw +80–140% impressions; suggested minimum spend $25.
- Availability: AT, BE, CA, FR, DE, UK, US.
- TR copy:
  - "Tanıt" (Promote)
  - "Yayını Tanıt — saatlik bütçe ₺250"
  - "Öne Çıkar (15 dk)"
  - "Topluluk Desteği"
  - "Tahmini gösterim"
  - "Toplam harcama"
  - "Tanıtım kredin: ₺500"
  - "Sponsorlu"

### 12.3 Coupons [HC] (web: Marketing → Coupons → **Create Coupon**)
- **Audience**: Everyone / New Buyers for You / New Buyers to Whatnot.
- **Coupon Code**: **4–15 characters, capital letters and numbers only.**
- **Coupon Type**: Fixed Amount (Discount Amount), or Percentage (Discount Percentage + **required Maximum Discount Amount**).
- **Minimum Purchase Amount**.
- **Shows**: Selected shows / All upcoming shows.
- Rules: the seller funds it; once per buyer, one order, single use (leftover value is lost). Type and parameters **can't be edited** after creation. It can be deactivated and reactivated.
- Dashboard columns: code, date created, discount, claimed/used counts, status. **Copy Coupon**.
- TR: "Kupon Oluştur", "Kupon kodu (4–15 karakter, büyük harf ve rakam)", "Sabit tutar / Yüzde", "Maksimum indirim", "Minimum sepet tutarı", "Kimler kullanabilir: Herkes / Sende ilk alışverişini yapacaklar / Mezatonline'da ilk alışverişini yapacaklar".

### 12.4 Rewards Club [HC]
- **Eligibility**:
  - Active seller for ≥30 days
  - ≥50 orders (excl. giveaways)
  - ≥1,000 lifetime sales in local currency
  - Rating **≥4.7**
  - Not on a second offense
- **Tiers**: Bronze → Silver → Gold → Platinum → Diamond. Names and badges can be customised.
- **Achievements**:
  - Shows watched (≥10 consecutive minutes; **Bronze only**)
  - Purchases completed (per item)
  - Amount spent (subtotal after coupons; excess spend doesn't roll over)
- Bronze needs any one achievement. Higher tiers need all of their assigned ones.
- **Rewards**: coupons (auto-issued), **tier-only shows**, membership badges. Silver and above must have a coupon or a tier-only show.
- **Coupon limits**:
  - Max value $10,000
  - **≤10 coupons per tier**
  - ≤100 uses per buyer per coupon
  - % in whole numbers from 1–100
  - No stacking; not on offers or multi-qty buys
  - Final sale
- **Seasons**: 3 months. Season 9 runs **Sep 1 – Dec 1 2026**. Progress resets each season, except **Diamond, who starts the next season at Gold**. Coupons have a **5-day (120 h)** grace period.
- Changes are limited mid-season. The seller can't cancel or delete it.
- TR: "Sadakat Kulübü", tiers "Bronz / Gümüş / Altın / Platin / Elmas", "Sezon 9 · 1 Eylül – 1 Aralık".

### 12.5 Sharing and referral [HC]
- Show link: deep-links to the app, or opens the web for logged-out users. The link preview has username, title and thumbnail.
- Shares are counted (not unique), shown before the show in a bubble, during the show in stats, and after the show in Analytics.
- Mass unsolicited DMs count as spam.
- **Seller Referral** ("Invite a Seller & Earn"):
  - The bonus amount varies.
  - The referred seller must hit the milestones (go live, sales threshold, N buyers) and have everything delivered. Giveaways, Free Pickup and private shows are excluded.
  - Ledger label: "Seller Referral Reward". Same country only.
- **Buyer referral**: SA mentions "Add your **$15 off** referral link in your social media bio". Referred users auto-follow the seller.
- Events: **"Small Seller Saturday"** (Oct 24 2026) and limited 0% fee weeks (e.g., the AU fashion week). Model these as `promoCampaign` with a commission override.

### 12.6 Leaderboards and discoverability [HC]
- **Seller Leaderboards** per category and region:
  - **Live** (real time, last 4 h, live sellers only)
  - **Daily** (rolling 24 h)
  - **Weekly** (rolling 7 d)
  - Ranked on show sales (orders + revenue) and viewership (viewers + retention). No manual adjustments. Surprise Set shows are excluded.
- **Feeds**: **For You** (live shows only, ranked on predicted watch time and orders), **Followed Hosts**, **Category** feeds (a show can appear in several).
- Signals:
  - The buyer's explicit and implied interests
  - Seller quality: show quality, listing quality, time to drop off, fulfilment, refund rate, cancellation rate
  - The seller's main category and AOV
  - The buyer's history with the seller and the category
  - Trust & Safety standing
- SA/VAR tips: go live weekly at a consistent time (+20% success in the first 3 months); keep 50+ live listings; offer free shipping to new buyers (5–7× more first-time buyers).

---

## 13. Seller tiers and badges

| Badge / status | How you get it | What it gives | TR name |
|---|---|---|---|
| **Commission tier** (Standard, Tier 1–6) | 28-day sales total | Lower commission next period | **Satıcı Seviyesi** (Standart, Seviye 1–6) |
| **Premier Shop** | Eligibility: ≥90 days selling, follows Community Guidelines, and in the last 90 days **≥10 shows, ≥250 orders (giveaways count; each BIN unit counts), ≥$/£/€50,000 sales**. Performance over the last 3 full months: **≥95% on-time scan, ≥99% defect-free, ≥95% SPS response**. Evaluated on the **1st of each month at 07:00 UTC**; benefits active from 23:00 UTC that day for one month. No cap. Serious violations (hate, harassment, fee avoidance, gambling) remove it immediately. | **Badge on profile and show thumbnails**, more discoverability, prioritised Seller Support. The –10% commission ends Oct 31 2026. | **Seçkin Mağaza** ⭐ (thresholds TR proposal: ≥₺2.000.000 in 90 days, 250 orders, 10 shows) |
| **Verified Brand** | Brand owners only. Apply via Seller Status → Verified Brand → Get Verified (EIN/TIN, website, trademark numbers, size). | "Shopping directly with the brand" badge | **Onaylı Marka** (VKN, TPE marka tescil no) |
| **Early Payout** | Rating, show count and lifetime-volume thresholds; checked daily | Earnings available at label creation | **Erken Ödeme** |
| **Gated category access** | Application | Can sell Luxury, Supplements, etc. | **Onaylı Kategori** |
| **Leaderboard rank** | Live, daily, weekly performance | Visibility | **Liderlik Tablosu** |
| **Average Ship Time** chip | Automatic | Trust signal on profile, shows and listings | "Ort. 1,2 günde kargolar" |
| **"On vacation"** | Vacation Mode | — | **Tatilde** |
| Buyer-side badges in seller chat: Rewards Club tier badge, "Booster", Mod badge | — | — | Elmas Üye, Destekçi, Mod |

---

## 14. Team permissions [HC] (web Settings → **Team**)

| Role | Can | Can't |
|---|---|---|
| **Owner** (the creator; non-transferable except through Support) | Everything. The only role that can change payout details or delete the account. | — |
| **Admin** | Inventory, shipping, live show and chat, DMs, team management, reports and analytics, spend money, request payouts | Delete the account, edit payout details, change password |
| **Seller** | Inventory, shipping, live show and chat, DMs | Spend, reports, manage the team, payout details, etc. |
| **Support** | Inventory, shipping, DMs | Live features, spending, reports, team |

Invite by email with a role (the **Pending** tab lets you resend or cancel). Remove with ⋯ → **Remove access**. Members switch accounts with **Switch role**. TR roles: **Sahip / Yönetici / Satıcı / Destek**.

---

## 15. Seller DMs [HC]
- Inbox tabs: **All messages**, **Customer Support** (SPS), **Whatnot Support** (Whatbot).
- Message a buyer from an order: Orders → order → buyer username → **Message**.
- Group DMs hold up to **32** people. Messages from non-connections land in **Message requests**. Conversations can be **Mark unread** or **Archive**d. Report and Block are available.
- Rules: no off-platform payment or contact sharing, no unsolicited promo links. Whatnot may review messages.
- TR: "Mesajlar", "Müşteri Destek", "Mesaj istekleri", "Okunmadı olarak işaretle", "Arşivle". Add an auto-warning when someone types a phone number, IBAN or an "@instagram" handle: "Güvenliğin için ödemeleri Mezatonline dışında yapma."

---

## 16. Policy items that shape the seller UX [HC]
- **Listing guidelines**:
  - Every listing must offer an item (no "buy me a coffee"; use Tips instead).
  - No keyword stuffing or clickbait.
  - Real photos. At least one photo showing the whole item clearly.
  - Accurate title, description and category.
  - No unreasonable prices.
  - **No duplicate listings: use quantity >1 instead.**
- **Gambling and purchase-based prizes**: raffles, wheels, races, lotteries, casino games, Plinko/Bingo randomizers, weighted odds, paid bounties, "guess games", "wars" and BAGs used as paid raffles are all prohibited. Breaks and surprise sets have their own policies.
  - **TR**: this matches Turkish şans oyunları restrictions (MPİ / Spor Toto). Keep these rules strictly.
- **Explicit content**: no nudity or graphic content. Thumbnails may be detected and down-ranked. The per-show "Explicit content" toggle only covers strong language.
- **Hazmat**:
  - Prohibited: fuels, explosives, airbags, mercury, etc.
  - Allowed with carrier rules: lithium batteries, aerosols, fragrances, nail polish, lighters (empty), paint, glue, sanitizer.
  - **TR**: PTT and the private carriers restrict **lityum pil, aerosol, parfüm, yanıcı sıvı**. The hazmat flag should limit carrier options, e.g., force PTT Kargo or "Kara yolu" only.
- **Seller disclosure (German "Impressum")**:
  - **TR**: 6563 sayılı Kanun and the Elektronik Ticarette Hizmet Sağlayıcı ve Aracı Hizmet Sağlayıcılar Hakkında Yönetmelik. Marketplaces must show B2C sellers' identity details (unvan, MERSİS/VKN, adres, iletişim) on the listing and shop pages, and the platform must be registered in **ETBİS**. Add a "Satıcı Bilgileri" section to the seller profile for Kurumsal sellers.
- **Shipping policy**: 2 business days, scan required, and the seller is billed back for late or unverified shipments. US rule from **Mar 2 2026**.

---

## 17. Turkey localization: consolidated checklist

| Topic | Decision / note |
|---|---|
| Language and locale | `tr-TR`. Dates "26 Eki 2026, 21:00". Relative time "2 sa önce". Business days follow the TR calendar (§8.5). TZ `Europe/Istanbul`. |
| Currency | TRY, symbol **₺**, thousands ".", decimals ",". Bids are whole lira. Fees show kuruş. |
| Identity / KYC | TCKN (11 digits; checksum: d10 = ((d1+d3+d5+d7+d9)×7 − (d2+d4+d6+d8)) mod 10; d11 = sum(d1..d10) mod 10). VKN (10 digits) for companies. SMS OTP. 18+. |
| Payout | **IBAN** (TR, 26 chars, mod-97, name match). Sub-merchant onboarding through iyzico / PayTR / Param (the Stripe Connect equivalent). "1 iş günü". |
| Payments (buyer side, affects seller net) | Credit and debit cards, **taksit**, 3DS, TROY. Processing fee mock %2,99 + ₺0,25. |
| Tax | KDV **%20** (general) on platform commission and fees. **E-ticaret stopajı %1** withheld from seller payouts (since 1 Jan 2025). e-Arşiv / e-Fatura from platform to seller monthly. Sellers' own invoicing duty depends on seller type. |
| Consumer law | 6502 TKHK. 14-day **cayma hakkı** for B2C distance sales; Ön Bilgilendirme Formu + Mesafeli Satış Sözleşmesi before checkout. Not applicable to C2C. Check the auction exception with counsel. |
| E-commerce law | 6563 + Yönetmelik. **ETBİS** registration. Seller identity disclosure for B2C. **İYS** for commercial messages (go-live pushes and emails to followers should count as service notifications or get consent). |
| Data protection | **KVKK** 6698: Aydınlatma Metni, separate Açık Rıza. Data stays in the country or uses explicit cross-border consent (Supabase region choice later). |
| Giveaways / çekiliş | Needs **MPİ izni** (320 KHK + 2006 yönetmelik). Feature-flag it, require "katılım için alışveriş şartı yoktur", and don't ship BAGs in TR. |
| Carriers | Yurtiçi, Aras, MNG/DHL eCommerce, PTT Kargo, Sürat, HepsiJet, Kolay Gelsin, Sendeo, UPS TR. Pricing by **desi** (cm³/3000) vs kg, whichever is greater. Drop-off: şube teslim; adresten alım; PTT kargo kabul. |
| Addresses | İl (81) → İlçe → Mahalle → Cadde/Sokak → No → Daire → Posta kodu (5) → Adres tarifi. Phone +90 5XX. |
| Categories (TR market fit) | Add: Futbol forması & taraftar ürünleri, Panini/futbolcu kartları, Antika & Osmanlı objeleri, Halı & Kilim, Pul & Para (nümismatik), Saat, Takı & Altın (gated: altın/ziynet), Sneaker, Vintage giyim, Kozmetik, Oyuncak & Figür, Pokémon/TCG, Plak & Kaset, Kitap & Dergi, Elektronik. |
| Naming of mechanics | Açık Artırma, Hemen Al, Flaş İndirim, Çekiliş, Ön Teklif, Maksimum Teklif, Ani Bitiş 💀, Uzatma süresi, Sabitle, Baskın (raid), Ortak Yayıncı (co-host), Bahşiş, Klip, Yayın Notları, Tanıt / Öne Çıkar, Sadakat Kulübü, Seçkin Mağaza, Akıllı Paketleme, Elden Teslim, Tatil Modu, Prova Modu. |

---

## 18. Mock data model (TypeScript sketch for `src/types`)

```ts
type SellerType = 'bireysel' | 'sahis_sirketi' | 'kurumsal';
type ApplicationStatus = 'not_applied' | 'pending_review' | 'approved' | 'denied';

interface SellerProfile {
  userId: string; sellerType: SellerType; applicationStatus: ApplicationStatus;
  primaryCategoryId: string; experienceLevel: 'new' | 'other_platforms' | 'physical_store';
  verification: { phone: boolean; idDocument: boolean; payoutMethod: boolean };
  legalName: string; tckn?: string; vkn?: string; taxOffice?: string; companyTitle?: string;
  iban?: string; returnAddress: TRAddress; pickupAddress?: TRAddress & { instructions: string };
  rating: { average: number; count: number; writtenCount: number };
  avgShipTimeDays: number; vacationMode: boolean;
  badges: Array<'premier' | 'verified_brand' | 'early_payout'>;
  tier: { level: 0|1|2|3|4|5|6; periodStart: string; periodEnd: string; periodSalesTRY: number; projectedSalesTRY: number };
  health: { onTimeScanRate: number; refundFreeRate: number; cancellationFreeRate: number; spsResponseRate?: number; weekly: Array<{ week: string; onTime: number; refundFree: number; cancelFree: number }> };
  gatedCategories: string[]; team: Array<{ userId: string; role: 'owner'|'admin'|'seller'|'support'; status: 'active'|'pending' }>;
}

interface ShowSettings {
  title: string; startsAt: string; categoryId: string; subcategoryId?: string;
  format: 'auction' | 'buy_now' | 'breaks' | 'surprise_sets';
  thumbnailUrl?: string; previewVideoUrl?: string; tags: string[]; primaryBrand?: string;
  moderatorIds: string[]; repeat?: 'none' | 'daily' | 'weekly';
  visibility: 'public' | 'private'; minRewardsTier?: RewardsTier;
  explicitLanguage: boolean; mutedWords: string[];
  shipping: { costMode: 'buyer_pays' | 'buyer_pays_up_to' | 'seller_pays'; buyerMaxTRY?: number; carriers: CarrierId[]; freePickup: boolean };
  verifiedBuyersOnly: boolean; disablePrebids: boolean; auctionNumberingByShow: boolean;
  tipMessage?: string /* ≤24 */; showTipMessagesInChat: boolean; showNotes?: string;
}
type ShowStatus = 'scheduled' | 'live' | 'paused' | 'ended' | 'cancelled';
// Live session state: pinnedListingId (one at a time), activeAuction, activeFlashSale, activeGiveaway (≤1), coHostId (≤1), viewers, stats {estGrossTRY, estOrders, durationSec, shares}

interface Listing {
  id: string; sellerId: string; status: 'active' | 'draft' | 'inactive';
  quality: 'quality' | 'temporary'; categoryId: string; subcategoryId?: string;
  title: string; description?: string; media: Array<{ type: 'image' | 'video'; uri: string }>; // video ≤30s, images ≤8
  condition?: string; attributes?: Record<string, string>;
  quantity: number; listIndividually?: boolean;
  variants?: { options: Array<{ name: string; values: string[] }> /* ≤3 */; items: Array<{ key: string; qty: number; priceTRY?: number }> /* ≤2048 */ };
  sku?: string; costPerItemTRY?: number;
  shippingProfileId: string; hazmat: boolean;
  format: 'buy_now' | 'auction' | 'giveaway';
  buyNow?: { priceTRY: number; acceptOffers: boolean; reserveForLive: boolean;
    flashSale?: { type: 'percent' | 'amount'; value: number; durationSec: number; availableAtFullPrice: boolean; maxPerBuyer?: number } };
  auction?: { startingBidTRY: number; suddenDeath: boolean; prebidsDisabled: boolean };
  giveaway?: { audience: 'everyone' | 'followers' | 'buyer_appreciation'; rules?: string };
  showIds: string[]; // clones share inventory
}
// Auction run params (chosen at start): { durationSec, counterBidSec, suddenDeath, startingBidTRY, variantKey? }

interface ShippingProfile { id: string; name: string; kind: 'suggested' | 'custom'; maxWeightG: number; maxDesi?: number; incrementalWeightG?: number; maxBundleSize?: number; boxCm?: [number, number, number]; buyerPriceTRY?: number }

type OrderStatus = 'paid' | 'pending_cancellation' | 'label_created' | 'shipped' | 'delivered' | 'pending_review' | 'completed' | 'cancelled' | 'refunded';
interface Order { id: string; listingId: string; showId?: string; channel: 'live' | 'marketplace'; buyFormat: 'auction'|'buy_now'|'giveaway'; saleType?: 'FLASH';
  buyerId: string; qty: number; itemPriceTRY: number; couponTRY: number; shippingPaidByBuyerTRY: number; shippingPaidBySellerTRY: number;
  commissionTRY: number; commissionVatTRY: number; processingTRY: number; processingVatTRY: number; stopajTRY: number; netTRY: number;
  status: OrderStatus; earningsStatus: 'processing' | 'completed' | 'cancelled'; shipmentId?: string; createdAt: string; cancelRequest?: { at: string; note?: string; deadline: string } }

type ShipmentStatus = 'needs_label' | 'ready_to_ship' | 'shipping' | 'in_transit' | 'delivered' | 'overdue' | 'returned';
interface Shipment { id: string; buyerId: string; orderIds: string[]; carrier: CarrierId; trackingNo?: string; weightG: number; desi: number; status: ShipmentStatus; labelUrl?: string; dropOffPhotoUri?: string; shipBy: string }

interface LedgerEntry { id: string; createdAt: string; completedAt?: string; amountTRY: number; type: 'sale'|'tip'|'adjustment'|'refund'|'payout'|'bonus'|'promote'|'stopaj'|'giveaway_shipping'; status: 'processing'|'completed'; orderId?: string; listingId?: string; message: string }
interface Payout { id: string; amountTRY: number; iban: string; status: 'processing'|'completed'|'failed'; requestedAt: string; eta: string }
interface Review { id: string; orderId: string; buyerId: string; stars: 1|2|3|4|5; text?: string; createdAt: string; sellerReply?: { text: string; at: string } /* once, immutable */ }
interface Coupon { code: string /* ^[A-Z0-9]{4,15}$ */; audience: 'everyone'|'new_to_seller'|'new_to_platform'; type: 'amount'|'percent'; value: number; maxDiscountTRY?: number; minPurchaseTRY?: number; showIds: string[] | 'all_upcoming'; active: boolean; claimed: number; used: number }
```

Seed data suggestion: one approved seller with a full history:
- 42 shows, 1,284 ratings at 4.9, avg ship 1.2 days
- Health 96% / 99.2% / 99.6%
- Tier 2, Premier badge
- Three upcoming shows, one live, one ended within the last 2 h (so the restart CTA shows)
- 30 inventory items across tabs
- 25 orders across every status, incl. one pending cancellation and one SPS request
- 12 shipments (needs label / ready / shipping / delivered / overdue)
- Ledger of 40 entries, 5 payouts (one failed)
- 18 reviews (3 with replies)
- 3 coupons

---

## 19. Seller-side screen list for Mezatonline (build order)

1. **Satıcı Ol** application wizard (§2) → **İlk Yayın Kontrol Listesi**.
2. **Satıcı Paneli** home: tier tracker, upcoming shows, quick actions, bonus banner, summary cards (Bugünkü satış, Kargolanacak, Bekleyen iptal talepleri, Bakiye).
3. **Yayın Planla** form (§4.2), plus show detail/edit/share/cancel/clone.
4. **Envanter**: tabs, **Ürün Oluştur** form (§5.2), variants, drafts, bulk.
5. **Canlı Yayın (satıcı)**: camera view (expo-camera), chat with filters and commands, viewer list and stats sheet, **Mağaza** sheet (Açık Artırma / Hemen Al / Çekiliş / Satılanlar), **Açık Artırma Başlat** sheet, pin card, flash sale, giveaway, offers, mod actions, ⋯ menu (Bitir, Baskın, Ayarlar, Doğrulanmış alıcı, Bahşiş ayarı), Tanıt, Yayın Notları.
6. **Yayın Özeti** (post-show).
7. **Siparişler** + order detail (fee breakdown, iptal, mesaj, video makbuz).
8. **Gönderiler**: needs label → etiket oluştur (single/bulk), birleştir/ayır, düzenle, **Kargoya Teslim Ettim** scanner (expo-camera), takip.
9. **Ödemeler**: bakiye (İşlemde / Kullanılabilir), Para Çek, IBAN, Erken Ödeme progress, **Hesap Hareketleri** with filters, Ekstreler.
10. **Teklifler**, **Bahşişler**, **Kuponlar**, **Tanıtım**, **Sadakat Kulübü**.
11. **Analizler** (overview chart, per-show), **Hesap Sağlığı**, **Değerlendirmeler** (reply/report).
12. **Ayarlar**: Kargo Ayarları/Profilleri, Elden Teslim, Satıcı Durumu (onaylı kategoriler), Prova Modu, Tatil Modu, Ekip.

---

### Key sources
- help.whatnot.com articles (all retrieved 2026-10-26):
  - 8442834600333 Apply to sell
  - 360061602851 Start selling
  - 8246355042957 Denial reasons
  - 38855359354381 Seller verification
  - 9778927885581 Schedule a show
  - 6218017419021 Private show
  - 23432199794445 Rehearsal Mode
  - 9779149424269 Create listings
  - 37446074410381 New seller listing guide
  - 4407962164621 Shipping profiles
  - 34889029544845 Variants
  - 9867355061773 Quantities
  - 27923927177997 Clone
  - 48441579309837 Manage listings
  - 14578719543821 Offers
  - 13177817006477 Giveaway listing
  - 11329612850317 Run giveaway
  - 11329417780365 Giveaway policy
  - 9779931101837 Start auction
  - 14932924544141 Bidding
  - 14933026908301 Pre-bid
  - 47956550101645 Pinning
  - 32761422601869 Flash Sale
  - 23951958152461 Show management
  - 47552166935181 Live Analytics
  - 21988369770637 Mod commands
  - 6212550318477 Moderator guidelines
  - 9780105750669 Remove from show
  - 32239228636557 Disruptive users
  - 15895925382413 Co-host
  - 11429333286669 Raid
  - 12955560391309 Restart
  - 9952247596173 Two devices
  - 7692049973133 Livestream tools
  - 15533133248653 Multicast
  - 5497980244749 OBS
  - 9535359092749 Clips
  - 48071443244557 Share show
  - 15463542041229 Show Notes
  - 4968064385933 Verified Buyers
  - 47808284488973 Party Purchase
  - 26596362677389 Breaks
  - 34545407302797 Surprise Sets
  - 48316819355021 Sorting Labels
  - 36860251881869 Shipping setup
  - 43260508854797 Shipping settings
  - 15788140338957 Free/discounted shipping
  - 26310231704333 Free Pickup
  - 46768886074765 US shipping
  - 27398638385037 DE shipping
  - 27641952241037 UK shipping
  - 16285911553677 Smart Bundling
  - 36466032298381 Bundle/unbundle
  - 15788412820749 Shipment adjustments
  - 38685820508941 Label defaults
  - 39141311489421 Labels
  - 4406544597773 Pack & ship
  - 43295059160973 Seller shipping policy
  - 39184750709261 In-app scanner
  - 8494865333005 Avg ship time
  - 360061603971 Seller cancel
  - 9810585575693 Cancellation requests
  - 48366158177165 Orders vs shipments
  - 36107067835533 Show report
  - 12165139226893 VOD/video receipts
  - 37012119661709 Weekly Bundling
  - 26528358542349 Seller Provided Support
  - 360061195412 Seller Protection
  - 4847069165965 Seller fees
  - 27912945518733 High-value commission
  - 360061604191 When you get paid
  - 360061604151 Payouts
  - 38943415944205 Earnings status
  - 4417983584141 Early Payout
  - 44413003987981 Ledger
  - 25660406868109 Statements
  - 36772664621837 Weekly orders report
  - 42717152170381 VAT invoices to sellers
  - 39649270322829 VAT invoices to buyers
  - 15296059461005 Tips
  - 26543966203405 Ratings
  - 34468945178381 Account Health
  - 41945906342029 Seller performance
  - 31084236928909 Premier Shop
  - 12231027226637 Seller Analytics
  - 34443991672589 Promote Tools
  - 30706277083021 Community Boost
  - 15668196466189 Coupons
  - 27689721056909 Rewards Club
  - 44918704243469 Leaderboards
  - 12190921464461 Discoverability
  - 23265704578445 Sales Match
  - 40516878806925 Super Seller bonus
  - 4645129783181 Seller referral
  - 30400729663885 Team Permissions
  - 6590759272845 Seller DMs
  - 19527461974541 Gated categories
  - 360061195612 Listing guidelines
  - 4410443596813 Gambling policy
  - 11324660673037 Hazmat
  - 24898437653261 Impressum
  - 360061195812 Seller countries
  - 9779568633997 Vacation Mode
  - 7440530071821 CSV import
  - 12884437766413 Barcode/slab scan
  - 47600359516941 Templates
  - 360061603611 Verified Brands
- Seller Academy Go Live Guide: https://selleracademy.whatnot.com/guide
- Value Added Resource: https://www.valueaddedresource.net/whatnot-tools-to-help-new-sellers-go-live/ (Feb 2024) and https://www.valueaddedresource.net/whatnot-drafts-inventory-dashboard-updates/ (Jun 2024)
- Third-party (auction timing): https://fanter.co.uk/guides/selling/whatnot-live-auctions, https://closo.co/blogs/platform-specific-guides/inside-the-whatnot-seller-hub-a-survival-guide-for-live-auctions-in-2026, https://mycomicscollection.com/en/blog/whatnot-comics-live-auction-strategy-2026/
- TR: e-ticaret stopajı %1 (https://www.t24.com.tr/index.php/yazarlar/erdogan-saglam/9-soruda-e-ticarete-getirilen-yuzde-1-stopaj-uygulamasi,48076; https://tr.andersen.com/tr/images/pdf/and_03%20-elektronik-%20ticarette-%20tevkifat.pdf); MPİ çekiliş izni (https://www.hukukihaber.net/cekilis; https://www.eleman.net/is-rehberi/pratik-bilgiler/milli-piyangodan-cekilis-izni-h15483); iyzico (https://www.ideasoft.com.tr/iyzico-nedir-nasil-kullanilir/)
