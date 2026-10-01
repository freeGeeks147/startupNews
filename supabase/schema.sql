-- Postgres schema for the Supabase phase. Until then the site reads data/*.json,
-- which mirrors these tables (companies, investors, rounds with nested investors/sources/note).

create table companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  website text,
  city text,
  founded_year int,
  vertical text,
  subsector text,
  is_adjacent bool default false,
  description text
);

create table rounds (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id),
  announced_on date not null,
  kind text check (kind in ('equity', 'debt', 'grant', 'acquisition')),
  stage text,                    -- pre-seed, seed, A, B, C+, grant
  amount_inr numeric,
  amount_usd numeric,
  currency_original text,
  is_undisclosed bool default false,
  status text default 'pending'  -- pending | approved | rejected
);

create table investors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  type text                      -- vc, angel, cvc, govt, family_office
);

create table round_investors (
  round_id uuid references rounds(id),
  investor_id uuid references investors(id),
  is_lead bool default false,
  primary key (round_id, investor_id)
);

create table sources (
  id uuid primary key default gen_random_uuid(),
  round_id uuid references rounds(id),
  url text not null,
  publisher text,
  fetched_at timestamptz
);

create table notes (
  round_id uuid primary key references rounds(id),
  one_liner text,
  core_tech text,
  trl int check (trl between 1 and 9),
  trl_reason text,
  technical_risk text,
  comparables text,
  take text,
  written_on date
);
