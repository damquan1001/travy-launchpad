
CREATE OR REPLACE FUNCTION public.match_places(query_embedding extensions.vector, match_count integer DEFAULT 8, province_filter text DEFAULT NULL::text)
 RETURNS TABLE(id uuid, slug text, name_en text, name_vn text, province text, city text, type text, blurb_en text, blurb_vn text, cultural_context text, tips text, est_cost_usd numeric, best_time text, lat numeric, lng numeric, community_flag boolean, source jsonb, similarity double precision)
 LANGUAGE sql STABLE SET search_path TO 'public', 'extensions'
AS $function$
  select p.id, p.slug, p.name_en, p.name_vn, p.province, p.city, p.type,
         p.blurb_en, p.blurb_vn, p.cultural_context, p.tips, p.est_cost_usd,
         p.best_time, p.lat, p.lng, p.community_flag, p.source,
         1 - (p.embedding <=> query_embedding) as similarity
  from public.places p
  where p.embedding is not null
    and (province_filter is null or p.province ilike '%' || province_filter || '%')
  order by p.embedding <=> query_embedding
  limit match_count;
$function$;
