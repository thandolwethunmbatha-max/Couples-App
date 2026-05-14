import { cache, type CSSProperties } from 'react';
import { createClient } from '@/lib/supabase/server';

export type DesignSettings = {
  app_display_name: string;
  primary_color: string;
  secondary_color: string;
  background_gradient: string;
  card_radius: string;
  button_style: 'pill' | 'rounded' | 'soft';
  dashboard_heading: string;
  logo_url: string | null;
  theme_mode: 'soft' | 'romantic' | 'dark' | 'playful';
};

export const defaultDesignSettings: DesignSettings = {
  app_display_name: 'OurStory',
  primary_color: '#f43f5e',
  secondary_color: '#a855f7',
  background_gradient: 'linear-gradient(135deg, #fff8ea 0%, #fff1f5 44%, #f5efff 100%)',
  card_radius: '2rem',
  button_style: 'pill',
  dashboard_heading: 'Ready to make tonight feel intentional?',
  logo_url: null,
  theme_mode: 'romantic'
};

export const getCurrentDesignSettings = cache(async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return defaultDesignSettings;

  const { data: membership } = await supabase
    .from('couple_members')
    .select('couple_id')
    .eq('user_id', user.id)
    .order('joined_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!membership?.couple_id) return defaultDesignSettings;

  const { data } = await supabase
    .from('couple_design_settings')
    .select('app_display_name, primary_color, secondary_color, background_gradient, card_radius, button_style, dashboard_heading, logo_url, theme_mode')
    .eq('couple_id', membership.couple_id)
    .maybeSingle();

  return { ...defaultDesignSettings, ...(data ?? {}) } as DesignSettings;
});

export function designStyle(settings: DesignSettings) {
  return {
    '--ourstory-primary': settings.primary_color,
    '--ourstory-secondary': settings.secondary_color,
    '--ourstory-gradient': settings.background_gradient,
    '--ourstory-card-radius': settings.card_radius,
    '--ourstory-button-radius': settings.button_style === 'pill' ? '9999px' : settings.button_style === 'rounded' ? '1rem' : '1.5rem'
  } as CSSProperties;
}
