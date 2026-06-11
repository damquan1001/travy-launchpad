// Lightweight client-side geocoder using OpenStreetMap Nominatim.
// No API key. Be a good citizen: cache results, debounce calls.

export type GeoFocus = { lat: number; lng: number; zoom: number; label: string };

const cache = new Map<string, GeoFocus | null>();

// Heuristic: pick a likely place phrase from a free-form message.
// We send the whole message to Nominatim — it handles fuzzy matches well.
// But we skip very long messages to avoid noise.
export function extractDestinationQuery(text: string): string | null {
  const cleaned = text.trim().replace(/\s+/g, " ");
  if (!cleaned) return null;
  if (cleaned.length > 120) {
    // Try to find a capitalized phrase
    const m = cleaned.match(/\b([A-Z][a-zA-ZÀ-ỹ]+(?:\s+[A-Z][a-zA-ZÀ-ỹ]+){0,3})\b/);
    return m ? m[1] : null;
  }
  return cleaned;
}

// Map OSM result "type" / "class" to a sensible zoom level.
function zoomFor(result: any): number {
  const t = String(result.type ?? "");
  const c = String(result.class ?? "");
  if (c === "boundary" || t === "administrative") {
    const rank = Number(result.place_rank ?? 8);
    if (rank <= 4) return 3;   // continent
    if (rank <= 6) return 4;   // country
    if (rank <= 10) return 6;  // region
    if (rank <= 14) return 9;  // province / state
    return 11;                  // city
  }
  if (c === "place") {
    if (t === "country") return 4;
    if (t === "state" || t === "region") return 6;
    if (t === "city") return 10;
    if (t === "town") return 12;
    if (t === "village" || t === "suburb") return 13;
  }
  return 9;
}

export async function geocodePlace(query: string): Promise<GeoFocus | null> {
  const key = query.toLowerCase();
  if (cache.has(key)) return cache.get(key)!;
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) { cache.set(key, null); return null; }
    const arr = (await res.json()) as any[];
    if (!arr?.length) { cache.set(key, null); return null; }
    const r = arr[0];
    const focus: GeoFocus = {
      lat: Number(r.lat),
      lng: Number(r.lon),
      zoom: zoomFor(r),
      label: String(r.display_name ?? query),
    };
    cache.set(key, focus);
    return focus;
  } catch {
    cache.set(key, null);
    return null;
  }
}
