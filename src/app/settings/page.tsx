import { redirect } from 'next/navigation';
import { Button } from '@/components/button';
import { NotificationPermissionCard } from '@/components/notifications/notification-permission-card';
import { AppLogo, MobileCard } from '@/components/shell';
import { ensureNotificationSettings } from '@/lib/notifications';
import { requireCouple } from '@/lib/couples';
import { createClient } from '@/lib/supabase/server';

async function updateNotificationSettings(formData: FormData) {
  'use server';

  const { user } = await requireCouple();
  const supabase = await createClient();
  const reminderTime = String(formData.get('reminder_time') || '20:00');
  const timezone = String(formData.get('timezone') || 'UTC');

  const { error } = await supabase.from('notification_settings').upsert({
    user_id: user.id,
    daily_question_reminder: formData.get('daily_question_reminder') === 'on',
    partner_answered: formData.get('partner_answered') === 'on',
    new_memory_added: formData.get('new_memory_added') === 'on',
    new_date_idea_added: formData.get('new_date_idea_added') === 'on',
    streak_reminder: formData.get('streak_reminder') === 'on',
    reminder_time: reminderTime,
    timezone
  }, { onConflict: 'user_id' });

  if (error) redirect(`/settings?error=${encodeURIComponent('We could not save notification preferences. Please try again.')}`);
  redirect('/settings?saved=1');
}

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const params = await searchParams;
  await requireCouple();
  const settings = await ensureNotificationSettings();

  return (
    <main className="min-h-screen bg-romantic-radial px-5 py-5">
      <div className="mx-auto flex max-w-4xl items-center justify-between">
        <AppLogo />
        <form action="/auth/signout" method="post"><Button variant="secondary" type="submit">Sign out</Button></form>
      </div>
      <section className="mx-auto grid max-w-4xl gap-6 py-8 lg:grid-cols-[0.9fr_1.1fr]">
        <NotificationPermissionCard publicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY} />
        <MobileCard>
          <p className="text-sm font-bold uppercase tracking-[0.24em] text-rose-400">Settings</p>
          <h1 className="mt-3 text-3xl font-black text-plum">Notification preferences</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">Choose the gentle nudges you want from OurStory. Browser permission is requested only after your couple space exists.</p>
          {params.saved ? <p className="mt-4 rounded-2xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">Preferences saved.</p> : null}
          {params.error ? <p className="mt-4 rounded-2xl bg-rose-50 p-3 text-sm font-semibold text-rosewood">{params.error}</p> : null}
          <form action={updateNotificationSettings} className="mt-6 grid gap-4">
            <Preference name="daily_question_reminder" label="Daily question reminder" defaultChecked={settings.daily_question_reminder} />
            <Preference name="partner_answered" label="Your partner answered" defaultChecked={settings.partner_answered} />
            <Preference name="new_memory_added" label="New memory added" defaultChecked={settings.new_memory_added} />
            <Preference name="new_date_idea_added" label="New date idea added" defaultChecked={settings.new_date_idea_added} />
            <Preference name="streak_reminder" label="Streak reminder" defaultChecked={settings.streak_reminder} />
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-bold text-plum">Reminder time<input className="rounded-2xl border-rose-100 bg-white/80 px-4 py-3 text-base shadow-sm focus:border-rose-300 focus:ring-rose-200" type="time" name="reminder_time" defaultValue={settings.reminder_time.slice(0, 5)} /></label>
              <label className="grid gap-2 text-sm font-bold text-plum">Timezone<input className="rounded-2xl border-rose-100 bg-white/80 px-4 py-3 text-base shadow-sm focus:border-rose-300 focus:ring-rose-200" name="timezone" defaultValue={settings.timezone} /></label>
            </div>
            <Button type="submit">Save preferences</Button>
          </form>
        </MobileCard>
      </section>
    </main>
  );
}

function Preference({ name, label, defaultChecked }: { name: string; label: string; defaultChecked: boolean }) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-3xl bg-white/70 p-4 text-sm font-bold text-plum">
      <span>{label}</span>
      <input className="size-5 rounded border-rose-200 text-rose-500 focus:ring-rose-200" type="checkbox" name={name} defaultChecked={defaultChecked} />
    </label>
  );
}
