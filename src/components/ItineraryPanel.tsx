import type { Itinerary } from "@/lib/itinerary";
import { t } from "@/lib/i18n";
import { useLocale } from "@/hooks/use-locale";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Flag, MapPin, Save, Sparkles } from "lucide-react";

type Props = {
  itinerary: Itinerary | null;
  onSave?: () => void;
  saving?: boolean;
  saved?: boolean;
  onFlag?: (placeName: string) => void;
};

export function ItineraryPanel({ itinerary, onSave, saving, saved, onFlag }: Props) {
  const [locale] = useLocale();
  const tr = t(locale);

  if (!itinerary || !itinerary.days?.length) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center">
        <Sparkles className="h-8 w-8 text-lacquer/40" />
        <h2 className="font-display text-2xl">{tr.itineraryEmpty.title}</h2>
        <p className="max-w-sm text-sm text-muted-foreground">{tr.itineraryEmpty.body}</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-3 border-b border-border px-6 py-4">
        <div className="min-w-0">
          <h2 className="font-display text-2xl leading-tight">{itinerary.title || itinerary.destination}</h2>
          <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" /> {itinerary.destination}
            {itinerary.party && <span>· {itinerary.party}</span>}
            {itinerary.budget_usd != null && <span>· ~${itinerary.budget_usd}</span>}
          </p>
        </div>
        {onSave && (
          <Button size="sm" variant={saved ? "secondary" : "default"} disabled={saving} onClick={onSave}>
            <Save className="mr-1.5 h-3.5 w-3.5" />
            {saved ? tr.saved : tr.saveTrip}
          </Button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {itinerary.summary && (
          <p className="mb-6 border-l-2 border-lacquer pl-3 font-display text-base italic text-foreground/80">
            {itinerary.summary}
          </p>
        )}
        <ol className="space-y-7">
          {itinerary.days.map((d) => (
            <li key={d.day} className="animate-reveal">
              <div className="mb-3 flex items-baseline gap-3">
                <span className="font-mono text-xs uppercase tracking-widest text-lacquer">
                  {tr.day} {d.day}
                </span>
                <h3 className="font-display text-xl">{d.title}</h3>
              </div>
              <ul className="space-y-3">
                {d.places.map((p, i) => (
                  <li key={i} className="rounded-lg border border-border bg-card p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h4 className="font-medium">
                          {p.name}
                          {p.name_vn && <span className="ml-2 text-sm text-muted-foreground">{p.name_vn}</span>}
                        </h4>
                        <p className="mt-1 text-sm text-foreground/80">{p.blurb}</p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        {p.community_flag && <Badge variant="secondary" className="text-xs">{tr.communityFav}</Badge>}
                        {onFlag && (
                          <button
                            onClick={() => onFlag(p.name)}
                            className="text-xs text-muted-foreground hover:text-destructive"
                            title={tr.flagInaccuracy}
                          >
                            <Flag className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                    {p.cultural_context && (
                      <p className="mt-2 text-xs italic text-muted-foreground">{p.cultural_context}</p>
                    )}
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                      {p.best_time && <span>{tr.bestTime}: {p.best_time}</span>}
                      {p.est_cost_usd != null && (
                        <span>{tr.estCost}: {p.est_cost_usd === 0 ? tr.free : `$${p.est_cost_usd}`}</span>
                      )}
                      {p.transport && <span>{p.transport}</span>}
                    </div>
                    {p.tip && (
                      <p className="mt-2 rounded-md bg-secondary px-3 py-2 text-xs">
                        <span className="font-mono uppercase tracking-wider text-lacquer">{tr.tip}: </span>
                        {p.tip}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
