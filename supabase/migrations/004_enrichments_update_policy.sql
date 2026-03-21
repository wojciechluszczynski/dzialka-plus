-- ===========================================
-- Sprint 5: Enrichment update policy
-- Migration: 004_enrichments_update_policy
-- ===========================================

-- Add UPDATE policy for plot_enrichments (needed for refresh flow)
CREATE POLICY "service role can update enrichments"
  ON plot_enrichments FOR UPDATE
  USING (is_workspace_member(workspace_id));

-- Add unique constraint on plot_id so upsert works cleanly
ALTER TABLE plot_enrichments
  ADD CONSTRAINT plot_enrichments_plot_id_key UNIQUE (plot_id);
