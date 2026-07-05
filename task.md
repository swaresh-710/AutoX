# AutoX — Task Tracker

## Phase 1: Foundation & Persona System (Week 1-2)

### Week 1: Project Setup
- [x] Initialize Next.js 14+ project (App Router, TypeScript, Tailwind)
- [x] Create `.env` structure for all API keys
- [x] Build app shell: dark-mode dashboard layout, sidebar nav, responsive design
- [x] Build Dashboard home page (stats, account overview, quick actions, activity feed)
- [x] Build Persona Studio page (grid/list view, persona cards)
- [x] Build Content Studio page (placeholder for Phase 2)
- [x] Build Calendar page (weekly preview layout)
- [x] Build Reply Studio page (placeholder for Phase 4)
- [x] Build Analytics page (placeholder for Phase 5)
- [x] Build Accounts page (7-account list with API key status)
- [x] Build Settings page (model selector, content defaults, publishing method)
- [x] Create TypeScript types for full domain model
- [x] Create `persona-<name>.md` template
- [x] Create `capx.md` knowledge base placeholder
- [x] Build multi-model abstraction layer (Gemini Flash + Claude Sonnet)

### Week 2: Persona Studio & Account Management
- [x] Build Persona detail/edit view (render full persona markdown, inline editing)
- [x] Build persona file parser & loader (read persona-*.md files)
- [x] Build Account config forms (API key validation, per-account settings)
- [x] Content mix ratio config per account (interactive sliders)
- [x] Wire up Settings page to actually save/load preferences

---

## Phase 2: Content Generation Engine (Week 3-5)
- [x] Weekly batch planner algorithm
- [x] Persona file parser & loader
- [x] Prompt templates per pillar (Capx / Niche / Personal)
- [x] Generation pipeline (multi-model)
- [x] Content Studio review UI
- [x] "Generate Week" action (single + batch)

---

## Phase 3: Scheduling & Publishing (Week 5-7)
- [x] Calendar view (weekly/monthly, color-coded, drag-to-reschedule)
- [x] Scheduling logic (timezone-aware)
- [x] X API v2 direct publishing
- [x] Typefully publishing (optional)
- [x] Publishing status dashboard
- [x] Notification system

---

## Phase 4: Reply-Guying Assistant (Week 7-9)
- [x] Reply Studio page
- [x] Reply generation pipeline
- [x] Rate limiting per persona
- [x] Reply history view

---

## Phase 5: Analytics & Insights (Week 9-12)
- [x] Metrics ingestion (X API)
- [x] Tracked links (UTM)
- [x] Analytics dashboard
- [x] Weekly digest

---

## Phase 6: Hardening & Automation (Week 12+)
- [x] Trust score tracking
- [x] Voice drift detection
- [x] Automation tier management
