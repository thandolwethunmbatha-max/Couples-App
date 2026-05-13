import { ArrowRight } from 'lucide-react';
import { ButtonLink } from '@/components/button';
import { type Game } from '@/lib/games/catalog';

export function GameCard({ game }: { game: Game }) {
  const Icon = game.icon;

  return (
    <article className="flex h-full flex-col rounded-[2rem] border border-rose-100 bg-white/80 p-5 shadow-sm backdrop-blur transition hover:-translate-y-1 hover:shadow-glow">
      <div className="mb-5 flex items-center justify-between">
        <span className="grid size-12 place-items-center rounded-2xl bg-rose-100 text-rose-600">
          <Icon className="size-6" />
        </span>
        <span className="rounded-full bg-lavender px-3 py-1 text-xs font-bold text-plum">{game.duration}</span>
      </div>
      <h3 className="text-xl font-black text-plum">{game.title}</h3>
      <p className="mt-2 flex-1 text-sm leading-6 text-slate-600">{game.description}</p>
      <div className="mt-5 flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-[0.2em] text-rose-400">{game.tone}</span>
        <ButtonLink href={`/games/${game.slug}`} variant="secondary" className="gap-2">
          Play <ArrowRight className="size-4" />
        </ButtonLink>
      </div>
    </article>
  );
}
