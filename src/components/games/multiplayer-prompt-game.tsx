'use client';

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import { createClient } from '@/lib/supabase/browser';

type GameType = 'question_jar' | 'intimacy_cards' | 'late_night_talks' | 'flirty_chaos' | 'future_us';
type Session = { id: string; current_question_id: number | null; game_type: GameType; status: string; metadata: Record<string, unknown> | null };
type Question = { id: number; prompt: string; category: string; mood: string };
type Answer = { id: string; session_id: string; question_id: number; user_id: string; body: string; created_at: string };
type Reaction = { id: string; answer_id: string; user_id: string; reaction: string };
type Favorite = { id: string; answer_id: string; user_id: string };
type Goal = { id: string; title: string; summary: string; created_at: string };

type Mode = {
  slug: string;
  gameType: GameType;
  title: string;
  category: string | null;
  promptLabel: string;
  placeholder: string;
  dark?: boolean;
};

export function MultiplayerPromptGame({ mode, coupleId, userId, memberCount }: { mode: Mode; coupleId: string; userId: string; memberCount: number }) {
  const supabase = useMemo(() => createClient(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [question, setQuestion] = useState<Question | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [body, setBody] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isPending, startTransition] = useTransition();

  const currentQuestionId = session?.current_question_id ?? null;
  const currentAnswers = currentQuestionId ? answers.filter((answer) => answer.question_id === currentQuestionId) : [];
  const userAnswer = currentAnswers.find((answer) => answer.user_id === userId);
  const reveal = currentAnswers.length >= 2;

  const loadSession = useCallback(async () => {
    const { data, error: loadError } = await supabase
      .from('game_sessions')
      .select('id, current_question_id, game_type, status, metadata')
      .eq('couple_id', coupleId)
      .eq('game_type', mode.gameType)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (loadError) {
      setError('Could not load the shared game session. Please refresh.');
      return;
    }

    setSession((data as Session | null) ?? null);
  }, [coupleId, mode.gameType, supabase]);

  const loadRound = useCallback(async (activeSession: Session | null) => {
    if (!activeSession?.current_question_id) {
      setQuestion(null);
      setAnswers([]);
      return;
    }

    const [{ data: questionData }, { data: answerData }, { data: goalData }] = await Promise.all([
      supabase.from('questions').select('id, prompt, category, mood').eq('id', activeSession.current_question_id).single(),
      supabase.from('answers').select('id, session_id, question_id, user_id, body, created_at').eq('session_id', activeSession.id).eq('question_id', activeSession.current_question_id).order('created_at', { ascending: true }),
      mode.slug === 'future-us' ? supabase.from('shared_goals').select('id, title, summary, created_at').eq('couple_id', coupleId).order('created_at', { ascending: false }).limit(3) : Promise.resolve({ data: [] })
    ]);

    const typedAnswers = (answerData ?? []) as Answer[];
    setQuestion(questionData as Question);
    setAnswers(typedAnswers);
    setGoals((goalData ?? []) as Goal[]);

    const answerIds = typedAnswers.map((answer) => answer.id);
    if (!answerIds.length) {
      setReactions([]);
      setFavorites([]);
      return;
    }

    const [{ data: reactionData }, { data: favoriteData }] = await Promise.all([
      supabase.from('answer_reactions').select('id, answer_id, user_id, reaction').in('answer_id', answerIds),
      supabase.from('favorite_answers').select('id, answer_id, user_id').in('answer_id', answerIds)
    ]);

    setReactions((reactionData ?? []) as Reaction[]);
    setFavorites((favoriteData ?? []) as Favorite[]);
  }, [coupleId, mode.slug, supabase]);

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  useEffect(() => {
    void loadRound(session);
  }, [loadRound, session]);

  useEffect(() => {
    const channel = supabase
      .channel(`game-${coupleId}-${mode.gameType}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_sessions', filter: `couple_id=eq.${coupleId}` }, () => void loadSession())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'answers' }, () => void loadRound(session))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'answer_reactions' }, () => void loadRound(session))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'favorite_answers' }, () => void loadRound(session))
      .subscribe();

    const interval = window.setInterval(() => {
      void loadSession();
      void loadRound(session);
    }, 2500);

    return () => {
      window.clearInterval(interval);
      void supabase.removeChannel(channel);
    };
  }, [coupleId, loadRound, loadSession, mode.gameType, session, supabase]);

  async function drawCard() {
    setError('');
    setMessage('Drawing card…');
    startTransition(async () => {
      const { data, error: drawError } = await supabase.rpc('draw_game_card', {
        target_game_type: mode.gameType,
        target_category: mode.category,
        target_title: mode.title
      });

      if (drawError || !data) {
        setError('Failed to draw the next card. Please try again.');
        setMessage('');
        return;
      }

      setSession(data as Session);
      setBody('');
      setMessage('New shared card drawn.');
      await loadRound(data as Session);
    });
  }

  async function saveAnswer() {
    if (!session?.id || !question?.id || !body.trim()) return;
    setError('');
    setMessage('Saving…');
    startTransition(async () => {
      const { data, error: saveError } = await supabase
        .from('answers')
        .upsert({ session_id: session.id, question_id: question.id, user_id: userId, body: body.trim() }, { onConflict: 'session_id,question_id,user_id' })
        .select('id, session_id, question_id, user_id, body, created_at')
        .single();

      if (saveError || !data) {
        setError('Failed to save your answer. Please try again.');
        setMessage('');
        return;
      }

      setAnswers((existing) => [...existing.filter((answer) => answer.user_id !== userId || answer.question_id !== question.id), data as Answer]);
      setMessage('Waiting for partner…');
      await loadRound(session);
    });
  }

  async function react(answerId: string, reaction: string) {
    setError('');
    setReactions((existing) => [...existing.filter((item) => !(item.answer_id === answerId && item.user_id === userId)), { id: `local-${answerId}`, answer_id: answerId, user_id: userId, reaction }]);
    const { error: reactionError } = await supabase.from('answer_reactions').upsert({ answer_id: answerId, user_id: userId, reaction }, { onConflict: 'answer_id,user_id' });
    if (reactionError) setError('Failed to save reaction. Please try again.');
    await loadRound(session);
  }

  async function favorite(answerId: string) {
    setError('');
    setFavorites((existing) => existing.some((item) => item.answer_id === answerId && item.user_id === userId) ? existing : [...existing, { id: `local-${answerId}`, answer_id: answerId, user_id: userId }]);
    const { error: favoriteError } = await supabase.from('favorite_answers').upsert({ answer_id: answerId, user_id: userId }, { onConflict: 'answer_id,user_id' });
    if (favoriteError) setError('Failed to save favourite. Please try again.');
    await loadRound(session);
  }

  async function saveVision() {
    if (!reveal || !currentAnswers.length) return;
    setMessage('Saving shared vision…');
    const summary = currentAnswers.map((answer) => answer.body).join('\n\n');
    const { error: goalError } = await supabase.from('shared_goals').insert({ couple_id: coupleId, title: 'Future Us Vision', summary, category: 'future_us', created_by: userId });
    if (goalError) setError('Failed to save shared vision. Please try again.');
    await loadRound(session);
    setMessage('Shared vision saved.');
  }

  async function saveConversation() {
    if (!reveal || !currentAnswers.length) return;
    setMessage('Saving conversation…');
    const conversation = currentAnswers.map((answer) => answer.body).join('\n\n---\n\n');
    const { error: memoryError } = await supabase.from('memories').insert({ couple_id: coupleId, title: 'Late Night Talk', body: conversation, emotion: 'Reflective', created_by: userId });
    if (memoryError) setError('Failed to save conversation. Please try again.');
    setMessage(memoryError ? '' : 'Conversation saved as a memory.');
  }

  return (
    <div className="grid gap-5">
      {error ? <p className="rounded-3xl bg-rose-50 p-4 text-sm font-semibold text-rosewood">{error}</p> : null}
      {message ? <p className="rounded-3xl bg-white/70 p-4 text-sm font-bold text-rose-500">{message}</p> : null}
      {!question ? (
        <div className={`rounded-[1.5rem] p-5 ${mode.dark ? 'bg-slate-950 text-white' : 'bg-white/75'}`}>
          <h2 className={`text-2xl font-black ${mode.dark ? 'text-white' : 'text-plum'}`}>{mode.slug === 'question-jar' ? 'Draw tonight’s question' : `Start ${mode.title}`}</h2>
          <p className={`mt-2 text-sm leading-6 ${mode.dark ? 'text-white/70' : 'text-slate-600'}`}>One shared session keeps both partners on the same card.</p>
          <button type="button" disabled={isPending} onClick={drawCard} className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full bg-rose-500 px-5 py-2.5 text-sm font-semibold text-white shadow-glow transition hover:bg-rose-600 disabled:opacity-60">
            {isPending ? 'Drawing card…' : 'Draw shared card'}
          </button>
        </div>
      ) : (
        <>
          <div className={`rounded-[1.5rem] p-5 text-white ${mode.dark ? 'bg-gradient-to-br from-[#2a1742] to-[#07030d]' : 'bg-gradient-to-br from-rose-500 to-fuchsia-500'}`}>
            <div className="flex items-center justify-between gap-3"><p className="text-xs font-bold uppercase tracking-[0.22em] text-white/75">{question.category} · {question.mood}</p><p className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold">Round {String(session?.metadata?.round ?? 1)}</p></div>
            <h2 className="mt-3 text-3xl font-black">{question.prompt}</h2>
          </div>
          {!userAnswer ? (
            <div className={`grid gap-4 rounded-[1.5rem] p-5 ${mode.dark ? 'bg-slate-950 text-white' : 'bg-white/75'}`}>
              <label className={`grid gap-2 text-sm font-bold ${mode.dark ? 'text-white' : 'text-plum'}`}>{mode.promptLabel}<textarea value={body} onChange={(event) => setBody(event.target.value)} className="min-h-36 rounded-2xl border-rose-100 bg-white/90 px-4 py-3 text-base text-slate-900 shadow-sm focus:border-rose-300 focus:ring-rose-200" placeholder={mode.placeholder} /></label>
              {mode.slug === 'late-night-talks' ? <p className="rounded-2xl bg-white/10 p-3 text-sm text-white/70">Voice-note placeholder: record support can plug in here later without changing the conversation model.</p> : null}
              <button type="button" disabled={isPending || !body.trim()} onClick={saveAnswer} className="inline-flex min-h-11 items-center justify-center rounded-full bg-rose-500 px-5 py-2.5 text-sm font-semibold text-white shadow-glow transition hover:bg-rose-600 disabled:opacity-60">
                {isPending ? 'Saving…' : 'Save answer'}
              </button>
            </div>
          ) : reveal ? (
            <div className="grid gap-4">
              <div className="grid gap-4 md:grid-cols-2">{currentAnswers.map((answer) => <AnswerCard key={answer.id} answer={answer} userId={userId} reactions={reactions} favorites={favorites} onReact={react} onFavorite={favorite} />)}</div>
              {mode.slug === 'flirty-chaos' ? <ConfettiScore answers={currentAnswers} userId={userId} /> : null}
              {mode.slug === 'late-night-talks' ? <button type="button" onClick={saveConversation} className="rounded-full bg-slate-950 px-5 py-3 text-sm font-bold text-white">Save conversation as memory</button> : null}
              {mode.slug === 'future-us' ? <SharedVision goals={goals} onSave={saveVision} /> : null}
              <button type="button" disabled={isPending} onClick={drawCard} className="inline-flex min-h-11 items-center justify-center rounded-full bg-white/85 px-5 py-2.5 text-sm font-semibold text-rosewood ring-1 ring-rose-100 transition hover:bg-white disabled:opacity-60">
                {isPending ? 'Drawing card…' : 'Draw next shared card'}
              </button>
            </div>
          ) : (
            <div className={`rounded-[1.5rem] p-5 ${mode.dark ? 'bg-slate-950 text-white' : 'bg-white/75'}`}>
              <h2 className={`text-2xl font-black ${mode.dark ? 'text-white' : 'text-plum'}`}>Answer saved. Waiting for your partner.</h2>
              <p className={`mt-2 text-sm leading-6 ${mode.dark ? 'text-white/70' : 'text-slate-600'}`}>{memberCount < 2 ? 'Your partner has not joined yet. Share your invite code from the dashboard.' : 'Realtime sync is listening. Safe polling also checks every few seconds.'}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function AnswerCard({ answer, userId, reactions, favorites, onReact, onFavorite }: { answer: Answer; userId: string; reactions: Reaction[]; favorites: Favorite[]; onReact: (answerId: string, reaction: string) => void; onFavorite: (answerId: string) => void }) {
  const mine = answer.user_id === userId;
  const currentReaction = reactions.find((reaction) => reaction.answer_id === answer.id && reaction.user_id === userId)?.reaction;
  const isFavorite = favorites.some((favorite) => favorite.answer_id === answer.id && favorite.user_id === userId);
  return (
    <article className="animate-[fadeIn_0.5s_ease-out] rounded-[1.5rem] bg-white/75 p-5 transition hover:-translate-y-0.5 hover:shadow-glow">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-rose-400">{mine ? 'Your answer' : 'Partner answer'}</p>
      <p className="mt-3 whitespace-pre-line leading-7 text-slate-700">{answer.body}</p>
      <div className="mt-4 flex flex-wrap gap-2">{['❤️', '😳', '🥹', '🔥'].map((reaction) => <button key={reaction} onClick={() => onReact(answer.id, reaction)} className={`rounded-full px-3 py-2 text-lg transition hover:scale-110 ${currentReaction === reaction ? 'bg-rose-500 text-white' : 'bg-rose-50'}`} type="button">{reaction}</button>)}<button onClick={() => onFavorite(answer.id)} className={`rounded-full px-3 py-2 text-sm font-bold ${isFavorite ? 'bg-rose-500 text-white' : 'bg-lavender text-plum'}`} type="button">{isFavorite ? 'Saved' : 'Save favourite'}</button></div>
    </article>
  );
}

function ConfettiScore({ answers, userId }: { answers: Answer[]; userId: string }) {
  const partner = answers.find((answer) => answer.user_id !== userId);
  const mine = answers.find((answer) => answer.user_id === userId);
  const match = mine && partner && mine.body.toLowerCase().split(/\s+/).some((word) => word.length > 4 && partner.body.toLowerCase().includes(word));
  return <div className="rounded-[1.5rem] bg-gradient-to-r from-yellow-100 to-rose-100 p-5 text-center"><p className="text-4xl">{match ? '🎉' : '✨'}</p><h3 className="mt-2 text-2xl font-black text-plum">{match ? 'Chaos match!' : 'Beautiful chaos'}</h3><p className="mt-2 text-sm text-slate-600">Score: {match ? '1 shared spark' : '0 exact matches, maximum flirting energy'}</p></div>;
}

function SharedVision({ goals, onSave }: { goals: Goal[]; onSave: () => void }) {
  return <div className="grid gap-4 rounded-[1.5rem] bg-white/75 p-5"><h3 className="text-xl font-black text-plum">Shared vision</h3><button type="button" onClick={onSave} className="rounded-full bg-rose-500 px-5 py-3 text-sm font-bold text-white">Save long-term goal</button>{goals.map((goal) => <article key={goal.id} className="rounded-3xl bg-white/70 p-4"><h4 className="font-black text-plum">{goal.title}</h4><p className="mt-1 text-sm text-slate-600">{goal.summary}</p></article>)}</div>;
}
