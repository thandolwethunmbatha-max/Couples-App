import { format } from 'date-fns';
import type { InputHTMLAttributes } from 'react';
import { notFound, redirect } from 'next/navigation';
import { Button, ButtonLink } from '@/components/button';
import { WaitingRefresh } from '@/components/games/waiting-refresh';
import { AppLogo, MobileCard } from '@/components/shell';
import { requireCouple } from '@/lib/couples';
import { friendlySupabaseMessage } from '@/lib/errors';
import { getGame } from '@/lib/games/catalog';
import { notifyPartner } from '@/lib/notifications';
import { ensureProfile } from '@/lib/profiles';
import { createClient } from '@/lib/supabase/server';

type GameType = 'question_jar' | 'memory_lane' | 'date_spark' | 'love_awards' | 'intimacy_cards' | 'late_night_talks' | 'flirty_chaos' | 'future_us';
type SearchParams = { session?: string; error?: string };
type Question = { id: number; prompt: string; category: string; mood: string };
type GameSession = { id: string; current_question_id: number | null; status: string; created_at: string; game_type: GameType };
type Answer = { id: string; user_id: string; body: string; created_at: string };
type Memory = { id: string; title: string; body: string | null; happened_on: string | null; emotion: string | null; created_at: string };
type DateIdea = { id: string; title: string; description: string; budget: string | null; energy: string | null; scheduled_for: string | null; created_at: string };
type Award = { id: string; recipient_id: string; title: string; note: string; created_by: string; created_at: string };
type SharedGoal = { id: string; title: string; summary: string; category: string; created_at: string };

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

async function startQuestionJar() {
  'use server';
  await startPromptSession('question-jar', 'question_jar', null);
}

async function startThemedSession(formData: FormData) {
  'use server';
  const slug = String(formData.get('slug'));
  const mode = themedModes[slug];
  const gameType = gameTypeBySlug[slug];
  if (!mode || !gameType) redirect('/games?error=Unknown game mode.');
  await startPromptSession(slug, gameType, mode.category);
}

async function startPromptSession(slug: string, gameType: GameType, category: string | null) {
  await ensureGameProfile(slug);
  const { user, couple } = await requireCouple();
  const supabase = await createClient();
  let query = supabase.from('questions').select('id').eq('is_active', true);
  if (category) query = query.eq('category', category);
  const { data: questions, error: questionError } = await query;

  if (questionError || !questions?.length) redirect(`/games/${slug}?error=${encodeURIComponent(friendlySupabaseMessage(questionError?.message, 'No questions are available yet.'))}`);

  const question = questions[Math.floor(Math.random() * questions.length)];
  const { data: session, error: sessionError } = await supabase
    .from('game_sessions')
    .insert({ couple_id: couple.id, game_type: gameType, status: 'active', title: getGame(slug)?.title ?? 'OurStory Game', current_question_id: question.id, created_by: user.id })
    .select('id')
    .single();

  if (sessionError || !session) redirect(`/games/${slug}?error=${encodeURIComponent(friendlySupabaseMessage(sessionError?.message, 'Could not start this game. Please try again.'))}`);
  redirect(`/games/${slug}?session=${session.id}`);
}

async function savePromptAnswer(formData: FormData) {
  'use server';
  const slug = String(formData.get('slug'));
  await ensureGameProfile(slug);
  const { user, couple } = await requireCouple();
  const supabase = await createClient();
  const sessionId = String(formData.get('session_id'));
  const questionId = Number(formData.get('question_id'));
  const body = String(formData.get('body') || '').trim();

  if (!body) redirect(`/games/${slug}?session=${sessionId}&error=Write an answer before saving.`);

  const { error } = await supabase.from('answers').upsert({ session_id: sessionId, question_id: questionId, user_id: user.id, body }, { onConflict: 'session_id,user_id' });
  if (error) redirect(`/games/${slug}?session=${sessionId}&error=${encodeURIComponent(friendlySupabaseMessage(error.message, 'We could not save your answer. Please try again.'))}`);

  const { count } = await supabase.from('answers').select('id', { count: 'exact', head: true }).eq('session_id', sessionId);
  if ((count ?? 0) >= 2) {
    await supabase.from('game_sessions').update({ status: 'revealed', revealed_at: new Date().toISOString() }).eq('id', sessionId);
    await notifyPartner(couple.id, user.id, 'partner_answered', { title: 'Your partner answered 💌', body: 'Open OurStory to reveal both answers together.', url: `/games/${slug}?session=${sessionId}` });
  }
  redirect(`/games/${slug}?session=${sessionId}`);
}

