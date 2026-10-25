-- Mezatonline — Supabase taslak şeması (henüz uygulanmadı)
-- Uygulama şu an mock veriyle çalışıyor; bu şema src/types/index.ts modellerinin karşılığıdır.
-- Uygulama: supabase db push  (veya Supabase panelinden SQL Editor)

create extension if not exists "pgcrypto";

-- ─── Profiller ───────────────────────────────────────────────────────────────
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  username text unique not null check (username ~ '^[a-z0-9_]{3,30}$'),
  display_name text not null default '',
  avatar_url text,
  cover_url text,
  bio text not null default '' check (char_length(bio) <= 1000),
  city text,
  is_seller boolean not null default false,
  badges text[] not null default '{}',
  rating numeric(2,1) not null default 0,
  review_count int not null default 0,
  followers_count int not null default 0,
  following_count int not null default 0,
  items_sold int not null default 0,
  avg_ship_days numeric(3,1) not null default 0,
  interests text[] not null default '{}',
  phone text,
  created_at timestamptz not null default now()
);

create table public.follows (
  follower_id uuid references public.profiles on delete cascade,
  followee_id uuid references public.profiles on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id)
);

create table public.blocks (
  blocker_id uuid references public.profiles on delete cascade,
  blocked_id uuid references public.profiles on delete cascade,
  primary key (blocker_id, blocked_id)
);

-- ─── Kategoriler ─────────────────────────────────────────────────────────────
create table public.categories (
  id text primary key,
  name text not null,
  short_name text not null,
  emoji text,
  image_url text,
  tint text,
  sort int not null default 0
);

create table public.subcategories (
  id text primary key,
  category_id text not null references public.categories on delete cascade,
  name text not null,
  image_url text
);

-- ─── Yayınlar ────────────────────────────────────────────────────────────────
create type show_status as enum ('scheduled', 'live', 'ended');

create table public.shows (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles on delete cascade,
  title text not null check (char_length(title) <= 80),
  description text not null default '',
  cover_url text,
  video_url text,
  category_id text references public.categories,
  subcategory_id text references public.subcategories,
  tags text[] not null default '{}',
  status show_status not null default 'scheduled',
  viewers int not null default 0,
  scheduled_at timestamptz not null,
  started_at timestamptz,
  ended_at timestamptz,
  shipping_cost numeric(10,2) not null default 65,
  free_shipping_threshold numeric(10,2),
  highlights text[] not null default '{}',
  is_private boolean not null default false,
  created_at timestamptz not null default now()
);
create index on public.shows (status, scheduled_at);

create table public.show_reminders (
  user_id uuid references public.profiles on delete cascade,
  show_id uuid references public.shows on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, show_id)
);

-- ─── Ürünler / İlanlar ───────────────────────────────────────────────────────
create type listing_format as enum ('auction', 'buy_now', 'giveaway');
create type item_condition as enum ('new', 'like_new', 'very_good', 'good', 'fair', 'graded');
create type shipping_profile as enum ('small', 'medium', 'large', 'xlarge');

create table public.products (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles on delete cascade,
  show_id uuid references public.shows on delete set null,
  title text not null check (char_length(title) <= 80),
  description text not null default '',
  images text[] not null default '{}',
  category_id text references public.categories,
  subcategory_id text references public.subcategories,
  condition item_condition not null default 'new',
  grade text,
  format listing_format not null,
  price numeric(12,2) not null check (price >= 0),
  compare_at_price numeric(12,2),
  quantity int not null default 1 check (quantity >= 0),
  sold int not null default 0,
  shipping_profile shipping_profile not null default 'small',
  shipping_cost numeric(10,2) not null,
  sudden_death boolean not null default false,
  accepts_offers boolean not null default false,
  status text not null default 'active' check (status in ('active', 'draft', 'inactive')),
  created_at timestamptz not null default now()
);
create index on public.products (seller_id);
create index on public.products (show_id);

create table public.saved_products (
  user_id uuid references public.profiles on delete cascade,
  product_id uuid references public.products on delete cascade,
  primary key (user_id, product_id)
);

