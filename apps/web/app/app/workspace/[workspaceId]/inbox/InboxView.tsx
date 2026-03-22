'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { STATUS_LABELS, STATUS_COLORS, SOURCE_LABELS, VERDICT_COLORS, VERDICT_LABELS } from '@de/ui'
import type { Plot, PlotScore, Verdict, PlotStatus, SourceType } from '@de/db'

interface PlotWithScore extends Plot {
  plot_scores: PlotScore[]
}

interface Props {
  plots: PlotWithScore[]
  workspaceId: string
}

function fmtPrice(n: number | null | undefined): string {
  if (n == null) return ''
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2).replace('.', ',') + ' M'
  return new Intl.NumberFormat('pl-PL').format(n)
}

function detectSource(url: string): string {
  const u = url.toLowerCase()
  if (u.includes('facebook.com') || u.includes('fb.com')) return 'facebook_group'
  if (u.includes('otodom.pl')) return 'otodom'
  if (u.includes('olx.pl')) return 'olx'
  if (u.includes('gratka.pl')) return 'gratka'
  if (u.includes('adresowo.pl')) return 'adresowo'
  return 'other'
}

const STATUS_GROUPS: PlotStatus[][] = [
  ['inbox', 'draft'],
  ['to_analyze', 'to_visit', 'visited'],
  ['due_diligence', 'shortlist', 'top3'],
  ['rejected', 'closed'],
]

const ALL_FILTER = 'all'

