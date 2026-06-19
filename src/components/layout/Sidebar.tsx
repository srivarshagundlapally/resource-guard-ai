import { Link, useRouterState } from "@tanstack/react-router";
import {
  AlertTriangle,
  Activity,
  Droplets,
  FileText,
  LayoutDashboard,
  MessageSquare,
  TrendingUp,
  Upload,
  Wifi,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/anomalies", label: "Anomalies", icon: AlertTriangle },
  { to: "/predictions", label: "Predictions", icon: TrendingUp },
  { to: "/chatbot", label: "AI Assistant", icon: MessageSquare },
  { to: "/reports", label: "Reports", icon: FileText },
  { to: "/upload", label: "Upload Data", icon: Upload },
] as const;

export function Sidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-60 flex-col border-r border-surface-border bg-card md:flex">
      <div className="px-5 pb-4 pt-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/30">
            <Activity className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="font-display text-base font-bold leading-none text-slate-100">
              LeakSense
            </div>
            <div className="mt-1 text-[10px] font-bold tracking-widest text-accent">
              AI MONITOR
            </div>
          </div>
        </div>
      </div>
      <div className="mx-4 mb-4 grid grid-cols-3 gap-1.5">
        {[
          { Icon: Droplets, label: "Water", color: "#1B6CA8" },
          { Icon: Zap, label: "Elec", color: "#F5A623" },
          { Icon: Wifi, label: "Net", color: "#00C9A7" },
        ].map(({ Icon, label, color }) => (
          <div
            key={label}
            className="flex flex-col items-center gap-1 rounded-lg border border-surface-border bg-surface/60 px-1 py-2"
          >
            <Icon className="h-3.5 w-3.5" style={{ color }} />
            <span className="text-[10px] font-medium text-slate-400">
              {label}
            </span>
          </div>
        ))}
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {NAV.map(({ to, label, icon: Icon }) => {
          const active = pathname === to || pathname.startsWith(to + "/");
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                "group relative flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors duration-150",
                active
                  ? "bg-primary/20 text-primary-light"
                  : "text-slate-400 hover:bg-surface-border/60 hover:text-slate-100",
              )}
            >
              {active && (
                <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-r bg-primary-light" />
              )}
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="m-3 rounded-lg border border-surface-border bg-surface/60 p-3">
        <div className="text-[11px] font-semibold text-slate-200">
          Team B5 · GCET
        </div>
        <div className="mt-0.5 text-[10px] leading-snug text-slate-500">
          III B.Tech II Sem AIML
          <br />
          AY 2026–27
        </div>
      </div>
    </aside>
  );
}