-- ─── Açık artırma (sunucu otoritesi — Edge Function / Realtime) ─────────────
create table public.lots (
  id uuid primary key default gen_random_uuid(),
  show_id uuid not null references public.shows on delete cascade,
  product_id uuid not null references public.products,
  start_price numeric(12,2) not null,
  current_bid numeric(12,2) not null,
  bid_count int not null default 0,
  leader_id uuid references public.profiles,
  duration_sec int not null,
  counter_bid_sec int not null default 10,
  sudden_death boolean not null default false,
  started_at timestamptz not null default now(),
  ends_at timestamptz not null,
  status text not null default 'running' check (status in ('running', 'sold', 'unsold'))
);

create table public.bids (
  id uuid primary key default gen_random_uuid(),
  lot_id uuid not null references public.lots on delete cascade,
  bidder_id uuid not null references public.profiles,
  amount numeric(12,2) not null,
  is_proxy boolean not null default false,
  created_at timestamptz not null default now()
);

-- Maks. teklif tavanı yalnızca sahibine görünür (RLS)
create table public.max_bids (
  lot_id uuid references public.lots on delete cascade,
  bidder_id uuid references public.profiles on delete cascade,
  max_amount numeric(12,2) not null,
  created_at timestamptz not null default now(),
  primary key (lot_id, bidder_id)
);

create table public.pre_bids (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products on delete cascade,
  show_id uuid not null references public.shows on delete cascade,
  bidder_id uuid not null references public.profiles on delete cascade,
  max_amount numeric(12,2) not null,
  status text not null default 'winning',
  created_at timestamptz not null default now(),
  unique (product_id, bidder_id)
);

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  show_id uuid not null references public.shows on delete cascade,
  user_id uuid references public.profiles,
  type text not null default 'chat',
  text text not null check (char_length(text) <= 300),
  amount numeric(12,2),
  created_at timestamptz not null default now()
);
create index on public.chat_messages (show_id, created_at desc);

create table public.giveaways (
  id uuid primary key default gen_random_uuid(),
  show_id uuid not null references public.shows on delete cascade,
  product_id uuid references public.products,
  requires_follow boolean not null default false,
  ends_at timestamptz not null,
  winner_id uuid references public.profiles,
  status text not null default 'running'
);

create table public.giveaway_entries (
  giveaway_id uuid references public.giveaways on delete cascade,
  user_id uuid references public.profiles on delete cascade,
  primary key (giveaway_id, user_id)
);

-- ─── Adres & ödeme ───────────────────────────────────────────────────────────
create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade,
  title text not null default 'Ev',
  full_name text not null,
  phone text not null,
  city text not null,
  district text not null,
  neighborhood text not null,
  line text not null,
  postal_code text,
  is_default boolean not null default false
);

-- Kart verisi asla burada tutulmaz: yalnızca ödeme sağlayıcı (iyzico) token'ı
create table public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade,
  provider_token text not null,
  brand text not null,
  last4 text not null,
  bank text,
  expiry text not null,
  is_default boolean not null default false
);

-- ─── Siparişler ──────────────────────────────────────────────────────────────
create type order_status as enum ('paid', 'preparing', 'shipped', 'out_for_delivery', 'delivered', 'cancelled', 'return_requested', 'refunded');

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  number text unique not null,
  buyer_id uuid not null references public.profiles,
  seller_id uuid not null references public.profiles,
  product_id uuid not null references public.products,
  show_id uuid references public.shows,
  source text not null check (source in ('auction', 'buy_now', 'giveaway', 'offer', 'flash_sale')),
  quantity int not null default 1,
  item_price numeric(12,2) not null,
  shipping_cost numeric(10,2) not null,
  service_fee numeric(10,2) not null default 0,
  credit_used numeric(10,2) not null default 0,
  total numeric(12,2) not null,
  status order_status not null default 'paid',
  carrier text,
  tracking_number text,
  address_id uuid references public.addresses,
  payment_method_id uuid references public.payment_methods,
  reviewed boolean not null default false,
  created_at timestamptz not null default now()
);
create index on public.orders (buyer_id, created_at desc);
create index on public.orders (seller_id, status);

create table public.order_events (
  id bigserial primary key,
  order_id uuid not null references public.orders on delete cascade,
  status order_status not null,
  note text,
  at timestamptz not null default now()
);

