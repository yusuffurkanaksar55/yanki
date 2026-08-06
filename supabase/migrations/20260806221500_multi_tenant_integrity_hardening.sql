create unique index if not exists projects_organization_id_id_unique_idx
on public.projects (organization_id, id);

alter table public.project_memberships
add column organization_id uuid;

update public.project_memberships membership
set organization_id = project.organization_id
from public.projects project
where project.id = membership.project_id;

alter table public.project_memberships
alter column organization_id set not null;

alter table public.project_memberships
drop constraint project_memberships_project_id_fkey;

alter table public.project_memberships
add constraint project_memberships_organization_fk
foreign key (organization_id)
references public.organizations (id)
on delete cascade;

alter table public.project_memberships
add constraint project_memberships_project_tenant_fk
foreign key (organization_id, project_id)
references public.projects (organization_id, id)
on delete cascade;

create index project_memberships_organization_user_idx
on public.project_memberships (organization_id, user_id, starts_at, ends_at);

create or replace function public.require_active_organization_identity(
  checked_organization_id uuid,
  checked_user_id uuid
)
returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if not exists (
    select 1
    from public.user_profiles profile
    where profile.user_id = checked_user_id
      and profile.onboarding_status = 'ACTIVE'
  ) then
    raise exception 'TENANT_USER_NOT_ACTIVE';
  end if;

  if not exists (
    select 1
    from public.organization_unit_memberships membership
    where membership.organization_id = checked_organization_id
      and membership.user_id = checked_user_id
      and membership.starts_at <= now()
      and (membership.ends_at is null or membership.ends_at > now())
  ) then
    raise exception 'TENANT_MEMBERSHIP_REQUIRED';
  end if;
end;
$$;

revoke all on function public.require_active_organization_identity(uuid, uuid)
from public, anon, authenticated;
grant execute on function public.require_active_organization_identity(uuid, uuid)
to service_role;

create or replace function public.validate_project_tenant_manager()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.project_manager_user_id is not null then
    perform public.require_active_organization_identity(
      new.organization_id,
      new.project_manager_user_id
    );
  end if;

  return new;
end;
$$;

create trigger projects_validate_tenant_manager
before insert or update of organization_id, project_manager_user_id
on public.projects
for each row
execute function public.validate_project_tenant_manager();

create or replace function public.validate_project_membership_tenant()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  project_organization_id uuid;
begin
  select project.organization_id
    into project_organization_id
  from public.projects project
  where project.id = new.project_id;

  if project_organization_id is null then
    raise exception 'PROJECT_NOT_FOUND';
  end if;

  if new.organization_id is null then
    new.organization_id := project_organization_id;
  end if;

  if new.organization_id <> project_organization_id then
    raise exception 'PROJECT_MEMBERSHIP_TENANT_MISMATCH';
  end if;

  perform public.require_active_organization_identity(
    new.organization_id,
    new.user_id
  );

  return new;
end;
$$;

create trigger project_memberships_validate_tenant
before insert or update of organization_id, project_id, user_id
on public.project_memberships
for each row
execute function public.validate_project_membership_tenant();

create or replace function public.validate_manager_assignment_tenant()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  perform public.require_active_organization_identity(
    new.organization_id,
    new.manager_user_id
  );
  perform public.require_active_organization_identity(
    new.organization_id,
    new.direct_report_user_id
  );

  return new;
end;
$$;

create trigger manager_assignments_validate_tenant
before insert or update of organization_id, manager_user_id, direct_report_user_id
on public.manager_assignments
for each row
execute function public.validate_manager_assignment_tenant();

drop index public.manager_assignments_active_direct_unique_idx;

create unique index manager_assignments_active_direct_tenant_unique_idx
on public.manager_assignments (
  organization_id,
  direct_report_user_id,
  relationship_type
)
where ends_at is null
  and relationship_type in ('DIRECT_MANAGER', 'EXECUTIVE_SPONSOR');

create or replace function public.validate_evaluation_assignment_tenant_users()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  perform public.require_active_organization_identity(
    new.organization_id,
    new.evaluator_user_id
  );
  perform public.require_active_organization_identity(
    new.organization_id,
    new.subject_user_id
  );

  return new;
end;
$$;

create trigger evaluation_assignments_validate_tenant_users
before insert or update of organization_id, evaluator_user_id, subject_user_id
on public.evaluation_assignments
for each row
execute function public.validate_evaluation_assignment_tenant_users();

comment on column public.project_memberships.organization_id is
  'Required tenant boundary. Must match the parent project organization.';

comment on function public.require_active_organization_identity(uuid, uuid) is
  'Internal tenant-integrity guard. Requires an active profile and active membership in the selected organization.';
