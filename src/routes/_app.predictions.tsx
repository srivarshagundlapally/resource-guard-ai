import { createFileRoute } from "@tanstack/react-router";
import { TrendingUp } from "lucide-react";
import { PlaceholderPage } from "@/components/layout/PlaceholderPage";

export const Route = createFileRoute("/_app/predictions")({
  head: () => ({ meta: [{ title: "Predictions — LeakSense AI" }] }),
  component: () => (
    <PlaceholderPage
      icon={TrendingUp}
      title="Forecast & Predictions"
      description="AI-driven usage forecasts for the week ahead."
    />
  ),
});