create extension if not exists pgcrypto;

create table public.pilot_applications (
  id uuid primary key default gen_random_uuid(),
  submission_key uuid not null unique,
  submission_fingerprint text not null check (submission_fingerprint ~ '^[a-f0-9]{64}$'),
  status text not null check (status in (
    'submitted', 'qualified', 'declined', 'safety_refused',
    'checkout_created', 'deposit_paid', 'deposit_refunded', 'withdrawn',
    'redacted'
  )),
  email text check (email is null or email = lower(trim(email))),
  lang text check (lang in ('zh', 'en')),
  country text check (country in ('US', 'CA', 'OTHER')),
  region text,
  city text,
  decision_type text check (decision_type in (
    'career', 'relocation', 'founder', 'relationship', 'family', 'other'
  )),
  decision_window text check (decision_window in (
    'within_30_days', 'within_90_days', 'later', 'unsure'
  )),
  age_confirmed boolean,
  price_acknowledged boolean,
  framework_accepted boolean,
  agency_accepted boolean,
  scope_accepted boolean,
  self_only_data_confirmed boolean,
  acute_crisis boolean,
  restricted_advice boolean,
  marketing_consent boolean,
  attribution_source text,
  attribution_medium text,
  attribution_campaign text,
  attribution_referrer text,
  friend_graph text check (friend_graph in (
    'direct_friend', 'client_referral', 'community', 'organic', 'paid',
    'unknown'
  )),
  qualification_reasons text[] not null default '{}',
  deposit_amount integer not null default 4900 check (deposit_amount = 4900),
  currency text not null default 'usd' check (currency = 'usd'),
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text unique,
  constraint pilot_checkout_session_state check (
    stripe_checkout_session_id is null or status in (
      'checkout_created', 'deposit_paid', 'deposit_refunded',
      'safety_refused', 'withdrawn', 'redacted'
    )
  ),
  constraint pilot_payment_intent_state check (
    stripe_payment_intent_id is null or status in (
      'deposit_paid', 'deposit_refunded', 'safety_refused', 'withdrawn', 'redacted'
    )
  ),
  constraint pilot_checkout_reference_required check (
    status <> 'checkout_created' or stripe_checkout_session_id is not null
  ),
  constraint pilot_payment_reference_required check (
    status <> 'deposit_paid' or (
      stripe_checkout_session_id is not null and stripe_payment_intent_id is not null
    )
  ),
  retention_delete_after timestamptz default (now() + interval '90 days'),
  redacted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create function public.enforce_payment_reference_integrity()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.stripe_checkout_session_id is not null
     and new.stripe_checkout_session_id is distinct from old.stripe_checkout_session_id then
    raise exception 'stripe_checkout_session_id is append-only';
  end if;
  if old.stripe_payment_intent_id is not null
     and new.stripe_payment_intent_id is distinct from old.stripe_payment_intent_id then
    raise exception 'stripe_payment_intent_id is append-only';
  end if;
  if old.stripe_checkout_session_id is null
     and new.stripe_checkout_session_id is not null
     and new.status <> 'checkout_created' then
    raise exception 'stripe_checkout_session_id must be assigned at checkout_created';
  end if;
  if old.stripe_payment_intent_id is null
     and new.stripe_payment_intent_id is not null
     and new.status <> 'deposit_paid' then
    raise exception 'stripe_payment_intent_id must be assigned at deposit_paid';
  end if;
  return new;
end;
$$;

create function public.enforce_application_state_transition()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = old.status or
     (old.status = 'submitted' and new.status in (
       'qualified', 'declined', 'safety_refused', 'withdrawn', 'redacted'
     )) or
     (old.status = 'qualified' and new.status in (
       'checkout_created', 'declined', 'safety_refused', 'withdrawn', 'redacted'
     )) or
     (old.status = 'declined' and new.status in ('withdrawn', 'redacted')) or
     (old.status = 'safety_refused' and new.status in ('withdrawn', 'redacted')) or
     (old.status = 'checkout_created' and new.status in (
       'deposit_paid', 'safety_refused', 'withdrawn', 'redacted'
     )) or
     (old.status = 'deposit_paid' and new.status in (
       'deposit_refunded', 'safety_refused', 'withdrawn', 'redacted'
     )) or
     (old.status = 'deposit_refunded' and new.status in ('withdrawn', 'redacted')) or
     (old.status = 'withdrawn' and new.status = 'redacted') then
    return new;
  end if;
  raise exception 'invalid application state transition: % -> %', old.status, new.status;
end;
$$;

create trigger pilot_application_state_graph
before update of status on public.pilot_applications
for each row execute function public.enforce_application_state_transition();

create trigger pilot_payment_references_append_only
before update of stripe_checkout_session_id, stripe_payment_intent_id, status
on public.pilot_applications
for each row execute function public.enforce_payment_reference_integrity();

create table public.application_consents (
  application_id uuid primary key references public.pilot_applications(id) on delete cascade,
  privacy_consent boolean not null,
  terms_accepted boolean not null,
  deposit_policy_accepted boolean not null,
  software_disclosure_acknowledged boolean not null,
  marketing_consent boolean,
  pilot_consent_version text not null,
  privacy_notice_version text not null,
  terms_version text not null,
  deposit_policy_version text not null,
  software_disclosure_version text not null,
  recorded_at timestamptz not null default now()
);

create function public.reject_application_consent_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'application_consents rows are immutable';
end;
$$;

create trigger application_consents_immutable
before update on public.application_consents
for each row execute function public.reject_application_consent_update();

create function public.valid_application_event_metadata(metadata_value jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select jsonb_typeof(metadata_value) = 'object'
    and not exists (
      select 1
      from jsonb_each(metadata_value) as entry(key, value)
      where entry.key not in (
        'cohort', 'stripeEventType', 'processor', 'sourceStatus', 'recipientRole'
      )
        or jsonb_typeof(entry.value) <> 'string'
        or coalesce(entry.value #>> '{}', '') !~ '^[a-z0-9][a-z0-9_.:-]{0,119}$'
    );
$$;

create table public.application_events (
  id bigint generated always as identity primary key,
  application_id uuid not null references public.pilot_applications(id) on delete cascade,
  from_state text check (from_state is null or from_state in (
    'submitted', 'qualified', 'declined', 'safety_refused',
    'checkout_created', 'deposit_paid', 'deposit_refunded', 'withdrawn',
    'redacted'
  )),
  to_state text not null check (to_state in (
    'submitted', 'qualified', 'declined', 'safety_refused',
    'checkout_created', 'deposit_paid', 'deposit_refunded', 'withdrawn',
    'redacted'
  )),
  actor text not null check (length(trim(actor)) > 0),
  reason text not null check (length(trim(reason)) > 0),
  occurred_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
    check (public.valid_application_event_metadata(metadata))
);

create table public.stripe_events (
  stripe_event_id text primary key check (
    stripe_event_id ~ '^evt_[A-Za-z0-9_]{1,251}$'
  ),
  event_type text not null check (event_type in (
    'checkout.session.completed',
    'checkout.session.async_payment_succeeded',
    'charge.refunded',
    'charge.dispute.created',
    'charge.dispute.closed'
  )),
  event_fact text not null check (event_fact in (
    'deposit_paid', 'late_payment', 'payment_mismatch',
    'full_refund', 'partial_refund', 'dispute_created', 'dispute_closed'
  )),
  application_id uuid references public.pilot_applications(id) on delete set null,
  payment_intent_id text check (
    payment_intent_id is null or payment_intent_id ~ '^pi_[A-Za-z0-9_]{1,252}$'
  ),
  checkout_session_id text check (
    checkout_session_id is null or checkout_session_id ~ '^cs_[A-Za-z0-9_]{1,252}$'
  ),
  amount integer check (amount is null or amount between 0 and 999999999),
  amount_refunded integer check (
    amount_refunded is null or amount_refunded between 0 and 999999999
  ),
  currency text check (currency is null or currency ~ '^[a-z]{3}$'),
  dispute_status text check (dispute_status is null or dispute_status in (
    'warning_needs_response', 'warning_under_review', 'warning_closed',
    'needs_response', 'under_review', 'won', 'lost'
  )),
  constraint stripe_refund_amounts_consistent check (
    amount_refunded is null or (amount is not null and amount_refunded <= amount)
  ),
  constraint stripe_event_fact_matches_type check (
    (event_type in (
      'checkout.session.completed', 'checkout.session.async_payment_succeeded'
    ) and event_fact in ('deposit_paid', 'late_payment', 'payment_mismatch')) or
    (event_type = 'charge.refunded' and event_fact in (
      'full_refund', 'partial_refund'
    )) or
    (event_type = 'charge.dispute.created' and event_fact = 'dispute_created') or
    (event_type = 'charge.dispute.closed' and event_fact = 'dispute_closed')
  ),
  processed_at timestamptz not null default now()
);

create table public.notification_attempts (
  id bigint generated always as identity primary key,
  application_id uuid not null references public.pilot_applications(id) on delete cascade,
  stripe_event_id text references public.stripe_events(stripe_event_id) on delete cascade,
  application_event_id bigint references public.application_events(id) on delete cascade,
  notification_kind text not null check (notification_kind in (
    'founder_application_received', 'founder_deposit_paid',
    'client_deposit_paid', 'founder_payment_alert'
  )),
  recipient_role text not null check (recipient_role in ('founder', 'client')),
  idempotency_key text not null unique check (
    length(idempotency_key) between 1 and 256
      and idempotency_key ~ '^[A-Za-z0-9:._-]+$'
  ),
  status text not null default 'pending' check (status in (
    'pending', 'sending', 'sent', 'failed'
  )),
  attempt_count integer not null default 0 check (attempt_count between 0 and 5),
  lease_token uuid,
  last_error_code text check (
    last_error_code is null or
      last_error_code ~ '^[a-z0-9][a-z0-9_.:-]{0,119}$'
      and last_error_code in (
        'rate_limited', 'concurrent_request', 'invalid_request',
        'provider_unavailable', 'timeout', 'stale_state',
        'recipient_unavailable'
      )
  ),
  provider_message_id text check (
    provider_message_id is null or provider_message_id ~ '^[A-Za-z0-9_-]{1,255}$'
  ),
  source_state text check (source_state is null or source_state in (
    'submitted', 'qualified', 'declined', 'safety_refused',
    'checkout_created', 'deposit_paid', 'deposit_refunded', 'withdrawn',
    'redacted'
  )),
  source_amount integer check (
    source_amount is null or source_amount between 0 and 999999999
  ),
  source_currency text check (
    source_currency is null or source_currency ~ '^[a-z]{3}$'
  ),
  source_occurred_at timestamptz,
  source_cohort text check (
    source_cohort is null or source_cohort ~ '^[a-z0-9][a-z0-9_.:-]{0,119}$'
  ),
  snapshot_country text check (
    snapshot_country is null or snapshot_country in ('US', 'CA', 'OTHER')
  ),
  snapshot_region text check (
    snapshot_region is null or length(snapshot_region) between 1 and 120
  ),
  payload_to text check (payload_to is null or length(payload_to) between 3 and 320),
  payload_from text check (payload_from is null or length(payload_from) between 3 and 320),
  payload_subject text check (
    payload_subject is null or length(payload_subject) between 1 and 200
  ),
  payload_text text check (
    payload_text is null or length(payload_text) between 1 and 4000
  ),
  payload_hash text check (
    payload_hash is null or payload_hash ~ '^[a-f0-9]{64}$'
  ),
  next_attempt_at timestamptz default now(),
  locked_at timestamptz,
  constraint notification_attempt_exactly_one_source check (
    (stripe_event_id is null) <> (application_event_id is null)
  ),
  constraint notification_attempt_kind_source check (
    (
      notification_kind = 'founder_application_received'
      and application_event_id is not null
    ) or (
      notification_kind <> 'founder_application_received'
      and stripe_event_id is not null
    )
  ),
  constraint notification_attempt_kind_role check (
    (notification_kind = 'client_deposit_paid' and recipient_role = 'client')
      or (
        notification_kind in (
          'founder_application_received', 'founder_deposit_paid',
          'founder_payment_alert'
        )
        and recipient_role = 'founder'
      )
  ),
  constraint notification_attempt_sent_provider check (
    status <> 'sent' or provider_message_id is not null
  ),
  constraint notification_attempt_failed_code check (
    status <> 'failed' or last_error_code is not null
  ),
  constraint notification_attempt_sending_lock check (
    status <> 'sending' or (locked_at is not null and lease_token is not null)
  ),
  constraint notification_payload_all_or_none check (
    (payload_to is null and payload_from is null and payload_subject is null
      and payload_text is null and payload_hash is null)
    or
    (payload_to is not null and payload_from is not null
      and payload_subject is not null and payload_text is not null
      and payload_hash is not null)
  ),
  constraint notification_source_snapshot_all_or_none check (
    (source_state is null and source_amount is null and source_currency is null
      and source_occurred_at is null and source_cohort is null)
    or
    (source_state is not null and source_amount is not null
      and source_currency is not null and source_occurred_at is not null
      and source_cohort is not null)
  ),
  constraint notification_active_source_snapshot check (
    status not in ('pending', 'sending') or source_state is not null
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email = lower(trim(email))),
  lang text check (lang in ('zh', 'en')),
  marketing_consent boolean not null default false,
  consent_version text,
  consented_at timestamptz,
  unsubscribed_at timestamptz,
  created_at timestamptz not null default now()
);

create index pilot_applications_status_idx on public.pilot_applications(status);
create index pilot_applications_retention_idx
  on public.pilot_applications(retention_delete_after)
  where retention_delete_after is not null;
create index application_events_application_idx
  on public.application_events(application_id, occurred_at);
create index stripe_events_payment_intent_idx
  on public.stripe_events(payment_intent_id)
  where payment_intent_id is not null;
create index notification_attempts_status_idx
  on public.notification_attempts(application_id, status, next_attempt_at);
create unique index notification_attempts_stripe_source_unique
  on public.notification_attempts(
    stripe_event_id, notification_kind, recipient_role
  ) where stripe_event_id is not null;
create unique index notification_attempts_application_source_unique
  on public.notification_attempts(
    application_event_id, notification_kind, recipient_role
  ) where application_event_id is not null;

alter table public.pilot_applications enable row level security;
alter table public.application_consents enable row level security;
alter table public.application_events enable row level security;
alter table public.stripe_events enable row level security;
alter table public.notification_attempts enable row level security;
alter table public.subscribers enable row level security;

comment on table public.pilot_applications is
  'Server-only paid-pilot applications. No public RLS policies by design.';
