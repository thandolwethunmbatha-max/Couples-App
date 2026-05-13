import { format } from 'date-fns';
import type { InputHTMLAttributes } from 'react';
import { notFound, redirect } from 'next/navigation';
import { Button, ButtonLink } from '@/components/button';
import { WaitingRefresh } from '@/components/games/waiting-refresh';
import { AppLogo, MobileCard } from '@/components/shell';
import { requireCouple } from '@/lib/couples';
import { getGame, games } from '@/lib/games/catalog';
import { createClient } from '@/lib/supabase/server';

const gameTypeBySlug: Record<string, 'question_jar' | 'memory_lane' | 'date_spark' | 'love_awards'> = {
  'question-jar': 'question_jar',
  'memory-lane': 'memory_lane',
  'date-spark': 'date_spark',
  'love-awards': 'love_awards'
};

type SearchParams = { session?: string; error?: string };
type Question = { id: number; prompt: string; category: string; mood: string };
type GameSession = { id: string; current_question_id: number | null; status: string; created_at: string };
type Answer = { user_id: string; body: string; created_at: string };
type Memory = { id: string; title: string; body: string | null; happened_on: string | null; emotion: string | null; created_at: string };
type DateIdea = { id: string; title: string; description: string; budget: string | null; energy: string | null; scheduled_for: string | null; created_at: string };
type Award = { id: string; recipient_id: string; title: string; note: string; created_by: string; created_at: string };

export const dynamic = 'force-dynamic';

async function startQuestionJar() {
  'use server';

  const { user, couple } = await requireCouple();
  const supabase = await createClient();
  const { data: questions, error: questionError } = await supabase
    .from('questions')
    .select('id')
    .eq('is_active', true);

  if (questionError || !questions?.length) redirect(`/games/question-jar?error=${encodeURIComponent(questionError?.message ?? 'No questions are available yet.')}`);

  const question = questions[Math.floor(Math.random() * questions.length)];
  const { data: session, error: sessionError } = await supabase
    .from('game_sessions')
    .insert({
      couple_id: couple.id,
      game_type: 'question_jar',
      status: 'active',
      title: 'Question Jar',
      current_question_id: question.id,
      created_by: user.id
    })
    .select('id')
    .single();

  if (sessionError || !session) redirect(`/games/question-jar?error=${encodeURIComponent(sessionError?.message ?? 'Could not start Question Jar.')}`);
  redirect(`/games/question-jar?session=${session.id}`);
}

async function saveQuestionAnswer(formData: FormData) {
  'use server';

  const { user } = await requireCouple();
  const supabase = await createClient();
  const sessionId = String(formData.get('session_id'));
  const questionId = Number(formData.get('question_id'));
  const body = String(formData.get('body') || '').trim();

  if (!body) redirect(`/games/question-jar?session=${sessionId}&error=Write an answer before saving.`);

  const { error } = await supabase
    .from('answers')
    .upsert({ session_id: sessionId, question_id: questionId, user_id: user.id, body }, { onConflict: 'session_id,user_id' });

  if (error) redirect(`/games/question-jar?session=${sessionId}&error=${encodeURIComponent(error.message)}`);

  const { count } = await supabase
    .from('answers')
    .select('id', { count: 'exact', head: true })
    .eq('session_id', sessionId);

  if ((count ?? 0) >= 2) {
    await supabase.from('game_sessions').update({ status: 'revealed', revealed_at: new Date().toISOString() }).eq('id', sessionId);
  }

  redirect(`/games/question-jar?session=${sessionId}`);
}

async function addMemory(formData: FormData) {
  'use server';

  const { user, couple } = await requireCouple();
  const supabase = await createClient();
  const title = String(formData.get('title') || '').trim();
  const body = String(formData.get('body') || '').trim();
  const happenedOn = String(formData.get('happened_on') || '') || null;
  const emotion = String(formData.get('emotion') || '').trim() || null;

  if (!title) redirect('/games/memory-lane?error=Give this memory a title.');

  const { error } = await supabase.from('memories').insert({
    couple_id: couple.id,
    title,
    body: body || null,
    happened_on: happenedOn,
    emotion,
    created_by: user.id
  });

  if (error) redirect(`/games/memory-lane?error=${encodeURIComponent(error.message)}`);
  redirect('/games/memory-lane');
}

