'use client'

import { useState, useMemo, useRef } from 'react'
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
  initialShowAdd?: boolean
  initialUrl?: string
  initialText?: string
}

function fmtPrice(n: number | null | undefined): string {
  if (n == null) return ''
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2).replace('.', ',') + ' M'
  return new Intl.NumberFormat('pl-PL').format(n)
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'dzisiaj'
  if (days === 1) return 'wczoraj'
  if (days < 7) return `${days} dni temu`
  if (days < 30) return `${Math.floor(days / 7)} tyg. temu`
  return `${Math.floor(days / 30)} mies. temu`
}

function detectSource(url: string): string {
  const u = url.toLowerCase()
  if (u.includes('facebook.com') || u.includes('fb.com')) return 'facebook_group'
  if (u.includes('otodom.pl')) return 'otodom'
  if (u.includes('olx.pl')) return 'olx'
  if (u.includes('gratka.pl')) return 'gratka'
  if (u.includes('adresowo.pl')) return 'adresowo'
  if (u.includes('domiporta.pl')) return 'domiporta'
  if (u.includes('morizon.pl')) return 'morizon'
  return 'other'
}

async function resizeImageToBase64(file: File, maxPx = 1400): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onerror = reject
    img.onload = () => {
      let { width, height } = img
      if (width > maxPx || height > maxPx) {
        if (width > height) { height = Math.round(height * maxPx / width); width = maxPx }
        else { width = Math.round(width * maxPx / height); height = maxPx }
      }
      const canvas = document.createElement('canvas')
      canvas.width = width; canvas.height = height
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.88)
      resolve(dataUrl.split(',')[1] ?? '')
    }
    img.src = URL.createObjectURL(file)
  })
}

const ALL_FILTER = 'all'

