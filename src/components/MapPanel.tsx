import { lazy, Suspense, useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import type { Itinerary } from "@/lib/itinerary";

const LeafletMap = lazy(() => import("./LeafletMap"));

type Props = {
  itinerary: Itinerary | null;
};

export function MapPanel({ itinerary }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const hasPins = !!itinerary?.days.some((d) => d.places.some((p) => p.lat != null && p.lng != null));

  if (!itinerary || !hasPins) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center text-muted-foreground">
        <MapPin className="h-6 w-6 opacity-50" />
        <p className="text-sm">Map pins will appear here as places with coordinates are added.</p>
        <p className="text-xs opacity-70">© OpenStreetMap contributors</p>
      </div>
    );
  }

  if (!mounted) {
    return <div className="h-full w-full bg-secondary/30" />;
  }

  return (
    <Suspense fallback={<div className="h-full w-full bg-secondary/30" />}>
      <LeafletMap itinerary={itinerary} />
    </Suspense>
  );
}