async function reactToAnswer(formData: FormData) {
  'use server';
  const slug = String(formData.get('slug'));
  await ensureGameProfile(slug);
  const { user } = await requireCouple();
  const supabase = await createClient();
  const answerId = String(formData.get('answer_id'));
  const reaction = String(formData.get('reaction'));
  const sessionId = String(formData.get('session_id'));
  await supabase.from('answer_reactions').upsert({ answer_id: answerId, user_id: user.id, reaction }, { onConflict: 'answer_id,user_id,reaction' });
  redirect(`/games/${slug}?session=${sessionId}`);
}

async function favoriteAnswer(formData: FormData) {
  'use server';
  const slug = String(formData.get('slug'));
  await ensureGameProfile(slug);
  const { user } = await requireCouple();
  const supabase = await createClient();
  const answerId = String(formData.get('answer_id'));
  const sessionId = String(formData.get('session_id'));
  await supabase.from('favorite_answers').upsert({ answer_id: answerId, user_id: user.id }, { onConflict: 'answer_id,user_id' });
  redirect(`/games/${slug}?session=${sessionId}`);
}

async function saveConversationMemory(formData: FormData) {
  'use server';
  await ensureGameProfile('late-night-talks');
  const { user, couple } = await requireCouple();
  const supabase = await createClient();
  const title = String(formData.get('title') || 'Late Night Talk').trim();
  const body = String(formData.get('body') || '').trim();
  await supabase.from('memories').insert({ couple_id: couple.id, title, body, emotion: 'Reflective', created_by: user.id });
  redirect('/games/late-night-talks');
}

async function saveSharedVision(formData: FormData) {
  'use server';
  await ensureGameProfile('future-us');
  const { user, couple } = await requireCouple();
  const supabase = await createClient();
  const title = String(formData.get('title') || 'Shared vision').trim();
  const summary = String(formData.get('summary') || '').trim();
  if (!summary) redirect('/games/future-us?error=Write a shared vision summary before saving.');
  await supabase.from('shared_goals').insert({ couple_id: couple.id, title, summary, category: 'future_us', created_by: user.id });
  redirect('/games/future-us');
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
            {slug === 'question-jar' ? <QuestionJarFlow sessionId={query.session} memberCount={context.members.length} userId={context.user.id} /> : null}
            {slug === 'memory-lane' ? <MemoryLaneFlow coupleId={context.couple.id} /> : null}
            {slug === 'date-spark' ? <DateSparkFlow coupleId={context.couple.id} /> : null}
            {slug === 'love-awards' ? <LoveAwardsFlow coupleId={context.couple.id} userId={context.user.id} partnerId={context.partner?.user_id ?? null} /> : null}
            {themedModes[slug] ? <ThemedPromptFlow slug={slug} sessionId={query.session} memberCount={context.members.length} userId={context.user.id} coupleId={context.couple.id} /> : null}
          </div>
          <ButtonLink href="/dashboard" variant="secondary" className="mt-8">Back to dashboard</ButtonLink>
        </MobileCard>
      </section>
    </main>
  );
}

async function getPromptSession(slug: string, sessionId?: string) {
  const supabase = await createClient();
  const gameType = gameTypeBySlug[slug];
  if (sessionId) {
    const { data } = await supabase.from('game_sessions').select('id, current_question_id, status, created_at, game_type').eq('id', sessionId).eq('game_type', gameType).maybeSingle();
    return data as GameSession | null;
  }
  const { data } = await supabase.from('game_sessions').select('id, current_question_id, status, created_at, game_type').eq('game_type', gameType).in('status', ['active', 'revealed']).order('created_at', { ascending: false }).limit(1).maybeSingle();
  return data as GameSession | null;
}

async function QuestionJarFlow({ sessionId, memberCount, userId }: { sessionId?: string; memberCount: number; userId: string }) {
  return <ThemedPromptFlow slug="question-jar" sessionId={sessionId} memberCount={memberCount} userId={userId} coupleId="" />;
}

