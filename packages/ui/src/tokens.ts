import type { PlotStatus, SourceType, Verdict } from '@de/db'

// =====================
// STATUS
// =====================
export const STATUS_COLORS: Record<PlotStatus, string> = {
  inbox:         '#6B7280', // gray-500
  draft:         '#8B5CF6', // violet-500
  to_analyze:    '#3B82F6', // blue-500
  to_visit:      '#F59E0B', // amber-500
  visited:       '#06B6D4', // cyan-500
  due_diligence: '#F97316', // orange-500
  shortlist:     '#10B981', // emerald-500
  top3:          '#22C55E', // green-500
  rejected:      '#EF4444', // red-500
  closed:        '#374151', // gray-700
}

export const STATUS_LABELS: Record<PlotStatus, string> = {
  inbox:         'Inbox',
  draft:         'Draft',
  to_analyze:    'Do analizy',
  to_visit:      'Do wizyty',
  visited:       'Odwiedzona',
  due_diligence: 'Due diligence',
  shortlist:     'Shortlista',
  top3:          'Top 3',
  rejected:      'Odrzucona',
  closed:        'Zamknięta',
}

export const STATUS_NEXT: Partial<Record<PlotStatus, PlotStatus>> = {
  inbox:         'draft',
  draft:         'to_analyze',
  to_analyze:    'to_visit',
  to_visit:      'visited',
  visited:       'due_diligence',
  due_diligence: 'shortlist',
  shortlist:     'top3',
}

// =====================
// RISK
// =====================
export const RISK_COLORS = {
  low:  '#22C55E',
  med:  '#F59E0B',
  high: '#EF4444',
} as const

export const RISK_LABELS = {
  low:  'Niskie',
  med:  'Średnie',
  high: 'Wysokie',
} as const

// =====================
// SOURCE
// =====================
export const SOURCE_LABELS: Record<SourceType, string> = {
  facebook_group:       'Facebook Grupa',
  facebook_marketplace: 'Facebook Marketplace',
  otodom:               'Otodom',
  olx:                  'OLX',
  gratka:               'Gratka',
  adresowo:             'Adresowo',
  agent:                'Pośrednik',
  direct:               'Bezpośredni',
  other:                'Inne',
}

export const SOURCE_COLORS: Record<SourceType, string> = {
  facebook_group:       '#1877F2',
  facebook_marketplace: '#1877F2',
  otodom:               '#EC6B2D',
  olx:                  '#002F34',
  gratka:               '#C0392B',
  adresowo:             '#27AE60',
  agent:                '#7F8C8D',
  direct:               '#8E44AD',
  other:                '#95A5A6',
}

// =====================
// VERDICT
// =====================
export const VERDICT_COLORS: Record<Verdict, string> = {
  go:    '#22C55E',
  maybe: '#F59E0B',
  no:    '#EF4444',
}

export const VERDICT_LABELS: Record<Verdict, string> = {
  go:    'GO',
  maybe: 'MOŻE',
  no:    'NIE',
}

export const VERDICT_BG: Record<Verdict, string> = {
  go:    'rgba(34, 197, 94, 0.15)',
  maybe: 'rgba(245, 158, 11, 0.15)',
  no:    'rgba(239, 68, 68, 0.15)',
}

// =====================
// DESIGN TOKENS
// =====================
export const COLORS = {
  // Dark backgrounds
  c0:  '#060C18',
  c1:  '#0A1428',
  c2:  '#0F1C38',
  c3:  '#162040',
  c4:  '#1E2D4E',
  c5:  '#243560',
  c6:  '#2A3D70',
  c7:  '#304585',

  // Accent
  accent:        '#3B7DFF',
  accentHover:   '#2B6EE8',
  accentLight:   'rgba(59, 125, 255, 0.15)',

  // Text
  textPrimary:   '#F1F5FE',
  textSecondary: '#8899BB',
  textMuted:     '#4A5A7A',
  textDisabled:  '#2A3A5A',

  // Borders
  border:        'rgba(255,255,255,0.08)',
  borderFocus:   'rgba(59,125,255,0.4)',

  // Semantic
  success:       '#22C55E',
  warning:       '#F59E0B',
  error:         '#EF4444',
  info:          '#3B82F6',

  // Surface (glassmorphism cards)
  surfaceGlass:  'rgba(255,255,255,0.04)',
} as const

export const TYPOGRAPHY = {
  fontHeading: 'Rajdhani',
  fontBody:    'Inter',

  sizes: {
    xs:   12,
    sm:   14,
    base: 16,
    lg:   18,
    xl:   20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
  },

  weights: {
    regular:   '400',
    medium:    '500',
    semibold:  '600',
    bold:      '700',
  },
} as const

export const SPACING = {
  xs:   4,
  sm:   8,
  md:   12,
  base: 16,
  lg:   20,
  xl:   24,
  '2xl': 32,
  '3xl': 48,
} as const

export const RADII = {
  sm:   6,
  md:   10,
  lg:   14,
  xl:   20,
  full: 9999,
} as const
