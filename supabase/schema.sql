do $$
begin
  create type public.app_role as enum ('owner', 'admin', 'member', 'viewer');
exception
  when duplicate_object then null;
end
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  display_name text,
  default_role public.app_role not null default 'owner',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create table if not exists public.collection_entries (
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_id text not null,
  card_id text not null,
  game text not null check (game in ('yugioh', 'mtg', 'pokemon')),
  name text not null,
  image_url text not null default '',
  type text,
  set_name text,
  rarity text,
  description text,
  price_low numeric(10, 2),
  price_mid numeric(10, 2),
  price_high numeric(10, 2),
  estimated_value numeric(10, 2),
  quantity integer not null check (quantity > 0),
  condition text not null check (
    condition in (
      'Mint',
      'Near Mint',
      'Lightly Played',
      'Moderately Played',
      'Heavily Played',
      'Damaged'
    )
  ),
  added_at timestamptz not null,
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, entry_id)
);

create table if not exists public.binders (
  user_id uuid not null references auth.users(id) on delete cascade,
  binder_id text not null,
  name text not null,
  description text,
  created_at timestamptz not null,
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, binder_id)
);

create table if not exists public.binder_entries (
  user_id uuid not null references auth.users(id) on delete cascade,
  binder_id text not null,
  entry_id text not null,
  collection_entry_id text not null,
  sell_qty integer not null check (sell_qty > 0),
  asking_price numeric(10, 2) check (asking_price is null or asking_price >= 0),
  notes text,
  added_at timestamptz not null,
  primary key (user_id, binder_id, entry_id),
  unique (user_id, binder_id, collection_entry_id),
  foreign key (user_id, binder_id) references public.binders(user_id, binder_id) on delete cascade
);

alter table public.profiles enable row level security;
alter table public.collection_entries enable row level security;
alter table public.binders enable row level security;
alter table public.binder_entries enable row level security;

drop policy if exists "Users can view their own profile" on public.profiles;
create policy "Users can view their own profile"
  on public.profiles
  for select
  using (auth.uid() = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles
  for update
  using (auth.uid() = id);

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
  on public.profiles
  for insert
  with check (auth.uid() = id);

drop policy if exists "Users can manage their own collection" on public.collection_entries;
create policy "Users can manage their own collection"
  on public.collection_entries
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can manage their own binders" on public.binders;
create policy "Users can manage their own binders"
  on public.binders
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can manage their own binder entries" on public.binder_entries;
create policy "Users can manage their own binder entries"
  on public.binder_entries
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── Admin / Owner policies ────────────────────────────────────────────────────

-- New users should not be owners by default; bootstrap an initial owner explicitly.
alter table public.profiles
  alter column default_role set default 'member';

-- Helper: returns true if the current user has owner or admin role
create or replace function public.is_admin_or_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and default_role in ('owner', 'admin')
  );
$$;

-- Admins and owners can view all profiles (needed for the admin panel user list)
drop policy if exists "Admins can view all profiles" on public.profiles;
create policy "Admins can view all profiles"
  on public.profiles
  for select
  using (public.is_admin_or_owner());

-- Admins and owners can update any profile's role (e.g. to promote/demote users)
drop policy if exists "Admins can update any profile" on public.profiles;
create policy "Admins can update any profile"
  on public.profiles
  for update
  using (public.is_admin_or_owner())
  with check (public.is_admin_or_owner());