create table public.offers (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products on delete cascade,
  buyer_id uuid not null references public.profiles on delete cascade,
  amount numeric(12,2) not null,
  counter_amount numeric(12,2),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'countered', 'expired')),
  created_at timestamptz not null default now()
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  order_id uuid unique references public.orders on delete cascade,
  seller_id uuid not null references public.profiles,
  buyer_id uuid not null references public.profiles,
  rating int not null check (rating between 1 and 5),
  shipping int check (shipping between 1 and 5),
  packaging int check (packaging between 1 and 5),
  accuracy int check (accuracy between 1 and 5),
  text text check (char_length(text) <= 500),
  seller_reply text,
  created_at timestamptz not null default now()
);

-- ─── Mesajlar & bildirimler ──────────────────────────────────────────────────
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references public.profiles on delete cascade,
  user_b uuid not null references public.profiles on delete cascade,
  order_id uuid references public.orders,
  created_at timestamptz not null default now(),
  unique (user_a, user_b)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations on delete cascade,
  sender_id uuid not null references public.profiles,
  text text not null,
  image_url text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade,
  type text not null,
  title text not null,
  body text not null default '',
  image_url text,
  href text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

-- ─── Satıcı finansı ──────────────────────────────────────────────────────────
create table public.seller_applications (
  user_id uuid primary key references public.profiles on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'denied')),
  category_id text references public.categories,
  experience text,
  monthly_volume text,
  tax_type text check (tax_type in ('individual', 'sole_proprietor', 'company')),
  iban text,
  submitted_at timestamptz not null default now()
);

create table public.payouts (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles on delete cascade,
  amount numeric(12,2) not null,
  iban text not null,
  status text not null default 'processing' check (status in ('pending', 'processing', 'paid')),
  created_at timestamptz not null default now()
);

create table public.credit_ledger (
  id bigserial primary key,
  user_id uuid not null references public.profiles on delete cascade,
  amount numeric(10,2) not null,
  description text not null,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

-- ─── RLS ─────────────────────────────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.follows enable row level security;
alter table public.shows enable row level security;
alter table public.products enable row level security;
alter table public.addresses enable row level security;
alter table public.payment_methods enable row level security;
alter table public.orders enable row level security;
alter table public.max_bids enable row level security;
alter table public.messages enable row level security;
alter table public.conversations enable row level security;
alter table public.notifications enable row level security;
alter table public.chat_messages enable row level security;

create policy "profiller herkese açık" on public.profiles for select using (true);
create policy "kendi profilini güncelle" on public.profiles for update using (auth.uid() = id);

create policy "takipler herkese açık" on public.follows for select using (true);
create policy "kendi takibini yönet" on public.follows for all using (auth.uid() = follower_id) with check (auth.uid() = follower_id);

create policy "yayınlar herkese açık" on public.shows for select using (not is_private or seller_id = auth.uid());
create policy "satıcı kendi yayınını yönetir" on public.shows for all using (seller_id = auth.uid()) with check (seller_id = auth.uid());

create policy "aktif ürünler herkese açık" on public.products for select using (status = 'active' or seller_id = auth.uid());
create policy "satıcı kendi ürününü yönetir" on public.products for all using (seller_id = auth.uid()) with check (seller_id = auth.uid());

create policy "kendi adresleri" on public.addresses for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "kendi kartları" on public.payment_methods for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "alıcı veya satıcı siparişi görür" on public.orders for select using (buyer_id = auth.uid() or seller_id = auth.uid());

create policy "maks teklif yalnız sahibine" on public.max_bids for all using (bidder_id = auth.uid()) with check (bidder_id = auth.uid());

create policy "sohbet katılımcıları" on public.conversations for select using (auth.uid() in (user_a, user_b));
create policy "mesaj katılımcıları" on public.messages for select using (
  exists (select 1 from public.conversations c where c.id = conversation_id and auth.uid() in (c.user_a, c.user_b))
);
create policy "mesaj gönder" on public.messages for insert with check (
  sender_id = auth.uid() and exists (select 1 from public.conversations c where c.id = conversation_id and auth.uid() in (c.user_a, c.user_b))
);

create policy "kendi bildirimleri" on public.notifications for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "yayın sohbeti herkese açık" on public.chat_messages for select using (true);
create policy "sohbete yaz" on public.chat_messages for insert with check (user_id = auth.uid() and type = 'chat');

-- Teklif verme, lot bitirme, sipariş oluşturma ve ödeme çekimi istemciden değil,
-- sunucu tarafında (Edge Function: place-bid, close-lot, create-order) service_role ile yapılmalı.
