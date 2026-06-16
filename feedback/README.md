# Feedback — AI Sports Coaching

Upload any training video. Get technical coaching in minutes.

> Record your training. AI tells you exactly why you'd get hit.

## Sports supported

- Boxing ✅
- Muay Thai ✅
- More sports (golf, tennis, MMA, etc.) are planned — not available in the live product yet.

Best results: bag work, pad rounds, and shadowboxing with your full body visible in frame.

## Tech stack

- Next.js 14 (App Router)
- TypeScript (strict)
- Tailwind CSS
- Supabase (PostgreSQL)
- Cloudinary (video storage)
- FFmpeg (server-side frame extraction)
- MediaPipe (pose detection)
- Gemini Pro Vision (AI analysis)
- Stripe (payments)
- Loops.so (email)

## Setup

1. `cp .env.example .env`
2. Fill in all environment variables
3. Run `lib/db/schema.sql` in your Supabase SQL editor
4. `npm install`
5. `npm run dev` — runs on http://localhost:3001

### If dev breaks (`Cannot find module './NNN.js'`)

This is a **stale `.next` cache**, not bad app code. It happens when:

- More than one `npm run dev` runs on port 3001 (common with IDE agents)
- `npm run build` runs while dev is still up (both write to `.next`)
- A hot reload fails mid-compile after large edits

**Fix:** `npm run dev:clean` (stops port 3001, wipes `.next`, restarts dev).

`npm run dev` now stops any existing server on 3001 before starting so duplicates are less likely.

## Project structure

```
/feedback
  /app          — Next.js routes & API
  /components   — UI components
  /config       — Sport configs & prompt templates
  /hooks        — React hooks
  /lib          — Analysis pipeline, AI, DB, payments
  /types        — TypeScript types
```

## Analysis pipeline

1. **Upload** — Video → Cloudinary, session created in Supabase
2. **Extract frames** — FFmpeg at 3fps
3. **Pose detection** — MediaPipe landmarks per frame
4. **Pattern finder** — Sport-agnostic weakness detection
5. **AI chain** — 4 Gemini prompts (pattern → root cause → progress → coaching voice)
6. **Clip generation** — 3s clips per timestamp → Cloudinary
7. **Save report** — Supabase + delete source video (privacy)

## Adding a new sport

1. Add sport config to `/config/sports.ts`
2. Add landmarks to track
3. Add mechanics standards
4. Add common weaknesses
5. Add coach voice style
6. Add elite references
7. That's it — everything else adapts automatically

## Monetisation

| Tier | Price | Features |
|------|-------|----------|
| Free | £0 | 1 analysis (lifetime), full report, no clips |
| Pro | £12.99/mo | 15 analyses/month, clips, history, progress |
| Top-up | £5.99 | +5 analyses (Pro only, when monthly cap hit) |

Prices in `config/pricing.ts` — match amounts in Stripe Product catalogue.

## Deployment

Deploy as a separate Vercel project pointing to `/feedback`:

```bash
cd feedback
vercel
```

Set all environment variables in Vercel dashboard.

FFmpeg is bundled via `ffmpeg-static` for serverless deploys — no custom layer required.

### Database migrations (existing projects)

If your Supabase project predates recent features, run in the SQL editor:

```sql
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS parent_session_id UUID REFERENCES sessions(id) ON DELETE SET NULL;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS landmark_summary JSONB;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS follow_up_comparison JSONB;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS export_video_url TEXT;
```

## Privacy

- Privacy policy: `/privacy` (also linked in app footer)
- Terms: `/terms`
- Video may be deleted from Cloudinary after analysis (`DELETE_SOURCE_VIDEO_AFTER_ANALYSIS`)
- Landmark data and highlight clips may be retained for replay

## License

Proprietary — separate product from fightflo.app
