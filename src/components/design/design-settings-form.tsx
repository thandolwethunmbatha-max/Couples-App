'use client';

import { useMemo, useState, type CSSProperties } from 'react';
import { Button } from '@/components/button';
import { type DesignSettings } from '@/lib/design/settings';

export function DesignSettingsForm({ settings, action }: { settings: DesignSettings; action: (formData: FormData) => void }) {
  const [draft, setDraft] = useState(settings);
  const previewStyle = useMemo(() => ({
    '--ourstory-primary': draft.primary_color,
    '--ourstory-secondary': draft.secondary_color,
    '--ourstory-gradient': draft.background_gradient,
    '--ourstory-card-radius': draft.card_radius,
    '--ourstory-button-radius': draft.button_style === 'pill' ? '9999px' : draft.button_style === 'rounded' ? '1rem' : '1.5rem'
  }) as CSSProperties, [draft]);

  function update<K extends keyof DesignSettings>(key: K, value: DesignSettings[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
      <form action={action} className="grid gap-4 rounded-[var(--ourstory-card-radius,2rem)] bg-white/75 p-5 shadow-glow">
        <Field label="App display name" name="app_display_name" value={draft.app_display_name} onChange={(value) => update('app_display_name', value)} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Primary colour" name="primary_color" type="color" value={draft.primary_color} onChange={(value) => update('primary_color', value)} />
          <Field label="Secondary colour" name="secondary_color" type="color" value={draft.secondary_color} onChange={(value) => update('secondary_color', value)} />
        </div>
        <label className="grid gap-2 text-sm font-bold text-plum">Background gradient<textarea name="background_gradient" value={draft.background_gradient} onChange={(event) => update('background_gradient', event.target.value)} className="min-h-24 rounded-2xl border-rose-100 bg-white/80 px-4 py-3 text-base shadow-sm focus:border-rose-300 focus:ring-rose-200" /></label>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Card radius" name="card_radius" value={draft.card_radius} onChange={(value) => update('card_radius', value)} />
          <label className="grid gap-2 text-sm font-bold text-plum">Button style<select name="button_style" value={draft.button_style} onChange={(event) => update('button_style', event.target.value as DesignSettings['button_style'])} className="rounded-2xl border-rose-100 bg-white/80 px-4 py-3 text-base shadow-sm focus:border-rose-300 focus:ring-rose-200"><option value="pill">Pill</option><option value="rounded">Rounded</option><option value="soft">Soft</option></select></label>
        </div>
        <Field label="Dashboard heading" name="dashboard_heading" value={draft.dashboard_heading} onChange={(value) => update('dashboard_heading', value)} />
        <Field label="Logo/image URL" name="logo_url" value={draft.logo_url ?? ''} onChange={(value) => update('logo_url', value)} />
        <label className="grid gap-2 text-sm font-bold text-plum">Theme mode<select name="theme_mode" value={draft.theme_mode} onChange={(event) => update('theme_mode', event.target.value as DesignSettings['theme_mode'])} className="rounded-2xl border-rose-100 bg-white/80 px-4 py-3 text-base shadow-sm focus:border-rose-300 focus:ring-rose-200"><option value="soft">Soft</option><option value="romantic">Romantic</option><option value="dark">Dark</option><option value="playful">Playful</option></select></label>
        <Button type="submit">Save design settings</Button>
      </form>

      <div style={previewStyle} className="overflow-hidden rounded-[var(--ourstory-card-radius,2rem)] bg-[image:var(--ourstory-gradient)] p-5 shadow-glow">
        <div className="rounded-[var(--ourstory-card-radius,2rem)] bg-white/80 p-5 backdrop-blur">
          <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-2xl bg-[var(--ourstory-primary)] text-white">♥</span><h2 className="text-2xl font-black text-plum">{draft.app_display_name}</h2></div>
          <p className="mt-5 text-sm font-bold uppercase tracking-[0.22em] text-[var(--ourstory-secondary)]">Live preview</p>
          <h3 className="mt-2 text-3xl font-black text-plum">{draft.dashboard_heading}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">This preview updates before saving and the saved style applies globally for couple members.</p>
          <button type="button" className="mt-5 rounded-[var(--ourstory-button-radius)] bg-[var(--ourstory-primary)] px-5 py-3 text-sm font-bold text-white shadow-glow">Preview button</button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, name, value, onChange, type = 'text' }: { label: string; name: string; value: string; onChange: (value: string) => void; type?: string }) {
  return <label className="grid gap-2 text-sm font-bold text-plum">{label}<input type={type} name={name} value={value} onChange={(event) => onChange(event.target.value)} className="rounded-2xl border-rose-100 bg-white/80 px-4 py-3 text-base shadow-sm focus:border-rose-300 focus:ring-rose-200" /></label>;
}
