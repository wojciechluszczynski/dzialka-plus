// ===========================================
// DecisionEngine — Database Types
// Auto-maintained — sync with Supabase schema
// ===========================================

export type PlotStatus =
  | 'inbox'
  | 'draft'
  | 'to_analyze'
  | 'to_visit'
  | 'visited'
  | 'due_diligence'
  | 'shortlist'
  | 'top3'
  | 'rejected'
  | 'closed'

export type SourceType =
  | 'facebook_group'
  | 'facebook_marketplace'
  | 'otodom'
  | 'olx'
  | 'gratka'
  | 'adresowo'
  | 'agent'
  | 'direct'
  | 'other'

export type ContactType = 'owner' | 'agent' | 'unknown'
export type ContactLogType = 'call' | 'sms' | 'messenger' | 'whatsapp' | 'email' | 'visit' | 'other'
export type MediaType = 'listing_image' | 'screenshot' | 'visit_photo' | 'document' | 'other'
export type Verdict = 'go' | 'maybe' | 'no'
export type MemberRole = 'owner' | 'editor'

// =====================
// Row types
// =====================

export interface Workspace {
  id: string
  name: string
  created_by: string
  created_at: string
  updated_at: string
}

export interface WorkspaceMember {
  id: string
  workspace_id: string
  user_id: string
  role: MemberRole
  joined_at: string
}

export interface WorkspaceInvite {
  id: string
  workspace_id: string
  invite_token: string
  invited_by: string
  expires_at: string
  used_at: string | null
  used_by: string | null
  created_at: string
}

export interface Plot {
  id: string
  workspace_id: string
  created_by: string
  status: PlotStatus
  title: string | null
  description: string | null
  asking_price_pln: number | null
  area_m2: number | null
  price_per_m2_pln: number | null // generated column
  location_text: string | null
  parcel_id: string | null
  address_freeform: string | null
  lat: number | null
  lng: number | null
  source_url: string | null
  source_type: SourceType | null
  has_electricity: boolean | null
  has_water: boolean | null
  has_sewage: boolean | null
  has_gas: boolean | null
  has_fiber: boolean | null
  has_road_access: boolean | null
  zoning: string | null
  is_deleted: boolean
  ai_processed_at: string | null
  created_at: string
  updated_at: string
}

export interface PlotSource {
  id: string
  plot_id: string
  source_type: SourceType
  source_url: string | null
  raw_text: string | null
  fb_group_name: string | null
  fb_author: string | null
  scraped_at: string | null
  created_at: string
}

export interface PlotContact {
  id: string
  plot_id: string
  workspace_id: string
  name: string | null
  phone: string | null
  email: string | null
  contact_type: ContactType
  notes: string | null
  created_at: string
}

export interface ContactLog {
  id: string
  contact_id: string
  plot_id: string
  log_type: ContactLogType
  summary: string | null
  happened_at: string
  created_by: string
  created_at: string
}

export interface PlotMedia {
  id: string
  plot_id: string
  workspace_id: string
  storage_path: string
  media_type: MediaType
  caption: string | null
  sort_order: number
  uploaded_by: string
  created_at: string
}

export interface PlotNote {
  id: string
  plot_id: string
  workspace_id: string
  user_id: string
  content: string
  is_voice: boolean
  created_at: string
  updated_at: string
}

export interface ScoringProfile {
  id: string
  workspace_id: string
  name: string
  weights: ScoringWeights
  deal_breakers: DealBreakerKey[]
  is_active: boolean
  created_at: string
}

export interface ScoringWeights {
  location: number
  size_shape: number
  price: number
  infrastructure: number
  legal: number
  vibes: number
}

export type DealBreakerKey =
  | 'no_road'
  | 'flood_risk'
  | 'power_line'
  | 'no_legal'
  | 'no_building'
  | 'too_small'

export interface PlotAssessment {
  id: string
  plot_id: string
  workspace_id: string
  user_id: string
  score_location: number | null
  score_size_shape: number | null
  score_price: number | null
  score_infrastructure: number | null
  score_legal: number | null
  score_vibes: number | null
  deal_breakers_triggered: DealBreakerKey[]
  notes: string | null
  assessed_at: string
  created_at: string
}

export interface PlotScore {
  id: string
  plot_id: string
  workspace_id: string
  score_owner: number | null
  score_editor: number | null
  score_shared: number | null
  disagreement: number | null
  dealbreaker_triggered: boolean
  verdict: Verdict | null
  computed_at: string
}

