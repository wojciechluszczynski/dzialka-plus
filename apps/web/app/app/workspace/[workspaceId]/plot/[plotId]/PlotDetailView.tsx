'use client'

import { useState, useEffect, useRef } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import {
  MapPin, Map, ExternalLink, ChevronLeft, Zap, Droplets, Flame, Wifi,
  GitFork, Check, X, AlertTriangle, Lightbulb, ClipboardList, Info,
  Loader2, RefreshCw, CheckCircle, Circle, MinusCircle
} from 'lucide-react'
import { STATUS_LABELS, STATUS_COLORS, VERDICT_COLORS, VERDICT_LABELS, SOURCE_LABELS, RISK_COLORS, RISK_LABELS } from '@de/ui'
import type { PlotStatus, SourceType, Verdict } from '@de/db'

interface Props {
  plotId: string
  workspaceId: string
}

function fmtNum(n: number | null | undefined, suffix = ''): string {
  if (n == null) return '—'
  return new Intl.NumberFormat('pl-PL').format(n) + (suffix ? ' ' + suffix : '')
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

function Section({ title, icon: Icon, children, color }: {
  title: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon?: any
  children: React.ReactNode
  color?: string
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3.5 border-b border-gray-100">
        {Icon && <Icon size={14} style={{ color: color ?? '#9CA3AF' }} strokeWidth={2} />}
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

function UtilityDot({ value, label, icon: Icon }: {
  value: boolean | null
  label: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: any
}) {
  const color = value === true ? '#22C55E' : value === false ? '#EF4444' : '#D1D5DB'
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: color + '15' }}>
        <Icon size={14} style={{ color }} strokeWidth={1.8} />
      </div>
      <div>
        <div className="text-xs font-medium text-gray-700">{label}</div>
        <div className="text-xs" style={{ color }}>
          {value === true ? 'Jest' : value === false ? 'Brak' : 'Nieznane'}
        </div>
      </div>
    </div>
  )
}

