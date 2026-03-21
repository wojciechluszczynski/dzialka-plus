'use client'

import { useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { STATUS_LABELS, STATUS_COLORS, VERDICT_COLORS, VERDICT_LABELS, SOURCE_LABELS } from '@de/ui'
import type { PlotStatus, Verdict } from '@de/db'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function PlotDetailView({ plot: initialPlot, workspaceId }: { plot: any; workspaceId: string }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [plot, setPlot] = useState<any>(initialPlot)
  const [noteText, setNoteText] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const supabase = createClientComponentClient()

  const score = plot.plot_scores?.[0]
  const verdict = score?.verdict as Verdict | null
  const aiReport = plot.plot_ai_reports?.[0]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const notes = (plot.plot_notes ?? []) as any[]

  const ppm2 = plot.asking_price_pln && plot.area_m2
    ? Math.round(plot.asking_price_pln / plot.area_m2) : null

  async function changeStatus(newStatus: PlotStatus) {
    await supabase.from('plots').update({ status: newStatus }).eq('id', plot.id)
    setPlot((p: typeof plot) => ({ ...p, status: newStatus }))
  }

  async function addNote(e: React.FormEvent) {
    e.preventDefault()
    if (!noteText.trim()) return
    setSavingNote(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: note } = await supabase
      .from('plot_notes')
      .insert({ plot_id: plot.id, workspace_id: workspaceId, author_id: user!.id, content: noteText.trim() })
      .select()
      .single()
    if (note) setPlot((p: typeof plot) => ({ ...p, plot_notes: [...(p.plot_notes ?? []), note] }))
    setNoteText('')
    setSavingNote(false)
  }

  return (
    <div className="min-h-screen bg-c0 p-6 max-w-4xl mx-auto">
      {/* Back */}
      <a href={'/app/workspace/' + workspaceId + '/plots'}
        className="inline-flex items-center gap-2 text-text-muted hover:text-text-secondary text-sm mb-6 transition-colors">
        \u2190 Wr\u00f3\u0107 do listy
      </a>

      {/* Header */}
      <div className="glass rounded-2xl p-6 mb-4">
        <div className="flex flex-wrap items-start gap-4 mb-4">
          <div className="flex-1 min-w-0">
            <h1 className="font-heading text-2xl font-bold text-text-primary truncate">
              {plot.title ?? <span className="text-text-muted italic">Bez nazwy</span>}
            </h1>
            {plot.location_text && (
              <p className="text-text-secondary mt-1">\u{1F4CD} {plot.location_text}</p>
            )}
          </div>
          <select value={plot.status} onChange={(e) => changeStatus(e.target.value as PlotStatus)}
            className="text-sm font-semibold rounded-lg px-3 py-2 border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent/60 self-start"
            style={{ backgroundColor: STATUS_COLORS[plot.status] + '33', color: STATUS_COLORS[plot.status] }}>
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k} style={{ backgroundColor: '#0A1428', color: '#E2E8F0' }}>{v}</option>
            ))}
          </select>
        </div>

        {/* Key metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Cena', value: plot.asking_price_pln ? new Intl.NumberFormat('pl-PL').format(plot.asking_price_pln) + ' PLN' : '\u2014' },
            { label: 'Powierzchnia', value: plot.area_m2 ? plot.area_m2.toLocaleString('pl-PL') + ' m\u00b2' : '\u2014' },
            { label: 'PLN/m\u00b2', value: ppm2 ? new Intl.NumberFormat('pl-PL').format(ppm2) : '\u2014' },
            { label: '\u0179r\u00f3d\u0142o', value: plot.source_type ? (SOURCE_LABELS[plot.source_type] ?? plot.source_type) : '\u2014' },
          ].map((m) => (
            <div key={m.label} className="bg-white/3 rounded-lg p-3">
              <div className="text-text-muted text-xs uppercase tracking-wide mb-1">{m.label}</div>
              <div className="text-text-primary font-semibold text-sm">{m.value}</div>
            </div>
          ))}
        </div>

        {plot.source_url && (
          <a href={plot.source_url} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 mt-3 text-accent hover:text-accent/80 text-sm transition-colors">
            \u{1F517} Otwórz ogłoszenie \u2197
          </a>
        )}
      </div>

      {/* AI Score */}
      {verdict && score && (
        <div className="glass rounded-2xl p-5 mb-4">
          <h2 className="font-heading text-base font-semibold text-text-primary mb-3">\u2728 Ocena AI</h2>
          <div className="flex items-center gap-4">
            <div className="text-4xl font-heading font-bold" style={{ color: VERDICT_COLORS[verdict] }}>
              {score.score_shared?.toFixed(1)}
            </div>
            <div>
              <div className="text-lg font-semibold" style={{ color: VERDICT_COLORS[verdict] }}>
                {VERDICT_LABELS[verdict]}
              </div>
              {aiReport?.valuation_note && (
                <p className="text-text-secondary text-sm mt-1 max-w-lg">{aiReport.valuation_note}</p>
              )}
            </div>
          </div>
          {aiReport?.risk_flags && (aiReport.risk_flags as string[]).length > 0 && (
            <div className="mt-3">
              <div className="text-text-muted text-xs uppercase tracking-wide mb-2">Flagi ryzyka</div>
              <div className="flex flex-wrap gap-2">
                {(aiReport.risk_flags as string[]).map((flag: string, i: number) => (
                  <span key={i} className="text-xs bg-red-500/10 text-red-400 border border-red-500/20 rounded px-2 py-1">
                    {flag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Notes */}
      <div className="glass rounded-2xl p-5">
        <h2 className="font-heading text-base font-semibold text-text-primary mb-4">\u{1F4DD} Notatki ({notes.length})</h2>
        <div className="space-y-3 mb-4">
          {notes.length === 0 && <p className="text-text-muted text-sm">Brak notatek.</p>}
          {notes.map((n) => (
            <div key={n.id} className="bg-white/3 rounded-lg p-3">
              <p className="text-text-primary text-sm">{n.content}</p>
              <p className="text-text-muted text-xs mt-1">
                {n.created_at ? new Date(n.created_at).toLocaleString('pl-PL') : ''}
              </p>
            </div>
          ))}
        </div>
        <form onSubmit={addNote} className="flex gap-2">
          <input value={noteText} onChange={(e) => setNoteText(e.target.value)}
            placeholder="Dodaj notatk\u0119..."
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-accent/60" />
          <button type="submit" disabled={savingNote || !noteText.trim()}
            className="bg-accent hover:bg-accent-hover disabled:opacity-50 text-white text-sm font-semibold rounded-lg px-4 py-2 transition-colors">
            Dodaj
          </button>
        </form>
      </div>
    </div>
  )
}
