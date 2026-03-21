-- ===========================================
-- Sprint 6: Push notification tokens
-- Migration: 005_push_tokens
-- ===========================================

CREATE TABLE push_tokens (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id  uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  expo_push_token text NOT NULL,
  device_name   text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, expo_push_token)
);

ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

-- Users can manage their own tokens
CREATE POLICY "users can manage own push tokens"
  ON push_tokens FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Workspace members can read tokens of other members in same workspace
-- (needed by the notify API which runs with user auth, not service role)
CREATE POLICY "workspace members can read push tokens"
  ON push_tokens FOR SELECT
  USING (is_workspace_member(workspace_id));
