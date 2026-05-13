import { NextResponse } from 'next/server';
import { ensureProfile } from '@/lib/profiles';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const user = await ensureProfile();
    const body = await request.json();
    const endpoint = String(body.endpoint || '');
    const p256dh = String(body.keys?.p256dh || '');
    const auth = String(body.keys?.auth || '');

    if (!endpoint || !p256dh || !auth) {
      return NextResponse.json({ error: 'Invalid push subscription.' }, { status: 400 });
    }

    const supabase = await createClient();
    const { error } = await supabase.from('push_subscriptions').upsert(
      {
        user_id: user.id,
        endpoint,
        p256dh,
        auth,
        user_agent: request.headers.get('user-agent') ?? null
      },
      { onConflict: 'endpoint' }
    );

    if (error) return NextResponse.json({ error: 'Could not save this device.' }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 });
  }
}
