import { createFileRoute } from "@tanstack/react-router";
import { FileText } from "lucide-react";
import { PlaceholderPage } from "@/components/layout/PlaceholderPage";

export const Route = createFileRoute("/_app/reports")({
  head: () => ({ meta: [{ title: "Reports — LeakSense AI" }] }),
  component: () => (
    <PlaceholderPage
      icon={FileText}
      title="Reports"
      description="Generate and export consumption reports."
    />
  ),
});