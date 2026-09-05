-- User Profiles
create table public.profiles (
  id uuid references auth.users not null primary key,
  email text,
  coins integer default 0,
  theme text default 'dark',
  ai_generation_count integer default 0,
  is_premium boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Turn on Row Level Security
alter table public.profiles enable row level security;

-- Policies for profiles
create policy "Public profiles are viewable by everyone."
  on profiles for select
  using ( true );

create policy "Users can insert their own profile."
  on profiles for insert
  with check ( auth.uid() = id );

create policy "Users can update own profile."
  on profiles for update
  using ( auth.uid() = id );

-- Inventory
create table public.inventory (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) not null,
  skin_id text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, skin_id)
);

alter table public.inventory enable row level security;

create policy "Users can view own inventory"
  on inventory for select
  using ( auth.uid() = user_id );

create policy "Users can insert into own inventory"
  on inventory for insert
  with check ( auth.uid() = user_id );

-- Equipped Skins
create table public.equipped_skins (
  user_id uuid references public.profiles(id) not null,
  game_id text not null,
  skin_id text not null,
  primary key (user_id, game_id)
);

alter table public.equipped_skins enable row level security;

create policy "Users can view own equipped skins"
  on equipped_skins for select
  using ( auth.uid() = user_id );

create policy "Users can update own equipped skins"
  on equipped_skins for update
  using ( auth.uid() = user_id );
  
create policy "Users can insert own equipped skins"
  on equipped_skins for insert
  with check ( auth.uid() = user_id );

-- High Scores
create table public.high_scores (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) not null,
  game_id text not null,
  score integer not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.high_scores enable row level security;

create policy "High scores are viewable by everyone"
  on high_scores for select
  using ( true );

create policy "Users can insert own high scores"
  on high_scores for insert
  with check ( auth.uid() = user_id );

-- Triggers to create a profile automatically when a user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
