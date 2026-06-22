import { useEffect, useState, type ReactNode } from "react";
import { useRouter, useRouterState } from "@tanstack/react-router";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

export function AppShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const router = useRouter();

  // Close drawer on navigation
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Global keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (pathname !== "/chatbot") {
          router.navigate({ to: "/chatbot" });
          setTimeout(() => {
            document
              .querySelector<HTMLTextAreaElement>("textarea[placeholder^='Ask about']")
              ?.focus();
          }, 250);
        } else {
          document
            .querySelector<HTMLTextAreaElement>("textarea[placeholder^='Ask about']")
            ?.focus();
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pathname, router]);

  return (
    <div className="min-h-screen bg-surface text-slate-100">
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="md:pl-60">
        <Header onMenuClick={() => setMobileOpen(true)} />
        <main
          key={pathname}
          className="page-enter min-h-[calc(100vh-3.5rem)] bg-surface p-4 sm:p-6"
        >
          {children}
        </main>
      </div>
    </div>
  );
}