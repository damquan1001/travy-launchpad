import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Nav } from "@/components/Nav";
import { ItineraryPanel } from "@/components/ItineraryPanel";
import { useAuth } from "@/hooks/use-auth";
import { getTrip } from "@/lib/trips.functions";
import type { Itinerary } from "@/lib/itinerary";

export const Route = createFileRoute("/trips/$id")({
  head: () => ({ meta: [{ title: "Trip — TraVy" }] }),
  component: TripDetail,
});

function TripDetail() {
  const { id } = Route.useParams();
  const router = useRouter();
  const { user, loading } = useAuth();
  const get = useServerFn(getTrip);
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);

  useEffect(() => {
    if (!loading && !user) { router.navigate({ to: "/auth" }); return; }
    if (user) get({ data: { id } }).then((r) => setItinerary(r.trip.itinerary as Itinerary)).catch(console.error);
  }, [id, user, loading, router, get]);

  return (
    <div className="flex h-screen flex-col bg-paper">
      <Nav />
      <div className="flex-1 overflow-hidden">
        <ItineraryPanel itinerary={itinerary} />
      </div>
    </div>
  );
}
