import { createFileRoute } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { Anomalies } from "@/pages/Anomalies";

const searchSchema = z.object({
  resource: fallback(z.enum(["all", "water", "electricity", "internet"]), "all").default("all"),
  severity: fallback(z.enum(["all", "critical", "high", "medium", "low"]), "all").default("all"),
  status: fallback(z.enum(["all", "unresolved"]), "all").default("all"),
  building: fallback(z.enum(["all", "BLK-A", "BLK-B", "BLK-C", "BLK-D"]), "all").default("all"),
  page: fallback(z.number().int().min(1), 1).default(1),
});

export const Route = createFileRoute("/_authenticated/anomalies")({
  head: () => ({ meta: [{ title: "Anomalies — LeakSense AI" }] }),
  validateSearch: zodValidator(searchSchema),
  component: Anomalies,
});