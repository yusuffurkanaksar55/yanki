create extension if not exists "pgcrypto" with schema "extensions";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.app_roles (
  role_code text primary key,
  description text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint app_roles_role_code_check check (
    role_code in (
      'SYSTEM_ADMIN',
      'EMPLOYEE',
      'TEAM_LEADER',
      'PROJECT_MANAGER',
      'C_LEVEL_REVIEWER',
      'BOARD_REVIEWER'
    )
  ),
  constraint app_roles_description_not_blank check (length(btrim(description)) > 0)
);

create trigger app_roles_set_updated_at
before update on public.app_roles
for each row
execute function public.set_updated_at();

alter table public.app_roles enable row level security;

insert into public.app_roles (role_code, description)
values
  ('SYSTEM_ADMIN', 'Manages platform configuration without reading evaluation content.'),
  ('EMPLOYEE', 'Submits assigned evaluations and cannot read evaluation results.'),
  ('TEAM_LEADER', 'Reviews authorized anonymous aggregates for scoped teams.'),
  ('PROJECT_MANAGER', 'Manages scoped projects and can be evaluated.'),
  ('C_LEVEL_REVIEWER', 'Reviews authorized anonymous aggregates for scoped organizational units.'),
  ('BOARD_REVIEWER', 'Reviews authorized anonymous aggregates according to governance scope.');

create table public.scope_types (
  scope_type text primary key,
  description text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint scope_types_scope_type_check check (
    scope_type in (
      'ORGANIZATION',
      'DEPARTMENT',
      'UNIT',
      'TEAM',
      'PROJECT',
      'EVALUATION_CYCLE'
    )
  ),
  constraint scope_types_description_not_blank check (length(btrim(description)) > 0)
);

create trigger scope_types_set_updated_at
before update on public.scope_types
for each row
execute function public.set_updated_at();

alter table public.scope_types enable row level security;

insert into public.scope_types (scope_type, description)
values
  ('ORGANIZATION', 'Organization-level authorization scope.'),
  ('DEPARTMENT', 'Department-level authorization scope.'),
  ('UNIT', 'Unit-level authorization scope.'),
  ('TEAM', 'Team-level authorization scope.'),
  ('PROJECT', 'Project-level authorization scope.'),
  ('EVALUATION_CYCLE', 'Evaluation-cycle-level authorization scope.');

create table public.user_role_assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  role_code text not null references public.app_roles (role_code),
  scope_type text not null references public.scope_types (scope_type),
  scope_id uuid,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_role_assignments_valid_window check (
    ends_at is null or ends_at > starts_at
  ),
  constraint user_role_assignments_scope_pair_check check (
    (scope_type = 'ORGANIZATION' and scope_id is null)
    or (scope_type <> 'ORGANIZATION' and scope_id is not null)
  )
);

create unique index user_role_assignments_active_unique_idx
on public.user_role_assignments (user_id, role_code, scope_type, coalesce(scope_id, '00000000-0000-0000-0000-000000000000'::uuid))
where ends_at is null;

create index user_role_assignments_user_lookup_idx
on public.user_role_assignments (user_id, starts_at, ends_at);

create index user_role_assignments_scope_lookup_idx
on public.user_role_assignments (scope_type, scope_id, role_code)
where ends_at is null;

create trigger user_role_assignments_set_updated_at
before update on public.user_role_assignments
for each row
execute function public.set_updated_at();

alter table public.user_role_assignments enable row level security;

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users (id) on delete set null,
  event_type text not null,
  event_scope_type text references public.scope_types (scope_type),
  event_scope_id uuid,
  safe_metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  constraint audit_events_event_type_not_blank check (length(btrim(event_type)) > 0),
  constraint audit_events_safe_metadata_object_check check (jsonb_typeof(safe_metadata) = 'object'),
  constraint audit_events_scope_pair_check check (
    (event_scope_type is null and event_scope_id is null)
    or (event_scope_type = 'ORGANIZATION' and event_scope_id is null)
    or (event_scope_type is not null and event_scope_type <> 'ORGANIZATION' and event_scope_id is not null)
  )
);

create index audit_events_actor_lookup_idx
on public.audit_events (actor_user_id, occurred_at desc);

create index audit_events_type_time_idx
on public.audit_events (event_type, occurred_at desc);

create index audit_events_scope_lookup_idx
on public.audit_events (event_scope_type, event_scope_id, occurred_at desc);

alter table public.audit_events enable row level security;

comment on table public.app_roles is
  'Reference roles for scoped authorization. RLS is enabled with no client policies by default.';

comment on table public.scope_types is
  'Reference scope types for organization, project, team, and evaluation-cycle authorization.';

comment on table public.user_role_assignments is
  'Scoped role grants for authenticated users. This table does not store evaluation content.';

comment on table public.audit_events is
  'Safe operational audit metadata only. Do not store scores, comments, decrypted payloads, credentials, tokens, or evaluator-to-response linkage.';
