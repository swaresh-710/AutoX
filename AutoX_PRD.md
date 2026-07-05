# PRD — AI Persona Network for Capx (7-Account Content, Scheduling & Reply Engine)

**Doc owner:** [You]
**Status:** Draft v1.0
**Last updated:** July 2, 2026

---

## 1. Background & Problem Statement

Capx (capx.ai) is infrastructure for agent-run companies — deploy autonomous businesses via typed playbooks, multi-agent orchestration, governance, and on-chain settlement. It's a developer/founder-facing product living in the crypto + AI-agent space.

To build organic awareness for Capx, the plan is to run **7 distinct, highly human-feeling Twitter/X personas** who are *not* obviously brand accounts. Each has their own identity, backstory, interests, and voice. Some fraction of their content naturally talks about Capx (as something they use / are excited about / are building with), some talks about their own niche (music, sports, tech, crypto, etc. — genuinely, with opinions), and a small slice is personal-life color that makes them feel real.

Doing this manually — writing in 7 distinct voices, every week, plus replying to others in-character, plus scheduling and tracking performance — doesn't scale. We need **one dashboard** that:
1. Stores each persona's full "DNA" (and lets us edit it any time),
2. Generates a week of on-brand, in-voice tweets per account in one click, respecting a 50–60% Capx / 30% niche / 10% personal split,
3. Lets a human review/edit/approve,
4. Schedules & publishes to the real X accounts from one place,
5. Helps with "reply-guying" (in-character replies to other tweets),
6. Reports back performance per account and per persona so we can iterate.

---

## 2. Goals

| # | Goal | Why it matters |
|---|------|-----------------|
| G1 | 7 believable, distinct personas that don't read as bots or as the same writer | Credibility — if two accounts sound alike, the whole network gets flagged as inauthentic |
| G2 | One-click weekly content generation per account, respecting content-mix ratios | This is the core time-saver |
| G3 | Central human-in-the-loop review before anything goes live | Brand/legal safety, avoids off-persona or factually wrong Capx claims |
| G4 | One-touch scheduling/publishing across all 7 accounts | Removes the manual posting bottleneck |
| G5 | Reply-guying assistance (suggested/auto in-character replies) | Engagement compounds faster through replies than original posts |
| G6 | Persona editability without re-engineering | Personas will drift/evolve; the system must support that as a first-class action, not a code change |
| G7 | Performance analytics per account & per content pillar | Tells us which personas/topics actually move the needle for Capx |

## 3. Non-Goals (v1)
- Fully autonomous posting with zero human review (we start human-approved; full autonomy is a later, explicit opt-in per account).
- Multi-platform (Instagram/LinkedIn/TikTok) — X/Twitter only for v1.
- Deepfake-style media/video generation — text (+ optional static image/meme) only for v1.
- Buying/managing followers or engagement — organic only.

---

## 4. Guiding Principles

- **"Highest level of human-ness" is the north star.** Every design decision (persona schema, prompt design, review UX) should be judged against: *would a sharp human notice this is AI-run?*
- **Persona is data, not code.** A persona is a structured record you can edit in a UI — traits, voice rules, interests, example tweets, do/don't lists — never hardcoded prompts buried in scripts.
- **Ratios are enforced at the batch level, not the tweet level.** When generating "a week" for an account, the system plans the mix (e.g., 4 Capx / 2 niche / 1 personal out of 7) before writing a single tweet, so the split is guaranteed, not probabilistic.
- **Human-in-the-loop by default, automation by earned trust.** Start with mandatory review; loosen to auto-post only for personas/content-types that prove reliably on-voice and on-fact.
- **One brain, seven voices.** Same underlying LLM pipeline for everyone; all differentiation comes from persona data + retrieval of that persona's own past tweets (so style stays consistent over time), not from different models.

---

## 5. Users & Roles

| Role | Who | Can do |
|------|-----|--------|
| Admin/Owner | You / project lead | Everything: create personas, connect accounts, set global ratios, view all analytics, manage team access |
| Content Manager | Whoever runs day-to-day content | Generate weekly batches, edit/approve tweets, schedule, respond to reply suggestions |
| Reviewer (optional) | Founder/legal/marketing lead | Approve/reject before publish, especially anything Capx-factual |
| Viewer | Stakeholders | Read-only dashboard + analytics |

