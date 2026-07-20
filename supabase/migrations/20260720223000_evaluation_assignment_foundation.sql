create table public.evaluation_assignments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  evaluation_cycle_id uuid not null references public.evaluation_cycles (id) on delete cascade,
  project_id uuid references public.projects (id) on delete cascade,
  evaluator_user_id uuid not null references auth.users (id) on delete cascade,
  subject_user_id uuid not null references auth.users (id) on delete cascade,
  assignment_kind text not null default 'PROJECT_PEER',
  status text not null default 'PENDING',
  created_by_user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint evaluation_assignments_kind_check check (
    assignment_kind in (
      'PROJECT_PEER',
      'PROJECT_MANAGER_REVIEW',
      'PROJECT_MEMBER_REVIEW',
      'CUSTOM'
    )
  ),
  constraint evaluation_assignments_status_check check (
    status in ('PENDING', 'COMPLETED', 'CANCELLED')
  ),
  constraint evaluation_assignments_no_self_assignment check (
    evaluator_user_id <> subject_user_id
  )
);

create unique index evaluation_assignments_active_unique_idx
on public.evaluation_assignments (
  evaluation_cycle_id,
  evaluator_user_id,
  subject_user_id,
  assignment_kind
)
where status <> 'CANCELLED';

create index evaluation_assignments_cycle_status_idx
on public.evaluation_assignments (evaluation_cycle_id, status, created_at desc);

create index evaluation_assignments_evaluator_lookup_idx
on public.evaluation_assignments (evaluator_user_id, status, evaluation_cycle_id);

create index evaluation_assignments_subject_lookup_idx
on public.evaluation_assignments (subject_user_id, status, evaluation_cycle_id);

create index evaluation_assignments_project_lookup_idx
on public.evaluation_assignments (project_id, status, evaluation_cycle_id)
where project_id is not null;

create or replace function public.validate_evaluation_assignment_scope()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  cycle_organization_id uuid;
  cycle_project_id uuid;
  project_organization_id uuid;
begin
  select organization_id, project_id
    into cycle_organization_id, cycle_project_id
  from public.evaluation_cycles
  where id = new.evaluation_cycle_id;

  if cycle_organization_id is null then
    raise exception 'Evaluation assignment cycle does not exist.';
  end if;

  if new.organization_id <> cycle_organization_id then
    raise exception 'Evaluation assignment must belong to the same organization as its cycle.';
  end if;

  if new.project_id is null then
    new.project_id := cycle_project_id;
  end if;

  if cycle_project_id is not null and new.project_id <> cycle_project_id then
    raise exception 'Evaluation assignment project must match the cycle project.';
  end if;

  if new.project_id is not null then
    select organization_id
      into project_organization_id
    from public.projects
    where id = new.project_id;

    if project_organization_id is null then
      raise exception 'Evaluation assignment project does not exist.';
    end if;

    if project_organization_id <> new.organization_id then
      raise exception 'Evaluation assignment project must belong to the same organization.';
    end if;
  end if;

  return new;
end;
$$;

create trigger evaluation_assignments_validate_scope
before insert or update of organization_id, evaluation_cycle_id, project_id
on public.evaluation_assignments
for each row
execute function public.validate_evaluation_assignment_scope();

create trigger evaluation_assignments_set_updated_at
before update on public.evaluation_assignments
for each row
execute function public.set_updated_at();

alter table public.evaluation_assignments enable row level security;

comment on table public.evaluation_assignments is
  'Identity-domain assignment planning records. Stores evaluator and subject eligibility only; does not store scores, comments, lessons learned content, anonymous credentials, encrypted payloads, or submission content.';

comment on column public.evaluation_assignments.evaluator_user_id is
  'Authenticated user eligible to submit an evaluation. This identity must not be copied into anonymous submission content records.';

comment on column public.evaluation_assignments.subject_user_id is
  'User who is evaluated by the assignment. Reviewers must not use assignment records to access raw submissions or below-threshold results.';
