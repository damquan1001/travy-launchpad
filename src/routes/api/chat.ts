import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, tool, stepCountIs, type UIMessage } from "ai";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { createLovableAiGatewayProvider, getLovableKey } from "@/lib/ai-gateway.server";
import type { Database } from "@/integrations/supabase/types";
import { retrievePlacesCore } from "@/lib/places.functions";

const VN_PROVINCES = [
  "Hanoi","Ho Chi Minh City","Da Nang","Hoi An","Quang Nam","Quang Ninh",
  "Lao Cai","Thua Thien Hue","Ninh Binh","Kien Giang","Ha Giang",
];

function detectProvince(text: string): string | null {
  const lower = text.toLowerCase();
  for (const p of VN_PROVINCES) if (lower.includes(p.toLowerCase())) return p;
  if (lower.includes("sapa")) return "Lao Cai";
  if (lower.includes("hue")) return "Thua Thien Hue";
  if (lower.includes("halong") || lower.includes("ha long")) return "Quang Ninh";
  if (lower.includes("phu quoc")) return "Kien Giang";
  if (lower.includes("saigon") || lower.includes("hcmc")) return "Ho Chi Minh City";
  return null;
}

function getServerSupabase() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  return createClient<Database>(url, key, { auth: { persistSession: false } });
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.json() as { messages?: UIMessage[]; locale?: "en"|"vn" };
        const messages = body.messages;
        const locale = body.locale === "vn" ? "vn" : "en";
        if (!Array.isArray(messages)) return new Response("messages required", { status: 400 });

        const lastUser = [...messages].reverse().find((m) => m.role === "user");
        const lastText = lastUser?.parts.map((p) => (p.type === "text" ? p.text : "")).join(" ") ?? "";
        const province = detectProvince(lastText);

        const supabase = getServerSupabase();
        const { data: ragRows } = await supabase.rpc("search_places", {
          query_text: lastText,
          match_count: 10,
          province_filter: province ?? undefined,
        });

        const ragContext = (ragRows ?? []).map((p) =>
          `- ${p.name_en}${p.name_vn ? ` (${p.name_vn})` : ""} — ${p.province}${p.city ? ", " + p.city : ""} [${p.type}]
  ${p.blurb_en}
  ${p.cultural_context ? "Context: " + p.cultural_context : ""}
  ${p.tips ? "Tip: " + p.tips : ""}
  ${p.best_time ? "Best time: " + p.best_time : ""} ${p.est_cost_usd != null ? `· Est USD ${p.est_cost_usd}` : ""}`
        ).join("\n");

        const system = `You are TraVy, a Vietnam-specialist travel planner. You help users design culturally rich, day-by-day itineraries through natural conversation.

LANGUAGE: ${locale === "vn" ? "Reply in Vietnamese." : "Reply in English."}

STYLE: Warm, knowledgeable, concise. Use markdown sparingly. Surface cultural context, etiquette, food, history. Never invent places — only use those grounded in the knowledge base or that the user explicitly named.

WORKFLOW:
1. Ask 1-2 short clarifying questions if you don't know destination, dates/length, party, vibe.
2. Before proposing or revising a plan, CALL the search_places tool to retrieve grounded candidates (one or more focused queries — e.g. by city, vibe, or food type). Use its results as the primary source.
3. Once you have enough, CALL the build_itinerary tool with a structured itinerary. Every place you include MUST come from search_places results or the initial knowledge base below — never invent.
4. After the tool call, write a short paragraph (2-4 sentences) summarizing the plan and inviting refinement.

KNOWLEDGE BASE (use these as primary; cite cultural detail; do not fabricate beyond these unless user requested):
${ragContext || "(no matches — ask the user for the destination)"}
`;

        const lovable = createLovableAiGatewayProvider(getLovableKey());
        const model = lovable("google/gemini-2.5-flash");

        const result = streamText({
          model,
          system,
          messages: await convertToModelMessages(messages),
          stopWhen: stepCountIs(8),
          tools: {
            search_places: tool({
              description: "Search the curated Vietnam knowledge base (hybrid vector + lexical) for places matching a query. Call this BEFORE build_itinerary to gather grounded candidates. Run multiple focused queries when needed (e.g. by city, vibe, or food type).",
              inputSchema: z.object({
                query: z.string().min(1).max(500).describe("Natural-language description of what to find, e.g. 'street food in Hanoi old quarter' or 'quiet boutique stays in Hoi An'"),
                province: z.string().max(100).nullable().optional().describe("Optional Vietnam province filter, e.g. 'Hanoi', 'Quang Nam'"),
                k: z.number().int().min(1).max(15).default(8),
              }),
              execute: async (input) => {
                const places = await retrievePlacesCore({
                  query: input.query,
                  province: input.province ?? null,
                  k: input.k ?? 8,
                });
                return {
                  places: places.map((p) => ({
                    id: p.id,
                    name_en: p.name_en,
                    name_vn: p.name_vn,
                    province: p.province,
                    city: p.city,
                    type: p.type,
                    blurb: p.blurb_en,
                    cultural_context: p.cultural_context,
                    tips: p.tips,
                    best_time: p.best_time,
                    est_cost_usd: p.est_cost_usd,
                    community_flag: p.community_flag,
                  })),
                };
              },
            }),
            build_itinerary: tool({
              description: "Emit or update the structured itinerary the UI renders on the right panel. Call this whenever you create or meaningfully revise the plan.",
              inputSchema: z.object({
                title: z.string(),
                destination: z.string(),
                party: z.string().optional(),
                start_date: z.string().nullable().optional(),
                end_date: z.string().nullable().optional(),
                budget_usd: z.number().nullable().optional(),
                summary: z.string().optional(),
                days: z.array(z.object({
                  day: z.number().int().positive(),
                  title: z.string(),
                  places: z.array(z.object({
                    name: z.string(),
                    name_vn: z.string().optional(),
                    blurb: z.string(),
                    cultural_context: z.string().optional(),
                    est_cost_usd: z.number().nullable().optional(),
                    best_time: z.string().nullable().optional(),
                    tip: z.string().nullable().optional(),
                    transport: z.string().nullable().optional(),
                    community_flag: z.boolean().optional(),
                    source_kind: z.enum(["primary","community","web"]).optional(),
                  })),
                })),
              }),
              execute: async (input) => ({ ok: true, itinerary: input }),
            }),
          },
        });

        return result.toUIMessageStreamResponse({ originalMessages: messages });
      },
    },
  },
});
