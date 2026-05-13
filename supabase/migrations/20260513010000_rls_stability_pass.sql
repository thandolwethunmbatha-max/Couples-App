-- OurStory RLS stability pass.
-- Safely updates helper functions, triggers, and policies without dropping tables,
-- deleting data, or disabling row-level security.

create extension if not exists "pgcrypto";

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'display_name',
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(new.email, '@', 1),
      'OurStory Partner'
    ),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do update
    set display_name = coalesce(public.profiles.display_name, excluded.display_name),
        avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url),
        updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.is_couple_member(target_couple_id uuid, target_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.couple_members cm
    where cm.couple_id = target_couple_id
      and cm.user_id = target_user_id
  );
$$;

create or replace function public.is_couple_owner(target_couple_id uuid, target_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.couple_members cm
    where cm.couple_id = target_couple_id
      and cm.user_id = target_user_id
      and cm.role = 'owner'
  );
$$;

create or replace function public.can_access_session(target_session_id uuid, target_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.game_sessions gs
    join public.couple_members cm on cm.couple_id = gs.couple_id
    where gs.id = target_session_id
      and cm.user_id = target_user_id
  );
$$;

create or replace function public.enforce_two_person_couple()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  member_count integer;
begin
  if exists (
    select 1
    from public.couple_members cm
    where cm.couple_id = new.couple_id
      and cm.user_id = new.user_id
  ) then
    raise exception 'This user is already a member of this couple.';
  end if;

  select count(*) into member_count
  from public.couple_members cm
  where cm.couple_id = new.couple_id;

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

