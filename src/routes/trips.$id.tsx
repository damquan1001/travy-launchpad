import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Nav } from "@/components/Nav";
import { ItineraryPanel } from "@/components/ItineraryPanel";
import { useAuth } from "@/hooks/use-auth";
import { useLocale } from "@/hooks/use-locale";
import { getTrip, saveTrip } from "@/lib/trips.functions";
import type { Itinerary } from "@/lib/itinerary";

export const Route = createFileRoute("/trips/$id")({
  head: () => ({ meta: [{ title: "Trip — TraVy" }] }),
  component: TripDetail,
});

function TripDetail() {
  const { id } = Route.useParams();
  const router = useRouter();
  const { user, loading } = useAuth();
  const [locale] = useLocale();
  const get = useServerFn(getTrip);
  const save = useServerFn(saveTrip);
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!loading && !user) { router.navigate({ to: "/auth" }); return; }
    if (user) get({ data: { id } }).then((r) => setItinerary(r.trip.itinerary as Itinerary)).catch(console.error);
  }, [id, user, loading, router, get]);

  const persist = useCallback(async (it: Itinerary) => {
    setSaving(true);
    try {
      await save({
        data: {
          id,
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
      setSaved(true);
    } catch (e: any) {
      toast.error(e?.message ?? "Could not save");
    } finally {
      setSaving(false);
    }
  }, [id, locale, save]);

  const handleChange = useCallback((next: Itinerary) => {
    setItinerary(next);
    setSaved(false);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { void persist(next); }, 1200);
  }, [persist]);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  return (
    <div className="flex h-screen flex-col bg-paper">
      <Nav />
      <div className="flex-1 overflow-hidden">
        <ItineraryPanel
          itinerary={itinerary}
          onChange={handleChange}
          saving={saving}
          saved={saved}
        />
      </div>
    </div>
  );
}
