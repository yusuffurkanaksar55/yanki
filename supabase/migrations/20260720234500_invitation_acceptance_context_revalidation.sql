create or replace function public.validate_invitation_acceptance_context()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.accepted_at is not null
    or new.accepted_at is null then
    return new;
  end if;

  if not exists (
    select 1
    from public.organizations organization
    join public.organization_units unit
      on unit.organization_id = organization.id
    where organization.id = new.organization_id
      and organization.status = 'ACTIVE'
      and unit.id = new.unit_id
      and unit.status = 'ACTIVE'
  ) then
    raise exception 'INVITATION_CONTEXT_INACTIVE';
  end if;

  if new.manager_user_id is not null
    and not exists (
      select 1
      from public.organization_unit_memberships membership
      join public.user_profiles profile
        on profile.user_id = membership.user_id
      where membership.organization_id = new.organization_id
        and membership.user_id = new.manager_user_id
        and membership.starts_at <= now()
        and (membership.ends_at is null or membership.ends_at > now())
        and profile.onboarding_status = 'ACTIVE'
    ) then
    raise exception 'INVITATION_MANAGER_INACTIVE';
  end if;

  return new;
end;
$$;

create trigger user_invitations_validate_acceptance_context
before update of accepted_at
on public.user_invitations
for each row
execute function public.validate_invitation_acceptance_context();

comment on function public.validate_invitation_acceptance_context() is
  'Revalidates active organization, unit, and optional manager context immediately before invitation acceptance.';
