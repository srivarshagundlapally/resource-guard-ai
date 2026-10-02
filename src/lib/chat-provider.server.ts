import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

/** Picks an AI provider from env: Gemini key, then OpenAI key, then Lovable AI gateway. */
export function resolveChatModel() {
  const gemini = process.env["GEMINI_API_KEY"] || process.env["GOOGLE_GENERATIVE_AI_API_KEY"];
  if (gemini) {
    const p = createOpenAICompatible({
      name: "gemini",
      baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
      apiKey: gemini,
    });
    return { model: p(process.env["GEMINI_MODEL"] || "gemini-2.0-flash"), provider: "gemini" };
  }
  const openai = process.env["OPENAI_API_KEY"];
  if (openai) {
    const p = createOpenAICompatible({ name: "openai", baseURL: "https://api.openai.com/v1", apiKey: openai });
    return { model: p(process.env["OPENAI_MODEL"] || "gpt-4o-mini"), provider: "openai" };
  }
  const lovable = process.env["LOVABLE_API_KEY"] || process.env["AI_GATEWAY_API_KEY"];
  if (lovable) {
    const gw = createLovableAiGatewayProvider(lovable);
    return { model: gw("google/gemini-3-flash-preview"), provider: "lovable" };
  }
  return null;
}
