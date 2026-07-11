-- Additive upgrade for databases that applied 202607100001 before the
-- notification worker gained event snapshots, immutable payloads, and leases.

alter table public.notification_attempts
  add column if not exists lease_token uuid,
  add column if not exists source_state text,
  add column if not exists source_amount integer,
  add column if not exists source_currency text,
  add column if not exists source_occurred_at timestamptz,
  add column if not exists source_cohort text,
  add column if not exists snapshot_country text,
  add column if not exists snapshot_region text,
  add column if not exists payload_to text,
  add column if not exists payload_from text,
  add column if not exists payload_subject text,
  add column if not exists payload_text text,
  add column if not exists payload_hash text;

update public.notification_attempts n
set source_state = case
      when source.notification_kind in (
        'founder_deposit_paid', 'client_deposit_paid'
      )
        then 'deposit_paid'
      when source.event_fact = 'full_refund' then 'deposit_refunded'
      else coalesce(source.event_state, source.application_state)
    end,
    source_amount = coalesce(source.event_amount, source.deposit_amount),
    source_currency = coalesce(source.event_currency, source.currency),
    source_occurred_at = coalesce(
      source.application_occurred_at,
      source.stripe_occurred_at,
      source.created_at
    ),
    source_cohort = 'founding-2026-07',
    snapshot_country = case
      when source.notification_kind = 'founder_application_received'
        then source.country
      else null
    end,
    snapshot_region = case
      when source.notification_kind = 'founder_application_received'
        then source.region
      else null
    end
from (
  select n2.id, n2.notification_kind, n2.created_at,
         a.status as application_state, a.deposit_amount, a.currency,
         a.country, a.region, s.event_fact, s.amount as event_amount,
         s.currency as event_currency, s.processed_at as stripe_occurred_at,
         e.to_state as event_state, e.occurred_at as application_occurred_at
  from public.notification_attempts n2
  join public.pilot_applications a on a.id = n2.application_id
  left join public.stripe_events s
    on s.stripe_event_id = n2.stripe_event_id
  left join public.application_events e on e.id = n2.application_event_id
  where a.status <> 'redacted'
) source
where n.id = source.id
  and n.source_state is null;

update public.notification_attempts n
set status = case when n.status = 'sent' then 'sent' else 'failed' end,
    last_error_code = case
      when n.status = 'sent' then n.last_error_code
      when n.recipient_role = 'client' then 'recipient_unavailable'
      else 'stale_state'
    end,
    next_attempt_at = null,
    locked_at = null,
    lease_token = null
from public.pilot_applications a
where a.id = n.application_id and a.status = 'redacted';

update public.notification_attempts
set lease_token = gen_random_uuid()
where status = 'sending' and lease_token is null;

alter table public.notification_attempts
  drop constraint if exists notification_attempt_sending_lock,
  drop constraint if exists notification_payload_all_or_none,
  drop constraint if exists notification_source_snapshot_all_or_none,
  drop constraint if exists notification_active_source_snapshot;

alter table public.notification_attempts
  add constraint notification_attempt_sending_lock check (
    status <> 'sending' or (locked_at is not null and lease_token is not null)
  ),
  add constraint notification_payload_all_or_none check (
    (payload_to is null and payload_from is null and payload_subject is null
      and payload_text is null and payload_hash is null)
    or
    (payload_to is not null and payload_from is not null
      and payload_subject is not null and payload_text is not null
      and payload_hash is not null)
  ),
  add constraint notification_source_snapshot_all_or_none check (
    (source_state is null and source_amount is null and source_currency is null
      and source_occurred_at is null and source_cohort is null)
    or
    (source_state is not null and source_amount is not null
      and source_currency is not null and source_occurred_at is not null
      and source_cohort is not null)
  ),
  add constraint notification_active_source_snapshot check (
    status not in ('pending', 'sending') or source_state is not null
  );

alter table public.notification_attempts
  add constraint notification_source_state_valid check (
    source_state is null or source_state in (
      'submitted', 'qualified', 'declined', 'safety_refused',
      'checkout_created', 'deposit_paid', 'deposit_refunded', 'withdrawn',
      'redacted'
    )
  ),
  add constraint notification_source_amount_valid check (
    source_amount is null or source_amount between 0 and 999999999
  ),
  add constraint notification_source_currency_valid check (
    source_currency is null or source_currency ~ '^[a-z]{3}$'
  ),
  add constraint notification_source_cohort_valid check (
    source_cohort is null or source_cohort ~ '^[a-z0-9][a-z0-9_.:-]{0,119}$'
  ),
  add constraint notification_snapshot_country_valid check (
    snapshot_country is null or snapshot_country in ('US', 'CA', 'OTHER')
  ),
  add constraint notification_snapshot_region_valid check (
    snapshot_region is null or length(snapshot_region) between 1 and 120
  ),
  add constraint notification_payload_to_valid check (
    payload_to is null or length(payload_to) between 3 and 320
  ),
  add constraint notification_payload_from_valid check (
    payload_from is null or length(payload_from) between 3 and 320
  ),
  add constraint notification_payload_subject_valid check (
    payload_subject is null or length(payload_subject) between 1 and 200
  ),
  add constraint notification_payload_text_valid check (
    payload_text is null or length(payload_text) between 1 and 4000
  ),
  add constraint notification_payload_hash_valid check (
    payload_hash is null or payload_hash ~ '^[a-f0-9]{64}$'
  );
