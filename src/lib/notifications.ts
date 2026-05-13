import { createClient } from '@/lib/supabase/server';
import { ensureProfile } from '@/lib/profiles';

export type NotificationSettings = {
  user_id: string;
  daily_question_reminder: boolean;
  partner_answered: boolean;
  new_memory_added: boolean;
  new_date_idea_added: boolean;
  streak_reminder: boolean;
  reminder_time: string;
  timezone: string;
};

export async function ensureNotificationSettings() {
  const user = await ensureProfile();
  const supabase = await createClient();
  const defaults = {
    user_id: user.id,
    daily_question_reminder: true,
    partner_answered: true,
    new_memory_added: true,
    new_date_idea_added: true,
    streak_reminder: true,
    reminder_time: '20:00',
    timezone: 'UTC'
  };

  const columns = 'user_id, daily_question_reminder, partner_answered, new_memory_added, new_date_idea_added, streak_reminder, reminder_time, timezone';
  const { data: existing } = await supabase
    .from('notification_settings')
    .select(columns)
    .eq('user_id', user.id)
    .maybeSingle();

  if (existing) return existing as NotificationSettings;

  const { data, error } = await supabase
    .from('notification_settings')
    .insert(defaults)
    .select(columns)
    .single();

  if (error || !data) return defaults as NotificationSettings;
  return data as NotificationSettings;
}

export async function sendWebPush(subscription: { endpoint: string; p256dh: string; auth: string }, payload: Record<string, string>) {
  const subject = process.env.VAPID_SUBJECT ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'mailto:hello@ourstory.app';
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;

  if (!publicKey || !privateKey) {
    throw new Error('Missing VAPID keys. Set NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY.');
  }

  const importer = new Function('specifier', 'return import(specifier)') as (specifier: string) => Promise<any>;
  const webPushModule = await importer('web-push');
  const webPush = webPushModule.default ?? webPushModule;

  webPush.setVapidDetails(subject, publicKey, privateKey);

  return webPush.sendNotification(
    {
      endpoint: subscription.endpoint,
      keys: { p256dh: subscription.p256dh, auth: subscription.auth }
    },
    JSON.stringify(payload)
  );
}


export async function notifyPartner(coupleId: string, actorUserId: string, preference: keyof Pick<NotificationSettings, 'partner_answered' | 'new_memory_added' | 'new_date_idea_added' | 'streak_reminder'>, payload: Record<string, string>) {
  try {
    const { createAdminClient } = await import('@/lib/supabase/admin');
    const supabase = createAdminClient();
    const { data: partners } = await supabase
      .from('couple_members')
      .select('user_id')
      .eq('couple_id', coupleId)
      .neq('user_id', actorUserId)
      .limit(1);

    const partnerId = partners?.[0]?.user_id;
    if (!partnerId) return;

    const { data: settings } = await supabase
      .from('notification_settings')
      .select(preference)
      .eq('user_id', partnerId)
      .maybeSingle();

    if (settings && (settings as Record<string, boolean | null>)[preference] === false) return;

    const { data: subscriptions } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', partnerId);

    await Promise.all((subscriptions ?? []).map((subscription) => sendWebPush(subscription, payload).catch(() => null)));
  } catch {
    // Notifications should never block the core couple/game flows.
  }
}
