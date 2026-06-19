import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";
import { PlaceholderPage } from "@/components/layout/PlaceholderPage";

export const Route = createFileRoute("/_app/anomalies")({
  head: () => ({ meta: [{ title: "Anomalies — LeakSense AI" }] }),
  component: () => (
    <PlaceholderPage
      icon={AlertTriangle}
      title="Anomaly Detection"
      description="Detect leaks, surges, and outages in real time."
    />
  ),
});