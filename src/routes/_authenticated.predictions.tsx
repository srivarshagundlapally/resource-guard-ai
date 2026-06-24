import { createFileRoute } from "@tanstack/react-router";
import Predictions from "@/pages/Predictions";

export const Route = createFileRoute("/_app/predictions")({
  head: () => ({ meta: [{ title: "Predictions — LeakSense AI" }] }),
  component: Predictions,
});