async function addDateIdea(formData: FormData) {
  'use server';

  const { user, couple } = await requireCouple();
  const supabase = await createClient();
  const title = String(formData.get('title') || '').trim();
  const description = String(formData.get('description') || '').trim();
  const budget = String(formData.get('budget') || '').trim() || null;
  const energy = String(formData.get('energy') || '').trim() || null;
  const scheduledFor = String(formData.get('scheduled_for') || '') || null;

  if (!title || !description) redirect('/games/date-spark?error=Add a title and description for your date idea.');

  const { error } = await supabase.from('date_ideas').insert({
    couple_id: couple.id,
    title,
    description,
    budget,
    energy,
    scheduled_for: scheduledFor,
    created_by: user.id
  });

  if (error) redirect(`/games/date-spark?error=${encodeURIComponent(error.message)}`);
  redirect('/games/date-spark');
}

async function addAward(formData: FormData) {
  'use server';

  const { user, couple, partner } = await requireCouple();
  if (!partner) redirect('/games/love-awards?error=Invite your partner before sending an award.');

  const supabase = await createClient();
  const title = String(formData.get('title') || '').trim();
  const note = String(formData.get('note') || '').trim();

  if (!title || !note) redirect('/games/love-awards?error=Add an award title and a note.');

  const { error } = await supabase.from('awards').insert({
    couple_id: couple.id,
    recipient_id: partner.user_id,
    title,
    note,
    created_by: user.id
  });

  if (error) redirect(`/games/love-awards?error=${encodeURIComponent(error.message)}`);
  redirect('/games/love-awards');
}

