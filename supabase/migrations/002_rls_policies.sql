-- ===========================================
-- DecisionEngine — Row Level Security
-- Migration: 002_rls_policies
-- ===========================================

-- Enable RLS on all tables
alter table workspaces enable row level security;
alter table workspace_members enable row level security;
alter table workspace_invites enable row level security;
alter table plots enable row level security;
alter table plot_sources enable row level security;
alter table plot_contacts enable row level security;
alter table contact_logs enable row level security;
alter table plot_media enable row level security;
alter table plot_notes enable row level security;
alter table scoring_profiles enable row level security;
alter table plot_assessments enable row level security;
alter table plot_scores enable row level security;
alter table plot_ai_reports enable row level security;
alter table plot_enrichments enable row level security;
alter table plot_activity enable row level security;
alter table commute_targets enable row level security;
alter table integration_endpoints enable row level security;

-- =====================
-- HELPER FUNCTION: is_workspace_member
-- =====================
create or replace function is_workspace_member(ws_id uuid)
returns boolean language sql security definer stable as $$
  select exists(
    select 1 from workspace_members
    where workspace_id = ws_id and user_id = auth.uid()
  );
$$;

create or replace function is_workspace_owner(ws_id uuid)
returns boolean language sql security definer stable as $$
  select exists(
    select 1 from workspace_members
    where workspace_id = ws_id and user_id = auth.uid() and role = 'owner'
  );
$$;

-- =====================
-- WORKSPACES
-- =====================
create policy "members can view workspace"
  on workspaces for select
  using (is_workspace_member(id));

create policy "owner can update workspace"
  on workspaces for update
  using (is_workspace_owner(id));

create policy "authenticated users can create workspace"
  on workspaces for insert
  with check (auth.uid() = created_by);

-- =====================
-- WORKSPACE MEMBERS
-- =====================
create policy "members can view workspace_members"
  on workspace_members for select
  using (is_workspace_member(workspace_id));

create policy "owner can manage workspace_members"
  on workspace_members for all
  using (is_workspace_owner(workspace_id));

create policy "users can join via invite (insert own record)"
  on workspace_members for insert
  with check (auth.uid() = user_id);

-- =====================
-- WORKSPACE INVITES
-- =====================
create policy "owners can manage invites"
  on workspace_invites for all
  using (is_workspace_owner(workspace_id));

create policy "anyone can read valid invite by token"
  on workspace_invites for select
  using (expires_at > now() and used_at is null);

-- =====================
-- PLOTS
-- =====================
create policy "members can view plots"
  on plots for select
  using (is_workspace_member(workspace_id));

create policy "members can create plots"
  on plots for insert
  with check (is_workspace_member(workspace_id) and auth.uid() = created_by);

create policy "members can update plots"
  on plots for update
  using (is_workspace_member(workspace_id));

create policy "owner can delete plots"
  on plots for delete
  using (is_workspace_owner(workspace_id));

-- =====================
-- PLOT-SCOPED TABLES (generic workspace member access)
-- =====================
-- plot_sources
create policy "members can manage plot_sources"
  on plot_sources for all
  using (exists(select 1 from plots p where p.id = plot_id and is_workspace_member(p.workspace_id)));

-- plot_contacts
create policy "members can manage plot_contacts"
  on plot_contacts for all
  using (is_workspace_member(workspace_id));

-- contact_logs
create policy "members can manage contact_logs"
  on contact_logs for all
  using (exists(select 1 from plots p where p.id = plot_id and is_workspace_member(p.workspace_id)));

-- plot_media
create policy "members can manage plot_media"
  on plot_media for all
  using (is_workspace_member(workspace_id));

-- plot_notes
create policy "members can manage plot_notes"
  on plot_notes for all
  using (is_workspace_member(workspace_id));

-- scoring_profiles
create policy "members can view scoring_profiles"
  on scoring_profiles for select
  using (is_workspace_member(workspace_id));
create policy "owner can manage scoring_profiles"
  on scoring_profiles for all
  using (is_workspace_owner(workspace_id));

-- plot_assessments
create policy "members can manage own assessments"
  on plot_assessments for all
  using (is_workspace_member(workspace_id));

-- plot_scores
create policy "members can view plot_scores"
  on plot_scores for select
  using (is_workspace_member(workspace_id));
create policy "service role can manage plot_scores"
  on plot_scores for all
  using (is_workspace_member(workspace_id));

-- plot_ai_reports
create policy "members can view ai_reports"
  on plot_ai_reports for select
  using (is_workspace_member(workspace_id));
create policy "service role can insert ai_reports"
  on plot_ai_reports for insert
  with check (is_workspace_member(workspace_id));

-- plot_enrichments
create policy "members can view enrichments"
  on plot_enrichments for select
  using (is_workspace_member(workspace_id));
create policy "service role can insert enrichments"
  on plot_enrichments for insert
  with check (is_workspace_member(workspace_id));

-- plot_activity
create policy "members can view activity"
  on plot_activity for select
  using (is_workspace_member(workspace_id));
create policy "members can insert activity"
  on plot_activity for insert
  with check (is_workspace_member(workspace_id) and auth.uid() = user_id);

-- commute_targets
create policy "members can view commute_targets"
  on commute_targets for select
  using (is_workspace_member(workspace_id));
create policy "owner can manage commute_targets"
  on commute_targets for all
  using (is_workspace_owner(workspace_id));

-- integration_endpoints
create policy "members can view integration_endpoints"
  on integration_endpoints for select
  using (is_workspace_member(workspace_id));
create policy "owner can manage integration_endpoints"
  on integration_endpoints for all
  using (is_workspace_owner(workspace_id));
