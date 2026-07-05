import { Persona } from "@/types";

export interface DriftReport {
  score: number; // 0 to 100
  driftDetected: boolean;
  reasons: string[];
}

/**
 * Perform a deterministic heuristic style check to detect voice drift in generated content.
 */
export function analyzeVoiceDrift(persona: Persona, text: string): DriftReport {
  const reasons: string[] = [];
  let score = 100;

  if (!text) {
    return { score: 0, driftDetected: true, reasons: ["Content is empty"] };
  }

  const textLower = text.toLowerCase();

  // 1. Guardrail / Never Touch topics check
  const neverTouch = persona.guardrails?.neverTouch || [];
  neverTouch.forEach((topic) => {
    if (topic && textLower.includes(topic.toLowerCase())) {
      score -= 30;
      reasons.push(`Contains restricted guardrail topic: "${topic}"`);
    }
  });

  // 2. Voice / Never Say words check
  const neverSay = persona.voice?.neverSay || [];
  neverSay.forEach((word) => {
    if (word && textLower.includes(word.toLowerCase())) {
      score -= 25;
      reasons.push(`Contains forbidden word: "${word}"`);
    }
  });

  // 3. Capitalization habit check
  const capHabit = (persona.voice?.capitalization || "").toLowerCase();
  const hasUppercase = /[A-Z]/.test(text);

  if (capHabit.includes("lowercase") && hasUppercase) {
    // If lowercase habits are expected, uppercase letters trigger a penalty
    score -= 15;
    reasons.push("Expected lowercase capitalization, but uppercase letters were detected");
  } else if (capHabit.includes("all caps") && text !== text.toUpperCase()) {
    score -= 15;
    reasons.push("Expected ALL CAPS capitalization habit");
  }

  // 4. Emoji Quirks check
  const emojiUsage = (persona.voice?.emojiUsage || "").toLowerCase();
  const hasEmoji = /[\uD800-\uDFFF\u2600-\u27BF]/.test(text);

  if (emojiUsage.includes("never") && hasEmoji) {
    score -= 10;
    reasons.push("Emojis found, but voice DNA specifies 'never use emojis'");
  } else if (emojiUsage.includes("heavy") && !hasEmoji) {
    score -= 10;
    reasons.push("No emojis found, but voice DNA specifies heavy emoji usage");
  }

  // 5. Length tendency check
  const tweetLength = (persona.voice?.tweetLengthTendency || "").toLowerCase();
  const len = text.length;

  if (tweetLength.includes("short") && len > 140) {
    score -= 10;
    reasons.push(`Tweet is long (${len} chars), but voice DNA specifies short/punchy`);
  } else if (tweetLength.includes("long") && len < 80) {
    score -= 10;
    reasons.push(`Tweet is short (${len} chars), but voice DNA specifies detailed/long threads`);
  }

  // Bound score
  score = Math.max(0, Math.min(100, score));

  return {
    score,
    driftDetected: score < 85,
    reasons,
  };
}
