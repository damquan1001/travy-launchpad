// Lightweight client-side geocoder using OpenStreetMap Nominatim.
// Vietnam-biased — we're a Vietnam-specialist planner.

export type GeoFocus = { lat: number; lng: number; zoom: number; label: string };

const cache = new Map<string, GeoFocus | null>();

// Known Vietnam aliases → canonical query (helps Nominatim).
const ALIASES: Array<[RegExp, string]> = [
  [/\b(đà\s*n[ẵaã]ng|da\s*nang)\b/i, "Da Nang, Vietnam"],
  [/\b(hà\s*n[ộo]i|ha\s*noi|hanoi)\b/i, "Hanoi, Vietnam"],
  [/\b(hồ\s*chí\s*minh|ho\s*chi\s*minh|saigon|sài\s*gòn|hcmc)\b/i, "Ho Chi Minh City, Vietnam"],
  [/\b(hội\s*an|hoi\s*an)\b/i, "Hoi An, Vietnam"],
  [/\b(huế|hue)\b/i, "Hue, Vietnam"],
  [/\b(sa\s*pa|sapa)\b/i, "Sapa, Vietnam"],
  [/\b(hà\s*giang|ha\s*giang)\b/i, "Ha Giang, Vietnam"],
  [/\b(ninh\s*bình|ninh\s*binh)\b/i, "Ninh Binh, Vietnam"],
  [/\b(hạ\s*long|ha\s*long|halong)\b/i, "Ha Long Bay, Vietnam"],
  [/\b(phú\s*quốc|phu\s*quoc)\b/i, "Phu Quoc, Vietnam"],
  [/\b(đà\s*lạt|da\s*lat|dalat)\b/i, "Da Lat, Vietnam"],
  [/\b(nha\s*trang)\b/i, "Nha Trang, Vietnam"],
  [/\b(mũi\s*né|mui\s*ne)\b/i, "Mui Ne, Vietnam"],
  [/\b(cần\s*thơ|can\s*tho)\b/i, "Can Tho, Vietnam"],
  [/\b(quảng\s*nam|quang\s*nam)\b/i, "Quang Nam, Vietnam"],
];

// Extract a likely Vietnam place phrase from a free-form message.
export function extractDestinationQuery(text: string): string | null {
  const cleaned = text.trim().replace(/\s+/g, " ");
  if (!cleaned) return null;
  for (const [re, canonical] of ALIASES) {
    if (re.test(cleaned)) return canonical;
  }
  // Capitalized phrase (incl. Vietnamese diacritics)
  const m = cleaned.match(/\b([A-ZÀ-Ỹ][a-zA-ZÀ-ỹ]+(?:\s+[A-ZÀ-Ỹ][a-zA-ZÀ-ỹ]+){0,3})\b/);
  if (m) return `${m[1]}, Vietnam`;
  // Last resort — only if message is short enough to be a place name
  if (cleaned.length <= 40) return `${cleaned}, Vietnam`;
  return null;
}

function zoomFor(result: any): number {
  const t = String(result.type ?? "");
  const c = String(result.class ?? "");
  if (c === "boundary" || t === "administrative") {
    const rank = Number(result.place_rank ?? 8);
    if (rank <= 4) return 3;
    if (rank <= 6) return 4;
    if (rank <= 10) return 6;
    if (rank <= 14) return 9;
    return 11;
  }
  if (c === "place") {
    if (t === "country") return 4;
    if (t === "state" || t === "region") return 6;
    if (t === "city") return 11;
    if (t === "town") return 12;
    if (t === "village" || t === "suburb") return 13;
  }
  return 10;
}

export async function geocodePlace(query: string): Promise<GeoFocus | null> {
  const key = query.toLowerCase();
  if (cache.has(key)) return cache.get(key)!;
  try {
    // countrycodes=vn biases results to Vietnam — the right default for TraVy.
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=vn&q=${encodeURIComponent(query)}`;
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
