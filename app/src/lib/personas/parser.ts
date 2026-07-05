import { Persona } from "@/types";

/**
 * Parses value from line matching format `- **Label:** Value` or `- Label: Value`
 */
function extractValue(line: string, label: string): string | null {
  const cleanLine = line.trim();
  // Match `- **Label:** Value` or `- Label: Value`
  const regex = new RegExp(`^-\\s*(?:\\*\\*)?${label}(?:\\*\\*)?:?\\s*(.*)$`, "i");
  const match = cleanLine.match(regex);
  if (match) {
    let val = match[1].trim();
    // Strip leading colons or markdown bold syntax if they are part of the value
    if (val.startsWith(":")) val = val.substring(1).trim();
    return val;
  }
  return null;
}

/**
 * Extracts sublist items from lines starting at index
 */
function extractListItems(lines: string[], startIndex: number): { items: string[]; nextIndex: number } {
  const items: string[] = [];
  let i = startIndex;
  while (i < lines.length) {
    const line = lines[i].trim();
    // If it's a list item starting with dash, bullet, or number
    if (line.startsWith("-") || line.startsWith("*") || /^\d+\./.test(line)) {
      // Check if it's a sub-list item or a main list item
      // We look for typical list markers and extract the text
      const cleanVal = line.replace(/^[-*\d.]+\s*/, "").trim();
      if (cleanVal) {
        items.push(cleanVal);
      }
      i++;
    } else if (line === "" && items.length > 0) {
      // Allow empty lines within list, but stop if we encounter another header or non-list item
      i++;
    } else {
      break;
    }
  }
  return { items, nextIndex: i };
}

/**
 * Extracts a block of text (e.g. Backstory) which may span multiple lines
 */
function extractBlockText(lines: string[], startIndex: number): { text: string; nextIndex: number } {
  const textLines: string[] = [];
  let i = startIndex;
  while (i < lines.length) {
    const line = lines[i].trim();
    // Stop at headers or other list items
    if (line.startsWith("#") || line.startsWith("-")) {
      break;
    }
    if (line !== "") {
      textLines.push(line);
    }
    i++;
  }
  return { text: textLines.join(" "), nextIndex: i };
}

/**
 * Extracts examples from a markdown code block (fenced with ```) or list
 */
function extractCodeBlock(lines: string[], startIndex: number): { items: string[]; nextIndex: number } {
  const items: string[] = [];
  let i = startIndex;
  let inBlock = false;

  while (i < lines.length) {
    const line = lines[i].trim();
    if (line.startsWith("```")) {
      if (inBlock) {
        // End of code block
        inBlock = false;
        i++;
        break;
      } else {
        // Start of code block
        inBlock = true;
        i++;
      }
    } else {
      if (inBlock) {
        if (line) {
          // Remove wrapping quotes if present
          let cleanTweet = line.trim();
          if (cleanTweet.startsWith('"') && cleanTweet.endsWith('"')) {
            cleanTweet = cleanTweet.substring(1, cleanTweet.length - 1);
          }
          items.push(cleanTweet);
        }
      } else {
        // If not in block, check if there's a list item instead
        if (line.startsWith("-")) {
          const { items: listItems, nextIndex } = extractListItems(lines, i);
          return { items: listItems, nextIndex };
        }
        // If we hit another header, stop
        if (line.startsWith("#")) {
          break;
        }
      }
      i++;
    }
  }
  return { items, nextIndex: i };
}

