'use client'

import { useState } from 'react'
import { STATUS_LABELS, STATUS_COLORS, SOURCE_LABELS, VERDICT_COLORS, VERDICT_LABELS } from '@de/ui'
import type { Plot, PlotScore, Verdict } from '@de/db'

interface PlotWithScore extends Plot {
  plot_scores: PlotScore[]
}

interface Props {
  plots: PlotWithScore[]
  workspaceId: string
}

export default function PlotsTableView({ plots, workspaceId }: Props) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sortKey, setSortKey] = useState<keyof Plot>('updated_at')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const filtered = plots
    .filter((p) => {
      const matchSearch =
        !search ||
        p.title?.toLowerCase().includes(search.toLowerCase()) ||
        p.location_text?.toLowerCase().includes(search.toLowerCase())
      const matchStatus = statusFilter === 'all' || p.status === statusFilter
      return matchSearch && matchStatus
    })
    .sort((a, b) => {
      const av = a[sortKey] ?? ''
      const bv = b[sortKey] ?? ''
      return sortDir === 'asc'
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av))
    })

  function toggleSort(key: keyof Plot) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  return (
    <div className="min-h-screen bg-c0 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-3xl font-bold text-text-primary">Działki</h1>
          <p className="text-text-muted text-sm">{filtered.length} z {plots.length}</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Search */}
          <input
            type="search"
            placeholder="Szukaj działki..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-text-primary placeholder:text-text-muted text-sm focus:outline-none focus:border-accent/60 w-64"
          />

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent/60"
          >
            <option value="all">Wszystkie statusy</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="glass rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/8 text-text-muted">
              {[
                { key: 'title', label: 'Nazwa' },
                { key: 'location_text', label: 'Lokalizacja' },
                { key: 'asking_price_pln', label: 'Cena' },
                { key: 'area_m2', label: 'Pow. m²' },
                { key: 'status', label: 'Status' },
                { key: 'source_type', label: 'Źródło' },
              ].map((col) => (
                <th
                  key={col.key}
                  className="text-left px-4 py-3 cursor-pointer hover:text-text-primary transition-colors font-medium select-none"
                  onClick={() => toggleSort(col.key as keyof Plot)}
                >
                  {col.label}
                  {sortKey === col.key && (
                    <span className="ml-1 opacity-60">{sortDir === 'asc' ? '↑' : '↓'}</span>
                  )}
                </th>
              ))}
              <th className="text-left px-4 py-3 font-medium">Score</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-16 text-text-muted">
                  Brak działek
                </td>
              </tr>
            ) : (
              filtered.map((plot) => {
                const score = plot.plot_scores?.[0]
                const verdict = score?.verdict as Verdict | null

                return (
                  <tr
                    key={plot.id}
                    className="border-b border-white/5 hover:bg-white/3 transition-colors cursor-pointer"
                    onClick={() => window.location.href = `/app/workspace/${workspaceId}/plot/${plot.id}`}
                  >
                    <td className="px-4 py-3">
                      <span className="text-text-primary font-medium">
                        {plot.title ?? <span className="text-text-muted italic">Bez nazwy</span>}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-text-secondary">
                      {plot.location_text ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-accent font-medium">
                      {plot.asking_price_pln
                        ? new Intl.NumberFormat('pl-PL').format(plot.asking_price_pln) + ' PLN'
                        : <span className="text-text-muted">—</span>}
                    </td>
                    <td className="px-4 py-3 text-text-secondary">
                      {plot.area_m2
                        ? plot.area_m2.toLocaleString('pl-PL') + ' m²'
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="px-2 py-1 rounded text-xs font-medium"
                        style={{
                          backgroundColor: STATUS_COLORS[plot.status] + '22',
                          color: STATUS_COLORS[plot.status],
                        }}
                      >
                        {STATUS_LABELS[plot.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-text-muted text-xs">
                      {plot.source_type ? SOURCE_LABELS[plot.source_type] : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {verdict && score?.score_shared != null ? (
                        <div className="flex items-center gap-2">
                          <span
                            className="text-lg font-heading font-bold"
                            style={{ color: VERDICT_COLORS[verdict] }}
                          >
                            {score.score_shared.toFixed(1)}
                          </span>
                          <span
                            className="text-xs px-1.5 py-0.5 rounded font-bold"
                            style={{
                              backgroundColor: VERDICT_COLORS[verdict] + '22',
                              color: VERDICT_COLORS[verdict],
                            }}
                          >
                            {VERDICT_LABELS[verdict]}
                          </span>
                        </div>
                      ) : (
                        <span className="text-text-muted text-xs">—</span>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
