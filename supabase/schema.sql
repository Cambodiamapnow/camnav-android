-- =====================================================================
-- CamNAV – នាំផ្លូវ · Supabase database setup
-- Run once in Supabase → SQL Editor → New query → paste → Run.
-- Safe to re-run (uses IF NOT EXISTS / OR REPLACE).
-- =====================================================================

-- ---------- profiles (one per user, created automatically) ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  phone text,
  subscription_status text not null default 'free'
    check (subscription_status in ('free', 'trialing', 'active', 'expired')),
  subscription_expires_at timestamptz,
  trial_used boolean not null default false,
  preferred_vehicle text not null default 'motorbike' check (preferred_vehicle in ('motorbike', 'car')),
  selected_voice_pack text not null default 'standard',
  community_points integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- new auth user → profile row
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, phone, display_name)
  values (new.id, new.phone, coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'))
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- users may change only their own preferences; money / points fields are server-only
create or replace function public.protect_profile_fields() returns trigger
language plpgsql as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' and current_user not in ('postgres', 'supabase_admin') then
    new.subscription_status := old.subscription_status;
    new.subscription_expires_at := old.subscription_expires_at;
    new.trial_used := old.trial_used;
    new.community_points := old.community_points;
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists profiles_protect on public.profiles;
create trigger profiles_protect before update on public.profiles
  for each row execute function public.protect_profile_fields();

alter table public.profiles enable row level security;
drop policy if exists "profiles: read own" on public.profiles;
create policy "profiles: read own" on public.profiles for select using (auth.uid() = id);
drop policy if exists "profiles: update own" on public.profiles;
create policy "profiles: update own" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- 7-day free trial, once per account (anonymous guests cannot start it)
create or replace function public.start_trial() returns public.profiles
language plpgsql security definer set search_path = public as $$
declare p public.profiles;
begin
  if auth.uid() is null or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'sign in first';
  end if;
  update public.profiles
     set subscription_status = 'trialing', subscription_expires_at = now() + interval '7 days', trial_used = true
   where id = auth.uid() and trial_used = false
  returning * into p;
  if p.id is null then select * into p from public.profiles where id = auth.uid(); end if;
  return p;
end $$;
grant execute on function public.start_trial() to authenticated;

-- mark expired subscriptions (called by the app on start; also safe to schedule)
create or replace function public.refresh_my_subscription() returns public.profiles
language plpgsql security definer set search_path = public as $$
declare p public.profiles;
begin
  update public.profiles set subscription_status = 'expired'
   where id = auth.uid() and subscription_status in ('trialing', 'active') and subscription_expires_at < now();
  select * into p from public.profiles where id = auth.uid();
  return p;
end $$;
grant execute on function public.refresh_my_subscription() to authenticated;

-- ---------- incidents (live Waze-style pins) ----------
create table if not exists public.incidents (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('jam', 'flood', 'police', 'accident', 'roadwork', 'hazard', 'camera')),
  lat double precision not null check (lat between 9 and 15.5),
  lon double precision not null check (lon between 102 and 108.5),
  note text check (char_length(note) <= 140),
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '45 minutes',
  still_there_count integer not null default 0,
  cleared_count integer not null default 0,
  active boolean not null default true
);
create index if not exists incidents_live_idx on public.incidents (active, expires_at);
create index if not exists incidents_geo_idx on public.incidents (lat, lon);

alter table public.incidents enable row level security;
drop policy if exists "incidents: everyone reads live pins" on public.incidents;
create policy "incidents: everyone reads live pins" on public.incidents for select
  using (active and expires_at > now());
drop policy if exists "incidents: signed-in users report" on public.incidents;
create policy "incidents: signed-in users report" on public.incidents for insert to authenticated
  with check (created_by = auth.uid());
-- no direct update/delete by users: votes change pins through the trigger below

-- reporter gets +10 points; max 20 reports per user per hour (anti-spam)
create or replace function public.on_incident_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.incidents where created_by = new.created_by and created_at > now() - interval '1 hour') >= 20 then
    raise exception 'too many reports, try again later';
  end if;
  update public.profiles set community_points = community_points + 10 where id = new.created_by;
  return new;
end $$;
drop trigger if exists incidents_before_insert on public.incidents;
create trigger incidents_before_insert before insert on public.incidents
  for each row execute function public.on_incident_insert();

