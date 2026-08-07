alter function public.get_encrypted_evaluation_report_batch(
  uuid,
  uuid,
  uuid
) rename to get_thresholded_evaluation_report_batch_without_close_metadata;

revoke all on function public.get_thresholded_evaluation_report_batch_without_close_metadata(
  uuid,
  uuid,
  uuid
) from public, anon, authenticated, service_role;

create function public.get_encrypted_evaluation_report_batch(
  actor_user_id uuid,
  managed_evaluation_cycle_id uuid,
  managed_subject_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  report_payload jsonb;
  report_closes_at timestamptz;
begin
  report_payload := public.get_thresholded_evaluation_report_batch_without_close_metadata(
    actor_user_id,
    managed_evaluation_cycle_id,
    managed_subject_user_id
  );

  select cycle.closes_at
  into report_closes_at
  from public.evaluation_cycles cycle
  where cycle.id = managed_evaluation_cycle_id;

  if report_closes_at is null then
    raise exception 'REPORT_TARGET_NOT_FOUND';
  end if;

  return report_payload || jsonb_build_object(
    'closed_at', report_closes_at
  );
end;
$$;

revoke all on function public.get_encrypted_evaluation_report_batch(
  uuid,
  uuid,
  uuid
) from public, anon, authenticated;

grant execute on function public.get_encrypted_evaluation_report_batch(
  uuid,
  uuid,
  uuid
) to service_role;

comment on function public.get_thresholded_evaluation_report_batch_without_close_metadata(
  uuid,
  uuid,
  uuid
) is
  'Owner-only threshold and authorization implementation retained by the forward-only close-metadata compatibility fix.';

comment on function public.get_encrypted_evaluation_report_batch(
  uuid,
  uuid,
  uuid
) is
  'Service-role reporting boundary that delegates threshold, scope, admin-deny, self-deny, and audit enforcement before adding non-sensitive cycle close metadata.';