---

## 6. Phased Plan

### Phase 0 — Foundations & Discovery (Week 0–1)
- Lock the **persona brief template** (Section 8) and get sign-off from stakeholders.
- Decide account-level constraints: are these brand-new accounts or existing ones with history? (Changes voice-matching and warm-up strategy — see Section 12, Risk: platform trust/rate limits.)
- Confirm the **Capx narrative pillars** content managers are allowed to talk about (product features, philosophy/agent-economy takes, releases, partner logos, founder-style build-in-public content, etc.) so every persona pulls from the same accurate well of Capx facts.
- Legal/compliance pass: disclosure requirements for AI-assisted or brand-affiliated accounts (see Section 13).

**Deliverable:** Signed-off persona template + Capx content pillar doc + go/no-go on account authenticity approach.

### Phase 1 — Persona DNA Development (Week 1–3)
- Write all **7 full persona DNA docs** using the schema in Section 8. This is manual/creative work, ideally workshopped with whoever has the clearest sense of "who talks about crypto/tech/agents on X in a specific, opinionated way."
- For each: pick their Capx-adjacent interest lane (e.g., one is deep into AI-agent economy discourse, one is a crypto-trading/DeFi voice, one is an indie hacker/SaaS builder, one is a sports-and-tech crossover poster, one is more lifestyle/Gen-Z shitposter who happens to be building with agents, etc.) — **each persona needs a plausible, specific reason they'd organically talk about Capx.**
- Write 15–25 **example tweets per persona** by hand (or heavily hand-edited) — these become few-shot anchors for the generation engine and the single biggest lever for voice fidelity.
- Load personas into the dashboard's persona editor (built in Phase 2, so this can run slightly parallel — see below).

**Deliverable:** 7 complete, approved persona records; 100+ hand-written seed tweets total.

### Phase 2 — Dashboard Core: Accounts + Persona Management (Week 2–5, overlaps Phase 1)
- Build account connection flow (X OAuth2, store tokens securely).
- Build Persona CRUD UI: create/edit/version personas, all fields from Section 8, with an "edit history" so changes are tracked (helps debug voice drift).
- Build the **content pillar / ratio config** per account (default 55/30/15, adjustable per persona, e.g. one persona might justifiably run 40/50/10 if their "niche" IS crypto/agents and overlaps Capx).

**Deliverable:** Working dashboard where you can connect all 7 accounts and see/edit all 7 personas.

### Phase 3 — Content Generation Engine (Week 4–7)
- Build the **weekly batch planner**: given a persona + ratio config + calendar week, output a content plan (which day gets which pillar, e.g. Mon: Capx, Tue: niche, Wed: personal, Thu: Capx, Fri: niche, Sat: Capx, Sun: niche) before generating text.
- Build the **generation pipeline** per tweet: persona system prompt + relevant few-shot examples + (for Capx tweets) grounded facts pulled from capx.ai/docs/recent Capx news + (for niche tweets) a "what's happening in [genre] this week" context step + style constraints (case, punctuation, emoji, slang, length) → draft tweet(s), typically 2–3 variants per slot.
- Build **grounding for Capx-factual tweets** specifically: a small internal knowledge base (scraped/curated from capx.ai, docs, changelog, X announcements) so the AI never invents fake Capx features — this is the highest brand-risk content type and needs the tightest guardrails.
- Build the **review/edit UI**: swipeable or list view of the week's draft tweets per account, inline edit, regenerate-this-one, approve/reject, "why did it write this" (show which persona traits + pillar it used).
- "One click, one week, one account" generation; "one click, all 7 accounts" batch generation on top of that.

**Deliverable:** Click "Generate Week" → get 7 drafts per account, correctly split 55/30/15, editable, in-voice.

