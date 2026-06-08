# TraVy Plan v2

Three workstreams, shipped in this order so each one builds on the last.

## 1. Real RAG with pgvector embeddings (priority)

Goal: replace the keyword `search_places` path with semantic retrieval so the agent recalls relevant places even when the user's wording doesn't match the seed text.

- **Backfill embeddings** for all ~150 seeded places using Lovable AI Gateway `google/gemini-embedding-001` (3072 dims — matches existing `places.embedding vector(3072)` column).
  - New server route `POST /api/public/admin/embed-places` guarded by a `EMBED_ADMIN_TOKEN` secret. Iterates places where `embedding IS NULL`, embeds `name_en || blurb_en || cultural_context || tips`, updates row. Batched, idempotent, resumable.
- **Hybrid retrieval server fn** `retrievePlaces({ query, province?, k })`:
  1. Embed the user query (Gemini 3072d).
  2. Call existing `match_places(query_embedding, k*2, province)` for vector candidates.
  3. Call existing `search_places(query_text, k*2, province)` for lexical candidates.
  4. Merge with reciprocal-rank fusion, boost `community_flag`, return top `k`.
- **Wire into chat** (`src/routes/api/chat.ts`):
  - Replace inline keyword search with an AI SDK `tool` named `search_places` whose `execute` calls `retrievePlaces`. The model invokes it before `build_itinerary`.
  - Update system prompt to require a `search_places` call per destination/day before composing the itinerary, and to cite returned `id`/`slug` in each place it outputs.
- **Quality guard**: on `build_itinerary`, validate every place against retrieved IDs; unknown places get `source_kind: "web"` and a visible "AI suggestion" badge so users can flag them.

## 2. Interactive Google Maps in itinerary

Goal: an embedded, pannable map next to/under the itinerary that shows every place pin, with day-colored markers and click-to-focus.

- Add Google Maps Platform connector via `standard_connectors--connect` (`google_maps`). User links it once.
- New `MapPanel.tsx` using the Maps JS API loaded async with the browser key (`VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY`), `callback=initMap`, channel param. Uses `google.maps.Marker` (not AdvancedMarkerElement, no `mapId`).
- Marker per place using `lat`/`lng` already on `places`. Colored by day index. Click → opens info window with name, blurb, tip; emits selection event so the itinerary row highlights and scrolls into view.
- For any AI-suggested place missing coords, server-side geocode via the gateway (`maps/api/geocode/json`) on save; cache result on the trip's `itinerary` JSON.
- Layout on `/plan` and `/trips/$id`:
  - Desktop: 3-pane — Chat | Itinerary | Map (resizable, map collapsible).
  - Mobile: tabbed (Chat / Itinerary / Map).

## 3. Richer itinerary UX

Goal: the itinerary stops being read-only — users shape it.

- **Reorder**: drag-and-drop days and places within a day (`@dnd-kit/core` + `@dnd-kit/sortable`).
- **Edit inline**: tap a place card to edit blurb/tip/best_time/cost; "Replace this place" opens a sheet listing alternates from `retrievePlaces` filtered to the same province + type.
- **Add/remove**: "+ Add place" inside a day opens the same picker; remove with a swipe / × button.
- **Day controls**: add/remove day, rename day title, set date.
- **Autosave**: debounced save through `saveTrip` for signed-in users; local draft in `sessionStorage` for anonymous so the work survives a refresh before sign-in.
- **Itinerary <-> map sync**: hovering a card pulses its marker; clicking a marker scrolls the card into view.

## Technical details

- **DB**: no schema changes required — `places.embedding`, `match_places`, lat/lng already exist. Add `idx_places_embedding_hnsw` if not present:
  ```sql
  create index if not exists idx_places_embedding_hnsw
    on public.places using hnsw (embedding vector_cosine_ops);
  ```
- **Secrets**: `LOVABLE_API_KEY` (exists), new `EMBED_ADMIN_TOKEN` for the backfill route, Google Maps connector secrets (auto-injected).
- **Server fns** (new, under `src/lib/`):
  - `places.functions.ts` → `retrievePlaces`, `geocodePlace`.
  - `embeddings.server.ts` → `embedText(input)` helper.
- **Server routes** (new):
  - `src/routes/api/public/admin/embed-places.ts` — backfill (token-gated).
- **Chat tool surface** (`src/routes/api/chat.ts`): add `search_places` tool, keep `build_itinerary`, bump `stopWhen: stepCountIs(50)`.
- **New components**: `MapPanel.tsx`, `PlacePicker.tsx` (sheet), `SortableDay.tsx`, `SortablePlace.tsx`.
- **Deps to add**: `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`.
- **Out of scope** for v2: collaboration/sharing, paywall/free-tier gate, offline mode.

## Suggested shipping order

1. pgvector backfill + hybrid retrieval wired into chat (the priority).
2. Google Maps connector + read-only `MapPanel` on `/plan` and `/trips/$id`.
3. Drag/edit/replace itinerary editor with autosave + map sync.
