import { NextResponse } from 'next/server';
import { sendWebPush } from '@/lib/notifications';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: Request) {
  const configuredSecret = process.env.CRON_SECRET;
  const provided = request.headers.get('authorization')?.replace('Bearer ', '');

  if (configuredSecret && provided !== configuredSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();
    const { data: settings, error: settingsError } = await supabase
      .from('notification_settings')
      .select('user_id, daily_question_reminder, streak_reminder')
      .or('daily_question_reminder.eq.true,streak_reminder.eq.true');

    if (settingsError) return NextResponse.json({ error: 'Could not load notification settings.' }, { status: 500 });

    const userIds = (settings ?? []).map((setting) => setting.user_id);
    if (!userIds.length) return NextResponse.json({ ok: true, sent: 0 });

    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .in('user_id', userIds);

    if (error) return NextResponse.json({ error: 'Could not load subscriptions.' }, { status: 500 });

    let sent = 0;
    await Promise.all((subscriptions ?? []).map(async (subscription) => {
      try {
        await sendWebPush(subscription, {
          title: 'Tonight’s OurStory question is waiting 💗',
          body: 'Open the Question Jar or try one of the new romantic modes together.',
          url: '/games/question-jar'
        });
        sent += 1;
      } catch {
        // Keep cron free-tier friendly: skip failed devices and continue.
      }
    }));

    return NextResponse.json({ ok: true, sent });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Daily reminders failed.' }, { status: 500 });
  }
}
