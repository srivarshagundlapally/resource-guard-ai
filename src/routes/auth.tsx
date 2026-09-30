import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { Loader2, Droplets } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/auth")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { redirect: redirectTo } = Route.useSearch();
  const safeRedirect =
    redirectTo && redirectTo.startsWith("/") && !redirectTo.startsWith("//")
      ? redirectTo
      : "/dashboard";
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    // Surface OAuth callback errors (?error=...&error_description=... or in the #hash)
    const q = new URLSearchParams(window.location.search);
    const h = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const err = q.get("error_description") || h.get("error_description") || q.get("error") || h.get("error");
    if (err) {
      const msg = decodeURIComponent(err.replace(/\+/g, " "));
      console.error("[auth] OAuth callback error:", msg);
      setAuthError(msg);
    }
    // PKCE code exchange when returning from a direct OAuth redirect
    const code = q.get("code");
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (error) {
          console.error("[auth] code exchange failed", error);
          setAuthError(error.message);
        } else navigate({ to: safeRedirect, replace: true });
      });
      return;
    }
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) navigate({ to: safeRedirect, replace: true });
    });
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: safeRedirect, replace: true });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate, safeRedirect]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setAuthError(null);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("Account created — signing you in…");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      navigate({ to: safeRedirect, replace: true });
    } catch (err: any) {
      console.error("[auth]", err);
      setAuthError(err?.message ?? "Authentication failed");
      toast.error(err?.message ?? "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const google = async () => {
    setLoading(true);
    setAuthError(null);
    const callback = `${window.location.origin}/auth${
      redirectTo ? `?redirect=${encodeURIComponent(redirectTo)}` : ""
    }`;
    try {
      const host = window.location.hostname;
      const lovableHosted = host.endsWith(".lovable.app") || host.endsWith(".lovableproject.com");
      if (lovableHosted) {
        const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: callback });
        if (result.error) throw result.error;
        if (result.redirected) return;
        navigate({ to: safeRedirect, replace: true });
      } else {
        // Self-hosted (e.g. Vercel): standard OAuth redirect back to this origin
        const { error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo: callback },
        });
        if (error) throw error;
      }
    } catch (err: any) {
      console.error("[auth] Google sign-in failed", err);
      const msg = err?.message ?? "Google sign-in failed";
      setAuthError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm p-6">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent">
            <Droplets className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="font-display text-xl font-semibold text-foreground">
            LeakSense AI
          </h1>
          <p className="text-xs text-muted-foreground">
            {mode === "signin" ? "Sign in to continue" : "Create your account"}
          </p>
        </div>

        {authError && (
          <div role="alert" className="mb-4 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-xs text-destructive">
            {authError}
          </div>
        )}
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={google}
          disabled={loading}
        >
          Continue with Google
        </Button>

        <div className="my-4 flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">
          <div className="h-px flex-1 bg-surface-border" />
          or
          <div className="h-px flex-1 bg-surface-border" />
        </div>

        <form onSubmit={submit} className="flex flex-col gap-3">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === "signin" ? "Sign in" : "Create account"}
          </Button>
        </form>

        <button
          type="button"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="mt-4 w-full text-center text-xs text-muted-foreground hover:text-foreground"
        >
          {mode === "signin"
            ? "Don't have an account? Sign up"
            : "Already have an account? Sign in"}
        </button>
      </Card>
    </div>
  );
}