export interface PlotAiReport {
  id: string
  plot_id: string
  workspace_id: string
  extraction_json: ExtractionJson | null
  risk_flags_json: RiskFlagsJson | null
  valuation_json: ValuationJson | null
  questions_json: QuestionsJson | null
  verdict_summary: VerdictSummaryJson | null
  extraction_confidence: number | null
  model_used: string | null
  processed_at: string
  created_at: string
}

export interface PlotEnrichment {
  id: string
  plot_id: string
  workspace_id: string
  rcn_median_price_m2: number | null
  rcn_p25_price_m2: number | null
  rcn_p75_price_m2: number | null
  rcn_comparables_count: number | null
  rcn_radius_km: number | null
  isok_flood_zone: string | null
  isok_flood_risk_level: string | null
  pse_power_line_nearby: boolean | null
  pse_power_line_distance_m: number | null
  travel_times: TravelTime[] | null
  poi_data: PoiItem[] | null
  enriched_at: string
}

export interface PlotActivity {
  id: string
  workspace_id: string
  plot_id: string | null
  user_id: string | null
  action: string
  from_value: unknown
  to_value: unknown
  metadata: unknown
  created_at: string
}

export interface CommuteTarget {
  id: string
  workspace_id: string
  name: string
  address: string
  lat: number | null
  lng: number | null
  max_commute_min: number | null
  sort_order: number
  created_at: string
}

// =====================
// AI JSON shapes
// =====================

export interface ExtractionJson {
  title: string | null
  asking_price_pln: number | null
  area_m2: number | null
  price_per_m2_pln: number | null
  location_text: string | null
  parcel_id: string | null
  address_freeform: string | null
  description: string | null
  contact_phone: string | null
  contact_name: string | null
  contact_type: ContactType | null
  utilities: {
    electricity: boolean | null
    water: boolean | null
    sewage: boolean | null
    gas: boolean | null
    fiber: boolean | null
  }
  road_access: boolean | null
  zoning: string | null
  facts: string[]
  inferences: string[]
  missing_fields: string[]
  confidence_overall: number
  field_confidence: Record<string, { value: unknown; confidence: number; evidence: string }>
}

export interface RiskFlag {
  type: string
  severity: 'low' | 'med' | 'high'
  label: string
  rationale: string
  confidence: number
  evidence: string
  is_inference: boolean
}

export interface DealBreaker {
  key: DealBreakerKey
  label: string
  triggered: boolean
  rationale: string
}

export interface RiskFlagsJson {
  risk_flags: RiskFlag[]
  deal_breakers: DealBreaker[]
  missing_due_diligence: Array<{ item: string; priority: 'must' | 'should' | 'nice' }>
  recommended_next_actions: Array<{ action: string; reason: string }>
  confidence_overall: number
  analysis_notes: string
}

export interface ValuationJson {
  price_per_m2_asking: number | null
  price_position: 'cheap' | 'fair' | 'expensive' | 'unknown'
  price_position_label: string
  percentile_estimate: number | null
  explanation: string
  confidence: number
  data_quality: 'good' | 'limited' | 'none'
  rcn_summary: {
    median_price_m2: number | null
    comparables_count: number | null
    radius_km: number | null
  } | null
  what_data_would_change_this: string[]
  caveats: string[]
}

export interface QuestionsJson {
  must_ask_before_contact: Array<{
    question: string
    context: string
    risk_key: string | null
  }>
  negotiation_questions: Array<{
    question: string
    goal: string
  }>
  on_site_checklist: Array<{
    item: string
    category: 'access' | 'utilities' | 'environment' | 'legal' | 'technical' | 'vibe'
    how_to_verify: string
  }>
  red_flags_to_watch: string[]
  total_count: number
}

export interface VerdictSummaryJson {
  verdict: Verdict
  verdict_label: string
  verdict_color: 'green' | 'orange' | 'red'
  headline: string
  summary: string
  key_strengths: string[]
  key_risks: string[]
  blocking_issues: string[]
  recommended_next_step: string
  disagreement_note: string | null
  confidence_overall: number
  unknowns: string[]
  ai_disclaimer: string
}

export interface TravelTime {
  target_name: string
  mode: 'driving' | 'transit' | 'cycling' | 'walking'
  duration_min: number
}

export interface PoiItem {
  name: string
  category: string
  distance_m: number
  lat: number
  lng: number
}