export function parsePersonaMarkdown(markdown: string, id: string, fileName: string): Persona {
  const lines = markdown.split("\n");
  
  // Default skeleton structure
  const persona: Persona = {
    id,
    fileName,
    identity: {
      name: "",
      handle: "",
      profileBio: "",
      age: "",
      location: "",
      timezone: "",
      occupation: "",
      backstory: "",
      avatarDirection: "",
    },
    personality: {
      coreTraits: [],
      valuesWorldview: "",
      humorType: "",
      confidenceLevel: "",
    },
    voice: {
      capitalization: "",
      punctuationQuirks: "",
      sentenceRhythm: "",
      emojiUsage: "",
      slangBank: [],
      catchphrases: [],
      neverSay: [],
      tweetLengthTendency: "",
    },
    interests: {
      primaryNiche: "",
      specificLikes: [],
      specificDislikes: [],
      whyTheyreIntoThis: "",
      secondaryInterests: [],
    },
    capxRelationship: {
      whatTheyUseCapxFor: "",
      capxAngle: "",
      allowedCapxFacts: [],
      capxOpinions: [],
    },
    life: {
      ongoingLifeThreads: [],
      moodBaseline: "",
      recurringTopics: [],
    },
    guardrails: {
      neverTouch: [],
      complianceNotes: "",
      engagementRules: [],
    },
    seedTweets: {
      capx: [],
      niche: [],
      personal: [],
    },
    version: "1.0",
    createdAt: new Date().toISOString(),
    lastEdited: new Date().toISOString(),
    trustTier: 0,
  };

  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();

    if (line.startsWith("-")) {
      // Parse values
      const name = extractValue(line, "Name");
      if (name !== null) { persona.identity.name = name; i++; continue; }

      const handle = extractValue(line, "Handle");
      if (handle !== null) { persona.identity.handle = handle; i++; continue; }

      const bio = extractValue(line, "Profile Bio");
      if (bio !== null) { persona.identity.profileBio = bio; i++; continue; }

      const age = extractValue(line, "Age");
      if (age !== null) { persona.identity.age = age; i++; continue; }

      const location = extractValue(line, "Location");
      if (location !== null) { persona.identity.location = location; i++; continue; }

      const timezone = extractValue(line, "Timezone");
      if (timezone !== null) { persona.identity.timezone = timezone; i++; continue; }

      const occupation = extractValue(line, "Occupation");
      if (occupation !== null) { persona.identity.occupation = occupation; i++; continue; }

      const backstory = extractValue(line, "Backstory");
      if (backstory !== null) {
        if (backstory === "" || backstory.startsWith("[")) {
          // It's a block on subsequent lines
          const { text, nextIndex } = extractBlockText(lines, i + 1);
          persona.identity.backstory = text;
          i = nextIndex;
        } else {
          persona.identity.backstory = backstory;
          i++;
        }
        continue;
      }

      const avatar = extractValue(line, "Avatar Direction");
      if (avatar !== null) { persona.identity.avatarDirection = avatar; i++; continue; }

      // Personality
      const worldview = extractValue(line, "Values / Worldview");
      if (worldview !== null) { persona.personality.valuesWorldview = worldview; i++; continue; }

      const humor = extractValue(line, "Sense of Humor");
      if (humor !== null) { persona.personality.humorType = humor; i++; continue; }

      const confidence = extractValue(line, "Confidence Level");
      if (confidence !== null) { persona.personality.confidenceLevel = confidence; i++; continue; }

      // Voice
      const capitalization = extractValue(line, "Capitalization");
      if (capitalization !== null) { persona.voice.capitalization = capitalization; i++; continue; }

      const punctuation = extractValue(line, "Punctuation Quirks");
      if (punctuation !== null) { persona.voice.punctuationQuirks = punctuation; i++; continue; }

      const rhythm = extractValue(line, "Sentence Length & Rhythm");
      if (rhythm !== null) { persona.voice.sentenceRhythm = rhythm; i++; continue; }

      const emoji = extractValue(line, "Emoji Usage");
      if (emoji !== null) { persona.voice.emojiUsage = emoji; i++; continue; }

      const length = extractValue(line, "Tweet Length Tendency");
      if (length !== null) { persona.voice.tweetLengthTendency = length; i++; continue; }

      // Interests primary
      const genre = extractValue(line, "Genre/Domain");
      if (genre !== null) { persona.interests.primaryNiche = genre; i++; continue; }

      const whyNiche = extractValue(line, "Why they're into this");
      if (whyNiche !== null) { persona.interests.whyTheyreIntoThis = whyNiche; i++; continue; }

      // Capx relationship
      const useCapx = extractValue(line, "What they use Capx for");
      if (useCapx !== null) { persona.capxRelationship.whatTheyUseCapxFor = useCapx; i++; continue; }

      const angle = extractValue(line, "Their Capx angle");
      if (angle !== null) { persona.capxRelationship.capxAngle = angle; i++; continue; }

      // Life
      const mood = extractValue(line, "Mood Baseline");
      if (mood !== null) { persona.life.moodBaseline = mood; i++; continue; }

      // Guardrails
      const compliance = extractValue(line, "Legal/Compliance Notes");
      if (compliance !== null) { persona.guardrails.complianceNotes = compliance; i++; continue; }

      // Meta
      const ver = extractValue(line, "Version");
      if (ver !== null) { persona.version = ver; i++; continue; }

      const created = extractValue(line, "Created");
      if (created !== null) { persona.createdAt = created; i++; continue; }

      const edited = extractValue(line, "Last Edited");
      if (edited !== null) { persona.lastEdited = edited; i++; continue; }

      const tier = extractValue(line, "Trust Tier");
      if (tier !== null) {
        persona.trustTier = parseInt(tier) as any;
        if (isNaN(persona.trustTier)) persona.trustTier = 0;
        i++;
        continue;
      }

      // Check lists
      if (line.includes("Core Traits")) {
        const { items, nextIndex } = extractListItems(lines, i + 1);
        persona.personality.coreTraits = items;
        i = nextIndex;
        continue;
      }

      if (line.includes("Words/phrases they OVERUSE")) {
        const { items, nextIndex } = extractListItems(lines, i + 1);
        persona.voice.slangBank = items;
        i = nextIndex;
        continue;
      }

      if (line.includes("Catchphrases or recurring expressions")) {
        const { items, nextIndex } = extractListItems(lines, i + 1);
        persona.voice.catchphrases = items;
        i = nextIndex;
        continue;
      }

      if (line.includes("Things They'd NEVER Say")) {
        const { items, nextIndex } = extractListItems(lines, i + 1);
        persona.voice.neverSay = items;
        i = nextIndex;
        continue;
      }

      if (line.includes("Specific Likes")) {
        const { items, nextIndex } = extractListItems(lines, i + 1);
        persona.interests.specificLikes = items;
        i = nextIndex;
        continue;
      }

      if (line.includes("Specific Dislikes")) {
        const { items, nextIndex } = extractListItems(lines, i + 1);
        persona.interests.specificDislikes = items;
        i = nextIndex;
        continue;
      }

      if (line.includes("Secondary Interests")) {
        const { items, nextIndex } = extractListItems(lines, i + 1);
        persona.interests.secondaryInterests = items;
        i = nextIndex;
        continue;
      }

      if (line.includes("Allowed Capx facts")) {
        const { items, nextIndex } = extractListItems(lines, i + 1);
        persona.capxRelationship.allowedCapxFacts = items;
        i = nextIndex;
        continue;
      }

      if (line.includes("opinions they can freely riff on")) {
        const { items, nextIndex } = extractListItems(lines, i + 1);
        persona.capxRelationship.capxOpinions = items;
        i = nextIndex;
        continue;
      }

      if (line.includes("Ongoing Life Threads")) {
        const { items, nextIndex } = extractListItems(lines, i + 1);
        persona.life.ongoingLifeThreads = items;
        i = nextIndex;
        continue;
      }

      if (line.includes("Recurring Personal Topics")) {
        const { items, nextIndex } = extractListItems(lines, i + 1);
        persona.life.recurringTopics = items;
        i = nextIndex;
        continue;
      }

      if (line.includes("Topics NEVER to touch")) {
        const { items, nextIndex } = extractListItems(lines, i + 1);
        persona.guardrails.neverTouch = items;
        i = nextIndex;
        continue;
      }

      if (line.includes("Engagement Rules")) {
        const { items, nextIndex } = extractListItems(lines, i + 1);
        persona.guardrails.engagementRules = items;
        i = nextIndex;
        continue;
      }
    }

    // Parse Seed tweets from headers
    if (line.includes("### Capx Tweets")) {
      const { items, nextIndex } = extractCodeBlock(lines, i + 1);
      persona.seedTweets.capx = items;
      i = nextIndex;
      continue;
    }

    if (line.includes("### Niche Tweets")) {
      const { items, nextIndex } = extractCodeBlock(lines, i + 1);
      persona.seedTweets.niche = items;
      i = nextIndex;
      continue;
    }

    if (line.includes("### Personal Tweets")) {
      const { items, nextIndex } = extractCodeBlock(lines, i + 1);
      persona.seedTweets.personal = items;
      i = nextIndex;
      continue;
    }

    i++;
  }

  return persona;
}

