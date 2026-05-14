import { format } from 'date-fns';
import type { InputHTMLAttributes } from 'react';
import { notFound, redirect } from 'next/navigation';
import { Button, ButtonLink } from '@/components/button';
import { MultiplayerPromptGame } from '@/components/games/multiplayer-prompt-game';
import { AppLogo, MobileCard } from '@/components/shell';
import { requireCouple } from '@/lib/couples';
import { friendlySupabaseMessage } from '@/lib/errors';
import { getGame } from '@/lib/games/catalog';
import { notifyPartner } from '@/lib/notifications';
import { ensureProfile } from '@/lib/profiles';
import { createClient } from '@/lib/supabase/server';

type GameType = 'question_jar' | 'memory_lane' | 'date_spark' | 'love_awards' | 'intimacy_cards' | 'late_night_talks' | 'flirty_chaos' | 'future_us';
type SearchParams = { session?: string; error?: string };
type Memory = { id: string; title: string; body: string | null; happened_on: string | null; emotion: string | null; created_at: string };
type DateIdea = { id: string; title: string; description: string; budget: string | null; energy: string | null; scheduled_for: string | null; created_at: string };
type Award = { id: string; recipient_id: string; title: string; note: string; created_by: string; created_at: string };

const gameTypeBySlug: Record<string, GameType> = {
  'question-jar': 'question_jar',
  'memory-lane': 'memory_lane',
  'date-spark': 'date_spark',
  'love-awards': 'love_awards',
  'intimacy-cards': 'intimacy_cards',
  'late-night-talks': 'late_night_talks',
  'flirty-chaos': 'flirty_chaos',
  'future-us': 'future_us'
};

const themedModes: Record<string, { category: string; title: string; promptLabel: string; placeholder: string; dark?: boolean; rapid?: boolean; vision?: boolean }> = {
  'intimacy-cards': { category: 'intimacy', title: 'Draw an intimacy card', promptLabel: 'Your private answer', placeholder: 'Answer with tenderness, honesty, and a little romance...' },
  'late-night-talks': { category: 'late-night', title: 'Begin a late night talk', promptLabel: 'Long-form reflection', placeholder: 'Take your time. Write the answer you would say under soft lights at midnight...', dark: true },
  'flirty-chaos': { category: 'chaos', title: 'Start rapid-fire chaos', promptLabel: 'Your answer + your guess', placeholder: 'My answer: ...\nMy guess for you: ...', rapid: true },
  'future-us': { category: 'future', title: 'Build a shared vision', promptLabel: 'Your vision', placeholder: 'Describe what future-us should choose, protect, or build...', vision: true }
};

export const dynamic = 'force-dynamic';

async function ensureGameProfile(slug: string) {
  try {
    await ensureProfile();
  } catch (error) {
    redirect(`/games/${slug}?error=${encodeURIComponent(error instanceof Error ? error.message : 'Please sign in again before continuing.')}`);
  }
}

async function addMemory(formData: FormData) {
  'use server';
  await ensureGameProfile('memory-lane');
  const { user, couple } = await requireCouple();
  const supabase = await createClient();
  const title = String(formData.get('title') || '').trim();
  const body = String(formData.get('body') || '').trim();
  const happenedOn = String(formData.get('happened_on') || '') || null;
  const emotion = String(formData.get('emotion') || '').trim() || null;
  if (!title) redirect('/games/memory-lane?error=Give this memory a title.');
  const { error } = await supabase.from('memories').insert({ couple_id: couple.id, title, body: body || null, happened_on: happenedOn, emotion, created_by: user.id });
  if (error) redirect(`/games/memory-lane?error=${encodeURIComponent(friendlySupabaseMessage(error.message, 'We could not save that memory. Please try again.'))}`);
  await notifyPartner(couple.id, user.id, 'new_memory_added', { title: 'A new memory was added 🥹', body: title, url: '/games/memory-lane' });
  redirect('/games/memory-lane');
}

async function addDateIdea(formData: FormData) {
  'use server';
  await ensureGameProfile('date-spark');
  const { user, couple } = await requireCouple();
  const supabase = await createClient();
  const title = String(formData.get('title') || '').trim();
  const description = String(formData.get('description') || '').trim();
  const budget = String(formData.get('budget') || '').trim() || null;
  const energy = String(formData.get('energy') || '').trim() || null;
  const scheduledFor = String(formData.get('scheduled_for') || '') || null;
  if (!title || !description) redirect('/games/date-spark?error=Add a title and description for your date idea.');
  const { error } = await supabase.from('date_ideas').insert({ couple_id: couple.id, title, description, budget, energy, scheduled_for: scheduledFor, created_by: user.id });
  if (error) redirect(`/games/date-spark?error=${encodeURIComponent(friendlySupabaseMessage(error.message, 'We could not save that date idea. Please try again.'))}`);
  await notifyPartner(couple.id, user.id, 'new_date_idea_added', { title: 'New date idea added ✨', body: title, url: '/games/date-spark' });
  redirect('/games/date-spark');
}

