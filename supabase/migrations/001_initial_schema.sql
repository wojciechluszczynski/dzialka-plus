-- ===========================================
-- DecisionEngine — Initial Schema
-- Migration: 001_initial_schema
-- ===========================================

-- Enable extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";

-- =====================
-- WORKSPACES
-- =====================
create table workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'editor')),
  joined_at timestamptz not null default now(),
  unique(workspace_id, user_id)
);

create table workspace_invites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  invite_token text not null unique,
  invited_by uuid not null references auth.users(id),
  expires_at timestamptz not null default (now() + interval '7 days'),
  used_at timestamptz,
  used_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index on workspace_invites(invite_token) where used_at is null;

-- =====================
-- PLOTS
-- =====================
create type plot_status as enum (
  'inbox', 'draft', 'to_analyze', 'to_visit', 'visited',
  'due_diligence', 'shortlist', 'top3', 'rejected', 'closed'
);

create type source_type as enum (
  'facebook_group', 'facebook_marketplace', 'otodom', 'olx',
  'gratka', 'adresowo', 'agent', 'direct', 'other'
);

create table plots (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  created_by uuid not null references auth.users(id),
  status plot_status not null default 'inbox',

  -- Core fields
  title text,
  description text,
  asking_price_pln numeric(12,2),
  area_m2 numeric(10,2),
  price_per_m2_pln numeric(10,2) generated always as (
    case
      when area_m2 is null or area_m2 = 0 or asking_price_pln is null
      then null
      else asking_price_pln / area_m2
    end
  ) stored,

  -- Location
  location_text text,
  parcel_id text,
  address_freeform text,
  lat numeric(10,7),
  lng numeric(10,7),

  -- Source
  source_url text,
  source_type source_type,

  -- Utilities
  has_electricity boolean,
  has_water boolean,
  has_sewage boolean,
  has_gas boolean,
  has_fiber boolean,
  has_road_access boolean,

  -- Zoning
  zoning text,

  -- Flags
  is_deleted boolean not null default false,
  ai_processed_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index on plots(workspace_id, status) where is_deleted = false;
create index on plots(workspace_id, created_at desc) where is_deleted = false;
create index on plots using gin(title gin_trgm_ops) where is_deleted = false;

-- Deduplicate source_url per workspace
create unique index on plots(workspace_id, source_url)
  where source_url is not null and is_deleted = false;

-- =====================
-- PLOT SOURCES
-- =====================
create table plot_sources (
  id uuid primary key default gen_random_uuid(),
  plot_id uuid not null references plots(id) on delete cascade,
  source_type source_type not null,
  source_url text,
  raw_text text,
  fb_group_name text,
  fb_author text,
  scraped_at timestamptz,
  created_at timestamptz not null default now()
);

-- =====================
-- PLOT CONTACTS
-- =====================
create type contact_type as enum ('owner', 'agent', 'unknown');
create type contact_log_type as enum ('call', 'sms', 'messenger', 'whatsapp', 'email', 'visit', 'other');

create table plot_contacts (
  id uuid primary key default gen_random_uuid(),
  plot_id uuid not null references plots(id) on delete cascade,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name text,
  phone text,
  email text,
  contact_type contact_type default 'unknown',
  notes text,
  created_at timestamptz not null default now()
);

create table contact_logs (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references plot_contacts(id) on delete cascade,
  plot_id uuid not null references plots(id) on delete cascade,
  log_type contact_log_type not null,
  summary text,
  happened_at timestamptz not null default now(),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

-- =====================
-- PLOT MEDIA
-- =====================
create type media_type as enum ('listing_image', 'screenshot', 'visit_photo', 'document', 'other');

create table plot_media (
  id uuid primary key default gen_random_uuid(),
  plot_id uuid not null references plots(id) on delete cascade,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  storage_path text not null,
  media_type media_type not null default 'listing_image',
  caption text,
  sort_order int not null default 0,
  uploaded_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
create index on plot_media(plot_id, sort_order);

-- =====================
-- PLOT NOTES
-- =====================
create table plot_notes (
  id uuid primary key default gen_random_uuid(),
  plot_id uuid not null references plots(id) on delete cascade,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  content text not null,
  is_voice boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =====================
-- SCORING
-- =====================
create table scoring_profiles (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name text not null default 'Default',
  weights jsonb not null default '{
    "location": 0.25,
    "size_shape": 0.15,
    "price": 0.20,
    "infrastructure": 0.15,
    "legal": 0.15,
    "vibes": 0.10
  }',
  deal_breakers jsonb not null default '["no_road","flood_risk","power_line","no_legal","no_building","too_small"]',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table plot_assessments (
  id uuid primary key default gen_random_uuid(),
  plot_id uuid not null references plots(id) on delete cascade,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  -- Criteria scores 0-10
  score_location numeric(4,2),
  score_size_shape numeric(4,2),
  score_price numeric(4,2),
  score_infrastructure numeric(4,2),
  score_legal numeric(4,2),
  score_vibes numeric(4,2),
  -- Deal breakers
  deal_breakers_triggered text[] not null default '{}',
  notes text,
  assessed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique(plot_id, user_id)
);

create type verdict as enum ('go', 'maybe', 'no');

create table plot_scores (
  id uuid primary key default gen_random_uuid(),
  plot_id uuid not null references plots(id) on delete cascade unique,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  score_owner numeric(4,2),
  score_editor numeric(4,2),
  score_shared numeric(4,2),
  disagreement numeric(4,2),
  dealbreaker_triggered boolean not null default false,
  verdict verdict,
  computed_at timestamptz not null default now()
);

-- =====================
-- AI REPORTS
-- =====================
create table plot_ai_reports (
  id uuid primary key default gen_random_uuid(),
  plot_id uuid not null references plots(id) on delete cascade,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  extraction_json jsonb,
  risk_flags_json jsonb,
  valuation_json jsonb,
  questions_json jsonb,
  verdict_summary jsonb,
  extraction_confidence numeric(3,2),
  model_used text,
  processed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- =====================
-- ENRICHMENTS
-- =====================
create table plot_enrichments (
  id uuid primary key default gen_random_uuid(),
  plot_id uuid not null references plots(id) on delete cascade,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  -- RCN stats
  rcn_median_price_m2 numeric(10,2),
  rcn_p25_price_m2 numeric(10,2),
  rcn_p75_price_m2 numeric(10,2),
  rcn_comparables_count int,
  rcn_radius_km numeric(5,2),
  -- ISOK flood
  isok_flood_zone text,
  isok_flood_risk_level text,
  -- PSE power lines
  pse_power_line_nearby boolean,
  pse_power_line_distance_m int,
  -- Travel times (JSON: [{target_name, mode, duration_min}])
  travel_times jsonb,
  -- POI (JSON array)
  poi_data jsonb,
  enriched_at timestamptz not null default now()
);

-- =====================
-- ACTIVITY LOG
-- =====================
create table plot_activity (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  plot_id uuid references plots(id) on delete set null,
  user_id uuid references auth.users(id),
  action text not null,
  from_value jsonb,
  to_value jsonb,
  metadata jsonb,
  created_at timestamptz not null default now()
);
create index on plot_activity(workspace_id, created_at desc);
create index on plot_activity(plot_id, created_at desc) where plot_id is not null;

-- =====================
-- COMMUTE TARGETS
-- =====================
create table commute_targets (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name text not null,
  address text not null,
  lat numeric(10,7),
  lng numeric(10,7),
  max_commute_min int,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- =====================
-- INTEGRATION ENDPOINTS
-- =====================
create table integration_endpoints (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name text not null,
  endpoint_type text not null,
  url text not null,
  config jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- =====================
-- UPDATED_AT TRIGGER
-- =====================
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger workspaces_updated_at before update on workspaces
  for each row execute function update_updated_at();
create trigger plots_updated_at before update on plots
  for each row execute function update_updated_at();
