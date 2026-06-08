import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { embedText, toPgVectorLiteral } from "./embeddings.server";

function admin() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient<Database>(url, key, { auth: { persistSession: false } });
}

export type RetrievedPlace = {
  id: string;
  slug: string;
  name_en: string;
  name_vn: string | null;
  province: string;
  city: string | null;
  type: string;
  blurb_en: string;
  blurb_vn: string | null;
  cultural_context: string | null;
  tips: string | null;
  est_cost_usd: number | null;
  best_time: string | null;
  lat: number | null;
  lng: number | null;
  community_flag: boolean;
  score: number;
};

const Input = z.object({
  query: z.string().min(1).max(500),
  province: z.string().max(100).nullable().optional(),
  k: z.number().int().min(1).max(20).default(8),
});

export async function retrievePlacesCore(args: z.infer<typeof Input>): Promise<RetrievedPlace[]> {
  const sb = admin();
  const k = args.k * 2;
  const province = args.province ?? null;

  // Embedding query (vector)
  const vec = await embedText(args.query).catch(() => null);
  const vecLit = vec ? toPgVectorLiteral(vec) : null;

  const [vecRes, lexRes] = await Promise.all([
    vecLit
      ? sb.rpc("match_places" as never, {
          query_embedding: vecLit as unknown as never,
          match_count: k,
          province_filter: province,
        } as never)
      : Promise.resolve({ data: [] as any[], error: null }),
    sb.rpc("search_places", {
      query_text: args.query,
      match_count: k,
      province_filter: province ?? undefined,
    }),
  ]);

  const vecRows = (vecRes as any).data ?? [];
  const lexRows = (lexRes as any).data ?? [];

  // Reciprocal-rank fusion
  const C = 60;
  const scores = new Map<string, { row: any; score: number }>();
  vecRows.forEach((r: any, i: number) => {
    const cur = scores.get(r.id) ?? { row: r, score: 0 };
    cur.score += 1 / (C + i);
    scores.set(r.id, cur);
  });
  lexRows.forEach((r: any, i: number) => {
    const cur = scores.get(r.id) ?? { row: r, score: 0 };
    cur.score += 1 / (C + i);
    scores.set(r.id, cur);
  });

  const merged = Array.from(scores.values())
    .map(({ row, score }) => ({
      ...row,
      score: score + (row.community_flag ? 0.01 : 0),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, args.k);

  return merged as RetrievedPlace[];
}

export const retrievePlaces = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }) => ({ places: await retrievePlacesCore(data) }));
