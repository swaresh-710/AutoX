import { LLMModel } from "@/types";
import { LLMProvider } from "./provider";
import { GeminiProvider } from "./gemini";
import { ClaudeProvider } from "./claude";
import { MockLLMProvider } from "./mock";

export * from "./provider";
export * from "./prompts";

export function getLLMProvider(model?: LLMModel): LLMProvider {
  const hasGemini = !!process.env.GEMINI_API_KEY;
  const hasClaude = !!process.env.CLAUDE_API_KEY;

  // Fallback to Mock provider if no API keys configured
  if (!hasGemini && !hasClaude) {
    return new MockLLMProvider();
  }

  // Determine model: parameter first, then env, then default
  const selectedModel =
    model ||
    (process.env.DEFAULT_LLM_MODEL as LLMModel) ||
    "gemini-flash";

  if (selectedModel === "claude-sonnet" && hasClaude) {
    return new ClaudeProvider();
  }

  if (hasGemini) {
    return new GeminiProvider();
  }

  // Final fallback if model requested isn't available
  return new MockLLMProvider();
}