### Phase 4 — Scheduling & Publishing (Week 6–8, overlaps Phase 3)
- Calendar view across all 7 accounts (color-coded by account and by pillar).
- Approve → auto-queues to scheduled time; supports drag-to-reschedule, bulk-approve, bulk-reschedule.
- Publish via X API on schedule; retry/error handling (rate limit, auth expiry, duplicate-content rejection) with dashboard alerts.
- "Post now" override for real-time/reactive content (e.g. reacting to a trending topic in a persona's niche).

**Deliverable:** From the same dashboard, a week of content for all 7 accounts can be reviewed once and it posts itself on schedule.

### Phase 5 — Reply-Guying Assistant (Week 7–10)
- Two tiers:
 1. **Suggest mode:** dashboard surfaces relevant tweets (from a monitored list — competitors, Capx mentions, niche-relevant accounts/hashtags, replies to our own posts) and drafts an in-character reply for a human to approve/edit/send.
 2. **Assisted search:** content manager pastes any tweet URL/text and picks which persona should reply; system drafts 2–3 options in that persona's voice.
- Guardrails: reply drafts always require a click-to-send in v1 (no fully autonomous replying at launch — see Section 9 automation ladder).
- Rate/velocity limits per persona to avoid looking bot-like (e.g., max N replies/hour, min gap between replies from the same persona).

**Deliverable:** A content manager can, from one screen, find good conversations for each persona to join and send a fitting reply in under a minute.

### Phase 6 — Analytics & Feedback Loop (Week 9–12, overlaps Phase 5)
- Pull per-tweet metrics from X API (impressions, likes, replies, reposts, bookmarks, profile clicks, link clicks where applicable) into the dashboard.
- Roll up by: account, pillar (Capx/niche/personal), day/week, and — critically — **click-throughs to capx.ai** (via tracked links) as the north-star business metric.
- Feedback loop: flag which specific persona traits/content types are over/under-performing, feed that back into persona edits (e.g., "this persona's Capx-takes get 3x the engagement of their niche takes — lean in").
- Weekly auto-generated performance digest (in-dashboard + optionally emailed).

**Deliverable:** A living dashboard view of "what's working," per account and in aggregate, tied back to Capx awareness/traffic.

### Phase 7 — Hardening, Automation Ladder & Scale (Week 11+, ongoing)
- Graduate specific personas/pillars from "always review" to "auto-post after N clean weeks" based on trust score (Section 9).
- Add persona-drift detection (compare new outputs to seed tweets/embedding similarity; flag if voice is wandering).
- Add more accounts/personas on the same infrastructure if the pilot works.
- Optional: image/meme generation per persona for higher-engagement posts.

---

## 7. Content Mix Enforcement (the 55/30/15 rule)

- Configurable per persona, default **55% Capx / 30% niche-interest / 15% personal** (you said 50–60/30/10 — we round to a clean 55/30/15 so 7 tweets/week divides evenly-ish: **4 Capx, 2 niche, 1 personal**).
- Enforced by the **weekly planner step**, not left to the model to "decide" per tweet — this guarantees the ratio regardless of what the LLM feels like writing that day.
- Each pillar has its own prompt recipe:
 - **Capx tweets:** grounded in the internal Capx knowledge base; angle varies (feature callout, opinion/take on agent-run companies, build-in-public style "just tried X", reaction to a Capx post/announcement, philosophical take on the space Capx operates in).
 - **Niche tweets:** grounded in "what's happening this week" in that persona's specific domain (an artist's new release, a match result, a market move, a tech launch) + persona's stated opinions/taste.
 - **Personal tweets:** lower-stakes, drawn from the persona's ongoing "life thread" (see Section 8 — Life & Continuity fields) so personal posts feel continuous over time rather than random.

---

## 8. Persona DNA — Schema (the template all 7 personas are built from)

Every persona is a structured record with the following fields. This is the single most important artifact in the whole project — get this right and generation quality follows.

**Identity**
- Name, handle, profile bio, age range, location/timezone, occupation/"what they do"
- One-paragraph backstory (how they got into their niche + how they got into Capx/agents/crypto)
- Photo/avatar direction (style guidance only — no real-person likeness)

**Personality & Traits**
- 5–7 core personality traits (e.g., sarcastic, optimistic-to-a-fault, contrarian, nurturing, competitive)
- Values/worldview in 2–3 sentences
- Sense of humor type (dry, absurdist, wholesome, roast-y, none)
- Confidence/certainty level (hedges a lot vs. states hot takes)