async function ThemedPromptFlow({ slug, sessionId, memberCount, userId, coupleId }: { slug: string; sessionId?: string; memberCount: number; userId: string; coupleId: string }) {
  const supabase = await createClient();
  const mode = themedModes[slug];
  const session = await getPromptSession(slug, sessionId);

  if (!session?.current_question_id) {
    return (
      <div className={`rounded-[1.5rem] p-5 ${mode?.dark ? 'bg-slate-950 text-white' : 'bg-white/75'}`}>
        <h2 className={`text-2xl font-black ${mode?.dark ? 'text-white' : 'text-plum'}`}>{mode?.title ?? 'Draw tonight\'s question'}</h2>
        <p className={`mt-2 text-sm leading-6 ${mode?.dark ? 'text-white/70' : 'text-slate-600'}`}>A random prompt will be saved as a shared session so refreshes never lose your place.</p>
        <form action={mode ? startThemedSession : startQuestionJar} className="mt-5">
          {mode ? <input type="hidden" name="slug" value={slug} /> : null}
          <Button type="submit">Start {getGame(slug)?.title ?? 'Game'}</Button>
        </form>
      </div>
    );
  }

  const [{ data: question }, { data: answers }, { data: goals }] = await Promise.all([
    supabase.from('questions').select('id, prompt, category, mood').eq('id', session.current_question_id).single(),
    supabase.from('answers').select('id, user_id, body, created_at').eq('session_id', session.id).order('created_at', { ascending: true }),
    slug === 'future-us' && coupleId ? supabase.from('shared_goals').select('id, title, summary, category, created_at').eq('couple_id', coupleId).order('created_at', { ascending: false }).limit(3) : Promise.resolve({ data: [] })
  ]);

  const typedQuestion = question as Question | null;
  const typedAnswers = (answers ?? []) as Answer[];
  const userAnswer = typedAnswers.find((answer) => answer.user_id === userId);
  const reveal = typedAnswers.length >= 2;

  return (
    <div className="grid gap-5">
      <div className={`rounded-[1.5rem] p-5 text-white ${mode?.dark ? 'bg-gradient-to-br from-[#2a1742] to-[#07030d]' : 'bg-gradient-to-br from-rose-500 to-fuchsia-500'}`}>
        <div className="flex items-center justify-between gap-3"><p className="text-xs font-bold uppercase tracking-[0.22em] text-white/75">{typedQuestion?.category} · {typedQuestion?.mood}</p><p className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold">1 question</p></div>
        <h2 className="mt-3 text-3xl font-black">{typedQuestion?.prompt}</h2>
      </div>
      {!userAnswer ? (
        <form action={savePromptAnswer} className={`grid gap-4 rounded-[1.5rem] p-5 ${mode?.dark ? 'bg-slate-950 text-white' : 'bg-white/75'}`}>
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="session_id" value={session.id} />
          <input type="hidden" name="question_id" value={typedQuestion?.id} />
          <label className={`grid gap-2 text-sm font-bold ${mode?.dark ? 'text-white' : 'text-plum'}`}>{mode?.promptLabel ?? 'Your private answer'}<textarea className="min-h-36 rounded-2xl border-rose-100 bg-white/90 px-4 py-3 text-base text-slate-900 shadow-sm focus:border-rose-300 focus:ring-rose-200" name="body" required placeholder={mode?.placeholder ?? 'Write from the heart...'} /></label>
          {slug === 'late-night-talks' ? <p className="rounded-2xl bg-white/10 p-3 text-sm text-white/70">Voice-note placeholder: record support can plug in here later without changing the conversation model.</p> : null}
          <Button type="submit">Save answer</Button>
        </form>
      ) : reveal ? (
        <div className="grid gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            {typedAnswers.map((answer) => <AnswerReveal key={answer.id} answer={answer} userId={userId} slug={slug} sessionId={session.id} />)}
          </div>
          {slug === 'flirty-chaos' ? <ConfettiScore answers={typedAnswers} userId={userId} /> : null}
          {slug === 'late-night-talks' ? <SaveMemoryPanel answers={typedAnswers} /> : null}
          {slug === 'future-us' ? <SharedVisionPanel answers={typedAnswers} goals={(goals ?? []) as SharedGoal[]} /> : null}
          <form action={mode ? startThemedSession : startQuestionJar}><input type="hidden" name="slug" value={slug} /><Button type="submit" variant="secondary">Draw another</Button></form>
        </div>
      ) : (
        <div className={`rounded-[1.5rem] p-5 ${mode?.dark ? 'bg-slate-950 text-white' : 'bg-white/75'}`}>
          <h2 className={`text-2xl font-black ${mode?.dark ? 'text-white' : 'text-plum'}`}>Answer saved. Waiting for your partner.</h2>
          <p className={`mt-2 text-sm leading-6 ${mode?.dark ? 'text-white/70' : 'text-slate-600'}`}>{memberCount < 2 ? 'Your partner has not joined yet. Share your invite code from the dashboard.' : 'This page will refresh until your partner answers, then both answers will reveal together.'}</p>
          {memberCount >= 2 ? <div className="mt-4"><WaitingRefresh /></div> : null}
        </div>
      )}
    </div>
  );
}

