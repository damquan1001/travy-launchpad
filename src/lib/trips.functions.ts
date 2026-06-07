import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Itinerary } from "./itinerary";

export const listTrips = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("trips")
      .select("id,title,destination,summary,start_date,end_date,party,status,locale,updated_at,itinerary")
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { trips: data ?? [] };
  });

export const getTrip = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: trip, error } = await supabase
      .from("trips").select("*").eq("id", data.id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!trip) throw new Error("Trip not found");
    const { data: messages } = await supabase
      .from("trip_messages").select("*").eq("trip_id", data.id).order("created_at");
    return { trip, messages: messages ?? [] };
  });

const SaveTripInput = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1).max(200),
  destination: z.string().max(200).optional().nullable(),
  summary: z.string().max(2000).optional().nullable(),
  party: z.string().max(200).optional().nullable(),
  start_date: z.string().optional().nullable(),
  end_date: z.string().optional().nullable(),
  budget_usd: z.number().nullable().optional(),
  locale: z.enum(["en", "vn"]).default("en"),
  itinerary: z.any(),
  status: z.enum(["draft", "saved"]).default("saved"),
});

export const saveTrip = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SaveTripInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const payload = { ...data, user_id: userId, updated_at: new Date().toISOString() };
    const { data: row, error } = data.id
      ? await supabase.from("trips").update(payload).eq("id", data.id).select().maybeSingle()
      : await supabase.from("trips").insert(payload).select().maybeSingle();
    if (error) throw new Error(error.message);
    return { trip: row };
  });

export const deleteTrip = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("trips").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const flagInaccuracy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      reason: z.string().min(1).max(500),
      place_id: z.string().uuid().optional(),
      trip_id: z.string().uuid().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("inaccuracy_flags")
      .insert({ ...data, user_id: context.userId });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export type SaveTripPayload = z.infer<typeof SaveTripInput> & { itinerary: Itinerary };