export default function InboxView({ plots: initialPlots, workspaceId }: Props) {
  const [plots, setPlots] = useState<PlotWithScore[]>(initialPlots)
  const [statusFilter, setStatusFilter] = useState<string>('inbox')
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [addUrl, setAddUrl] = useState('')
  const [addNote, setAddNote] = useState('')
  const [addLoading, setAddLoading] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const supabase = createClientComponentClient()

  const filtered = useMemo(() => {
    return plots.filter(p => {
      const q = search.toLowerCase()
      const matchSearch = !search
        || (p.title ?? '').toLowerCase().includes(q)
        || (p.location_text ?? '').toLowerCase().includes(q)
      const matchStatus = statusFilter === ALL_FILTER || p.status === statusFilter
      return matchSearch && matchStatus
    })
  }, [plots, statusFilter, search])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!addUrl.trim() && !addNote.trim()) return
    setAddLoading(true); setAddError(null)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: plot, error } = await supabase.from('plots').insert({
      workspace_id: workspaceId,
      created_by: user!.id,
      status: 'inbox',
      source_url: addUrl.trim() || null,
      source_type: addUrl.trim() ? detectSource(addUrl) as SourceType : 'other' as SourceType,
      title: addNote.trim() || null,
    }).select().single()
    setAddLoading(false)
    if (error) { setAddError(error.code === '23505' ? 'Duplikat — ta działka już istnieje' : error.message); return }
    const { data: { session } } = await supabase.auth.getSession()
    supabase.functions.invoke('process_plot', {
      body: { plot_id: plot.id },
      headers: { Authorization: 'Bearer ' + (session?.access_token ?? '') },
    }).catch(console.warn)
    setPlots(prev => [{ ...(plot as PlotWithScore), plot_scores: [] }, ...prev])
    setAddUrl(''); setAddNote(''); setShowAdd(false)
  }

  async function moveStatus(plotId: string, newStatus: PlotStatus) {
    await supabase.from('plots').update({ status: newStatus }).eq('id', plotId)
    setPlots(prev => prev.map(p => p.id === plotId ? { ...p, status: newStatus } : p))
  }

  return (
    <div className="min-h-screen p-6" style={{ background: '#F8F9FA' }}>
      {/* Add dialog */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowAdd(false)} />
          <div className="relative bg-white rounded-2xl shadow-lg p-6 w-full max-w-md mx-4 border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Dodaj działkę</h2>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-gray-500 text-xs uppercase tracking-wide mb-1">Link do ogłoszenia</label>
                <input type="url" value={addUrl} onChange={e => setAddUrl(e.target.value)}
                  placeholder="https://otodom.pl/..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-gray-900 text-sm placeholder:text-gray-400 focus:outline-none focus:border-orange-400 transition-colors" />
              </div>
              <div>
                <label className="block text-gray-500 text-xs uppercase tracking-wide mb-1">Notatka (opcjonalnie)</label>
                <textarea value={addNote} onChange={e => setAddNote(e.target.value)}
                  placeholder="Działka widziana na FB..." rows={3}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-gray-900 text-sm placeholder:text-gray-400 focus:outline-none focus:border-orange-400 resize-none transition-colors" />
              </div>
              {addError && <p className="text-red-500 text-sm">{addError}</p>}
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowAdd(false)}
                  className="flex-1 border border-gray-200 text-gray-600 rounded-lg py-2.5 text-sm hover:bg-gray-50">Anuluj</button>
                <button type="submit" disabled={addLoading}
                  className="flex-1 text-white font-semibold rounded-lg py-2.5 text-sm disabled:opacity-60"
                  style={{ background: '#F97316' }}>
                  {addLoading ? 'Dodaję...' : '+ Dodaj'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="mr-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Skrzynka</h1>
          <p className="text-gray-400 text-sm mt-0.5">{filtered.length} działek</p>
        </div>
        <input type="search" placeholder="Szukaj..." value={search} onChange={e => setSearch(e.target.value)}
          className="bg-white border border-gray-200 rounded-lg px-4 py-2 text-gray-800 placeholder:text-gray-400 text-sm focus:outline-none focus:border-orange-400 w-48" />
        <button onClick={() => setShowAdd(true)}
          className="text-white font-semibold text-sm rounded-lg px-4 py-2 transition-opacity hover:opacity-90"
          style={{ background: '#F97316' }}>
          + Dodaj działkę
        </button>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <button
          onClick={() => setStatusFilter(ALL_FILTER)}
          className="px-4 py-1.5 rounded-full text-sm font-medium transition-colors"
          style={{
            background: statusFilter === ALL_FILTER ? '#F97316' : '#FFFFFF',
            color: statusFilter === ALL_FILTER ? '#FFFFFF' : '#6B7280',
            border: statusFilter === ALL_FILTER ? 'none' : '1px solid #E5E7EB',
          }}>
          Wszystkie ({plots.length})
        </button>
        {(Object.entries(STATUS_LABELS) as [PlotStatus, string][]).map(([key, label]) => {
          const count = plots.filter(p => p.status === key).length
          if (count === 0 && statusFilter !== key) return null
          return (
            <button key={key}
              onClick={() => setStatusFilter(key)}
              className="px-4 py-1.5 rounded-full text-sm font-medium transition-colors"
              style={{
                background: statusFilter === key ? STATUS_COLORS[key] : '#FFFFFF',
                color: statusFilter === key ? '#FFFFFF' : '#6B7280',
                border: statusFilter === key ? 'none' : '1px solid #E5E7EB',
              }}>
              {label} ({count})
            </button>
          )
        })}
      </div>

      {/* Cards grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-5xl mb-4">📭</div>
          <p className="text-gray-500 font-medium mb-1">Skrzynka pusta</p>
          <p className="text-gray-400 text-sm mb-6">Dodaj pierwszą działkę, żeby zacząć.</p>
          <button onClick={() => setShowAdd(true)}
            className="text-white font-semibold rounded-lg px-5 py-2.5 text-sm"
            style={{ background: '#F97316' }}>
            + Dodaj działkę
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(plot => {
            const score = plot.plot_scores?.[0]
            const verdict = score?.verdict as Verdict | null
            const ppm2 = plot.asking_price_pln && plot.area_m2
              ? Math.round(plot.asking_price_pln / plot.area_m2)
              : null

            return (
              <div key={plot.id}
                className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden group hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => { window.location.href = `/app/workspace/${workspaceId}/plot/${plot.id}` }}>

                {/* Photo placeholder / header */}
                <div className="h-36 relative flex items-end"
                  style={{ background: 'linear-gradient(135deg, #1E2B3C 0%, #2D4060 100%)' }}>
                  {/* Source badge */}
                  <div className="absolute top-3 left-3">
                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-white/15 text-white backdrop-blur-sm">
                      {plot.source_type ? SOURCE_LABELS[plot.source_type as SourceType] : 'Inne'}
                    </span>
                  </div>
                  {/* AI verdict */}
                  {verdict && (
                    <div className="absolute top-3 right-3">
                      <span className="text-xs font-bold px-2 py-1 rounded-full text-white"
                        style={{ background: VERDICT_COLORS[verdict] }}>
                        {VERDICT_LABELS[verdict]}
                      </span>
                    </div>
                  )}
                  {/* Price overlay */}
                  {plot.asking_price_pln && (
                    <div className="absolute bottom-0 left-0 right-0 px-3 py-2"
                      style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.6), transparent)' }}>
                      <div className="flex items-end justify-between">
                        <span className="text-white font-semibold text-base">
                          {fmtPrice(plot.asking_price_pln)} PLN
                        </span>
                        {ppm2 && (
                          <span className="text-white/70 text-xs">
                            {fmtPrice(ppm2)} /m²
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Card body */}
                <div className="p-3">
                  <p className="font-medium text-gray-900 text-sm leading-snug line-clamp-2 mb-1 min-h-[2.5rem]">
                    {plot.title ?? <span className="text-gray-400 italic font-normal">Bez nazwy</span>}
                  </p>

                  {plot.location_text && (
                    <p className="text-gray-400 text-xs flex items-center gap-1 mb-2">
                      <span>📍</span> {plot.location_text}
                    </p>
                  )}

                  {plot.area_m2 && (
                    <p className="text-gray-500 text-xs mb-2">
                      {plot.area_m2.toLocaleString('pl-PL')} m²
                    </p>
                  )}

                  {/* Score bar */}
                  {score?.score_shared != null && (
                    <div className="mb-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-400">Ocena ogólna</span>
                        <span className="text-xs font-semibold" style={{ color: verdict ? VERDICT_COLORS[verdict] : '#6B7280' }}>
                          {score.score_shared.toFixed(1)}/10
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                        <div className="h-full rounded-full transition-all"
                          style={{
                            width: `${(score.score_shared / 10) * 100}%`,
                            background: verdict ? VERDICT_COLORS[verdict] : '#F97316',
                          }} />
                      </div>
                    </div>
                  )}

                  {/* Status + quick action */}
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50">
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full"
                      style={{
                        background: STATUS_COLORS[plot.status] + '18',
                        color: STATUS_COLORS[plot.status],
                      }}>
                      {STATUS_LABELS[plot.status]}
                    </span>
                    {plot.status === 'inbox' && (
                      <button
                        onClick={e => { e.stopPropagation(); moveStatus(plot.id, 'to_analyze') }}
                        className="text-xs font-medium px-2 py-0.5 rounded-full transition-colors"
                        style={{ color: '#F97316', background: 'rgba(249,115,22,0.1)' }}>
                        Do analizy →
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
