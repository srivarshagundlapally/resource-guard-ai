import { useRouterState } from "@tanstack/react-router";
import { useIsFetching } from "@tanstack/react-query";
import { Bell, RefreshCw, Settings } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const TITLES: Record<string, string> = {
  "/dashboard": "Live Dashboard",
  "/anomalies": "Anomaly Detection",
  "/predictions": "Forecast & Predictions",
  "/chatbot": "AI Assistant",
  "/reports": "Reports",
  "/upload": "Upload Data",
};

export function Header() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const title = TITLES[pathname] ?? "LeakSense AI";
  const isFetching = useIsFetching();
  const date = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-surface-border bg-card px-6">
      <div>
        <h1 className="font-display text-base font-bold leading-tight text-slate-100">
          {title}
        </h1>
        <p className="text-[11px] text-slate-500">{date}</p>
      </div>
      <div className="flex items-center gap-2">
        {isFetching > 0 && (
          <span className="mr-1 inline-flex items-center gap-1.5 text-[11px] text-accent">
            <RefreshCw className="h-3 w-3 animate-spin" />
            Refreshing…
          </span>
        )}
        <IconBtn>
          <RefreshCw className={cn("h-4 w-4", isFetching > 0 && "animate-spin text-accent")} />
        </IconBtn>
        <IconBtn>
          <Bell className="h-4 w-4" />
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-danger" />
        </IconBtn>
        <IconBtn>
          <Settings className="h-4 w-4" />
        </IconBtn>
        <div className="ml-2 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-[11px] font-bold text-white">
          B5
        </div>
      </div>
    </header>
  );
}

function IconBtn({ children }: { children: ReactNode }) {
  return (
    <button
      type="button"
      className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-surface-border bg-surface/50 text-slate-300 transition-colors duration-150 hover:bg-surface-border hover:text-slate-100"
    >
      {children}
    </button>
  );
}