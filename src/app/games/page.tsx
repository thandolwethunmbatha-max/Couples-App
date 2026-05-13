import { GameCard } from '@/components/game-card';
import { AppLogo } from '@/components/shell';
import { games } from '@/lib/games/catalog';

export default function GamesPage() {
  return (
    <main className="min-h-screen bg-romantic-radial px-5 py-5">
      <div className="mx-auto max-w-6xl"><AppLogo /></div>
      <section className="mx-auto max-w-6xl py-8">
        <p className="text-sm font-bold uppercase tracking-[0.24em] text-rose-400">Game engine</p>
        <h1 className="mt-3 text-4xl font-black text-plum">Choose a relationship flow.</h1>
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {games.map((game) => <GameCard key={game.slug} game={game} />)}
        </div>
      </section>
    </main>
  );
}
