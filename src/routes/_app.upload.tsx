import { createFileRoute } from "@tanstack/react-router";
import { Upload, Database, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { seedSyntheticData } from "@/lib/seedData";

function UploadPage() {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string>("");

  async function handleSeed() {
    setBusy(true);
    const toastId = toast.loading("Starting database seed…");
    try {
      const result = await seedSyntheticData((p) => {
        setProgress(`${p.done}/${p.total} — ${p.step}`);
        toast.loading(`${p.step} (${p.done}/${p.total})`, { id: toastId });
      });
      toast.success(
        `Seeded ${result.water + result.electricity + result.internet} readings + ${result.anomalies} anomalies`,
        { id: toastId },
      );
      // eslint-disable-next-line no-console
      console.log("[LeakSense seed] complete", result);
    } catch (e) {
      const err = e as Error;
      toast.error(`Seed failed: ${err.message}`, { id: toastId });
      // eslint-disable-next-line no-console
      console.error(err);
    } finally {
      setBusy(false);
      setProgress("");
    }
  }

  return (
    <div className="space-y-6">
      <SectionTitle icon={Upload}>Upload Data</SectionTitle>
      <p className="-mt-4 text-sm text-muted-foreground">
        Import CSV / sensor data into LeakSense, or seed the database with synthetic campus data.
      </p>
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="flex items-start gap-4">
          <div className="rounded-md bg-primary/10 p-3 text-primary">
            <Database className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-foreground">Seed synthetic campus data</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Generates 7 days of hourly water, electricity, and internet readings for 4 buildings × 4 floors × 5 rooms, plus 20 anomalies, root-cause analyses, recommendations, reports, and the model registry.
            </p>
            <div className="mt-4 flex items-center gap-3">
              <Button onClick={handleSeed} disabled={busy}>
                {busy ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Seeding…
                  </>
                ) : (
                  <>
                    <Database className="mr-2 h-4 w-4" /> Seed Database
                  </>
                )}
              </Button>
              {progress && <span className="text-xs text-muted-foreground">{progress}</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/_app/upload")({
  head: () => ({ meta: [{ title: "Upload Data — LeakSense AI" }] }),
  component: UploadPage,
});