import { createFileRoute } from "@tanstack/react-router";
import UploadPage from "@/pages/Upload";

export const Route = createFileRoute("/_app/upload")({
  head: () => ({ meta: [{ title: "Upload Data — LeakSense AI" }] }),
  component: UploadPage,
});