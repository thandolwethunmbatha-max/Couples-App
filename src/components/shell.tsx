import Link from 'next/link';
import { Heart } from 'lucide-react';
import { ButtonLink } from '@/components/button';

export function AppLogo() {
  return (
    <Link className="flex items-center gap-2 text-lg font-black tracking-tight text-plum" href="/">
      <span className="grid size-10 place-items-center rounded-2xl bg-rose-500 text-white shadow-glow">
        <Heart className="size-5 fill-current" />
      </span>
      OurStory
    </Link>
  );
}

export function MarketingHeader() {
  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5">
      <AppLogo />
      <nav className="flex items-center gap-2">
        <ButtonLink href="/auth/login" variant="ghost">Log in</ButtonLink>
        <ButtonLink href="/auth/signup" className="hidden sm:inline-flex">Start</ButtonLink>
      </nav>
    </header>
  );
}

export function MobileCard({ children }: { children: React.ReactNode }) {
  return <section className="rounded-[2rem] border border-white/70 bg-white/75 p-5 shadow-glow backdrop-blur md:p-7">{children}</section>;
}
