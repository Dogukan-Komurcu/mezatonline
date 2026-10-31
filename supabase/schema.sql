-- Mezatonline — Supabase taslak şeması (henüz uygulanmadı)
-- Uygulama şu an demo olarak mock veriyle çalışıyor; bu şema src/types/index.ts modellerinin karşılığıdır.
-- Uygulama: supabase db push  (veya Supabase panelinden SQL Editor)
--
-- Güvenlik ilkeleri:
-- - Her tabloda RLS açık; en az yetki: kullanıcı yalnızca kendi satırlarını okur/yazar.
-- - Herkese açık okuma yalnızca katalog verisinde: kategoriler, canlı/planlı yayınlar, aktif ilanlar,
--   herkese açık profil alanları ve değerlendirmeler.
-- - Telefon vb. kişisel veri herkese açık profiles tablosunda tutulmaz (profile_private).
-- - TCKN burada hiç saklanmaz; kimlik doğrulama (KYC) lisanslı ödeme kuruluşunda yapılır.
-- - Teklif, lot bitirme, sipariş, ödeme, ödeme aktarımı ve bildirim üretimi yalnızca sunucuda
--   (Edge Function, service_role) yapılır; bu tablolarda istemciye yazma politikası yoktur.
-- - Hesap silme: sunucu auth.admin.deleteUser çağırır; kişisel tablolar silinir (cascade),
--   saklanması gereken kayıtlarda (sipariş, teklif, değerlendirme, ödeme aktarımı) kullanıcı
--   bağlantısı NULL yapılarak anonimleştirilir (on delete set null).

create extension if not exists "pgcrypto";

-- ─── Profiller ───────────────────────────────────────────────────────────────
-- Yalnızca herkese açık profil alanları
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
  created_at timestamptz not null default now()
);

-- Özel profil verisi: yalnızca sahibi okur/yazar.
-- E-posta ve doğrulanmış telefon ayrıca auth.users'ta tutulur. TCKN ve IBAN burada saklanmaz.
create table public.profile_private (
  id uuid primary key references public.profiles on delete cascade,
  phone text,
  interests text[] not null default '{}',
  updated_at timestamptz not null default now()
);

create table public.follows (
  follower_id uuid references public.profiles on delete cascade,
  followee_id uuid references public.profiles on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);
create index on public.follows (followee_id);

create table public.blocks (
  blocker_id uuid references public.profiles on delete cascade,
  blocked_id uuid references public.profiles on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create index on public.blocks (blocked_id);

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
  category_id text references public.categories on delete set null,
  subcategory_id text references public.subcategories on delete set null,
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
create index on public.shows (seller_id);

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
  category_id text references public.categories on delete set null,
  subcategory_id text references public.subcategories on delete set null,
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
-- Lot ve teklif kayıtları satış kanıtı olarak saklanır: yayın, ürün veya kullanıcı silinse de
-- satır kalır, bağlantı NULL olur.
create table public.lots (
  id uuid primary key default gen_random_uuid(),
  show_id uuid references public.shows on delete set null,
  product_id uuid references public.products on delete set null,
  start_price numeric(12,2) not null,
  current_bid numeric(12,2) not null,
  bid_count int not null default 0,
  leader_id uuid references public.profiles on delete set null,
  duration_sec int not null,
  counter_bid_sec int not null default 10,
  sudden_death boolean not null default false,
  started_at timestamptz not null default now(),
  ends_at timestamptz not null,
  status text not null default 'running' check (status in ('running', 'sold', 'unsold'))
);
create index on public.lots (show_id);

create table public.bids (
  id uuid primary key default gen_random_uuid(),
  lot_id uuid not null references public.lots on delete cascade,
  bidder_id uuid references public.profiles on delete set null,
  amount numeric(12,2) not null,
  is_proxy boolean not null default false,
  created_at timestamptz not null default now()
);
create index on public.bids (lot_id, created_at desc);
create index on public.bids (bidder_id);

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
  user_id uuid references public.profiles on delete cascade,
  type text not null default 'chat',
  text text not null check (char_length(text) <= 300),
  amount numeric(12,2),
  created_at timestamptz not null default now()
);
create index on public.chat_messages (show_id, created_at desc);

