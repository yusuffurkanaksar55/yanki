alter table public.scope_types drop constraint scope_types_scope_type_check;

alter table public.scope_types add constraint scope_types_scope_type_check check (
  scope_type in (
    'PLATFORM',
    'ORGANIZATION',
    'DEPARTMENT',
    'UNIT',
    'TEAM',
    'PROJECT',
    'EVALUATION_CYCLE'
  )
);

insert into public.scope_types (scope_type, description)
values ('PLATFORM', 'Global platform authorization scope.')
on conflict (scope_type) do nothing;

alter table public.user_role_assignments
drop constraint user_role_assignments_scope_pair_check;

alter table public.user_role_assignments
add constraint user_role_assignments_scope_pair_check check (
  (scope_type = 'PLATFORM' and scope_id is null)
  or (scope_type <> 'PLATFORM' and scope_id is not null)
);

alter table public.audit_events
drop constraint audit_events_scope_pair_check;

alter table public.audit_events
add constraint audit_events_scope_pair_check check (
  (event_scope_type is null and event_scope_id is null)
  or (event_scope_type = 'PLATFORM' and event_scope_id is null)
  or (
    event_scope_type is not null
    and event_scope_type <> 'PLATFORM'
    and event_scope_id is not null
  )
);

alter table public.user_invitations
drop constraint user_invitations_scope_pair_check;

alter table public.user_invitations
add constraint user_invitations_scope_pair_check check (
  (invited_scope_type = 'PLATFORM' and invited_scope_id is null)
  or (invited_scope_type <> 'PLATFORM' and invited_scope_id is not null)
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  status text not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organizations_name_not_blank check (length(btrim(name)) > 0),
  constraint organizations_slug_not_blank check (length(btrim(slug)) > 0),
  constraint organizations_slug_normalized_check check (slug = lower(slug)),
  constraint organizations_status_check check (status in ('ACTIVE', 'ARCHIVED'))
);

create unique index organizations_slug_unique_idx
on public.organizations (slug);

create trigger organizations_set_updated_at
before update on public.organizations
for each row
execute function public.set_updated_at();

alter table public.organizations enable row level security;

create table public.organization_units (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  parent_unit_id uuid references public.organization_units (id) on delete restrict,
  unit_type text not null default 'CUSTOM',
  name text not null,
  slug text not null,
  status text not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organization_units_name_not_blank check (length(btrim(name)) > 0),
  constraint organization_units_slug_not_blank check (length(btrim(slug)) > 0),
  constraint organization_units_slug_normalized_check check (slug = lower(slug)),
  constraint organization_units_type_check check (
    unit_type in ('DEPARTMENT', 'UNIT', 'TEAM', 'CUSTOM')
  ),
  constraint organization_units_status_check check (status in ('ACTIVE', 'ARCHIVED')),
  constraint organization_units_not_self_parent check (
    parent_unit_id is null or parent_unit_id <> id
  )
);

create unique index organization_units_org_id_id_unique_idx
on public.organization_units (organization_id, id);

create unique index organization_units_slug_unique_idx
on public.organization_units (organization_id, slug);

create unique index organization_units_active_sibling_name_unique_idx
on public.organization_units (
  organization_id,
  coalesce(parent_unit_id, '00000000-0000-0000-0000-000000000000'::uuid),
  lower(name)
)
where status = 'ACTIVE';

create index organization_units_parent_lookup_idx
on public.organization_units (organization_id, parent_unit_id, unit_type);

create or replace function public.validate_organization_unit_parent()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  current_parent_id uuid;
  parent_organization_id uuid;
begin
  if new.parent_unit_id is null then
    return new;
  end if;

  select organization_id
    into parent_organization_id
  from public.organization_units
  where id = new.parent_unit_id;

  if parent_organization_id is null then
    raise exception 'Parent organization unit does not exist.';
  end if;

  if parent_organization_id <> new.organization_id then
    raise exception 'Parent organization unit must belong to the same organization.';
  end if;

  current_parent_id := new.parent_unit_id;

  while current_parent_id is not null loop
    if current_parent_id = new.id then
      raise exception 'Organization unit hierarchy cannot contain cycles.';
    end if;

    select parent_unit_id
      into current_parent_id
    from public.organization_units
    where id = current_parent_id;
  end loop;

  return new;
end;
$$;

