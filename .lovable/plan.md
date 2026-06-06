## Goal

Ship the Week-5 deployable release of **TraVy**: an AI-native web app where tourists chat with an AI to generate culturally enriched, day-by-day Vietnam itineraries, grounded in a seeded RAG knowledge base with a real-time web-crawl freshness fallback, plus auth, saved trips, EN/VN, and inaccuracy flagging.

Visual direction: **Lacquered Journal** (Playfair Display + Inter + JetBrains Mono; paper/ink/lacquer-red/jade-green palette; chat-left / itinerary-right split as the primary surface).

## Surfaces

1. **Landing (`/`)** — hero with TraVy positioning, single CTA into chat, "how it works", featured regions, footer.
2. **Auth (`/auth`)** — email magic-link / password sign-in & sign-up.
3. **Plan (`/plan` and `/plan/$tripId`)** — the split chat+itinerary surface. Skippable onboarding chips (destination, party, dates, style, budget). Streaming AI responses. Itinerary panel renders day cards → place cards (image, name, cultural blurb, source badge, community-flag badge, est. cost, transport hint, flag-as-inaccurate).
4. **My Trips (`/_authenticated/trips`)** — saved itinerary library.
5. **Trip detail share (`/trips/$id`)** — read-only itinerary view.
6. **EN/VN toggle** in nav, persisted to profile + localStorage.

## Technical Architecture

- **Frontend**: TanStack Start (existing template), Tailwind v4 with Lacquered Journal tokens in `src/styles.css`, shadcn primitives, `react-markdown` for AI output.
- **Backend (Lovable Cloud / Supabase)**:
  - Auth (email/password)
  - Tables: `profiles`, `trips`, `trip_messages`, `places` (RAG corpus w/ pgvector 768/3072 dim), `place_sources`, `inaccuracy_flags`
  - `pgvector` extension + `match_places(query_embedding, match_count, filter)` SQL function
  - RLS on every table; `service_role` grants for server functions; `has_role` pattern only if needed (not for v1)
- **AI** (Lovable AI Gateway, server-side only):
  - Chat: `google/gemini-3-flash-preview` streaming via a server route at `/api/chat` (so we can SSE-stream)
  - Tool calling for structured itinerary extraction (`build_itinerary` tool returning days/places JSON)
  - Embeddings: `google/gemini-embedding-001` for both place chunks and user queries
- **Web crawl fallback**: server function `freshness_lookup` — when RAG confidence < threshold or user asks about freshness-sensitive info (opening hours, closures), call Brave Search via fetch (free API key from user) and pass top snippets back into the LLM context with a "Web (live)" source badge. If no key is configured, gracefully skip the fallback and tag results as RAG-only.
- **Server functions / routes** (TanStack Start):
  - `POST /api/chat` (server route, SSE) — streams the assistant reply, runs RAG retrieval before completion, calls the `build_itinerary` tool, persists messages and itinerary JSON.
  - `saveTrip`, `listTrips`, `getTrip`, `deleteTrip`, `flagInaccuracy` (createServerFn, `requireSupabaseAuth`).
  - `seedKnowledgeBase` (admin-only server route, idempotent) — embeds the 150-location JSON seed at first boot.

## RAG Knowledge Base

- I will generate `src/data/vn-places.seed.json` — ~150 curated locations across **10 provinces**: Hanoi, HCMC, Da Nang, Quang Nam (Hoi An/My Son), Quang Ninh (Ha Long), Lao Cai (Sapa), Thua Thien Hue, Ninh Binh, Kien Giang (Phu Quoc), Ha Giang.
- Each entry: name (en + vn), province, city, type (heritage/food/nature/etc.), cultural_blurb (2-4 sentences), tips, est_cost_usd, best_time, lat/lng, source_urls, community_flag (bool).
- Boot-time `seedKnowledgeBase` route checks if `places` is empty; if so, chunks descriptions, embeds via Lovable AI, inserts with metadata. Re-run is no-op.

## Prompting & Guardrails

- System prompt: enforces grounded responses using retrieved place context, requires citing place IDs, marks community-sourced entries with a disclaimer, refuses politically sensitive/harmful content about Vietnam (per PRD §6.2), responds in user's selected language.
- Structured output via the `build_itinerary` tool — small schema (days[], places[]) to stay under Gemini's state cap.
- Low-confidence handler: if retrieval similarity < 0.6 for all chunks, prompt the model to say "I don't have verified info on X" and offer the freshness fallback.

## Data Model (Supabase)

```text
profiles(id pk -> auth.users, locale text default 'en', created_at)
trips(id, user_id, title, summary, destination, party, start_date, end_date,
      itinerary jsonb, status text, created_at, updated_at)
trip_messages(id, trip_id, role text, content text, tool_calls jsonb, created_at)
places(id, name_en, name_vn, province, city, type, blurb_en, blurb_vn,
       tips, est_cost_usd, best_time, lat, lng, community_flag bool,
       embedding vector(768), source jsonb, created_at)
place_sources(id, place_id, url, title, kind text)  -- primary | community | web
inaccuracy_flags(id, place_id nullable, trip_id, user_id, reason text,
                 status text default 'open', created_at)
```

All tables: GRANT to authenticated + service_role per public-schema-grants rule. RLS:
- `profiles`, `trips`, `trip_messages`, `inaccuracy_flags`: owner-only via `auth.uid()`
- `places`, `place_sources`: read = authenticated + anon; write = service_role only

## Build Phases

1. **Setup** — enable Lovable Cloud + AI Gateway, install deps (`react-markdown`, `zod`), add Playfair/Inter/JetBrains fonts via `<link>` in `__root.tsx`, write design tokens into `src/styles.css`.
2. **Auth + shell** — auth route, `_authenticated` layout, nav with EN/VN toggle, landing page.
3. **Schema migration** — extensions, tables, RLS, grants, `match_places` function, seed-data table.
4. **Seed data** — generate `vn-places.seed.json` (150 entries) + admin seed endpoint.
5. **Plan surface (chat + itinerary)** — split layout, message list, composer, onboarding chips, itinerary day/place cards matching the Lacquered Journal prototype.
6. **AI pipeline** — `/api/chat` SSE route, RAG retrieval, tool-calling for itinerary, message persistence, EN/VN system prompt switch.
7. **Trips library** — list, open, delete; flag-inaccuracy modal.
8. **Freshness fallback** — Brave Search optional integration; gracefully degrades if no key.
9. **Polish** — empty/error/low-confidence states, mobile responsive (stacks chat above itinerary), SEO heads per route, 404/error boundaries.
10. **QA pass** — verify build, walk through a test plan, fix issues.

## Out of Scope (per PRD §5.3)

In-app booking, native mobile, social/UGC, offline mode, admin dashboard, multi-country, voice, push notifications, in-trip pivots, billing/paywall, third-party booking APIs.

## Open Items I'll Handle Without Asking

- Use Lovable Auth email/password (skip OAuth for v1).
- Use Brave Search if user later adds `BRAVE_API_KEY`; otherwise crawl fallback is disabled and itinerary outputs are RAG-only with a note.
- Inaccuracy flags simply land in the `inaccuracy_flags` table (review = manual Supabase query for now, per PRD).

After you approve, I'll switch to build mode and execute phases 1–10.
