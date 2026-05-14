import { redirect } from 'next/navigation';
import { Button } from '@/components/button';
import { DesignSettingsForm } from '@/components/design/design-settings-form';
import { AppLogo, MobileCard } from '@/components/shell';
import { requireCouple } from '@/lib/couples';
import { defaultDesignSettings } from '@/lib/design/settings';
import { createClient } from '@/lib/supabase/server';

async function saveDesignSettings(formData: FormData) {
  'use server';
  const { couple } = await requireCouple();
  const supabase = await createClient();
  const { error } = await supabase.from('couple_design_settings').upsert({
    couple_id: couple.id,
    app_display_name: String(formData.get('app_display_name') || 'OurStory'),
    primary_color: String(formData.get('primary_color') || '#f43f5e'),
    secondary_color: String(formData.get('secondary_color') || '#a855f7'),
    background_gradient: String(formData.get('background_gradient') || defaultDesignSettings.background_gradient),
    card_radius: String(formData.get('card_radius') || '2rem'),
    button_style: String(formData.get('button_style') || 'pill'),
    dashboard_heading: String(formData.get('dashboard_heading') || defaultDesignSettings.dashboard_heading),
    logo_url: String(formData.get('logo_url') || '') || null,
    theme_mode: String(formData.get('theme_mode') || 'romantic')
  }, { onConflict: 'couple_id' });

  if (error) redirect('/design?error=We could not save design settings. Please try again.');
  redirect('/design?saved=1');
}

export default async function DesignPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const params = await searchParams;
  const { couple } = await requireCouple();
  const supabase = await createClient();
  const { data } = await supabase
    .from('couple_design_settings')
    .select('app_display_name, primary_color, secondary_color, background_gradient, card_radius, button_style, dashboard_heading, logo_url, theme_mode')
    .eq('couple_id', couple.id)
    .maybeSingle();

  const settings = { ...defaultDesignSettings, ...(data ?? {}) };

  return (
    <main className="min-h-screen bg-romantic-radial px-5 py-5">
      <div className="mx-auto flex max-w-5xl items-center justify-between"><AppLogo /><form action="/auth/signout" method="post"><Button variant="secondary" type="submit">Sign out</Button></form></div>
      <section className="mx-auto max-w-5xl py-8">
        <MobileCard>
          <p className="text-sm font-bold uppercase tracking-[0.24em] text-rose-400">Private design settings</p>
          <h1 className="mt-3 text-4xl font-black text-plum">Customize your OurStory space.</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">Only authenticated members of {couple.name} can edit these settings. Safe defaults apply until you save.</p>
          {params.saved ? <p className="mt-4 rounded-2xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">Design settings saved.</p> : null}
          {params.error ? <p className="mt-4 rounded-2xl bg-rose-50 p-3 text-sm font-semibold text-rosewood">{params.error}</p> : null}
          <div className="mt-6"><DesignSettingsForm settings={settings} action={saveDesignSettings} /></div>
        </MobileCard>
      </section>
    </main>
  );
}
