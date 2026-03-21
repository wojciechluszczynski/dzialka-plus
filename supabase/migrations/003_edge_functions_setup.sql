-- ===========================================
-- DecisionEngine — Edge Function Helpers
-- Migration: 003_edge_functions_setup
-- ===========================================

-- Function to log activity (called from Edge Functions / triggers)
create or replace function log_plot_activity(
  p_workspace_id uuid,
  p_plot_id uuid,
  p_user_id uuid,
  p_action text,
  p_from_value jsonb default null,
  p_to_value jsonb default null,
  p_metadata jsonb default null
) returns uuid language plpgsql security definer as $$
declare
  v_id uuid;
begin
  insert into plot_activity (workspace_id, plot_id, user_id, action, from_value, to_value, metadata)
  values (p_workspace_id, p_plot_id, p_user_id, p_action, p_from_value, p_to_value, p_metadata)
  returning id into v_id;
  return v_id;
end;
$$;

-- Function to compute shared score
create or replace function compute_plot_score(p_plot_id uuid)
returns void language plpgsql security definer as $$
declare
  v_workspace_id uuid;
  v_owner_score numeric;
  v_editor_score numeric;
  v_shared_score numeric;
  v_disagreement numeric;
  v_dealbreaker boolean;
  v_verdict verdict;
  v_weights jsonb;
  -- assessment rows
  v_owner_assess plot_assessments;
  v_editor_assess plot_assessments;
  -- owner/editor user ids
  v_owner_id uuid;
  v_editor_id uuid;
begin
  -- Get workspace
  select workspace_id into v_workspace_id from plots where id = p_plot_id;

  -- Get owner and editor
  select user_id into v_owner_id from workspace_members
    where workspace_id = v_workspace_id and role = 'owner' limit 1;
  select user_id into v_editor_id from workspace_members
    where workspace_id = v_workspace_id and role = 'editor' limit 1;

  -- Get weights from active scoring profile
  select weights into v_weights from scoring_profiles
    where workspace_id = v_workspace_id and is_active = true limit 1;
  if v_weights is null then
    v_weights := '{"location":0.25,"size_shape":0.15,"price":0.20,"infrastructure":0.15,"legal":0.15,"vibes":0.10}'::jsonb;
  end if;

  -- Get assessments
  select * into v_owner_assess from plot_assessments
    where plot_id = p_plot_id and user_id = v_owner_id;
  select * into v_editor_assess from plot_assessments
    where plot_id = p_plot_id and user_id = v_editor_id;

  -- Compute individual scores (weighted sum)
  if v_owner_assess.id is not null then
    v_owner_score := (
      coalesce(v_owner_assess.score_location, 0) * (v_weights->>'location')::numeric +
      coalesce(v_owner_assess.score_size_shape, 0) * (v_weights->>'size_shape')::numeric +
      coalesce(v_owner_assess.score_price, 0) * (v_weights->>'price')::numeric +
      coalesce(v_owner_assess.score_infrastructure, 0) * (v_weights->>'infrastructure')::numeric +
      coalesce(v_owner_assess.score_legal, 0) * (v_weights->>'legal')::numeric +
      coalesce(v_owner_assess.score_vibes, 0) * (v_weights->>'vibes')::numeric
    );
  end if;

  if v_editor_assess.id is not null then
    v_editor_score := (
      coalesce(v_editor_assess.score_location, 0) * (v_weights->>'location')::numeric +
      coalesce(v_editor_assess.score_size_shape, 0) * (v_weights->>'size_shape')::numeric +
      coalesce(v_editor_assess.score_price, 0) * (v_weights->>'price')::numeric +
      coalesce(v_editor_assess.score_infrastructure, 0) * (v_weights->>'infrastructure')::numeric +
      coalesce(v_editor_assess.score_legal, 0) * (v_weights->>'legal')::numeric +
      coalesce(v_editor_assess.score_vibes, 0) * (v_weights->>'vibes')::numeric
    );
  end if;

  -- Check deal breakers
  v_dealbreaker := (
    (v_owner_assess.id is not null and array_length(v_owner_assess.deal_breakers_triggered, 1) > 0) or
    (v_editor_assess.id is not null and array_length(v_editor_assess.deal_breakers_triggered, 1) > 0)
  );

  -- Compute shared score with disagreement penalty
  if v_owner_score is not null and v_editor_score is not null then
    v_disagreement := abs(v_owner_score - v_editor_score) / 10.0;
    v_shared_score := (v_owner_score + v_editor_score) / 2.0 - (0.8 * v_disagreement * 10.0);
    v_shared_score := greatest(0, v_shared_score);
  elsif v_owner_score is not null then
    v_shared_score := v_owner_score;
  elsif v_editor_score is not null then
    v_shared_score := v_editor_score;
  end if;

  -- Apply deal breaker cap
  if v_dealbreaker and v_shared_score is not null then
    v_shared_score := least(v_shared_score, 3.0);
  end if;

  -- Determine verdict
  if v_shared_score is not null then
    if v_dealbreaker then
      v_verdict := 'no';
    elsif v_shared_score >= 7.5 then
      v_verdict := 'go';
    elsif v_shared_score >= 6.0 then
      v_verdict := 'maybe';
    else
      v_verdict := 'no';
    end if;
  end if;

  -- Upsert
  insert into plot_scores (plot_id, workspace_id, score_owner, score_editor, score_shared,
    disagreement, dealbreaker_triggered, verdict, computed_at)
  values (p_plot_id, v_workspace_id, v_owner_score, v_editor_score, v_shared_score,
    v_disagreement, v_dealbreaker, v_verdict, now())
  on conflict (plot_id) do update set
    score_owner = excluded.score_owner,
    score_editor = excluded.score_editor,
    score_shared = excluded.score_shared,
    disagreement = excluded.disagreement,
    dealbreaker_triggered = excluded.dealbreaker_triggered,
    verdict = excluded.verdict,
    computed_at = now();
end;
$$;
