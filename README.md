# OurStory

OurStory is a mobile-first Next.js couples app for private relationship rituals, question games, date ideas, memories, and celebration flows.

## Architecture

- **Frontend:** Next.js 16 App Router, TypeScript, Tailwind CSS, reusable React components.
- **Runtime:** Node.js 20.9+ to match the Next.js 16 runtime requirement.
- **Auth:** Supabase Auth with the current `@supabase/ssr` client pattern for browser, server, and middleware clients.
- **Database:** Supabase Postgres with row-level security for profiles, couples, memberships, sessions, answers, memories, date ideas, and awards.
- **PWA:** Web app manifest and maskable SVG icons are included in `public/`.
- **Deployment:** Vercel-ready configuration using environment variables only.

## Dependency baseline

This branch keeps the secure Next.js 16 dependency update while preserving the existing app scaffold and Supabase setup:

- `next@16.2.6`
- `react@19.2.0`
- `react-dom@19.2.0`
- `eslint@9.39.4`
- `eslint-config-next@16.2.6`

Next.js 16 uses Turbopack by default for `next dev` and `next build`, so the existing scripts intentionally remain `next dev`, `next build`, and `next start`. The lint script uses the ESLint CLI with `eslint.config.mjs` because `next lint` was removed in Next.js 16.

## Local setup

1. Copy `.env.example` to `.env.local`.
2. Fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` from your Supabase project settings.
3. Set `NEXT_PUBLIC_SITE_URL` to `http://localhost:3000` locally and to your Vercel production URL after deployment.
4. Use Node.js 20.9 or newer.
5. In Supabase SQL editor, run `supabase/schema.sql`.
6. In Supabase SQL editor, run `supabase/seed_questions.sql` to insert 100 original prompts.
7. For deployed projects that were created from the initial schema, run `supabase/migrations/20260513000000_couple_pairing_rpc.sql` to add the invite-code join RPC and two-person membership guard.
8. Run `supabase/migrations/20260513010000_rls_stability_pass.sql` to refresh profile triggers, helper functions, and RLS policies used by onboarding and games.
9. Run `supabase/migrations/20260513020000_push_and_themed_games.sql` to add push notification tables, themed game support, reactions, favorites, shared goals, and 240 new prompts.
10. Add push environment variables for production: `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `SUPABASE_SERVICE_ROLE_KEY`, and `CRON_SECRET`.
11. Install dependencies when registry access is available: `npm install`.
12. Run the app locally: `npm run dev`.
13. In Supabase Auth settings, add these redirect URLs:
   - `http://localhost:3000/auth/callback`
   - `https://your-vercel-domain.vercel.app/auth/callback`

## Base routes

- `/` marketing landing page.
- `/auth/signup` account creation.
- `/auth/login` sign in.
- `/auth/callback` Supabase email and PKCE callback handler.
- `/onboarding` protected couple creation and invite-code join flow.
- `/dashboard` protected relationship dashboard.
- `/settings` protected push notification preferences and device subscription page.
- `/games` protected game catalog.
- `/games/[slug]` protected game-flow shell.

## Current functional flows

- Onboarding ensures each signed-in user has a profile, checks whether they belong to a couple, then offers couple creation or invite-code joining.
- Dashboard shows the couple name, invite code, membership status, and a share-ready invite section.
- Question Jar persists a random question session, saves each partner answer, polls while waiting, and reveals both answers after both partners respond.
- Memory Lane, Date Spark, and Love Awards persist shared couple records in Supabase and reload from the database after refresh.
- Intimacy Cards, Late Night Talks, Flirty Chaos, and Future Us add 240 themed prompts, reactions, favorites, memory saving, playful scoring, and shared vision goals.
- Push notifications support daily reminders, partner-answer reveals, new memory/date idea nudges, and streak reminders through browser Push API subscriptions and Vercel cron.

## Next build steps

- Upgrade Question Jar polling to Supabase realtime channels if lower-latency partner reveal is required.
- Add offline caching service worker behavior if full offline PWA functionality is required.