**Voice & Style Rules** (this is what makes it *sound* like them)
- Capitalization habits (always lowercase / Sentence case / RANDOM CAPS for emphasis)
- Punctuation quirks (heavy ellipses… / no punctuation at all / lots of — em dashes / excessive !!)
- Sentence length & rhythm (choppy fragments vs. run-ons)
- Emoji usage (none / 1 specific recurring emoji / heavy)
- Slang/vocabulary bank (specific words they overuse — "ngmi," "based," "lowkey," "ts," "fr fr," "literally," etc. — explicitly listed, not left to model guesswork)
- Things they'd NEVER say (tone/word blacklist)
- 15–25 example tweets (hand-written seed set from Phase 1 — used as few-shot + style anchor)

**Interests — must be maximally specific**
- Primary niche/genre (e.g., not "music" but "UK drill and hyperpop crossovers"; not "sports" but "Arsenal FC + F1, specifically Verstappen skepticism")
- 3–5 named specific likes within that niche (artists, teams, players, subgenres, tickers, projects)
- 2–3 named specific dislikes/hot takes (gives them edges/opinions, not just enthusiasm)
- Secondary interests (lighter, occasional)

**Capx Relationship** (critical — this is *why* they'd organically talk about it)
- What they actually use Capx for / why they care (e.g., "runs a 2-agent micro-studio," "watches the agent-economy space as a thesis," "building a side project on Capx")
- Their specific "angle" on Capx so 4 personas don't all say the same thing (builder angle / trader-thesis angle / philosophical-future-of-work angle / meme-and-hype angle / skeptic-who-got-won-over angle, etc.)
- Facts they're allowed to state about Capx (pulled from the shared knowledge base) vs. opinions they can freely riff on

**Life & Continuity** (for the "personal" 15%)
- Ongoing life threads (a pet, a move, a gym goal, a relationship, a side hustle) that can recur/evolve across weeks so personal tweets feel like a continuing story, not one-offs
- Mood/state baseline (generally upbeat / generally grinding / generally chaotic)

**Guardrails**
- Topics never to touch (politics, other companies by name, financial advice, NSFW, etc.)
- Legal/compliance notes if disclosure is required

**Meta**
- Version number + edit history (auto-tracked by the dashboard)
- Trust score / automation tier (see Section 9)
- Style-drift check reference embeddings (auto-generated from seed tweets)

> **Editability requirement:** every field above must be editable in the dashboard UI at any time, with old versions retained. Editing a persona should optionally offer "regenerate this week's remaining drafts with updated persona" so changes take effect immediately rather than waiting for next cycle.

---

## 9. Automation Ladder (trust-earning, not all-or-nothing)

| Tier | What's automatic | What still needs a human |
|------|-------------------|---------------------------|
| Tier 0 (launch default) | Draft generation, scheduling *proposal* | Every tweet and every reply needs explicit approve-to-publish |
| Tier 1 | Personal-pillar tweets auto-post after approval streak | Capx & niche tweets still reviewed (higher factual/brand risk) |
| Tier 2 | Niche-pillar tweets auto-post for proven personas | Capx tweets always reviewed |
| Tier 3 (aspirational, not v1 default) | Capx tweets auto-post if drawn strictly from pre-approved fact templates | Anything novel/off-template still reviewed |
| Replies | Always suggest-then-send in v1 | Auto-send only considered after months of clean data, if at all |

A persona/pillar "graduates" a tier after N consecutive weeks with zero edits-needed and no negative signal (brand complaint, factual error, off-voice flag).

---

## 10. System Architecture (high-level)

```
┌─────────────────────────────────────────────────────────────────┐
│                        DASHBOARD (Web App)                       │
│  Persona Studio │ Content Studio │ Calendar/Scheduler │ Analytics │
└───────────────┬───────────────────────────────────┬─────────────┘
                │                                    │
        ┌───────▼────────┐                  ┌────────▼─────────┐
        │  App Backend    │                  │  Analytics Ingest │
        │ (API + workers) │                  │   (metrics ETL)   │
        └───┬─────────┬───┘                  └─────────┬─────────┘
            │         │                                │
   ┌────────▼──┐  ┌───▼─────────────┐         ┌────────▼────────┐
   │ Persona &  │  │ Generation      │         │  X API (metrics  │
   │ Content DB │  │ Pipeline        │         │  read endpoints) │
   │ (Postgres) │  │ (LLM orchestr.) │         └──────────────────┘
   └────────────┘  └───┬─────────────┘
                       │
             ┌─────────▼──────────┐
             │ Capx Knowledge Base │  (curated facts, scraped/updated)
             │ (vector store)      │
             └──────────────────────┘
                       │
             ┌─────────▼──────────┐
             │ Scheduler / Queue   │  (job scheduling, retries)
             │  → X API (publish)  │
             └──────────────────────┘
```

---

## 11. Tech Stack (recommended)

| Layer | Choice | Why |
|-------|--------|-----|
| Frontend | **Next.js (React) + TypeScript**, Tailwind, shadcn/ui | Fast to build a clean multi-view dashboard (calendar, kanban-style review, persona editor forms) |
| Backend/API | **Node.js (NestJS or Express)** or **Python (FastAPI)** | Either is fine; FastAPI is a natural fit if the team leans Python for the LLM/orchestration side |
| Database | **PostgreSQL** (accounts, personas, content, schedule, metrics) | Relational fits this domain well (personas ↔ accounts ↔ tweets ↔ metrics) |
| Persona "memory"/style search | **Vector DB** (pgvector inside Postgres, or Pinecone/Weaviate) | Embeddings of each persona's own past tweets, used as retrieval context so voice stays consistent over time |
| Knowledge base (Capx facts) | Same vector store, separate namespace, refreshed from capx.ai/docs/changelog/X | Grounds Capx-pillar tweets in real facts, avoids hallucinated features |
| LLM / generation | **Claude (Anthropic API)** — one model, differentiated entirely via persona-specific system prompts + few-shot retrieval | Strong instruction-following for style constraints; consistent quality across all 7 voices |
| Job scheduling/queue | **Temporal** or **BullMQ (Redis-backed)** | Reliable scheduled publishing with retries or backoff on API errors |
| Social API | **X API v2** (OAuth2 user context for posting; metrics endpoints for analytics) | Official supported path for posting + reading engagement metrics |
| Auth | **OAuth2 (X)** for account connection; standard session/JWT auth for dashboard users | |
| Hosting | **Vercel** (frontend) + **AWS/GCP/Render** (backend, workers, Postgres) | Simple split, scales fine for this size of project |
| Monitoring/alerts | **Sentry** (errors) + simple Slack/Email webhook alerts (failed publish, rate-limit hit, low trust-score flag) | Keeps a human aware without staring at the dashboard |
| Media (if used later) | Image gen via Claude/other + simple templating for memes | Phase 7+, not v1 |

**Cost/quota note:** X API v2 has tiered, paid access for posting + read volume at this scale (7 accounts, scheduled posts + reply monitoring + metrics pulls) — this should be budgeted explicitly as a recurring line item, and access tier chosen based on required read volume (especially if "reply guying" involves polling many timelines/searches).

---

## 12. Data Model (core entities, simplified)

- **Account**: id, x_handle, oauth_tokens, connected_at, status
- **Persona**: id, account_id (1:1), all Section-8 fields (structured JSON + relational for the queryable bits), version, trust_tier
- **PersonaVersion**: history of persona edits
- **ContentPlan**: week_start, account_id, planned pillar-per-slot
- **Tweet (Draft/Scheduled/Published)**: id, persona_id, pillar, body, status, scheduled_at, published_at, x_tweet_id, generation_metadata (which facts/examples were used — for auditability)
- **ReplyDraft**: source_tweet_url, persona_id, drafted_text, status, sent_at
- **MetricSnapshot**: tweet_id, impressions, likes, replies, reposts, bookmarks, link_clicks, captured_at
- **KnowledgeBaseEntry**: source, content, embedding, last_verified_at (Capx facts)

---

## 13. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Accounts read as inauthentic/bot-like, get community-noted or shadow-limited | Heavy investment in Phase 1 persona depth; human review at launch; velocity limits on posting/replying; genuinely specific (not generic) interests |
| X API rate limits / cost at 7-account scale w/ replies + metrics polling | Budget for appropriate API tier upfront; batch metrics pulls; cache aggressively |
| Capx factual errors in generated content (brand/legal risk) | Dedicated, curated knowledge base; Capx-pillar content always grounded + always reviewed until Tier 3 trust earned |
| Persona voice drift over time (accounts start sounding same or off-brand) | Seed-tweet embedding similarity checks; scheduled "voice audit" reviews; edit history |
| Disclosure/compliance — are these accounts required to disclose brand affiliation or AI-assistance? | Legal review in Phase 0; region/platform policy check (X's synthetic media & platform manipulation policies specifically) before launch |
| Single point of failure if one team member manually approves everything | Build lightweight multi-reviewer support even in v1; don't block launch on one person |
| Reply-guying at scale reading as spammy | Suggest-then-send only in v1; strict per-persona rate limits; target genuinely relevant conversations only |

---

## 14. Success Metrics

**Efficiency (does the tool work as intended)**
- Time to generate + review a full week of content for all 7 accounts: target **under 30 minutes/week** (vs. many hours manually)
- % of AI-drafted tweets published with zero or minor edits: target **>70%** by week 8
- Zero missed scheduled posts due to system error

**Authenticity ("human-ness")**
- Manual blind-review score: can an internal reviewer tell which tweets are AI-drafted vs. hand-written, per persona? Target: **can't reliably tell** by Phase 3 exit
- No platform-level trust/authenticity flags (no community notes calling out bot behavior, no suspensions)

**Content mix compliance**
- Actual published ratio per account stays within a few points of the configured 55/30/15 split, verified automatically each week

**Growth & Engagement (business outcome)**
- Follower growth per account, week over week
- Engagement rate (likes+replies+reposts / impressions) per pillar — are Capx tweets underperforming personal/niche ones? (signals whether the "trojan horse" balance is right)
- **Click-throughs to capx.ai** from tracked links — the north-star metric tying this whole project back to business value
- Reply-guying: engagement rate on replies, and downstream profile visits/follows generated from reply threads

**Review north star:** run a monthly "which persona/pillar drove the most qualified traffic to capx.ai" report and reallocate content mix/effort toward what's working.

---

## 15. Open Questions (to resolve before/during Phase 0)

1. Are the 7 X accounts brand-new or existing accounts with history/followers already? (Changes whether we need a "voice-matching to existing history" step.)
2. Who has final sign-off authority on Capx-factual claims before they go live?
3. What's the acceptable automation ceiling long-term — is full autonomy (Tier 3+) even a goal, or is "always-reviewed" acceptable forever for this team?
4. Budget ceiling for X API tier + LLM usage — this affects how aggressive reply-guying/monitoring can be.
5. Any real named public figures, competitors, or copyrighted material personas should be barred from referencing? (Recommend: yes, hard rule — no real people, no competitor call-outs by name.)

---

## 16. Suggested Timeline Summary

| Phase | Duration | Can start |
|-------|----------|-----------|
| 0 – Foundations | 1 wk | Immediately |
| 1 – Persona DNA | 2–3 wks | Week 1 |
| 2 – Dashboard core | 3–4 wks | Week 2 (parallel to Phase 1) |
| 3 – Generation engine | 3–4 wks | Week 4 |
| 4 – Scheduling/publishing | 2–3 wks | Week 6 (parallel to Phase 3) |
| 5 – Reply-guying | 3 wks | Week 7 |
| 6 – Analytics | 3 wks | Week 9 (parallel to Phase 5) |
| 7 – Hardening/scale | Ongoing | Week 11+ |

**Total to a fully working, human-reviewed v1 (Phases 0–4):** roughly **6–8 weeks**. Reply-guying and analytics (Phases 5–6) layer on over the following 4–6 weeks, with hardening/automation as an ongoing track after that.

---

*End of PRD v1.0. Next step: fill out Section 8's schema for all 7 personas (Phase 1) — happy to draft first-pass persona sheets for each of the 7 if you share the intended interest lanes (music/sports/genres) you have in mind for each account.*
