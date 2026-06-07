import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Nav } from "@/components/Nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — TraVy" },
      { name: "description", content: "Sign in to TraVy to save your Vietnam trips." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) router.navigate({ to: "/plan" });
  }, [user, loading, router]);

  const handle = async (mode: "in" | "up") => {
    setBusy(true);
    try {
      const fn = mode === "in" ? supabase.auth.signInWithPassword : supabase.auth.signUp;
      const { error } = await fn({ email, password });
      if (error) throw error;
      toast.success(mode === "in" ? "Welcome back" : "Account created");
      router.navigate({ to: "/plan" });
    } catch (e: any) {
      toast.error(e?.message ?? "Authentication failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper">
      <Nav />
      <main className="mx-auto flex max-w-md flex-col px-6 py-16">
        <h1 className="font-display text-4xl">Welcome to TraVy</h1>
        <p className="mt-2 text-sm text-muted-foreground">Sign in to save trips and revisit conversations.</p>
        <Tabs defaultValue="in" className="mt-8">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="in">Sign in</TabsTrigger>
            <TabsTrigger value="up">Create account</TabsTrigger>
          </TabsList>
          {(["in", "up"] as const).map((mode) => (
            <TabsContent key={mode} value={mode} className="space-y-3 pt-4">
              <div className="space-y-1.5">
                <Label htmlFor={`email-${mode}`}>Email</Label>
                <Input id={`email-${mode}`} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`pw-${mode}`}>Password</Label>
                <Input id={`pw-${mode}`} type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <Button className="w-full" disabled={busy || !email || !password} onClick={() => handle(mode)}>
                {mode === "in" ? "Sign in" : "Create account"}
              </Button>
            </TabsContent>
          ))}
        </Tabs>
      </main>
    </div>
  );
}
