# OurStory

OurStory is a mobile-first Next.js couples app for private relationship rituals, question games, date ideas, memories, and celebration flows.

## Architecture

- **Frontend:** Next.js App Router, TypeScript, Tailwind CSS, reusable React components.
- **Auth:** Supabase Auth with the current `@supabase/ssr` client pattern for browser, server, and middleware clients.
- **Database:** Supabase Postgres with row-level security for profiles, couples, memberships, sessions, answers, memories, date ideas, and awards.
- **PWA:** Web app manifest and maskable SVG icons are included in `public/`.
- **Deployment:** Vercel-ready configuration using environment variables only.

## Local setup

1. Copy `.env.example` to `.env.local`.
2. Fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` from your Supabase project settings.
3. Set `NEXT_PUBLIC_SITE_URL` to `http://localhost:3000` locally and to your Vercel production URL after deployment.
4. In Supabase SQL editor, run `supabase/schema.sql`.
5. In Supabase SQL editor, run `supabase/seed_questions.sql` to insert 100 original prompts.
6. Install dependencies when registry access is available: `npm install`.
7. Run the app locally: `npm run dev`.
8. In Supabase Auth settings, add these redirect URLs:
   - `http://localhost:3000/auth/callback`
   - `https://your-vercel-domain.vercel.app/auth/callback`

## Base routes

- `/` marketing landing page.
- `/auth/signup` account creation.
- `/auth/login` sign in.
- `/auth/callback` Supabase email and PKCE callback handler.
- `/dashboard` protected relationship dashboard.
- `/games` protected game catalog.
- `/games/[slug]` protected game-flow shell.

## Next build steps

- Wire couple creation and invitation code joining to `couples` and `couple_members`.
- Persist game sessions in `game_sessions`, `answers`, `memories`, `date_ideas`, and `awards`.
- Add realtime partner reveal flows with Supabase channels.
- Add offline caching service worker behavior if full offline PWA functionality is required.
