# Feedback — AI Sports Coaching

Upload any training video. Get technical coaching in minutes.

> Record your training. AI tells you exactly why you'd get hit.

## Sports supported

- Boxing ✅
- Muay Thai ✅
- Golf ✅
- Tennis ✅
- MMA (coming soon)
- Cricket (coming soon)
- Football (coming soon)
- Weightlifting (coming soon)

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
| Pro | £9.99/mo | 15 analyses/month, clips, history, progress |
| Team | £29.99/mo | 5 users, shared reports |
| API | £199+/mo | Bulk processing, white label |

## Deployment

Deploy as a separate Vercel project pointing to `/feedback`:

```bash
cd feedback
vercel
```

Set all environment variables in Vercel dashboard.

## Privacy

- Video deleted from Cloudinary after analysis
- Only landmark data + clips stored
- No signup required for first analysis

## License

Proprietary — separate product from fightflo.app
