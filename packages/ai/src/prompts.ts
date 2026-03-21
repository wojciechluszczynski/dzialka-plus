// ===========================================
// DecisionEngine — AI Prompt Library
// Model: claude-sonnet-4-5 (or newer)
// ALL prompts: temperature 0.1, max_tokens 4096
// ===========================================

export const PROMPT_NAMES = {
  EXTRACT_LISTING: 'EXTRACT_LISTING',
  FLAG_RISKS: 'FLAG_RISKS',
  VALUATION_NOTE: 'VALUATION_NOTE',
  GENERATE_QUESTIONS: 'GENERATE_QUESTIONS',
  VERDICT_SUMMARY: 'VERDICT_SUMMARY',
} as const

export type PromptName = keyof typeof PROMPT_NAMES

// =====================
// PROMPT 1: EXTRACT_LISTING
// =====================
export const SYSTEM_EXTRACT_LISTING = `You are a strict information extraction engine for land plot listings in Poland.
Return ONLY valid JSON that matches the provided schema. No prose, no markdown, no explanation.
Language: respond in Polish for all human-readable fields (labels, explanations).
Today's date: {{TODAY_DATE}}`

export function buildExtractListingPrompt(params: {
  sourceUrl: string
  sourceType: string
  rawText: string
  imageReferences: string[]
  todayDate: string
}): { system: string; user: string } {
  const system = SYSTEM_EXTRACT_LISTING.replace('{{TODAY_DATE}}', params.todayDate)

  const user = `Extract structured listing data from the following source:
- source_url: ${params.sourceUrl}
- source_type: ${params.sourceType}
- raw_text: ${params.rawText || '(empty)'}
- screenshots: ${JSON.stringify(params.imageReferences)}

Constraints:
- If a field is missing from the source, return null and add the field key to missing_fields[].
- For each extracted field, include confidence (0.0–1.0) and evidence (short quote from text or "screenshot hint: [description]").
- Do not guess parcel_id or exact GPS coordinates if not explicitly present in source.
- Separate facts (directly stated) from inferences (you derived logically).
- If price or area can be calculated from other fields (e.g. "50 zł/m² za 1500 m²"), compute and note as inference.

JSON_SCHEMA:
{
  "title": string | null,
  "asking_price_pln": number | null,
  "area_m2": number | null,
  "price_per_m2_pln": number | null,
  "location_text": string | null,
  "parcel_id": string | null,
  "address_freeform": string | null,
  "description": string | null,
  "contact_phone": string | null,
  "contact_name": string | null,
  "contact_type": "owner" | "agent" | "unknown" | null,
  "utilities": {
    "electricity": boolean | null,
    "water": boolean | null,
    "sewage": boolean | null,
    "gas": boolean | null,
    "fiber": boolean | null
  },
  "road_access": boolean | null,
  "zoning": string | null,
  "facts": string[],
  "inferences": string[],
  "missing_fields": string[],
  "confidence_overall": number,
  "field_confidence": {
    "[field_name]": { "value": any, "confidence": number, "evidence": string }
  }
}`

  return { system, user }
}

// =====================
// PROMPT 2: FLAG_RISKS
// =====================
export const SYSTEM_FLAG_RISKS = `You identify risk signals for buying a building plot in Poland.
Separate FACTS (supported by direct evidence) from INFERENCES (uncertain, derived logically).
Always respond in Polish for labels and rationale.
Output JSON only. No prose.`

export function buildFlagRisksPrompt(params: {
  extractionJson: unknown
  enrichmentJson: unknown
  userPreferences: {
    minAreaM2: number
    maxCommuteKm: number
    targetCities: string[]
    wantsView: boolean
    wantsForestNearby: boolean
    wantsPrivacy: boolean
  }
}): { system: string; user: string } {
  const user = `Analyze risks for this building plot:
- extracted_listing: ${JSON.stringify(params.extractionJson)}
- enrichment_data: ${JSON.stringify(params.enrichmentJson)}
- user_preferences: ${JSON.stringify({
    min_area_m2: params.userPreferences.minAreaM2,
    max_commute_km: params.userPreferences.maxCommuteKm,
    target_cities: params.userPreferences.targetCities,
    wants_view: params.userPreferences.wantsView,
    wants_forest_nearby: params.userPreferences.wantsForestNearby,
    wants_privacy: params.userPreferences.wantsPrivacy,
  })}

Return JSON with: risk_flags[], deal_breakers[], missing_due_diligence[], recommended_next_actions[], confidence_overall, analysis_notes.

Each risk_flag: { type, severity ("low"|"med"|"high"), label (Polish, max 60 chars), rationale (Polish, max 200 chars), confidence, evidence, is_inference }
Each deal_breaker: { key ("no_road"|"flood_risk"|"power_line"|"no_legal"|"no_building"|"too_small"), label, triggered, rationale }
Each missing_due_diligence: { item (Polish), priority ("must"|"should"|"nice") }
Each recommended_next_actions: { action (Polish), reason }`

  return { system: SYSTEM_FLAG_RISKS, user }
}

