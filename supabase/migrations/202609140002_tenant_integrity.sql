-- A child row must never point at a parent row belonging to another team.
-- These constraints also protect writes made by trusted jobs that bypass RLS.

create unique index practice_schedules_team_group_id_key
  on public.practice_schedules(team_id, group_id, id);

alter table public.practice_schedules
  add constraint practice_schedules_group_team_fk
  foreign key (team_id, group_id) references public.swim_groups(team_id, id);

alter table public.practice_sessions
  add constraint practice_sessions_group_team_fk
  foreign key (team_id, group_id) references public.swim_groups(team_id, id),
  add constraint practice_sessions_schedule_team_group_fk
  foreign key (team_id, group_id, schedule_id)
  references public.practice_schedules(team_id, group_id, id);

alter table public.practice_exceptions
  add constraint practice_exceptions_group_team_fk
  foreign key (team_id, group_id) references public.swim_groups(team_id, id);

alter table public.self_checkin_tokens
  add constraint self_checkin_tokens_session_team_fk
  foreign key (team_id, practice_session_id) references public.practice_sessions(team_id, id);

-- A tenant key is immutable after insertion. Transfers require an explicit,
-- reviewed migration, which must update all dependent records atomically.
create or replace function public.reject_team_id_change()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.team_id is distinct from old.team_id then
    raise exception 'team_id cannot be changed';
  end if;
  return new;
end;
$$;

create trigger team_memberships_team_id_immutable before update on public.team_memberships
  for each row execute function public.reject_team_id_change();
create trigger team_module_entitlements_team_id_immutable before update on public.team_module_entitlements
  for each row execute function public.reject_team_id_change();
create trigger swimmers_team_id_immutable before update on public.swimmers
  for each row execute function public.reject_team_id_change();
create trigger families_team_id_immutable before update on public.families
  for each row execute function public.reject_team_id_change();
create trigger family_swimmers_team_id_immutable before update on public.family_swimmers
  for each row execute function public.reject_team_id_change();
create trigger swim_groups_team_id_immutable before update on public.swim_groups
  for each row execute function public.reject_team_id_change();
create trigger group_memberships_team_id_immutable before update on public.group_memberships
  for each row execute function public.reject_team_id_change();
create trigger practice_schedules_team_id_immutable before update on public.practice_schedules
  for each row execute function public.reject_team_id_change();
create trigger practice_sessions_team_id_immutable before update on public.practice_sessions
  for each row execute function public.reject_team_id_change();
create trigger practice_exceptions_team_id_immutable before update on public.practice_exceptions
  for each row execute function public.reject_team_id_change();
create trigger attendance_records_team_id_immutable before update on public.attendance_records
  for each row execute function public.reject_team_id_change();
create trigger self_checkin_tokens_team_id_immutable before update on public.self_checkin_tokens
  for each row execute function public.reject_team_id_change();
create trigger team_settings_team_id_immutable before update on public.team_settings
  for each row execute function public.reject_team_id_change();
create trigger audit_logs_team_id_immutable before update on public.audit_logs
  for each row execute function public.reject_team_id_change();