-- Çekilişler: gerçek ödüllü çekilişler Milli Piyango İdaresi izniyle düzenlenebilir.
-- Demoda gerçek ödül verilmez; oluşturma ve kazanan seçimi yalnızca sunucuda yapılır.
create table public.giveaways (
  id uuid primary key default gen_random_uuid(),
  show_id uuid not null references public.shows on delete cascade,
  product_id uuid references public.products on delete set null,
  requires_follow boolean not null default false,
  ends_at timestamptz not null,
  winner_id uuid references public.profiles on delete set null,
  status text not null default 'running'
);

create table public.giveaway_entries (
  giveaway_id uuid references public.giveaways on delete cascade,
  user_id uuid references public.profiles on delete cascade,
  primary key (giveaway_id, user_id)
);

-- ─── Adres & ödeme ───────────────────────────────────────────────────────────
-- Adres yalnızca sahibine görünür; satıcıya teslimat bilgisi sipariş anında sunucu tarafından iletilir.
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
create index on public.addresses (user_id);

-- Kart verisi asla burada tutulmaz: yalnızca lisanslı ödeme kuruluşunun verdiği token.
-- Kayıt sunucuda oluşturulur; istemci token sütununu okuyamaz.
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
create index on public.payment_methods (user_id);

-- ─── Siparişler ──────────────────────────────────────────────────────────────
create type order_status as enum ('paid', 'preparing', 'shipped', 'out_for_delivery', 'delivered', 'cancelled', 'return_requested', 'refunded');

-- Sipariş kayıtları yasal saklama süresince tutulur; hesap silinince alıcı/satıcı bağlantısı
-- NULL yapılarak anonimleşir. Ürün silinse de kayıt anlamlı kalsın diye ürün adı kopyalanır.
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  number text unique not null,
  buyer_id uuid references public.profiles on delete set null,
  seller_id uuid references public.profiles on delete set null,
  product_id uuid references public.products on delete set null,
  item_title text not null default '',
  show_id uuid references public.shows on delete set null,
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
  address_id uuid references public.addresses on delete set null,
  payment_method_id uuid references public.payment_methods on delete set null,
  reviewed boolean not null default false,
  created_at timestamptz not null default now()
);
create index on public.orders (buyer_id, created_at desc);
create index on public.orders (seller_id, status);
create index on public.orders (product_id);

create table public.order_events (
  id bigserial primary key,
  order_id uuid not null references public.orders on delete cascade,
  status order_status not null,
  note text,
  at timestamptz not null default now()
);
create index on public.order_events (order_id, at);

create table public.offers (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products on delete cascade,
  buyer_id uuid not null references public.profiles on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  counter_amount numeric(12,2),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'countered', 'expired')),
  created_at timestamptz not null default now()
);
create index on public.offers (product_id);
create index on public.offers (buyer_id);

-- Değerlendirmeler herkese açıktır; hesap silinince yazar/satıcı bağlantısı NULL olur.
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  order_id uuid unique references public.orders on delete cascade,
  seller_id uuid references public.profiles on delete set null,
  buyer_id uuid references public.profiles on delete set null,
  rating int not null check (rating between 1 and 5),
  shipping int check (shipping between 1 and 5),
  packaging int check (packaging between 1 and 5),
  accuracy int check (accuracy between 1 and 5),
  text text check (char_length(text) <= 500),
  seller_reply text check (char_length(seller_reply) <= 500),
  created_at timestamptz not null default now()
);
create index on public.reviews (seller_id, created_at desc);
create index on public.reviews (buyer_id);

-- ─── Mesajlar & bildirimler ──────────────────────────────────────────────────
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references public.profiles on delete cascade,
  user_b uuid not null references public.profiles on delete cascade,
  order_id uuid references public.orders on delete set null,
  created_at timestamptz not null default now(),
  unique (user_a, user_b),
  check (user_a <> user_b)
);
create index on public.conversations (user_b);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations on delete cascade,
  sender_id uuid not null references public.profiles on delete cascade,
  text text not null check (char_length(text) <= 2000),
  image_url text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index on public.messages (conversation_id, created_at);

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
create index on public.notifications (user_id, created_at desc);

