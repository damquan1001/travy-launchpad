import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Nav } from "@/components/Nav";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { useLocale } from "@/hooks/use-locale";
import { t } from "@/lib/i18n";
import { listTrips, deleteTrip } from "@/lib/trips.functions";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/trips/")({
  head: () => ({ meta: [{ title: "My trips — TraVy" }] }),
  component: TripsPage,
});

function TripsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [locale] = useLocale();
  const tr = t(locale);
  const list = useServerFn(listTrips);
  const del = useServerFn(deleteTrip);
  const [trips, setTrips] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!loading && !user) { router.navigate({ to: "/auth" }); return; }
    if (user) list().then((r) => { setTrips(r.trips); setLoaded(true); }).catch(() => setLoaded(true));
  }, [user, loading, router, list]);

  const remove = async (id: string) => {
    await del({ data: { id } });
    setTrips((t) => t.filter((x) => x.id !== id));
    toast.success("Deleted");
  };

  return (
    <div className="min-h-screen bg-paper">
      <Nav />
      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex items-end justify-between">
          <h1 className="font-display text-4xl">{tr.myTrips}</h1>
          <Link to="/plan"><Button>{tr.startPlanning}</Button></Link>
        </div>
        {loaded && trips.length === 0 && (
          <p className="mt-12 text-center text-sm text-muted-foreground">{tr.noTripsYet}</p>
        )}
        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {trips.map((t) => (
            <li key={t.id}>
              <Card className="group p-5">
                <div className="flex items-start justify-between gap-3">
                  <Link to="/trips/$id" params={{ id: t.id }} className="min-w-0 flex-1">
                    <h2 className="font-display text-xl leading-tight">{t.title}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {t.destination ?? "—"}{t.party ? ` · ${t.party}` : ""}
                    </p>
                    {t.summary && <p className="mt-2 line-clamp-2 text-sm">{t.summary}</p>}
                  </Link>
                  <button
                    onClick={() => remove(t.id)}
                    className="opacity-0 transition-opacity group-hover:opacity-100"
                    aria-label="Delete"
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                  </button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
