'use client'

import Link from 'next/link'
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
  return new Intl.NumberFormat('pl-PL').format(n) + ' PLN'
}

function Cell({ value, highlight = false }: { value: React.ReactNode, highlight?: boolean }) {
  return (
    <td className="px-4 py-3 text-sm border-b border-gray-50 text-center"
      style={highlight ? { background: 'rgba(249,115,22,0.05)' } : undefined}>
      {value}
    </td>
  )
}

export default function CompareView({ plots, workspaceId }: Props) {
  if (plots.length === 0) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center" style={{ background: '#F8F9FA' }}>
        <div className="text-center">
          <div className="text-5xl mb-4">⚖️</div>
          <p className="text-gray-500 font-medium mb-1">Brak działek do porównania</p>
          <p className="text-gray-400 text-sm mb-6">Dodaj działki do shortlisty, żeby je porównać.</p>
          <Link href={`/app/workspace/${workspaceId}/shortlist`}
            className="text-white font-semibold rounded-lg px-5 py-2.5 text-sm"
            style={{ background: '#F97316' }}>
            Przejdź do shortlisty
          </Link>
        </div>
      </div>
    )
  }

  const scores = plots.map(p => p.plot_scores?.[0] as PlotScore | undefined)
  const bestScore = Math.max(...scores.map(s => s?.score_shared ?? 0))

  const rows: { label: string; getValue: (p: PlotWithScore, s?: PlotScore) => React.ReactNode }[] = [
    {
      label: 'Cena',
      getValue: (p) => p.asking_price_pln
        ? <span className="font-semibold" style={{ color: '#F97316' }}>{fmtPrice(p.asking_price_pln)}</span>
        : <span className="text-gray-400">—</span>,
    },
    {
      label: 'Powierzchnia',
      getValue: (p) => p.area_m2 ? p.area_m2.toLocaleString('pl-PL') + ' m²' : '—',
    },
    {
      label: 'Cena/m²',
      getValue: (p) => p.asking_price_pln && p.area_m2
        ? new Intl.NumberFormat('pl-PL').format(Math.round(p.asking_price_pln / p.area_m2)) + ' PLN/m²'
        : '—',
    },
    {
      label: 'Lokalizacja',
      getValue: (p) => p.location_text ?? <span className="text-gray-400">—</span>,
    },
    {
      label: 'Status',
      getValue: (p) => (
        <span className="text-xs font-medium px-2 py-0.5 rounded-full"
          style={{ background: STATUS_COLORS[p.status] + '18', color: STATUS_COLORS[p.status] }}>
          {STATUS_LABELS[p.status]}
        </span>
      ),
    },
    {
      label: 'Wynik AI',
      getValue: (p, s) => {
        const v = s?.verdict as Verdict | null
        if (!s || s.score_shared == null) return <span className="text-gray-400">—</span>
        return (
          <div className="flex flex-col items-center gap-1">
            <span className="font-bold text-base" style={{ color: v ? VERDICT_COLORS[v] : '#6B7280' }}>
              {s.score_shared.toFixed(1)}
            </span>
            {v && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white"
                style={{ background: VERDICT_COLORS[v] }}>
                {VERDICT_LABELS[v]}
              </span>
            )}
          </div>
        )
      },
    },
    {
      label: 'Wojtek',
      getValue: (_, s) => s?.score_owner != null ? s.score_owner.toFixed(1) + '/10' : '—',
    },
    {
      label: 'Sabina',
      getValue: (_, s) => s?.score_editor != null ? s.score_editor.toFixed(1) + '/10' : '—',
    },
    {
      label: 'Ryzyko',
      getValue: (_, s) => {
        if (!s) return <span className="text-gray-400">—</span>
        return s.dealbreaker_triggered
          ? <span className="text-xs font-medium text-red-600">⚠ Dealbreaker</span>
          : <span className="text-xs font-medium text-green-600">OK</span>
      },
    },
    {
      label: 'Werdykt AI',
      getValue: (_, s) => {
        if (!s?.verdict) return <span className="text-gray-400 text-xs">brak</span>
        return (
          <span className="text-xs font-medium" style={{ color: VERDICT_COLORS[s.verdict as Verdict] }}>
            {VERDICT_LABELS[s.verdict as Verdict]}
          </span>
        )
      },
    },
  ]

  return (
    <div className="min-h-screen p-6" style={{ background: '#F8F9FA' }}>
      <div className="flex items-center gap-3 mb-6">
        <div className="mr-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Porównanie działek</h1>
          <p className="text-gray-400 text-sm">{plots.length} działek</p>
        </div>
        <Link href={`/app/workspace/${workspaceId}/shortlist`}
          className="text-sm text-gray-500 hover:text-gray-700 border border-gray-200 bg-white rounded-lg px-3 py-2 transition-colors">
          ← Shortlista
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
        <table className="w-full min-w-[600px]">
          <thead>
            <tr style={{ background: '#1E2B3C' }}>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-400 w-32">
                Parametr
              </th>
              {plots.map((plot, i) => {
                const s = scores[i]
                const isBest = s?.score_shared != null && s.score_shared === bestScore && bestScore > 0
                return (
                  <th key={plot.id} className="px-4 py-3 text-center min-w-[160px]">
                    <div className="flex flex-col items-center gap-1">
                      {isBest && (
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-orange-500 text-white">
                          Najlepszy wynik
                        </span>
                      )}
                      <a href={`/app/workspace/${workspaceId}/plot/${plot.id}`}
                        className="text-white text-sm font-semibold hover:text-orange-300 transition-colors line-clamp-1 max-w-[150px]">
                        {plot.title ?? 'Bez nazwy'}
                      </a>
                      {plot.location_text && (
                        <span className="text-gray-400 text-xs">{plot.location_text}</span>
                      )}
                    </div>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.label} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide border-b border-gray-50">
                  {row.label}
                </td>
                {plots.map((plot, i) => (
                  <Cell key={plot.id} value={row.getValue(plot, scores[i])} />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