create or replace function public.handle_new_couple()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.couple_members (couple_id, user_id, role)
  values (new.id, new.created_by, 'owner')
  on conflict (couple_id, user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_couple_created on public.couples;
create trigger on_couple_created
after insert on public.couples
for each row execute function public.handle_new_couple();

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

  select c.id into target_couple_id
  from public.couples c
  where c.invite_code = upper(trim(raw_invite_code));

  if target_couple_id is null then
    raise exception 'No couple was found for that invite code.';
  end if;

  perform 1 from public.couples where id = target_couple_id for update;

  if exists (
    select 1 from public.couple_members cm
    where cm.couple_id = target_couple_id and cm.user_id = current_user_id
  ) then
    return target_couple_id;
  end if;

  select count(*) into member_count
  from public.couple_members cm
  where cm.couple_id = target_couple_id;

  if member_count >= 2 then
    raise exception 'This couple already has two members.';
  end if;

  insert into public.couple_members (couple_id, user_id, role)
  values (target_couple_id, current_user_id, 'partner')
  on conflict (couple_id, user_id) do nothing;

  return target_couple_id;
end;
$$;

alter table public.profiles enable row level security;
alter table public.couples enable row level security;
alter table public.couple_members enable row level security;
alter table public.questions enable row level security;
alter table public.game_sessions enable row level security;
alter table public.answers enable row level security;
alter table public.memories enable row level security;
alter table public.date_ideas enable row level security;
alter table public.awards enable row level security;

-- Profiles

drop policy if exists "Profiles are visible to their owner" on public.profiles;
drop policy if exists "Profiles can update themselves" on public.profiles;
drop policy if exists "Profiles can insert themselves" on public.profiles;
drop policy if exists "Profiles are readable by their owner" on public.profiles;
drop policy if exists "Profiles are readable by same-couple members" on public.profiles;

create policy "Profiles are readable by their owner"
on public.profiles for select
to authenticated
using (auth.uid() = id);

create policy "Profiles can insert themselves"
on public.profiles for insert
to authenticated
with check (auth.uid() = id);

create policy "Profiles can update themselves"
on public.profiles for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

-- Couples

drop policy if exists "Couple members can read their couples" on public.couples;
drop policy if exists "Authenticated users can create couples" on public.couples;
drop policy if exists "Couple owners can update couples" on public.couples;

create policy "Couple members can read their couples"
on public.couples for select
to authenticated
using (public.is_couple_member(id));

create policy "Authenticated users can create couples"
on public.couples for insert
to authenticated
with check (created_by = auth.uid());

create policy "Couple owners can update couples"
on public.couples for update
to authenticated
using (public.is_couple_owner(id))
with check (public.is_couple_owner(id));

-- Couple members

drop policy if exists "Members can read memberships" on public.couple_members;
drop policy if exists "Users can join themselves" on public.couple_members;
drop policy if exists "Users can insert their own membership through trusted flows" on public.couple_members;

create policy "Members can read memberships"
on public.couple_members for select
to authenticated
using (user_id = auth.uid() or public.is_couple_member(couple_id));

create policy "Users can insert their own membership through trusted flows"
on public.couple_members for insert
to authenticated
with check (user_id = auth.uid() and public.is_couple_member(couple_id));

-- Questions

drop policy if exists "Questions are readable by authenticated users" on public.questions;

create policy "Questions are readable by authenticated users"
on public.questions for select
to authenticated
using (is_active = true);

-- Game sessions

drop policy if exists "Members can manage sessions" on public.game_sessions;
drop policy if exists "Members can read game sessions" on public.game_sessions;
drop policy if exists "Members can create game sessions" on public.game_sessions;
drop policy if exists "Members can update game sessions" on public.game_sessions;

create policy "Members can read game sessions"
on public.game_sessions for select
to authenticated
using (public.is_couple_member(couple_id));

create policy "Members can create game sessions"
on public.game_sessions for insert
to authenticated
with check (created_by = auth.uid() and public.is_couple_member(couple_id));

create policy "Members can update game sessions"
on public.game_sessions for update
to authenticated
using (public.is_couple_member(couple_id))
with check (public.is_couple_member(couple_id));

-- Answers

drop policy if exists "Members can manage answers" on public.answers;
drop policy if exists "Members can read answers" on public.answers;
drop policy if exists "Members can insert their answers" on public.answers;
drop policy if exists "Members can update their answers" on public.answers;

create policy "Members can read answers"
on public.answers for select
to authenticated
using (public.can_access_session(session_id));

create policy "Members can insert their answers"
on public.answers for insert
to authenticated
with check (user_id = auth.uid() and public.can_access_session(session_id));

create policy "Members can update their answers"
on public.answers for update
to authenticated
using (user_id = auth.uid() and public.can_access_session(session_id))
with check (user_id = auth.uid() and public.can_access_session(session_id));

-- Memories

drop policy if exists "Members can manage memories" on public.memories;
drop policy if exists "Members can read memories" on public.memories;
drop policy if exists "Members can create memories" on public.memories;
drop policy if exists "Members can update their memories" on public.memories;

create policy "Members can read memories"
on public.memories for select
to authenticated
using (public.is_couple_member(couple_id));

create policy "Members can create memories"
on public.memories for insert
to authenticated
with check (created_by = auth.uid() and public.is_couple_member(couple_id));

create policy "Members can update their memories"
on public.memories for update
to authenticated
using (created_by = auth.uid() and public.is_couple_member(couple_id))
with check (created_by = auth.uid() and public.is_couple_member(couple_id));

-- Date ideas

drop policy if exists "Members can manage date ideas" on public.date_ideas;
drop policy if exists "Members can read date ideas" on public.date_ideas;
drop policy if exists "Members can create date ideas" on public.date_ideas;
drop policy if exists "Members can update their date ideas" on public.date_ideas;

create policy "Members can read date ideas"
on public.date_ideas for select
to authenticated
using (public.is_couple_member(couple_id));

create policy "Members can create date ideas"
on public.date_ideas for insert
to authenticated
with check (created_by = auth.uid() and public.is_couple_member(couple_id));

create policy "Members can update their date ideas"
on public.date_ideas for update
to authenticated
using (created_by = auth.uid() and public.is_couple_member(couple_id))
with check (created_by = auth.uid() and public.is_couple_member(couple_id));

-- Awards

drop policy if exists "Members can manage awards" on public.awards;
drop policy if exists "Members can read awards" on public.awards;
drop policy if exists "Members can create awards for their partner" on public.awards;
drop policy if exists "Members can update their awards" on public.awards;

create policy "Members can read awards"
on public.awards for select
to authenticated
using (public.is_couple_member(couple_id));

create policy "Members can create awards for their partner"
on public.awards for insert
to authenticated
with check (
  created_by = auth.uid()
  and public.is_couple_member(couple_id)
  and public.is_couple_member(couple_id, recipient_id)
);

create policy "Members can update their awards"
on public.awards for update
to authenticated
using (created_by = auth.uid() and public.is_couple_member(couple_id))
with check (
  created_by = auth.uid()
  and public.is_couple_member(couple_id)
  and public.is_couple_member(couple_id, recipient_id)
);

grant execute on function public.is_couple_member(uuid, uuid) to authenticated;
grant execute on function public.is_couple_owner(uuid, uuid) to authenticated;
grant execute on function public.can_access_session(uuid, uuid) to authenticated;
grant execute on function public.join_couple_by_invite_code(text) to authenticated;