-- ---------- incident_votes ("Still there" / "Cleared") ----------
create table if not exists public.incident_votes (
  id bigint generated always as identity primary key,
  incident_id uuid not null references public.incidents (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  vote text not null check (vote in ('still_there', 'cleared')),
  created_at timestamptz not null default now(),
  unique (incident_id, user_id)
);
alter table public.incident_votes enable row level security;
drop policy if exists "votes: read own" on public.incident_votes;
create policy "votes: read own" on public.incident_votes for select using (user_id = auth.uid());
drop policy if exists "votes: cast own" on public.incident_votes;
create policy "votes: cast own" on public.incident_votes for insert to authenticated with check (user_id = auth.uid());

-- a vote extends or clears the pin, and gives the voter +2 points
create or replace function public.on_vote_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.vote = 'still_there' then
    update public.incidents
       set still_there_count = still_there_count + 1,
           expires_at = greatest(expires_at, now() + interval '45 minutes')
     where id = new.incident_id;
  else
    update public.incidents
       set cleared_count = cleared_count + 1,
           active = case when cleared_count + 1 >= 2 and cleared_count + 1 > still_there_count then false else active end
     where id = new.incident_id;
  end if;
  update public.profiles set community_points = community_points + 2 where id = new.user_id;
  return new;
end $$;
drop trigger if exists votes_after_insert on public.incident_votes;
create trigger votes_after_insert after insert on public.incident_votes
  for each row execute function public.on_vote_insert();

-- ---------- payment_transactions (written only by the khqr Edge Function) ----------
create table if not exists public.payment_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null check (provider in ('khqr', 'google_play', 'app_store')),
  amount numeric(10, 2) not null,
  currency text not null default 'USD',
  status text not null default 'pending' check (status in ('pending', 'paid', 'expired', 'failed')),
  khqr_md5 text unique,
  khqr_string text,
  bill_number text,
  provider_ref text,
  period_start timestamptz,
  period_end timestamptz,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);
alter table public.payment_transactions enable row level security;
drop policy if exists "payments: read own" on public.payment_transactions;
create policy "payments: read own" on public.payment_transactions for select using (user_id = auth.uid());
-- inserts/updates only with the service role (Edge Function), so no insert policy here

-- ---------- live updates ----------
do $$ begin
  begin alter publication supabase_realtime add table public.incidents; exception when duplicate_object then null; end;
end $$;

-- ---------- pay with the owner's ABA KHQR (no bank API needed) ----------
-- The user pays $1 to the K'MAP / owner ABA account and taps "I've paid":
-- that creates a pending payment. The owner checks the ABA app, then activates Pro
-- in SQL Editor:   select public.admin_activate_pro('+85512345678');
create or replace function public.claim_payment(p_note text default null) returns public.payment_transactions
language plpgsql security definer set search_path = public as $$
declare tx public.payment_transactions;
begin
  if auth.uid() is null or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'sign in first';
  end if;
  if (select count(*) from public.payment_transactions
       where user_id = auth.uid() and status = 'pending' and created_at > now() - interval '1 day') >= 3 then
    raise exception 'already waiting for confirmation';
  end if;
  insert into public.payment_transactions (user_id, provider, amount, currency, status, bill_number, provider_ref)
  values (auth.uid(), 'khqr', 1, 'USD', 'pending', 'KM' || to_char(now(), 'YYMMDDHH24MISS'), left(p_note, 140))
  returning * into tx;
  return tx;
end $$;
grant execute on function public.claim_payment(text) to authenticated;

-- owner only (SQL Editor): give 30 days of Pro by phone number, user id, or bill number
create or replace function public.admin_activate_pro(p_who text, p_days integer default 30) returns public.profiles
language plpgsql security definer set search_path = public as $$
declare p public.profiles; base timestamptz;
begin
  select pr.* into p from public.profiles pr
   where pr.phone = p_who or pr.phone = '+' || ltrim(p_who, '+') or pr.id::text = p_who
      or pr.id = (select user_id from public.payment_transactions where bill_number = p_who limit 1)
   limit 1;
  if p.id is null then raise exception 'no user for %', p_who; end if;
  base := greatest(now(), coalesce(p.subscription_expires_at, now()));
  update public.payment_transactions set status = 'paid', paid_at = now(), period_start = base,
         period_end = base + make_interval(days => p_days)
   where id = (select id from public.payment_transactions where user_id = p.id and status = 'pending' order by created_at desc limit 1);
  update public.profiles set subscription_status = 'active', subscription_expires_at = base + make_interval(days => p_days)
   where id = p.id returning * into p;
  return p;
end $$;
revoke all on function public.admin_activate_pro(text, integer) from public, anon, authenticated;
