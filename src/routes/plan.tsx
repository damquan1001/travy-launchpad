import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Nav } from "@/components/Nav";
import { ChatPanel } from "@/components/ChatPanel";
import { ItineraryPanel } from "@/components/ItineraryPanel";
import { MapPanel } from "@/components/MapPanel";
import { useAuth } from "@/hooks/use-auth";
import { useLocale } from "@/hooks/use-locale";
import { saveTrip, flagInaccuracy } from "@/lib/trips.functions";
import { extractDestinationQuery, geocodePlace, type GeoFocus } from "@/lib/geocode";
import type { Itinerary } from "@/lib/itinerary";

export const Route = createFileRoute("/plan")({
  head: () => ({
    meta: [
      { title: "Plan a trip — TraVy" },
      { name: "description", content: "Chat with TraVy to build a day-by-day Vietnam itinerary." },
    ],
  }),
  component: PlanPage,
});

function PlanPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [locale] = useLocale();
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [tripId, setTripId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = useServerFn(saveTrip);
  const flag = useServerFn(flagInaccuracy);

  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persist = useCallback(async (it: Itinerary, opts?: { redirect?: boolean }) => {
    if (!user) return;
    setSaving(true);
    try {
      const res = await save({
        data: {
          id: tripId ?? undefined,
          title: it.title || it.destination || "Vietnam trip",
          destination: it.destination,
          summary: it.summary,
          party: it.party,
          start_date: it.start_date ?? null,
          end_date: it.end_date ?? null,
          budget_usd: it.budget_usd ?? null,
          locale,
          itinerary: it,
          status: "saved",
        },
      });
      if (res?.trip?.id) {
        if (!tripId) setTripId(res.trip.id);
        if (opts?.redirect) router.navigate({ to: "/trips/$id", params: { id: res.trip.id } });
      }
      setSaved(true);
    } catch (e: any) {
      toast.error(e?.message ?? "Could not save");
    } finally {
      setSaving(false);
    }
  }, [user, tripId, locale, save, router]);

  const handleChange = useCallback((next: Itinerary) => {
    setItinerary(next);
    setSaved(false);
    if (!user) return;
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => { void persist(next); }, 1200);
  }, [user, persist]);

  useEffect(() => () => { if (autosaveTimer.current) clearTimeout(autosaveTimer.current); }, []);

  // Anonymous draft survives refresh
  useEffect(() => {
    if (user || !itinerary) return;
    try { sessionStorage.setItem("travy:draft", JSON.stringify(itinerary)); } catch {}
  }, [itinerary, user]);
  useEffect(() => {
    if (itinerary) return;
    try {
      const raw = sessionStorage.getItem("travy:draft");
      if (raw) setItinerary(JSON.parse(raw));
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async () => {
    if (!user) { router.navigate({ to: "/auth" }); return; }
    if (!itinerary) return;
    await persist(itinerary, { redirect: true });
    toast.success("Trip saved");
  };

  const handleFlag = async (placeName: string) => {
    try {
      if (!user) { router.navigate({ to: "/auth" }); return; }
      await flag({ data: { reason: `Inaccuracy in: ${placeName}` } });
      toast.success("Thanks — flagged");
    } catch (e: any) {
      toast.error(e?.message ?? "Could not flag");
    }
  };

  return (
    <div className="flex h-screen flex-col bg-paper">
      <Nav />
      <div className="grid min-h-0 flex-1 overflow-hidden lg:grid-cols-[1fr_1fr_1fr]">
        <section className="flex min-h-0 flex-col overflow-hidden border-r border-border">
          <ChatPanel onItinerary={(it) => { setItinerary(it); setSaved(false); }} />
        </section>
        <section className="hidden min-h-0 overflow-hidden border-r border-border lg:flex lg:flex-col">
          <ItineraryPanel
            itinerary={itinerary}
            onChange={handleChange}
            onSave={handleSave}
            saving={saving}
            saved={saved}
            onFlag={handleFlag}
          />
        </section>
        <section className="hidden min-h-0 overflow-hidden lg:block">
          <MapPanel itinerary={itinerary} />
        </section>
      </div>
    </div>
  );
}
