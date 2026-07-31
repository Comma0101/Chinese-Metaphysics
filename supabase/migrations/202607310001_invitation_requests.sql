-- Public invitation-request funnel: lightweight pre-qualification before
-- the full pilot application (which requires an access code).
-- No birth data, no personal narrative — only decision context and contact.

create table if not exists invitation_requests (
  id bigint generated always as identity primary key,
  email text not null,
  lang text not null default 'zh' check (lang in ('zh', 'en')),
  country text not null,
  city text,
  decision_type text not null,
  decision_window text not null,
  price_acknowledged boolean not null default false,
  status text not null default 'new' check (status in ('new', 'invited', 'converted', 'declined')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint invitation_requests_email_key unique (email)
);

-- Index for the operator queue (review new requests by recency).
create index if not exists idx_invitation_requests_status_created
  on invitation_requests (status, created_at desc);

comment on table invitation_requests is
  'Public founding-cohort invitation requests. No birth data or sensitive personal info.';
