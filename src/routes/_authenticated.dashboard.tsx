import { createFileRoute } from "@tanstack/react-router";
import { Dashboard } from "@/pages/Dashboard";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — LeakSense AI" }] }),
  component: Dashboard,
});