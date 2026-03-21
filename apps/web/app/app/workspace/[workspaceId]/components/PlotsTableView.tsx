'use client'

import { useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { STATUS_LABELS, STATUS_COLORS, SOURCE_LABELS, VERDICT_COLORS, VERDICT_LABELS } from '@de/ui'
import type { Plot, PlotScore, Verdict, PlotStatus } from '@de/db'

interface PlotWithScore extends Plot {
  plot_scores: PlotScore[]
}

interface Props {
  plots: PlotWithScore[]
  workspaceId: string
}

function detectSource(url: string): string {
  const u = url.toLowerCase()
  if (u.includes('facebook.com/groups')) return 'facebook_group'
  if (u.includes('facebook.com/marketplace')) return 'facebook_marketplace'
  if (u.includes('facebook.com')) return 'facebook_group'
  if (u.includes('otodom.pl')) return 'otodom'
  if (u.includes('olx.pl')) return 'olx'
  if (u.includes('gratka.pl')) return 'gratka'
  if (u.includes('adresowo.pl')) return 'adresowo'
  return 'other'
}

export default function PlotsTableView({ plots: initialPlots, workspaceId }: Props) {
  const [plots, setPlots] = useState<PlotWithScore[]>(initialPlots)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sortKey, setSortKey] = useState<keyof Plot>('updated_at')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [addUrl, setAddUrl] = useState('')
  const [addNote, setAddNote] = useState('')
  const [addLoading, setAddLoading] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const supabase = createClientComponentClient()

  async function handleAddPlot(e: React.FormEvent) {
    e.preventDefault()
    if (!addUrl.trim() && !addNote.trim()) return
    setAddLoading(true)
    setAddError(null)

    const { data: { user } } = await supabase.auth.getUser()
    const { data: plot, error } = await supabase
      .from('plots')
      .insert({
        workspace_id: workspaceId,
        created_by: user!.id,
        status: 'inbox',
        source_url: addUrl.trim() || null,
        source_type: addUrl.trim() ? detectSource(addUrl) : 'other',
        title: addNote.trim() || null,
      })
      .select()
      .single()

    setAddLoading(false)
    if (error) {
      setAddError(error.code === '23505' ? 'Duplikat — ta działka już istnieje w workspace' : error.message)
      return
    }

    // Trigger AI
    const { data: { session } } = await supabase.auth.getSession()
    supabase.functions.invoke('process_plot', {
      body: { plot_id: plot.id },
      headers: { Authorization: `Bearer ${session?.access_token}` },
    }).catch(console.warn)

    setPlots((prev) => [{ ...(plot as PlotWithScore), plot_scores: [] }, ...prev])
    setAddUrl('')
    setAddNote('')
    setShowAddDialog(false)
  }

  async function changeStatus(plotId: string, newStatus: PlotStatus) {
    await supabase.from('plots').update({ status: newStatus }).eq('id', plotId)
    setPlots((prev) => prev.map((p) => p.id === plotId ? { ...p, status: newStatus } : p))
  }

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
      {/* Add Plot Dialog */}
      {showAddDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70" onClick={() => setShowAddDialog(false)} />
          <div className="relative glass rounded-2xl p-6 w-full max-w-md mx-4">
            <h2 className="font-heading text-xl font-bold text-text-primary mb-4">Dodaj działkę</h2>
            <form onSubmit={handleAddPlot} className="space-y-4">
              <div>
                <label className="block text-text-muted text-xs uppercase tracking-wide mb-1">Link do ogłoszenia</label>
                <input
                  type="url"
                  value={addUrl}
                  onChange={(e) => setAddUrl(e.target.value)}
                  placeholder="https://otodom.pl/... lub facebook.com/groups/..."
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-accent/60"
                />
              </div>
              <div>
                <label className="block text-text-muted text-xs uppercase tracking-wide mb-1">Notatka (opcjonalnie)</label>
                <textarea
                  value={addNote}
                  onChange={(e) => setAddNote(e.target.value)}
                  placeholder="Działka widziana na FB, Rzeszów okolice..."
                  rows={3}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-accent/60 resize-none"
                />
              </div>
              {addError && <p className="text-danger text-sm">{addError}</p>}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddDialog(false)}
                  className="flex-1 border border-white/10 text-text-secondary rounded-lg py-2.5 text-sm hover:bg-white/5 transition-colors"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  disabled={addLoading}
                  className="flex-1 bg-accent hover:bg-accent-hover disabled:opacity-60 text-white font-semibold rounded-lg py-2.5 text-sm transition-colors"
                >
                  {addLoading ? 'Dodaję...' : '+ Dodaj do Inbox'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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

          {/* Add Plot */}
          <button
            onClick={() => setShowAddDialog(true)}
            className="bg-accent hover:bg-accent-hover text-white font-semibold text-sm rounded-lg px-4 py-2 transition-colors flex items-center gap-1.5"
          >
            <span className="text-base leading-none">+</span> Dodaj działkę
          </button>
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
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={plot.status}
                        onChange={(e) => changeStatus(plot.id, e.target.value as PlotStatus)}
                        className="text-xs font-medium rounded px-2 py-1 border-0 cursor-pointer focus:outline-none focus:ring-1 focus:ring-accent/60"
                        style={{
                          backgroundColor: STATUS_COLORS[plot.status] + '22',
                          color: STATUS_COLORS[plot.status],
                        }}
                      >
                        {Object.entries(STATUS_LABELS).map(([k, v]) => (
                          <option key={k} value={k} style={{ backgroundColor: '#0A1428', color: '#E2E8F0' }}>
                            {v}
                          </option>
                        ))}
                      </select>
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
