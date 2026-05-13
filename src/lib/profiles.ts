import { createClient } from '@/lib/supabase/server';

export type AuthenticatedUser = {
  id: string;
  email?: string;
  user_metadata?: { display_name?: string; full_name?: string; name?: string };
};

export async function ensureProfile() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error('Please sign in again before continuing.');
  }

  const metadata = user.user_metadata ?? {};
  const displayName =
    metadata.display_name ||
    metadata.full_name ||
    metadata.name ||
    user.email?.split('@')[0] ||
    'OurStory Partner';

  const { error: profileError } = await supabase.from('profiles').upsert(
    {
      id: user.id,
      display_name: displayName
    },
    { onConflict: 'id' }
  );

  if (profileError) {
    throw new Error('We could not prepare your profile. Please refresh and try again.');
  }

  return user as AuthenticatedUser;
}
