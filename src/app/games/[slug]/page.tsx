import { notFound } from 'next/navigation';
import { ButtonLink } from '@/components/button';
import { AppLogo, MobileCard } from '@/components/shell';
import { getGame, games } from '@/lib/games/catalog';

export function generateStaticParams() {
  return games.map((game) => ({ slug: game.slug }));
}

export default async function GameFlowPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const game = getGame(slug);
  if (!game) notFound();
  const Icon = game.icon;

  return (
    <main className="min-h-screen bg-romantic-radial px-5 py-5">
      <div className="mx-auto max-w-4xl"><AppLogo /></div>
      <section className="mx-auto max-w-4xl py-8">
        <MobileCard>
          <div className="grid gap-6 md:grid-cols-[auto_1fr] md:items-start">
            <span className="grid size-16 place-items-center rounded-3xl bg-rose-100 text-rose-600"><Icon className="size-8" /></span>
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.24em] text-rose-400">{game.tone} flow · {game.duration}</p>
              <h1 className="mt-2 text-4xl font-black text-plum">{game.title}</h1>
              <p className="mt-3 text-lg leading-8 text-slate-600">{game.description}</p>
            </div>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-4">
            {game.steps.map((step, index) => (
              <div key={step} className="rounded-3xl bg-white/75 p-4">
                <span className="text-xs font-black uppercase tracking-[0.18em] text-rose-400">Step {index + 1}</span>
                <p className="mt-2 font-bold text-plum">{step}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 rounded-[1.5rem] bg-gradient-to-br from-rose-500 to-fuchsia-500 p-5 text-white">
            <h2 className="text-2xl font-black">Production flow placeholder</h2>
            <p className="mt-2 text-sm leading-6 text-white/90">This scaffold establishes the route, protected access, reusable game metadata, and UI shell. The next step is wiring session rows, turn state, partner reveals, and answer persistence to Supabase.</p>
          </div>
          <ButtonLink href="/dashboard" variant="secondary" className="mt-6">Back to dashboard</ButtonLink>
        </MobileCard>
      </section>
    </main>
  );
}
