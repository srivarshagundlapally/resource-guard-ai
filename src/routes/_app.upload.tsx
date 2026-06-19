import { createFileRoute } from "@tanstack/react-router";
import { Upload } from "lucide-react";
import { PlaceholderPage } from "@/components/layout/PlaceholderPage";

export const Route = createFileRoute("/_app/upload")({
  head: () => ({ meta: [{ title: "Upload Data — LeakSense AI" }] }),
  component: () => (
    <PlaceholderPage
      icon={Upload}
      title="Upload Data"
      description="Import CSV / sensor data into LeakSense."
    />
  ),
});