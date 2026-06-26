-- ─────────────────────────────────────────────────────────────
-- Givin · initial schema, RLS, and seed catalog
-- ─────────────────────────────────────────────────────────────
-- Run with: supabase db reset   (applies this + seeds below)

create extension if not exists pgcrypto;

-- Roles kept in their OWN table (never on the profile) to prevent
-- privilege escalation.
do $$ begin
  create type app_role as enum ('user', 'admin');
exception when duplicate_object then null; end $$;

-- ── profiles ────────────────────────────────────────────────
-- One row per authenticated user, mirrored from auth.users.
create table if not exists profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text,
  email       text,
  photo_url   text,
  created_at  timestamptz not null default now()
);

create table if not exists user_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role    app_role not null default 'user',
  primary key (user_id, role)
);

-- ── gift catalog ────────────────────────────────────────────
create table if not exists gifts (
  id         uuid primary key default gen_random_uuid(),
  slug       text unique not null,
  title      text not null,
  category   text not null,                 -- flowers | coffee | chocolate | giftcard
  tier       text not null default 'paid',  -- free | paid
  value_cents integer not null default 0,   -- face value charged to sender (0 = free)
  currency   text not null default 'EUR',
  image_url  text,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

-- ── saved recipients (the sender's address book) ────────────
create table if not exists recipients (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  email      text,
  headline   text,
  note       text,
  key_dates  jsonb not null default '[]',   -- [{label, date}]
  created_at timestamptz not null default now()
);

-- ── orders (a gift being sent) ──────────────────────────────
create table if not exists orders (
  id            uuid primary key default gen_random_uuid(),
  public_token  uuid not null default gen_random_uuid(),  -- used by the redeem page
  sender_id     uuid not null references auth.users(id) on delete cascade,
  gift_id       uuid not null references gifts(id),
  recipient_name  text not null,
  recipient_email text not null,
  occasion      text,                       -- new_job | work_anniversary | great_call | ...
  message       text,
  status        text not null default 'draft', -- draft|scheduled|sent|redeemed|failed
  send_at       timestamptz,
  sent_at       timestamptz,
  redeemed_at   timestamptz,
  tremendous_id text,
  reward_link   text,                        -- revealed on redeem
  stripe_id     text,
  referred_from_order_id uuid references orders(id),
  created_at    timestamptz not null default now()
);
create index if not exists orders_sender_idx on orders(sender_id);
create index if not exists orders_token_idx  on orders(public_token);

-- ── credits (free-gift allowance per user/period) ───────────
create table if not exists credits (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  free_remaining integer not null default 3,
  period         text not null default to_char(now(), 'YYYY-MM'),
  source         text not null default 'signup', -- signup | sponsor
  unique (user_id, period)
);

-- ── security definer role check ─────────────────────────────
create or replace function has_role(_user_id uuid, _role app_role)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from user_roles where user_id = _user_id and role = _role
  );
$$;

-- ── new-user trigger: create profile + role + credits ───────
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into profiles (id, name, email, photo_url)
    values (new.id,
            new.raw_user_meta_data->>'name',
            new.email,
            new.raw_user_meta_data->>'picture')
    on conflict (id) do nothing;
  insert into user_roles (user_id, role) values (new.id, 'user')
    on conflict do nothing;
  insert into credits (user_id) values (new.id)
    on conflict do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ─────────────────────────────────────────────────────────────
-- Row-Level Security: a user sees only their own data.
-- Redeem/send go through edge functions (service role), so the
-- public never reads the orders table directly.
-- ─────────────────────────────────────────────────────────────
alter table profiles   enable row level security;
alter table user_roles enable row level security;
alter table recipients enable row level security;
alter table orders     enable row level security;
alter table credits    enable row level security;
alter table gifts      enable row level security;

create policy "own profile"        on profiles   for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "own roles read"     on user_roles for select using (auth.uid() = user_id);
create policy "own recipients"     on recipients for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "own orders"         on orders     for all using (auth.uid() = sender_id) with check (auth.uid() = sender_id);
create policy "own credits"        on credits    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "anyone reads active gifts" on gifts for select using (active = true);
create policy "admins manage gifts" on gifts for all using (has_role(auth.uid(), 'admin')) with check (has_role(auth.uid(), 'admin'));

-- ── seed catalog ────────────────────────────────────────────
insert into gifts (slug, title, category, tier, value_cents, currency) values
  ('seasonal-bouquet', 'Seasonal bouquet', 'flowers',  'free',    0, 'EUR'),
  ('coffee-voucher',   'Coffee voucher',   'coffee',   'free',    0, 'EUR'),
  ('chocolate-box',    'Chocolate box',    'chocolate','paid',  900, 'EUR'),
  ('gift-card-10',     'Gift card €10',    'giftcard', 'paid', 1000, 'EUR'),
  ('gift-card-25',     'Gift card €25',    'giftcard', 'paid', 2500, 'EUR'),
  ('gift-card-50',     'Gift card €50',    'giftcard', 'paid', 5000, 'EUR')
on conflict (slug) do nothing;