function AnswerReveal({ answer, userId, slug, sessionId }: { answer: Answer; userId: string; slug: string; sessionId: string }) {
  return (
    <article className="animate-[fadeIn_0.5s_ease-out] rounded-[1.5rem] bg-white/75 p-5 transition hover:-translate-y-0.5 hover:shadow-glow">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-rose-400">{answer.user_id === userId ? 'Your answer' : 'Partner answer'}</p>
      <p className="mt-3 whitespace-pre-line leading-7 text-slate-700">{answer.body}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {['❤️', '😳', '🥹', '🔥'].map((reaction) => <form key={reaction} action={reactToAnswer}><input type="hidden" name="slug" value={slug} /><input type="hidden" name="session_id" value={sessionId} /><input type="hidden" name="answer_id" value={answer.id} /><input type="hidden" name="reaction" value={reaction} /><button className="rounded-full bg-rose-50 px-3 py-2 text-lg transition hover:scale-110" type="submit">{reaction}</button></form>)}
        <form action={favoriteAnswer}><input type="hidden" name="slug" value={slug} /><input type="hidden" name="session_id" value={sessionId} /><input type="hidden" name="answer_id" value={answer.id} /><button className="rounded-full bg-lavender px-3 py-2 text-sm font-bold text-plum" type="submit">Save favorite</button></form>
      </div>
    </article>
  );
}

function ConfettiScore({ answers, userId }: { answers: Answer[]; userId: string }) {
  const partner = answers.find((answer) => answer.user_id !== userId);
  const mine = answers.find((answer) => answer.user_id === userId);
  const match = mine && partner && mine.body.toLowerCase().split(/\s+/).some((word) => word.length > 4 && partner.body.toLowerCase().includes(word));
  return <div className="rounded-[1.5rem] bg-gradient-to-r from-yellow-100 to-rose-100 p-5 text-center"><p className="text-4xl">{match ? '🎉' : '✨'}</p><h3 className="mt-2 text-2xl font-black text-plum">{match ? 'Chaos match!' : 'Beautiful chaos'}</h3><p className="mt-2 text-sm text-slate-600">Score: {match ? '1 shared spark' : '0 exact matches, maximum flirting energy'}</p></div>;
}

function SaveMemoryPanel({ answers }: { answers: Answer[] }) {
  return <form action={saveConversationMemory} className="grid gap-3 rounded-[1.5rem] bg-slate-950 p-5 text-white"><h3 className="text-xl font-black">Save this conversation as a memory</h3><input type="hidden" name="body" value={answers.map((answer) => answer.body).join('\n\n---\n\n')} /><TextInput name="title" label="Memory title" defaultValue="Late Night Talk" /><Button type="submit" variant="secondary">Save conversation</Button></form>;
}

function SharedVisionPanel({ answers, goals }: { answers: Answer[]; goals: SharedGoal[] }) {
  const summary = answers.map((answer) => answer.body).join('\n\n');
  return <div className="grid gap-4"><form action={saveSharedVision} className="grid gap-3 rounded-[1.5rem] bg-white/75 p-5"><h3 className="text-xl font-black text-plum">Generate a shared vision</h3><TextInput name="title" label="Goal title" defaultValue="Future Us Vision" /><label className="grid gap-2 text-sm font-bold text-plum">Summary<textarea name="summary" className="min-h-32 rounded-2xl border-rose-100 bg-white/80 px-4 py-3 text-base shadow-sm focus:border-rose-300 focus:ring-rose-200" defaultValue={summary} /></label><Button type="submit">Save long-term goal</Button></form>{goals.map((goal) => <article key={goal.id} className="rounded-3xl bg-white/70 p-4"><h4 className="font-black text-plum">{goal.title}</h4><p className="mt-1 text-sm text-slate-600">{goal.summary}</p></article>)}</div>;
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