-- ─── Satıcı finansı ──────────────────────────────────────────────────────────
-- Başvuru ve kimlik bilgileri yalnızca sahibine (ve service_role'e) görünür.
-- TCKN ve doğum tarihi burada saklanmaz: kimlik doğrulama ve alt üye işyeri kaydı lisanslı ödeme
-- kuruluşunda yapılır, burada yalnızca onun referansı (psp_submerchant_id) tutulur.
-- IBAN mümkünse yalnızca ödeme kuruluşunda tutulmalı; burada kalacaksa sunucu tarafında şifrelenmeli.
create table public.seller_applications (
  user_id uuid primary key references public.profiles on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'denied')),
  category_id text references public.categories on delete set null,
  experience text,
  monthly_volume text,
  store_name text,
  tax_type text check (tax_type in ('individual', 'sole_proprietor', 'company')),
  legal_name text,
  company_title text,
  tax_office text,
  tax_number text,
  iban text,
  psp_submerchant_id text,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz
);

-- Ödeme aktarımları mali kayıttır: hesap silinince satıcı bağlantısı NULL olur, kayıt saklanır.
-- Gerçek sürümde ödemeyi lisanslı bir ödeme kuruluşu satıcıya aktarır.
create table public.payouts (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid references public.profiles on delete set null,
  amount numeric(12,2) not null,
  iban text not null,
  psp_payout_id text,
  status text not null default 'processing' check (status in ('pending', 'processing', 'paid')),
  created_at timestamptz not null default now()
);
create index on public.payouts (seller_id, created_at desc);

-- Mezat Kredisi hareketleri mali kayıttır: hesap silinince kullanıcı bağlantısı NULL olur.
create table public.credit_ledger (
  id bigserial primary key,
  user_id uuid references public.profiles on delete set null,
  amount numeric(10,2) not null,
  description text not null,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);
create index on public.credit_ledger (user_id, created_at desc);

-- ─── Moderasyon ──────────────────────────────────────────────────────────────
-- Şikayetler gizlidir: şikayet edilen taraf ve diğer kullanıcılar göremez.
-- İnceleme yalnızca moderasyon ekibi tarafından service_role ile (yönetim paneli) yapılır.
-- reason anahtarları uygulamadaki seçeneklerle eşleşir: sahte/taklit ürün, yanıltıcı açıklama,
-- taciz/nefret söylemi, spam/dolandırıcılık, platform dışı ödeme talebi, uygunsuz içerik,
-- yasaklı ürün, diğer.
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.profiles on delete set null,
  target_type text not null check (target_type in ('user', 'show', 'product', 'chat_message', 'message', 'review')),
  target_id uuid not null,
  reason text not null check (reason in ('counterfeit', 'misleading', 'harassment', 'spam_fraud', 'off_platform_payment', 'inappropriate', 'prohibited_item', 'other')),
  note text check (char_length(note) <= 1000),
  status text not null default 'open' check (status in ('open', 'reviewing', 'actioned', 'dismissed')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index on public.reports (status, created_at);
create index on public.reports (target_type, target_id);
create index on public.reports (reporter_id);

-- ─── Onay kayıtları ──────────────────────────────────────────────────────────
-- Sözleşme/metin onayları ve pazarlama izinleri için değiştirilemez kayıt (yalnızca ekleme).
-- document örnekleri: 'terms', 'privacy', 'kvkk_aydinlatma', 'acik_riza', 'marketing_email',
-- 'marketing_sms', 'marketing_call', 'marketing_push', 'seller_agreement', 'age_18'.
-- granted = false: izin geri alındı (yeni satır olarak eklenir). channel örnekleri: 'ios', 'android', 'web'.
create table public.consent_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  document text not null check (document ~ '^[a-z0-9_]{2,40}$'),
  version text not null check (char_length(version) between 1 and 40),
  granted boolean not null default true,
  channel text not null check (char_length(channel) between 1 and 40),
  accepted_at timestamptz not null default now()
);
create index on public.consent_log (user_id, document, accepted_at desc);

