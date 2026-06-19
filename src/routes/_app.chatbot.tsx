import { createFileRoute } from "@tanstack/react-router";
import { MessageSquare } from "lucide-react";
import { PlaceholderPage } from "@/components/layout/PlaceholderPage";

export const Route = createFileRoute("/_app/chatbot")({
  head: () => ({ meta: [{ title: "AI Assistant — LeakSense AI" }] }),
  component: () => (
    <PlaceholderPage
      icon={MessageSquare}
      title="AI Assistant"
      description="Ask LeakSense about usage trends and anomalies."
    />
  ),
});