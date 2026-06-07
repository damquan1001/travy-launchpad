import { createFileRoute, Link } from "@tanstack/react-router";
import { Nav } from "@/components/Nav";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/hooks/use-locale";
import { t } from "@/lib/i18n";
import { ArrowRight, Compass, Sparkles, BookOpen } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TraVy — Vietnam, curated by intelligence" },
      { name: "description", content: "Plan a culturally rich, day-by-day Vietnam itinerary through one conversation. Curated places, local context, real tips." },
      { property: "og:title", content: "TraVy — Vietnam, curated by intelligence" },
      { property: "og:description", content: "Plan a culturally rich Vietnam trip through one conversation." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  const [locale] = useLocale();
  const tr = t(locale);
  return (
    <div className="min-h-screen bg-paper text-ink">
      <Nav />
      <main>
        <section className="mx-auto max-w-5xl px-6 pb-16 pt-20 sm:pt-28">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-lacquer animate-reveal">
            Vietnam · 10 provinces · 150 curated places
          </p>
          <h1 className="mt-5 font-display text-5xl leading-[1.05] tracking-tight sm:text-7xl animate-reveal">
            {tr.tagline}
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-foreground/75 animate-reveal">
            {tr.heroLead}
          </p>
          <div className="mt-8 flex flex-wrap gap-3 animate-reveal">
            <Link to="/plan">
              <Button size="lg" className="gap-2">
                {tr.startPlanning} <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/auth">
              <Button size="lg" variant="outline">{tr.signIn}</Button>
            </Link>
          </div>
        </section>

        <section className="border-y border-border bg-secondary/40">
          <div className="mx-auto grid max-w-5xl gap-8 px-6 py-14 sm:grid-cols-3">
            <Feature icon={<Compass />} title="One conversation" body="Tell TraVy where, when, and how. Days build live as you chat." />
            <Feature icon={<BookOpen />} title="Cultural context" body="Legends, etiquette, and local timing — not a generic listicle." />
            <Feature icon={<Sparkles />} title="Curated, not crawled" body="A hand-picked Vietnam library across 10 provinces, in English and Vietnamese." />
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-6 py-16">
          <h2 className="font-display text-3xl">Provinces in the library</h2>
          <div className="mt-6 flex flex-wrap gap-2">
            {["Hanoi","Ho Chi Minh City","Da Nang","Hoi An","Quang Ninh (Ha Long)","Lao Cai (Sapa)","Thua Thien Hue","Ninh Binh","Kien Giang (Phu Quoc)","Ha Giang"].map((p) => (
              <span key={p} className="rounded-full border border-border bg-card px-3 py-1 text-sm">{p}</span>
            ))}
          </div>
        </section>
      </main>
      <footer className="border-t border-border px-6 py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} TraVy · Built with care for travelers in Vietnam
      </footer>
    </div>
  );
}

function Feature({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div>
      <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-md bg-lacquer/10 text-lacquer">{icon}</div>
      <h3 className="font-display text-xl">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
