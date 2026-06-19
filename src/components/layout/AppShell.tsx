import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-surface text-slate-100">
      <Sidebar />
      <div className="md:pl-60">
        <Header />
        <main className="min-h-[calc(100vh-3.5rem)] bg-surface p-6">
          {children}
        </main>
      </div>
    </div>
  );
}