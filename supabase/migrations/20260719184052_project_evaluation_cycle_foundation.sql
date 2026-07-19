create table public.projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  code text,
  description text,
  status text not null default 'PLANNED',
  project_manager_user_id uuid references auth.users (id) on delete set null,
  starts_on date,
  completes_on date,
  created_by_user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint projects_name_not_blank check (length(btrim(name)) > 0),
  constraint projects_code_not_blank check (
    code is null or length(btrim(code)) > 0
  ),
  constraint projects_description_not_blank check (
    description is null or length(btrim(description)) > 0
  ),
  constraint projects_status_check check (
    status in ('PLANNED', 'ACTIVE', 'COMPLETED', 'ARCHIVED')
  ),
  constraint projects_valid_date_window check (
    starts_on is null
    or completes_on is null
    or completes_on >= starts_on
  )
);

create unique index projects_active_name_unique_idx
on public.projects (organization_id, lower(name))
where status <> 'ARCHIVED';

create unique index projects_active_code_unique_idx
on public.projects (organization_id, lower(code))
where code is not null and status <> 'ARCHIVED';

create index projects_organization_status_idx
on public.projects (organization_id, status, created_at desc);

create index projects_manager_lookup_idx
on public.projects (project_manager_user_id, status)
where project_manager_user_id is not null;

create trigger projects_set_updated_at
before update on public.projects
for each row
execute function public.set_updated_at();

alter table public.projects enable row level security;

create table public.project_memberships (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  membership_kind text not null default 'MEMBER',
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_memberships_kind_check check (
    membership_kind in ('MEMBER', 'PROJECT_MANAGER', 'SPONSOR', 'OBSERVER')
  ),
  constraint project_memberships_valid_window check (
    ends_at is null or ends_at > starts_at
  )
);

create unique index project_memberships_active_unique_idx
on public.project_memberships (project_id, user_id, membership_kind)
where ends_at is null;

create index project_memberships_project_lookup_idx
on public.project_memberships (project_id, membership_kind)
where ends_at is null;

create index project_memberships_user_lookup_idx
on public.project_memberships (user_id, starts_at, ends_at);

create trigger project_memberships_set_updated_at
before update on public.project_memberships
for each row
execute function public.set_updated_at();

alter table public.project_memberships enable row level security;

create table public.evaluation_cycles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  project_id uuid references public.projects (id) on delete restrict,
  name text not null,
  cycle_type text not null default 'PROJECT_COMPLETION',
  status text not null default 'DRAFT',
  project_completed_on date,
  opens_at timestamptz not null,
  closes_at timestamptz not null,
  anonymity_threshold integer not null default 4,
  created_by_user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint evaluation_cycles_name_not_blank check (length(btrim(name)) > 0),
  constraint evaluation_cycles_type_check check (
    cycle_type in (
      'ANNUAL',
      'PROJECT',
      'PROJECT_COMPLETION',
      'LESSONS_LEARNED',
      'CUSTOM'
    )
  ),
  constraint evaluation_cycles_status_check check (
    status in ('DRAFT', 'OPEN', 'CLOSED', 'ARCHIVED')
  ),
  constraint evaluation_cycles_valid_window check (closes_at > opens_at),
  constraint evaluation_cycles_threshold_floor check (anonymity_threshold >= 4),
  constraint evaluation_cycles_project_required_check check (
    cycle_type not in ('PROJECT', 'PROJECT_COMPLETION', 'LESSONS_LEARNED')
    or project_id is not null
  )
);

create unique index evaluation_cycles_active_name_unique_idx
on public.evaluation_cycles (organization_id, lower(name))
where status <> 'ARCHIVED';

create index evaluation_cycles_organization_status_idx
on public.evaluation_cycles (organization_id, status, opens_at, closes_at);

create index evaluation_cycles_project_lookup_idx
on public.evaluation_cycles (project_id, status, closes_at)
where project_id is not null;

create or replace function public.validate_evaluation_cycle_project_scope()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  project_organization_id uuid;
begin
  if new.project_id is null then
    return new;
  end if;

  select organization_id
    into project_organization_id
  from public.projects
  where id = new.project_id;

  if project_organization_id is null then
    raise exception 'Evaluation cycle project does not exist.';
  end if;

  if project_organization_id <> new.organization_id then
    raise exception 'Evaluation cycle project must belong to the same organization.';
  end if;

  return new;
end;
$$;

create trigger evaluation_cycles_validate_project_scope
before insert or update of organization_id, project_id
on public.evaluation_cycles
for each row
execute function public.validate_evaluation_cycle_project_scope();

create trigger evaluation_cycles_set_updated_at
before update on public.evaluation_cycles
for each row
execute function public.set_updated_at();

alter table public.evaluation_cycles enable row level security;

comment on table public.projects is
  'Identity-domain project metadata for scoped administration. Does not store evaluation content.';

comment on table public.project_memberships is
  'Identity-domain project membership records for assignment planning and authorization. Does not store response content.';

comment on table public.evaluation_cycles is
  'Time-bound evaluation configuration. Cycles have close dates and anonymity thresholds, but no fixed participant-count requirement for opening.';

comment on column public.evaluation_cycles.closes_at is
  'Administrative close timestamp for the evaluation window.';

comment on column public.evaluation_cycles.project_completed_on is
  'Optional project completion date used for project-completion and lessons-learned workflows.';
