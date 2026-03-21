export * from './types'
export { createClient } from './client'

export const PLOT_STATUS_ORDER: import('./types').PlotStatus[] = [
  'inbox', 'draft', 'to_analyze', 'to_visit', 'visited',
  'due_diligence', 'shortlist', 'top3', 'rejected', 'closed',
]
