import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Nav } from "@/components/Nav";
import { ChatPanel } from "@/components/ChatPanel";
import { ItineraryPanel } from "@/components/ItineraryPanel";
import { useAuth } from "@/hooks/use-auth";
import { useLocale } from "@/hooks/use-locale";
import { saveTrip, flagInaccuracy } from "@/lib/trips.functions";
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
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = useServerFn(saveTrip);
  const flag = useServerFn(flagInaccuracy);

  const handleSave = async () => {
    if (!user) { router.navigate({ to: "/auth" }); return; }
    if (!itinerary) return;
    setSaving(true);
    try {
      const res = await save({
        data: {
          title: itinerary.title || itinerary.destination || "Vietnam trip",
          destination: itinerary.destination,
          summary: itinerary.summary,
          party: itinerary.party,
          start_date: itinerary.start_date ?? null,
          end_date: itinerary.end_date ?? null,
          budget_usd: itinerary.budget_usd ?? null,
          locale,
          itinerary,
          status: "saved",
        },
      });
      setSaved(true);
      toast.success("Trip saved");
      if (res?.trip?.id) router.navigate({ to: "/trips/$id", params: { id: res.trip.id } });
    } catch (e: any) {
      toast.error(e?.message ?? "Could not save");
    } finally {
      setSaving(false);
    }
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
      <div className="grid flex-1 overflow-hidden lg:grid-cols-2">
        <section className="flex flex-col border-r border-border">
          <ChatPanel onItinerary={(it) => { setItinerary(it); setSaved(false); }} />
        </section>
        <section className="hidden lg:flex lg:flex-col">
          <ItineraryPanel
            itinerary={itinerary}
            onSave={handleSave}
            saving={saving}
            saved={saved}
            onFlag={handleFlag}
          />
        </section>
      </div>
    </div>
  );
}
