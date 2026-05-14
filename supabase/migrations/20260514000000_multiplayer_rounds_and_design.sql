-- Multiplayer stability + private design settings.
-- Keeps one active shared game_session per couple/game type, fixes per-question answers,
-- makes reactions changeable, and stores couple-level design customization.

alter table public.answers drop constraint if exists answers_session_id_user_id_key;
create unique index if not exists answers_session_question_user_unique on public.answers (session_id, question_id, user_id);
with ranked_active_sessions as (
  select id, row_number() over (partition by couple_id, game_type order by created_at desc) as rn
  from public.game_sessions
  where status = 'active'
)
update public.game_sessions gs
set status = 'archived', archived_at = coalesce(gs.archived_at, now())
from ranked_active_sessions ranked
where gs.id = ranked.id and ranked.rn > 1;

create unique index if not exists one_active_game_session_per_couple_type on public.game_sessions (couple_id, game_type) where status = 'active';

alter table public.answer_reactions drop constraint if exists answer_reactions_answer_id_user_id_reaction_key;
with ranked_reactions as (
  select id, row_number() over (partition by answer_id, user_id order by created_at desc) as rn
  from public.answer_reactions
)
delete from public.answer_reactions ar
using ranked_reactions ranked
where ar.id = ranked.id and ranked.rn > 1;

create unique index if not exists answer_reactions_answer_user_unique on public.answer_reactions (answer_id, user_id);

create table if not exists public.couple_design_settings (
  couple_id uuid primary key references public.couples(id) on delete cascade,
  app_display_name text not null default 'OurStory',
  primary_color text not null default '#f43f5e',
  secondary_color text not null default '#a855f7',
  background_gradient text not null default 'linear-gradient(135deg, #fff8ea 0%, #fff1f5 44%, #f5efff 100%)',
  card_radius text not null default '2rem',
  button_style text not null default 'pill',
  dashboard_heading text not null default 'Ready to make tonight feel intentional?',
  logo_url text,
  theme_mode text not null default 'romantic' check (theme_mode in ('soft', 'romantic', 'dark', 'playful')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists couple_design_settings_touch_updated_at on public.couple_design_settings;
create trigger couple_design_settings_touch_updated_at before update on public.couple_design_settings for each row execute function public.touch_updated_at();

alter table public.couple_design_settings enable row level security;

drop policy if exists "Members can read couple design settings" on public.couple_design_settings;
create policy "Members can read couple design settings" on public.couple_design_settings for select to authenticated using (public.is_couple_member(couple_id));

drop policy if exists "Members can create couple design settings" on public.couple_design_settings;
create policy "Members can create couple design settings" on public.couple_design_settings for insert to authenticated with check (public.is_couple_member(couple_id));

drop policy if exists "Members can update couple design settings" on public.couple_design_settings;
create policy "Members can update couple design settings" on public.couple_design_settings for update to authenticated using (public.is_couple_member(couple_id)) with check (public.is_couple_member(couple_id));

create or replace function public.draw_game_card(target_game_type public.game_type, target_category text, target_title text)
returns public.game_sessions
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  target_couple_id uuid;
  selected_question_id bigint;
  existing_session public.game_sessions;
  next_round integer;
begin
  if current_user_id is null then
    raise exception 'You must be signed in to draw a card.';
  end if;

  select cm.couple_id into target_couple_id
  from public.couple_members cm
  where cm.user_id = current_user_id
  order by cm.joined_at asc
  limit 1;

  if target_couple_id is null then
    raise exception 'Join or create a couple before playing.';
  end if;

  perform 1 from public.couples where id = target_couple_id for update;

  select q.id into selected_question_id
  from public.questions q
  where q.is_active = true
    and (target_category is null or q.category = target_category)
  order by random()
  limit 1;

  if selected_question_id is null then
    raise exception 'No questions are available for this game mode.';
  end if;

  select * into existing_session
  from public.game_sessions gs
  where gs.couple_id = target_couple_id
    and gs.game_type = target_game_type
    and gs.status = 'active'
  order by gs.created_at desc
  limit 1
  for update;

  if existing_session.id is null then
    insert into public.game_sessions (couple_id, game_type, status, title, current_question_id, created_by, metadata)
    values (target_couple_id, target_game_type, 'active', target_title, selected_question_id, current_user_id, jsonb_build_object('round', 1, 'drawn_by', current_user_id, 'drawn_at', now()))
    returning * into existing_session;
  else
    next_round := coalesce((existing_session.metadata ->> 'round')::integer, 1) + 1;
    update public.game_sessions
    set current_question_id = selected_question_id,
        title = target_title,
        revealed_at = null,
        metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('round', next_round, 'drawn_by', current_user_id, 'drawn_at', now())
    where id = existing_session.id
    returning * into existing_session;
  end if;

  return existing_session;
end;
$$;

grant execute on function public.draw_game_card(public.game_type, text, text) to authenticated;
