# AutoX

Dashboard for running up to 7 X/Twitter accounts: persona-driven content generation (Gemini / Claude), weekly planning, scheduled auto-publishing, and reply drafting.

## Setup

1. **Install & configure**

   ```bash
   npm install
   cp .env.example .env.local   # fill in your keys
   ```

   Key environment variables (see `.env.example` for the full list):

   | Variable | Purpose |
   |---|---|
   | `DATABASE_URL` | Postgres connection string (e.g. Supabase). Required in production — the filesystem fallback does not persist on Vercel. |
   | `GEMINI_API_KEY` / `CLAUDE_API_KEY` | LLM providers for content generation. Without either, a mock provider is used. |
   | `X_ACCOUNT_<1-7>_*` | Per-account X API credentials (OAuth 1.0a user context) for direct publishing. |
   | `TYPEFULLY_ACCOUNT_<1-7>_API_KEY` | Optional Typefully publishing per account. |
   | `CRON_SECRET` | Required in production. Protects `/api/publish/cron`; the scheduler must send `Authorization: Bearer <CRON_SECRET>`. |
   | `SCHEDULE_TIMEZONE` | IANA timezone that slot times (HH:MM) are interpreted in, e.g. `Asia/Kolkata`. Defaults to UTC. |
   | `BASIC_AUTH_USER` / `BASIC_AUTH_PASS` | When both are set, the entire dashboard is behind HTTP Basic Auth. Set these in production. |

2. **Apply the database schema** (once per database):

   ```bash
   npm run db:deploy
   ```

3. **Fill in personas.** `personas/persona-1.md` … `persona-7.md` are templates — content quality depends entirely on filling these in, plus the `personas/capx.md` knowledge base.

4. **Run**

   ```bash
   npm run dev
   ```

## Scheduled publishing

Posts with status `approved`/`scheduled` are published by `POST /api/publish/cron` once their slot time (interpreted in `SCHEDULE_TIMEZONE`) has passed.

- `vercel.json` registers a daily Vercel cron (Hobby-tier limit). Vercel sends the `CRON_SECRET` bearer header automatically when that env var is set.
- For minute-level scheduling, `.github/workflows/publish-cron.yml` pings the endpoint every 15 minutes. Configure the `CRON_URL` and `CRON_SECRET` repository secrets on GitHub. (Any external scheduler works — it just needs the bearer header.)

## Replies

Replies are posted as true threaded replies (`in_reply_to_tweet_id` is extracted from the source tweet URL). This requires the account's publish method to be `x-api`; Typefully does not support replying to arbitrary tweets.

## Known limitations

- Analytics numbers are currently mock/demo data — no real X metrics ingestion yet.
- Account API credentials are read from environment variables (`X_ACCOUNT_<n>_*`), not from the database; the Accounts page connection status is informational.
- X API free tier caps writes (~500 posts/month per app). 7 accounts posting daily plus replies will likely need the Basic tier or Typefully.