function SkeletonDetail() {
  return (
    <div className="min-h-screen animate-pulse" style={{ background: '#F8F9FA' }}>
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-3xl mx-auto">
          <div className="h-4 w-24 bg-gray-200 rounded mb-3" />
          <div className="h-7 w-64 bg-gray-200 rounded mb-2" />
          <div className="h-4 w-40 bg-gray-100 rounded" />
        </div>
      </div>
      <div className="max-w-3xl mx-auto p-6 space-y-4">
        <div className="grid grid-cols-4 gap-3">
          {[1,2,3,4].map(i => <div key={i} className="bg-white rounded-2xl border border-gray-200 p-4 h-20" />)}
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 h-24" />
        <div className="bg-white rounded-2xl border border-gray-200 h-32" />
        <div className="bg-white rounded-2xl border border-gray-200 h-48" />
      </div>
    </div>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function PlotDetailView({ plotId, workspaceId }: Props) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [plot, setPlot] = useState<any>(null)
  const [processing, setProcessing] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const supabase = createClientComponentClient()
  const noteRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    supabase
      .from('plots')
      .select('*, plot_scores(*), plot_ai_reports(*), plot_notes(*)')
      .eq('id', plotId)
      .eq('workspace_id', workspaceId)
      .single()
      .then(({ data }) => { if (data) setPlot(data) })
  }, [plotId, workspaceId]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!plot) return <SkeletonDetail />

  const score = plot.plot_scores?.[0]
  const verdict = score?.verdict as Verdict | null
  const aiReport = plot.plot_ai_reports?.[0]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const notes = (plot.plot_notes ?? []) as any[]
  const ppm2 = plot.asking_price_pln && plot.area_m2
    ? Math.round(plot.asking_price_pln / plot.area_m2) : null

  const extraction = (() => {
    try {
      const raw = aiReport?.extraction_json
      if (!raw) return null
      return typeof raw === 'string' ? JSON.parse(raw) : raw
    } catch { return null }
  })()

  const riskData = (() => {
    try {
      const raw = aiReport?.risk_flags_json
      if (!raw) return null
      return typeof raw === 'string' ? JSON.parse(raw) : raw
    } catch { return null }
  })()

  const riskFlags: Array<{ label: string; severity: string; rationale: string }> = riskData?.risk_flags ?? []
  const nextActions: Array<{ action: string; reason: string }> = riskData?.recommended_next_actions ?? []
  const dueDiligence: Array<{ item: string; priority: string }> = riskData?.missing_due_diligence ?? []

  const mapsHref = plot.lat && plot.lng
    ? `https://maps.google.com/?q=${plot.lat},${plot.lng}`
    : plot.location_text
      ? `https://maps.google.com/?q=${encodeURIComponent(plot.location_text)}`
      : null

  async function changeStatus(newStatus: PlotStatus) {
    await supabase.from('plots').update({ status: newStatus }).eq('id', plot.id)
    setPlot((p: typeof plot) => ({ ...p, status: newStatus }))
  }

  async function reProcess() {
    setProcessing(true)
    const { data: { session } } = await supabase.auth.getSession()
    await supabase.functions.invoke('process_plot', {
      body: { plot_id: plot.id },
      headers: { Authorization: 'Bearer ' + (session?.access_token ?? '') },
    })
    const { data } = await supabase
      .from('plots')
      .select('*, plot_scores(*), plot_ai_reports(*), plot_notes(*)')
      .eq('id', plot.id)
      .single()
    if (data) setPlot(data)
    setProcessing(false)
  }

  async function addNote(e: React.FormEvent) {
    e.preventDefault()
    if (!noteText.trim()) return
    setSavingNote(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: note } = await supabase
      .from('plot_notes')
      .insert({
        plot_id: plot.id,
        workspace_id: workspaceId,
        user_id: user!.id,
        content: noteText.trim(),
        is_voice: false,
      })
      .select().single()
    if (note) setPlot((p: typeof plot) => ({ ...p, plot_notes: [...(p.plot_notes ?? []), note] }))
    setNoteText('')
    setSavingNote(false)
  }

  return (
    <div className="min-h-screen" style={{ background: '#F8F9FA' }}>

      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-2.5">
            <a href={`/app/workspace/${workspaceId}/inbox`}
              className="flex items-center gap-1 text-gray-400 hover:text-gray-600 text-sm transition-colors">
              <ChevronLeft size={14} />
              Skrzynka
            </a>
          </div>
          <div className="flex flex-wrap items-start gap-3">
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-semibold text-gray-900 leading-snug">
                {plot.title ?? <span className="text-gray-400 italic font-normal">Analizuję ogłoszenie...</span>}
              </h1>
              {plot.location_text && (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <MapPin size={12} className="text-gray-400 flex-shrink-0" />
                  <span className="text-gray-500 text-sm">{plot.location_text}</span>
                  {mapsHref && (
                    <a href={mapsHref} target="_blank" rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-600 text-xs font-medium flex items-center gap-0.5 transition-colors">
                      <Map size={11} /> Mapa
                    </a>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
              <select value={plot.status} onChange={e => changeStatus(e.target.value as PlotStatus)}
                className="text-xs font-semibold rounded-lg px-2.5 py-2 border-0 cursor-pointer focus:outline-none"
                style={{ background: STATUS_COLORS[plot.status as PlotStatus] + '18', color: STATUS_COLORS[plot.status as PlotStatus] }}>
                {Object.entries(STATUS_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
              <button onClick={reProcess} disabled={processing}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors">
                {processing
                  ? <><Loader2 size={12} className="animate-spin" /> Analizuję...</>
                  : <><RefreshCw size={12} /> Analizuj AI</>}
              </button>
              {plot.source_url && (
                <a href={plot.source_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-colors">
                  <ExternalLink size={12} /> Ogłoszenie
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-6 space-y-4">

        {/* ── Key metrics ────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Cena', value: plot.asking_price_pln ? fmtNum(plot.asking_price_pln) + ' PLN' : '—', accent: !!plot.asking_price_pln },
            { label: 'Powierzchnia', value: plot.area_m2 ? fmtNum(plot.area_m2) + ' m²' : '—', accent: false },
            { label: 'PLN/m²', value: ppm2 ? fmtNum(ppm2) : '—', accent: false },
            {
              label: 'Dodano',
              value: plot.created_at ? timeAgo(plot.created_at) : '—',
              accent: false
            },
          ].map(m => (
            <div key={m.label} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
              <div className="text-gray-400 text-xs uppercase tracking-wide mb-1">{m.label}</div>
              <div className="font-bold text-sm" style={m.accent ? { color: '#F97316' } : { color: '#111827' }}>
                {m.value}
              </div>
            </div>
          ))}
        </div>

        {/* ── AI Verdict ─────────────────────────────────────────────────────── */}
        {verdict && score ? (
          <div className="rounded-2xl border shadow-sm p-5 flex items-center gap-5"
            style={{ background: VERDICT_COLORS[verdict] + '08', borderColor: VERDICT_COLORS[verdict] + '30' }}>
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: VERDICT_COLORS[verdict] + '18' }}>
              {verdict === 'go' && <CheckCircle size={28} style={{ color: VERDICT_COLORS[verdict] }} />}
              {verdict === 'maybe' && <MinusCircle size={28} style={{ color: VERDICT_COLORS[verdict] }} />}
              {verdict === 'no' && <X size={28} style={{ color: VERDICT_COLORS[verdict] }} strokeWidth={2.5} />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold text-base px-3 py-1 rounded-full text-white"
                  style={{ background: VERDICT_COLORS[verdict] }}>
                  {VERDICT_LABELS[verdict]}
                </span>
                {score.dealbreaker_triggered && (
                  <span className="flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-50 px-2 py-1 rounded-full">
                    <AlertTriangle size={11} />
                    Dealbreaker
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 mt-2">
                <div>
                  <div className="text-xs text-gray-400 mb-0.5">Ocena ogólna</div>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-24 rounded-full bg-gray-200 overflow-hidden">
                      <div className="h-full rounded-full" style={{
                        width: `${(score.score_shared / 10) * 100}%`,
                        background: VERDICT_COLORS[verdict]
                      }} />
                    </div>
                    <span className="text-sm font-bold" style={{ color: VERDICT_COLORS[verdict] }}>
                      {score.score_shared?.toFixed(1)}/10
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="text-xs text-gray-400 flex-shrink-0 text-right">
              {plot.source_type && <div>{SOURCE_LABELS[plot.source_type as SourceType] ?? plot.source_type}</div>}
              {plot.ai_processed_at && <div className="mt-0.5">{timeAgo(plot.ai_processed_at)}</div>}
            </div>
          </div>
        ) : !plot.ai_processed_at ? (
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center flex-shrink-0">
              <Zap size={18} style={{ color: '#F97316' }} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-orange-800">Nie analizowano jeszcze przez AI</p>
              <p className="text-xs text-orange-600 mt-0.5">Kliknij „Analizuj AI" żeby wyciągnąć dane, ocenić ryzyka i wygenerować scoring.</p>
            </div>
            <button onClick={reProcess} disabled={processing}
              className="text-white text-xs font-semibold px-4 py-2 rounded-lg flex-shrink-0 flex items-center gap-1.5"
              style={{ background: '#F97316' }}>
              {processing ? <><Loader2 size={12} className="animate-spin" />Analizuję...</> : <><RefreshCw size={12} />Analizuj</>}
            </button>
          </div>
        ) : null}

        {/* ── Description ────────────────────────────────────────────────────── */}
        {plot.description && (
          <Section title="Opis ogłoszenia" icon={Info}>
            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{plot.description}</p>
          </Section>
        )}

        {/* ── AI Suggestions ─────────────────────────────────────────────────── */}
        {nextActions.length > 0 && (
          <Section title="Sugerowane następne kroki" icon={Lightbulb} color="#F97316">
            <div className="space-y-3">
              {nextActions.map((a, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold text-white"
                    style={{ background: '#F97316' }}>
                    {i + 1}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{a.action}</p>
                    {a.reason && <p className="text-xs text-gray-500 mt-0.5">{a.reason}</p>}
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* ── Risk flags ─────────────────────────────────────────────────────── */}
        {riskFlags.length > 0 && (
          <Section title="Flagi ryzyka" icon={AlertTriangle} color="#EF4444">
            <div className="space-y-2">
              {riskFlags.map((flag, i) => {
                const sev = flag.severity as keyof typeof RISK_COLORS
                const color = RISK_COLORS[sev] ?? '#6B7280'
                return (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-xl"
                    style={{ background: color + '0D' }}>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-md flex-shrink-0 mt-0.5"
                      style={{ background: color + '20', color }}>
                      {RISK_LABELS[sev] ?? sev}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{flag.label}</p>
                      {flag.rationale && <p className="text-xs text-gray-500 mt-0.5">{flag.rationale}</p>}
                    </div>
                  </div>
                )
              })}
            </div>
          </Section>
        )}

        {/* ── Due diligence ──────────────────────────────────────────────────── */}
        {dueDiligence.length > 0 && (
          <Section title="Checklist due diligence" icon={ClipboardList} color="#3B82F6">
            <div className="space-y-2">
              {dueDiligence.map((item, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <span className="text-xs font-bold px-2 py-0.5 rounded-md flex-shrink-0 mt-0.5"
                    style={item.priority === 'must'
                      ? { background: '#EF444415', color: '#EF4444' }
                      : item.priority === 'should'
                      ? { background: '#F59E0B15', color: '#F59E0B' }
                      : { background: '#6B728015', color: '#6B7280' }
                    }>
                    {item.priority === 'must' ? 'MUST' : item.priority === 'should' ? 'SHOULD' : 'NICE'}
                  </span>
                  <span className="text-sm text-gray-700">{item.item}</span>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* ── Uzbrojenie ─────────────────────────────────────────────────────── */}
        <Section title="Uzbrojenie i dostęp">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <UtilityDot value={plot.has_electricity} label="Prąd" icon={Zap} />
            <UtilityDot value={plot.has_water} label="Woda" icon={Droplets} />
            <UtilityDot value={plot.has_sewage} label="Kanalizacja" icon={Droplets} />
            <UtilityDot value={plot.has_gas} label="Gaz" icon={Flame} />
            <UtilityDot value={plot.has_fiber} label="Internet" icon={Wifi} />
            <UtilityDot value={plot.has_road_access} label="Dostęp do drogi" icon={GitFork} />
          </div>
        </Section>

        {/* ── Dane formalne ──────────────────────────────────────────────────── */}
        {(plot.zoning || plot.parcel_id || extraction?.contact_name || extraction?.contact_phone) && (
          <Section title="Dane formalne i kontakt" icon={Info}>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
              {plot.parcel_id && (
                <div>
                  <dt className="text-xs text-gray-400 mb-0.5">Nr działki (EGiB)</dt>
                  <dd className="text-sm font-semibold text-gray-800 font-mono">{plot.parcel_id}</dd>
                </div>
              )}
              {plot.zoning && (
                <div>
                  <dt className="text-xs text-gray-400 mb-0.5">Przeznaczenie</dt>
                  <dd className="text-sm font-semibold text-gray-800">{plot.zoning}</dd>
                </div>
              )}
              {extraction?.contact_name && (
                <div>
                  <dt className="text-xs text-gray-400 mb-0.5">Kontakt</dt>
                  <dd className="text-sm font-semibold text-gray-800">{extraction.contact_name}</dd>
                </div>
              )}
              {extraction?.contact_phone && (
                <div>
                  <dt className="text-xs text-gray-400 mb-0.5">Telefon</dt>
                  <dd className="text-sm font-semibold text-gray-800">
                    <a href={`tel:${extraction.contact_phone}`} className="text-orange-500 hover:underline">
                      {extraction.contact_phone}
                    </a>
                  </dd>
                </div>
              )}
              {extraction?.contact_type && extraction.contact_type !== 'unknown' && (
                <div>
                  <dt className="text-xs text-gray-400 mb-0.5">Typ sprzedającego</dt>
                  <dd className="text-sm font-semibold text-gray-800">
                    {extraction.contact_type === 'owner' ? 'Właściciel' : 'Pośrednik'}
                  </dd>
                </div>
              )}
            </dl>
          </Section>
        )}

        {/* ── AI facts ───────────────────────────────────────────────────────── */}
        {(extraction?.facts?.length > 0 || extraction?.inferences?.length > 0) && (
          <Section title="Dane wyciągnięte przez AI" icon={Info} color="#6366F1">
            {extraction?.facts?.length > 0 && (
              <div className="mb-4">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Potwierdzone fakty</div>
                <ul className="space-y-1.5">
                  {extraction.facts.map((f: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                      <Check size={13} className="text-green-500 flex-shrink-0 mt-0.5" strokeWidth={2.5} />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {extraction?.inferences?.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Wnioski AI</div>
                <ul className="space-y-1.5">
                  {extraction.inferences.map((f: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                      <Circle size={7} className="text-gray-300 flex-shrink-0 mt-1.5" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {extraction?.missing_fields?.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Brakujące dane</div>
                <div className="flex flex-wrap gap-1.5">
                  {extraction.missing_fields.map((f: string, i: number) => (
                    <span key={i} className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{f}</span>
                  ))}
                </div>
              </div>
            )}
          </Section>
        )}

        {/* ── Notes ──────────────────────────────────────────────────────────── */}
        <Section title={`Notatki (${notes.length})`} icon={ClipboardList}>
          {notes.length > 0 && (
            <div className="space-y-3 mb-4">
              {notes.map((n: { id: string; content: string; created_at: string }) => (
                <div key={n.id} className="bg-gray-50 rounded-xl p-3">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{n.content}</p>
                  <p className="text-xs text-gray-400 mt-1.5">{timeAgo(n.created_at)}</p>
                </div>
              ))}
            </div>
          )}
          <form onSubmit={addNote} className="flex gap-2">
            <textarea
              ref={noteRef}
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              placeholder="Dodaj notatkę — tekst ogłoszenia z FB, spostrzeżenia po wizji, kontakt..."
              rows={3}
              className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-orange-400 resize-none transition-colors"
            />
            <button type="submit" disabled={savingNote || !noteText.trim()}
              className="text-white font-semibold text-xs px-4 rounded-xl self-end py-3 disabled:opacity-40 transition-opacity flex-shrink-0"
              style={{ background: '#F97316' }}>
              {savingNote ? <Loader2 size={14} className="animate-spin" /> : 'Dodaj'}
            </button>
          </form>
        </Section>

      </div>
    </div>
  )
}