-- ─── Yardımcı fonksiyonlar ───────────────────────────────────────────────────
-- Oturumdaki kullanıcı ile diğer kullanıcı arasında (iki yönlü) engel var mı?
-- blocks tablosu yalnızca engelleyene görünür; bu kontrol için security definer gerekir.
-- Yalnızca kendi ilişkini sorgulayabilirsin, başkaları arasındaki engeller sızmaz.
create function public.is_blocked_with(other uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.blocks b
    where (b.blocker_id = auth.uid() and b.blocked_id = other)
       or (b.blocker_id = other and b.blocked_id = auth.uid())
  );
$$;
revoke execute on function public.is_blocked_with(uuid) from public, anon;
grant execute on function public.is_blocked_with(uuid) to authenticated;

-- Değerlendirmede alıcı yalnızca kendi puan/yorumunu, satıcı yalnızca yanıtını değiştirebilir
create function public.reviews_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    return new; -- sunucu (service_role)
  end if;
  if uid = old.buyer_id and new.seller_reply is distinct from old.seller_reply then
    raise exception 'Satıcı yanıtını yalnızca satıcı değiştirebilir';
  end if;
  if uid = old.seller_id
     and (new.rating, new.shipping, new.packaging, new.accuracy, new.text)
         is distinct from (old.rating, old.shipping, old.packaging, old.accuracy, old.text) then
    raise exception 'Değerlendirmeyi yalnızca alıcı değiştirebilir';
  end if;
  return new;
end;
$$;

create trigger reviews_guard before update on public.reviews
  for each row execute function public.reviews_guard();

-- ─── RLS: her tabloda açık ───────────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.profile_private enable row level security;
alter table public.follows enable row level security;
alter table public.blocks enable row level security;
alter table public.categories enable row level security;
alter table public.subcategories enable row level security;
alter table public.shows enable row level security;
alter table public.show_reminders enable row level security;
alter table public.products enable row level security;
alter table public.saved_products enable row level security;
alter table public.lots enable row level security;
alter table public.bids enable row level security;
alter table public.max_bids enable row level security;
alter table public.pre_bids enable row level security;
alter table public.chat_messages enable row level security;
alter table public.giveaways enable row level security;
alter table public.giveaway_entries enable row level security;
alter table public.addresses enable row level security;
alter table public.payment_methods enable row level security;
alter table public.orders enable row level security;
alter table public.order_events enable row level security;
alter table public.offers enable row level security;
alter table public.reviews enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;
alter table public.seller_applications enable row level security;
alter table public.payouts enable row level security;
alter table public.credit_ledger enable row level security;
alter table public.reports enable row level security;
alter table public.consent_log enable row level security;

-- ─── Sütun yetkileri ─────────────────────────────────────────────────────────
-- Supabase varsayılan olarak anon/authenticated rollerine tüm tablo yetkilerini verir.
-- Hassas tablolarda yetkiyi sütun düzeyine indiriyoruz; sayaçlar, durumlar ve tutarlar yalnızca sunucuda değişir.

-- Yalnızca sahibine ait veri: anonim erişim tamamen kapalı
revoke all on public.profile_private, public.blocks, public.show_reminders, public.saved_products,
  public.max_bids, public.pre_bids, public.giveaway_entries, public.addresses, public.payment_methods,
  public.orders, public.order_events, public.offers, public.conversations, public.messages,
  public.notifications, public.seller_applications, public.payouts, public.credit_ledger,
  public.reports, public.consent_log
  from anon;

-- Yalnızca sunucunun yazdığı tablolar: istemciye salt okuma
revoke insert, update, delete on public.categories, public.subcategories, public.lots, public.bids,
  public.giveaways, public.orders, public.order_events, public.payouts, public.credit_ledger
  from anon, authenticated;

revoke insert, update on public.profiles from anon, authenticated;
grant insert (id, username, display_name, avatar_url, cover_url, bio, city) on public.profiles to authenticated;
grant update (username, display_name, avatar_url, cover_url, bio, city) on public.profiles to authenticated;

revoke insert, update on public.shows from anon, authenticated;
grant insert (id, seller_id, title, description, cover_url, video_url, category_id, subcategory_id, tags,
  scheduled_at, shipping_cost, free_shipping_threshold, highlights, is_private) on public.shows to authenticated;
