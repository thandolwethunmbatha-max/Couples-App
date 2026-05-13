import { NextResponse } from 'next/server';
import { ensureProfile } from '@/lib/profiles';
import { sendWebPush } from '@/lib/notifications';
import { createClient } from '@/lib/supabase/server';

export async function POST() {
  try {
    const user = await ensureProfile();
    const supabase = await createClient();
    const { data: subscriptions } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', user.id);

    await Promise.all((subscriptions ?? []).map((subscription) => sendWebPush(subscription, {
      title: 'OurStory notifications are ready 💌',
      body: 'You will get gentle reminders when love needs a little nudge.',
      url: '/settings'
    }).catch(() => null)));

    return NextResponse.json({ ok: true, sent: subscriptions?.length ?? 0 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not send test notification.' }, { status: 500 });
  }
}
