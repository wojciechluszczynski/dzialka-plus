'use client'

import { useState, useMemo } from 'react'
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

const ALL_STATUSES = Object.keys(STATUS_LABELS) as PlotStatus[]

function detectSource(url: string): string {
  const u = url.toLowerCase()
  if (u.includes('facebook.com/groups') || u.includes('fb.com/groups')) return 'facebook_group'
  if (u.includes('facebook.com/marketplace')) return 'facebook_marketplace'
  if (u.includes('facebook.com') || u.includes('fb.com')) return 'facebook_group'
  if (u.includes('otodom.pl')) return 'otodom'
  if (u.includes('olx.pl')) return 'olx'
  if (u.includes('gratka.pl')) return 'gratka'
  if (u.includes('adresowo.pl')) return 'adresowo'
  return 'other'
}

function fmtPrice(n: number | null | undefined): string {
  if (n == null) return '\u2014'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2).replace('.', ',') + '\u00a0M'
  return new Intl.NumberFormat('pl-PL').format(n)
}

function exportCsv(rows: PlotWithScore[]) {
  const headers = [
    'Tytu\u0142', 'Lokalizacja', 'Status', 'Cena (PLN)', 'Pow. m2', 'PLN/m2',
    '\u0179r\u00f3d\u0142o', 'Verdict', 'Score', 'URL', 'Data dodania',
  ]
  const data = rows.map((p) => {
    const score = p.plot_scores?.[0]
    const ppm2 = p.asking_price_pln && p.area_m2 ? Math.round(p.asking_price_pln / p.area_m2) : ''
    return [
      p.title ?? '',
      p.location_text ?? '',
      STATUS_LABELS[p.status] ?? p.status,
      p.asking_price_pln ?? '',
      p.area_m2 ?? '',
      ppm2,
      p.source_type ? (SOURCE_LABELS[p.source_type] ?? p.source_type) : '',
      score?.verdict ?? '',
      score?.score_shared != null ? score.score_shared.toFixed(1) : '',
      p.source_url ?? '',
      p.created_at ? new Date(p.created_at).toLocaleDateString('pl-PL') : '',
    ].map((v) => '"' + String(v).replace(/"/g, '""') + '"')
  })
  const csv = [headers.join(';'), ...data.map((r) => r.join(';'))].join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'dzialki-' + new Date().toISOString().slice(0, 10) + '.csv'
  a.click()
  URL.revokeObjectURL(url)
}

export default function PlotsTableView({ plots: initialPlots, workspaceId }: Props) {
  const [plots, setPlots] = useState<PlotWithScore[]>(initialPlots)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [verdictFilter, setVerdictFilter] = useState<string>('all')
  const [sortKey, setSortKey] = useState<keyof Plot>('updated_at')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkStatus, setBulkStatus] = useState<string>('')
  const [bulkLoading, setBulkLoading] = useState(false)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [addUrl, setAddUrl] = useState('')
  const [addNote, setAddNote] = useState('')
  const [addLoading, setAddLoading] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const supabase = createClientComponentClient()

  const filtered = useMemo(() => {
    return plots
      .filter((p) => {
        const q = search.toLowerCase()
        const matchSearch = !search
          || p.title?.toLowerCase().includes(q)
          || p.location_text?.toLowerCase().includes(q)
          || (p.source_url ?? '').toLowerCase().includes(q)
        const matchStatus = statusFilter === 'all' || p.status === statusFilter
        const verdict = p.plot_scores?.[0]?.verdict
        const matchVerdict = verdictFilter === 'all' || verdict === verdictFilter
        return matchSearch && matchStatus && matchVerdict
      })
      .sort((a, b) => {
        const av = a[sortKey] ?? ''
        const bv = b[sortKey] ?? ''
        if (typeof av === 'number' && typeof bv === 'number') {
          return sortDir === 'asc' ? av - bv : bv - av
        }
        return sortDir === 'asc'
          ? String(av).localeCompare(String(bv))
          : String(bv).localeCompare(String(av))
      })
  }, [plots, search, statusFilter, verdictFilter, sortKey, sortDir])

  function toggleSort(key: keyof Plot) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('desc') }
  }

  const allFilteredSelected = filtered.length > 0 && filtered.every((p) => selected.has(p.id))

  function toggleSelectAll() {
    if (allFilteredSelected) {
      setSelected((prev) => { const s = new Set(prev); filtered.forEach((p) => s.delete(p.id)); return s })
    } else {
      setSelected((prev) => { const s = new Set(prev); filtered.forEach((p) => s.add(p.id)); return s })
    }
  }

  function toggleRow(id: string) {
    setSelected((prev) => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })
  }

  async function bulkChangeStatus(newStatus: PlotStatus) {
    if (selected.size === 0) return
    setBulkLoading(true)
    const ids = Array.from(selected)
    await supabase.from('plots').update({ status: newStatus }).in('id', ids)
    setPlots((prev) => prev.map((p) => selected.has(p.id) ? { ...p, status: newStatus } : p))
    setSelected(new Set())
    setBulkStatus('')
    setBulkLoading(false)
  }

  async function changeStatus(plotId: string, newStatus: PlotStatus) {
    await supabase.from('plots').update({ status: newStatus }).eq('id', plotId)
    setPlots((prev) => prev.map((p) => p.id === plotId ? { ...p, status: newStatus } : p))
  }

  async function handleAddPlot(e: React.FormEvent) {
    e.preventDefault()
    if (!addUrl.trim() && !addNote.trim()) return
    setAddLoading(true); setAddError(null)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: plot, error } = await supabase.from('plots').insert({
      workspace_id: workspaceId, created_by: user!.id, status: 'inbox',
      source_url: addUrl.trim() || null,
      source_type: addUrl.trim() ? detectSource(addUrl) : 'other',
      title: addNote.trim() || null,
    }).select().single()
    setAddLoading(false)
    if (error) { setAddError(error.code === '23505' ? 'Duplikat — ta dzia\u0142ka ju\u017c istnieje' : error.message); return }
    const { data: { session } } = await supabase.auth.getSession()
    supabase.functions.invoke('process_plot', {
      body: { plot_id: plot.id },
      headers: { Authorization: 'Bearer ' + (session?.access_token ?? '') },
    }).catch(console.warn)
    setPlots((prev) => [{ ...(plot as PlotWithScore), plot_scores: [] }, ...prev])
    setAddUrl(''); setAddNote(''); setShowAddDialog(false)
  }

  return (
    <div className="min-h-screen bg-c0 p-6">
      {/* Add dialog */}
      {showAddDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70" onClick={() => setShowAddDialog(false)} />
          <div className="relative glass rounded-2xl p-6 w-full max-w-md mx-4">
            <h2 className="font-heading text-xl font-bold text-text-primary mb-4">Dodaj dzia\u0142k\u0119</h2>
            <form onSubmit={handleAddPlot} className="space-y-4">
              <div>
                <label className="block text-text-muted text-xs uppercase tracking-wide mb-1">Link do og\u0142oszenia</label>
                <input type="url" value={addUrl} onChange={(e) => setAddUrl(e.target.value)}
                  placeholder="https://otodom.pl/..."
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-accent/60" />
              </div>
              <div>
                <label className="block text-text-muted text-xs uppercase tracking-wide mb-1">Notatka (opcjonalnie)</label>
                <textarea value={addNote} onChange={(e) => setAddNote(e.target.value)}
                  placeholder="Dzia\u0142ka widziana na FB..." rows={3}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-accent/60 resize-none" />
              </div>
              {addError && <p className="text-red-400 text-sm">{addError}</p>}
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowAddDialog(false)}
                  className="flex-1 border border-white/10 text-text-secondary rounded-lg py-2.5 text-sm hover:bg-white/5 transition-colors">Anuluj</button>
                <button type="submit" disabled={addLoading}
                  className="flex-1 bg-accent hover:bg-accent-hover disabled:opacity-60 text-white font-semibold rounded-lg py-2.5 text-sm transition-colors">
                  {addLoading ? 'Dodaj\u0119...' : '+ Dodaj do Inbox'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="mr-auto">
          <h1 className="font-heading text-3xl font-bold text-text-primary">Dzia\u0142ki</h1>
          <p className="text-text-muted text-sm mt-0.5">
            {selected.size > 0 ? selected.size + ' zaznaczonych \u00b7 ' : ''}
            {filtered.length} z {plots.length}
          </p>
        </div>
        <input type="search" placeholder="Szukaj..." value={search} onChange={(e) => setSearch(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-text-primary placeholder:text-text-muted text-sm focus:outline-none focus:border-accent/60 w-52" />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent/60">
          <option value="all">Wszystkie statusy</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={verdictFilter} onChange={(e) => setVerdictFilter(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent/60">
          <option value="all">Wszystkie oceny AI</option>
          {Object.entries(VERDICT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <button
          onClick={() => exportCsv(selected.size > 0 ? filtered.filter(p => selected.has(p.id)) : filtered)}
          title={selected.size > 0 ? 'Eksportuj zaznaczone' : 'Eksportuj widoczne'}
          className="border border-white/10 text-text-secondary hover:text-text-primary hover:border-white/20 rounded-lg px-3 py-2 text-sm transition-colors">
          \u2193 CSV
        </button>
        <button onClick={() => setShowAddDialog(true)}
          className="bg-accent hover:bg-accent-hover text-white font-semibold text-sm rounded-lg px-4 py-2 transition-colors">
          + Dodaj dzia\u0142k\u0119
        </button>
      </div>

      {/* Bulk bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 mb-3 px-4 py-2.5 glass rounded-xl border border-accent/30">
          <span className="text-text-secondary text-sm font-medium">{selected.size} zaznaczonych:</span>
          <select value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value)}
            className="bg-white/5 border border-white/10 rounded px-2 py-1 text-text-primary text-sm focus:outline-none">
            <option value="">Zmie\u0144 status...</option>
            {ALL_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
          </select>
          <button disabled={!bulkStatus || bulkLoading}
            onClick={() => bulkStatus && bulkChangeStatus(bulkStatus as PlotStatus)}
            className="bg-accent disabled:opacity-40 hover:bg-accent-hover text-white text-sm font-semibold rounded px-3 py-1 transition-colors">
            {bulkLoading ? 'Zmieniam...' : 'Zastosuj'}
          </button>
          <button disabled={bulkLoading} onClick={() => bulkChangeStatus('rejected')}
            className="border border-red-500/40 text-red-400 hover:bg-red-500/10 text-sm rounded px-3 py-1 transition-colors">
            Odrzu\u0107 wszystkie
          </button>
          <button onClick={() => { setSelected(new Set()); setBulkStatus('') }}
            className="ml-auto text-text-muted hover:text-text-secondary text-sm">\u2715 Odrzu\u0107 zaznaczenie</button>
        </div>
      )}

      {/* Table */}
      <div className="glass rounded-xl overflow-x-auto">
        <table className="w-full text-sm min-w-[960px]">
          <thead>
            <tr className="border-b border-white/8 text-text-muted">
              <th className="px-4 py-3 w-10">
                <input type="checkbox" checked={allFilteredSelected} onChange={toggleSelectAll} className="rounded cursor-pointer" />
              </th>
              {([
                { key: 'title' as keyof Plot, label: 'Nazwa' },
                { key: 'location_text' as keyof Plot, label: 'Lokalizacja' },
                { key: 'asking_price_pln' as keyof Plot, label: 'Cena' },
                { key: 'area_m2' as keyof Plot, label: 'Pow. m\u00b2' },
                { key: null, label: 'PLN/m\u00b2' },
                { key: 'status' as keyof Plot, label: 'Status' },
                { key: 'source_type' as keyof Plot, label: '\u0179r\u00f3d\u0142o' },
              ]).map((col) => (
                <th key={col.label}
                  className={'text-left px-4 py-3 font-medium select-none' + (col.key ? ' cursor-pointer hover:text-text-primary transition-colors' : '')}
                  onClick={() => col.key && toggleSort(col.key)}>
                  {col.label}
                  {col.key && sortKey === col.key && <span className="ml-1 opacity-60">{sortDir === 'asc' ? '\u2191' : '\u2193'}</span>}
                </th>
              ))}
              <th className="text-left px-4 py-3 font-medium">AI Score</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={9} className="text-center py-16 text-text-muted">Brak dzia\u0142ek</td></tr>
            ) : filtered.map((plot) => {
              const score = plot.plot_scores?.[0]
              const verdict = score?.verdict as Verdict | null
              const ppm2 = plot.asking_price_pln && plot.area_m2 ? Math.round(plot.asking_price_pln / plot.area_m2) : null
              const isSel = selected.has(plot.id)
              return (
                <tr key={plot.id}
                  className={'border-b border-white/5 transition-colors cursor-pointer ' + (isSel ? 'bg-accent/8' : 'hover:bg-white/3')}
                  onClick={() => { window.location.href = '/app/workspace/' + workspaceId + '/plot/' + plot.id }}>
                  <td className="px-4 py-3 w-10" onClick={(e) => { e.stopPropagation(); toggleRow(plot.id) }}>
                    <input type="checkbox" checked={isSel} onChange={() => toggleRow(plot.id)} className="rounded cursor-pointer" />
                  </td>
                  <td className="px-4 py-3 max-w-[200px]">
                    <span className="text-text-primary font-medium truncate block">
                      {plot.title ?? <span className="text-text-muted italic">Bez nazwy</span>}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-text-secondary max-w-[160px] truncate">{plot.location_text ?? '\u2014'}</td>
                  <td className="px-4 py-3 text-accent font-medium whitespace-nowrap">
                    {plot.asking_price_pln ? fmtPrice(plot.asking_price_pln) + ' PLN' : <span className="text-text-muted">\u2014</span>}
                  </td>
                  <td className="px-4 py-3 text-text-secondary whitespace-nowrap">
                    {plot.area_m2 ? plot.area_m2.toLocaleString('pl-PL') + ' m\u00b2' : '\u2014'}
                  </td>
                  <td className="px-4 py-3 text-text-muted text-xs whitespace-nowrap">
                    {ppm2 ? fmtPrice(ppm2) + ' /m\u00b2' : '\u2014'}
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <select value={plot.status} onChange={(e) => changeStatus(plot.id, e.target.value as PlotStatus)}
                      className="text-xs font-medium rounded px-2 py-1 border-0 cursor-pointer focus:outline-none focus:ring-1 focus:ring-accent/60"
                      style={{ backgroundColor: STATUS_COLORS[plot.status] + '22', color: STATUS_COLORS[plot.status] }}>
                      {Object.entries(STATUS_LABELS).map(([k, v]) => (
                        <option key={k} value={k} style={{ backgroundColor: '#0A1428', color: '#E2E8F0' }}>{v}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-text-muted text-xs">{plot.source_type ? SOURCE_LABELS[plot.source_type] : '\u2014'}</td>
                  <td className="px-4 py-3">
                    {verdict && score?.score_shared != null ? (
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-heading font-bold" style={{ color: VERDICT_COLORS[verdict] }}>
                          {score.score_shared.toFixed(1)}
                        </span>
                        <span className="text-xs px-1.5 py-0.5 rounded font-bold"
                          style={{ backgroundColor: VERDICT_COLORS[verdict] + '22', color: VERDICT_COLORS[verdict] }}>
                          {VERDICT_LABELS[verdict]}
                        </span>
                      </div>
                    ) : <span className="text-text-muted text-xs">\u2014</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Footer stats */}
      {filtered.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-4 text-xs text-text-muted px-1">
          {(() => {
            const wp = filtered.filter(p => p.asking_price_pln)
            const wa = filtered.filter(p => p.area_m2)
            const avgP = wp.length ? Math.round(wp.reduce((s, p) => s + (p.asking_price_pln ?? 0), 0) / wp.length) : null
            const avgA = wa.length ? Math.round(wa.reduce((s, p) => s + (p.area_m2 ?? 0), 0) / wa.length) : null
            return <>
              {avgP && <span>\u015ar. cena: <strong className="text-text-secondary">{fmtPrice(avgP)} PLN</strong></span>}
              {avgA && <span>\u015ar. pow.: <strong className="text-text-secondary">{avgA.toLocaleString('pl-PL')} m\u00b2</strong></span>}
              <span>Wyfiltrowano: <strong className="text-text-secondary">{filtered.length}</strong></span>
            </>
          })()}
        </div>
      )}
    </div>
  )
}