grant update (title, description, cover_url, video_url, category_id, subcategory_id, tags, status,
  scheduled_at, started_at, ended_at, shipping_cost, free_shipping_threshold, highlights, is_private) on public.shows to authenticated;

revoke insert, update on public.products from anon, authenticated;
grant insert (id, seller_id, show_id, title, description, images, category_id, subcategory_id, condition, grade,
  format, price, compare_at_price, quantity, shipping_profile, shipping_cost, sudden_death, accepts_offers, status)
  on public.products to authenticated;
grant update (show_id, title, description, images, category_id, subcategory_id, condition, grade,
  format, price, compare_at_price, quantity, shipping_profile, shipping_cost, sudden_death, accepts_offers, status)
  on public.products to authenticated;

revoke insert, update on public.pre_bids from authenticated;
grant insert (product_id, show_id, bidder_id, max_amount) on public.pre_bids to authenticated;
grant update (max_amount) on public.pre_bids to authenticated;

revoke insert, update on public.chat_messages from anon, authenticated;
grant insert (id, show_id, user_id, text) on public.chat_messages to authenticated;

revoke select, insert, update on public.payment_methods from authenticated;
grant select (id, user_id, brand, last4, bank, expiry, is_default) on public.payment_methods to authenticated;
grant update (is_default) on public.payment_methods to authenticated;

revoke insert, update on public.offers from authenticated;
grant insert (product_id, buyer_id, amount) on public.offers to authenticated;

revoke insert, update on public.reviews from anon, authenticated;
grant insert (order_id, seller_id, buyer_id, rating, shipping, packaging, accuracy, text) on public.reviews to authenticated;
grant update (rating, shipping, packaging, accuracy, text, seller_reply) on public.reviews to authenticated;

revoke update on public.conversations from authenticated;

revoke update on public.messages from authenticated;
grant update (read_at) on public.messages to authenticated;

revoke insert, update on public.notifications from authenticated;
grant update (read) on public.notifications to authenticated;

revoke insert, update on public.seller_applications from authenticated;
grant insert (user_id, category_id, experience, monthly_volume, store_name, tax_type, legal_name,
  company_title, tax_office, tax_number, iban) on public.seller_applications to authenticated;
grant update (category_id, experience, monthly_volume, store_name, tax_type, legal_name,
  company_title, tax_office, tax_number, iban) on public.seller_applications to authenticated;

revoke insert, update, delete on public.reports from authenticated;
grant insert (reporter_id, target_type, target_id, reason, note) on public.reports to authenticated;

revoke insert, update, delete on public.consent_log from authenticated;
grant insert (user_id, document, version, granted, channel) on public.consent_log to authenticated;

-- ─── Politikalar ─────────────────────────────────────────────────────────────
-- Not: (select auth.uid()) biçimi Supabase'in önerdiği performanslı kullanımdır.

-- Profiller: herkese açık alanlar herkese açık; yalnızca kendi profilini oluştur/güncelle
create policy "profiller herkese açık" on public.profiles
  for select to anon, authenticated using (true);
create policy "kendi profilini oluştur" on public.profiles
  for insert to authenticated with check (id = (select auth.uid()));
create policy "kendi profilini güncelle" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "özel profil yalnız sahibine" on public.profile_private
  for select to authenticated using (id = (select auth.uid()));
create policy "özel profil oluştur" on public.profile_private
  for insert to authenticated with check (id = (select auth.uid()));
create policy "özel profil güncelle" on public.profile_private
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Takip
create policy "takipler herkese açık" on public.follows
  for select to anon, authenticated using (true);
create policy "takip et" on public.follows
  for insert to authenticated
  with check (follower_id = (select auth.uid()) and not public.is_blocked_with(followee_id));
create policy "takibi bırak" on public.follows
  for delete to authenticated using (follower_id = (select auth.uid()));

-- Engelleme: yalnızca engelleyen görür
create policy "kendi engellerim" on public.blocks
  for select to authenticated using (blocker_id = (select auth.uid()));
create policy "engelle" on public.blocks
  for insert to authenticated with check (blocker_id = (select auth.uid()));
create policy "engeli kaldır" on public.blocks
  for delete to authenticated using (blocker_id = (select auth.uid()));

