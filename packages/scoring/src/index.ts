import type { PlotAssessment, ScoringWeights, Verdict, DealBreakerKey } from '@de/db'

// Default scoring weights
export const DEFAULT_WEIGHTS: ScoringWeights = {
  location: 0.25,
  size_shape: 0.15,
  price: 0.20,
  infrastructure: 0.15,
  legal: 0.15,
  vibes: 0.10,
}

export const SCORING_CRITERIA = [
  { key: 'location', label: 'Lokalizacja', weight: DEFAULT_WEIGHTS.location },
  { key: 'size_shape', label: 'Rozmiar i kształt', weight: DEFAULT_WEIGHTS.size_shape },
  { key: 'price', label: 'Cena', weight: DEFAULT_WEIGHTS.price },
  { key: 'infrastructure', label: 'Media i infrastruktura', weight: DEFAULT_WEIGHTS.infrastructure },
  { key: 'legal', label: 'Stan prawny', weight: DEFAULT_WEIGHTS.legal },
  { key: 'vibes', label: 'Feeling / Otoczenie', weight: DEFAULT_WEIGHTS.vibes },
] as const

export const DEAL_BREAKERS: Array<{ key: DealBreakerKey; label: string; description: string }> = [
  { key: 'no_road', label: 'Brak drogi dojazdowej', description: 'Działka bez prawnego dostępu do drogi publicznej' },
  { key: 'flood_risk', label: 'Ryzyko powodzi', description: 'Działka w strefie zagrożenia powodziowego (ISOK)' },
  { key: 'power_line', label: 'Linia energetyczna', description: 'Słupy lub linia WN na działce lub w strefie ochronnej' },
  { key: 'no_legal', label: 'Brak KW / problemy prawne', description: 'Brak Księgi Wieczystej lub nieuregulowany stan prawny' },
  { key: 'no_building', label: 'Zakaz zabudowy', description: 'MPZP lub warunki zabudowy wykluczają zabudowę mieszkaniową' },
  { key: 'too_small', label: 'Za mała powierzchnia', description: 'Działka poniżej minimalnego wymaganego areału' },
]

/**
 * Compute individual weighted score for a single user's assessment.
 * Returns 0–10 scale.
 */
export function computeIndividualScore(
  assessment: Partial<PlotAssessment>,
  weights: ScoringWeights = DEFAULT_WEIGHTS
): number {
  const score =
    (assessment.score_location ?? 0) * weights.location +
    (assessment.score_size_shape ?? 0) * weights.size_shape +
    (assessment.score_price ?? 0) * weights.price +
    (assessment.score_infrastructure ?? 0) * weights.infrastructure +
    (assessment.score_legal ?? 0) * weights.legal +
    (assessment.score_vibes ?? 0) * weights.vibes

  return Math.round(score * 100) / 100
}

/**
 * Compute shared score with disagreement penalty.
 * Formula:
 *   Disagreement = Σ(w_i × |owner_i - editor_i| / 10)
 *   Penalty = 0.8 × Disagreement × 10
 *   Shared = (owner + editor) / 2 - Penalty
 */
export function computeSharedScore(
  ownerScore: number,
  editorScore: number,
  ownerAssessment: Partial<PlotAssessment>,
  editorAssessment: Partial<PlotAssessment>,
  weights: ScoringWeights = DEFAULT_WEIGHTS
): { shared: number; disagreement: number; penalty: number } {
  const disagreement =
    Math.abs((ownerAssessment.score_location ?? 0) - (editorAssessment.score_location ?? 0)) / 10 * weights.location +
    Math.abs((ownerAssessment.score_size_shape ?? 0) - (editorAssessment.score_size_shape ?? 0)) / 10 * weights.size_shape +
    Math.abs((ownerAssessment.score_price ?? 0) - (editorAssessment.score_price ?? 0)) / 10 * weights.price +
    Math.abs((ownerAssessment.score_infrastructure ?? 0) - (editorAssessment.score_infrastructure ?? 0)) / 10 * weights.infrastructure +
    Math.abs((ownerAssessment.score_legal ?? 0) - (editorAssessment.score_legal ?? 0)) / 10 * weights.legal +
    Math.abs((ownerAssessment.score_vibes ?? 0) - (editorAssessment.score_vibes ?? 0)) / 10 * weights.vibes

  const penalty = 0.8 * disagreement * 10
  const shared = Math.max(0, (ownerScore + editorScore) / 2 - penalty)

  return {
    shared: Math.round(shared * 100) / 100,
    disagreement: Math.round(disagreement * 100) / 100,
    penalty: Math.round(penalty * 100) / 100,
  }
}

/**
 * Determine verdict from shared score + deal breakers.
 */
export function computeVerdict(
  sharedScore: number,
  dealbreakersTriggered: boolean
): Verdict {
  if (dealbreakersTriggered) return 'no'
  if (sharedScore >= 7.5) return 'go'
  if (sharedScore >= 6.0) return 'maybe'
  return 'no'
}

/**
 * Apply deal breaker cap: if any deal breaker is triggered, score capped at 3.0
 */
export function applyDealBreakerCap(score: number, triggered: boolean): number {
  return triggered ? Math.min(score, 3.0) : score
}

/**
 * Get verdict color for UI rendering
 */
export function getVerdictColor(verdict: Verdict | null): string {
  switch (verdict) {
    case 'go': return '#22C55E'
    case 'maybe': return '#F59E0B'
    case 'no': return '#EF4444'
    default: return '#6B7280'
  }
}
