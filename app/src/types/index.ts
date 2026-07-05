// ============================================
// AutoX — Core TypeScript Types
// ============================================

// ---- Pillar Types ----
export type Pillar = "capx" | "niche" | "personal";

export type ContentStatus =
  | "draft"
  | "approved"
  | "scheduled"
  | "published"
  | "failed"
  | "rejected";

export type AutomationTier = 0 | 1 | 2 | 3;

export type LLMModel = "gemini-flash" | "claude-sonnet";

export type PublishMethod = "x-api" | "typefully" | "manual";

// ---- Persona ----
export interface PersonaIdentity {
  name: string;
  handle: string;
  profileBio: string;
  age: number | string;
  location: string;
  timezone: string;
  occupation: string;
  backstory: string;
  avatarDirection: string;
}

export interface PersonaPersonality {
  coreTraits: string[];
  valuesWorldview: string;
  humorType: string;
  confidenceLevel: string;
}

export interface PersonaVoice {
  capitalization: string;
  punctuationQuirks: string;
  sentenceRhythm: string;
  emojiUsage: string;
  slangBank: string[];
  catchphrases: string[];
  neverSay: string[];
  tweetLengthTendency: string;
}

export interface PersonaInterests {
  primaryNiche: string;
  specificLikes: string[];
  specificDislikes: string[];
  whyTheyreIntoThis: string;
  secondaryInterests: string[];
}

export interface PersonaCapxRelationship {
  whatTheyUseCapxFor: string;
  capxAngle: string;
  allowedCapxFacts: string[];
  capxOpinions: string[];
}

export interface PersonaLife {
  ongoingLifeThreads: string[];
  moodBaseline: string;
  recurringTopics: string[];
}

export interface PersonaGuardrails {
  neverTouch: string[];
  complianceNotes: string;
  engagementRules: string[];
}

export interface PersonaSeedTweets {
  capx: string[];
  niche: string[];
  personal: string[];
}

export interface Persona {
  id: string;
  fileName: string;
  identity: PersonaIdentity;
  personality: PersonaPersonality;
  voice: PersonaVoice;
  interests: PersonaInterests;
  capxRelationship: PersonaCapxRelationship;
  life: PersonaLife;
  guardrails: PersonaGuardrails;
  seedTweets: PersonaSeedTweets;
  version: string;
  createdAt: string;
  lastEdited: string;
  trustTier: AutomationTier;
}

// ---- Account ----
export interface Account {
  id: string;
  name: string;
  handle: string;
  personaId: string | null;
  publishMethod: PublishMethod;
  contentMix: ContentMix;
  status: "connected" | "disconnected" | "error";
  apiKeyConfigured: boolean;
  typefullyConfigured: boolean;
  color: string;
  createdAt: string;
}

export interface ContentMix {
  capx: number; // percentage, e.g., 55
  niche: number; // e.g., 30
  personal: number; // e.g., 15
}

// ---- Content Generation ----
export interface WeeklyPlan {
  id: string;
  accountId: string;
  personaId: string;
  weekStart: string; // ISO date
  slots: ContentSlot[];
  status: "planned" | "generating" | "generated" | "reviewed" | "scheduled";
  createdAt: string;
}

export interface ContentSlot {
  id: string;
  dayOfWeek: number; // 0=Mon, 6=Sun
  date: string;
  pillar: Pillar;
  scheduledTime: string;
  variants: TweetVariant[];
  selectedVariantId: string | null;
  status: ContentStatus;
}

export interface TweetVariant {
  id: string;
  body: string;
  generatedBy: LLMModel;
  generationMetadata: GenerationMetadata;
  createdAt: string;
}

export interface GenerationMetadata {
  personaTraitsUsed: string[];
  factsUsed: string[];
  seedTweetsUsed: string[];
  nicheContext?: string;
  promptVersion: string;
}

// ---- Tweet (published) ----
export interface Tweet {
  id: string;
  accountId: string;
  personaId: string;
  pillar: Pillar;
  body: string;
  status: ContentStatus;
  scheduledAt: string | null;
  publishedAt: string | null;
  xTweetId: string | null;
  generationMetadata: GenerationMetadata;
  metrics: TweetMetrics | null;
}

export interface TweetMetrics {
  impressions: number;
  likes: number;
  replies: number;
  reposts: number;
  bookmarks: number;
  linkClicks: number;
  capturedAt: string;
}

// ---- Reply ----
export interface ReplyDraft {
  id: string;
  sourceTweetUrl: string;
  sourceTweetText: string;
  personaId: string;
  variants: string[];
  selectedVariant: string | null;
  status: "drafted" | "approved" | "sent" | "failed";
  sentAt: string | null;
  createdAt: string;
}

// ---- Analytics ----
export interface AccountAnalytics {
  accountId: string;
  period: string;
  totalImpressions: number;
  totalEngagement: number;
  engagementRate: number;
  followerGrowth: number;
  topTweet: Tweet | null;
  pillarBreakdown: {
    pillar: Pillar;
    avgEngagement: number;
    avgImpressions: number;
    tweetCount: number;
  }[];
  clickThroughs: number;
}

// ---- Settings ----
export interface AppSettings {
  defaultModel: LLMModel;
  defaultContentMix: ContentMix;
  postsPerWeek: number;
  defaultPostingTimes: string[]; // array of "HH:MM" strings
  geminiKeyConfigured: boolean;
  claudeKeyConfigured: boolean;
}
