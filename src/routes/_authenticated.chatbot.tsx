import { createFileRoute } from "@tanstack/react-router";
import Chatbot from "@/pages/Chatbot";

export const Route = createFileRoute("/_app/chatbot")({
  head: () => ({ meta: [{ title: "AI Assistant — LeakSense AI" }] }),
  component: Chatbot,
});