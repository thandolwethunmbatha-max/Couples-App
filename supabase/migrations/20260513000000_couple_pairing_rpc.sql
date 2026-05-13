-- Couple pairing hardening for deployed OurStory projects.
-- This migration is needed because RLS intentionally hides couples from non-members,
-- so joining by invite code must happen through a SECURITY DEFINER function.

create or replace function public.enforce_two_person_couple()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  member_count integer;
begin
  select count(*) into member_count
  from public.couple_members
  where couple_id = new.couple_id;

  if member_count >= 2 then
    raise exception 'This couple already has two members.';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_two_person_couple_before_insert on public.couple_members;
create trigger enforce_two_person_couple_before_insert
before insert on public.couple_members
for each row execute function public.enforce_two_person_couple();

drop policy if exists "Users can join themselves" on public.couple_members;

create or replace function public.join_couple_by_invite_code(raw_invite_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_couple_id uuid;
  member_count integer;
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'You must be signed in to join a couple.';
  end if;

  select id into target_couple_id
  from public.couples
  where invite_code = upper(trim(raw_invite_code));

  if target_couple_id is null then
    raise exception 'No couple was found for that invite code.';
  end if;

  perform 1 from public.couples where id = target_couple_id for update;

  if exists (
    select 1 from public.couple_members
    where couple_id = target_couple_id and user_id = current_user_id
  ) then
    return target_couple_id;
  end if;

  select count(*) into member_count
  from public.couple_members
  where couple_id = target_couple_id;

  if member_count >= 2 then
    raise exception 'This couple already has two members.';
  end if;

  insert into public.couple_members (couple_id, user_id, role)
  values (target_couple_id, current_user_id, 'partner');

  return target_couple_id;
end;
$$;

grant execute on function public.join_couple_by_invite_code(text) to authenticated;
