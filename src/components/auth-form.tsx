import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Button } from '@/components/button';
import { MobileCard } from '@/components/shell';
import { createClient } from '@/lib/supabase/server';
import { absoluteUrl } from '@/lib/utils';

type SearchParams = Promise<{ next?: string; message?: string }>;

async function signIn(formData: FormData) {
  'use server';

  const supabase = await createClient();
  const email = String(formData.get('email'));
  const password = String(formData.get('password'));
  const next = String(formData.get('next') || '/dashboard');

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect(`/auth/login?message=${encodeURIComponent(error.message)}`);

  redirect(next.startsWith('/') ? next : '/dashboard');
}

async function signUp(formData: FormData) {
  'use server';

  const supabase = await createClient();
  const email = String(formData.get('email'));
  const password = String(formData.get('password'));

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: absoluteUrl('/auth/callback') }
  });

  if (error) redirect(`/auth/signup?message=${encodeURIComponent(error.message)}`);
  redirect('/auth/login?message=Check your email to confirm your account, then sign in.');
}

export async function AuthForm({ mode, searchParams }: { mode: 'login' | 'signup'; searchParams: SearchParams }) {
  const params = await searchParams;
  const isLogin = mode === 'login';

  return (
    <MobileCard>
      <h1 className="text-3xl font-black text-plum">{isLogin ? 'Welcome back' : 'Create your couple space'}</h1>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        {isLogin ? 'Sign in to continue your shared story.' : 'Start with your account. You can invite your partner after onboarding.'}
      </p>
      {params.message ? <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-medium text-rosewood">{params.message}</p> : null}
      <form action={isLogin ? signIn : signUp} className="mt-6 grid gap-4">
        <input type="hidden" name="next" value={params.next ?? '/dashboard'} />
        <label className="grid gap-2 text-sm font-bold text-plum">
          Email
          <input className="rounded-2xl border-rose-100 bg-white/80 px-4 py-3 text-base shadow-sm focus:border-rose-300 focus:ring-rose-200" name="email" type="email" autoComplete="email" required placeholder="you@example.com" />
        </label>
        <label className="grid gap-2 text-sm font-bold text-plum">
          Password
          <input className="rounded-2xl border-rose-100 bg-white/80 px-4 py-3 text-base shadow-sm focus:border-rose-300 focus:ring-rose-200" name="password" type="password" autoComplete={isLogin ? 'current-password' : 'new-password'} minLength={8} required placeholder="••••••••" />
        </label>
        <Button type="submit" className="mt-2 w-full">{isLogin ? 'Log in' : 'Create account'}</Button>
      </form>
      <p className="mt-5 text-center text-sm text-slate-600">
        {isLogin ? 'New to OurStory?' : 'Already have an account?'}{' '}
        <Link className="font-bold text-rose-600" href={isLogin ? '/auth/signup' : '/auth/login'}>
          {isLogin ? 'Create one' : 'Log in'}
        </Link>
      </p>
    </MobileCard>
  );
}
