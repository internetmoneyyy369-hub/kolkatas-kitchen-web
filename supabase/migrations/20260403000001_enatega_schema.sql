-- ============================================================
-- Enatega Multivendor — Full Supabase Schema Migration
-- ============================================================

-- ─────────────────────────────────────────────
-- 1. EXTENSIONS
-- ─────────────────────────────────────────────
create extension if not exists "uuid-ossp";
create extension if not exists "postgis";

-- ─────────────────────────────────────────────
-- 2. ENUMS
-- ─────────────────────────────────────────────
create type order_status_enum as enum (
  'PENDING','ACCEPTED','ASSIGNED','PICKED','DELIVERED','CANCELLED','COMPLETED'
);
create type payment_method_enum as enum ('COD','STRIPE','PAYPAL');
create type payment_status_enum as enum ('PENDING','PAID','FAILED');
create type address_label_enum as enum ('Home','Work','Other');
create type user_type_enum as enum ('google','apple','facebook','default');
create type shop_type_enum as enum ('restaurant','grocery','pharmacy','flower','parcel');
create type day_enum as enum ('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday');
create type withdraw_status_enum as enum ('PENDING','APPROVED','REJECTED');

-- ─────────────────────────────────────────────
-- 3. PROFILES (extends auth.users)
-- ─────────────────────────────────────────────
create table public.profiles (
  id                      uuid primary key references auth.users(id) on delete cascade,
  name                    text,
  phone                   text unique,
  phone_is_verified       boolean default false,
  email_is_verified       boolean default false,
  is_active               boolean default true,
  notification_token      text,
  is_order_notification   boolean default true,
  is_offer_notification   boolean default true,
  user_type               user_type_enum default 'default',
  apple_id                text,
  favourite               uuid[] default '{}',
  created_at              timestamptz default now(),
  updated_at              timestamptz default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', new.email)
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────────────────────────────────────
-- 4. ADDRESSES
-- ─────────────────────────────────────────────
create table public.addresses (
  id               uuid primary key default uuid_generate_v4(),
  user_id          uuid references public.profiles(id) on delete cascade not null,
  delivery_address text not null,
  details          text,
  label            address_label_enum default 'Home',
  location         geography(Point, 4326),
  selected         boolean default false,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

-- ─────────────────────────────────────────────
-- 5. ZONES
-- ─────────────────────────────────────────────
create table public.zones (
  id          uuid primary key default uuid_generate_v4(),
  title       text not null,
  description text,
  tax         numeric(5,2) default 0,
  location    geography(Polygon, 4326),
  is_active   boolean default true,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ─────────────────────────────────────────────
-- 6. RIDERS
-- ─────────────────────────────────────────────
create table public.riders (
  id                      uuid primary key references auth.users(id) on delete cascade,
  name                    text,
  username                text unique,
  phone                   text,
  image                   text,
  available               boolean default true,
  is_active               boolean default true,
  zone_id                 uuid references public.zones(id),
  notification_token      text,
  current_location        geography(Point, 4326),
  account_number          text,
  current_wallet_amount   numeric(10,2) default 0,
  total_wallet_amount     numeric(10,2) default 0,
  withdrawn_wallet_amount numeric(10,2) default 0,
  created_at              timestamptz default now(),
  updated_at              timestamptz default now()
);

-- ─────────────────────────────────────────────
-- 7. SHOP TYPES
-- ─────────────────────────────────────────────
create table public.shop_types (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  image       text,
  is_active   boolean default true,
  created_at  timestamptz default now()
);

-- ─────────────────────────────────────────────
-- 8. RESTAURANTS
-- ─────────────────────────────────────────────
create table public.restaurants (
  id                       uuid primary key default uuid_generate_v4(),
  order_prefix             text,
  name                     text not null,
  image                    text,
  logo                     text,
  address                  text,
  location                 geography(Point, 4326),
  delivery_time            integer default 30,
  minimum_order            numeric(10,2) default 0,
  tax                      numeric(5,2) default 0,
  commission_rate          numeric(5,2) default 0,
  shop_type                shop_type_enum default 'restaurant',
  cuisines                 text[] default '{}',
  keywords                 text[] default '{}',
  tags                     text[] default '{}',
  rating                   numeric(3,2) default 0,
  review_count             integer default 0,
  review_average           numeric(3,2) default 0,
  is_active                boolean default true,
  is_available             boolean default true,
  slug                     text unique,
  stripe_details_submitted boolean default false,
  phone                    text,
  restaurant_url           text,
  notification_token       text,
  enable_notification      boolean default true,
  zone_id                  uuid references public.zones(id),
  owner_id                 uuid references public.profiles(id),
  delivery_bounds          geography(Polygon, 4326),
  username                 text unique,
  password                 text,
  created_at               timestamptz default now(),
  updated_at               timestamptz default now()
);

-- ─────────────────────────────────────────────
-- 9. OPENING TIMES
-- ─────────────────────────────────────────────
create table public.opening_times (
  id            uuid primary key default uuid_generate_v4(),
  restaurant_id uuid references public.restaurants(id) on delete cascade not null,
  day           day_enum not null,
  start_time    text,
  end_time      text
);

-- ─────────────────────────────────────────────
-- 10. CATEGORIES
-- ─────────────────────────────────────────────
create table public.categories (
  id            uuid primary key default uuid_generate_v4(),
  restaurant_id uuid references public.restaurants(id) on delete cascade not null,
  title         text not null,
  is_active     boolean default true,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- ─────────────────────────────────────────────
-- 11. OPTIONS
-- ─────────────────────────────────────────────
create table public.options (
  id            uuid primary key default uuid_generate_v4(),
  restaurant_id uuid references public.restaurants(id) on delete cascade not null,
  title         text not null,
  description   text,
  price         numeric(10,2) default 0,
  is_active     boolean default true,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- ─────────────────────────────────────────────
-- 12. ADDONS
-- ─────────────────────────────────────────────
create table public.addons (
  id                uuid primary key default uuid_generate_v4(),
  restaurant_id     uuid references public.restaurants(id) on delete cascade not null,
  title             text not null,
  description       text,
  quantity_minimum  integer default 0,
  quantity_maximum  integer default 1,
  options           uuid[] default '{}',
  is_active         boolean default true,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

-- ─────────────────────────────────────────────
-- 13. FOODS
-- ─────────────────────────────────────────────
create table public.foods (
  id              uuid primary key default uuid_generate_v4(),
  category_id     uuid references public.categories(id) on delete cascade not null,
  restaurant_id   uuid references public.restaurants(id) on delete cascade not null,
  title           text not null,
  description     text,
  image           text,
  sub_category    text,
  is_active       boolean default true,
  is_out_of_stock boolean default false,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- ─────────────────────────────────────────────
-- 14. FOOD VARIATIONS
-- ─────────────────────────────────────────────
create table public.food_variations (
  id          uuid primary key default uuid_generate_v4(),
  food_id     uuid references public.foods(id) on delete cascade not null,
  title       text not null,
  price       numeric(10,2) not null,
  discounted  numeric(10,2) default 0,
  addons      uuid[] default '{}',
  is_active   boolean default true,
  created_at  timestamptz default now()
);

-- ─────────────────────────────────────────────
-- 15. COUPONS
-- ─────────────────────────────────────────────
create table public.coupons (
  id            uuid primary key default uuid_generate_v4(),
  title         text not null,
  discount      numeric(5,2) not null,
  enabled       boolean default true,
  restaurant_id uuid references public.restaurants(id) on delete cascade,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- ─────────────────────────────────────────────
-- 16. ORDERS
-- ─────────────────────────────────────────────
create table public.orders (
  id                  uuid primary key default uuid_generate_v4(),
  order_id            bigint generated always as identity,
  user_id             uuid references public.profiles(id) not null,
  restaurant_id       uuid references public.restaurants(id) not null,
  rider_id            uuid references public.riders(id),
  delivery_address    jsonb not null,
  payment_method      payment_method_enum default 'COD',
  paid_amount         numeric(10,2) default 0,
  order_amount        numeric(10,2) not null,
  order_status        order_status_enum default 'PENDING',
  payment_status      payment_status_enum default 'PENDING',
  tipping             numeric(10,2) default 0,
  taxation_amount     numeric(10,2) default 0,
  delivery_charges    numeric(10,2) default 0,
  discount_amount     numeric(10,2) default 0,
  coupon_id           uuid references public.coupons(id),
  instructions        text,
  is_picked_up        boolean default false,
  is_active           boolean default true,
  order_date          timestamptz default now(),
  expected_time       timestamptz,
  preparation_time    integer,
  completion_time     integer,
  accepted_at         timestamptz,
  picked_at           timestamptz,
  delivered_at        timestamptz,
  cancelled_at        timestamptz,
  assigned_at         timestamptz,
  reason              text,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

-- ─────────────────────────────────────────────
-- 17. ORDER ITEMS
-- ─────────────────────────────────────────────
create table public.order_items (
  id                   uuid primary key default uuid_generate_v4(),
  order_id             uuid references public.orders(id) on delete cascade not null,
  food_id              uuid references public.foods(id),
  variation_id         uuid references public.food_variations(id),
  title                text,
  description          text,
  image                text,
  quantity             integer default 1,
  unit_price           numeric(10,2) default 0,
  special_instructions text,
  addons               jsonb default '[]',
  is_active            boolean default true,
  created_at           timestamptz default now()
);

-- ─────────────────────────────────────────────
-- 18. REVIEWS
-- ─────────────────────────────────────────────
create table public.reviews (
  id            uuid primary key default uuid_generate_v4(),
  order_id      uuid references public.orders(id) unique,
  restaurant_id uuid references public.restaurants(id) not null,
  user_id       uuid references public.profiles(id) not null,
  rating        integer not null check (rating between 1 and 5),
  description   text,
  is_active     boolean default true,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- Auto-update restaurant rating on review insert/update
create or replace function update_restaurant_rating()
returns trigger language plpgsql as $$
begin
  update public.restaurants
  set
    review_count   = (select count(*) from public.reviews where restaurant_id = new.restaurant_id and is_active = true),
    review_average = (select coalesce(avg(rating),0) from public.reviews where restaurant_id = new.restaurant_id and is_active = true),
    rating         = (select coalesce(avg(rating),0) from public.reviews where restaurant_id = new.restaurant_id and is_active = true)
  where id = new.restaurant_id;
  return new;
end;
$$;

create trigger on_review_changed
  after insert or update on public.reviews
  for each row execute function update_restaurant_rating();

-- ─────────────────────────────────────────────
-- 19. CUISINES
-- ─────────────────────────────────────────────
create table public.cuisines (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  description text,
  image       text,
  shop_type   shop_type_enum default 'restaurant',
  is_active   boolean default true,
  created_at  timestamptz default now()
);

-- ─────────────────────────────────────────────
-- 20. SECTIONS (home page groupings)
-- ─────────────────────────────────────────────
create table public.sections (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  restaurants uuid[] default '{}',
  enabled     boolean default true,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ─────────────────────────────────────────────
-- 21. OFFERS
-- ─────────────────────────────────────────────
create table public.offers (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  tag         text,
  restaurants uuid[] default '{}',
  is_active   boolean default true,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ─────────────────────────────────────────────
-- 22. BANNERS
-- ─────────────────────────────────────────────
create table public.banners (
  id          uuid primary key default uuid_generate_v4(),
  title       text,
  description text,
  image       text,
  action      text,
  screen      text,
  is_active   boolean default true,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ─────────────────────────────────────────────
-- 23. TIPPINGS
-- ─────────────────────────────────────────────
create table public.tippings (
  id      uuid primary key default uuid_generate_v4(),
  title   text,
  tip     numeric(5,2),
  enabled boolean default true
);
insert into public.tippings (title, tip) values ('10%', 10), ('15%', 15), ('20%', 20);

-- ─────────────────────────────────────────────
-- 24. CONFIGURATION
-- ─────────────────────────────────────────────
create table public.configuration (
  id                       uuid primary key default uuid_generate_v4(),
  currency                 text default 'USD',
  currency_symbol          text default '$',
  delivery_rate            numeric(10,2) default 0,
  twilio_enabled           boolean default false,
  android_client_id        text,
  ios_client_id            text,
  app_amplitude_api_key    text,
  google_api_key           text,
  expo_client_id           text,
  customer_app_sentry_url  text,
  terms_and_conditions     text,
  privacy_policy           text,
  test_otp                 text,
  skip_mobile_verification boolean default false,
  skip_email_verification  boolean default false,
  cost_type                text default 'fixed',
  publishable_key          text,
  secret_key               text,
  created_at               timestamptz default now(),
  updated_at               timestamptz default now()
);
-- Insert default configuration row
insert into public.configuration (currency, currency_symbol, delivery_rate)
values ('USD', '$', 2.50);

-- ─────────────────────────────────────────────
-- 25. NOTIFICATIONS
-- ─────────────────────────────────────────────
create table public.notifications (
  id          uuid primary key default uuid_generate_v4(),
  title       text,
  body        text,
  user_id     uuid references public.profiles(id) on delete cascade,
  order_id    uuid references public.orders(id),
  is_read     boolean default false,
  created_at  timestamptz default now()
);

-- ─────────────────────────────────────────────
-- 26. CHAT MESSAGES
-- ─────────────────────────────────────────────
create table public.chat_messages (
  id          uuid primary key default uuid_generate_v4(),
  order_id    uuid references public.orders(id) on delete cascade not null,
  sender_id   uuid not null,
  sender_name text,
  message     text not null,
  created_at  timestamptz default now()
);

-- ─────────────────────────────────────────────
-- 27. WITHDRAW REQUESTS
-- ─────────────────────────────────────────────
create table public.withdraw_requests (
  id             uuid primary key default uuid_generate_v4(),
  rider_id       uuid references public.riders(id) on delete cascade not null,
  request_amount numeric(10,2) not null,
  status         withdraw_status_enum default 'PENDING',
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);

-- ─────────────────────────────────────────────
-- 28. SUPPORT TICKETS
-- ─────────────────────────────────────────────
create table public.support_tickets (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid references public.profiles(id),
  order_id    uuid references public.orders(id),
  subject     text,
  message     text,
  status      text default 'OPEN',
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ─────────────────────────────────────────────
-- 29. APP VERSIONS
-- ─────────────────────────────────────────────
create table public.app_versions (
  id              uuid primary key default uuid_generate_v4(),
  platform        text not null,
  version         text not null,
  force_update    boolean default false,
  is_active       boolean default true,
  created_at      timestamptz default now()
);

-- ─────────────────────────────────────────────
-- 30. STAFF / VENDORS
-- ─────────────────────────────────────────────
create table public.staff (
  id            uuid primary key references auth.users(id) on delete cascade,
  name          text,
  email         text,
  phone         text,
  restaurant_id uuid references public.restaurants(id),
  role          text default 'staff',
  is_active     boolean default true,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- ─────────────────────────────────────────────
-- 31. TRANSACTION HISTORY
-- ─────────────────────────────────────────────
create table public.transaction_history (
  id              uuid primary key default uuid_generate_v4(),
  rider_id        uuid references public.riders(id),
  order_id        uuid references public.orders(id),
  amount          numeric(10,2),
  transaction_type text,
  created_at      timestamptz default now()
);

-- ─────────────────────────────────────────────
-- 32. INDEXES for performance
-- ─────────────────────────────────────────────
create index idx_orders_user_id on public.orders(user_id);
create index idx_orders_rider_id on public.orders(rider_id);
create index idx_orders_restaurant_id on public.orders(restaurant_id);
create index idx_orders_status on public.orders(order_status);
create index idx_order_items_order_id on public.order_items(order_id);
create index idx_foods_category_id on public.foods(category_id);
create index idx_foods_restaurant_id on public.foods(restaurant_id);
create index idx_categories_restaurant_id on public.categories(restaurant_id);
create index idx_addresses_user_id on public.addresses(user_id);
create index idx_chat_messages_order_id on public.chat_messages(order_id);
create index idx_reviews_restaurant_id on public.reviews(restaurant_id);
create index idx_notifications_user_id on public.notifications(user_id);
create index idx_restaurants_zone_id on public.restaurants(zone_id);
-- Spatial indexes
create index idx_restaurants_location on public.restaurants using gist(location);
create index idx_riders_location on public.riders using gist(current_location);
create index idx_zones_location on public.zones using gist(location);

-- ─────────────────────────────────────────────
-- 33. ENABLE ROW LEVEL SECURITY
-- ─────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.addresses enable row level security;
alter table public.zones enable row level security;
alter table public.riders enable row level security;
alter table public.restaurants enable row level security;
alter table public.opening_times enable row level security;
alter table public.categories enable row level security;
alter table public.options enable row level security;
alter table public.addons enable row level security;
alter table public.foods enable row level security;
alter table public.food_variations enable row level security;
alter table public.coupons enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.reviews enable row level security;
alter table public.cuisines enable row level security;
alter table public.sections enable row level security;
alter table public.offers enable row level security;
alter table public.banners enable row level security;
alter table public.tippings enable row level security;
alter table public.configuration enable row level security;
alter table public.notifications enable row level security;
alter table public.chat_messages enable row level security;
alter table public.withdraw_requests enable row level security;
alter table public.support_tickets enable row level security;
alter table public.app_versions enable row level security;
alter table public.staff enable row level security;
alter table public.transaction_history enable row level security;
alter table public.shop_types enable row level security;

-- ─────────────────────────────────────────────
-- 34. RLS POLICIES
-- ─────────────────────────────────────────────

-- PROFILES
create policy "Users can view own profile"
  on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

-- ADDRESSES
create policy "Users manage own addresses"
  on public.addresses for all using (auth.uid() = user_id);

-- RESTAURANTS — public read, owner write
create policy "Public can view active restaurants"
  on public.restaurants for select using (is_active = true);
create policy "Owner can update restaurant"
  on public.restaurants for update using (auth.uid() = owner_id);

-- CATEGORIES, FOODS, VARIATIONS, OPTIONS, ADDONS — public read
create policy "Public read categories"
  on public.categories for select using (true);
create policy "Public read foods"
  on public.foods for select using (is_active = true);
create policy "Public read variations"
  on public.food_variations for select using (is_active = true);
create policy "Public read options"
  on public.options for select using (is_active = true);
create policy "Public read addons"
  on public.addons for select using (is_active = true);

-- OPENING TIMES
create policy "Public read opening times"
  on public.opening_times for select using (true);

-- ORDERS
create policy "Customers view own orders"
  on public.orders for select using (auth.uid() = user_id);
create policy "Customers create orders"
  on public.orders for insert with check (auth.uid() = user_id);
create policy "Riders view assigned orders"
  on public.orders for select using (auth.uid() = rider_id);

-- ORDER ITEMS
create policy "Users view own order items"
  on public.order_items for select
  using (exists (select 1 from public.orders o where o.id = order_items.order_id and o.user_id = auth.uid()));

-- REVIEWS
create policy "Public read reviews"
  on public.reviews for select using (is_active = true);
create policy "Users create own review"
  on public.reviews for insert with check (auth.uid() = user_id);
create policy "Users update own review"
  on public.reviews for update using (auth.uid() = user_id);

-- CONFIGURATION — public read
create policy "Anyone can read configuration"
  on public.configuration for select using (true);

-- TIPPINGS — public read
create policy "Anyone can read tippings"
  on public.tippings for select using (enabled = true);

-- CUISINES — public read
create policy "Anyone can read cuisines"
  on public.cuisines for select using (is_active = true);

-- SECTIONS — public read
create policy "Anyone can read sections"
  on public.sections for select using (enabled = true);

-- OFFERS — public read
create policy "Anyone can read offers"
  on public.offers for select using (is_active = true);

-- BANNERS — public read
create policy "Anyone can read banners"
  on public.banners for select using (is_active = true);

-- NOTIFICATIONS — users see own
create policy "Users view own notifications"
  on public.notifications for select using (auth.uid() = user_id);
create policy "Users update own notifications"
  on public.notifications for update using (auth.uid() = user_id);

-- CHAT MESSAGES
create policy "Order participants view chat"
  on public.chat_messages for select
  using (
    exists (select 1 from public.orders o where o.id = chat_messages.order_id and (o.user_id = auth.uid() or o.rider_id = auth.uid()))
  );
create policy "Order participants send chat"
  on public.chat_messages for insert
  with check (
    exists (select 1 from public.orders o where o.id = chat_messages.order_id and (o.user_id = auth.uid() or o.rider_id = auth.uid()))
  );

-- RIDERS
create policy "Riders view own profile"
  on public.riders for select using (auth.uid() = id);
create policy "Riders update own profile"
  on public.riders for update using (auth.uid() = id);

-- ZONES — public read
create policy "Public read zones"
  on public.zones for select using (is_active = true);

-- WITHDRAW REQUESTS — riders see own
create policy "Riders view own withdrawals"
  on public.withdraw_requests for select using (auth.uid() = rider_id);
create policy "Riders create withdrawal request"
  on public.withdraw_requests for insert with check (auth.uid() = rider_id);

-- SUPPORT TICKETS
create policy "Users view own tickets"
  on public.support_tickets for select using (auth.uid() = user_id);
create policy "Users create tickets"
  on public.support_tickets for insert with check (auth.uid() = user_id);

-- APP VERSIONS — public read
create policy "Public read app versions"
  on public.app_versions for select using (is_active = true);

-- SHOP TYPES — public read
create policy "Public read shop types"
  on public.shop_types for select using (is_active = true);

-- TRANSACTION HISTORY — riders see own
create policy "Riders view own transactions"
  on public.transaction_history for select using (auth.uid() = rider_id);

-- STAFF — staff see own record
create policy "Staff view own record"
  on public.staff for select using (auth.uid() = id);
