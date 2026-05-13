import { redirect } from 'next/navigation';
import { Button, ButtonLink } from '@/components/button';
import { CopyButton } from '@/components/copy-button';
import { AppLogo, MobileCard } from '@/components/shell';
import { getCoupleContext } from '@/lib/couples';
import { friendlySupabaseMessage } from '@/lib/errors';
import { ensureProfile } from '@/lib/profiles';
import { createClient } from '@/lib/supabase/server';

async function createCouple(formData: FormData) {
  'use server';

  let user;

  try {
    user = await ensureProfile();
  } catch (error) {
    redirect(`/onboarding?error=${encodeURIComponent(error instanceof Error ? error.message : 'Please sign in again before continuing.')}`);
  }

  const supabase = await createClient();
  const name = String(formData.get('name') || 'Our Story').trim() || 'Our Story';
  const { data, error } = await supabase
    .from('couples')
    .insert({ name, created_by: user.id })
    .select('id')
    .single();

  if (error || !data) redirect(`/onboarding?error=${encodeURIComponent(friendlySupabaseMessage(error?.message, 'We could not create your couple yet. Please refresh and try again.'))}`);
  redirect('/onboarding?created=1');
}

async function joinCouple(formData: FormData) {
  'use server';

  const inviteCode = String(formData.get('invite_code') || '').trim().toUpperCase();
  if (!inviteCode) redirect('/onboarding?error=Enter an invite code to join your partner.');

  try {
    await ensureProfile();
  } catch (error) {
    redirect(`/onboarding?error=${encodeURIComponent(error instanceof Error ? error.message : 'Please sign in again before continuing.')}`);
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc('join_couple_by_invite_code', { raw_invite_code: inviteCode });

  if (error) redirect(`/onboarding?error=${encodeURIComponent(friendlySupabaseMessage(error.message, 'We could not join that couple. Check the invite code and try again.'))}`);
  redirect('/dashboard');
}

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ created?: string; error?: string }> }) {
  const params = await searchParams;
  const context = await getCoupleContext();

  if (context.couple && !params.created) redirect('/dashboard');

  return (
    <main className="min-h-screen bg-romantic-radial px-5 py-5">
      <div className="mx-auto flex max-w-5xl items-center justify-between">
        <AppLogo />
        <form action="/auth/signout" method="post"><Button variant="secondary" type="submit">Sign out</Button></form>
      </div>
      <section className="mx-auto grid max-w-5xl gap-6 py-8 lg:grid-cols-[1fr_0.9fr] lg:items-start">
        <MobileCard>
          <p className="text-sm font-bold uppercase tracking-[0.24em] text-rose-400">Pair your story</p>
          <h1 className="mt-3 text-4xl font-black text-plum">Create or join your private couple space.</h1>
          <p className="mt-3 text-slate-600">OurStory is designed for two people. Start a new shared space and invite your partner, or enter the invite code they already created.</p>
          {params.error ? <p className="mt-5 rounded-3xl bg-rose-50 p-4 text-sm font-semibold text-rosewood">{params.error}</p> : null}
          {context.couple && params.created ? (
            <div className="mt-6 rounded-[1.5rem] bg-gradient-to-br from-rose-500 to-fuchsia-500 p-5 text-white">
              <p className="text-sm font-bold uppercase tracking-[0.22em] text-white/75">Invite code ready</p>
              <p className="mt-3 text-4xl font-black tracking-[0.18em]">{context.couple.invite_code}</p>
              <p className="mt-3 text-sm leading-6 text-white/90">Share this code with your partner. They can join from this same onboarding screen.</p>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <CopyButton value={context.couple.invite_code} />
                <ButtonLink href="/dashboard" variant="secondary">Continue to dashboard</ButtonLink>
              </div>
            </div>
          ) : null}
        </MobileCard>

        <div className="space-y-6">
          <MobileCard>
            <h2 className="text-2xl font-black text-plum">Create our couple</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">You will become the owner, and Supabase will generate an invite code automatically.</p>
            <form action={createCouple} className="mt-5 grid gap-4">
              <label className="grid gap-2 text-sm font-bold text-plum">
                Couple name
                <input className="rounded-2xl border-rose-100 bg-white/80 px-4 py-3 text-base shadow-sm focus:border-rose-300 focus:ring-rose-200" name="name" defaultValue="Our Story" maxLength={80} />
              </label>
              <Button type="submit" className="w-full">Create our couple</Button>
            </form>
          </MobileCard>

          <MobileCard>
            <h2 className="text-2xl font-black text-plum">Join with invite code</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Enter your partner's code. Couples are limited to two members.</p>
            <form action={joinCouple} className="mt-5 grid gap-4">
              <label className="grid gap-2 text-sm font-bold text-plum">
                Invite code
                <input className="rounded-2xl border-rose-100 bg-white/80 px-4 py-3 text-base uppercase tracking-[0.18em] shadow-sm focus:border-rose-300 focus:ring-rose-200" name="invite_code" minLength={4} maxLength={20} required placeholder="ABC123LOVE" />
              </label>
              <Button type="submit" variant="secondary" className="w-full">Join partner</Button>
            </form>
          </MobileCard>
        </div>
      </section>
    </main>
  );
}