export function serializePersonaMarkdown(persona: Persona): string {
  return `# Persona DNA — ${persona.identity.name}

---

## Identity

- **Name:** ${persona.identity.name}
- **Handle:** ${persona.identity.handle}
- **Profile Bio:** ${persona.identity.profileBio}
- **Age:** ${persona.identity.age}
- **Location:** ${persona.identity.location}
- **Timezone:** ${persona.identity.timezone}
- **Occupation:** ${persona.identity.occupation}
- **Backstory:**
  ${persona.identity.backstory}
- **Avatar Direction:** ${persona.identity.avatarDirection}

---

## Personality & Traits

- **Core Traits (5-7):**
${persona.personality.coreTraits.map((t) => `  - ${t}`).join("\n")}
- **Values / Worldview:** ${persona.personality.valuesWorldview}
- **Sense of Humor:** ${persona.personality.humorType}
- **Confidence Level:** ${persona.personality.confidenceLevel}

---

## Voice & Style Rules

- **Capitalization:** ${persona.voice.capitalization}
- **Punctuation Quirks:** ${persona.voice.punctuationQuirks}
- **Sentence Length & Rhythm:** ${persona.voice.sentenceRhythm}
- **Emoji Usage:** ${persona.voice.emojiUsage}
- **Slang & Vocabulary Bank:**
  - Words/phrases they OVERUSE:
${persona.voice.slangBank.map((s) => `    - ${s}`).join("\n")}
  - Catchphrases or recurring expressions:
${persona.voice.catchphrases.map((c) => `    - ${c}`).join("\n")}
- **Things They'd NEVER Say:**
${persona.voice.neverSay.map((n) => `  - ${n}`).join("\n")}
- **Tweet Length Tendency:** ${persona.voice.tweetLengthTendency}

---

## Example Tweets (Seed Set)

### Capx Tweets
\`\`\`
${persona.seedTweets.capx.map((t) => `"${t}"`).join("\n")}
\`\`\`

### Niche Tweets
\`\`\`
${persona.seedTweets.niche.map((t) => `"${t}"`).join("\n")}
\`\`\`

### Personal Tweets
\`\`\`
${persona.seedTweets.personal.map((t) => `"${t}"`).join("\n")}
\`\`\`

---

## Interests

### Primary Niche
- **Genre/Domain:** ${persona.interests.primaryNiche}
- **Specific Likes (3-5 named):**
${persona.interests.specificLikes.map((l) => `  - ${l}`).join("\n")}
- **Specific Dislikes / Hot Takes (2-3):**
${persona.interests.specificDislikes.map((d) => `  - ${d}`).join("\n")}
- **Why they're into this:** ${persona.interests.whyTheyreIntoThis}

### Secondary Interests (lighter, occasional)
${persona.interests.secondaryInterests.map((s) => `- ${s}`).join("\n")}

---

## Capx Relationship

- **What they use Capx for:** ${persona.capxRelationship.whatTheyUseCapxFor}
- **Their Capx angle:** ${persona.capxRelationship.capxAngle}
- **Allowed Capx facts:**
${persona.capxRelationship.allowedCapxFacts.map((f) => `  - ${f}`).join("\n")}
- **Capx opinions they can freely riff on:**
${persona.capxRelationship.capxOpinions.map((o) => `  - ${o}`).join("\n")}

---

## Life & Continuity (for the ~15% personal tweets)

- **Ongoing Life Threads:**
${persona.life.ongoingLifeThreads.map((l) => `  - ${l}`).join("\n")}
- **Mood Baseline:** ${persona.life.moodBaseline}
- **Recurring Personal Topics:**
${persona.life.recurringTopics.map((t) => `  - ${t}`).join("\n")}

---

## Guardrails

- **Topics NEVER to touch:**
${persona.guardrails.neverTouch.map((t) => `  - ${t}`).join("\n")}
- **Legal/Compliance Notes:** ${persona.guardrails.complianceNotes}
- **Engagement Rules:**
${persona.guardrails.engagementRules.map((r) => `  - ${r}`).join("\n")}

---

## Meta

- **Version:** ${persona.version}
- **Created:** ${persona.createdAt}
- **Last Edited:** ${persona.lastEdited}
- **Trust Tier:** ${persona.trustTier}
`;
}