-- Kategoriler: herkese açık, yazma yalnızca sunucu
create policy "kategoriler herkese açık" on public.categories
  for select to anon, authenticated using (true);
create policy "alt kategoriler herkese açık" on public.subcategories
  for select to anon, authenticated using (true);

-- Yayınlar: planlı/canlı ve gizli olmayanlar herkese açık; satıcı kendi yayınlarının hepsini görür
create policy "yayınlar herkese açık" on public.shows
  for select to anon, authenticated
  using ((not is_private and status in ('scheduled', 'live')) or seller_id = (select auth.uid()));
create policy "satıcı yayın oluşturur" on public.shows
  for insert to authenticated
  with check (
    seller_id = (select auth.uid())
    and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.is_seller)
  );
create policy "satıcı kendi yayınını günceller" on public.shows
  for update to authenticated
  using (seller_id = (select auth.uid())) with check (seller_id = (select auth.uid()));
create policy "satıcı kendi yayınını siler" on public.shows
  for delete to authenticated using (seller_id = (select auth.uid()) and status = 'scheduled');

create policy "kendi hatırlatıcılarım" on public.show_reminders
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- İlanlar: aktif ilanlar herkese açık; satıcı yalnızca kendi ilanını yönetir
create policy "aktif ürünler herkese açık" on public.products
  for select to anon, authenticated using (status = 'active' or seller_id = (select auth.uid()));
create policy "satıcı ürün ekler" on public.products
  for insert to authenticated
  with check (
    seller_id = (select auth.uid())
    and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.is_seller)
    and (products.show_id is null
         or exists (select 1 from public.shows s where s.id = products.show_id and s.seller_id = (select auth.uid())))
  );
create policy "satıcı kendi ürününü günceller" on public.products
  for update to authenticated
  using (seller_id = (select auth.uid()))
  with check (
    seller_id = (select auth.uid())
    and (products.show_id is null
         or exists (select 1 from public.shows s where s.id = products.show_id and s.seller_id = (select auth.uid())))
  );
create policy "satıcı kendi ürününü siler" on public.products
  for delete to authenticated using (seller_id = (select auth.uid()));

create policy "kendi kaydettiklerim" on public.saved_products
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Açık artırma: lot ve teklifler, görünür yayınlarda herkese açık; yazma yalnızca sunucu
create policy "görünür yayının lotları" on public.lots
  for select to anon, authenticated
  using (exists (select 1 from public.shows s where s.id = lots.show_id) or leader_id = (select auth.uid()));
create policy "görünür lotun teklifleri" on public.bids
  for select to anon, authenticated
  using (exists (select 1 from public.lots l where l.id = bids.lot_id) or bidder_id = (select auth.uid()));

create policy "maks teklif yalnız sahibine" on public.max_bids
  for select to authenticated using (bidder_id = (select auth.uid()));
create policy "maks teklif belirle" on public.max_bids
  for insert to authenticated
  with check (
    bidder_id = (select auth.uid())
    and exists (select 1 from public.lots l where l.id = max_bids.lot_id and l.status = 'running')
  );
create policy "maks teklifi güncelle" on public.max_bids
  for update to authenticated
  using (bidder_id = (select auth.uid()))
  with check (
    bidder_id = (select auth.uid())
    and exists (select 1 from public.lots l where l.id = max_bids.lot_id and l.status = 'running')
  );
create policy "maks teklifi kaldır" on public.max_bids
  for delete to authenticated using (bidder_id = (select auth.uid()));

-- Ön teklif: yalnızca sahibi görür; yayın başlamadan önce değiştirilebilir/geri alınabilir
create policy "ön teklif yalnız sahibine" on public.pre_bids
  for select to authenticated using (bidder_id = (select auth.uid()));
create policy "ön teklif ver" on public.pre_bids
  for insert to authenticated
  with check (
    bidder_id = (select auth.uid())
    and exists (
      select 1 from public.products p
      join public.shows s on s.id = p.show_id
      where p.id = pre_bids.product_id and p.show_id = pre_bids.show_id
        and p.status = 'active' and s.status = 'scheduled' and p.seller_id <> (select auth.uid())
    )
  );
