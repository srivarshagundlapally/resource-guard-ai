import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, createUIMessageStream, createUIMessageStreamResponse, streamText, type UIMessage } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

const SYSTEM_PROMPT = `You are LeakSense AI Assistant, an intelligent resource monitoring expert for Geethanjali College of Engineering & Technology campus (GCET).

Your expertise covers:
- Water, electricity, and internet consumption patterns across 4 campus buildings: BLK-A (Academic Wing), BLK-B (Hostel), BLK-C (Admin & Library), BLK-D (Labs)
- Anomaly detection results from Isolation Forest, Local Outlier Factor, and Z-Score ensemble methods
- Machine learning predictions from XGBoost (best model: RMSE=3.76, R²=0.951), Random Forest, and Gradient Boosting
- Root cause analysis with confidence scoring
- Actionable recommendations to reduce resource wastage
- Apache Spark ETL pipelines on Databricks processing ~700,800 records per resource

Response guidelines:
- Be specific: always mention building IDs, floor numbers, room numbers from the context
- Express confidence levels for anomaly causes
- Suggest concrete next steps (e.g., "Check pipeline in Room 204, Block-A")
- Use the CONTEXT DATA below to ground your answers in actual data
- If data is not in context, say so — never guess specific numbers
- Keep responses focused and actionable. Use bullet points for lists.
- When asked about ML models, explain that XGBoost was selected as best model based on lowest RMSE on the 20% time-series test set`;

type ChatBody = { messages?: UIMessage[]; context?: string };

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { messages, context } = (await request.json()) as ChatBody;
        if (!Array.isArray(messages)) {
          return new Response("Messages are required", { status: 400 });
        }
        const key = process.env.LOVABLE_API_KEY;
        if (!key) {
          // Graceful fallback: answer without the AI gateway so the UI never
          // shows a configuration error banner.
          const fallback =
            "I'm running in offline mode right now because the AI service isn't configured on this deployment. " +
            "Your question was received, but I can't generate a live answer. " +
            "Please try again shortly, or check the Dashboard, Anomalies, and Reports pages for the underlying data.";
          const stream = createUIMessageStream({
            execute: ({ writer }) => {
              writer.write({ type: "start" });
              writer.write({ type: "text-start", id: "offline-1" });
              writer.write({ type: "text-delta", id: "offline-1", delta: fallback });
              writer.write({ type: "text-end", id: "offline-1" });
              writer.write({ type: "finish" });
            },
          });
          return createUIMessageStreamResponse({ stream });
        }

        const gateway = createLovableAiGatewayProvider(key);
        const model = gateway("google/gemini-3-flash-preview");

        const modelMessages = await convertToModelMessages(messages);
        const result = streamText({
          model,
          system: SYSTEM_PROMPT + "\n\nCONTEXT DATA:\n" + (context ?? "(no context provided)"),
          messages: modelMessages,
          onError: ({ error }) => {
            console.error("[/api/chat] streamText error", error);
          },
        });

        return result.toUIMessageStreamResponse({
          originalMessages: messages,
          onError: (error) => {
            console.error("[/api/chat] stream error", error);
            const msg = error instanceof Error ? error.message : String(error);
            return msg || "Stream failed";
          },
        });
      },
    },
  },
});