'use client'

import { useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { STATUS_LABELS, STATUS_COLORS, VERDICT_COLORS, VERDICT_LABELS, SOURCE_LABELS, RISK_COLORS, RISK_LABELS } from '@de/ui'
import type { PlotStatus, SourceType, Verdict } from '@de/db'

type Tab = 'overview' | 'ai' | 'enrichment' | 'notes'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function PlotDetailView({ plot: initialPlot, workspaceId }: { plot: any; workspaceId: string }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [plot, setPlot] = useState<any>(initialPlot)
  const [tab, setTab] = useState<Tab>('overview')
  const [noteText, setNoteText] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [processing, setProcessing] = useState(false)
  const supabase = createClientComponentClient()

  const score = plot.plot_scores?.[0]
  const verdict = score?.verdict as Verdict | null
  const aiReport = plot.plot_ai_reports?.[0]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const notes = (plot.plot_notes ?? []) as any[]
  const ppm2 = plot.asking_price_pln && plot.area_m2
    ? Math.round(plot.asking_price_pln / plot.area_m2) : null

  // Parse risk flags from AI report
  const riskFlags = (() => {
    try {
      const raw = aiReport?.risk_flags_json
      if (!raw) return []
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
      return (parsed?.risk_flags ?? []) as Array<{ label: string; severity: string; rationale: string }>
    } catch { return [] }
  })()

  const extraction = (() => {
    try {
      const raw = aiReport?.extraction_json
      if (!raw) return null
      return typeof raw === 'string' ? JSON.parse(raw) : raw
    } catch { return null }
  })()

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
      .select().single()
    if (note) setPlot((p: typeof plot) => ({ ...p, plot_notes: [...(p.plot_notes ?? []), note] }))
    setNoteText('')
    setSavingNote(false)
  }

  async function reProcess() {
    setProcessing(true)
    const { data: { session } } = await supabase.auth.getSession()
    await supabase.functions.invoke('process_plot', {
      body: { plot_id: plot.id },
      headers: { Authorization: 'Bearer ' + (session?.access_token ?? '') },
    })
    // Reload plot data
    const { data } = await supabase
      .from('plots')
      .select('*, plot_scores(*), plot_ai_reports(*), plot_notes(*)')
      .eq('id', plot.id)
      .single()
    if (data) setPlot(data)
    setProcessing(false)
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Przegląd' },
    { id: 'ai', label: 'AI' },
    { id: 'enrichment', label: 'Dane' },
    { id: 'notes', label: `Notatki (${notes.length})` },
  ]

  return (
    <div className="min-h-screen" style={{ background: '#F8F9FA' }}>
      {/* Top bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <a href={`/app/workspace/${workspaceId}/plots`}
              className="text-gray-400 hover:text-gray-600 text-sm flex items-center gap-1 transition-colors">
              ← Działki
            </a>
            <span className="text-gray-200">/</span>
            <span className="text-gray-600 text-sm truncate max-w-xs">
              {plot.title ?? 'Bez nazwy'}
            </span>
          </div>

          <div className="flex flex-wrap items-start gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-semibold text-gray-900 leading-snug">
                {plot.title ?? <span className="text-gray-400 italic font-normal">Bez nazwy</span>}
              </h1>
              {plot.location_text && (
                <p className="text-gray-500 text-sm mt-0.5">📍 {plot.location_text}</p>
              )}
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <select value={plot.status} onChange={(e) => changeStatus(e.target.value as PlotStatus)}
                className="text-sm font-medium rounded-lg px-3 py-2 border-0 cursor-pointer focus:outline-none"
                style={{ background: STATUS_COLORS[plot.status as PlotStatus] + '18', color: STATUS_COLORS[plot.status as PlotStatus] }}>
                {Object.entries(STATUS_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>

              <button
                onClick={reProcess}
                disabled={processing}
                title="Uruchom analizę AI ponownie"
                className="flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50">
                {processing ? (
                  <>
                    <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                    </svg>
                    Analizuję...
                  </>
                ) : '✨ Analizuj AI'}
              </button>

              {plot.source_url && (
                <a href={plot.source_url} target="_blank" rel="noopener noreferrer"
                  className="text-sm font-medium px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-colors">
                  🔗 Ogłoszenie ↗
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6">
        {/* Key metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          {[
            { label: 'Cena', value: plot.asking_price_pln ? new Intl.NumberFormat('pl-PL').format(plot.asking_price_pln) + ' PLN' : '—', accent: !!plot.asking_price_pln },
            { label: 'Powierzchnia', value: plot.area_m2 ? plot.area_m2.toLocaleString('pl-PL') + ' m²' : '—', accent: false },
            { label: 'PLN/m²', value: ppm2 ? new Intl.NumberFormat('pl-PL').format(ppm2) : '—', accent: false },
            { label: 'Źródło', value: plot.source_type ? (SOURCE_LABELS[plot.source_type as SourceType] ?? plot.source_type) : '—', accent: false },
          ].map((m) => (
            <div key={m.label} className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm">
              <div className="text-gray-400 text-xs uppercase tracking-wide mb-1">{m.label}</div>
              <div className="font-semibold text-sm" style={m.accent ? { color: '#F97316' } : { color: '#111827' }}>
                {m.value}
              </div>
            </div>
          ))}
        </div>

        {/* AI quick verdict */}
        {verdict && score && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-5 flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: VERDICT_COLORS[verdict] + '15' }}>
              <span className="text-2xl font-bold" style={{ color: VERDICT_COLORS[verdict] }}>
                {score.score_shared?.toFixed(1)}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-bold px-2 py-0.5 rounded-full text-white"
                  style={{ background: VERDICT_COLORS[verdict] }}>
                  {VERDICT_LABELS[verdict]}
                </span>
                <span className="text-gray-400 text-xs">Ocena ogólna</span>
              </div>
              {aiReport?.valuation_note && (
                <p className="text-gray-600 text-sm">{aiReport.valuation_note}</p>
              )}
              {extraction?.title && !plot.title && (
                <p className="text-gray-500 text-xs mt-0.5">Wygenerowane przez AI</p>
              )}
            </div>
            <div className="flex flex-col gap-1 text-xs text-gray-400 flex-shrink-0">
              {score.score_wojtek != null && <span>Wojtek: <strong className="text-gray-700">{score.score_wojtek.toFixed(1)}</strong></span>}
              {score.score_sabina != null && <span>Sabina: <strong className="text-gray-700">{score.score_sabina.toFixed(1)}</strong></span>}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-5 border-b border-gray-200">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px"
              style={tab === t.id
                ? { color: '#F97316', borderColor: '#F97316' }
                : { color: '#6B7280', borderColor: 'transparent' }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Overview tab */}
        {tab === 'overview' && (
          <div className="space-y-4">
            {/* Utilities */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Uzbrojenie</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { key: 'has_electricity', label: 'Prąd' },
                  { key: 'has_water', label: 'Woda' },
                  { key: 'has_sewage', label: 'Kanalizacja' },
                  { key: 'has_gas', label: 'Gaz' },
                ].map(u => {
                  const val = plot[u.key]
                  return (
                    <div key={u.key} className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{
                          background: val === true ? '#22C55E20' : val === false ? '#EF444420' : '#E5E7EB',
                        }}>
                        <span className="text-xs">
                          {val === true ? '✓' : val === false ? '✗' : '?'}
                        </span>
                      </div>
                      <span className="text-sm text-gray-600">{u.label}</span>
                    </div>
                  )
                })}
              </div>
              <div className="mt-3 pt-3 border-t border-gray-50 flex items-center gap-2">
                <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: plot.has_road_access === true ? '#22C55E20' : plot.has_road_access === false ? '#EF444420' : '#E5E7EB' }}>
                  <span className="text-xs">{plot.has_road_access === true ? '✓' : plot.has_road_access === false ? '✗' : '?'}</span>
                </div>
                <span className="text-sm text-gray-600">Dostęp do drogi</span>
              </div>
            </div>

            {/* Legal / Zoning */}
            {(plot.zoning || plot.parcel_id || plot.description) && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Dane formalne</h3>
                <dl className="space-y-2">
                  {plot.parcel_id && (
                    <div className="flex gap-2">
                      <dt className="text-xs text-gray-400 w-28 shrink-0 pt-0.5">Nr działki</dt>
                      <dd className="text-sm text-gray-700 font-mono">{plot.parcel_id}</dd>
                    </div>
                  )}
                  {plot.zoning && (
                    <div className="flex gap-2">
                      <dt className="text-xs text-gray-400 w-28 shrink-0 pt-0.5">Przeznaczenie</dt>
                      <dd className="text-sm text-gray-700">{plot.zoning}</dd>
                    </div>
                  )}
                  {plot.description && (
                    <div className="flex gap-2">
                      <dt className="text-xs text-gray-400 w-28 shrink-0 pt-0.5">Opis</dt>
                      <dd className="text-sm text-gray-600 leading-relaxed">{plot.description}</dd>
                    </div>
                  )}
                </dl>
              </div>
            )}

            {/* No data placeholder */}
            {!plot.ai_processed_at && (
              <div className="bg-orange-50 rounded-xl border border-orange-200 p-4 flex items-start gap-3">
                <span className="text-2xl">✨</span>
                <div>
                  <p className="text-sm font-medium text-orange-800">Działka nie była jeszcze analizowana przez AI</p>
                  <p className="text-xs text-orange-600 mt-0.5">
                    Kliknij „Analizuj AI" powyżej, żeby wyciągnąć parametry, ocenić ryzyka i wygenerować scoring.
                    <br/>
                    Dla linków z Facebooka — wklej treść ogłoszenia w notatce poniżej przed analizą.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* AI tab */}
        {tab === 'ai' && (
          <div className="space-y-4">
            {!aiReport && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center">
                <div className="text-4xl mb-3">🤖</div>
                <p className="text-gray-500 font-medium mb-1">Brak raportu AI</p>
                <p className="text-gray-400 text-sm mb-4">
                  Dla linków z Facebooka — wklej tekst ogłoszenia w zakładce Notatki, a potem kliknij Analizuj AI.
                  <br/>
                  Dla portali (Otodom, OLX, Gratka) — analiza uruchamia się automatycznie.
                </p>
                <button onClick={reProcess} disabled={processing}
                  className="text-white font-semibold rounded-lg px-5 py-2.5 text-sm disabled:opacity-50"
                  style={{ background: '#F97316' }}>
                  {processing ? 'Analizuję...' : '✨ Uruchom analizę'}
                </button>
              </div>
            )}

            {/* Extraction */}
            {extraction && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-700">Wyciąganie danych</h3>
                  {extraction.confidence_overall != null && (
                    <span className="text-xs text-gray-400">
                      Pewność: <strong>{Math.round(extraction.confidence_overall * 100)}%</strong>
                    </span>
                  )}
                </div>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-2">
                  {[
                    ['Cena', extraction.asking_price_pln ? new Intl.NumberFormat('pl-PL').format(extraction.asking_price_pln) + ' PLN' : null],
                    ['Pow.', extraction.area_m2 ? extraction.area_m2 + ' m²' : null],
                    ['Cena/m²', extraction.price_per_m2_pln ? new Intl.NumberFormat('pl-PL').format(extraction.price_per_m2_pln) + ' PLN' : null],
                    ['Lokalizacja', extraction.location_text],
                    ['Nr działki', extraction.parcel_id],
                    ['MPZP/WZ', extraction.zoning],
                    ['Kontakt', extraction.contact_name ?? (extraction.contact_phone ?? null)],
                    ['Typ kontaktu', extraction.contact_type],
                  ].filter(([, v]) => v != null).map(([k, v]) => (
                    <div key={k as string}>
                      <dt className="text-xs text-gray-400">{k as string}</dt>
                      <dd className="text-sm text-gray-800 font-medium">{v as string}</dd>
                    </div>
                  ))}
                </dl>

                {extraction.facts?.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-50">
                    <div className="text-xs text-gray-400 mb-1.5">Potwierdzone fakty</div>
                    <ul className="space-y-0.5">
                      {extraction.facts.map((f: string, i: number) => (
                        <li key={i} className="text-xs text-gray-600 flex gap-1.5"><span className="text-green-500">✓</span>{f}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {extraction.missing_fields?.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-50">
                    <div className="text-xs text-gray-400 mb-1.5">Brakujące dane</div>
                    <div className="flex flex-wrap gap-1.5">
                      {extraction.missing_fields.map((f: string, i: number) => (
                        <span key={i} className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">{f}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Risk flags */}
            {riskFlags.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Flagi ryzyka</h3>
                <div className="space-y-2">
                  {riskFlags.map((flag, i) => {
                    const sev = flag.severity as keyof typeof RISK_COLORS
                    return (
                      <div key={i} className="flex items-start gap-3 p-2.5 rounded-lg"
                        style={{ background: (RISK_COLORS[sev] ?? '#6B7280') + '10' }}>
                        <span className="text-xs font-bold px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5"
                          style={{ background: (RISK_COLORS[sev] ?? '#6B7280') + '20', color: RISK_COLORS[sev] ?? '#6B7280' }}>
                          {RISK_LABELS[sev] ?? flag.severity}
                        </span>
                        <div>
                          <p className="text-sm font-medium text-gray-800">{flag.label}</p>
                          {flag.rationale && <p className="text-xs text-gray-500 mt-0.5">{flag.rationale}</p>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Due diligence checklist */}
            {(() => {
              try {
                const raw = aiReport?.risk_flags_json
                const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
                const items = parsed?.missing_due_diligence ?? []
                if (items.length === 0) return null
                return (
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Checklist due diligence</h3>
                    <div className="space-y-1.5">
                      {items.map((item: { item: string; priority: string }, i: number) => (
                        <div key={i} className="flex items-start gap-2">
                          <span className="text-xs font-medium px-1.5 py-0.5 rounded mt-0.5 flex-shrink-0"
                            style={item.priority === 'must'
                              ? { background: '#EF444415', color: '#EF4444' }
                              : item.priority === 'should'
                              ? { background: '#F59E0B15', color: '#F59E0B' }
                              : { background: '#6B728015', color: '#6B7280' }
                            }>
                            {item.priority === 'must' ? 'MUST' : item.priority === 'should' ? 'SHOULD' : 'NICE'}
                          </span>
                          <span className="text-sm text-gray-600">{item.item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              } catch { return null }
            })()}
          </div>
        )}

        {/* Enrichment tab */}
        {tab === 'enrichment' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Dane z ogłoszenia</h3>
              <dl className="space-y-2.5">
                {[
                  { label: 'URL ogłoszenia', value: plot.source_url, link: true },
                  { label: 'Typ źródła', value: plot.source_type ? SOURCE_LABELS[plot.source_type as SourceType] : null },
                  { label: 'Nr działki (EGiB)', value: plot.parcel_id },
                  { label: 'Przeznaczenie (MPZP/WZ)', value: plot.zoning },
                  { label: 'Dojazd do drogi', value: plot.has_road_access === true ? 'Tak' : plot.has_road_access === false ? 'Nie' : null },
                  { label: 'Prąd', value: plot.has_electricity === true ? 'Tak' : plot.has_electricity === false ? 'Nie' : null },
                  { label: 'Woda', value: plot.has_water === true ? 'Tak' : plot.has_water === false ? 'Nie' : null },
                  { label: 'Kanalizacja', value: plot.has_sewage === true ? 'Tak' : plot.has_sewage === false ? 'Nie' : null },
                  { label: 'Gaz', value: plot.has_gas === true ? 'Tak' : plot.has_gas === false ? 'Nie' : null },
                  { label: 'Ostatnia analiza AI', value: plot.ai_processed_at ? new Date(plot.ai_processed_at).toLocaleString('pl-PL') : null },
                ].filter(d => d.value).map(d => (
                  <div key={d.label} className="flex gap-3">
                    <dt className="text-xs text-gray-400 w-44 shrink-0 pt-0.5">{d.label}</dt>
                    <dd className="text-sm text-gray-700">
                      {d.link ? (
                        <a href={d.value as string} target="_blank" rel="noopener noreferrer"
                          className="text-orange-500 hover:underline truncate block max-w-xs">
                          {d.value as string}
                        </a>
                      ) : d.value as string}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="bg-orange-50 rounded-xl border border-orange-100 p-4">
              <p className="text-sm font-medium text-orange-800 mb-1">Brakujące wzbogacenia</p>
              <p className="text-xs text-orange-600">
                Dane z RCN (Geoportal), ryzyko powodziowe (ISOK), warstwy PSE, dojazd do Krosna/Rzeszowa
                — dostępne po uruchomieniu pełnego modułu enrichment.
                Na razie uruchom <strong>Analizuj AI</strong>, żeby wyciągnąć co jest dostępne z ogłoszenia.
              </p>
            </div>
          </div>
        )}

        {/* Notes tab */}
        {tab === 'notes' && (
          <div>
            <div className="space-y-3 mb-4">
              {notes.length === 0 && (
                <div className="text-center py-10 text-gray-400">
                  <div className="text-3xl mb-2">📝</div>
                  <p className="text-sm">Brak notatek. Dodaj pierwszą poniżej.</p>
                  <p className="text-xs mt-1">Dla Facebooka: wklej tutaj treść ogłoszenia przed analizą AI.</p>
                </div>
              )}
              {notes.map((n: { id: string; content: string; created_at: string }) => (
                <div key={n.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                  <p className="text-gray-800 text-sm leading-relaxed whitespace-pre-wrap">{n.content}</p>
                  <p className="text-gray-400 text-xs mt-2">
                    {n.created_at ? new Date(n.created_at).toLocaleString('pl-PL') : ''}
                  </p>
                </div>
              ))}
            </div>
            <form onSubmit={addNote} className="flex gap-2">
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Dodaj notatkę... (wklej tu treść ogłoszenia z FB przed analizą AI)"
                rows={3}
                className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-800 text-sm placeholder:text-gray-400 focus:outline-none focus:border-orange-400 resize-none transition-colors"
              />
              <button type="submit" disabled={savingNote || !noteText.trim()}
                className="text-white text-sm font-semibold rounded-xl px-4 py-3 transition-colors disabled:opacity-50 self-end"
                style={{ background: '#F97316' }}>
                Dodaj
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
