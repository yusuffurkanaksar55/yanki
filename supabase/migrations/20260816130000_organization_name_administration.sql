create or replace function public.admin_update_organization_name(
  actor_user_id uuid,
  managed_organization_id uuid,
  organization_name text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  normalized_name text := btrim(organization_name);
  result public.organizations%rowtype;
begin
  perform public.require_active_system_admin(
    actor_user_id,
    managed_organization_id
  );

  if length(normalized_name) < 2 or length(normalized_name) > 120 then
    raise exception 'ORGANIZATION_NAME_INVALID';
  end if;

  update public.organizations organization
  set name = normalized_name
  where organization.id = managed_organization_id
    and organization.status = 'ACTIVE'
  returning organization.* into result;

  if not found then
    raise exception 'ORGANIZATION_NOT_ACTIVE';
  end if;

  insert into public.audit_events (
    actor_user_id,
    event_scope_type,
    event_scope_id,
    event_type,
    safe_metadata
  ) values (
    actor_user_id,
    'ORGANIZATION',
    managed_organization_id,
    'ORGANIZATION_NAME_UPDATED',
    jsonb_build_object('organizationId', managed_organization_id)
  );

  return jsonb_build_object(
    'id', result.id,
    'name', result.name
  );
end;
$$;

revoke all on function public.admin_update_organization_name(
  uuid, uuid, text
) from public, anon, authenticated;

grant execute on function public.admin_update_organization_name(
  uuid, uuid, text
) to service_role;

comment on function public.admin_update_organization_name(uuid, uuid, text) is
  'Updates an active tenant display name after repeating system-administrator scope authorization; the stable slug is unchanged.';