create trigger organization_units_validate_parent
before insert or update of organization_id, parent_unit_id
on public.organization_units
for each row
execute function public.validate_organization_unit_parent();

create trigger organization_units_set_updated_at
before update on public.organization_units
for each row
execute function public.set_updated_at();

alter table public.organization_units enable row level security;

create table public.organization_unit_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  unit_id uuid not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  membership_kind text not null default 'MEMBER',
  is_primary boolean not null default false,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organization_unit_memberships_unit_fk foreign key (
    organization_id,
    unit_id
  ) references public.organization_units (organization_id, id) on delete cascade,
  constraint organization_unit_memberships_kind_check check (
    membership_kind in ('MEMBER', 'LEADER')
  ),
  constraint organization_unit_memberships_valid_window check (
    ends_at is null or ends_at > starts_at
  )
);

create unique index organization_unit_memberships_active_unique_idx
on public.organization_unit_memberships (unit_id, user_id, membership_kind)
where ends_at is null;

create unique index organization_unit_memberships_primary_unique_idx
on public.organization_unit_memberships (organization_id, user_id)
where is_primary and ends_at is null;

create index organization_unit_memberships_user_lookup_idx
on public.organization_unit_memberships (user_id, starts_at, ends_at);

create index organization_unit_memberships_unit_lookup_idx
on public.organization_unit_memberships (organization_id, unit_id, membership_kind)
where ends_at is null;

create trigger organization_unit_memberships_set_updated_at
before update on public.organization_unit_memberships
for each row
execute function public.set_updated_at();

alter table public.organization_unit_memberships enable row level security;

create table public.manager_assignments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  manager_user_id uuid not null references auth.users (id) on delete cascade,
  direct_report_user_id uuid not null references auth.users (id) on delete cascade,
  relationship_type text not null default 'DIRECT_MANAGER',
  scope_unit_id uuid references public.organization_units (id) on delete set null,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint manager_assignments_relationship_type_check check (
    relationship_type in (
      'DIRECT_MANAGER',
      'FUNCTIONAL_MANAGER',
      'EXECUTIVE_SPONSOR'
    )
  ),
  constraint manager_assignments_no_self_management check (
    manager_user_id <> direct_report_user_id
  ),
  constraint manager_assignments_valid_window check (
    ends_at is null or ends_at > starts_at
  )
);

create unique index manager_assignments_active_direct_unique_idx
on public.manager_assignments (direct_report_user_id, relationship_type)
where ends_at is null and relationship_type in ('DIRECT_MANAGER', 'EXECUTIVE_SPONSOR');

create index manager_assignments_manager_lookup_idx
on public.manager_assignments (manager_user_id, starts_at, ends_at);

create index manager_assignments_report_lookup_idx
on public.manager_assignments (direct_report_user_id, starts_at, ends_at);

create index manager_assignments_scope_lookup_idx
on public.manager_assignments (organization_id, scope_unit_id, relationship_type)
where ends_at is null;

create or replace function public.validate_manager_assignment_scope()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  scope_organization_id uuid;
begin
  if new.scope_unit_id is null then
    return new;
  end if;

  select organization_id
    into scope_organization_id
  from public.organization_units
  where id = new.scope_unit_id;

  if scope_organization_id is null then
    raise exception 'Manager assignment scope unit does not exist.';
  end if;

  if scope_organization_id <> new.organization_id then
    raise exception 'Manager assignment scope unit must belong to the same organization.';
  end if;

  return new;
end;
$$;

create trigger manager_assignments_validate_scope
before insert or update of organization_id, scope_unit_id
on public.manager_assignments
for each row
execute function public.validate_manager_assignment_scope();

create trigger manager_assignments_set_updated_at
before update on public.manager_assignments
for each row
execute function public.set_updated_at();

alter table public.manager_assignments enable row level security;

comment on table public.organizations is
  'Organization roots for configurable company hierarchy. This identity-domain table does not store evaluation content.';

comment on table public.organization_units is
  'Configurable organization tree nodes such as departments, units, teams, or custom hierarchy levels.';

comment on table public.organization_unit_memberships is
  'Identity-domain membership records that place users in organization units without storing evaluation submissions.';

comment on table public.manager_assignments is
  'Identity-domain reporting relationships used for authorization and assignment planning. Does not store evaluation content.';
