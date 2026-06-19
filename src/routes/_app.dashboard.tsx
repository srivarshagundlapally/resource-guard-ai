import { createFileRoute } from "@tanstack/react-router";
import { LayoutDashboard } from "lucide-react";
import { PlaceholderPage } from "@/components/layout/PlaceholderPage";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — LeakSense AI" }] }),
  component: () => (
    <PlaceholderPage
      icon={LayoutDashboard}
      title="Live Dashboard"
      description="Real-time resource monitoring across the campus."
    />
  ),
});