import { createFileRoute } from "@tanstack/react-router";
import Predictions from "@/pages/Predictions";

export const Route = createFileRoute("/_authenticated/predictions")({
  head: () => ({ meta: [{ title: "Predictions — LeakSense AI" }] }),
  component: Predictions,
});