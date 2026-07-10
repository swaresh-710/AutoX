import { GoogleGenerativeAI } from "@google/generative-ai";
import { Persona, Pillar } from "@/types";
import {
  LLMProvider,
  GenerateTweetParams,
  GenerateTweetResult,
} from "./provider";
import { buildSystemPrompt, buildUserPrompt, buildReplyPrompt } from "./prompts";

export class GeminiProvider implements LLMProvider {
  name = "gemini-flash";
  private client: GoogleGenerativeAI;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY || "";
    this.client = new GoogleGenerativeAI(apiKey);
  }

  private cleanJson(text: string): string {
    // LLMs sometimes return markdown code blocks like ```json ... ``` or ``` ... ```
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
      const model = this.client.getGenerativeModel({
        model: "gemini-2.5-flash", // gemini-1.5-flash is retired
        generationConfig: {
          temperature,
          responseMimeType: "application/json",
        },
        systemInstruction: systemPrompt,
      });

      const response = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      });

      const text = response.response.text();
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
          model: "gemini-2.5-flash",
        },
      };
    } catch (error) {
      console.error("Gemini tweet generation error:", error);
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
      const model = this.client.getGenerativeModel({
        model: "gemini-2.5-flash",
        generationConfig: {
          temperature: 0.7,
          responseMimeType: "application/json",
        },
        systemInstruction: systemPrompt,
      });

      const response = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      });

      const text = response.response.text();
      const cleanedText = this.cleanJson(text);
      const parsed = JSON.parse(cleanedText);
      return {
        variants: parsed.variants || [],
      };
    } catch (error) {
      console.error("Gemini reply generation error:", error);
      throw error;
    }
  }
}
