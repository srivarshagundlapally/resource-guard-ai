import { createFileRoute } from "@tanstack/react-router";
import ReportsPage from "@/pages/Reports";

export const Route = createFileRoute("/_app/reports")({
  head: () => ({ meta: [{ title: "Reports — LeakSense AI" }] }),
  component: ReportsPage,
});