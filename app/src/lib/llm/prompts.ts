import { Persona, Pillar } from "@/types";

export function buildSystemPrompt(persona: Persona): string {
  const { identity, personality, voice, guardrails } = persona;

  return `You are simulating a highly authentic, real human Twitter/X persona. Your objective is to write tweets that sound EXACTLY like this person. Do not read as an AI, bot, or corporate marketer.

--- PERSONA IDENTITY ---
Name: ${identity.name}
Handle: ${identity.handle}
Bio: ${identity.profileBio}
Location/Timezone: ${identity.location} (${identity.timezone})
Occupation: ${identity.occupation}
Backstory: ${identity.backstory}
Mood Baseline: ${persona.life.moodBaseline}

--- PERSONALITY TRAITS ---
Traits: ${personality.coreTraits.join(", ")}
Values/Worldview: ${personality.valuesWorldview}
Sense of Humor: ${personality.humorType}
Confidence Level: ${personality.confidenceLevel}

--- VOICE & STYLE RULES (MANDATORY) ---
- Capitalization Habits: ${voice.capitalization}
- Punctuation Quirks: ${voice.punctuationQuirks}
- Sentence Rhythm: ${voice.sentenceRhythm}
- Emoji Usage: ${voice.emojiUsage}
- Typical Slang & Vocabulary: ${voice.slangBank.join(", ")}
- Catchphrases to use naturally: ${voice.catchphrases.join(", ")}
- NEVER say or use: ${voice.neverSay.join(", ")}
- Tweet Length: ${voice.tweetLengthTendency}

--- MANDATORY GUARDRAILS ---
- Topics to NEVER touch: ${guardrails.neverTouch.join(", ")}
- Rules: ${guardrails.engagementRules.join(", ")}
- ${guardrails.complianceNotes}
- Do NOT use typical AI transition phrases, overly formal vocabulary, or hashtags unless explicitly stated in the persona's traits.
- Never write "Here's why:", "Introducing...", "Revolutionary", or generic clickbait tags.`;
}

export function buildUserPrompt(params: {
  persona: Persona;
  pillar: Pillar;
  nicheContext?: string;
  capxFacts: string[];
  recentTweets?: string[];
}): string {
  const { persona, pillar, nicheContext, capxFacts, recentTweets } = params;

  let promptInstruction = "";
  let contextSection = "";

  if (pillar === "capx") {
    contextSection = `--- RELEVANT CAPX FACTS (Grounding Content) ---
${capxFacts.map((f, i) => `${i + 1}. ${f}`).join("\n")}

--- PERSONA'S USE CASE & ANGLE ON CAPX ---
Use case: ${persona.capxRelationship.whatTheyUseCapxFor}
Angle/Perspective: ${persona.capxRelationship.capxAngle}
Allowed Opinions to Riff On: ${persona.capxRelationship.capxOpinions.join(", ")}
`;

    promptInstruction = `Write a tweet talking about Capx. 
- It must organically connect to your persona's use case or angle. 
- You MUST base any factual claims ONLY on the provided Capx Facts. Do NOT hallucinate features.
- If you include any link to Capx or capx.ai, you MUST append UTM tracking variables exactly in this format: https://capx.ai?utm_source=twitter&utm_medium=social&utm_campaign=autox&utm_content=${persona.identity.handle.replace("@", "")}
- Riff on your permitted opinions. Make it feel like an organic update or thought, NOT an advertisement.`;
  } else if (pillar === "niche") {
    contextSection = `--- PERSONA'S NICHE INTERESTS ---
Niche: ${persona.interests.primaryNiche}
Likes: ${persona.interests.specificLikes.join(", ")}
Dislikes/Hot Takes: ${persona.interests.specificDislikes.join(", ")}
Secondary Interests: ${persona.interests.secondaryInterests.join(", ")}
Why they like this: ${persona.interests.whyTheyreIntoThis}

--- CURRENT WEEK NICHE CONTEXT/TRENDS ---
${nicheContext || "No current trending topics specified. Talk about one of your primary likes or share one of your hot takes/opinions related to your niche."}
`;

    promptInstruction = `Write a tweet about your primary niche.
- React or comment on the current trends if provided, or share one of your specific likes/dislikes/hot takes.
- Make it highly opinionated and authentic to your voice. Do not sound generic.`;
  } else {
    // personal
    contextSection = `--- PERSONA'S ONGOING LIFE & CONTINUITY ---
Ongoing Life Threads: ${persona.life.ongoingLifeThreads.join(", ")}
Recurring Topics: ${persona.life.recurringTopics.join(", ")}
`;

    promptInstruction = `Write a personal, casual tweet.
- Mention or riff on one of your ongoing life threads (e.g., your pet, training, hobbies, daily grind, etc.).
- Make it low-stakes, relatable, and characteristic of your day-to-day mood baseline.`;
  }

  // Add seed tweets (few-shot examples)
  let seedTweetsSection = "";
  const seeds = persona.seedTweets?.[pillar] || [];
  if (seeds.length > 0) {
    seedTweetsSection = `--- FEW-SHOT SEED EXAMPLES (Write in this exact style and formatting) ---
${seeds.map((s, i) => `Example ${i + 1}:
"${s}"`).join("\n\n")}`;
  }

  return `${contextSection}

${seedTweetsSection}

--- TASK ---
${promptInstruction}

Generate 3 distinct variants of the tweet representing this persona. 
Output the results in raw JSON format matching this schema:
{
  "variants": [
    "text of variant 1",
    "text of variant 2",
    "text of variant 3"
  ]
}
Return ONLY valid JSON. No additional conversational filler, markdown formatting, or prefix code blocks.`;
}

export function buildReplyPrompt(persona: Persona, tweetToReplyTo: string, threadContext?: string[]): string {
  const context = threadContext && threadContext.length > 0
    ? `--- THREAD CONTEXT (Older tweets in thread) ---
${threadContext.map((t, i) => `[Tweet ${i + 1}]: ${t}`).join("\n")}`
    : "";

  return `${context}

--- TWEET TO REPLY TO ---
"${tweetToReplyTo}"

--- TASK ---
Write an in-character reply to the tweet above.
- Ensure it respects all your voice rules, capitalization, emoji usage, and personality traits.
- It should feel natural, conversational, and direct.
- Keep it concise (typically under 140 characters).

Generate 3 distinct variants of the reply.
Output the results in raw JSON format matching this schema:
{
  "variants": [
    "variant 1",
    "variant 2",
    "variant 3"
  ]
}
Return ONLY valid JSON. No additional markdown formatting, conversational text, or block wraps.`;
}