export default async function GameFlowPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<SearchParams> }) {
  const { slug } = await params;
  const query = await searchParams;
  const game = getGame(slug);
  if (!game) notFound();

  const context = await requireCouple();
  const Icon = game.icon;

  return (
    <main className="min-h-screen bg-romantic-radial px-5 py-5">
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
          {query.error ? <p className="mt-6 rounded-3xl bg-rose-50 p-4 text-sm font-semibold text-rosewood">{query.error}</p> : null}
          <div className="mt-8">
            {slug === 'question-jar' ? <QuestionJarFlow sessionId={query.session} memberCount={context.members.length} userId={context.user.id} /> : null}
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

async function QuestionJarFlow({ sessionId, memberCount, userId }: { sessionId?: string; memberCount: number; userId: string }) {
  const supabase = await createClient();
  let session: GameSession | null = null;

  if (sessionId) {
    const { data } = await supabase.from('game_sessions').select('id, current_question_id, status, created_at').eq('id', sessionId).eq('game_type', gameTypeBySlug['question-jar']).maybeSingle();
    session = data as GameSession | null;
  } else {
    const { data } = await supabase.from('game_sessions').select('id, current_question_id, status, created_at').eq('game_type', gameTypeBySlug['question-jar']).in('status', ['active', 'revealed']).order('created_at', { ascending: false }).limit(1).maybeSingle();
    session = data as GameSession | null;
  }

  if (!session?.current_question_id) {
    return (
      <div className="rounded-[1.5rem] bg-white/75 p-5">
        <h2 className="text-2xl font-black text-plum">Draw tonight's question</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">A random prompt will be saved as a shared session so refreshes never lose your place.</p>
        <form action={startQuestionJar} className="mt-5"><Button type="submit">Start Question Jar</Button></form>
      </div>
    );
  }

  const [{ data: question }, { data: answers }] = await Promise.all([
    supabase.from('questions').select('id, prompt, category, mood').eq('id', session.current_question_id).single(),
    supabase.from('answers').select('user_id, body, created_at').eq('session_id', session.id).order('created_at', { ascending: true })
  ]);

  const typedQuestion = question as Question | null;
  const typedAnswers = (answers ?? []) as Answer[];
  const userAnswer = typedAnswers.find((answer) => answer.user_id === userId);
  const reveal = typedAnswers.length >= 2;

  return (
    <div className="grid gap-5">
      <div className="rounded-[1.5rem] bg-gradient-to-br from-rose-500 to-fuchsia-500 p-5 text-white">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-white/75">{typedQuestion?.category} · {typedQuestion?.mood}</p>
        <h2 className="mt-3 text-3xl font-black">{typedQuestion?.prompt}</h2>
      </div>
      {!userAnswer ? (
        <form action={saveQuestionAnswer} className="grid gap-4 rounded-[1.5rem] bg-white/75 p-5">
          <input type="hidden" name="session_id" value={session.id} />
          <input type="hidden" name="question_id" value={typedQuestion?.id} />
          <label className="grid gap-2 text-sm font-bold text-plum">
            Your private answer
            <textarea className="min-h-32 rounded-2xl border-rose-100 bg-white/80 px-4 py-3 text-base shadow-sm focus:border-rose-300 focus:ring-rose-200" name="body" required placeholder="Write from the heart..." />
          </label>
          <Button type="submit">Save answer</Button>
        </form>
      ) : reveal ? (
        <div className="grid gap-4 md:grid-cols-2">
          {typedAnswers.map((answer) => (
            <article key={answer.user_id} className="rounded-[1.5rem] bg-white/75 p-5">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-rose-400">{answer.user_id === userId ? 'Your answer' : 'Partner answer'}</p>
              <p className="mt-3 leading-7 text-slate-700">{answer.body}</p>
            </article>
          ))}
          <form action={startQuestionJar}><Button type="submit" variant="secondary">Draw another question</Button></form>
        </div>
      ) : (
        <div className="rounded-[1.5rem] bg-white/75 p-5">
          <h2 className="text-2xl font-black text-plum">Answer saved. Waiting for your partner.</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">{memberCount < 2 ? 'Your partner has not joined yet. Share your invite code from the dashboard.' : 'This page will refresh until your partner answers, then both answers will reveal together.'}</p>
          {memberCount >= 2 ? <div className="mt-4"><WaitingRefresh /></div> : null}
        </div>
      )}
    </div>
  );
}

async function MemoryLaneFlow({ coupleId }: { coupleId: string }) {
  const supabase = await createClient();
  const { data } = await supabase.from('memories').select('id, title, body, happened_on, emotion, created_at').eq('couple_id', coupleId).order('happened_on', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false });
  const memories = (data ?? []) as Memory[];

  return (
    <div className="grid gap-5 lg:grid-cols-[0.8fr_1fr]">
      <form action={addMemory} className="grid gap-4 rounded-[1.5rem] bg-white/75 p-5">
        <h2 className="text-2xl font-black text-plum">Save a memory</h2>
        <TextInput name="title" label="Title" placeholder="The night we walked home in the rain" required />
        <label className="grid gap-2 text-sm font-bold text-plum">Story<textarea name="body" className="min-h-28 rounded-2xl border-rose-100 bg-white/80 px-4 py-3 text-base shadow-sm focus:border-rose-300 focus:ring-rose-200" placeholder="What happened, and why did it matter?" /></label>
        <div className="grid gap-4 sm:grid-cols-2"><TextInput name="happened_on" label="Date" type="date" /><TextInput name="emotion" label="Emotion" placeholder="Grateful" /></div>
        <Button type="submit">Add memory</Button>
      </form>
      <Timeline items={memories} />
    </div>
  );
}

async function DateSparkFlow({ coupleId }: { coupleId: string }) {
  const supabase = await createClient();
  const { data } = await supabase.from('date_ideas').select('id, title, description, budget, energy, scheduled_for, created_at').eq('couple_id', coupleId).order('created_at', { ascending: false });
  const ideas = (data ?? []) as DateIdea[];

  return (
    <div className="grid gap-5 lg:grid-cols-[0.8fr_1fr]">
      <form action={addDateIdea} className="grid gap-4 rounded-[1.5rem] bg-white/75 p-5">
        <h2 className="text-2xl font-black text-plum">Create a date spark</h2>
        <TextInput name="title" label="Date title" placeholder="Sunset picnic playlist swap" required />
        <label className="grid gap-2 text-sm font-bold text-plum">Description<textarea name="description" className="min-h-28 rounded-2xl border-rose-100 bg-white/80 px-4 py-3 text-base shadow-sm focus:border-rose-300 focus:ring-rose-200" required placeholder="Describe the plan, vibe, and tiny details." /></label>
        <div className="grid gap-4 sm:grid-cols-3"><TextInput name="budget" label="Budget" placeholder="$" /><TextInput name="energy" label="Energy" placeholder="Cozy" /><TextInput name="scheduled_for" label="Schedule" type="datetime-local" /></div>
        <Button type="submit">Save date idea</Button>
      </form>
      <div className="grid gap-4">
        {ideas.length ? ideas.map((idea) => <article key={idea.id} className="rounded-[1.5rem] bg-white/75 p-5"><h3 className="text-xl font-black text-plum">{idea.title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{idea.description}</p><p className="mt-3 text-xs font-bold uppercase tracking-[0.18em] text-rose-400">{[idea.budget, idea.energy, idea.scheduled_for ? format(new Date(idea.scheduled_for), 'MMM d, h:mm a') : null].filter(Boolean).join(' · ')}</p></article>) : <EmptyState title="No date sparks yet" copy="Create the first idea and build your shared list." />}
      </div>
    </div>
  );
}

async function LoveAwardsFlow({ coupleId, userId, partnerId }: { coupleId: string; userId: string; partnerId: string | null }) {
  const supabase = await createClient();
  const { data } = await supabase.from('awards').select('id, recipient_id, title, note, created_by, created_at').eq('couple_id', coupleId).order('created_at', { ascending: false });
  const awards = (data ?? []) as Award[];

  return (
    <div className="grid gap-5 lg:grid-cols-[0.8fr_1fr]">
      <form action={addAward} className="grid gap-4 rounded-[1.5rem] bg-white/75 p-5">
        <h2 className="text-2xl font-black text-plum">Give a love award</h2>
        {!partnerId ? <p className="rounded-3xl bg-rose-50 p-4 text-sm font-semibold text-rosewood">Invite your partner before sending awards.</p> : null}
        <TextInput name="title" label="Award title" placeholder="Best Cozy Morning Maker" required />
        <label className="grid gap-2 text-sm font-bold text-plum">Note<textarea name="note" className="min-h-28 rounded-2xl border-rose-100 bg-white/80 px-4 py-3 text-base shadow-sm focus:border-rose-300 focus:ring-rose-200" required placeholder="Tell them exactly why they deserve it." /></label>
        <Button type="submit" disabled={!partnerId}>Send award</Button>
      </form>
      <div className="grid gap-4">
        {awards.length ? awards.map((award) => <article key={award.id} className="rounded-[1.5rem] bg-white/75 p-5"><p className="text-xs font-bold uppercase tracking-[0.18em] text-rose-400">{award.recipient_id === userId ? 'Awarded to you' : 'Awarded to your partner'}</p><h3 className="mt-2 text-xl font-black text-plum">{award.title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{award.note}</p></article>) : <EmptyState title="No awards yet" copy="Celebrate a tiny kindness, a big win, or an inside joke." />}
      </div>
    </div>
  );
}

function TextInput({ label, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return <label className="grid gap-2 text-sm font-bold text-plum">{label}<input className="rounded-2xl border-rose-100 bg-white/80 px-4 py-3 text-base shadow-sm focus:border-rose-300 focus:ring-rose-200" {...props} /></label>;
}

function EmptyState({ title, copy }: { title: string; copy: string }) {
  return <div className="rounded-[1.5rem] bg-white/75 p-5"><h3 className="text-xl font-black text-plum">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{copy}</p></div>;
}

function Timeline({ items }: { items: Memory[] }) {
  if (!items.length) return <EmptyState title="No memories yet" copy="Add the first chapter to your shared timeline." />;
  return <div className="grid gap-4">{items.map((item) => <article key={item.id} className="rounded-[1.5rem] bg-white/75 p-5"><p className="text-xs font-bold uppercase tracking-[0.18em] text-rose-400">{item.happened_on ? format(new Date(`${item.happened_on}T00:00:00`), 'MMM d, yyyy') : 'Undated'}{item.emotion ? ` · ${item.emotion}` : ''}</p><h3 className="mt-2 text-xl font-black text-plum">{item.title}</h3>{item.body ? <p className="mt-2 text-sm leading-6 text-slate-600">{item.body}</p> : null}</article>)}</div>;
}