// =====================
// PROMPT 3: VALUATION_NOTE
// =====================
export const SYSTEM_VALUATION_NOTE = `You are a conservative real estate valuation assistant for building plots in Poland.
Your content must be conservative — never overstate confidence.
If comparable data is insufficient, say so explicitly.
If RCN stats are null or empty, return price_position = "unknown" with explanation.
Respond in Polish for all human-readable content.
Output JSON only.`

export function buildValuationNotePrompt(params: {
  askingPricePln: number | null
  areaM2: number | null
  locationText: string | null
  rcnStats: {
    median_price_m2: number
    p25_price_m2: number
    p75_price_m2: number
    comparables_count: number
    radius_km: number
    months_back: number
  } | null
  marketContext: string | null
}): { system: string; user: string } {
  const user = `Compute a valuation note for this building plot:
- asking_price_pln: ${params.askingPricePln}
- area_m2: ${params.areaM2}
- location_text: ${params.locationText}
- rcn_stats: ${JSON.stringify(params.rcnStats)}
- market_context: ${params.marketContext}

Return JSON: { price_per_m2_asking, price_position ("cheap"|"fair"|"expensive"|"unknown"), price_position_label, percentile_estimate, explanation (max 1200 chars Polish), confidence, data_quality ("good"|"limited"|"none"), rcn_summary, what_data_would_change_this (max 5 bullets), caveats }`

  return { system: SYSTEM_VALUATION_NOTE, user }
}

// =====================
// PROMPT 4: GENERATE_QUESTIONS
// =====================
export const SYSTEM_GENERATE_QUESTIONS = `Generate a structured question list in Polish for buying a building plot.
Questions must be practical, specific, and actionable.
Prioritize questions based on identified risks and missing data.
Output JSON only.`

export function buildGenerateQuestionsPrompt(params: {
  extractionJson: unknown
  riskFlagsJson: unknown
  plotStatus: string
  knownIssues?: string[]
}): { system: string; user: string } {
  const user = `Based on the following data, generate questions:
- extracted_listing: ${JSON.stringify(params.extractionJson)}
- risk_flags: ${JSON.stringify(params.riskFlagsJson)}
- plot_status: ${params.plotStatus}
- known_issues: ${JSON.stringify(params.knownIssues ?? [])}

Return JSON: {
  must_ask_before_contact (8-12 questions, each: { question, context, risk_key }),
  negotiation_questions (4-6, each: { question, goal }),
  on_site_checklist (8-12, each: { item, category ("access"|"utilities"|"environment"|"legal"|"technical"|"vibe"), how_to_verify }),
  red_flags_to_watch (3-5 strings),
  total_count
}
Be specific: e.g. "Czy działka ma założoną Księgę Wieczystą? Jaki jest jej numer?"`

  return { system: SYSTEM_GENERATE_QUESTIONS, user }
}

// =====================
// PROMPT 5: VERDICT_SUMMARY
// =====================
export const SYSTEM_VERDICT_SUMMARY = `You are a decision-support engine for real estate investment decisions in Poland.
Generate a clear, actionable verdict summary.
Be direct, honest, and conservative. Do not sugarcoat risks.
All output must be in Polish.
Output JSON only.`

export function buildVerdictSummaryPrompt(params: {
  plotScores: {
    wojtek_score: number | null
    sabina_score: number | null
    shared_score: number | null
    disagreement: number | null
    dealbreaker_triggered: boolean
    verdict: string | null
  }
  extractionSummary: unknown
  riskFlagsJson: unknown
  valuationJson: unknown
  assessmentsSummary: unknown
}): { system: string; user: string } {
  const user = `Generate a verdict summary for this building plot:
- plot_scores: ${JSON.stringify(params.plotScores)}
- extraction: ${JSON.stringify(params.extractionSummary)}
- risk_flags: ${JSON.stringify(params.riskFlagsJson)}
- valuation: ${JSON.stringify(params.valuationJson)}
- assessments: ${JSON.stringify(params.assessmentsSummary)}

Return JSON: {
  verdict ("go"|"maybe"|"no"),
  verdict_label (Polish),
  verdict_color ("green"|"orange"|"red"),
  headline (max 80 chars, punchy, Polish),
  summary (max 400 chars, Polish, no markdown),
  key_strengths (2-4 bullets),
  key_risks (2-4 bullets, ordered by severity),
  blocking_issues (only if verdict="no"),
  recommended_next_step (1 sentence),
  disagreement_note (if score diff > 1.5, else null),
  confidence_overall,
  unknowns (fields with confidence < 0.5),
  ai_disclaimer ("Ten werdykt jest generowany automatycznie przez AI. Nie jest opinią prawną ani finansową. Weryfikuj kluczowe dane samodzielnie.")
}

Rules: if dealbreaker_triggered=true → verdict MUST be "no"; if shared_score >= 7.5 and no deal breakers → verdict MUST be "go"`

  return { system: SYSTEM_VERDICT_SUMMARY, user }
}
