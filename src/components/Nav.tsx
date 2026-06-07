import { Link, useRouter } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { useLocale } from "@/hooks/use-locale";
import { t } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export function Nav() {
  const { user } = useAuth();
  const [locale, setLocale] = useLocale();
  const router = useRouter();
  const tr = t(locale);

  const signOut = async () => {
    await supabase.auth.signOut();
    router.navigate({ to: "/" });
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-paper/85 backdrop-blur supports-[backdrop-filter]:bg-paper/70">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        <Link to="/" className="flex items-baseline gap-2">
          <span className="font-display text-2xl tracking-tight">TraVy</span>
          <span className="hidden text-xs text-muted-foreground sm:inline">— {tr.tagline}</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link to="/plan" className="rounded-md px-3 py-1.5 hover:bg-secondary" activeProps={{ className: "bg-secondary" }}>
            {tr.plan}
          </Link>
          {user && (
            <Link to="/trips" className="rounded-md px-3 py-1.5 hover:bg-secondary" activeProps={{ className: "bg-secondary" }}>
              {tr.myTrips}
            </Link>
          )}
          <button
            onClick={() => setLocale(locale === "en" ? "vn" : "en")}
            className="ml-1 rounded-md border border-border px-2 py-1 font-mono text-xs uppercase tracking-wider hover:bg-secondary"
            aria-label="Toggle language"
          >
            {locale === "en" ? "EN · vn" : "VN · en"}
          </button>
          {user ? (
            <Button variant="ghost" size="sm" onClick={signOut}>{tr.signOut}</Button>
          ) : (
            <Link to="/auth">
              <Button size="sm">{tr.signIn}</Button>
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
