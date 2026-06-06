
-- Lock search_path on trigger helpers
create or replace function public.touch_updated_at()
returns trigger language plpgsql
security invoker
set search_path = public
as $$
begin new.updated_at = now(); return new; end;
$$;

-- match_places: invoker is fine because places already has anon/auth select
create or replace function public.match_places(
  query_embedding vector(768),
  match_count int default 8,
  province_filter text default null
)
returns table (
  id uuid, slug text, name_en text, name_vn text, province text, city text,
  type text, blurb_en text, blurb_vn text, cultural_context text, tips text,
  est_cost_usd numeric, best_time text, lat numeric, lng numeric,
  community_flag boolean, source jsonb, similarity float
)
language sql stable
security invoker
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

-- handle_new_user must stay SECURITY DEFINER (writes to public.profiles from auth trigger).
-- Restrict EXECUTE to the postgres/supabase roles that fire the trigger.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
