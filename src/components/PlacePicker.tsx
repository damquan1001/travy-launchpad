import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Search, MapPin } from "lucide-react";
import { retrievePlaces } from "@/lib/places.functions";
import type { ItineraryPlace } from "@/lib/itinerary";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  province?: string | null;
  defaultQuery?: string;
  onPick: (place: ItineraryPlace) => void;
};

export function PlacePicker({ open, onOpenChange, province, defaultQuery = "", onPick }: Props) {
  const retrieve = useServerFn(retrievePlaces);
  const [q, setQ] = useState(defaultQuery);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);

  const run = async () => {
    if (!q.trim()) return;
    setLoading(true);
    try {
      const res = await retrieve({ data: { query: q, province: province ?? null, k: 10 } });
      setResults(res.places ?? []);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Find a place</SheetTitle>
          <SheetDescription>
            Search curated Vietnam places{province ? ` in ${province}` : ""}.
          </SheetDescription>
        </SheetHeader>
        <form
          className="mt-4 flex gap-2"
          onSubmit={(e) => { e.preventDefault(); void run(); }}
        >
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="e.g. quiet cafe, street food, hidden temple"
            autoFocus
          />
          <Button type="submit" size="icon" disabled={loading || !q.trim()}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </Button>
        </form>
        <ul className="mt-4 space-y-2">
          {results.map((p) => (
            <li key={p.id}>
              <button
                onClick={() => {
                  onPick({
                    id: p.id,
                    name: p.name_en,
                    name_vn: p.name_vn ?? undefined,
                    blurb: p.blurb_en,
                    cultural_context: p.cultural_context ?? undefined,
                    est_cost_usd: p.est_cost_usd ?? null,
                    best_time: p.best_time ?? null,
                    tip: p.tips ?? null,
                    community_flag: p.community_flag,
                    source_kind: p.community_flag ? "community" : "primary",
                  });
                  onOpenChange(false);
                }}
                className="w-full rounded-lg border border-border bg-card p-3 text-left hover:border-lacquer"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{p.name_en}
                      {p.name_vn && <span className="ml-1.5 text-xs text-muted-foreground">{p.name_vn}</span>}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />{p.city ?? p.province} · {p.type}
                    </p>
                  </div>
                </div>
                <p className="mt-1.5 line-clamp-2 text-sm text-foreground/80">{p.blurb}</p>
              </button>
            </li>
          ))}
          {!loading && q && results.length === 0 && (
            <li className="py-6 text-center text-sm text-muted-foreground">No results — try a different query.</li>
          )}
        </ul>
      </SheetContent>
    </Sheet>
  );
}