async function addAward(formData: FormData) {
  'use server';
  await ensureGameProfile('love-awards');
  const { user, couple, partner } = await requireCouple();
  if (!partner) redirect('/games/love-awards?error=Invite your partner before sending an award.');
  const supabase = await createClient();
  const title = String(formData.get('title') || '').trim();
  const note = String(formData.get('note') || '').trim();
  if (!title || !note) redirect('/games/love-awards?error=Add an award title and a note.');
  const { error } = await supabase.from('awards').insert({ couple_id: couple.id, recipient_id: partner.user_id, title, note, created_by: user.id });
  if (error) redirect(`/games/love-awards?error=${encodeURIComponent(friendlySupabaseMessage(error.message, 'We could not send that award. Please try again.'))}`);
  redirect('/games/love-awards');
}

export default async function GameFlowPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<SearchParams> }) {
  const { slug } = await params;
  const query = await searchParams;
  const game = getGame(slug);
  if (!game) notFound();
  const context = await requireCouple();
  const Icon = game.icon;
  const isLateNight = slug === 'late-night-talks';

  return (
    <main className={`min-h-screen px-5 py-5 ${isLateNight ? 'bg-[#170d24] bg-romantic-radial' : 'bg-romantic-radial'}`}>
      <div className="mx-auto max-w-5xl"><AppLogo /></div>
      <section className="mx-auto max-w-5xl py-8">
        <MobileCard>
          <div className="grid gap-6 md:grid-cols-[auto_1fr] md:items-start">
            <span className="grid size-16 place-items-center rounded-3xl bg-rose-100 text-rose-600"><Icon className="size-8" /></span>
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.24em] text-rose-400">{game.tone} flow · {game.duration}</p>
              <h1 className="mt-2 text-4xl font-black text-plum">{game.title}</h1>
              <p className="mt-3 text-lg leading-8 text-slate-600">{game.description}</p>
            </div>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-4">
            {game.steps.map((step, index) => <div className="rounded-3xl bg-white/70 p-3" key={step}><p className="text-xs font-black uppercase tracking-[0.18em] text-rose-400">{index + 1}/4</p><p className="text-sm font-bold text-plum">{step}</p></div>)}
          </div>
          {query.error ? <p className="mt-6 rounded-3xl bg-rose-50 p-4 text-sm font-semibold text-rosewood">{query.error}</p> : null}
          <div className="mt-8">
            {gameTypeBySlug[slug] && ['question-jar', 'intimacy-cards', 'late-night-talks', 'flirty-chaos', 'future-us'].includes(slug) ? (
              <MultiplayerPromptGame
                mode={{
                  slug,
                  gameType: gameTypeBySlug[slug] as 'question_jar' | 'intimacy_cards' | 'late_night_talks' | 'flirty_chaos' | 'future_us',
                  title: game.title,
                  category: themedModes[slug]?.category ?? null,
                  promptLabel: themedModes[slug]?.promptLabel ?? 'Your private answer',
                  placeholder: themedModes[slug]?.placeholder ?? 'Write from the heart...',
                  dark: themedModes[slug]?.dark
                }}
                coupleId={context.couple.id}
                userId={context.user.id}
                memberCount={context.members.length}
              />
            ) : null}
            {slug === 'memory-lane' ? <MemoryLaneFlow coupleId={context.couple.id} /> : null}
            {slug === 'date-spark' ? <DateSparkFlow coupleId={context.couple.id} /> : null}
            {slug === 'love-awards' ? <LoveAwardsFlow coupleId={context.couple.id} userId={context.user.id} partnerId={context.partner?.user_id ?? null} /> : null}
          </div>
          <ButtonLink href="/dashboard" variant="secondary" className="mt-8">Back to dashboard</ButtonLink>
        </MobileCard>
      </section>
    </main>
  );
}

async function MemoryLaneFlow({ coupleId }: { coupleId: string }) {
  const supabase = await createClient();
  const { data } = await supabase.from('memories').select('id, title, body, happened_on, emotion, created_at').eq('couple_id', coupleId).order('happened_on', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false });
  const memories = (data ?? []) as Memory[];
  return <div className="grid gap-5 lg:grid-cols-[0.8fr_1fr]"><form action={addMemory} className="grid gap-4 rounded-[1.5rem] bg-white/75 p-5"><h2 className="text-2xl font-black text-plum">Save a memory</h2><TextInput name="title" label="Title" placeholder="The night we walked home in the rain" required /><label className="grid gap-2 text-sm font-bold text-plum">Story<textarea name="body" className="min-h-28 rounded-2xl border-rose-100 bg-white/80 px-4 py-3 text-base shadow-sm focus:border-rose-300 focus:ring-rose-200" placeholder="What happened, and why did it matter?" /></label><div className="grid gap-4 sm:grid-cols-2"><TextInput name="happened_on" label="Date" type="date" /><TextInput name="emotion" label="Emotion" placeholder="Grateful" /></div><Button type="submit">Add memory</Button></form><Timeline items={memories} /></div>;
}

