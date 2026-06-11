import { lazy, Suspense, useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import type { Itinerary } from "@/lib/itinerary";
import type { GeoFocus } from "@/lib/geocode";

const LeafletMap = lazy(() => import("./LeafletMap"));

type Props = {
  itinerary: Itinerary | null;
  focus?: GeoFocus | null;
};

export function MapPanel({ itinerary, focus }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const hasPins = !!itinerary?.days.some((d) => d.places.some((p) => p.lat != null && p.lng != null));
  const hasAnything = hasPins || !!focus;

  if (!mounted) {
    return <div className="h-full w-full bg-secondary/30" />;
  }

  return (
    <div className="relative h-full w-full">
      <Suspense fallback={<div className="h-full w-full bg-secondary/30" />}>
        <LeafletMap itinerary={itinerary} focus={focus ?? null} />
      </Suspense>
      {!hasAnything && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 bg-paper/80 px-6 text-center text-muted-foreground backdrop-blur-sm">
          <MapPin className="h-6 w-6 opacity-50" />
          <p className="text-sm">Tell TraVy where you want to go — the map will follow.</p>
          <p className="text-xs opacity-70">© OpenStreetMap contributors</p>
        </div>
      )}
    </div>
  );
}
