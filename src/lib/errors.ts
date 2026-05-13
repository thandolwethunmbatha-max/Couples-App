export function friendlySupabaseMessage(message: string | undefined, fallback: string) {
  if (!message) return fallback;

  const normalized = message.toLowerCase();

  if (normalized.includes('row-level security') || normalized.includes('violates row-level security')) {
    return 'Your permissions were not ready for that action. Please refresh and try again.';
  }

  if (normalized.includes('foreign key') || normalized.includes('violates foreign key')) {
    return 'We could not link that record to your account. Please refresh and try again.';
  }

  if (normalized.includes('duplicate key')) {
    return 'That has already been saved.';
  }

  if (normalized.includes('already has two members')) {
    return 'This couple already has two members.';
  }

  if (normalized.includes('no couple was found')) {
    return 'No couple was found for that invite code.';
  }

  if (normalized.includes('recipient must be a member')) {
    return 'Awards can only be sent to your partner in this couple.';
  }

  return fallback;
}