create policy "ön teklifi güncelle" on public.pre_bids
  for update to authenticated
  using (
    bidder_id = (select auth.uid())
    and exists (select 1 from public.shows s where s.id = pre_bids.show_id and s.status = 'scheduled')
  )
  with check (bidder_id = (select auth.uid()));
create policy "ön teklifi geri al" on public.pre_bids
  for delete to authenticated
  using (
    bidder_id = (select auth.uid())
    and exists (select 1 from public.shows s where s.id = pre_bids.show_id and s.status = 'scheduled')
  );

-- Yayın sohbeti: görünür yayınlarda herkese açık; canlı yayına yazılır; satıcı kendi yayınında siler
create policy "yayın sohbeti herkese açık" on public.chat_messages
  for select to anon, authenticated
  using (exists (select 1 from public.shows s where s.id = chat_messages.show_id));
create policy "sohbete yaz" on public.chat_messages
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and type = 'chat'
    and exists (
      select 1 from public.shows s
      where s.id = chat_messages.show_id and s.status = 'live' and not public.is_blocked_with(s.seller_id)
    )
  );
create policy "kendi mesajını veya kendi yayınındakini sil" on public.chat_messages
  for delete to authenticated
  using (
    user_id = (select auth.uid())
    or exists (select 1 from public.shows s where s.id = chat_messages.show_id and s.seller_id = (select auth.uid()))
  );

-- Çekilişler: görünür yayınlarda okunur; katılım listesi yalnızca katılana görünür
create policy "görünür yayının çekilişleri" on public.giveaways
  for select to anon, authenticated
  using (exists (select 1 from public.shows s where s.id = giveaways.show_id));
create policy "kendi katılımlarım" on public.giveaway_entries
  for select to authenticated using (user_id = (select auth.uid()));
create policy "çekilişe katıl" on public.giveaway_entries
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.giveaways g
      where g.id = giveaway_entries.giveaway_id and g.status = 'running' and g.ends_at > now()
    )
  );
create policy "çekiliş katılımından çık" on public.giveaway_entries
  for delete to authenticated using (user_id = (select auth.uid()));

-- Adres ve kart: yalnızca sahibi
create policy "kendi adresleri" on public.addresses
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "kendi kartlarını görür" on public.payment_methods
  for select to authenticated using (user_id = (select auth.uid()));
create policy "varsayılan kartı değiştir" on public.payment_methods
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "kendi kartını sil" on public.payment_methods
  for delete to authenticated using (user_id = (select auth.uid()));

-- Siparişler: yalnızca alıcı ve satıcı görür; oluşturma ve durum değişikliği sunucuda
create policy "alıcı veya satıcı siparişi görür" on public.orders
  for select to authenticated
  using (buyer_id = (select auth.uid()) or seller_id = (select auth.uid()));
create policy "siparişin geçmişini taraflar görür" on public.order_events
  for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_events.order_id));

-- Pazarlık teklifleri: alıcı ve ürünün satıcısı görür; kabul/ret/karşı teklif sunucuda
create policy "teklifi alıcı veya satıcı görür" on public.offers
  for select to authenticated
  using (
    buyer_id = (select auth.uid())
    or exists (select 1 from public.products p where p.id = offers.product_id and p.seller_id = (select auth.uid()))
  );
create policy "teklif gönder" on public.offers
  for insert to authenticated
  with check (
    buyer_id = (select auth.uid())
    and exists (
      select 1 from public.products p
      where p.id = offers.product_id and p.status = 'active' and p.accepts_offers
        and p.seller_id <> (select auth.uid()) and not public.is_blocked_with(p.seller_id)
    )
  );

-- Değerlendirmeler: herkese açık; yalnızca teslim alınmış siparişin alıcısı yazar
create policy "değerlendirmeler herkese açık" on public.reviews
  for select to anon, authenticated using (true);
create policy "alıcı değerlendirme yazar" on public.reviews
  for insert to authenticated
  with check (
    buyer_id = (select auth.uid())
    and exists (
      select 1 from public.orders o
      where o.id = reviews.order_id and o.buyer_id = (select auth.uid())
        and o.seller_id = reviews.seller_id and o.status = 'delivered'
    )
  );
