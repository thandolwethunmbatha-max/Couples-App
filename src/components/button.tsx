import Link from 'next/link';
import { type AnchorHTMLAttributes, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost';

const variants: Record<Variant, string> = {
  primary: 'bg-[var(--ourstory-primary,#f43f5e)] text-white shadow-glow hover:brightness-95',
  secondary: 'bg-white/85 text-rosewood ring-1 ring-rose-100 hover:bg-white',
  ghost: 'text-rosewood hover:bg-white/60'
};

const base = 'inline-flex min-h-11 items-center justify-center rounded-[var(--ourstory-button-radius,9999px)] px-5 py-2.5 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-rose-300 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60';

export function Button({ className, variant = 'primary', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button className={cn(base, variants[variant], className)} {...props} />;
}

export function ButtonLink({ className, variant = 'primary', children, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; variant?: Variant; children: ReactNode }) {
  return (
    <Link className={cn(base, variants[variant], className)} {...props}>
      {children}
    </Link>
  );
}
