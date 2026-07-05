import { Persona, Pillar } from "@/types";

export interface GenerateTweetParams {
  persona: Persona;
  pillar: Pillar;
  nicheContext?: string;
  capxFacts: string[];
  recentTweets?: string[];
  temperature?: number;
}

export interface GenerateTweetResult {
  body: string;
  variants: string[];
  metadata: {
    personaTraitsUsed: string[];
    factsUsed: string[];
    seedTweetsUsed: string[];
    nicheContext?: string;
    promptVersion: string;
    model: string;
  };
}

export interface LLMProvider {
  name: string;
  generateTweet(params: GenerateTweetParams): Promise<GenerateTweetResult>;
  generateReply(
    persona: Persona,
    tweetToReplyTo: string,
    threadContext?: string[]
  ): Promise<{ variants: string[] }>;
}