create policy "alıcı yorumunu, satıcı yanıtını günceller" on public.reviews
  for update to authenticated
  using (buyer_id = (select auth.uid()) or seller_id = (select auth.uid()))
  with check (buyer_id = (select auth.uid()) or seller_id = (select auth.uid()));

-- Mesajlaşma: yalnızca katılımcılar; engel varsa yeni sohbet/mesaj yok
create policy "sohbet katılımcıları" on public.conversations
  for select to authenticated using ((select auth.uid()) in (user_a, user_b));
create policy "sohbet başlat" on public.conversations
  for insert to authenticated
  with check (
    (select auth.uid()) in (user_a, user_b)
    and not public.is_blocked_with(case when user_a = (select auth.uid()) then user_b else user_a end)
  );
create policy "mesaj katılımcıları" on public.messages
  for select to authenticated
  using (exists (select 1 from public.conversations c where c.id = messages.conversation_id));
create policy "mesaj gönder" on public.messages
  for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
        and not public.is_blocked_with(case when c.user_a = (select auth.uid()) then c.user_b else c.user_a end)
    )
  );
create policy "alıcı okundu işaretler" on public.messages
  for update to authenticated
  using (
    sender_id <> (select auth.uid())
    and exists (select 1 from public.conversations c where c.id = messages.conversation_id)
  )
  with check (sender_id <> (select auth.uid()));
create policy "kendi mesajını sil" on public.messages
  for delete to authenticated using (sender_id = (select auth.uid()));

-- Bildirimler: sunucu üretir; kullanıcı yalnızca kendininkini okur, okundu yapar, siler
create policy "kendi bildirimleri" on public.notifications
  for select to authenticated using (user_id = (select auth.uid()));
create policy "bildirimi okundu yap" on public.notifications
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "bildirimi sil" on public.notifications
  for delete to authenticated using (user_id = (select auth.uid()));

-- Satıcı başvurusu: yalnızca sahibi; onay/ret yalnızca sunucuda
create policy "kendi başvurum" on public.seller_applications
  for select to authenticated using (user_id = (select auth.uid()));
create policy "başvuru gönder" on public.seller_applications
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "bekleyen başvuruyu güncelle" on public.seller_applications
  for update to authenticated
  using (user_id = (select auth.uid()) and status = 'pending')
  with check (user_id = (select auth.uid()) and status = 'pending');
create policy "bekleyen başvuruyu geri çek" on public.seller_applications
  for delete to authenticated using (user_id = (select auth.uid()) and status = 'pending');

-- Ödeme aktarımı ve kredi: yalnızca sahibi okur; yazma yalnızca sunucu
create policy "kendi ödeme aktarımlarım" on public.payouts
  for select to authenticated using (seller_id = (select auth.uid()));
create policy "kendi kredi hareketlerim" on public.credit_ledger
  for select to authenticated using (user_id = (select auth.uid()));

-- Şikayetler: şikayet eden ekler ve yalnızca kendi şikayetlerini görür; herkese açık okuma yok
create policy "kendi şikayetlerim" on public.reports
  for select to authenticated using (reporter_id = (select auth.uid()));
create policy "şikayet gönder" on public.reports
  for insert to authenticated with check (reporter_id = (select auth.uid()));

-- Onay kayıtları: yalnızca sahibi ekler ve okur; güncelleme/silme yok
create policy "kendi onay kayıtlarım" on public.consent_log
  for select to authenticated using (user_id = (select auth.uid()));
create policy "onay kaydı ekle" on public.consent_log
  for insert to authenticated with check (user_id = (select auth.uid()));

-- ─── Denetim: RLS'si kapalı tablo kalmasın ───────────────────────────────────
do $$
declare
  t record;
begin
  for t in
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity
  loop
    raise exception 'RLS kapalı tablo: %', t.relname;
  end loop;
end;
$$;

-- Teklif verme, lot bitirme, sipariş oluşturma, ödeme çekimi, çekiliş sonucu ve bildirim üretimi
-- istemciden değil, sunucu tarafında (Edge Function: place-bid, close-lot, create-order) service_role ile yapılmalı.
-- Hesap silme (Edge Function: delete-account): auth.admin.deleteUser + kullanıcının Storage dosyalarını silme.
