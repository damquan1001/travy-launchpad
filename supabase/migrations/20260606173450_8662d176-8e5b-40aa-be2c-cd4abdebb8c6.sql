
-- Extensions
create extension if not exists vector;

-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  locale text not null default 'en',
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "Users read own profile" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "Users update own profile" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
create policy "Users insert own profile" on public.profiles for insert to authenticated with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Trips
create table public.trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Untitled Trip',
  summary text,
  destination text,
  party text,
  start_date date,
  end_date date,
  budget_usd numeric,
  locale text not null default 'en',
  itinerary jsonb not null default '{"days":[]}'::jsonb,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.trips to authenticated;
grant all on public.trips to service_role;
alter table public.trips enable row level security;
create policy "Users manage own trips" on public.trips for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index trips_user_id_idx on public.trips(user_id, updated_at desc);

-- Messages
create table public.trip_messages (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user','assistant','system','tool')),
  content text not null default '',
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.trip_messages to authenticated;
grant all on public.trip_messages to service_role;
alter table public.trip_messages enable row level security;
create policy "Users manage own messages" on public.trip_messages for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index trip_messages_trip_idx on public.trip_messages(trip_id, created_at);

-- Places (RAG knowledge base) — 768-dim embeddings (gemini-embedding-001 with dimensions=768)
create table public.places (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name_en text not null,
  name_vn text,
  province text not null,
  city text,
  type text not null,
  blurb_en text not null,
  blurb_vn text,
  cultural_context text,
  tips text,
  est_cost_usd numeric,
  best_time text,
  lat numeric,
  lng numeric,
  community_flag boolean not null default false,
  source jsonb default '[]'::jsonb,
  embedding vector(768),
  created_at timestamptz not null default now()
);
grant select on public.places to anon, authenticated;
grant all on public.places to service_role;
alter table public.places enable row level security;
create policy "Anyone can read places" on public.places for select to anon, authenticated using (true);

create index if not exists places_embedding_idx
  on public.places using hnsw (embedding vector_cosine_ops);
create index places_province_idx on public.places(province);

-- Similarity search function
create or replace function public.match_places(
  query_embedding vector(768),
  match_count int default 8,
  province_filter text default null
)
returns table (
  id uuid,
  slug text,
  name_en text,
  name_vn text,
  province text,
  city text,
  type text,
  blurb_en text,
  blurb_vn text,
  cultural_context text,
  tips text,
  est_cost_usd numeric,
  best_time text,
  lat numeric,
  lng numeric,
  community_flag boolean,
  source jsonb,
  similarity float
)
language sql stable
security definer
set search_path = public
as $$
  select p.id, p.slug, p.name_en, p.name_vn, p.province, p.city, p.type,
         p.blurb_en, p.blurb_vn, p.cultural_context, p.tips, p.est_cost_usd,
         p.best_time, p.lat, p.lng, p.community_flag, p.source,
         1 - (p.embedding <=> query_embedding) as similarity
  from public.places p
  where p.embedding is not null
    and (province_filter is null or p.province ilike province_filter)
  order by p.embedding <=> query_embedding
  limit match_count;
$$;
grant execute on function public.match_places(vector, int, text) to anon, authenticated, service_role;

-- Inaccuracy flags
create table public.inaccuracy_flags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  place_id uuid references public.places(id) on delete set null,
  trip_id uuid references public.trips(id) on delete set null,
  reason text not null,
  status text not null default 'open',
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.inaccuracy_flags to authenticated;
grant all on public.inaccuracy_flags to service_role;
alter table public.inaccuracy_flags enable row level security;
create policy "Users insert own flags" on public.inaccuracy_flags for insert to authenticated with check (auth.uid() = user_id);
create policy "Users read own flags" on public.inaccuracy_flags for select to authenticated using (auth.uid() = user_id);

-- Update-timestamp helper
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger trips_updated_at before update on public.trips for each row execute function public.touch_updated_at();
create trigger profiles_updated_at before update on public.profiles for each row execute function public.touch_updated_at();
