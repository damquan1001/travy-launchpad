-- Allow service_role to upsert places (admin seed only); add text search column
ALTER TABLE public.places ADD COLUMN IF NOT EXISTS search_tsv tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('simple', coalesce(name_en,'')), 'A') ||
    setweight(to_tsvector('simple', coalesce(name_vn,'')), 'A') ||
    setweight(to_tsvector('simple', coalesce(province,'') || ' ' || coalesce(city,'')), 'B') ||
    setweight(to_tsvector('simple', coalesce(blurb_en,'') || ' ' || coalesce(cultural_context,'') || ' ' || coalesce(tips,'')), 'C')
  ) STORED;

CREATE INDEX IF NOT EXISTS places_search_tsv_idx ON public.places USING gin(search_tsv);
CREATE INDEX IF NOT EXISTS places_province_idx ON public.places (province);

-- Text-search RAG fallback (no embeddings needed for v1)
CREATE OR REPLACE FUNCTION public.search_places(
  query_text text,
  match_count integer DEFAULT 10,
  province_filter text DEFAULT NULL
)
RETURNS TABLE (
  id uuid, slug text, name_en text, name_vn text, province text, city text, type text,
  blurb_en text, blurb_vn text, cultural_context text, tips text,
  est_cost_usd numeric, best_time text, lat numeric, lng numeric,
  community_flag boolean, source jsonb, rank real
)
LANGUAGE sql STABLE SET search_path = public AS $$
  WITH q AS (
    SELECT websearch_to_tsquery('simple', coalesce(nullif(query_text,''),'vietnam travel')) AS tsq
  )
  SELECT p.id, p.slug, p.name_en, p.name_vn, p.province, p.city, p.type,
         p.blurb_en, p.blurb_vn, p.cultural_context, p.tips,
         p.est_cost_usd, p.best_time, p.lat, p.lng, p.community_flag, p.source,
         ts_rank(p.search_tsv, q.tsq) AS rank
  FROM public.places p, q
  WHERE (province_filter IS NULL OR p.province ILIKE province_filter)
    AND (q.tsq IS NULL OR p.search_tsv @@ q.tsq OR province_filter IS NOT NULL)
  ORDER BY rank DESC NULLS LAST, p.community_flag DESC
  LIMIT match_count;
$$;

GRANT EXECUTE ON FUNCTION public.search_places(text, integer, text) TO anon, authenticated, service_role;