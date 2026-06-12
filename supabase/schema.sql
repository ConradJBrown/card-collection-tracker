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

alter table public.profiles enable row level security;
alter table public.collection_entries enable row level security;

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
