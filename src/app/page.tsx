import { ArrowRight, HeartPulse, LockKeyhole, Sparkles } from 'lucide-react';
import { ButtonLink } from '@/components/button';
import { MarketingHeader, MobileCard } from '@/components/shell';

const highlights = [
  { icon: HeartPulse, title: 'Daily connection', copy: 'Small rituals, prompts, and reflections built for busy couples.' },
  { icon: LockKeyhole, title: 'Private by default', copy: 'Supabase auth and row-level security keep each couple space separate.' },
  { icon: Sparkles, title: 'Game-led romance', copy: 'Modern flows turn conversations, dates, and memories into playful moments.' }
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-romantic-radial">
      <MarketingHeader />
      <section className="mx-auto grid w-full max-w-6xl gap-8 px-5 pb-16 pt-8 md:grid-cols-[1.05fr_0.95fr] md:items-center md:pt-16">
        <div>
          <p className="mb-4 inline-flex rounded-full bg-white/70 px-4 py-2 text-sm font-bold text-rose-600 ring-1 ring-rose-100">Made for two hearts and one shared story</p>
          <h1 className="text-5xl font-black tracking-tight text-plum sm:text-6xl">A romantic home for your relationship.</h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-slate-700">OurStory helps couples ask better questions, save meaningful memories, plan dates, and celebrate the everyday magic that keeps love alive.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/auth/signup" className="gap-2">Create your space <ArrowRight className="size-4" /></ButtonLink>
            <ButtonLink href="/auth/login" variant="secondary">I already have an account</ButtonLink>
          </div>
        </div>
        <MobileCard>
          <div className="rounded-[1.5rem] bg-gradient-to-br from-rose-500 to-fuchsia-500 p-5 text-white">
            <p className="text-sm font-bold uppercase tracking-[0.25em] text-white/75">Tonight's prompt</p>
            <h2 className="mt-4 text-3xl font-black">What tiny moment from us still makes you smile?</h2>
            <div className="mt-8 rounded-3xl bg-white/18 p-4 backdrop-blur">
              <p className="text-sm leading-6 text-white/90">Answer privately, reveal together, and save the memory to your shared timeline.</p>
            </div>
          </div>
          <div className="mt-5 grid gap-3">
            {highlights.map((item) => (
              <div key={item.title} className="flex gap-3 rounded-3xl bg-white/70 p-4">
                <item.icon className="mt-1 size-5 shrink-0 text-rose-500" />
                <div>
                  <h3 className="font-bold text-plum">{item.title}</h3>
                  <p className="text-sm leading-6 text-slate-600">{item.copy}</p>
                </div>
              </div>
            ))}
          </div>
        </MobileCard>
      </section>
    </main>
  );
}
