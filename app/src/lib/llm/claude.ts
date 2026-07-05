import { Anthropic } from "@anthropic-ai/sdk";
import { Persona, Pillar } from "@/types";
import {
  LLMProvider,
  GenerateTweetParams,
  GenerateTweetResult,
} from "./provider";
import { buildSystemPrompt, buildUserPrompt, buildReplyPrompt } from "./prompts";

export class ClaudeProvider implements LLMProvider {
  name = "claude-sonnet";
  private client: Anthropic;

  constructor() {
    const apiKey = process.env.CLAUDE_API_KEY || "";
    this.client = new Anthropic({ apiKey });
  }

  private cleanJson(text: string): string {
    let cleaned = text.trim();
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```[a-zA-Z]*\n/, "");
      cleaned = cleaned.replace(/\n```$/, "");
    }
    return cleaned.trim();
  }

  async generateTweet(params: GenerateTweetParams): Promise<GenerateTweetResult> {
    const { persona, pillar, temperature = 0.8 } = params;
    const systemPrompt = buildSystemPrompt(persona);
    const userPrompt = buildUserPrompt(params);

    try {
      const response = await this.client.messages.create({
        model: "claude-3-5-sonnet-20240620", // Standard Claude 3.5 Sonnet model name
        max_tokens: 1000,
        temperature,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      });

      // Get the text content from the blocks response
      const text = response.content
        .filter((block) => block.type === "text")
        .map((block: any) => block.text)
        .join("\n");

      const cleanedText = this.cleanJson(text);
      const parsed = JSON.parse(cleanedText);
      const variants = parsed.variants || [];

      return {
        body: variants[0] || "",
        variants,
        metadata: {
          personaTraitsUsed: persona.personality.coreTraits,
          factsUsed: params.capxFacts,
          seedTweetsUsed: persona.seedTweets?.[pillar] || [],
          nicheContext: params.nicheContext,
          promptVersion: "1.0",
          model: "claude-3-5-sonnet",
        },
      };
    } catch (error) {
      console.error("Claude tweet generation error:", error);
      throw error;
    }
  }

  async generateReply(
    persona: Persona,
    tweetToReplyTo: string,
    threadContext?: string[]
  ): Promise<{ variants: string[] }> {
    const systemPrompt = buildSystemPrompt(persona);
    const userPrompt = buildReplyPrompt(persona, tweetToReplyTo, threadContext);

    try {
      const response = await this.client.messages.create({
        model: "claude-3-5-sonnet-20240620",
        max_tokens: 500,
        temperature: 0.7,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      });

      const text = response.content
        .filter((block) => block.type === "text")
        .map((block: any) => block.text)
        .join("\n");

      const cleanedText = this.cleanJson(text);
      const parsed = JSON.parse(cleanedText);
      return {
        variants: parsed.variants || [],
      };
    } catch (error) {
      console.error("Claude reply generation error:", error);
      throw error;
    }
  }
}