export default function InboxView({ plots: initialPlots, workspaceId, initialShowAdd = false, initialUrl = '', initialText = '' }: Props) {
  const [plots, setPlots] = useState<PlotWithScore[]>(initialPlots)
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set())
  const [statusFilter, setStatusFilter] = useState<string>('inbox')
  const [search, setSearch] = useState('')

  // Add dialog state — pre-fill from URL params (bookmarklet / sidebar)
  const [showAdd, setShowAdd] = useState(initialShowAdd)
  const [addUrl, setAddUrl] = useState(initialUrl)
  const [addText, setAddText] = useState(initialText)          // pasted listing text (FB post etc.)
  const [addImageB64, setAddImageB64] = useState<string | null>(null)
  const [addImageName, setAddImageName] = useState<string | null>(null)
  const [addLoading, setAddLoading] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  async function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const b64 = await resizeImageToBase64(file)
      setAddImageB64(b64)
      setAddImageName(file.name)
    } catch {
      setAddError('Błąd wczytywania zdjęcia')
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const hasUrl = addUrl.trim().length > 0
    const hasText = addText.trim().length > 0
    const hasImage = !!addImageB64
    if (!hasUrl && !hasText && !hasImage) return

    setAddLoading(true)
    setAddError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()

      // Build a title hint from first line of pasted text
      const firstLine = (addText.trim().split('\n')[0] ?? '').trim()
      const titleHint = firstLine.length > 5 && firstLine.length < 100 ? firstLine : null

      // 1. Create plot (title deliberately left null if no text hint — let AI fill it)
      const { data: plot, error: plotErr } = await supabase.from('plots').insert({
        workspace_id: workspaceId,
        created_by: user!.id,
        status: 'inbox',
        source_url: addUrl.trim() || null,
        source_type: (addUrl.trim() ? detectSource(addUrl) : 'other') as SourceType,
        title: titleHint,
      }).select().single()

      if (plotErr) {
        setAddError(plotErr.code === '23505'
          ? 'Duplikat — ta działka już istnieje'
          : plotErr.message)
        setAddLoading(false)
        return
      }

      // 2. Save pasted text as plot_note so AI can see it
      if (hasText) {
        await supabase.from('plot_notes').insert({
          plot_id: plot.id,
          workspace_id: workspaceId,
          user_id: user!.id,
          content: addText.trim(),
          is_voice: false,
        })
      }

      // 3. Trigger AI analysis (fire-and-forget, pass image if present)
      const { data: { session } } = await supabase.auth.getSession()
      const body: Record<string, unknown> = { plot_id: plot.id }
      if (hasImage) body.image_base64 = addImageB64

      setProcessingIds(prev => new Set(prev).add(plot.id))
      supabase.functions.invoke('process_plot', {
        body,
        headers: { Authorization: 'Bearer ' + (session?.access_token ?? '') },
      }).then(() => {
        // After AI done, reload this plot's data
        supabase.from('plots').select('*, plot_scores(*)').eq('id', plot.id).single()
          .then(({ data }) => {
            if (data) setPlots(prev => prev.map(p => p.id === data.id ? (data as PlotWithScore) : p))
          })
        setProcessingIds(prev => { const s = new Set(prev); s.delete(plot.id); return s })
      }).catch(() => {
        setProcessingIds(prev => { const s = new Set(prev); s.delete(plot.id); return s })
      })

      // 4. Add to local state immediately
      setPlots(prev => [{ ...(plot as PlotWithScore), plot_scores: [] }, ...prev])
      setAddUrl(''); setAddText(''); setAddImageB64(null); setAddImageName(null)
      setShowAdd(false)
    } finally {
      setAddLoading(false)
    }
  }

  function closeAdd() {
    setShowAdd(false)
    setAddUrl(''); setAddText(''); setAddImageB64(null); setAddImageName(null); setAddError(null)
  }

  async function moveStatus(plotId: string, newStatus: PlotStatus) {
    await supabase.from('plots').update({ status: newStatus }).eq('id', plotId)
    setPlots(prev => prev.map(p => p.id === plotId ? { ...p, status: newStatus } : p))
  }

  async function deletePlot(plotId: string) {
    await supabase.from('plots').update({ is_deleted: true }).eq('id', plotId)
    setPlots(prev => prev.filter(p => p.id !== plotId))
  }

  return (
    <div className="min-h-screen p-6" style={{ background: '#F8F9FA' }}>
      {/* ── Add dialog ──────────────────────────────────────── */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={closeAdd} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg border border-gray-200">
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Dodaj działkę</h2>
              <button onClick={closeAdd} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>

            <form onSubmit={handleAdd} className="px-6 py-5 space-y-4">
              {/* URL */}
              <div>
                <label className="block text-gray-500 text-xs font-semibold uppercase tracking-wide mb-1.5">
                  🔗 Link do ogłoszenia <span className="font-normal normal-case text-gray-400">(opcjonalnie)</span>
                </label>
                <input
                  type="text"
                  value={addUrl}
                  onChange={e => setAddUrl(e.target.value)}
                  placeholder="https://otodom.pl/... lub https://facebook.com/..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-gray-900 text-sm placeholder:text-gray-400 focus:outline-none focus:border-orange-400 transition-colors"
                />
              </div>

              {/* Paste text */}
              <div>
                <label className="block text-gray-500 text-xs font-semibold uppercase tracking-wide mb-1.5">
                  📋 Wklej treść ogłoszenia <span className="font-normal normal-case text-gray-400">(z FB, portalu, SMS itp.)</span>
                </label>
                <textarea
                  value={addText}
                  onChange={e => setAddText(e.target.value)}
                  rows={5}
                  placeholder={"Wklej cały tekst ogłoszenia tutaj — cena, metraż, media, kontakt...\n\nAI sam rozpozna dane i wypełni pola."}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-gray-900 text-sm placeholder:text-gray-400 focus:outline-none focus:border-orange-400 resize-none transition-colors leading-relaxed"
                />
              </div>

              {/* Image upload */}
              <div>
                <label className="block text-gray-500 text-xs font-semibold uppercase tracking-wide mb-1.5">
                  📷 Zdjęcie / screenshot <span className="font-normal normal-case text-gray-400">(opcjonalnie)</span>
                </label>
                {addImageB64 ? (
                  <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-lg px-4 py-2.5">
                    <span className="text-green-600 text-sm">✓ {addImageName}</span>
                    <button type="button" onClick={() => { setAddImageB64(null); setAddImageName(null) }}
                      className="ml-auto text-gray-400 hover:text-gray-600 text-xs">Usuń</button>
                  </div>
                ) : (
                  <button type="button" onClick={() => fileInputRef.current?.click()}
                    className="w-full bg-gray-50 border border-dashed border-gray-300 rounded-lg px-4 py-3 text-sm text-gray-400 hover:border-orange-400 hover:text-orange-500 transition-colors text-center">
                    Kliknij żeby dodać zdjęcie lub screenshot z telefonu
                  </button>
                )}
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
              </div>

              {addError && <p className="text-red-500 text-sm">{addError}</p>}

              {!addUrl.trim() && !addText.trim() && !addImageB64 && (
                <p className="text-gray-400 text-xs text-center">Wypełnij przynajmniej jedno pole</p>
              )}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={closeAdd}
                  className="flex-1 border border-gray-200 text-gray-600 rounded-lg py-2.5 text-sm hover:bg-gray-50 transition-colors">
                  Anuluj
                </button>
                <button type="submit" disabled={addLoading || (!addUrl.trim() && !addText.trim() && !addImageB64)}
                  className="flex-1 text-white font-semibold rounded-lg py-2.5 text-sm disabled:opacity-50 transition-opacity"
                  style={{ background: '#F97316' }}>
                  {addLoading ? '🤖 Dodaję i analizuję...' : '+ Dodaj i analizuj AI'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Header ──────────────────────────────────────────── */}
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

      {/* ── Status tabs ─────────────────────────────────────── */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <button onClick={() => setStatusFilter(ALL_FILTER)}
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
            <button key={key} onClick={() => setStatusFilter(key)}
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

      {/* ── Cards ───────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-5xl mb-4">📭</div>
          <p className="text-gray-500 font-medium mb-1">Skrzynka pusta</p>
          <p className="text-gray-400 text-sm mb-6">Dodaj pierwszą działkę z linku, tekstu lub zdjęcia.</p>
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
            const isProcessing = processingIds.has(plot.id)

            return (
              <div key={plot.id}
                className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => { window.location.href = `/app/workspace/${workspaceId}/plot/${plot.id}` }}>

                {/* Header photo / gradient */}
                <div className="h-36 relative flex items-end"
                  style={{ background: 'linear-gradient(135deg, #1E2B3C 0%, #2D4060 100%)' }}>
                  {/* Source badge */}
                  <div className="absolute top-3 left-3">
                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-white/15 text-white backdrop-blur-sm">
                      {plot.source_type ? (SOURCE_LABELS[plot.source_type as SourceType] ?? plot.source_type) : 'Inne'}
                    </span>
                  </div>
                  {/* AI verdict or processing badge */}
                  <div className="absolute top-3 right-3">
                    {isProcessing ? (
                      <span className="text-xs font-medium px-2 py-1 rounded-full bg-orange-500/90 text-white flex items-center gap-1">
                        <span className="inline-block w-2 h-2 rounded-full bg-white animate-pulse" />
                        AI analizuje
                      </span>
                    ) : verdict ? (
                      <span className="text-xs font-bold px-2 py-1 rounded-full text-white"
                        style={{ background: VERDICT_COLORS[verdict] }}>
                        {VERDICT_LABELS[verdict]}
                      </span>
                    ) : plot.ai_processed_at ? null : (
                      <span className="text-xs px-2 py-1 rounded-full bg-white/10 text-white/60">
                        brak AI
                      </span>
                    )}
                  </div>
                  {/* Price overlay */}
                  {plot.asking_price_pln && (
                    <div className="absolute bottom-0 left-0 right-0 px-3 py-2"
                      style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.6), transparent)' }}>
                      <div className="flex items-end justify-between">
                        <span className="text-white font-semibold text-base">
                          {fmtPrice(plot.asking_price_pln)} PLN
                        </span>
                        {ppm2 && (
                          <span className="text-white/70 text-xs">{fmtPrice(ppm2)} /m²</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Card body */}
                <div className="p-3">
                  <p className="font-medium text-gray-900 text-sm leading-snug line-clamp-2 mb-1 min-h-[2.5rem]">
                    {plot.title ?? <span className="text-gray-400 italic font-normal">Analizuję ogłoszenie...</span>}
                  </p>

                  {plot.location_text && (
                    <p className="text-gray-400 text-xs flex items-center gap-1 mb-1.5">
                      <span>📍</span> {plot.location_text}
                    </p>
                  )}

                  {plot.area_m2 && (
                    <p className="text-gray-500 text-xs mb-1.5">
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

                  {/* Status + date */}
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50">
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full"
                      style={{
                        background: STATUS_COLORS[plot.status] + '18',
                        color: STATUS_COLORS[plot.status],
                      }}>
                      {STATUS_LABELS[plot.status]}
                    </span>
                    <span className="text-xs text-gray-400">{timeAgo(plot.created_at)}</span>
                  </div>
                  <div className="flex gap-2 mt-2">
                    {plot.status === 'inbox' && (
                      <button
                        onClick={e => { e.stopPropagation(); moveStatus(plot.id, 'to_analyze') }}
                        className="flex-1 text-xs font-medium py-1.5 rounded-lg transition-colors text-center"
                        style={{ color: '#F97316', background: 'rgba(249,115,22,0.08)' }}>
                        Do analizy →
                      </button>
                    )}
                    <button
                      onClick={e => {
                        e.stopPropagation()
                        if (window.confirm('Usunąć tę działkę z zestawienia?')) deletePlot(plot.id)
                      }}
                      className="text-xs font-medium py-1.5 px-3 rounded-lg transition-colors text-gray-400 hover:text-red-500 hover:bg-red-50"
                      title="Usuń działkę">
                      🗑
                    </button>
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
