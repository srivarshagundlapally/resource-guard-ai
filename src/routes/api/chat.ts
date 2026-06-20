import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
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
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const gateway = createLovableAiGatewayProvider(key);
        const model = gateway("google/gemini-3-flash-preview");

        const result = streamText({
          model,
          system: SYSTEM_PROMPT + "\n\nCONTEXT DATA:\n" + (context ?? "(no context provided)"),
          messages: await convertToModelMessages(messages),
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