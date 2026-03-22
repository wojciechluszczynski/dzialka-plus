'use client'

import { useState } from 'react'
import { VERDICT_COLORS, VERDICT_LABELS, STATUS_LABELS, STATUS_COLORS, SOURCE_LABELS } from '@de/ui'
import type { Plot, PlotScore, Verdict, SourceType } from '@de/db'

interface PlotWithScore extends Plot {
  plot_scores: PlotScore[]
}
interface Props {
  plots: PlotWithScore[]
  workspaceId: string
}

function fmtPrice(n: number | null | undefined) {
  if (n == null) return '—'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2).replace('.', ',') + ' M PLN'
  return new Intl.NumberFormat('pl-PL').format(n) + ' PLN'
}

export default function ShortlistView({ plots, workspaceId }: Props) {
  const [compareIds, setCompareIds] = useState<Set<string>>(new Set())

  function toggleCompare(id: string) {
    setCompareIds(prev => {
      const s = new Set(prev)
      if (s.has(id)) { s.delete(id) } else if (s.size < 3) { s.add(id) }
      return s
    })
  }

  const top3 = plots.filter(p => p.status === 'top3')
  const shortlist = plots.filter(p => p.status === 'shortlist')
  const dueDiligence = plots.filter(p => p.status === 'due_diligence')

  return (
    <div className="min-h-screen p-6" style={{ background: '#F8F9FA' }}>
      <div className="flex items-center gap-3 mb-6">
        <div className="mr-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Shortlista</h1>
          <p className="text-gray-400 text-sm">{plots.length} działek w procesie decyzyjnym</p>
        </div>
        {compareIds.size >= 2 && (
          <a
            href={`/app/workspace/${workspaceId}/compare?ids=${Array.from(compareIds).join(',')}`}
            className="text-white font-semibold text-sm rounded-lg px-4 py-2 transition-opacity hover:opacity-90"
            style={{ background: '#F97316' }}>
            Porównaj ({compareIds.size}) →
          </a>
        )}
      </div>

      {plots.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-5xl mb-4">⭐</div>
          <p className="text-gray-500 font-medium mb-1">Brak działek na shortliście</p>
          <p className="text-gray-400 text-sm">Zmień status działki na „Shortlista" lub „Top 3", żeby pojawiła się tutaj.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {top3.length > 0 && <Section title="🏆 Top 3" plots={top3} workspaceId={workspaceId} compareIds={compareIds} onToggleCompare={toggleCompare} />}
          {shortlist.length > 0 && <Section title="⭐ Shortlista" plots={shortlist} workspaceId={workspaceId} compareIds={compareIds} onToggleCompare={toggleCompare} />}
          {dueDiligence.length > 0 && <Section title="🔍 Due Diligence" plots={dueDiligence} workspaceId={workspaceId} compareIds={compareIds} onToggleCompare={toggleCompare} />}
        </div>
      )}
    </div>
  )
}

function Section({ title, plots, workspaceId, compareIds, onToggleCompare }: {
  title: string
  plots: PlotWithScore[]
  workspaceId: string
  compareIds: Set<string>
  onToggleCompare: (id: string) => void
}) {
  return (
    <div>
      <h2 className="text-base font-semibold text-gray-700 mb-3">{title}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {plots.map(plot => {
          const score = plot.plot_scores?.[0]
          const verdict = score?.verdict as Verdict | null
          const ppm2 = plot.asking_price_pln && plot.area_m2 ? Math.round(plot.asking_price_pln / plot.area_m2) : null
          const inCompare = compareIds.has(plot.id)

          return (
            <div key={plot.id}
              className="bg-white rounded-xl border overflow-hidden shadow-sm hover:shadow-md transition-shadow"
              style={{ borderColor: inCompare ? '#F97316' : '#E5E7EB' }}>
              {/* Header */}
              <div className="h-28 relative flex items-end"
                style={{ background: 'linear-gradient(135deg, #1A2535 0%, #2D4060 100%)' }}>
                {verdict && (
                  <div className="absolute top-3 right-3">
                    <span className="text-xs font-bold px-2 py-1 rounded-full text-white"
                      style={{ background: VERDICT_COLORS[verdict] }}>
                      {VERDICT_LABELS[verdict]}
                    </span>
                  </div>
                )}
                {plot.asking_price_pln && (
                  <div className="absolute bottom-0 left-0 right-0 px-3 py-2"
                    style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.6), transparent)' }}>
                    <div className="flex justify-between items-end">
                      <span className="text-white font-semibold text-sm">{fmtPrice(plot.asking_price_pln)}</span>
                      {ppm2 && <span className="text-white/60 text-xs">{new Intl.NumberFormat('pl-PL').format(ppm2)} /m²</span>}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-3">
                <p className="font-semibold text-gray-900 text-sm leading-snug mb-1 line-clamp-2">
                  {plot.title ?? <span className="text-gray-400 italic font-normal">Bez nazwy</span>}
                </p>
                {plot.location_text && (
                  <p className="text-gray-400 text-xs mb-2">📍 {plot.location_text}</p>
                )}
                {plot.area_m2 && (
                  <p className="text-gray-500 text-xs mb-2">{plot.area_m2.toLocaleString('pl-PL')} m²</p>
                )}

                {score?.score_shared != null && (
                  <div className="mb-3">
                    <div className="flex justify-between mb-1">
                      <span className="text-xs text-gray-400">Wynik łączny</span>
                      <span className="text-xs font-semibold" style={{ color: verdict ? VERDICT_COLORS[verdict] : '#6B7280' }}>
                        {score.score_shared.toFixed(1)}/10
                      </span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{
                        width: `${(score.score_shared / 10) * 100}%`,
                        background: verdict ? VERDICT_COLORS[verdict] : '#F97316',
                      }} />
                    </div>
                    <div className="flex gap-3 mt-1.5">
                      {score.score_wojtek != null && (
                        <span className="text-xs text-gray-400">W: <strong className="text-gray-700">{score.score_wojtek.toFixed(1)}</strong></span>
                      )}
                      {score.score_sabina != null && (
                        <span className="text-xs text-gray-400">S: <strong className="text-gray-700">{score.score_sabina.toFixed(1)}</strong></span>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <a href={`/app/workspace/${workspaceId}/plot/${plot.id}`}
                    className="flex-1 text-center text-xs font-medium py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                    onClick={e => e.stopPropagation()}>
                    Szczegóły →
                  </a>
                  <button
                    onClick={() => onToggleCompare(plot.id)}
                    className="flex-1 text-center text-xs font-medium py-1.5 rounded-lg transition-colors"
                    style={inCompare
                      ? { background: '#F97316', color: 'white' }
                      : { background: 'rgba(249,115,22,0.1)', color: '#F97316' }
                    }>
                    {inCompare ? '✓ Porównaj' : '+ Porównaj'}
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