async function DateSparkFlow({ coupleId }: { coupleId: string }) {
  const supabase = await createClient();
  const { data } = await supabase.from('date_ideas').select('id, title, description, budget, energy, scheduled_for, created_at').eq('couple_id', coupleId).order('created_at', { ascending: false });
  const ideas = (data ?? []) as DateIdea[];
  return <div className="grid gap-5 lg:grid-cols-[0.8fr_1fr]"><form action={addDateIdea} className="grid gap-4 rounded-[1.5rem] bg-white/75 p-5"><h2 className="text-2xl font-black text-plum">Create a date spark</h2><TextInput name="title" label="Date title" placeholder="Sunset picnic playlist swap" required /><label className="grid gap-2 text-sm font-bold text-plum">Description<textarea name="description" className="min-h-28 rounded-2xl border-rose-100 bg-white/80 px-4 py-3 text-base shadow-sm focus:border-rose-300 focus:ring-rose-200" required placeholder="Describe the plan, vibe, and tiny details." /></label><div className="grid gap-4 sm:grid-cols-3"><TextInput name="budget" label="Budget" placeholder="$" /><TextInput name="energy" label="Energy" placeholder="Cozy" /><TextInput name="scheduled_for" label="Schedule" type="datetime-local" /></div><Button type="submit">Save date idea</Button></form><div className="grid gap-4">{ideas.length ? ideas.map((idea) => <article key={idea.id} className="rounded-[1.5rem] bg-white/75 p-5"><h3 className="text-xl font-black text-plum">{idea.title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{idea.description}</p><p className="mt-3 text-xs font-bold uppercase tracking-[0.18em] text-rose-400">{[idea.budget, idea.energy, idea.scheduled_for ? format(new Date(idea.scheduled_for), 'MMM d, h:mm a') : null].filter(Boolean).join(' · ')}</p></article>) : <EmptyState title="No date sparks yet" copy="Create the first idea and build your shared list." />}</div></div>;
}

async function LoveAwardsFlow({ coupleId, userId, partnerId }: { coupleId: string; userId: string; partnerId: string | null }) {
  const supabase = await createClient();
  const { data } = await supabase.from('awards').select('id, recipient_id, title, note, created_by, created_at').eq('couple_id', coupleId).order('created_at', { ascending: false });
  const awards = (data ?? []) as Award[];
  return <div className="grid gap-5 lg:grid-cols-[0.8fr_1fr]"><form action={addAward} className="grid gap-4 rounded-[1.5rem] bg-white/75 p-5"><h2 className="text-2xl font-black text-plum">Give a love award</h2>{!partnerId ? <p className="rounded-3xl bg-rose-50 p-4 text-sm font-semibold text-rosewood">Invite your partner before sending awards.</p> : null}<TextInput name="title" label="Award title" placeholder="Best Cozy Morning Maker" required /><label className="grid gap-2 text-sm font-bold text-plum">Note<textarea name="note" className="min-h-28 rounded-2xl border-rose-100 bg-white/80 px-4 py-3 text-base shadow-sm focus:border-rose-300 focus:ring-rose-200" required placeholder="Tell them exactly why they deserve it." /></label><Button type="submit" disabled={!partnerId}>Send award</Button></form><div className="grid gap-4">{awards.length ? awards.map((award) => <article key={award.id} className="rounded-[1.5rem] bg-white/75 p-5"><p className="text-xs font-bold uppercase tracking-[0.18em] text-rose-400">{award.recipient_id === userId ? 'Awarded to you' : 'Awarded to your partner'}</p><h3 className="mt-2 text-xl font-black text-plum">{award.title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{award.note}</p></article>) : <EmptyState title="No awards yet" copy="Celebrate a tiny kindness, a big win, or an inside joke." />}</div></div>;
}

function TextInput({ label, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return <label className="grid gap-2 text-sm font-bold text-plum">{label}<input className="rounded-2xl border-rose-100 bg-white/80 px-4 py-3 text-base text-slate-900 shadow-sm focus:border-rose-300 focus:ring-rose-200" {...props} /></label>;
}

function EmptyState({ title, copy }: { title: string; copy: string }) {
  return <div className="rounded-[1.5rem] bg-white/75 p-5"><h3 className="text-xl font-black text-plum">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{copy}</p></div>;
}

function Timeline({ items }: { items: Memory[] }) {
  if (!items.length) return <EmptyState title="No memories yet" copy="Add the first chapter to your shared timeline." />;
  return <div className="grid gap-4">{items.map((item) => <article key={item.id} className="rounded-[1.5rem] bg-white/75 p-5"><p className="text-xs font-bold uppercase tracking-[0.18em] text-rose-400">{item.happened_on ? format(new Date(`${item.happened_on}T00:00:00`), 'MMM d, yyyy') : 'Undated'}{item.emotion ? ` · ${item.emotion}` : ''}</p><h3 className="mt-2 text-xl font-black text-plum">{item.title}</h3>{item.body ? <p className="mt-2 text-sm leading-6 text-slate-600">{item.body}</p> : null}</article>)}</div>;
}
