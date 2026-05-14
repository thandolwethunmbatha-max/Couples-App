import Link from 'next/link';
import { Heart } from 'lucide-react';
import { ButtonLink } from '@/components/button';
import { getCurrentDesignSettings } from '@/lib/design/settings';

export async function AppLogo() {
  const design = await getCurrentDesignSettings();

  return (
    <Link className="flex items-center gap-2 text-lg font-black tracking-tight text-plum" href="/">
      <span className="grid size-10 place-items-center overflow-hidden rounded-2xl bg-[var(--ourstory-primary,#f43f5e)] text-white shadow-glow">
        {design.logo_url ? <img src={design.logo_url} alt="" className="size-full object-cover" /> : <Heart className="size-5 fill-current" />}
      </span>
      {design.app_display_name}
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
  return <section className="rounded-[var(--ourstory-card-radius,2rem)] border border-white/70 bg-white/75 p-5 shadow-glow backdrop-blur md:p-7">{children}</section>;
}
