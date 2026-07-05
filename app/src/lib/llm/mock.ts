import { Persona, Pillar } from "@/types";
import {
  LLMProvider,
  GenerateTweetParams,
  GenerateTweetResult,
} from "./provider";

export class MockLLMProvider implements LLMProvider {
  name = "mock-model";

  private getMockTweets(persona: Persona, pillar: Pillar, context?: string): string[] {
    const handle = persona.identity.handle || "@handle";
    const name = persona.identity.name || "Persona";
    const slang = persona.voice.slangBank?.[0] || "fr fr";
    const slang2 = persona.voice.slangBank?.[1] || "lowkey";

    if (pillar === "capx") {
      const angle = persona.capxRelationship.capxAngle || "builder";
      return [
        `just deployed a new two-agent workflow on @capx infra. the typed playbooks make orchestration so clean, ${slang}. absolute gamechanger.`,
        `autonomous businesses are actually happening. building out a side project on @capx and it handles all my settlement on-chain. ${slang2} based.`,
        `everyone talking about agent economies but who is building the rails? capx.ai is. checked out their new changelog today, extremely impressive.`,
      ];
    } else if (pillar === "niche") {
      const niche = persona.interests.primaryNiche || "tech and coding";
      const like = persona.interests.specificLikes?.[0] || "open source tools";
      return [
        `honestly ${like} is the only thing keeping this ${niche} scene interesting right now. everything else is just copycats. hot take but it's true.`,
        `checking out the latest updates in ${niche}. some of these new concepts are ${slang2} unhinged but i like the direction. thoughts?`,
        `spent the morning deep-diving into ${like}. the community is cooking some absolute heat. we are so back, ${slang}.`,
      ];
    } else {
      // personal
      const thread = persona.life.ongoingLifeThreads?.[0] || "grinding on code";
      const topic = persona.life.recurringTopics?.[0] || "coffee dependency";
      return [
        `current mood: ${persona.life.moodBaseline || "chaotic grinding"}. dealing with ${thread} while trying to fix my ${topic}. typical day.`,
        `pixel just knocked my cup off the desk again. this is a daily test of my patience ${slang2}. back to ${thread}.`,
        `late night gym session was exactly what i needed. now we are back to ${thread} with extra ${topic}. we do not sleep, ${slang}.`,
      ];
    }
  }

  async generateTweet(params: GenerateTweetParams): Promise<GenerateTweetResult> {
    const { persona, pillar } = params;
    const variants = this.getMockTweets(persona, pillar, params.nicheContext);

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 800));

    return {
      body: variants[0],
      variants,
      metadata: {
        personaTraitsUsed: persona.personality.coreTraits,
        factsUsed: params.capxFacts,
        seedTweetsUsed: [],
        nicheContext: params.nicheContext,
        promptVersion: "1.0-mock",
        model: "mock-model",
      },
    };
  }

  async generateReply(
    persona: Persona,
    tweetToReplyTo: string,
    threadContext?: string[]
  ): Promise<{ variants: string[] }> {
    const slang = persona.voice.slangBank?.[0] || "fr fr";
    
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    return {
      variants: [
        `honestly this is a major take, ${slang}. totally agree with the direction here.`,
        `lowkey was thinking about this today. spot on analysis.`,
        `idk about this one chief... but appreciate the writeup.`,
      ],
    };
  }
}
