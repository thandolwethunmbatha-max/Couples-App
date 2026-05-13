import { CalendarHeart, HeartHandshake, MessageCircleHeart, Sparkles, Users } from 'lucide-react';
import { Button, ButtonLink } from '@/components/button';
import { CopyButton } from '@/components/copy-button';
import { GameCard } from '@/components/game-card';
import { AppLogo, MobileCard } from '@/components/shell';
import { games } from '@/lib/games/catalog';
import { requireCouple } from '@/lib/couples';

export default async function DashboardPage() {
  const { user, couple, members, partner, membership } = await requireCouple();
  const firstName = user.email?.split('@')[0] ?? 'lovebirds';
  const partnerJoined = Boolean(partner);

  return (
    <main className="min-h-screen bg-romantic-radial px-5 py-5">
      <div className="mx-auto flex max-w-6xl items-center justify-between">
        <AppLogo />
        <form action="/auth/signout" method="post"><Button variant="secondary" type="submit">Sign out</Button></form>
      </div>
      <section className="mx-auto grid max-w-6xl gap-6 py-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <MobileCard>
            <p className="text-sm font-bold uppercase tracking-[0.24em] text-rose-400">{couple.name}</p>
            <h1 className="mt-3 text-4xl font-black text-plum">Hi, {firstName}. Ready to make tonight feel intentional?</h1>
            <p className="mt-3 max-w-2xl text-slate-600">Your shared space is live. Invite your partner, answer a prompt, choose a game, or save a new memory from any device.</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <Stat icon={MessageCircleHeart} label="Prompts" value="100" />
              <Stat icon={Users} label="Members" value={`${members.length}/2`} />
              <Stat icon={Sparkles} label="Active games" value="4" />
            </div>
          </MobileCard>
          <div className="grid gap-4 md:grid-cols-2">
            {games.map((game) => <GameCard key={game.slug} game={game} />)}
          </div>
        </div>
        <aside className="space-y-6">
          <MobileCard>
            <div className="flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-2xl bg-rose-100 text-rose-600"><HeartHandshake className="size-5" /></span>
              <div>
                <h2 className="text-xl font-black text-plum">Partner invite</h2>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-rose-400">{partnerJoined ? 'Partner joined' : 'Waiting for partner'}</p>
              </div>
            </div>
            <div className="mt-5 rounded-[1.5rem] bg-gradient-to-br from-rose-500 to-fuchsia-500 p-5 text-white">
              <p className="text-sm font-bold uppercase tracking-[0.22em] text-white/75">Invite code</p>
              <p className="mt-3 text-4xl font-black tracking-[0.18em]">{couple.invite_code}</p>
              <p className="mt-3 text-sm leading-6 text-white/90">
                {partnerJoined ? 'Your partner has joined. Keep this code private unless you reset your couple setup later.' : 'Share this code with your partner so they can join your private OurStory space.'}
              </p>
            </div>
            <div className="mt-5 grid gap-3">
              <CopyButton value={couple.invite_code} />
              <p className="rounded-3xl bg-white/70 p-4 text-sm leading-6 text-slate-600">
                You are the <strong className="text-plum">{membership.role}</strong>. Couple membership is limited to two people.
              </p>
            </div>
          </MobileCard>
          <MobileCard>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-rose-400">Streak glow</p>
            <div className="mt-3 flex items-end gap-2"><span className="text-5xl">🔥</span><div><p className="text-3xl font-black text-plum">3 days</p><p className="text-sm text-slate-600">Keep the connection ritual warm with one prompt tonight.</p></div></div>
          </MobileCard>
          <MobileCard>
            <h2 className="text-xl font-black text-plum">Tonight's shortcut</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Start with the question jar and save your favorite answer to the memory lane timeline.</p>
            <div className="mt-5 grid gap-3"><ButtonLink href="/games/question-jar" className="w-full">Draw a question</ButtonLink><ButtonLink href="/settings" variant="secondary" className="w-full">Notification settings</ButtonLink></div>
          </MobileCard>
        </aside>
      </section>
    </main>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof MessageCircleHeart | typeof CalendarHeart; label: string; value: string }) {
  return (
    <div className="rounded-3xl bg-white/70 p-4">
      <Icon className="size-5 text-rose-500" />
      <p className="mt-3 text-2xl font-black text-plum">{value}</p>
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">{label}</p>
    </div>
  );
}
