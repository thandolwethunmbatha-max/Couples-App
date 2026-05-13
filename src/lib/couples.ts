import { cache } from 'react';
import { redirect } from 'next/navigation';
import { ensureProfile } from '@/lib/profiles';
import { createClient } from '@/lib/supabase/server';

export type CoupleMember = {
  user_id: string;
  role: 'owner' | 'partner';
  joined_at: string;
};

export type Couple = {
  id: string;
  name: string;
  invite_code: string;
  created_by: string;
  created_at: string;
};

export type CoupleContext = {
  user: { id: string; email?: string };
  couple: Couple | null;
  membership: CoupleMember | null;
  members: CoupleMember[];
  partner: CoupleMember | null;
};

export const getCoupleContext = cache(async (): Promise<CoupleContext> => {
  let user;

  try {
    user = await ensureProfile();
  } catch {
    redirect('/auth/login');
  }

  const supabase = await createClient();

  const { data: memberships, error: membershipError } = await supabase
    .from('couple_members')
    .select('user_id, role, joined_at, couples(id, name, invite_code, created_by, created_at)')
    .eq('user_id', user.id)
    .order('joined_at', { ascending: true })
    .limit(1);

  if (membershipError || !memberships?.length) {
    return { user, couple: null, membership: null, members: [], partner: null };
  }

  const membershipRow = memberships[0] as unknown as CoupleMember & { couples: Couple | Couple[] | null };
  const couple = Array.isArray(membershipRow.couples) ? membershipRow.couples[0] : membershipRow.couples;

  if (!couple) return { user, couple: null, membership: null, members: [], partner: null };

  const { data: members } = await supabase
    .from('couple_members')
    .select('user_id, role, joined_at')
    .eq('couple_id', couple.id)
    .order('joined_at', { ascending: true });

  const normalizedMembers = (members ?? []) as CoupleMember[];
  const partner = normalizedMembers.find((member) => member.user_id !== user.id) ?? null;

  return {
    user,
    couple,
    membership: {
      user_id: membershipRow.user_id,
      role: membershipRow.role,
      joined_at: membershipRow.joined_at
    },
    members: normalizedMembers,
    partner
  };
});

export async function requireCouple() {
  const context = await getCoupleContext();
  if (!context.couple) redirect('/onboarding');
  return context as CoupleContext & { couple: Couple; membership: CoupleMember };
}
